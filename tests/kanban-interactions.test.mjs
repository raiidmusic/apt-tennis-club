import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, createRequire } from 'node:module';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/.test(specifier))
            return nextResolve(`${specifier}.ts`, context);
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.endsWith('.ts'))
            return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
        return nextLoad(url, context);
    },
});
const billing = await import('../lib/billing-view.ts');
const state = await import('../lib/billing-state.ts');
const imports = await import('../lib/member-import.ts');
const require = createRequire(import.meta.url);
const source = ts.transpileModule(`${readFileSync(new URL('../app/apt-app.tsx', import.meta.url), 'utf8')}\nexport { CrmKanban, RevenuePulse };`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
const chartSource = ts.transpileModule(readFileSync(new URL('../components/ui/advanced-stats.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
// Render and invoke the shipped components and handlers. Network is always local fixture data.
function product({ fetch, search = '', initial = {}, document } = {}) {
    let cursor = 0, effectCursor = 0, refCursor = 0;
    const values = [], effects = [], effectDependencies = [], references = [], assigned = [], dynamicLoads = [];
    const hooks = { ...React,
        useState(value) { const index = cursor++; if (!(index in values))
            values[index] = Object.hasOwn(initial, index) ? initial[index] : value; return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; }]; },
        useMemo: (calculate) => calculate(), useRef: (current) => { const index = refCursor++; return references[index] ||= { current }; },
        useEffect(effect, dependencies = []) { const index = effectCursor++; const previous = effectDependencies[index]; if (!previous || dependencies.some((value, i) => value !== previous[i]))
            effects.push(effect); effectDependencies[index] = dependencies; },
    };
    const context = vm.createContext({ exports: {}, React: hooks, Error, document, URL, URLSearchParams, Intl, FormData, Date, queueMicrotask, fetch: fetch || (() => { throw new Error('Unexpected request'); }), window: { location: { search, origin: 'https://apt.invalid', assign: (path) => assigned.push(path) }, setTimeout: () => 0 }, require: (name) => name === 'react' ? hooks : ['lucide-react', 'framer-motion', 'recharts'].includes(name) ? require(name) : name === 'next/dynamic' ? { default: (loader) => { dynamicLoads.push(loader); return chart.ClippedAreaChart; } } : name === '@/components/ui/sidebar' ? { ProductSidebar: () => null } : name === '@/components/ui/advanced-stats' ? chart : name.endsWith('/billing-view') ? billing : name.endsWith('/billing-state') ? state : name.endsWith('/member-import') ? imports : (() => { throw new Error(`Unexpected import ${name}`); })() });
    vm.runInContext(`(() => { ${chartSource} })()`, context);
    const chart = { ...context.exports };
    context.exports = {};
    vm.runInContext(source, context);
    return { values, assigned, dynamicLoads, child: chart, exports: context.exports,
        render(name, props) { cursor = 0; effectCursor = 0; refCursor = 0; return context.exports[name](props); },
        async mount() { for (const effect of effects.splice(0))
            effect(); for (let i = 0; i < 8; i++)
            await new Promise(setImmediate); },
    };
}
function nodes(tree, predicate) { const found = []; const visit = (node) => { if (!React.isValidElement(node))
    return; if (predicate(node))
    found.push(node); React.Children.forEach(node.props.children, visit); }; visit(tree); return found; }
const { PATCH } = await import('../app/api/requerimentos/route.ts');
const { PATCH: memberPatch } = await import('../app/api/membros/route.ts');
const app = (status = 'new') => ({ id: '12345678-1234-4234-9234-123456789012', name: 'Candidate Fixture', email: 'fixture@example.test', status, createdAt: '2026-10-01T12:00:00Z' });
const doc = () => ({ activeElement: { focus() { } } });
const flush = () => new Promise(setImmediate);
function drag() { const writes = []; return { writes, event: { preventDefault() { }, dataTransfer: { setData: (key, value) => writes.push([key, value]) } } }; }
test('review: drag moves only mutable cards; status no-op and delivery/registration targets stay locked', async () => {
    for (const status of ['new', 'approved', 'invite_sent', 'registered']) {
        const calls = [];
        const opened = [];
        const application = app(status);
        const props = { applications: [application], onOpen: (id) => opened.push(id), onMove: async (move) => { calls.push(move); return { ok: true }; } };
        const ui = product({ document: doc() });
        let tree = ui.render('CrmKanban', props);
        const card = nodes(tree, n => n.type === 'article' && n.props.className === 'crm-card')[0];
        assert.equal(card.props.draggable, status === 'new');
        const handles = nodes(card, n => n.props.className === 'crm-card__drag-handle');
        assert.equal(handles.length, status === 'new' ? 1 : 0);
        if (status === 'new') {
            assert.equal(handles[0].props.draggable, true);
            assert.match(renderToStaticMarkup(handles[0]), /<span[^>]*class="crm-card__drag-handle"[^>]*draggable="true"/);
            assert.equal(handles[0].props.onDragStart, undefined, 'native drag bubbles to the existing article handler');
        }
        const title = nodes(card, n => n.type === 'button' && n.props.className === 'crm-card__open')[0];
        assert.equal(title.props.draggable, false);
        title.props.onClick();
        assert.deepEqual(opened, [application.id], 'card title continues to open the correct detail, including locked lifecycle stages');
        const event = drag();
        card.props.onDragStart(event.event);
        nodes(tree, n => n.props.id === 'crm-column-in_review')[0].props.onDrop(event.event);
        await flush();
        assert.equal(calls.length, status === 'new' ? 1 : 0);
        if (status === 'new') {
            assert.equal(calls[0].from, 'new');
            assert.equal(calls[0].to, 'in_review');
            assert.deepEqual(event.writes, [['text/plain', application.id]]);
        }
    }
    const calls = [];
    const props = { applications: [app()], onOpen() { }, onMove: async (move) => { calls.push(move); return { ok: true }; } };
    const ui = product({ document: doc() });
    let tree = ui.render('CrmKanban', props);
    const card = nodes(tree, n => n.type === 'article')[0];
    for (const target of ['new', 'invite_sent', 'registered']) {
        const event = drag();
        card.props.onDragStart(event.event);
        nodes(tree, n => n.props.id === 'crm-column-' + target)[0].props.onDrop(event.event);
    }
    await flush();
    assert.equal(calls.length, 0);
});
test('review: rapid keyboard changes create one request and do not move the card before confirmation', async () => {
    let resolve;
    const held = new Promise(r => resolve = r), calls = [];
    const props = { applications: [app()], onOpen() { }, onMove: move => { calls.push(move); return held; } };
    const ui = product({ document: doc() });
    let tree = ui.render('CrmKanban', props);
    const select = nodes(tree, n => n.type === 'select')[0];
    select.props.onChange({ target: { value: 'in_review' } });
    select.props.onChange({ target: { value: 'in_review' } });
    tree = ui.render('CrmKanban', props);
    assert.equal(calls.length, 1);
    assert.equal(nodes(tree, n => n.type === 'select')[0].props.disabled, true);
    assert.equal(nodes(tree, n => n.props.className === 'crm-card__drag-handle').length, 0);
    assert.equal(nodes(nodes(tree, n => n.props.id === 'crm-column-new')[0], n => n.type === 'article').length, 1);
    resolve({ ok: false, error: 'Conflict fixture' });
    await flush();
    tree = ui.render('CrmKanban', props);
    assert.match(renderToStaticMarkup(tree), /Conflict fixture/);
    assert.equal(nodes(tree, n => n.type === 'select')[0].props.disabled, false);
    assert.equal(nodes(tree, n => n.props.className === 'crm-card__drag-handle').length, 1);
});
test('review: approval and rejection require an explicit impact review; cancel makes no request', async () => {
    for (const to of ['approved', 'rejected']) {
        const calls = [], props = { applications: [app()], onOpen() { }, onMove: async (m) => { calls.push(m); return { ok: true }; } };
        const ui = product({ document: doc() });
        let tree = ui.render('CrmKanban', props);
        nodes(tree, n => n.type === 'select')[0].props.onChange({ target: { value: to } });
        tree = ui.render('CrmKanban', props);
        assert.equal(calls.length, 0);
        assert.equal(nodes(tree, n => n.type === 'dialog').length, 1);
        assert.equal(nodes(tree, n => n.props.className === 'crm-card__drag-handle').length, 0);
        assert.match(renderToStaticMarkup(tree), to === 'approved' ? /gera um convite.*e-mail/ : /comunicada ao candidato por e-mail/);
        nodes(tree, n => n.type === 'button' && n.props.children === 'Cancelar')[0].props.onClick();
        assert.equal(nodes(ui.render('CrmKanban', props), n => n.type === 'dialog').length, 0);
        assert.equal(nodes(ui.render('CrmKanban', props), n => n.props.className === 'crm-card__drag-handle').length, 1);
        assert.equal(calls.length, 0);
    }
});
test('review: awaiting-info keeps the typed note on failure and prevents blank confirmation', async () => {
    const calls = [], props = { applications: [app()], onOpen() { }, onMove: async (m) => { calls.push(m); return { ok: false, error: 'Persistence unavailable' }; } };
    const ui = product({ document: doc() });
    let tree = ui.render('CrmKanban', props);
    nodes(tree, n => n.type === 'select')[0].props.onChange({ target: { value: 'awaiting_info' } });
    tree = ui.render('CrmKanban', props);
    assert.equal(nodes(tree, n => n.type === 'button' && n.props.type === 'submit')[0].props.disabled, true);
    const text = '  Please confirm missing membership info  ';
    nodes(tree, n => n.type === 'textarea')[0].props.onChange({ target: { value: text } });
    tree = ui.render('CrmKanban', props);
    nodes(tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() { } });
    await flush();
    tree = ui.render('CrmKanban', props);
    assert.equal(calls[0].note, text.trim());
    assert.equal(nodes(tree, n => n.type === 'textarea')[0].props.value, text);
    assert.match(renderToStaticMarkup(tree), /Persistence unavailable/);
});
test('review: source changed during drag or during decision produces no write', async () => {
    const calls = [];
    let props = { applications: [app()], onOpen() { }, onMove: async (m) => { calls.push(m); return { ok: true }; } };
    const ui = product({ document: doc() });
    let tree = ui.render('CrmKanban', props);
    const event = drag();
    nodes(tree, n => n.type === 'article')[0].props.onDragStart(event.event);
    props = { ...props, applications: [app('registered')] };
    tree = ui.render('CrmKanban', props);
    nodes(tree, n => n.props.id === 'crm-column-in_review')[0].props.onDrop(event.event);
    assert.equal(calls.length, 0);
    const ui2 = product({ document: doc() });
    props = { ...props, applications: [app()] };
    tree = ui2.render('CrmKanban', props);
    nodes(tree, n => n.type === 'select')[0].props.onChange({ target: { value: 'approved' } });
    props = { ...props, applications: [app('invite_sent')] };
    tree = ui2.render('CrmKanban', props);
    nodes(tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() { } });
    await flush();
    assert.equal(calls.length, 0);
    assert.match(renderToStaticMarkup(ui2.render('CrmKanban', props)), /mudou de etapa/);
});
test('review: admin sends board expectedStatus/note and applies only the returned or reread stage', async () => {
    for (const fail of [false, true]) {
        const calls = [];
        const application = app(), confirmed = { ...application, status: fail ? 'registered' : 'invite_sent' };
        const ui = product({ document: doc(), initial: { 0: 'requerimentos', 4: [application], 14: 'Unrelated review note', 21: false, 22: false }, fetch: async (url, init) => { calls.push([url, init]); return init ? Response.json(fail ? { error: 'Fixture stale' } : { application: confirmed }, { status: fail ? 409 : 200 }) : Response.json({ applications: [confirmed] }); } });
        let tree = ui.render('AdminPage');
        const board = nodes(tree, n => n.type?.name === 'CrmKanban')[0];
        const result = await board.props.onMove({ id: application.id, from: 'new', to: 'approved', note: 'Reviewed board note' });
        tree = ui.render('AdminPage');
        const visible = nodes(tree, n => n.type?.name === 'CrmKanban')[0].props.applications[0];
        assert.equal(visible.status, confirmed.status);
        assert.equal(result.ok, !fail);
        const body = JSON.parse(calls[0][1].body);
        assert.equal(body.expectedStatus, 'new');
        assert.equal(body.note, 'Reviewed board note');
        assert.equal(calls.length, fail ? 2 : 1);
    }
});
test('review: chart hover, keyboard focus and Escape expose separate real receipt and settlement values', async () => {
    const months = billing.billingMonthKeys(state.saoPauloDate()), month = months.at(-1);
    const rows = [
        { id: 'received', status: 'RECEIVED', value_cents: 2290, payload: { paymentDate: month + '-01' } },
        { id: 'cash', status: 'RECEIVED_IN_CASH', value_cents: 5000, payload: { clientPaymentDate: months.at(-2) + '-01' } },
        { id: 'confirmed', status: 'CONFIRMED', value_cents: 4000, payload: { confirmedDate: month + '-01' } },
        { id: 'refund', status: 'REFUNDED', value_cents: 9000, payload: { paymentDate: month + '-01' } },
        { id: 'missing-date', status: 'RECEIVED', value_cents: 7000, payload: {} },
    ];
    const payments = rows.map((row) => billing.financialPayment({ member_id: 'fixture', created_at: month + '-01T12:00:00Z', ...row }));
    const ui = product();
    // Only the async wrapper is synchronized; each real loader must resolve the actual shipped child.
    for (const load of ui.dynamicLoads) assert.equal(await load(), ui.child.ClippedAreaChart);
    let tree = ui.render('RevenuePulse', { payments });
    assert.match(renderToStaticMarkup(tree), /Total no período.*72,90/);
    let chart = nodes(tree, (node) => node.type?.name === 'ClippedAreaChart')[0];
    assert.equal(chart.props.data.length, 6);
    assert.equal(chart.props.data.at(-2).received, 50);
    assert.equal(chart.props.data.at(-1).received, 22.9);
    assert.equal(chart.props.data.at(-1).confirmed, 40);
    assert.equal(chart.props.data.at(-1).index, 5);
    assert.equal(chart.props.activeIndex, null);
    const buttons = nodes(tree, n => n.type === 'button');
    assert.equal(buttons.length, 6);
    buttons.at(-1).props.onFocus();
    tree = ui.render('RevenuePulse', { payments });
    chart = nodes(tree, (node) => node.type?.name === 'ClippedAreaChart')[0];
    assert.equal(chart.props.activeIndex, 5);
    const tip = nodes(tree, n => n.props.id === 'revenue-month-detail')[0];
    assert.match(renderToStaticMarkup(tip), /22,90/);
    assert.match(renderToStaticMarkup(tip), /40,00/);
    assert.match(renderToStaticMarkup(tip), /1 recebimento · 1 em liquidação/);
    nodes(tree, n => n.props.className === 'management-revenue__chart')[0].props.onKeyDown({ key: 'Escape' });
    tree = ui.render('RevenuePulse', { payments });
    assert.equal(nodes(tree, n => n.props.id === 'revenue-month-detail').length, 0);
    assert.match(renderToStaticMarkup(tree), /Total no período.*72,90/);
    chart = nodes(tree, (node) => node.type?.name === 'ClippedAreaChart')[0];
    chart.props.onSelect(4);
    tree = ui.render('RevenuePulse', { payments });
    assert.match(renderToStaticMarkup(nodes(tree, n => n.props.id === 'revenue-month-detail')[0]), /50,00/);
});
const id = '12345678-1234-4234-9234-123456789012';
function mock(t, { status = 'new', onMail, onNote, onCreate, onWrite, onAudit, admin = true } = {}) {
    const oldFetch = globalThis.fetch, oldEnv = { ...process.env };
    Object.assign(process.env, {
        SUPABASE_URL: 'https://db.invalid', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test',
        APT_PUBLIC_URL: 'https://apt.invalid', APT_ADMIN_EMAILS: 'admin@example.invalid',
        RESEND_API_KEY: 'fixture', APT_RESEND_FROM_EMAIL: 'fixture@example.invalid',
    });
    const app = { id, name: 'Candidate Fixture', email: 'fixture@example.invalid', status, created_at: '2026-10-01T12:00:00Z' };
    const data = { applications: [app], members: [], invites: [], admin_notes: [], audit_logs: [] }, requests = [], emails = [];
    globalThis.fetch = async (value, init = {}) => {
        const url = new URL(value);
        requests.push({ url, init });
        assert.ok(['db.invalid', 'api.resend.com'].includes(url.hostname), 'mock intercepts every request');
        if (url.hostname === 'api.resend.com') {
            emails.push(JSON.parse(init.body));
            onMail?.(app, data);
            return Response.json({ id: 'fixture_message' });
        }
        if (url.pathname === '/auth/v1/user')
            return Response.json({ id: 'auth_1', email: admin ? 'admin@example.invalid' : 'member@example.invalid' });
        const table = url.pathname.split('/').at(-1), query = url.searchParams;
        const matches = (row) => ['id', 'email', 'application_id', 'member_id', 'auth_user_id', 'status', 'used_at', 'revoked_at'].every((key) => {
            if (!query.has(key))
                return true;
            const value = query.get(key);
            if (value.startsWith('eq.'))
                return value.slice(3) === String(row[key]);
            if (value.startsWith('in.('))
                return value.slice(4, -1).split(',').includes(String(row[key]));
            if (value === 'is.null')
                return row[key] == null;
            throw new Error(`Unsupported fixture filter ${key}: ${value}`);
        });
        const body = init.body ? JSON.parse(init.body) : null;
        if (init.method === 'POST') {
            if (table === 'audit_logs' && onAudit)
                return onAudit(app, data, body);
            const row = { id: `${table}_${data[table].length + 1}`, ...body };
            data[table].push(row);
            if (table === 'admin_notes')
                onNote?.(app, data);
            if (table === 'invites')
                onCreate?.(app, data, row);
            return Response.json([row]);
        }
        if (init.method === 'PATCH') {
            onWrite?.(table, app, body, query);
            const rows = (data[table] || []).filter(matches);
            rows.forEach((row) => Object.assign(row, body));
            return Response.json(rows);
        }
        return Response.json((data[table] || []).filter(matches));
    };
    t.after(() => { globalThis.fetch = oldFetch; process.env = oldEnv; });
    return { app, data, requests, emails };
}
const request = (body, origin = 'https://apt.invalid') => new Request('https://apt.invalid/api/requerimentos', { method: 'PATCH', headers: { cookie: 'apt_access_token=test', origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('member note audit failure returns the actual persisted receipt without sending mail or changing participation', async (t) => {
    const http = mock(t, { onAudit: () => Response.json({ error: 'Fixture audit unavailable' }, { status: 503 }) });
    http.data.members.push({ id, name: 'Member Fixture', email: 'member@example.invalid', participation_status: 'courtesy' });
    const res = await memberPatch(request({ id, note: '  Fixture follow-up  ' }));
    const payload = await res.json();
    assert.equal(res.status, 500);
    assert.equal(payload.noteRecorded, true);
    assert.equal(payload.note.id, http.data.admin_notes[0].id);
    assert.equal(payload.note.body, 'Fixture follow-up');
    assert.equal(payload.note.created_by, 'admin@example.invalid');
    assert.equal(http.data.admin_notes.length, 1);
    assert.equal(http.data.members[0].participation_status, 'courtesy');
    assert.equal(http.emails.length, 0);
    assert.match(payload.error, /Não foi possível/);
});
test('member note rejection returns no fabricated persistence receipt', async (t) => {
    const http = mock(t);
    http.data.members.push({ id, name: 'Member Fixture', email: 'member@example.invalid', participation_status: 'inactive' });
    const fixtureFetch = globalThis.fetch;
    globalThis.fetch = (value, init) => new URL(value).pathname.endsWith('/admin_notes') && init?.method === 'POST'
        ? Response.json({ error: 'Fixture note rejected' }, { status: 503 }) : fixtureFetch(value, init);
    const res = await memberPatch(request({ id, note: 'Fixture follow-up' }));
    const payload = await res.json();
    assert.equal(res.status, 500);
    assert.equal(payload.noteRecorded, undefined);
    assert.equal(payload.note, undefined);
    assert.equal(http.data.admin_notes.length, 0);
    assert.equal(http.data.members[0].participation_status, 'inactive');
    assert.equal(http.emails.length, 0);
});
test('stale board CAS cannot overwrite invitation or registered state, and sends no mail', async (t) => { const http = mock(t); for (const status of ['invite_sent', 'registered']) {
    http.app.status = status;
    const res = await PATCH(request({ id, status: 'in_review', expectedStatus: 'new' }));
    assert.equal(res.status, 409);
    assert.equal(http.app.status, status);
    assert.equal(http.emails.length, 0);
} });
test('awaiting information requires a saved explanatory note before stage can change', async (t) => { const http = mock(t); const res = await PATCH(request({ id, status: 'awaiting_info', expectedStatus: 'new', note: '  ' })); assert.equal(res.status, 400); assert.equal(http.data.admin_notes.length, 0); assert.equal(http.app.status, 'new'); });
test('approval final persistence must not roll back a registration completed during invite delivery', async (t) => { const http = mock(t, { onMail(app) { app.status = 'registered'; } }); const res = await PATCH(request({ id, status: 'approved', expectedStatus: 'new' })); assert.equal(http.emails.length, 1); assert.equal(http.app.status, 'registered'); assert.notEqual((await res.json()).application?.status, 'invite_sent'); });
test('conflicted awaiting-info transition must make any already persisted note visible in its response', async (t) => { const http = mock(t, { onNote(app) { app.status = 'registered'; } }); const res = await PATCH(request({ id, status: 'awaiting_info', expectedStatus: 'new', note: 'Fixture follow-up need' })); const body = await res.json(); assert.equal(res.status, 409); assert.equal(http.app.status, 'registered'); assert.equal(http.data.admin_notes.length, 1); assert.ok(body.note || body.noteRecorded, 'partial persistence needs an explicit receipt rather than a generic failed move'); });
test('approval must not issue or send a new invitation after registration changes during note persistence', async (t) => { const http = mock(t, { onNote(app) { app.status = 'registered'; } }); const res = await PATCH(request({ id, status: 'approved', expectedStatus: 'new', note: 'Fixture reviewed approval' })); assert.equal(http.emails.length, 0); assert.equal(http.data.invites.length, 0); assert.equal(http.app.status, 'registered'); assert.equal(res.status, 409); });
test('registration during invitation creation revokes that unused invitation without sending it', async (t) => {
    const http = mock(t, { onCreate(app) { app.status = 'registered'; } });
    const response = await PATCH(request({ id, status: 'approved', expectedStatus: 'new' }));
    assert.equal(response.status, 409);
    assert.equal(http.app.status, 'registered');
    assert.equal(http.emails.length, 0);
    assert.equal(http.data.invites.length, 1);
    assert.ok(http.data.invites[0].revoked_at);
    assert.equal(http.data.invites[0].used_at, undefined);
});
test('resending an invitation cannot roll back registration completed during provider delivery', async (t) => {
    const http = mock(t, { status: 'invite_sent', onMail(app) { app.status = 'registered'; } });
    const response = await PATCH(request({ id, action: 'resend_invite' }));
    const payload = await response.json();
    assert.equal(response.status, 409);
    assert.equal(http.emails.length, 1);
    assert.equal(http.app.status, 'registered');
    assert.equal(payload.inviteDelivery, 'sent');
    assert.equal(payload.application, undefined);
    assert.equal(payload.inviteToken, undefined);
});
test('a saved-note receipt clears the decision draft and prevents replaying the same pending-information note', async () => {
    const props = { applications: [app()], onOpen() { }, onMove: async () => ({ ok: false, error: 'Changed stage. Note recorded.', noteRecorded: true }) };
    const ui = product({ document: doc() });
    let tree = ui.render('CrmKanban', props);
    nodes(tree, (node) => node.type === 'select')[0].props.onChange({ target: { value: 'awaiting_info' } });
    tree = ui.render('CrmKanban', props);
    nodes(tree, (node) => node.type === 'textarea')[0].props.onChange({ target: { value: 'One saved follow-up note' } });
    tree = ui.render('CrmKanban', props);
    nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() { } });
    await flush();
    tree = ui.render('CrmKanban', props);
    assert.equal(nodes(tree, (node) => node.type === 'textarea')[0].props.value, '');
    assert.equal(nodes(tree, (node) => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, true);
    assert.match(renderToStaticMarkup(tree), /Note recorded/);
});
test('admin preserves and deduplicates an already saved note when the status write conflicts', async () => {
    const application = app(), savedNote = { id: 'saved_note', body: 'Already persisted', createdBy: 'admin@example.invalid', createdAt: '2026-10-02T12:00:00Z' };
    const ui = product({
        document: doc(),
        initial: { 0: 'requerimentos', 4: [application], 11: { ...application, notes: [] }, 14: 'Already persisted', 21: false, 22: false },
        fetch: async (_url, init) => init ? Response.json({ error: 'Stage conflict', note: savedNote, noteRecorded: true }, { status: 409 }) : Response.json({ applications: [{ ...application, status: 'registered' }] }),
    });
    for (let attempt = 0; attempt < 2; attempt++) {
        const tree = ui.render('AdminPage');
        const board = nodes(tree, (node) => node.type?.name === 'CrmKanban')[0];
        const result = await board.props.onMove({ id: application.id, from: 'new', to: 'awaiting_info', note: savedNote.body });
        assert.equal(result.ok, false);
        assert.equal(result.noteRecorded, true);
        assert.match(result.error, /A nota foi registrada/);
        assert.equal(ui.values[14], '');
        assert.equal(ui.values[11].notes.length, 1);
        assert.equal(ui.values[11].notes[0].id, savedNote.id);
        assert.equal(ui.values[4][0].status, 'registered');
    }
});
test('board writes reject untrusted origins and non-admin callers before any data mutation', async (t) => {
    const http = mock(t, { admin: false });
    const body = { id, status: 'approved', expectedStatus: 'new' };
    assert.equal((await PATCH(request(body, 'https://untrusted.invalid'))).status, 403);
    assert.equal(http.requests.length, 0);
    assert.equal((await PATCH(request(body))).status, 401);
    assert.equal(http.app.status, 'new');
    assert.equal(http.data.invites.length, 0);
    assert.equal(http.data.admin_notes.length, 0);
    assert.equal(http.emails.length, 0);
});

test('rejection must not send a stale rejection after registration changes during note persistence', async (t) => {
    const http = mock(t, { onNote(application) { application.status = 'registered'; } });
    const response = await PATCH(request({ id, status: 'rejected', expectedStatus: 'new', note: 'Reviewed refusal' }));
    const payload = await response.json();
    assert.equal(http.emails.length, 0);
    assert.equal(http.app.status, 'registered');
    assert.equal(response.status, 409);
    assert.equal(payload.noteRecorded, true);
});

test('rejection delivery that races registration returns a conflict instead of a stale stage', async (t) => {
    const http = mock(t, { onMail(application) { application.status = 'registered'; } });
    const response = await PATCH(request({ id, status: 'rejected', expectedStatus: 'new', note: 'Reviewed refusal' }));
    const payload = await response.json();
    assert.equal(http.emails.length, 1);
    assert.equal(http.app.status, 'registered');
    assert.equal(response.status, 409);
    assert.equal(payload.application, undefined);
    assert.equal(payload.emailStatus, 'sent');
    assert.equal(payload.noteRecorded, true);
});
