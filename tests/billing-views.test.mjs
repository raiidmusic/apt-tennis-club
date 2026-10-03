import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
const { billingCalendarDate, billingMonthKeys, financialPayment, memberFinancialView, financialMetricRows } = await import('../lib/billing-view.ts');
const { saoPauloDate } = await import('../lib/billing-state.ts');
const { supabaseAll } = await import('../lib/supabase-server.ts');
const { GET: memberGet } = await import('../app/api/membros/route.ts');
const { GET: portalGet, PATCH: portalPatch } = await import('../app/api/portal/route.ts');
const id = '12345678-1234-4234-9234-123456789012';
const payment = (changes = {}) => ({ id: 'payment_1', member_id: id, asaas_payment_id: 'pay_1', status: 'RECEIVED', value_cents: 2000, due_date: '2026-09-01', paid_at: null, invoice_url: null, created_at: '2026-08-01T00:00:00Z', payload: { billingType: 'PIX', paymentDate: '2026-09-01' }, ...changes });
const subscription = (changes = {}) => ({ id: 'sub_local', member_id: id, status: 'active', amount_cents: 2000, asaas_customer_id: 'cus_1', asaas_subscription_id: null, asaas_checkout_id: null, current_period_end: '2028-01-01', ...changes });

function mock(t, options = {}) {
  const previousFetch = globalThis.fetch, previousEnv = { ...process.env }, requests = [];
  Object.assign(process.env, { SUPABASE_URL: 'https://db.invalid', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test', ASAAS_API_KEY: 'test', ASAAS_API_BASE_URL: 'https://provider.invalid/v3', APT_PUBLIC_URL: 'https://apt.invalid', APT_ADMIN_EMAILS: 'admin@example.invalid' });
  delete process.env.RESEND_API_KEY;
  const member = { id, auth_user_id: 'auth_1', name: 'Atleta', email: 'member@example.invalid', whatsapp: '11999999999', participation_status: options.memberStatus || 'active', created_at: '2026-08-01T00:00:00Z' };
  const data = { members: [member], subscriptions: [options.subscription || subscription()], payments: options.payments || [], admin_notes: [], billing_email_deliveries: [], email_delivery_observations: [], email_delivery_events: [] };
  globalThis.fetch = async (value, init = {}) => {
    const url = new URL(value); requests.push({ url, init });
    assert.ok(['db.invalid', 'provider.invalid'].includes(url.hostname), 'No real service');
    if (url.hostname === 'provider.invalid') { assert.equal(init.method, 'DELETE'); options.onDelete?.(member, data.subscriptions[0], data); return new Response(null, { status: 204 }); }
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'auth_1', email: options.admin === false ? member.email : 'admin@example.invalid' });
    const table = url.pathname.split('/').at(-1), q = url.searchParams;
    const rows = (data[table] || []).filter((row) => ['id', 'member_id', 'auth_user_id'].every((key) => !q.has(key) || q.get(key) === `eq.${row[key]}`));
    if (init.method === 'HEAD') return new Response(null, { headers: { 'content-range': `*/${options.count ?? rows.length}` } });
    if (init.method && init.method !== 'GET') { const body = JSON.parse(init.body || '{}'); if (table === 'audit_logs' && init.method === 'POST') options.onAudit?.(data); if (table === 'members' && q.has('participation_status') && q.get('participation_status') !== `eq.${member.participation_status}`) return Response.json([]); const changed = rows.map((row) => Object.assign(row, body)); return Response.json(changed); }
    return Response.json(rows.slice(Number(q.get('offset') || 0), Number(q.get('offset') || 0) + Math.min(Number(q.get('limit') || 1000), options.pageSize || 500)));
  };
  t.after(() => { globalThis.fetch = previousFetch; process.env = previousEnv; });
  return { requests, data };
}
const request = (path = '/api/membros', action) => new Request(`https://apt.invalid${path}`, { headers: { cookie: 'apt_access_token=test', origin: 'https://apt.invalid', ...(action ? { 'content-type': 'application/json' } : {}) }, ...(action ? { method: 'PATCH', body: JSON.stringify({ action }) } : {}) });

test('provider calendar dates keep the first day in its month and invalid dates are excluded', () => {
  assert.equal(billingCalendarDate('2026-10-01'), '2026-10-01');
  assert.equal(billingCalendarDate('2026-10-01T00:00:00Z'), '2026-10-01');
  for (const bad of ['2026-02-30', '2026-13-01', 'unknown', null]) assert.equal(billingCalendarDate(bad), null);
  const cash = financialPayment(payment({ payload: { billingType: 'CREDIT_CARD', paymentDate: '2026-10-01', clientPaymentDate: '2026-09-21' } }));
  const confirmed = financialPayment(payment({ id: 'confirmed', status: 'CONFIRMED', payload: { confirmedDate: '2026-10-01', paymentDate: '2026-10-01' } }));
  const undated = financialPayment(payment({ id: 'undated', payload: {} }));
  assert.equal(financialMetricRows('received', [], [cash, confirmed, undated], '2026-10').valueCents, 2000);
  assert.equal(financialMetricRows('confirmed', [], [cash, confirmed, undated], '2026-10').valueCents, 2000);
  assert.equal(undated.receivedAt, null);
  assert.equal(financialPayment(payment({ status: 'RECEIVED_IN_CASH' })).receivedAt, '2026-09-01');
});

test('six cash months and first-day receipts stay aligned in UTC and Sao Paulo', () => {
  const previousTimezone = process.env.TZ;
  try {
    for (const timezone of ['UTC', 'America/Sao_Paulo']) {
      process.env.TZ = timezone;
      const today = '2026-10-02';
      const months = billingMonthKeys(today);
      assert.deepEqual(months, ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
      const cash = financialPayment(payment({ payload: { billingType: 'PIX', paymentDate: '2026-10-01' } }));
      assert.deepEqual(months.map((month) => financialMetricRows('received', [], [cash], month).valueCents), [0, 0, 0, 0, 0, 2000]);
      assert.equal(new Date(`${months.at(-1)}-01T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'long' }), 'outubro');
      assert.equal(billingMonthKeys('2026-01-01')[0], '2025-08');
    }
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('recurring card requires invoice evidence and paid coverage ignores future scheduled periods', () => {
  const card = payment({ due_date: '2026-09-21', payload: { billingType: 'CREDIT_CARD', subscription: 'sub_asaas', paymentDate: '2026-10-01' } });
  const view = memberFinancialView('active', subscription({ asaas_subscription_id: 'sub_asaas' }), [card], '2026-10-02');
  assert.equal(view.recurringActive, true); assert.equal(view.paidThrough, '2026-10-21');
  assert.equal(memberFinancialView('active', subscription({ asaas_checkout_id: 'old_checkout' }), [payment()], '2026-10-02').billingMethod, 'pix');
  assert.equal(memberFinancialView('active', subscription({ asaas_subscription_id: 'sub_asaas' }), [payment()], '2026-10-02').recurring, false);
  const expired = memberFinancialView('active', subscription(), [payment()], '2026-10-02');
  assert.equal(expired.pixRenewalDue, true); assert.equal(expired.participationStatus, 'pending_payment');
  const overdue = memberFinancialView('active', subscription(), [payment(), payment({ id: 'overdue', status: 'OVERDUE', due_date: '2026-09-30' })], '2026-10-02');
  assert.equal(overdue.pixRenewalDue, false); assert.equal(overdue.overdueCents, 2000);
});

test('manual participation stays protected and every action ledger matches its total and exact records', () => {
  const cardRow = payment({ payload: { subscription: 'sub_asaas', billingType: 'CREDIT_CARD', paymentDate: '2026-10-01' }, due_date: '2026-10-01' });
  for (const status of ['courtesy', 'inactive', 'cancelled', 'cancellation_requested']) {
    const view = memberFinancialView(status, subscription({ asaas_subscription_id: 'sub_asaas' }), [cardRow], '2026-10-02');
    assert.equal(view.participationStatus, status); assert.equal(view.recurringActive, false); assert.equal(view.pixRenewalDue, false); assert.equal(view.configurationRequired, false);
  }
  const expired = { id, amountCents: 2000, financial: memberFinancialView('active', subscription(), [payment()], '2026-10-02') };
  const noConfig = { id: 'unconfigured', amountCents: 0, financial: memberFinancialView('awaiting_payment', null, [], '2026-10-02') };
  assert.deepEqual(financialMetricRows('pix_renewal', [expired, noConfig], [], '2026-10').athletes.map((row) => row.id), [id]);
  assert.deepEqual(financialMetricRows('configuration', [expired, noConfig], [], '2026-10').athletes.map((row) => row.id), ['unconfigured']);
  const cash = financialPayment(cardRow);
  const ledger = financialMetricRows('received', [expired, noConfig], [cash], '2026-10');
  assert.equal(ledger.valueCents, ledger.invoices.reduce((sum, row) => sum + row.valueCents, 0)); assert.equal(ledger.invoices[0].memberId, id);
});

test('member global history exceeds 1000 and detail/portal exceed 24 without exposing raw payload', async (t) => {
  const today = saoPauloDate();
  const rows = Array.from({ length: 1001 }, (_, i) => payment({ id: `row_${i}`, asaas_payment_id: `pay_${i}`, status: i === 1000 ? 'RECEIVED' : 'PENDING', payload: { billingType: 'PIX', paymentDate: today, creditCardToken: 'private_token', cpfCnpj: 'private_cpf' } }));
  const http = mock(t, { payments: rows, pageSize: 80 });
  const global = await memberGet(request()); assert.equal(global.status, 200); const summary = await global.json(); assert.equal(summary.payments.length, 1001);
  assert.equal(summary.payments.at(-1).receivedAt, today); assert.ok(!JSON.stringify(summary).includes('private_'));
  const detail = await memberGet(request(`/api/membros?id=${id}`)); assert.equal(detail.status, 200); assert.equal((await detail.json()).member.payments.length, 1001);
  assert.ok(http.requests.some((r) => r.url.searchParams.get('offset') === '960'));
});

test('portal history is complete and expired payment cannot unlock links through an inflated local period', async (t) => {
  const http = mock(t, { admin: false, payments: Array.from({ length: 25 }, (_, i) => payment({ id: `row_${i}` })) });
  const response = await portalGet(request('/api/portal')); assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.payments.length, 25); assert.equal(body.member.accessActive, false); assert.equal(body.member.twinnerUrl, null); assert.equal(body.financial.billingMethod, 'pix'); assert.equal(body.financial.recurring, false);
  assert.ok(http.requests.every((r) => r.url.hostname !== 'provider.invalid'));
});

test('history fails explicitly on the ceiling or an incomplete server page', async (t) => {
  await t.test('ceiling', async (inner) => { const http = mock(inner, { count: 10001 }); await assert.rejects(supabaseAll('payments'), /10.000/); assert.equal(http.requests.length, 1); });
  await t.test('empty page with outstanding count', async (inner) => { mock(inner, { count: 1 }); await assert.rejects(supabaseAll('payments'), /incompleto/); });
});

test('Pix and expired checkout cannot request card changes or cancellation', async (t) => {
  const http = mock(t, { admin: false, payments: [payment()], subscription: subscription({ asaas_checkout_id: 'old', asaas_checkout_url: 'https://checkout.invalid', asaas_checkout_expires_at: '2025-01-01', status: 'awaiting_payment' }) });
  assert.equal((await portalPatch(request('/api/portal', 'request_card_change'))).status, 409);
  assert.equal((await portalPatch(request('/api/portal', 'request_cancellation'))).status, 409);
  assert.ok(http.requests.every((r) => r.url.hostname !== 'provider.invalid' && (!r.init.method || ['GET', 'HEAD'].includes(r.init.method))));
});

test('cancellation keeps only receipt-backed coverage even if the next invoice inflated stored period', async (t) => {
  const http = mock(t, { admin: false, payments: [payment({ payload: { billingType: 'CREDIT_CARD', subscription: 'sub_asaas', paymentDate: '2026-09-22' }, due_date: '2026-08-21' })], subscription: subscription({ asaas_subscription_id: 'sub_asaas' }) });
  const response = await portalPatch(request('/api/portal', 'request_cancellation')); assert.equal(response.status, 200); assert.equal((await response.json()).accessUntil, null);
  const memberWrite = http.requests.find((r) => r.url.pathname.endsWith('/members') && r.init.method === 'PATCH'); assert.equal(JSON.parse(memberWrite.init.body).participation_status, 'cancelled');
});

test('cancellation re-reads receipts refunded during provider DELETE before writing coverage or promising access', async (t) => {
  const today = saoPauloDate();
  const http = mock(t, { admin: false, payments: [payment({ due_date: today, payload: { billingType: 'CREDIT_CARD', subscription: 'sub_asaas', paymentDate: today } })], subscription: subscription({ asaas_subscription_id: 'sub_asaas' }), onDelete: (_member, _sub, data) => { data.payments[0].status = 'REFUNDED'; } });
  const response = await portalPatch(request('/api/portal', 'request_cancellation'));
  assert.equal(response.status, 200); assert.equal((await response.json()).accessUntil, null);
  assert.equal(http.data.members[0].participation_status, 'cancelled'); assert.equal(http.data.subscriptions[0].current_period_end, null);
  const refreshed = await (await portalGet(request('/api/portal'))).json(); assert.equal(refreshed.member.accessActive, false); assert.equal(refreshed.financial.covered, false);
});

test('cancellation re-reads a receipt refunded during audit persistence before returning access', async (t) => {
  const today = saoPauloDate();
  mock(t, { admin: false, payments: [payment({ due_date: today, payload: { billingType: 'CREDIT_CARD', subscription: 'sub_asaas', paymentDate: today } })], subscription: subscription({ asaas_subscription_id: 'sub_asaas' }), onAudit: (data) => { data.payments[0].status = 'REFUNDED'; } });
  const response = await portalPatch(request('/api/portal', 'request_cancellation'));
  assert.equal(response.status, 200); assert.equal((await response.json()).accessUntil, null);
  const refreshed = await (await portalGet(request('/api/portal'))).json(); assert.equal(refreshed.member.accessActive, false);
});

test('manual reminder queue uses current unpaid projection and excludes paid or manually protected participation', () => {
  const source = readFileSync(new URL('../app/apt-app.tsx', import.meta.url), 'utf8');
  const reminder = source.slice(source.indexOf('function paymentReminderUrl('), source.indexOf('function checkoutExpiryLabel('));
  const queue = source.slice(source.indexOf('function PaymentReminderQueue('), source.indexOf('type MemberOperationsStage ='));
  const context = vm.createContext({ React, useState: () => [0, () => {}] });
  vm.runInContext(ts.transpileModule(reminder + queue, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, context);
  const member = { id, name: 'Atleta', whatsapp: '11999999999', participationStatus: 'pending_payment', financial: { covered: true, participationStatus: 'active' } };
  const render = (row) => renderToStaticMarkup(context.PaymentReminderQueue({ members: [row] }));
  assert.equal(render(member), '');
  for (const status of ['active', 'courtesy', 'inactive', 'cancelled', 'cancellation_requested']) assert.equal(render({ ...member, financial: { covered: false, participationStatus: status } }), '');
  assert.match(render({ ...member, participationStatus: 'active', financial: { covered: false, participationStatus: 'pending_payment' } }), /Abrir lembrete/);
});

test('cancelling recurring billing preserves existing manual participation and never unlocks inactive access', async (t) => {
  for (const status of ['courtesy', 'inactive', 'cancelled', 'cancellation_requested']) await t.test(status, async (inner) => {
    const today = saoPauloDate();
    const http = mock(inner, { admin: false, memberStatus: status, payments: [payment({ due_date: today, payload: { billingType: 'CREDIT_CARD', subscription: 'sub_asaas', paymentDate: today } })], subscription: subscription({ asaas_subscription_id: 'sub_asaas' }) });
    const response = await portalPatch(request('/api/portal', 'request_cancellation'));
    assert.equal(response.status, 200); assert.equal(http.data.members[0].participation_status, status);
    const refreshed = await portalGet(request('/api/portal')); assert.equal(refreshed.status, 200);
    const body = await refreshed.json(); assert.equal(body.member.participationStatus, status);
    if (status === 'inactive' || status === 'cancelled') { assert.equal(body.member.accessActive, false); assert.equal(body.member.twinnerUrl, null); assert.equal((await response.json()).accessUntil, null); }
  });
});


test('cancellation fails before local completion when management changes a manual state during provider DELETE', async (t) => {
  for (const status of ['courtesy', 'inactive', 'cancellation_requested']) await t.test(status, async (inner) => {
    const http = mock(inner, { admin: false, payments: [payment({ payload: { billingType: 'CREDIT_CARD', subscription: 'sub_asaas', paymentDate: '2026-09-22' } })], subscription: subscription({ asaas_subscription_id: 'sub_asaas' }), onDelete: (member, sub) => { member.participation_status = status; sub.status = status === 'courtesy' ? 'courtesy' : 'cancelled'; } });
    assert.equal((await portalPatch(request('/api/portal', 'request_cancellation'))).status, 409);
    assert.equal(http.data.members[0].participation_status, status);
    assert.ok(http.requests.every((r) => r.url.hostname === 'provider.invalid' || !r.init.method || ['GET', 'HEAD'].includes(r.init.method)));
  });
});
