import assert from "node:assert/strict";
import test from "node:test";
import { asaasPaymentState, isDateBefore, monthlyAccessEnd } from "../lib/billing-state.ts";

test("classifies the Asaas payment states that change member access", () => {
  assert.deepEqual(asaasPaymentState("confirmed"), { normalized: "CONFIRMED", paid: true, failed: false });
  assert.deepEqual(asaasPaymentState("OVERDUE"), { normalized: "OVERDUE", paid: false, failed: true });
  assert.deepEqual(asaasPaymentState("PENDING"), { normalized: "PENDING", paid: false, failed: false });
});

test("grants one calendar month for an explicitly linked one-off payment", () => {
  assert.equal(monthlyAccessEnd("2026-08-16"), "2026-09-16");
  assert.equal(monthlyAccessEnd("2026-01-31T12:00:00Z"), "2026-02-28");
  assert.equal(monthlyAccessEnd("invalid"), null);
  assert.equal(isDateBefore("2026-09-16", "2026-09-17"), true);
  assert.equal(isDateBefore("2026-09-17", "2026-09-17"), false);
});

const { billingDecision } = await import('../lib/billing-state.ts');
const decide = (payments, overrides = {}) => billingDecision({ payments, memberStatus: 'active', subscriptionStatus: 'active', recurring: false, today: '2026-10-02', ...overrides });
const receipt = { id: 'pay_old', status: 'RECEIVED', paymentDate: '2026-08-16', dueDate: '2026-08-16' };

test('expired monthly Pix requires attention and never queues its old confirmation', () => {
  const result = decide([receipt]);
  assert.equal(result.memberStatus, 'pending_payment');
  assert.equal(result.subscriptionStatus, 'past_due');
  assert.equal(result.paidThrough, '2026-09-16');
  assert.deepEqual(result.notice, { kind: 'attention', paymentId: 'pay_old', providerStatus: 'PIX_MONTHLY_DUE' });
});

test('renewed Pix and future pending invoices retain the actual current paid period', () => {
  const renewal = { ...receipt, id: 'pay_new', paymentDate: '2026-09-20', dueDate: '2026-09-20' };
  const future = { id: 'pay_future', status: 'PENDING', dueDate: '2026-10-20' };
  const result = decide([receipt, renewal, future]);
  assert.equal(result.subscriptionStatus, 'active');
  assert.equal(result.paidThrough, '2026-10-20');
  assert.equal(result.notice.paymentId, 'pay_new');
  assert.equal(result.notice.kind, 'confirmed');
});

test('recurring payment coverage uses its billed period; provider status cannot extend an old receipt', () => {
  const old = { ...receipt, paymentDate: '2026-10-01' };
  assert.equal(decide([old], { recurring: true, providerStatus: 'ACTIVE' }).subscriptionStatus, 'past_due');
  assert.equal(decide([old], { recurring: true, providerStatus: 'CANCELLED' }).subscriptionStatus, 'cancelled');
  assert.equal(decide([old], { recurring: true, providerStatus: 'INACTIVE' }).memberStatus, 'cancelled');
  assert.equal(decide([{ id: 'pay_pending', status: 'PENDING', dueDate: '2026-11-01' }], { recurring: true }).subscriptionStatus, 'awaiting_payment');
});

test('manual membership decisions are preserved for receipts and failures', () => {
  for (const status of ['courtesy', 'inactive', 'cancelled', 'cancellation_requested']) {
    for (const payments of [[{ ...receipt, paymentDate: '2026-09-20' }], [{ id: 'pay_bad', status: 'OVERDUE', dueDate: '2026-09-01' }]]) {
      const result = decide(payments, { memberStatus: status, subscriptionStatus: status === 'courtesy' ? 'courtesy' : 'cancelled' });
      assert.equal(result.memberStatus, status);
      assert.equal(result.subscriptionStatus, status === 'courtesy' ? 'courtesy' : 'cancelled');
      assert.equal(result.notice, null);
    }
  }
});

test('deleted and risk-rejected payments share the failure rule; future receipts do not prove current access', () => {
  for (const status of ['DELETED', 'REPROVED_BY_RISK_ANALYSIS']) assert.equal(decide([{ id: 'pay_failed', status, dueDate: '2026-09-01' }]).subscriptionStatus, 'past_due');
  assert.equal(decide([{ ...receipt, dueDate: '2026-11-01' }], { recurring: true }).covered, false);
});

// Execute the real server helpers with isolated in-memory HTTP responses. No provider call escapes this test.
const { registerHooks } = await import('node:module');
const { readFileSync } = await import('node:fs');
const ts = (await import('typescript')).default;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.includes('/lib/') && !/\.[a-z]+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') && url.includes('/lib/')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { retryBillingEmailDeliveries } = await import('../lib/apt-email.ts');
const { assertBillingOwnership, reconcileMemberBilling } = await import('../lib/billing-reconciliation.ts');

function mockBillingHttp(t, options = {}) {
  const originalFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: 'https://local.invalid', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test', ASAAS_API_KEY: 'test', ASAAS_API_BASE_URL: 'https://provider.invalid/v3', RESEND_API_KEY: 'test', APT_RESEND_FROM_EMAIL: 'apt@example.com' });
  const writes = [];
  let sends = 0;
  const member = { id: 'member_1', name: 'Atleta', email: 'member@example.com', participation_status: options.memberStatus || 'active', joined_at: null };
  const subscription = { id: 'local_sub', member_id: member.id, asaas_customer_id: options.localCustomer || 'cus_1', asaas_subscription_id: options.recurring ? 'sub_1' : null, asaas_checkout_id: options.checkoutId || null, status: options.subscriptionStatus || 'active', amount_cents: 10000, next_due_date: null, current_period_end: null };
  const payments = options.payments || [];
  globalThis.fetch = async (value, init = {}) => {
    const url = new URL(value);
    if (url.hostname === 'api.resend.com') { sends++; return Response.json({ id: 'email_test' }); }
    if (url.hostname === 'provider.invalid') {
      if (url.pathname === '/v3/subscriptions/sub_new') return Response.json({ id: 'sub_new', customer: 'cus_new', status: 'ACTIVE' });
      if (url.pathname === '/v3/subscriptions/sub_1') return Response.json({ id: 'sub_1', customer: 'cus_1', status: options.providerStatus || 'ACTIVE', nextDueDate: '2027-01-01' });
      if (url.pathname === '/v3/subscriptions') return Response.json({ data: [] });
      if (url.pathname.includes('/payments')) {
        if (options.providerFailure) return Response.json({}, { status: 503 });
        const offset = Number(url.searchParams.get('offset') || 0);
        const data = options.externalOnly && !url.searchParams.has('externalReference') ? [] : options.checkoutPayments && url.searchParams.has('checkoutSession') ? options.checkoutPayments : options.paginated && offset === 0 ? Array.from({ length: 100 }, (_, i) => ({ id: `pay_future_${i}`, customer: 'cus_1', status: 'PENDING', dueDate: '2026-12-01' })) : options.providerPayments || payments;
        return Response.json({ data, hasMore: Boolean(options.incompleteHistory || (options.paginated && offset === 0)) });
      }
      throw new Error(`Unexpected provider request: ${url}`);
    }
    assert.equal(url.hostname, 'local.invalid', 'No real service is called');
    const table = url.pathname.split('/').at(-1);
    if (init.method && init.method !== 'GET') {
      const body = JSON.parse(init.body); writes.push({ table, query: url.searchParams, body });
      if (table === 'subscriptions' && init.headers?.Prefer === 'return=representation') {
        const originalCustomer = url.searchParams.get('asaas_customer_id');
        if (originalCustomer !== (subscription.asaas_customer_id ? `eq.${subscription.asaas_customer_id}` : 'is.null')) return Response.json([]);
        Object.assign(subscription, body); return Response.json([subscription]);
      }
      if (table === 'billing_email_deliveries' && init.headers?.Prefer === 'return=representation') return Response.json([{ id: options.delivery.id }]);
      return Response.json([]);
    }
    if (table === 'members') return Response.json([member]);
    if (table === 'subscriptions') return Response.json(url.searchParams.has('member_id') ? [subscription] : options.foreignOwner ? [{ member_id: 'someone_else' }] : []);
    if (table === 'payments') return Response.json(url.searchParams.has('member_id') ? payments.map((p) => ({ asaas_payment_id: p.id, status: p.status, due_date: p.dueDate, paid_at: p.paymentDate, created_at: p.dueDate })) : options.foreignOwner ? [{ member_id: 'someone_else' }] : []);
    if (table === 'billing_email_deliveries') return Response.json(options.delivery ? [options.delivery] : []);
    throw new Error(`Unexpected local request: ${url}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; process.env = oldEnv; });
  return { writes, get sends() { return sends; } };
}

test('reconciliation reads beyond a future-pending page and never uses scheduled nextDueDate as coverage', async (t) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const http = mockBillingHttp(t, { recurring: true, paginated: true, payments: [{ id: 'pay_current', customer: 'cus_1', subscription: 'sub_1', status: 'RECEIVED', dueDate: today }] });
  await reconcileMemberBilling('member_1');
  const update = http.writes.find((w) => w.table === 'subscriptions' && w.body.status).body;
  assert.equal(update.status, 'active');
  assert.equal(update.current_period_end, monthlyAccessEnd(today));
  assert.equal(update.next_due_date, '2027-01-01');
  assert.ok(http.writes.filter((w) => w.table === 'payments' && w.body.member_id).every((w) => w.query.get('on_conflict') === 'asaas_payment_id'));
});

test('ownership collisions fail before financial writes', async (t) => {
  const http = mockBillingHttp(t, { foreignOwner: true });
  await assert.rejects(assertBillingOwnership('member_1', { id: 'pay_foreign', customer: 'cus_foreign' }), /outro atleta/);
  assert.equal(http.writes.length, 0);
  await assert.rejects(assertBillingOwnership('member_1', { externalReference: 'member_other' }), /outro cadastro/);
});

test('queued attention is suppressed after settlement and for closed manual states before any send', async (t) => {
  for (const memberStatus of ['active', 'courtesy', 'inactive', 'cancelled', 'cancellation_requested']) {
    await t.test(memberStatus, async (inner) => {
      const http = mockBillingHttp(inner, { memberStatus, subscriptionStatus: memberStatus === 'active' ? 'active' : 'cancelled', delivery: { id: 'delivery_1', dedupe_key: 'test', member_id: 'member_1', payment_id: 'pay_old', kind: 'attention', recipient_email: 'member@example.com', subject: 'Pending', body_text: 'Pending', flow: 'test', status: 'failed', attempt_count: 1, provider_status: 'PIX_MONTHLY_DUE' }, payments: [{ ...receipt, paymentDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }] });
      assert.deepEqual(await retryBillingEmailDeliveries(), ['suppressed']);
      assert.equal(http.sends, 0);
      assert.equal(http.writes[0].body.status, 'suppressed');
    });
  }
});


test('no receipt cannot retain an unprotected active recurring state', () => {
  const result = decide([], { recurring: true });
  assert.equal(result.memberStatus, 'awaiting_payment');
  assert.equal(result.subscriptionStatus, 'awaiting_payment');
  assert.equal(result.paidThrough, null);
});

test('late card receipt applies to its due month despite a newer scheduled invoice', () => {
  const result = decide([
    { id: 'pay_august', status: 'RECEIVED', dueDate: '2026-08-21', paymentDate: '2026-09-22' },
    { id: 'pay_september', status: 'OVERDUE', dueDate: '2026-09-21' },
    { id: 'pay_october', status: 'PENDING', dueDate: '2026-10-21' },
  ], { recurring: true });
  assert.equal(result.subscriptionStatus, 'past_due');
  assert.equal(result.paidThrough, '2026-09-21');
  assert.equal(result.notice.paymentId, 'pay_september');
});

const queuedAttention = { id: 'delivery_1', dedupe_key: 'test', member_id: 'member_1', payment_id: 'pay_old', kind: 'attention', recipient_email: 'member@example.com', subject: 'Pending', body_text: 'Pending', flow: 'test', status: 'failed', attempt_count: 1, provider_status: 'PIX_MONTHLY_DUE' };

test('a new provider Pix receipt suppresses an old notice while local state still says past_due', async (t) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const http = mockBillingHttp(t, { memberStatus: 'pending_payment', subscriptionStatus: 'past_due', payments: [receipt], providerPayments: [receipt, { ...receipt, id: 'pay_renewed', customer: 'cus_1', paymentDate: today }], delivery: queuedAttention });
  assert.deepEqual(await retryBillingEmailDeliveries(), ['suppressed']);
  assert.equal(http.sends, 0);
});

test('provider revalidation outage or truncated history stays retryable without sending', async (t) => {
  for (const options of [{ providerFailure: true }, { incompleteHistory: true }]) {
    await t.test(JSON.stringify(options), async (inner) => {
      const http = mockBillingHttp(inner, { ...options, memberStatus: 'pending_payment', subscriptionStatus: 'past_due', payments: [receipt], delivery: queuedAttention });
      assert.deepEqual(await retryBillingEmailDeliveries(), ['failed']);
      assert.equal(http.sends, 0);
      assert.equal(http.writes[0].body.status, 'failed');
      assert.equal(http.writes[0].body.attempt_count, 2);
      assert.ok(http.writes[0].body.next_attempt_at);
    });
  }
});

test('current provider arrears still send attention when an old local active flag is stale', async (t) => {
  const http = mockBillingHttp(t, { memberStatus: 'active', subscriptionStatus: 'active', payments: [receipt], delivery: queuedAttention });
  assert.deepEqual(await retryBillingEmailDeliveries(), ['sent']);
  assert.equal(http.sends, 1);
  assert.equal(http.writes.find((write) => write.body.status === 'sent').body.provider_message_id, 'email_test');
});

test('a provider receipt arriving during claim suppresses the already queued attention before POST', async (t) => {
  const options = { memberStatus: 'active', subscriptionStatus: 'active', payments: [receipt], providerPayments: [receipt], delivery: queuedAttention };
  const http = mockBillingHttp(t, options);
  const fetchMock = globalThis.fetch;
  globalThis.fetch = async (value, init = {}) => {
    const response = await fetchMock(value, init);
    if (new URL(value).pathname.endsWith('/billing_email_deliveries') && init.method === 'PATCH' && JSON.parse(init.body).send_claimed_at) {
      options.providerPayments = [{ ...receipt, id: 'pay_renewal', paymentDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }];
    }
    return response;
  };
  assert.deepEqual(await retryBillingEmailDeliveries(), ['suppressed']);
  assert.equal(http.sends, 0);
  const suppression = http.writes.find((write) => write.body.status === 'suppressed');
  assert.equal(suppression.query.get('send_claimed_at'), `eq.${http.writes[0].body.send_claimed_at}`);
  assert.equal(suppression.body.send_claimed_at, null);
});


test('a settled invoice cannot reuse its queued overdue body as a monthly renewal notice', async (t) => {
  const http = mockBillingHttp(t, { recurring: true, memberStatus: 'pending_payment', subscriptionStatus: 'past_due', payments: [{ ...receipt, dueDate: '2026-08-21', paymentDate: '2026-09-22' }], delivery: { ...queuedAttention, provider_status: 'OVERDUE' } });
  assert.deepEqual(await retryBillingEmailDeliveries(), ['suppressed']);
  assert.equal(http.sends, 0);
  assert.equal(http.writes[0].body.status, 'suppressed');
});

test('an old nonempty Checkout history cannot hide a subsequent paid customer renewal', async (t) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const http = mockBillingHttp(t, { checkoutId: 'checkout_old', checkoutPayments: [{ id: 'pay_checkout_future', status: 'PENDING', dueDate: '2027-01-01', customer: 'cus_1' }], payments: [receipt, { ...receipt, id: 'pay_renewed', customer: 'cus_1', paymentDate: today }] });
  await reconcileMemberBilling('member_1');
  const update = http.writes.find((w) => w.table === 'subscriptions' && w.body.status).body;
  assert.equal(update.status, 'active');
  assert.equal(update.current_period_end, monthlyAccessEnd(today));
});


test('late recovery through a payment cannot replace the member existing provider customer', async (t) => {
  const http = mockBillingHttp(t, { localCustomer: 'cus_old', externalOnly: true, payments: [{ ...receipt, id: 'pay_new_customer', externalReference: 'member_1', customer: 'cus_new', subscription: 'sub_new' }] });
  await assert.rejects(reconcileMemberBilling('member_1'), /outro cliente financeiro/);
  assert.equal(http.writes.length, 0);
  assert.equal(http.sends, 0);
});

test('fresh provider history wins over an older webhook snapshot for the same payment', async (t) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  for (const status of ['RECEIVED', 'REFUNDED']) {
    await t.test(status, async (inner) => {
      const fresh = { ...receipt, id: 'pay_racing', customer: 'cus_1', status, dueDate: today, paymentDate: today };
      const stale = { ...fresh, status: status === 'RECEIVED' ? 'OVERDUE' : 'RECEIVED' };
      const http = mockBillingHttp(inner, { payments: [fresh] });
      await reconcileMemberBilling('member_1', { paymentSnapshot: stale });
      const persisted = http.writes.find((w) => w.table === 'payments' && w.body.asaas_payment_id === fresh.id);
      assert.equal(persisted.body.status, status);
      assert.equal(http.writes.find((w) => w.table === 'subscriptions' && w.body.status).body.status, status === 'RECEIVED' ? 'active' : 'past_due');
    });
  }
});

test('a verified deleted-payment snapshot remains usable when absent from provider history', async (t) => {
  const http = mockBillingHttp(t, { payments: [] });
  await reconcileMemberBilling('member_1', { paymentSnapshot: { ...receipt, status: 'DELETED', customer: 'cus_1' } });
  assert.equal(http.writes.find((w) => w.table === 'payments' && w.body.asaas_payment_id === receipt.id).body.status, 'DELETED');
  assert.equal(http.writes.find((w) => w.table === 'subscriptions' && w.body.status).body.status, 'past_due');
});
