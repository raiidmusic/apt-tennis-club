import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { retryBillingEmailDeliveries, sendMemberEmail, sendManagementEmail } = await import('../lib/apt-email.ts');
const { memberEmailCommunications, emailObservabilityConfiguration } = await import('../lib/email-observability.ts');
const { POST: webhook } = await import('../app/api/webhooks/resend/route.ts');
const { GET: memberGet } = await import('../app/api/membros/route.ts');
const { billingOperationsSummary } = await import('../lib/billing-recovery.ts');
const memberId = '12345678-1234-4234-9234-123456789012';
const emailId = '56761188-7520-42d8-8898-ff6fc54ce618';
const secret = `whsec_${Buffer.from('test signing secret with adequate entropy').toString('base64')}`;
const input = { to: 'member@example.com', subject: 'APT', text: 'APT', flow: 'test', idempotencyKey: 'apt-test' };

// Exercise actual Request, HMAC, sender and REST calls; never connect to a real account.
function http(t, options = {}) {
  const previousFetch = globalThis.fetch, previousEnv = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: 'https://local.invalid', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test', RESEND_API_KEY: 'test', APT_RESEND_FROM_EMAIL: 'apt@example.com', APT_ADMIN_EMAILS: 'admin@example.com', RESEND_WEBHOOK_SECRET: secret });
  const row = { id: 'delivery_1', member_id: memberId, dedupe_key: 'apt-checkout-reminder-1-member-test', kind: 'checkout_reminder', audience: 'member', checkout_id: 'checkout_1', recipient_email: 'private@example.com', subject: 'Private subject', body_text: 'Private body https://private.invalid', flow: 'checkout_payment_reminder_1', status: 'pending', attempt_count: 0, provider_status: 'AWAITING_PAYMENT', send_claimed_at: null, provider_message_id: null, sent_at: null, created_at: '2026-10-02T00:00:00Z', next_attempt_at: '2026-01-01T00:00:00Z', last_error: null, ...options.row };
  const state = { rows: options.rows || [row], ledger: new Map(), writes: [], requests: [], sends: 0, failLedger: false };
  const matches = (item, query) => [...query].every(([key, value]) => {
    if (['select', 'order', 'limit', 'on_conflict'].includes(key)) return true;
    if (value === 'is.null') return item[key] == null;
    if (value === 'not.is.null') return item[key] != null;
    if (value.startsWith('eq.')) return String(item[key]) === value.slice(3);
    if (value.startsWith('in.(')) return value.slice(4, -1).split(',').includes(String(item[key]));
    if (value.startsWith('lte.')) return new Date(item[key]) <= new Date(value.slice(4));
    return true;
  });
  globalThis.fetch = async (value, init = {}) => {
    const url = new URL(value); state.requests.push(url);
    if (url.hostname === 'api.resend.com') {
      state.sends++;
      if (options.assertClaim) assert.ok(state.rows[0].send_claimed_at, 'claim is durable before POST');
      assert.equal(init.headers['Idempotency-Key'], options.wrapper ? 'apt-test' : row.dedupe_key);
      return options.provider ? options.provider(init) : Response.json({ id: emailId });
    }
    assert.equal(url.hostname, 'local.invalid', 'No real account is called');
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'admin_user', email: 'admin@example.com' });
    const table = url.pathname.split('/').at(-1);
    if (init.method === 'HEAD') return new Response(null, { headers: { 'content-range': `*/${table === 'billing_email_deliveries' ? state.rows.filter((item) => matches(item, url.searchParams)).length : 0}` } });
    if (init.method === 'PATCH' && table === 'billing_email_deliveries') {
      const body = JSON.parse(init.body); state.writes.push(body);
      if (options.failAcceptance && body.status === 'sent') return Response.json({ message: 'DB unavailable' }, { status: 503 });
      const selected = state.rows.filter((item) => matches(item, url.searchParams));
      for (const item of selected) Object.assign(item, body);
      return Response.json(init.headers.Prefer === 'return=representation' ? selected.map((item) => ({ id: item.id })) : []);
    }
    if (init.method === 'POST' && table === 'email_delivery_events') {
      if (state.failLedger) return Response.json({ message: 'DB unavailable' }, { status: 503 });
      const body = JSON.parse(init.body);
      assert.equal(url.searchParams.get('on_conflict'), 'event_id');
      assert.equal(init.headers.Prefer, 'resolution=ignore-duplicates,return=minimal');
      if (!state.ledger.has(body.event_id)) state.ledger.set(body.event_id, body);
      return new Response(null, { status: 204 });
    }
    if (table === 'billing_email_deliveries') return Response.json(state.rows.filter((item) => matches(item, url.searchParams)).slice(0, Number(url.searchParams.get('limit') || 100)).map((item) => ({ ...item })));
    if (table === 'email_delivery_events') return Response.json([...state.ledger.values()].filter((item) => matches(item, url.searchParams)).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, Number(url.searchParams.get('limit') || 100)));
    if (table === 'email_delivery_observations') {
      const grouped = new Map();
      const fields = { 'email.sent': 'accepted_at', 'email.delivered': 'delivered_at', 'email.opened': 'opened_at', 'email.clicked': 'clicked_at', 'email.delivery_delayed': 'delayed_at', 'email.failed': 'failed_at', 'email.bounced': 'bounced_at', 'email.complained': 'complained_at', 'email.suppressed': 'suppressed_at' };
      for (const event of state.ledger.values()) {
        const observed = grouped.get(event.provider_email_id) || { provider_email_id: event.provider_email_id, event_total: 0 };
        observed.event_total++; observed[fields[event.event_type]] = event.occurred_at; grouped.set(event.provider_email_id, observed);
      }
      return Response.json([...grouped.values()].filter((item) => matches(item, url.searchParams)));
    }
    if (table === 'members') return Response.json([{ id: memberId, name: 'Atleta', email: 'private@example.com', participation_status: 'awaiting_payment' }]);
    if (table === 'subscriptions') return Response.json([{ member_id: memberId, status: 'awaiting_payment', asaas_checkout_id: 'checkout_1', asaas_checkout_url: 'https://checkout.invalid', asaas_checkout_expires_at: new Date(Date.now() + 86_400_000).toISOString() }]);
    if (['payments', 'admin_notes', 'audit_logs', 'webhook_events'].includes(table)) return Response.json([]);
    throw new Error(`Unexpected request: ${url}`);
  };
  t.after(() => { globalThis.fetch = previousFetch; process.env = previousEnv; });
  return state;
}

function signed(type = 'email.delivered', options = {}) {
  const raw = options.raw ?? JSON.stringify({ type, created_at: options.createdAt || '2026-10-02T00:00:00Z', data: { email_id: emailId, to: ['private@example.com'], subject: 'Private subject', content: 'Private body', ip: '127.0.0.1' } });
  const id = options.id || 'msg_test', timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', Buffer.from((options.secret || secret).slice(6), 'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return new Request('https://apt.invalid/api/webhooks/resend', { method: 'POST', body: options.tampered ?? raw, headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': options.signatures?.(signature) || `v1,${signature}` } });
}

test('legacy wrappers return status strings while HTTP OK without ID never reports sent', async (t) => {
  const state = http(t, { wrapper: true });
  assert.equal(await sendMemberEmail(input), 'sent');
  assert.equal(await sendManagementEmail(input), 'sent');
  delete process.env.RESEND_API_KEY;
  assert.equal(await sendMemberEmail(input), 'not_configured'); assert.equal(state.sends, 2);
  process.env.RESEND_API_KEY = 'test';
  globalThis.fetch = async () => Response.json({});
  assert.equal(await sendMemberEmail(input), 'failed');
});

test('billing persists real provider ID and acceptance time only after checked claim', async (t) => {
  const state = http(t, { assertClaim: true });
  assert.deepEqual(await retryBillingEmailDeliveries(), ['sent']);
  assert.equal(state.rows[0].provider_message_id, emailId); assert.ok(state.rows[0].sent_at);
  assert.equal(state.rows[0].send_claimed_at, null); assert.equal(state.rows[0].attempt_count, 1);
  assert.deepEqual(await retryBillingEmailDeliveries(), []); assert.equal(state.sends, 1);
});

test('concurrent outbox readers acquire one durable claim and perform one POST', async (t) => {
  const state = http(t, { assertClaim: true });
  await Promise.all([retryBillingEmailDeliveries(), retryBillingEmailDeliveries()]);
  assert.equal(state.sends, 1); assert.equal(state.rows[0].status, 'sent');
});

test('receipt or protected membership arriving during claim suppresses before any POST', async (t) => {
  for (const memberStatus of ['active', 'courtesy', 'inactive', 'cancelled', 'cancellation_requested']) await t.test(memberStatus, async (inner) => {
    const state = http(inner, { assertClaim: true });
    const originalMock = globalThis.fetch;
    let changed = false;
    globalThis.fetch = async (value, init = {}) => {
      const url = new URL(value);
      if (changed && url.pathname.endsWith('/members')) return Response.json([{ id: memberId, participation_status: memberStatus }]);
      if (changed && url.pathname.endsWith('/subscriptions')) return Response.json([{ member_id: memberId, status: memberStatus === 'active' ? 'active' : 'cancelled' }]);
      const response = await originalMock(value, init);
      if (url.pathname.endsWith('/billing_email_deliveries') && init.method === 'PATCH' && JSON.parse(init.body).send_claimed_at) changed = true;
      return response;
    };
    assert.deepEqual(await retryBillingEmailDeliveries(), ['suppressed']);
    assert.equal(state.sends, 0); assert.equal(changed, true);
    assert.equal(state.rows[0].status, 'suppressed'); assert.equal(state.rows[0].send_claimed_at, null);
  });
});

test('post-claim validation failure sends nothing and releases only its own unsent claim', async (t) => {
  const state = http(t);
  const originalMock = globalThis.fetch;
  globalThis.fetch = async (value, init = {}) => {
    const url = new URL(value);
    if (state.rows[0].send_claimed_at && url.pathname.endsWith('/members')) return Response.json({ message: 'read failed' }, { status: 503 });
    return originalMock(value, init);
  };
  assert.deepEqual(await retryBillingEmailDeliveries(), ['failed']);
  assert.equal(state.sends, 0); assert.equal(state.rows[0].send_claimed_at, null);
  assert.equal(state.rows[0].last_error, 'pre_send_validation_failed'); assert.ok(state.rows[0].next_attempt_at);
});

test('only documented rejection releases claim; uncertain responses never automatically retry', async (t) => {
  const cases = [
    { name: 'validation', status: 400, body: { name: 'validation_error' }, rejected: true },
    { name: 'rate limit', status: 429, body: { name: 'rate_limit_exceeded' }, rejected: true },
    { name: 'unknown 4xx', status: 422, body: { name: 'unknown' } },
    { name: 'in flight', status: 409, body: { name: 'concurrent_idempotent_requests' } },
    { name: 'server error', status: 500, body: { name: 'application_error' } },
    { name: 'missing ID', status: 200, body: {} },
    { name: 'network after POST', error: new TypeError('network failure') },
    { name: 'timeout after POST', error: new DOMException('deadline', 'TimeoutError') },
    { name: 'abort after POST', error: new DOMException('abort', 'AbortError') },
  ];
  for (const item of cases) await t.test(item.name, async (inner) => {
    const state = http(inner, { assertClaim: true, provider: () => { if (item.error) throw item.error; return Response.json(item.body, { status: item.status }); } });
    assert.deepEqual(await retryBillingEmailDeliveries(), [item.rejected ? 'failed' : 'review_required']);
    assert.equal(Boolean(state.rows[0].send_claimed_at), !item.rejected);
    if (item.rejected) assert.ok(state.rows[0].next_attempt_at);
    else { assert.equal(state.rows[0].status, 'pending'); assert.equal(state.rows[0].provider_message_id, null); }
    await retryBillingEmailDeliveries(); assert.equal(state.sends, 1);
  });
});

test('accepted-send persistence failure leaves claim visible and never retries even after 24 hours', async (t) => {
  const state = http(t, { failAcceptance: true });
  assert.deepEqual(await retryBillingEmailDeliveries(), ['review_required']);
  state.rows[0].send_claimed_at = '2026-01-01T00:00:00Z';
  assert.deepEqual(await retryBillingEmailDeliveries(), []); assert.equal(state.sends, 1);
  const projection = await memberEmailCommunications(memberId);
  assert.equal(projection.messages[0].deliveryIssue, 'send_result_unknown');
  assert.equal((await billingOperationsSummary()).emails.reviewRequired, 1);
});

test('missing configuration never claims or sends', async (t) => {
  const state = http(t); delete process.env.RESEND_API_KEY;
  assert.deepEqual(await retryBillingEmailDeliveries(), ['not_configured']);
  assert.equal(state.rows[0].send_claimed_at, null); assert.equal(state.sends, 0);
});

test('raw tampering, stale/future attempts and invalid signatures fail before any DB access', async (t) => {
  const state = http(t);
  for (const request of [signed('email.delivered', { tampered: '{}' }), signed('email.delivered', { timestamp: Math.floor(Date.now() / 1000) - 600 }), signed('email.delivered', { timestamp: Math.floor(Date.now() / 1000) + 600 }), signed('email.delivered', { signatures: () => 'v1,broken' })]) assert.equal((await webhook(request)).status, 401);
  assert.equal(state.requests.length, 0);
  delete process.env.RESEND_WEBHOOK_SECRET;
  assert.equal((await webhook(signed())).status, 503); assert.equal(state.requests.length, 0);
});

test('timestamp tolerance accepts 299 seconds and rejects 301 seconds in either direction', async (t) => {
  const previousNow = Date.now;
  const fixedNow = Math.floor(previousNow() / 1000) * 1000;
  Date.now = () => fixedNow;
  t.after(() => { Date.now = previousNow; });
  const state = http(t);
  for (const offset of [-299, 299]) assert.equal((await webhook(signed('email.delivered', { id: `msg_valid_${offset < 0 ? 'past' : 'future'}`, timestamp: fixedNow / 1000 + offset }))).status, 200);
  for (const offset of [-301, 301]) assert.equal((await webhook(signed('email.delivered', { timestamp: fixedNow / 1000 + offset }))).status, 401);
  assert.equal(state.ledger.size, 2);
});

test('rotation accepts any valid v1 signature, including second signature and unpadded secret', async (t) => {
  const state = http(t);
  process.env.RESEND_WEBHOOK_SECRET = secret.replace(/=+$/, '');
  const request = signed('email.delivered', { signatures: (valid) => `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= v2,${valid} v1,${valid}` });
  assert.equal((await webhook(request)).status, 200); assert.equal(state.ledger.size, 1);
});

test('authenticated malformed ID/type/date and oversized raw body never reach the ledger', async (t) => {
  const state = http(t);
  for (const raw of ['null', '{}', JSON.stringify({ type: 'email.unknown', created_at: '2026-10-02T00:00:00Z', data: { email_id: emailId } }), JSON.stringify({ type: 'email.delivered', created_at: '2026-02-30T00:00:00Z', data: { email_id: emailId } }), JSON.stringify({ type: 'email.delivered', created_at: '2026-10-02T00:00:00Z', data: { email_id: '../private' } })]) assert.equal((await webhook(signed('email.delivered', { raw }))).status, 400);
  assert.equal((await webhook(signed('email.delivered', { raw: 'x'.repeat(65_537) }))).status, 413);
  assert.equal(state.requests.length, 0);
});

test('durable duplicate event is inserted once and DB failure responds 500 for provider retry', async (t) => {
  const state = http(t);
  state.failLedger = true; assert.equal((await webhook(signed())).status, 500); assert.equal(state.ledger.size, 0);
  state.failLedger = false;
  const responses = await Promise.all([webhook(signed()), webhook(signed())]);
  assert.ok(responses.every((response) => response.status === 200)); assert.equal(state.ledger.size, 1);
  assert.deepEqual(Object.keys([...state.ledger.values()][0]).sort(), ['event_id', 'event_type', 'occurred_at', 'provider_email_id', 'received_at']);
});

test('out-of-order events before outbox ID remain available for later correlation without implying read', async (t) => {
  const state = http(t);
  for (const [id, type, createdAt] of [['msg_click', 'email.clicked', '2026-10-02T00:00:01Z'], ['msg_open', 'email.opened', '2026-10-02T00:00:02Z'], ['msg_delivered', 'email.delivered', '2026-10-02T00:00:03Z'], ['msg_bounce', 'email.bounced', '2026-10-02T00:00:04Z']]) assert.equal((await webhook(signed(type, { id, createdAt }))).status, 200);
  assert.equal((await memberEmailCommunications(memberId)).messages[0].correlationAvailable, false);
  state.rows[0].provider_message_id = emailId;
  const message = (await memberEmailCommunications(memberId)).messages[0];
  assert.equal(message.clickedAt, '2026-10-02T00:00:01.000Z'); assert.equal(message.openedAt, '2026-10-02T00:00:02.000Z');
  assert.equal(message.recipientServerDeliveredAt, '2026-10-02T00:00:03.000Z'); assert.ok(message.bouncedAt);
  assert.equal(message.sendingStatus, 'pending'); assert.equal(state.sends, 0);
  assert.doesNotMatch(JSON.stringify(message), /private|subject|body_text|https:|readAt|headers|127\.0\.0\.1/i);
});

test('projection limits events with explicit total while retaining complete independent delivery evidence', async (t) => {
  const state = http(t, { row: { provider_message_id: emailId } });
  await webhook(signed('email.delivered', { id: 'msg_delivery' }));
  for (let index = 0; index < 20; index++) await webhook(signed('email.opened', { id: `msg_open_${index}`, createdAt: `2026-10-02T01:00:${String(index).padStart(2, '0')}Z` }));
  const message = (await memberEmailCommunications(memberId)).messages[0];
  assert.equal(message.eventTotal, 21); assert.equal(message.events.length, 12); assert.equal(message.eventsTruncated, true);
  assert.ok(message.recipientServerDeliveredAt); assert.equal(state.sends, 0);
});

test('historical accepted records have no invented events, private error strings or correlation', async (t) => {
  http(t, { row: { status: 'sent', sent_at: '2026-08-20T00:00:00Z', last_error: 'private provider body' } });
  const message = (await memberEmailCommunications(memberId)).messages[0];
  assert.ok(message.acceptedAt); assert.equal(message.correlationAvailable, false); assert.equal(message.recipientServerDeliveredAt, null);
  assert.equal(message.openedAt, null); assert.equal(message.clickedAt, null); assert.deepEqual(message.events, []); assert.equal(message.deliveryIssue, null);
});

test('provider identifiers cannot inject PostgREST filters or reach provider ID storage', async (t) => {
  const state = http(t, { row: { provider_message_id: `${emailId},other)` } });
  const projection = await memberEmailCommunications(memberId);
  assert.equal(projection.messages[0].correlationAvailable, false);
  assert.equal(state.requests.some((url) => url.pathname.endsWith('/email_delivery_events') || url.pathname.endsWith('/email_delivery_observations')), false);
});

test('message truncation and unknown claimed errors stay explicit without exposing provider error strings', async (t) => {
  const rows = Array.from({ length: 13 }, (_, index) => ({ id: `delivery_${index}`, member_id: memberId, kind: 'attention', audience: 'member', status: 'pending', created_at: '2026-10-02T00:00:00Z', provider_message_id: null, send_claimed_at: '2026-10-02T00:00:00Z', last_error: 'secret provider body private@example.com' }));
  http(t, { rows });
  const projection = await memberEmailCommunications(memberId);
  assert.equal(projection.total, 13); assert.equal(projection.messages.length, 12); assert.equal(projection.truncated, true);
  assert.ok(projection.messages.every((message) => message.deliveryIssue === 'send_result_unknown'));
  assert.doesNotMatch(JSON.stringify(projection), /secret|private@example.com/);
});

test('member detail configuration/communications require admin and expose booleans without secret values', async (t) => {
  const state = http(t);
  assert.equal((await memberGet(new Request(`https://apt.invalid/api/membros?id=${memberId}`))).status, 401);
  assert.equal(state.requests.length, 0);
  const response = await memberGet(new Request(`https://apt.invalid/api/membros?id=${memberId}`, { headers: { cookie: 'apt_access_token=test' } }));
  assert.equal(response.status, 200);
  const data = await response.json(); assert.deepEqual(data.emailConfiguration, { webhookSecretConfigured: true, trackingVerification: 'not_verified' });
  assert.equal(data.member.communications.total, 1); assert.equal(JSON.stringify(data).includes(secret), false);
  assert.deepEqual(emailObservabilityConfiguration(), data.emailConfiguration);
});

test('prepared additive schema deduplicates events and protects ledger/view from public roles', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261002231129_resend_email_observability.sql', import.meta.url), 'utf8');
  assert.match(sql, /event_id text primary key/); assert.match(sql, /enable row level security/);
  assert.match(sql, /security_invoker = true/); assert.match(sql, /revoke all on public.email_delivery_events from public, anon, authenticated/);
  assert.match(sql, /revoke all on public.email_delivery_observations from public, anon, authenticated/);
  assert.match(sql, /grant select, insert on public.email_delivery_events to service_role/);
  assert.doesNotMatch(sql, /raw_payload|\bto\b text|subject|cpf|content|headers|ip_address|user_agent/i);
});
