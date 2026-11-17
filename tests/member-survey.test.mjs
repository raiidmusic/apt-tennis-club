import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/.test(specifier)) return next(`${specifier}.ts`, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return next(url, context);
  },
});

const api = await import('../lib/member-survey.ts').catch(() => ({}));
const memberId = '12345678-1234-4234-9234-123456789012';
const otherId = '22345678-1234-4234-9234-123456789012';
const surveyId = '32345678-1234-4234-9234-123456789012';
const contextSecret = 'test-context-key-with-at-least-thirty-two-characters';
const webhookSecret = 'test-webhook-key-with-at-least-thirty-two-characters';
const now = Date.parse('2026-11-17T18:00:00Z');
const survey = { id: surveyId, slug: 'experiencia-2026', title: 'Experiência APT', heyform_id: 'form-test', active: true, opens_at: '2026-11-01T00:00:00Z', closes_at: '2026-12-01T00:00:00Z', eligible_member_ids: [memberId], fields: [
  { id: 'score', key: 'satisfaction', title: 'Satisfação', kind: 'opinion_scale', required: true, min: 1, max: 5 },
  { id: 'priority', key: 'priority', title: 'Prioridade', kind: 'multiple_choice', required: true, max: 2, allowOther: true, exclusiveChoiceIds: ['none'], choices: [{ id: 'games', label: 'Marcar partidas' }, { id: 'group', label: 'Convivência' }, { id: 'none', label: 'Nada' }] },
  { id: 'comment', key: 'comment', title: 'Comentário', kind: 'long_text', required: false },
] };

function fixtureContext(changes = {}) {
  const claims = { v: 1, memberId, surveyId, formId: 'form-test', issuedAt: now, expiresAt: Date.parse(survey.closes_at) + 72 * 3600_000, ...changes };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${body}.${createHmac('sha256', contextSecret).update(body).digest('base64url')}`;
}
function event(changes = {}) {
  return { id: '0123456789abcdef01234567', formId: 'form-test', hiddenFields: [{ id: 'hidden', name: 'apt_context', value: fixtureContext() }], fields: [{ id: 'score', title: 'Untrusted changed label' }], answers: [
    { id: 'priority', kind: 'multiple_choice', value: { value: ['games'] } },
    { id: 'score', kind: 'opinion_scale', value: 4 },
    { id: 'comment', kind: 'long_text', value: ' Mais horários. ' },
  ], ip: '192.0.2.1', ...changes };
}
function request(payload = event(), authorization = `Basic ${Buffer.from(`apt-heyform:${webhookSecret}`).toString('base64')}`) {
  return new Request('https://apt.invalid/api/webhooks/heyform', { method: 'POST', headers: { authorization, 'Content-Type': 'application/json' }, body: typeof payload === 'string' ? payload : JSON.stringify(payload) });
}
function transport(t, options = {}) {
  const previousFetch = globalThis.fetch, previousEnv = { ...process.env };
  Object.assign(process.env, { SUPABASE_URL: 'https://local.invalid', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test', APT_SURVEY_CONTEXT_SECRET: contextSecret, APT_HEYFORM_WEBHOOK_SECRET: webhookSecret, APT_HEYFORM_URL: 'https://pesquisas.apttennis.com.br', APT_ADMIN_EMAILS: 'admin@example.com' });
  const state = { writes: [], responses: [], calls: 0, survey: { ...survey, ...options.survey } };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input); state.calls++;
    assert.equal(url.hostname, 'local.invalid', 'tests must never call a real account');
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'auth-user', email: options.admin ? 'admin@example.com' : 'member@example.com' });
    const table = url.pathname.split('/').at(-1);
    if (table === 'member_surveys') return Response.json([state.survey]);
    if (table === 'members') return Response.json(options.noMember ? [] : [{ id: memberId, auth_user_id: 'auth-user', name: 'Atleta' }]);
    if (table === 'member_survey_responses') {
      if (init.method === 'POST') {
        state.writes.push(JSON.parse(init.body));
        if (options.failWrite) return Response.json({ message: 'temporary failure' }, { status: 503 });
        if (state.responses.length) return Response.json({ code: '23505', message: 'duplicate' }, { status: 409 });
        state.responses.push({ ...JSON.parse(init.body), id: 'response-test' });
        return Response.json(state.responses, { status: 201 });
      }
      return Response.json(state.responses);
    }
    throw new Error(`Unexpected table ${table}`);
  };
  t.after(() => { globalThis.fetch = previousFetch; process.env = previousEnv; });
  return state;
}

test('signed member context rejects tampering, future issuance, wrong secret and expiration', () => {
  assert.equal(typeof api.verifySurveyContext, 'function');
  assert.equal(api.verifySurveyContext(fixtureContext(), contextSecret, now).memberId, memberId);
  for (const [token, key, clock] of [
    [`${fixtureContext()}x`, contextSecret, now],
    [fixtureContext(), `${contextSecret}-wrong`, now],
    [fixtureContext({ issuedAt: now + 60_000 }), contextSecret, now],
    [fixtureContext({ expiresAt: now - 1 }), contextSecret, now],
    [fixtureContext({ memberId: 'not-a-member' }), contextSecret, now],
  ]) assert.throws(() => api.verifySurveyContext(token, key, clock));
});

test('parser trusts stored field IDs and choices; strips event IP and normalizes answers', () => {
  assert.equal(typeof api.normalizeSurveyAnswers, 'function');
  assert.deepEqual(api.normalizeSurveyAnswers(event().answers, survey.fields), { satisfaction: 4, priority: ['Marcar partidas'], comment: 'Mais horários.' });
  const altered = event().answers.map(answer => answer.id === 'priority' ? { ...answer, value: { value: ['forged-choice'] } } : answer);
  assert.throws(() => api.normalizeSurveyAnswers(altered, survey.fields));
  assert.throws(() => api.normalizeSurveyAnswers([...event().answers, event().answers[0]], survey.fields));
  assert.throws(() => api.normalizeSurveyAnswers(event().answers.filter(answer => answer.id !== 'score'), survey.fields));
});

test('parser rejects invalid scores, excessive choices, exclusive combinations and oversized text', () => {
  assert.equal(typeof api.normalizeSurveyAnswers, 'function');
  for (const value of [0, 6, '4', 4.5, null]) assert.throws(() => api.normalizeSurveyAnswers([{ id: 'score', kind: 'opinion_scale', value }], [survey.fields[0]]));
  for (const value of [{ value: ['games', 'group', 'none'] }, { value: ['games', 'none'] }, { value: ['games', 'games'] }]) assert.throws(() => api.normalizeSurveyAnswers([{ id: 'priority', kind: 'multiple_choice', value }], [survey.fields[1]]));
  assert.throws(() => api.normalizeSurveyAnswers([{ id: 'comment', kind: 'long_text', value: 'a'.repeat(1201) }], [survey.fields[2]]));
});

test('valid context without sender Basic fails before any database lookup', async t => {
  const state = transport(t);
  assert.equal(typeof api.receiveHeyFormEvent, 'function');
  assert.equal((await api.receiveHeyFormEvent(request(event(), ''), now)).status, 401);
  assert.equal((await api.receiveHeyFormEvent(request(event(), 'Basic invalid'), now)).status, 401);
  assert.equal(state.calls, 0);
});

test('webhook creates one identified snapshot and exact duplicate is idempotent', async t => {
  const state = transport(t);
  assert.equal((await api.receiveHeyFormEvent(request(), now)).status, 201);
  assert.equal((await api.receiveHeyFormEvent(request(), now)).status, 200);
  assert.equal(state.responses.length, 1);
  assert.equal(state.responses[0].member_id, memberId);
  assert.deepEqual(state.responses[0].answers, { satisfaction: 4, priority: ['Marcar partidas'], comment: 'Mais horários.' });
  assert.equal('ip' in state.responses[0], false);
  assert.equal(JSON.stringify(state.responses[0]).includes(fixtureContext()), false);
  assert.equal((await api.receiveHeyFormEvent(request(event({ id: '1123456789abcdef01234567' })), now)).status, 409);
});

test('changed duplicate cannot overwrite original snapshot', async t => {
  const state = transport(t);
  await api.receiveHeyFormEvent(request(), now);
  const answers = event().answers.map(answer => answer.id === 'score' ? { ...answer, value: 1 } : answer);
  assert.equal((await api.receiveHeyFormEvent(request(event({ answers })), now)).status, 409);
  assert.equal(state.responses[0].answers.satisfaction, 4);
});

test('forged context, wrong form, uninvited member and oversized body never write', async t => {
  const state = transport(t);
  for (const payload of [event({ formId: 'wrong-form' }), event({ hiddenFields: [{ name: 'apt_context', value: fixtureContext({ memberId: otherId }) }] }), event({ hiddenFields: [{ name: 'apt_context', value: `${fixtureContext()}x` }] }), 'x'.repeat(65_537)]) {
    assert.ok((await api.receiveHeyFormEvent(request(payload), now)).status >= 400);
  }
  assert.equal(state.writes.length, 0);
});

test('temporary database failure returns retryable status and never confirms receipt', async t => {
  transport(t, { failWrite: true });
  const response = await api.receiveHeyFormEvent(request(), now);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).received, undefined);
});

test('authenticated delayed delivery is accepted within grace; expired delivery is rejected', async t => {
  transport(t);
  assert.equal((await api.receiveHeyFormEvent(request(), Date.parse('2026-12-02T00:00:00Z'))).status, 201);
  assert.equal((await api.receiveHeyFormEvent(request(), Date.parse('2026-12-05T00:00:00Z'))).status, 401);
});

test('admin who is also a member receives only their own survey; missing member is denied', async t => {
  const state = transport(t, { admin: true });
  assert.equal(typeof api.memberSurveyAccess, 'function');
  const req = new Request('https://apt.invalid/api/pesquisas?survey=experiencia-2026', { headers: { cookie: 'apt_access_token=synthetic' } });
  const response = await api.memberSurveyAccess(req, now);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.memberName, 'Atleta');
  const formUrl = new URL(body.formUrl);
  assert.equal(formUrl.origin, 'https://pesquisas.apttennis.com.br');
  assert.equal(api.verifySurveyContext(formUrl.searchParams.get('apt_context'), contextSecret, now).memberId, memberId);
  state.survey = { ...state.survey, closes_at: '2026-11-16T00:00:00Z' };
  assert.equal((await (await api.memberSurveyAccess(req, now)).json()).formUrl, undefined);
});

test('admin without eligible member cannot answer; no session cannot see any answers', async t => {
  transport(t, { admin: true, noMember: true });
  const req = new Request('https://apt.invalid/api/pesquisas?survey=experiencia-2026', { headers: { cookie: 'apt_access_token=synthetic' } });
  assert.equal((await api.memberSurveyAccess(req, now)).status, 403);
  assert.equal((await api.memberSurveyAccess(new Request(req.url), now)).status, 401);
});

test('CSV treats untrusted formula prefixes as text and quotes embedded separators', () => {
  assert.equal(typeof api.surveyCsvCell, 'function');
  assert.equal(api.surveyCsvCell('=1+1'), '"\'=1+1"');
  assert.equal(api.surveyCsvCell(' \t+SUM(A1)'), '"\' \t+SUM(A1)"');
  assert.equal(api.surveyCsvCell('a,"b"'), '"a,""b"""');
});

test('Next route context cannot replace the expiry clock in a webhook request', async t => {
  const state = transport(t, { survey: { opens_at: '2026-09-01T00:00:00Z', closes_at: '2026-10-01T00:00:00Z' } });
  const { POST } = await import('../app/api/webhooks/heyform/route.ts');
  const payload = event({ hiddenFields: [{ name: 'apt_context', value: fixtureContext({ issuedAt: Date.parse('2026-09-17T00:00:00Z'), expiresAt: Date.parse('2026-10-04T00:00:00Z') }) }] });
  assert.equal((await POST(request(payload), { params: Promise.resolve({}) })).status, 401);
  assert.equal(state.writes.length, 0);
});

test('member cannot read administrative survey results', async t => {
  const state = transport(t);
  const req = new Request('https://apt.invalid/api/pesquisas?admin=1', { headers: { cookie: 'apt_access_token=synthetic' } });
  assert.equal((await api.adminSurveyResults(req)).status, 401);
  assert.equal(state.writes.length, 0);
});

test('CSP allows the configured form origin without allowing arbitrary frames or scripts', async t => {
  const before = process.env.APT_HEYFORM_URL;
  process.env.APT_HEYFORM_URL = 'https://pesquisas.apttennis.com.br';
  t.after(() => { if (before === undefined) delete process.env.APT_HEYFORM_URL; else process.env.APT_HEYFORM_URL = before; });
  const { default: config } = await import('../next.config.ts');
  const headers = await config.headers();
  const policy = headers.find(row => row.source === '/:path*').headers.find(row => row.key === 'Content-Security-Policy').value;
  const directives = Object.fromEntries(policy.split(';').map(part => part.trim().split(/\s+/)).map(([key, ...values]) => [key, values]));
  assert.deepEqual(directives['frame-src'], ['https://pesquisas.apttennis.com.br']);
  assert.equal(directives['script-src'].includes('*'), false);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
});
