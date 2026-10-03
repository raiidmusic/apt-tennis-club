import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/server') return { url: 'data:text/javascript,export function after(callback) { globalThis.__aptAfter.push(callback); }', shortCircuit: true };
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { processAsaasEvent, processPendingAsaasEvents } = await import('../lib/asaas-events.ts');
const { recoverMemberBilling, billingOperationsSummary, runBillingRecovery } = await import('../lib/billing-recovery.ts');
const { reconcileMemberBilling } = await import('../lib/billing-reconciliation.ts');
const { pixSearchPeriod } = await import('../lib/asaas.ts');
const { POST: memberAction, GET: memberGet } = await import('../app/api/membros/route.ts');
const { POST: registerMember } = await import('../app/api/cadastros/route.ts');
const { POST: webhookPost } = await import('../app/api/webhooks/asaas/route.ts');
const { GET: recoveryGet } = await import('../app/api/cron/billing-reconciliation/route.ts');

const memberId = '12345678-1234-4234-9234-123456789012';
function mock(t, { events = [], members = [], subscriptions = [], payments = [], invites = [], provider, counts = {}, auditRuns = [], failPersistence = false } = {}) {
  const previousFetch = globalThis.fetch, previousEnv = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: 'https://local.invalid', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test', ASAAS_API_KEY: 'test', ASAAS_API_BASE_URL: 'https://provider.invalid/v3', APT_PUBLIC_URL: 'https://apt.invalid' });
  const writes = [], requests = [];
  globalThis.fetch = async (value, init = {}) => {
    const url = new URL(value); requests.push({ url, init });
    init.signal?.throwIfAborted();
    if (failPersistence && url.pathname.includes('/rest/')) return Response.json({}, { status: 503 });
    if (url.hostname === 'provider.invalid') {
      assert.ok(provider, 'No provider calls for missing configuration');
      return provider(url, init);
    }
    assert.equal(url.hostname, 'local.invalid', 'No real service is contacted');
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'admin', email: 'gaagustavo@gmail.com' });
    const table = url.pathname.split('/').at(-1), q = url.searchParams;
    if (init.method === 'HEAD') return new Response(null, { headers: { 'content-range': `*/${counts[table] || 0}` } });
    const body = init.body ? JSON.parse(init.body) : null;
    if (init.method && init.method !== 'GET') {
      // Match public.audit_logs.entity_id TEXT NOT NULL, which has no default.
      if (table === 'audit_logs' && init.method === 'POST' && body.entity_id == null) return Response.json({ code: '23502', message: 'null value in column "entity_id" violates not-null constraint' }, { status: 400 });
      writes.push({ table, q, body });
      if (table === 'webhook_events') {
        if (init.method === 'POST') { events.push({ ...body, attempt_count: 0, next_attempt_at: new Date().toISOString(), last_attempt_at: null }); return Response.json([]); }
        const row = events.find((e) => q.get('id') === `eq.${e.id}`);
        if (!row || (q.has('attempt_count') && q.get('attempt_count') !== `eq.${row.attempt_count}`) || (q.has('processed_at') && row.processed_at)) return Response.json([]);
        Object.assign(row, body); return Response.json([row]);
      }
      if (table === 'subscriptions') {
        const row = subscriptions.find((s) => q.get('id') === `eq.${s.id}`);
        if (!row || (q.has('asaas_customer_id') && q.get('asaas_customer_id') !== (row.asaas_customer_id ? `eq.${row.asaas_customer_id}` : 'is.null')) || (q.has('status') && q.get('status') !== `eq.${row.status}`) || (q.has('checkout_attempted_at') && q.get('checkout_attempted_at') !== (row.checkout_attempted_at ? `eq.${row.checkout_attempted_at}` : 'is.null'))) return Response.json([]);
        Object.assign(row, body); return Response.json([row]);
      }
      if (table === 'payments' && init.method === 'POST') {
        const existing = payments.find((p) => p.asaas_payment_id === body.asaas_payment_id);
        if (!existing) payments.push(body);
        else if (init.headers.Prefer.includes('merge-duplicates')) Object.assign(existing, body);
      }
      if (table === 'members') Object.assign(members.find((m) => q.get('id') === `eq.${m.id}`) || {}, body);
      return Response.json([]);
    }
    if (table === 'webhook_events') return Response.json(events.filter((e) => q.has('id') ? q.get('id') === `eq.${e.id}` : !e.processed_at && e.attempt_count < 10 && e.next_attempt_at <= new Date().toISOString()).sort((a, b) => (a.last_attempt_at || '').localeCompare(b.last_attempt_at || '')).slice(0, Number(q.get('limit') || 100)));
    if (table === 'members') {
      if (q.has('id')) return Response.json(members.filter((m) => q.get('id') === `eq.${m.id}`));
      if (q.has('billing_reconciliation_issue')) return Response.json(members.filter((m) => m.billing_reconciliation_issue));
      return Response.json([...members].sort((a, b) => (a.billing_last_attempt_at || '').localeCompare(b.billing_last_attempt_at || '') || a.id.localeCompare(b.id)).slice(0, Number(q.get('limit') || 100)));
    }
    if (table === 'subscriptions') return Response.json(q.has('member_id') ? subscriptions.filter((s) => q.get('member_id').startsWith('in.') ? q.get('member_id').includes(s.member_id) : q.get('member_id') === `eq.${s.member_id}`) : q.has('asaas_subscription_id') ? subscriptions.filter((s) => q.get('asaas_subscription_id') === `eq.${s.asaas_subscription_id}`) : q.has('asaas_customer_id') ? subscriptions.filter((s) => q.get('asaas_customer_id') === `eq.${s.asaas_customer_id}`) : subscriptions);
    if (table === 'audit_logs') return Response.json(auditRuns);
    if (table === 'invites') return Response.json(invites);
    if (table === 'payments') return Response.json(payments.filter((p) => [...q].every(([key, filter]) => !['member_id', 'asaas_payment_id'].includes(key) || filter === `eq.${p[key]}` || (filter.startsWith('in.') && filter.includes(p[key])))));
    if (table === 'billing_email_deliveries') return Response.json([]);
    throw new Error(`Unexpected database request ${url}`);
  };
  t.after(() => { globalThis.fetch = previousFetch; process.env = previousEnv; });
  return { writes, requests };
}
const event = (id, payload) => ({ id, processed_at: null, attempt_count: 0, next_attempt_at: '2026-01-01T00:00:00.000Z', last_attempt_at: null, payload: { id, ...payload } });

test('stored poison cannot pin the queue; retries back off and stop at a finite ceiling', async (t) => {
  const poison = event('poison', { event: 'CHECKOUT_PAID' });
  const good = event('good', { event: 'PAYMENT_CREATED' });
  const exhausted = { ...event('exhausted', { event: 'CHECKOUT_PAID' }), attempt_count: 10 };
  const http = mock(t, { events: [poison, good, exhausted] });
  assert.deepEqual(await processPendingAsaasEvents(AbortSignal.timeout(1000)), { checked: 2, processed: 1, failed: 1 });
  assert.ok(good.processed_at);
  assert.equal(poison.attempt_count, 1);
  assert.ok(poison.next_attempt_at > new Date().toISOString());
  assert.equal(poison.processed_at, null);
  assert.equal(exhausted.attempt_count, 10);
  assert.deepEqual(await processPendingAsaasEvents(AbortSignal.timeout(1000)), { checked: 0, processed: 0, failed: 0 });
  assert.ok(http.writes.every((w) => !Object.hasOwn(w.body, 'received_at')));
});

test('a processed replay makes no writes, and concurrent retries claim an unprocessed event once', async (t) => {
  const done = { ...event('done', { event: 'PAYMENT_CREATED' }), processed_at: '2026-01-01' };
  const waiting = event('waiting', { event: 'PAYMENT_CREATED' });
  const http = mock(t, { events: [done, waiting] });
  assert.deepEqual(await processAsaasEvent(done.payload), { received: true, duplicate: true });
  assert.equal(http.writes.length, 0);
  const results = await Promise.all([processAsaasEvent(waiting.payload), processAsaasEvent(waiting.payload)]);
  assert.equal(results.filter((r) => r.ignored).length, 1);
  assert.equal(waiting.attempt_count, 1);
});

test('subscription-only event resolves its provider ID and uses canonical reconciliation without a payment', async (t) => {
  const stored = event('sub_event', { event: 'SUBSCRIPTION_UPDATED', subscription: { id: 'sub_1' } });
  const subscription = { id: 'local_sub', member_id: memberId, asaas_subscription_id: 'sub_1', asaas_customer_id: 'cus_1', asaas_checkout_id: null, status: 'awaiting_payment', amount_cents: 1000 };
  const http = mock(t, { events: [stored], members: [{ id: memberId, participation_status: 'awaiting_payment' }], subscriptions: [subscription], provider: (url) => url.pathname.endsWith('/sub_1') ? Response.json({ id: 'sub_1', customer: 'cus_1', externalReference: memberId, status: 'ACTIVE' }) : Response.json({ data: [], hasMore: false }) });
  assert.deepEqual(await processAsaasEvent(stored.payload), { received: true, reconciled: true });
  assert.ok(stored.processed_at);
  assert.ok(http.writes.some((w) => w.table === 'subscriptions'));
  assert.ok(!http.requests.some((r) => r.init.method === 'POST' && r.url.hostname === 'provider.invalid'));
});

test('missing subscription/provider attempts rotate across all members without creating customers or charges', async (t) => {
  const members = Array.from({ length: 46 }, (_, i) => ({ id: `member_${String(i).padStart(2, '0')}`, billing_last_attempt_at: null, subscriptions: i % 2 ? [{ status: 'pending_configuration', asaas_customer_id: null, asaas_checkout_id: null, asaas_subscription_id: null }] : [] }));
  const http = mock(t, { members, subscriptions: members.flatMap((m) => m.subscriptions.map((s) => ({ ...s, member_id: m.id }))) });
  assert.equal((await recoverMemberBilling(AbortSignal.timeout(1000))).exceptions, 40);
  await recoverMemberBilling(AbortSignal.timeout(1000));
  assert.equal(members.filter((m) => m.billing_last_attempt_at).length, 46);
  assert.ok(members.every((m) => ['missing_subscription', 'missing_provider'].includes(m.billing_reconciliation_issue)));
  assert.ok(http.writes.every((w) => w.table === 'members'));
});

test('an expired recovery budget aborts provider work and records a safe failure without financial writes', async (t) => {
  const subscription = { id: 'local', member_id: memberId, asaas_customer_id: 'cus_1', status: 'active' };
  const http = mock(t, { members: [{ id: memberId, subscriptions: [subscription], participation_status: 'active' }], subscriptions: [subscription], provider: (_url, init) => new Promise((resolve, reject) => { init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }); }) });
  const keepAlive = setTimeout(() => {}, 100);
  const result = await recoverMemberBilling(AbortSignal.timeout(10));
  clearTimeout(keepAlive);
  assert.equal(result.failed, 1);
  assert.ok(http.writes.every((w) => w.table === 'members'));
  assert.equal(http.writes.at(-1).body.billing_reconciliation_issue, 'reconciliation_failed');
});

test('Pix period defaults to 90 days and rejects invalid, future and overlong ranges', () => {
  assert.deepEqual(pixSearchPeriod({}, '2026-10-02'), { from: '2026-07-05', to: '2026-10-02' });
  for (const input of [{ from: '2026-02-30' }, { from: '2025-01-01' }, { to: '2027-01-01' }, { from: '2026-10-03' }]) assert.throws(() => pixSearchPeriod(input, '2026-10-02'));
});

function pixRequest(body) { return new Request('https://apt.invalid/api/membros', { method: 'POST', headers: { cookie: 'apt_access_token=test', origin: 'https://apt.invalid', 'content-type': 'application/json' }, body: JSON.stringify({ id: memberId, action: 'find_pix', ...body }) }); }

test('Pix history reads later provider pages and returns explicit continuation for operator candidates', async (t) => {
  const pages = Array.from({ length: 101 }, (_, i) => ({ id: `pay_${i}`, customer: `cus_${i}`, value: 20, status: 'RECEIVED', paymentDate: '2026-08-01', externalReference: i === 1 ? 'other_member' : undefined }));
  const http = mock(t, { members: [{ id: memberId }], subscriptions: [{ member_id: 'other_member', asaas_customer_id: 'cus_2' }], provider: (url) => url.pathname.endsWith('/payments') ? Response.json({ data: pages.slice(Number(url.searchParams.get('offset')), Number(url.searchParams.get('offset')) + 100), hasMore: url.searchParams.get('offset') === '0' }) : Response.json({ id: url.pathname.split('/').at(-1), name: 'Homônimo', externalReference: url.pathname.endsWith('/cus_3') ? 'other_member' : undefined }) });
  const first = await memberAction(pixRequest({}));
  assert.equal(first.status, 200);
  const result = await first.json();
  assert.equal(result.truncated, true); assert.equal(result.nextOffset, 40);
  assert.ok(result.candidates.every((p) => p.paidAt === '2026-08-01' && p.identityMatch === 'unverified'));
  assert.ok(!result.candidates.some((p) => ['pay_1', 'pay_2', 'pay_3'].includes(p.id)));
  const last = await (await memberAction(pixRequest({ offset: 80 }))).json();
  assert.equal(last.truncated, false); assert.equal(last.nextOffset, null);
  assert.ok(last.candidates.some((p) => p.id === 'pay_100'));
  assert.ok(http.requests.some((r) => r.url.searchParams.get('offset') === '100'));
  assert.ok(http.requests.filter((r) => r.url.hostname === 'provider.invalid' && r.url.pathname.endsWith('/payments')).every((r) => r.url.searchParams.get('paymentDate[ge]') === result.period.from && r.url.searchParams.get('paymentDate[le]') === result.period.to));
  assert.equal(http.writes.length, 0);
});

test('Pix provider error is a visible failure and never an empty candidate success', async (t) => {
  mock(t, { members: [{ id: memberId }], provider: () => Response.json({}, { status: 503 }) });
  const response = await memberAction(pixRequest({}));
  assert.equal(response.status, 502);
  assert.ok((await response.json()).error);
});

test('operation summary is admin-only and returns counts and safe member evidence without PII', async (t) => {
  mock(t, { members: [{ id: memberId, billing_reconciliation_issue: 'missing_subscription', email: 'private@example.com' }], counts: { webhook_events: 3, billing_email_deliveries: 2, members: 1 }, auditRuns: [{ created_at: '2026-10-02', metadata: { checked: 3, webhooks: { processed: 2, payload: 'private@example.com' }, headers: 'private@example.com', secretProviderUrl: 'private@example.com' } }] });
  assert.equal((await memberGet(new Request('https://apt.invalid/api/membros?operations=1'))).status, 401);
  const summary = await billingOperationsSummary();
  const response = await memberGet(new Request('https://apt.invalid/api/membros?operations=1', { headers: { cookie: 'apt_access_token=test' } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).operations.webhooks.pending, 3);
  assert.equal(summary.webhooks.pending, 3); assert.equal(summary.emails.pending, 2);
  assert.equal(summary.exceptions[0].issue, 'missing_subscription');
  assert.equal(summary.exceptionCount, 1); assert.equal(summary.exceptionsTruncated, false);
  assert.equal(summary.latestRun.checked, 3); assert.equal(summary.latestRun.webhooks.processed, 2);
  assert.equal(JSON.stringify(summary).includes('private@example.com'), false);
});

test('recovery migration enforces non-null customer uniqueness and keeps server-only grants', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202610020001_billing_recovery.sql', import.meta.url), 'utf8');
  assert.match(sql, /create unique index[\s\S]+subscriptions\(asaas_customer_id\) where asaas_customer_id is not null/);
  assert.match(sql, /revoke all on public.webhook_events, public.members from anon, authenticated/);
  assert.match(sql, /grant all on public.webhook_events, public.members to service_role/);
  assert.doesNotMatch(sql, /update public\.subscriptions|insert into public\.subscriptions|received_at\s*=/);
});


test('existing cron runs stored event recovery even without incoming webhooks and persists its aggregate result', async (t) => {
  const stored = event('quiet_provider_event', { event: 'PAYMENT_CREATED' });
  const http = mock(t, { events: [stored], members: [{ id: memberId }] });
  process.env.CRON_SECRET = 'test-secret';
  assert.equal((await recoveryGet(new Request('https://apt.invalid/api/cron/billing-reconciliation'))).status, 401);
  assert.equal(http.requests.length, 0);
  const response = await recoveryGet(new Request('https://apt.invalid/api/cron/billing-reconciliation', { headers: { authorization: 'Bearer test-secret' } }));
  assert.equal(response.status, 200);
  const run = await response.json();
  assert.equal(run.webhooks.processed, 1); assert.equal(run.exceptions, 1);
  const audit = http.writes.find((w) => w.table === 'audit_logs');
  assert.equal(audit.body.actor, 'system');
  assert.equal(audit.body.action, 'billing.reconciliation_run');
  assert.equal(audit.body.entity_type, 'billing');
  assert.equal(audit.body.entity_id, run.startedAt);
  assert.match(audit.body.entity_id, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(audit.body.metadata.webhooks.processed, 1);
  assert.ok(stored.processed_at);
});

test('webhook authenticates first and ACKs only after durable insertion; after() preserves deferred processing', async (t) => {
  const events = [], callbacks = [];
  const previousCallbacks = globalThis.__aptAfter;
  globalThis.__aptAfter = callbacks;
  t.after(() => { globalThis.__aptAfter = previousCallbacks; });
  const http = mock(t, { events });
  process.env.ASAAS_WEBHOOK_TOKEN = 'test-token';
  const request = (body, token = 'test-token') => new Request('https://apt.invalid/api/webhooks/asaas', { method: 'POST', headers: { 'asaas-access-token': token, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await webhookPost(request({ id: 'unauthorized' }, 'invalid'))).status, 401);
  assert.equal(http.requests.length, 0);
  assert.equal((await webhookPost(request(null))).status, 400);
  const response = await webhookPost(request({ id: 'accepted', event: 'PAYMENT_CREATED' }));
  assert.deepEqual(await response.json(), { received: true, queued: true });
  assert.equal(events.length, 1); assert.equal(events[0].processed_at, null); assert.equal(callbacks.length, 1);
  await callbacks[0]();
  assert.ok(events[0].processed_at);
  const duplicate = await webhookPost(request({ id: 'accepted', event: 'PAYMENT_CREATED' }));
  assert.deepEqual(await duplicate.json(), { received: true, duplicate: true });
  assert.equal(callbacks.length, 1);
});

test('durable webhook insert failure is not ACKed', async (t) => {
  mock(t, { failPersistence: true });
  process.env.ASAAS_WEBHOOK_TOKEN = 'test-token';
  const response = await webhookPost(new Request('https://apt.invalid/api/webhooks/asaas', { method: 'POST', headers: { 'asaas-access-token': 'test-token' }, body: JSON.stringify({ id: 'failed_insert', event: 'PAYMENT_CREATED' }) }));
  assert.equal(response.status, 500); assert.equal((await response.json()).received, false);
});

test('transient customer validation failure retains the stored event for retry', async (t) => {
  const stored = event('customer_failure', { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', customer: 'cus_1', value: 20 } });
  mock(t, { events: [stored], provider: (url) => url.pathname.endsWith('/pay_1') ? Response.json(stored.payload.payment) : Response.json({}, { status: 503 }) });
  process.env.CPF_HASH_SECRET = 'test-secret';
  assert.equal((await processAsaasEvent(stored.payload)).received, false);
  assert.equal(stored.processed_at, null); assert.equal(stored.attempt_count, 1);
});


test('unresolved provider records an exception while preserving the previous true success', async (t) => {
  const previousSuccess = '2026-09-01T00:00:00.000Z';
  const member = { id: memberId, participation_status: 'active', billing_last_success_at: previousSuccess };
  const subscription = { id: 'local_sub', member_id: memberId, asaas_customer_id: 'cus_missing', status: 'active', amount_cents: 2290 };
  const http = mock(t, { members: [member], subscriptions: [subscription], provider: () => Response.json({ data: [], hasMore: false }) });
  const result = await recoverMemberBilling(AbortSignal.timeout(1000));
  assert.equal(member.billing_last_success_at, previousSuccess);
  assert.equal(member.billing_reconciliation_issue, 'provider_unresolved');
  assert.equal(result.reconciled, 0); assert.equal(result.exceptions, 1); assert.equal(result.checked, 1);
  assert.ok(http.writes.filter((w) => w.table === 'members').every((w) => !Object.hasOwn(w.body, 'billing_last_success_at')));
});


function delay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

test('webhook storage and after() share one deadline and leave no late financial writes', async (t) => {
  const previousTimeout = AbortSignal.timeout, previousCallbacks = globalThis.__aptAfter;
  AbortSignal.timeout = (ms) => previousTimeout(Math.ceil(ms / 100));
  const callbacks = []; globalThis.__aptAfter = callbacks;
  t.after(() => { AbortSignal.timeout = previousTimeout; globalThis.__aptAfter = previousCallbacks; });
  const member = { id: memberId, name: 'Atleta', participation_status: 'active' };
  const subscription = { id: 'local_sub', member_id: memberId, status: 'active', asaas_customer_id: 'cus_1', asaas_checkout_id: 'checkout_1', asaas_subscription_id: null, amount_cents: 2000 };
  const http = mock(t, { members: [member], subscriptions: [subscription], provider: async (url, init) => {
    if (url.pathname.endsWith('/subscriptions')) { await delay(140, init.signal); return Response.json({ data: [] }); }
    if (url.searchParams.has('customer')) await delay(140, init.signal);
    return Response.json({ data: url.searchParams.has('customer') ? [{ id: 'pay_1', customer: 'cus_1', status: 'RECEIVED', paymentDate: '2026-10-02', value: 20 }] : [], hasMore: false });
  } });
  const fetchMock = globalThis.fetch; let storageCalls = 0; const writeTimes = [];
  const started = performance.now();
  globalThis.fetch = async (value, init = {}) => {
    const url = new URL(value);
    if (url.pathname.endsWith('/webhook_events') && storageCalls++ < 2) await delay(90, init.signal);
    const response = await fetchMock(value, init);
    if ((['subscriptions', 'payments'].includes(url.pathname.split('/').at(-1)) && init.method === 'PATCH') || (url.pathname.endsWith('/payments') && init.method === 'POST')) writeTimes.push(performance.now() - started);
    return response;
  };
  process.env.ASAAS_WEBHOOK_TOKEN = 'test-token';
  const response = await webhookPost(new Request('https://apt.invalid/api/webhooks/asaas', { method: 'POST', headers: { 'asaas-access-token': 'test-token' }, body: JSON.stringify({ id: 'deadline', event: 'CHECKOUT_PAID', checkout: { id: 'checkout_1', externalReference: memberId, customer: 'cus_1' } }) }));
  assert.equal(response.status, 200);
  await callbacks[0]();
  assert.ok(writeTimes.every((time) => time < 550), `No financial write crosses the shared 55s budget: ${writeTimes}`);
  assert.ok(http.writes.every((w) => w.table !== 'payments'));
  assert.equal(http.writes.findLast((w) => w.table === 'webhook_events').body.processing_error, 'Falha de reconciliação; revisão/repetição pendente.');
});

test('customer changed during provider lookup cannot be overwritten or import payments', async (t) => {
  const member = { id: memberId, name: 'Atleta', email: 'athlete@example.invalid', participation_status: 'active' };
  const subscription = { id: 'local_sub', member_id: memberId, status: 'active', asaas_customer_id: null, asaas_checkout_id: 'checkout_1', asaas_subscription_id: null, amount_cents: 2000 };
  const http = mock(t, { members: [member], subscriptions: [subscription], provider: (url) => {
    if (url.pathname.endsWith('/customers')) {
      subscription.asaas_customer_id = 'cus_concurrently_linked';
      return Response.json({ data: [{ id: 'cus_recovered', externalReference: memberId, email: member.email }] });
    }
    if (url.pathname.endsWith('/subscriptions')) return Response.json({ data: [] });
    return Response.json({ data: url.searchParams.has('customer') ? [{ id: 'pay_1', customer: 'cus_recovered', status: 'RECEIVED', value: 20, paymentDate: '2026-10-02' }] : [], hasMore: false });
  } });
  await assert.rejects(reconcileMemberBilling(memberId), /vínculo financeiro mudou/);
  assert.equal(subscription.asaas_customer_id, 'cus_concurrently_linked');
  assert.ok(http.writes.every((w) => w.table === 'subscriptions' && Object.keys(w.body).join(',') === 'asaas_customer_id'));
  assert.equal(http.writes[0].q.get('asaas_customer_id'), 'is.null');
});

test('checkout customer CAS conflict stays retryable before importing or deciding financial state', async (t) => {
  const stored = event('checkout_race', { event: 'CHECKOUT_PAID', checkout: { id: 'checkout_1', externalReference: memberId, customer: 'cus_checkout' } });
  const subscription = { id: 'local_sub', member_id: memberId, status: 'active', asaas_customer_id: null, asaas_checkout_id: 'checkout_1' };
  const http = mock(t, { events: [stored], members: [{ id: memberId }], subscriptions: [subscription] });
  const fetchMock = globalThis.fetch;
  globalThis.fetch = async (value, init) => {
    const response = await fetchMock(value, init);
    if (new URL(value).searchParams.get('asaas_checkout_id') === 'eq.checkout_1') subscription.asaas_customer_id = 'cus_concurrently_linked';
    return response;
  };
  assert.equal((await processAsaasEvent(stored.payload)).received, false);
  assert.equal(stored.processed_at, null); assert.equal(stored.attempt_count, 1);
  assert.equal(subscription.asaas_customer_id, 'cus_concurrently_linked');
  assert.ok(http.writes.filter((w) => w.table !== 'webhook_events').every((w) => w.table === 'subscriptions' && Object.keys(w.body).join(',') === 'asaas_customer_id'));
});


test('healthy financial work keeps its timeout evidence when only the later email phase crosses that timer', async (t) => {
  const previousTimeout = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => previousTimeout(Math.ceil(ms / 50));
  t.after(() => { AbortSignal.timeout = previousTimeout; });
  const subscription = { id: 'local_sub', member_id: memberId, status: 'active', asaas_customer_id: 'cus_1', asaas_checkout_id: null, asaas_subscription_id: null, amount_cents: 2000 };
  const http = mock(t, { members: [{ id: memberId, participation_status: 'active' }], subscriptions: [subscription], provider: async (url, init) => {
    if (url.pathname.endsWith('/subscriptions')) await delay(250, init.signal);
    else if (url.searchParams.has('customer')) await delay(190, init.signal);
    else if (url.searchParams.has('externalReference')) await delay(50, init.signal);
    return Response.json({ data: [], hasMore: false });
  } });
  const fetchMock = globalThis.fetch;
  globalThis.fetch = async (value, init) => {
    if (new URL(value).pathname.endsWith('/billing_email_deliveries')) await delay(150, init.signal);
    return fetchMock(value, init);
  };
  const run = await runBillingRecovery();
  assert.equal(run.timedOut, false); assert.equal(run.emailFailed, false); assert.equal(run.failed, 0);
  assert.equal(http.writes.find((w) => w.table === 'audit_logs').body.metadata.timedOut, false);
});


const registrationCpf = '52998224725';
function registrationFixture(t, options = {}) {
  const member = { id: memberId, auth_user_id: 'auth_1', application_id: null, name: 'Atleta', email: 'athlete@example.invalid', cpf_hash: null, participation_status: 'awaiting_payment' };
  const subscription = { id: 'local_sub', member_id: memberId, status: 'awaiting_payment', asaas_customer_id: options.customer === undefined ? 'cus_1' : options.customer, asaas_checkout_id: null, asaas_checkout_url: null, checkout_attempted_at: null, amount_cents: 2000 };
  const payment = { id: 'pay_registration', billingType: 'PIX', customer: 'cus_1', externalReference: memberId, status: 'PENDING', value: 20, dueDate: '2026-10-02', ...options.payment };
  const payments = options.localPayments || [];
  const http = mock(t, { members: [member], subscriptions: [subscription], payments, invites: [{ id: 'invite_1', member_id: memberId, application_id: null, expires_at: '2027-12-31T00:00:00.000Z', used_at: null, revoked_at: null }], provider: (url, init) => {
    if (url.pathname.endsWith('/payments') && init.method === 'POST') {
      assert.equal(JSON.parse(init.body).externalReference, memberId);
      return Response.json(payment);
    }
    if (url.pathname.endsWith('/payments')) return Response.json({ data: options.newCharge ? [] : [payment] });
    if (url.pathname.endsWith('/customers')) {
      options.onCustomerLookup?.(subscription);
      return Response.json({ data: [{ id: 'cus_1', cpfCnpj: registrationCpf, externalReference: memberId }] });
    }
    if (url.pathname.endsWith('/customers/cus_1')) return Response.json({ id: 'cus_1', externalReference: memberId });
    if (url.pathname.endsWith('/pixQrCode')) { options.onQr?.(subscription, payments, member); return Response.json({ payload: 'test_qr' }); }
    throw new Error(`Unexpected registration provider request ${url}`);
  } });
  Object.assign(process.env, { CPF_HASH_SECRET: 'test-secret', ASAAS_MONTHLY_VALUE: '20' });
  delete process.env.RESEND_API_KEY;
  const request = new Request('https://apt.invalid/api/cadastros', { method: 'POST', headers: { origin: 'https://apt.invalid', 'content-type': 'application/json' }, body: JSON.stringify({ inviteToken: 'test-invite', name: member.name, cpf: registrationCpf, email: member.email, phone: '11999999999', password: 'password_test', consent: true, paymentMethod: 'pix' }) });
  return { ...http, member, subscription, payment, payments, request };
}

test('registration Pix validates exact provider identity before QR or payment persistence', async (t) => {
  for (const payment of [{ externalReference: 'other_member' }, { externalReference: undefined }, { customer: 'cus_other' }]) {
    await t.test(JSON.stringify(payment), async (inner) => {
      const http = registrationFixture(inner, { payment });
      assert.equal((await registerMember(http.request)).status, 409);
      assert.ok(!http.requests.some((r) => r.url.pathname.endsWith('/pixQrCode')));
      assert.ok(http.writes.every((w) => w.table !== 'payments'));
    });
  }
});

test('registration customer lookup race fails before creating a charge', async (t) => {
  const http = registrationFixture(t, { customer: null, newCharge: true, onCustomerLookup: (subscription) => { subscription.asaas_customer_id = 'cus_concurrently_linked'; } });
  assert.equal((await registerMember(http.request)).status, 409);
  assert.equal(http.subscription.asaas_customer_id, 'cus_concurrently_linked');
  assert.ok(!http.requests.some((r) => r.url.hostname === 'provider.invalid' && r.init.method === 'POST'));
  assert.ok(http.writes.every((w) => w.table !== 'payments'));
});

test('registration QR customer race fails without replacing ownership or persisting finance', async (t) => {
  const http = registrationFixture(t, { onQr: (subscription) => { subscription.asaas_customer_id = 'cus_concurrently_linked'; } });
  assert.equal((await registerMember(http.request)).status, 409);
  assert.equal(http.subscription.asaas_customer_id, 'cus_concurrently_linked');
  assert.ok(http.writes.every((w) => w.table !== 'payments' && w.table !== 'audit_logs' && w.table !== 'invites'));
});

test('registration QR cannot roll a concurrent received payment and active subscription back to pending', async (t) => {
  const http = registrationFixture(t, { onQr: (subscription, payments, member) => {
    subscription.status = 'active'; member.participation_status = 'active';
    payments.push({ asaas_payment_id: 'pay_registration', member_id: memberId, subscription_id: subscription.id, status: 'RECEIVED', paid_at: '2026-10-02' });
  } });
  assert.equal((await registerMember(http.request)).status, 409);
  assert.equal(http.subscription.status, 'active'); assert.equal(http.member.participation_status, 'active');
  assert.equal(http.payments[0].status, 'RECEIVED');
  assert.ok(http.writes.every((w) => w.table !== 'payments' && w.table !== 'audit_logs' && w.table !== 'invites'));
});

test('registration ignores an insert race and fails closed if another member owns the payment', async (t) => {
  const http = registrationFixture(t);
  const fetchMock = globalThis.fetch;
  globalThis.fetch = async (value, init) => {
    if (new URL(value).pathname.endsWith('/payments') && init.method === 'POST') http.payments.push({ asaas_payment_id: 'pay_registration', member_id: 'foreign_member', status: 'RECEIVED' });
    return fetchMock(value, init);
  };
  assert.equal((await registerMember(http.request)).status, 409);
  assert.equal(http.payments[0].member_id, 'foreign_member'); assert.equal(http.payments[0].status, 'RECEIVED');
  const inserted = http.writes.find((w) => w.table === 'payments');
  assert.ok(inserted); assert.ok(http.requests.find((r) => r.url.pathname.endsWith('/payments') && r.init.method === 'POST').init.headers.Prefer.includes('ignore-duplicates'));
  assert.ok(http.writes.every((w) => w.table !== 'payments' || w.body.status === 'PENDING'));
  assert.ok(!http.writes.some((w) => w.table === 'invites' || w.table === 'audit_logs'));
});

test('registration existing received payment stays canonical and cannot produce a stale pending completion', async (t) => {
  const http = registrationFixture(t, { localPayments: [{ asaas_payment_id: 'pay_registration', member_id: memberId, status: 'RECEIVED', paid_at: '2026-10-02' }] });
  assert.equal((await registerMember(http.request)).status, 409);
  assert.equal(http.payments[0].status, 'RECEIVED');
  assert.ok(!http.writes.some((w) => w.table === 'invites' || w.table === 'audit_logs'));
  assert.ok(http.writes.filter((w) => w.table === 'payments').every((w) => w.q.get('on_conflict') === 'asaas_payment_id'));
  assert.ok(!http.requests.some((r) => r.url.hostname === 'provider.invalid' && r.init.method === 'POST'));
});


test('registration new Pix claims the original customer before the unchanged charge POST', async (t) => {
  const http = registrationFixture(t, { customer: null, newCharge: true });
  assert.equal((await registerMember(http.request)).status, 201);
  const chargeIndex = http.requests.findIndex((r) => r.url.hostname === 'provider.invalid' && r.init.method === 'POST');
  assert.ok(chargeIndex > 0);
  const body = JSON.parse(http.requests[chargeIndex].init.body);
  assert.equal(body.customer, 'cus_1'); assert.equal(body.billingType, 'PIX'); assert.equal(body.value, 20); assert.equal(body.externalReference, memberId);
  assert.ok(http.requests.slice(0, chargeIndex).some((r) => r.url.pathname.endsWith('/subscriptions') && r.init.method === 'PATCH' && r.url.searchParams.get('asaas_customer_id') === 'is.null' && JSON.parse(r.init.body).asaas_customer_id === 'cus_1'));
  assert.equal(http.subscription.asaas_customer_id, 'cus_1'); assert.equal(http.subscription.checkout_attempted_at, null);
});

function captureRegistrationEmails() {
  const fetchMock = globalThis.fetch;
  const sent = [];
  Object.assign(process.env, { RESEND_API_KEY: 'mock-only', APT_RESEND_FROM_EMAIL: 'apt@example.invalid', APT_APPLICATION_TO_EMAIL: 'admin@example.invalid' });
  return { sent, fetchMock, capture: (value, init = {}) => {
    if (new URL(value).hostname !== 'api.resend.com') return null;
    sent.push(JSON.parse(init.body));
    return Response.json({ id: `mock-email-${sent.length}` });
  } };
}

test('registration revalidates a receipt arriving after its pending snapshot before notices', async (t) => {
  const http = registrationFixture(t);
  const mail = captureRegistrationEmails();
  let pendingChecks = 0;
  globalThis.fetch = async (value, init = {}) => {
    const captured = mail.capture(value, init);
    if (captured) return captured;
    const response = await mail.fetchMock(value, init);
    const url = new URL(value);
    if (url.pathname.endsWith('/payments') && url.searchParams.get('select') === 'status' && ++pendingChecks === 1) {
      http.payments[0].status = 'RECEIVED'; http.payments[0].paid_at = '2026-10-02';
    }
    return response;
  };
  assert.equal((await registerMember(http.request)).status, 409);
  assert.equal(http.payments[0].status, 'RECEIVED');
  assert.equal(mail.sent.length, 0);
});

test('registration suppresses pending notices when the webhook activates after completion', async (t) => {
  const http = registrationFixture(t);
  const mail = captureRegistrationEmails();
  globalThis.fetch = async (value, init = {}) => {
    const captured = mail.capture(value, init);
    if (captured) return captured;
    const response = await mail.fetchMock(value, init);
    if (new URL(value).pathname.endsWith('/subscriptions') && init.method === 'PATCH' && JSON.parse(init.body).status === 'awaiting_payment') {
      http.payments[0].status = 'CONFIRMED'; http.subscription.status = 'active'; http.member.participation_status = 'active';
    }
    return response;
  };
  assert.equal((await registerMember(http.request)).status, 409);
  assert.equal(http.payments[0].status, 'CONFIRMED'); assert.equal(http.member.participation_status, 'active'); assert.equal(http.subscription.status, 'active');
  assert.equal(mail.sent.length, 0);
});

test('registration honors a manual member-only decision during QR without pending notices', async (t) => {
  for (const status of ['courtesy', 'inactive']) await t.test(status, async (inner) => {
    const http = registrationFixture(inner, { onQr: (_subscription, _payments, member) => { member.participation_status = status; } });
    const mail = captureRegistrationEmails();
    globalThis.fetch = async (value, init = {}) => mail.capture(value, init) || mail.fetchMock(value, init);
    assert.equal((await registerMember(http.request)).status, 409);
    assert.equal(http.member.participation_status, status);
    assert.ok(!http.writes.some((w) => w.table === 'invites' || w.table === 'audit_logs' || (w.table === 'subscriptions' && w.body.status)));
    assert.equal(mail.sent.length, 0);
  });
});

test('registration sends no pending notice when fresh send-boundary validation fails', async (t) => {
  const http = registrationFixture(t);
  const mail = captureRegistrationEmails();
  let pendingChecks = 0;
  globalThis.fetch = async (value, init = {}) => {
    const captured = mail.capture(value, init);
    if (captured) return captured;
    const url = new URL(value);
    if (url.pathname.endsWith('/payments') && url.searchParams.get('select') === 'status' && ++pendingChecks === 2) return Response.json({}, { status: 503 });
    return mail.fetchMock(value, init);
  };
  assert.equal((await registerMember(http.request)).status, 503);
  assert.equal(mail.sent.length, 0);
});
