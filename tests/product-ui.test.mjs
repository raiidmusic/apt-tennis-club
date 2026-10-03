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
    if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !/\.[a-z]+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const billing = await import('../lib/billing-view.ts');
const state = await import('../lib/billing-state.ts');
const imports = await import('../lib/member-import.ts');
const require = createRequire(import.meta.url);
const glyphModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/ui/glyph-portal.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: glyphModule.exports, require, React });
const source = ts.transpileModule(`${readFileSync(new URL('../app/apt-app.tsx', import.meta.url), 'utf8')}\nexport { MemberRecordsTable, ManagementDashboard, MemberManagementDetail, MemberImportPanel, ApplicationReviewDetail, HeroRotatingStatement };`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;

// Render and invoke the shipped components and handlers. Network is always local fixture data.
function product({ fetch, search = '', initial = {}, document, reducedMotion = false, intersectionObserver, finePointer = true, scrollTimeline = true } = {}) {
  let cursor = 0, effectCursor = 0, refCursor = 0, nextTimer = 0;
  const values = [], effects = [], cleanups = [], effectDependencies = [], references = [], assigned = [];
  const timers = new Map();
  const hooks = { ...React,
    useState(value) { const index = cursor++; if (!(index in values)) values[index] = Object.hasOwn(initial, index) ? initial[index] : typeof value === 'function' ? value() : value; return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; }]; },
    useMemo: (calculate) => calculate(), useRef: (current) => { const index = refCursor++; return references[index] ||= { current }; },
    useEffect(effect, dependencies = []) { const index = effectCursor++; const previous = effectDependencies[index]; if (!previous || dependencies.some((value, i) => value !== previous[i])) effects.push(() => { cleanups[index]?.(); const cleanup = effect(); cleanups[index] = typeof cleanup === 'function' ? cleanup : undefined; }); effectDependencies[index] = dependencies; },
  };
  const context = vm.createContext({ exports: {}, React: hooks, document, IntersectionObserver: intersectionObserver, CSS: { supports: () => scrollTimeline }, URL, URLSearchParams, Intl, FormData, Date, queueMicrotask, fetch: fetch || (() => { throw new Error('Unexpected request'); }), window: { innerHeight: 500, location: { search, hash: '', origin: 'https://apt.invalid', assign: (path) => assigned.push(path) }, matchMedia: () => ({ matches: finePointer }), setTimeout: (callback) => { const id = ++nextTimer; timers.set(id, callback); return id; }, clearTimeout: (id) => timers.delete(id) }, require: (name) => name === 'react' ? hooks : name === 'lucide-react' ? require(name) : name === 'framer-motion' ? { motion: { div: 'div', aside: 'aside', span: 'span' }, useReducedMotion: () => reducedMotion, useScroll: () => ({ scrollYProgress: 0 }), useTransform: (_progress, _input, output) => output[1] } : name === 'next/image' ? { default: 'img' } : name === 'next/dynamic' ? { default: () => () => null } : name === '@/components/ui/sidebar' ? { ProductSidebar: () => null } : name === '@/components/ui/advanced-stats' ? { ClippedAreaChart: () => null } : name.endsWith('/billing-view') ? billing : name.endsWith('/billing-state') ? state : name.endsWith('/member-import') ? imports : (() => { throw new Error(`Unexpected import ${name}`); })() });
  const resolve = context.require;
  context.require = (name) => name === '@/components/ui/glyph-portal' ? glyphModule.exports : resolve(name);
  vm.runInContext(source, context);
  return { values, assigned, references, timers, exports: context.exports,
    render(name, props) { cursor = 0; effectCursor = 0; refCursor = 0; return context.exports[name](props); },
    async mount() { for (const effect of effects.splice(0)) effect(); for (let i = 0; i < 8; i++) await new Promise(setImmediate); },
    unmount() { for (const cleanup of cleanups.reverse()) cleanup?.(); cleanups.length = 0; },
    advanceTimer() { const [id, callback] = timers.entries().next().value || []; timers.delete(id); callback?.(); },
  };
}
function nodes(tree, predicate) { const found = []; const visit = (node) => { if (!React.isValidElement(node)) return; if (predicate(node)) found.push(node); React.Children.forEach(node.props.children, visit); }; visit(tree); return found; }
const portal = () => ({ member: { name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', cpfMasked: '***.***.***-00', participationStatus: 'awaiting_payment', accessActive: false }, subscription: null, financial: { billingMethod: 'pix', recurring: false, covered: false, paidThrough: null, lastReceivedAt: null }, payments: [] });

test('hero continuously repeats its three words and cancels its timer for reduced motion', async () => {
  const ui = product();
  for (const word of ['critério.', 'constância.', 'respeito.', 'critério.', 'constância.', 'respeito.']) {
    assert.equal(nodes(ui.render('HeroRotatingStatement', {}), node => node.props.className === 'apt-hero__rotator-line')[0].props.children, word);
    await ui.mount(); assert.equal(ui.timers.size, 1); ui.advanceTimer();
  }
  ui.render('HeroRotatingStatement', {}); await ui.mount();
  ui.render('HeroRotatingStatement', { reducedMotion: true }); await ui.mount();
  assert.equal(ui.timers.size, 0); ui.advanceTimer();
  assert.equal(nodes(ui.render('HeroRotatingStatement', { reducedMotion: true }), node => node.props.className === 'apt-hero__rotator-line')[0].props.children, 'critério.');
  ui.render('HeroRotatingStatement', { reducedMotion: false }); await ui.mount(); ui.advanceTimer();
  assert.equal(nodes(ui.render('HeroRotatingStatement', {}), node => node.props.className === 'apt-hero__rotator-line')[0].props.children, 'constância.');
  await ui.mount(); ui.unmount(); assert.equal(ui.timers.size, 0);
});

test('hero has no user stop control and keeps the accessible headline static with OS reduced motion', async () => {
  for (const reducedMotion of [false, true]) {
    const ui = product({ reducedMotion }), tree = ui.render('LandingPage');
    const hero = nodes(tree, node => node.type === 'section' && node.props.className === 'apt-hero')[0];
    assert.equal(nodes(hero, node => node.type === 'button').length, 0);
    const headline = nodes(tree, node => node.type === 'h1')[0];
    assert.match(renderToStaticMarkup(headline), /Um clube de tênis por indicação. Para jogar com critério, constância e respeito/);
    const statement = nodes(tree, node => node.type?.name === 'HeroRotatingStatement')[0];
    assert.equal(statement.props.reducedMotion, reducedMotion);
    const child = product();
    assert.equal(nodes(child.render('HeroRotatingStatement', statement.props), node => node.props.className === 'apt-hero__rotator-line')[0].props.children, 'critério.');
    await child.mount(); assert.equal(child.timers.size, reducedMotion ? 0 : 1);
    child.unmount();
  }
});

test('highlighting a Court changes only the editorial emphasis and keeps every division readable', () => {
  const ui = product();
  let tree = ui.render('LandingPage');
  const courtButtons = () => nodes(tree, node => node.type === 'button' && node.props['aria-label']?.startsWith('Destacar '));
  assert.equal(courtButtons().length, 4);
  assert.equal(courtButtons().filter(node => node.props['aria-pressed']).length, 1);
  courtButtons().find(node => node.props['aria-label'] === 'Destacar Court 2').props.onClick();
  tree = ui.render('LandingPage');
  assert.equal(courtButtons().find(node => node.props['aria-pressed']).props['aria-label'], 'Destacar Court 2');
  const portrait = nodes(tree, node => node.props.className?.startsWith('apt-courts__portrait '))[0];
  assert.match(portrait.props.className, /apt-court--two/);
  const list = nodes(tree, node => node.props.className === 'apt-courts__list')[0];
  const html = renderToStaticMarkup(list);
  for (const name of ['Central Court', 'Court 1', 'Court 2', 'Court 3']) assert.match(html, new RegExp(name));
  assert.match(html, /A divisão de maior nível do APT/);
  assert.match(html, /A base da escada competitiva/);
  for (const node of nodes(list, node => ['article', 'h3', 'p'].includes(node.type))) {
    assert.equal(Boolean(node.props.hidden || node.props.inert || node.props['aria-hidden']), false);
  }
  assert.deepEqual(ui.assigned, []);
});

test('Courts cycle only while visible, restart after manual selection and stop for hidden tabs or reduced motion', async () => {
  const observers = [], listeners = new Map();
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const document = { hidden: false, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: (name) => listeners.delete(name) };
  const ui = product({ document, intersectionObserver: Observer });
  let tree = ui.render('LandingPage');
  nodes(tree, node => node.props.className === 'apt-courts')[0].props.ref.current = {};
  await ui.mount();
  assert.equal(ui.timers.size, 0);
  const show = () => observers.at(-1).callback([{ isIntersecting: true, intersectionRatio: 0.5 }]);
  const selected = () => nodes(tree, node => node.type === 'button' && node.props['aria-pressed'])[0].props['aria-label'];
  show(); assert.equal(ui.timers.size, 1);
  for (const name of ['Court 1', 'Court 2', 'Court 3', 'Central Court']) {
    ui.advanceTimer(); tree = ui.render('LandingPage'); await ui.mount();
    assert.equal(selected(), `Destacar ${name}`);
    show(); assert.equal(ui.timers.size, 1);
  }
  nodes(tree, node => node.props['aria-label'] === 'Destacar Court 2')[0].props.onClick();
  tree = ui.render('LandingPage'); await ui.mount();
  assert.equal(selected(), 'Destacar Court 2');
  assert.equal(ui.timers.size, 0); show(); assert.equal(ui.timers.size, 1);
  document.hidden = true; listeners.get('visibilitychange')(); assert.equal(ui.timers.size, 0);
  document.hidden = false; listeners.get('visibilitychange')(); assert.equal(ui.timers.size, 1);
  observers.at(-1).callback([{ isIntersecting: false, intersectionRatio: 0 }]); assert.equal(ui.timers.size, 0);
  show(); ui.unmount(); assert.equal(ui.timers.size, 0); assert.equal(listeners.size, 0);
  assert.ok(observers.every(observer => observer.disconnected));
  const calm = product({ document, reducedMotion: true, intersectionObserver: Observer });
  tree = calm.render('LandingPage'); nodes(tree, node => node.props.className === 'apt-courts')[0].props.ref.current = {};
  await calm.mount(); assert.equal(calm.timers.size, 0); assert.equal(listeners.size, 0); calm.unmount();
});

test('photo pointer drift starts after spreading, resets on leave and stays static for touch, reduced motion or unsupported timelines', () => {
  const values = new Map();
  let progress = 0.5;
  const stage = { offsetHeight: 300, style: { setProperty: (name, value) => values.set(name, value) }, getBoundingClientRect: () => ({ left: 20, top: 0, width: 600, height: 500 }), parentElement: { offsetHeight: 850, getBoundingClientRect: () => ({ top: -350 * progress }) } };
  const getStage = options => nodes(product(options).render('LandingPage'), node => node.props.className === 'apt-spread__stage')[0];
  const frame = getStage();
  const pointer = { pointerType: 'mouse', currentTarget: stage, clientX: 620, clientY: 500 };
  frame.props.onPointerMove(pointer);
  assert.ok([...values.values()].every(value => value === '0px'));
  progress = 0.95;
  frame.props.onPointerMove(pointer);
  assert.ok(parseFloat(values.get('--apt-pointer-x')) > 0 && parseFloat(values.get('--apt-pointer-x')) <= 26);
  assert.ok(parseFloat(values.get('--apt-pointer-y')) > 0 && parseFloat(values.get('--apt-pointer-y')) <= 22);
  frame.props.onPointerLeave({ currentTarget: stage });
  assert.ok([...values.values()].every(value => value === '0px'));
  for (const options of [{ reducedMotion: true }, { finePointer: false }, { scrollTimeline: false }]) {
    values.clear(); getStage(options).props.onPointerMove(pointer); assert.equal(values.size, 0);
  }
  values.clear(); frame.props.onPointerMove({ ...pointer, pointerType: 'touch' }); assert.equal(values.size, 0);
  progress = 1.2; frame.props.onPointerMove(pointer); assert.ok(parseFloat(values.get('--apt-pointer-x')) > 0);
  frame.props.onPointerLeave({ currentTarget: stage }); assert.ok([...values.values()].every(value => value === '0px'));
});

test('the closing portal server-renders the real invitation and a direct entry link before any canvas or motion', () => {
  const html = renderToStaticMarkup(product().render('LandingPage'));
  assert.match(html, /data-gp-fallback[^>]*>JOGAR/);
  assert.match(html, /Ver como participar/);
  assert.match(html, /id="entrada"/);
  assert.match(html, /Entrada por indicação/);
  assert.match(html, /href="\/requerimento"[^>]*>Solicitar entrada/);
  assert.doesNotMatch(html, /https:\/\/cdn\.21st\.dev|Loading type|SUBLIME/);
});

test('login accepts local destinations and rejects backslash, protocol-relative and control-character redirects', async () => {
  for (const path of ['/gestao', '/membros?tab=perfil', '/\\example.invalid', '//example.invalid', '/\n/evil.invalid']) {
    const ui = product({ search: `?next=${encodeURIComponent(path)}` }); ui.render('LoginPage'); await ui.mount();
    assert.equal(ui.values[4], ['/gestao', '/membros?tab=perfil'].includes(path) ? path : '/portal');
  }
});

test('portal distinguishes session expiry from unavailable history and retry restores the actual portal', async () => {
  let attempts = 0;
  const ui = product({ fetch: async (url) => { assert.equal(url, '/api/portal'); return ++attempts === 1 ? Response.json({ error: 'Histórico indisponível' }, { status: 500 }) : Response.json(portal()); } });
  ui.render('PortalPage'); await ui.mount();
  let tree = ui.render('PortalPage'); const html = renderToStaticMarkup(tree);
  assert.match(html, /Histórico indisponível/); assert.doesNotMatch(html, /Entre para ver sua assinatura/);
  nodes(tree, (node) => node.type === 'button' && node.props.children === 'Tentar novamente')[0].props.onClick();
  ui.render('PortalPage'); await ui.mount();
  assert.equal(attempts, 2); assert.match(renderToStaticMarkup(ui.render('PortalPage')), /Olá, Atleta/);
  const expired = product({ fetch: async () => new Response(null, { status: 401 }) }); expired.render('PortalPage'); await expired.mount();
  assert.match(renderToStaticMarkup(expired.render('PortalPage')), /Entre para ver sua assinatura/);
});

test('automatic financial refresh always exits loading and exposes HTTP, network and invalid JSON errors', async () => {
  for (const failure of ['http', 'network', 'json']) {
    const data = portal(); data.subscription = { status: 'pending', amount_cents: 2000 };
    const ui = product({ fetch: async (_url, init) => { if (!init) return Response.json(data); if (failure === 'network') throw new Error('Conexão interrompida'); if (failure === 'json') return new Response('{'); return Response.json({ error: 'Asaas temporariamente indisponível' }, { status: 502 }); } });
    ui.render('PortalPage'); await ui.mount();
    const tree = ui.render('PortalPage');
    const refresh = nodes(tree, (node) => node.type === 'button' && node.props.children === 'Atualizar situação')[0];
    assert.equal(refresh.props.disabled, false); assert.match(renderToStaticMarkup(tree), /role="status"/);
  }
});

test('member table keeps financial evidence and opens the exact athlete, with checkout only when available', () => {
  const members = ['inactive', 'courtesy', 'pending_payment'].map((participationStatus, index) => ({ id: `athlete_${index}`, name: `Atleta ${index}`, email: `athlete${index}@example.test`, participationStatus, amountCents: 2000, subscriptionStatus: 'active', billingMethod: 'pix', checkoutAvailable: index === 2, financial: { covered: true, paidThrough: '2026-11-01', overdueCents: 0, reason: 'current' } }));
  const managed = [], reminders = [], ui = product();
  const tree = ui.render('MemberRecordsTable', { members, onManage: (member) => managed.push(member.id), onResendCheckout: (member) => reminders.push(member.id), remindingMemberId: '' });
  const html = renderToStaticMarkup(tree); assert.match(html, /Inativo/); assert.match(html, /Cortesia/); assert.match(html, /Pix mensal manual/); assert.match(html, /01\/11\/2026/);
  const buttons = nodes(tree, (node) => node.type === 'button');
  buttons.filter((node) => node.props.className === 'record-identity').forEach((node) => node.props.onClick());
  assert.deepEqual(managed, ['athlete_0', 'athlete_1', 'athlete_2']);
  const checkout = buttons.filter((node) => node.props.children === 'Reenviar checkout'); assert.equal(checkout.length, 1); checkout[0].props.onClick(); assert.deepEqual(reminders, ['athlete_2']);
});

test('dashboard keeps all six exact ledgers and opens real member/action lists from the reference composition', () => {
  const month = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7);
  const financial = { covered: false, reason: 'uncovered', overdueInvoiceIds: [], overdueCents: 0, recurringActive: false, pixRenewalDue: false, configurationRequired: false };
  const members = [
    { id: 'card', name: 'Cartão Exemplo', participationStatus: 'active', billingMethod: 'card', amountCents: 2000, financial: { ...financial, covered: true, recurringActive: true } },
    { id: 'debt', name: 'Vencido Exemplo', participationStatus: 'pending_payment', billingMethod: 'pix', amountCents: 3000, financial: { ...financial, reason: 'overdue', overdueCents: 3000, overdueInvoiceIds: ['overdue'] } },
    { id: 'renewal', name: 'Renovação Exemplo', participationStatus: 'pending_payment', billingMethod: 'pix', amountCents: 4000, financial: { ...financial, reason: 'pix_renewal', pixRenewalDue: true } },
    { id: 'configuration', name: 'Configuração Exemplo', participationStatus: 'awaiting_payment', billingMethod: null, amountCents: 2000, financial: { ...financial, reason: 'configuration', configurationRequired: true } },
    { id: 'courtesy', name: 'Cortesia Exemplo', participationStatus: 'courtesy', amountCents: 0, financial: { ...financial, reason: 'manual' } },
  ];
  const payments = [
    { id: 'received', memberId: 'card', status: 'RECEIVED', valueCents: 2000, receivedAt: `${month}-01`, confirmedAt: null },
    { id: 'confirmed', memberId: 'card', status: 'CONFIRMED', valueCents: 7000, receivedAt: null, confirmedAt: `${month}-01` },
    { id: 'overdue', memberId: 'debt', status: 'OVERDUE', valueCents: 3000, receivedAt: null, confirmedAt: null },
  ];
  const opened = [], managed = [], ui = product();
  const props = { members, payments, applications: [], operations: null, loading: false, error: '', onRetry() {}, onManageMember: (member) => managed.push(member.id), onOpenApplications: () => opened.push('applications'), onOpenMembers: (filter) => opened.push(filter) };
  let tree = ui.render('ManagementDashboard', props);
  assert.equal(nodes(tree, (node) => node.type === 'button' && node.props['data-metric']).length, 6);
  nodes(tree, (node) => node.type === 'button' && React.Children.toArray(node.props.children).includes('Consultar membros'))[0].props.onClick();
  nodes(tree, (node) => node.type === 'section' && node.props.className === 'management-decisions').flatMap((section) => nodes(section, (node) => node.type === 'button')).forEach((button) => button.props.onClick());
  assert.deepEqual(opened, ['all', 'applications', 'attention', 'communication']);
  for (const [key, expected] of [['received', 'received'], ['confirmed', 'confirmed'], ['overdue', 'overdue']]) {
    tree = ui.render('ManagementDashboard', props);
    nodes(tree, (node) => node.type === 'button' && node.props['data-metric'] === key)[0].props.onClick();
    tree = ui.render('ManagementDashboard', props);
    const table = nodes(tree, (node) => node.type?.name === 'InvoiceTable')[0];
    assert.deepEqual(Array.from(table.props.payments, (payment) => payment.id), [expected]);
  }
  for (const [key, expected] of [['recurring', 'card'], ['pix_renewal', 'renewal'], ['configuration', 'configuration']]) {
    tree = ui.render('ManagementDashboard', props);
    nodes(tree, (node) => node.type === 'button' && node.props['data-metric'] === key)[0].props.onClick();
    tree = ui.render('ManagementDashboard', props);
    const athletes = nodes(tree, (node) => node.props.className === 'financial-athletes')[0];
    const buttons = nodes(athletes, (node) => node.type === 'button');
    assert.equal(buttons.length, 1); buttons[0].props.onClick(); assert.equal(managed.at(-1), expected);
  }
});

test('member view switch changes actual table and board while preserving the filtered athlete set', () => {
  const members = [{ id: 'included', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: 'courtesy', financial: { covered: true } }, { id: 'excluded', name: 'Outro nome', email: 'outro@example.test', whatsapp: '11888888888', participationStatus: 'inactive', financial: { covered: false } }];
  const ui = product({ initial: { 0: 'membros', 2: 'Atleta', 5: members, 21: false, 22: false } });
  let tree = ui.render('AdminPage');
  const switcher = nodes(tree, (node) => node.props.className === 'view-switch')[0];
  assert.ok(switcher, 'Member view switch exists');
  const buttons = nodes(switcher, (node) => node.type === 'button');
  const table = nodes(tree, (node) => node.type?.name === 'MemberRecordsTable')[0]; assert.ok(table); assert.deepEqual(table.props.members.map((member) => member.id), ['included']);
  buttons[1].props.onClick(); tree = ui.render('AdminPage');
  const board = nodes(tree, (node) => node.type?.name === 'MemberOperationsKanban')[0]; assert.ok(board); assert.deepEqual(board.props.members, table.props.members);
});


test('candidate validates contact and integer age before advancing, preserving the answer on error', async () => {
  for (const [step, field, invalid, valid] of [[1, 'email', 'missing-domain', 'atleta@example.test'], [2, 'whatsapp', '123', '11999999999'], [3, 'idade', '25.5', '25']]) {
    const ui = product({ initial: { 0: step, 1: { [field]: invalid } } });
    let tree = ui.render('CandidatePage');
    const next = () => nodes(tree, (node) => node.type === 'button' && node.props.className === 'primary-button')[0];
    await next().props.onClick(); assert.equal(ui.values[0], step); assert.ok(ui.values[2]); assert.equal(ui.values[1][field], invalid);
    tree = ui.render('CandidatePage');
    nodes(tree, (node) => node.type === 'input' && node.props.name === field)[0].props.onChange({ target: { value: valid } });
    tree = ui.render('CandidatePage'); await next().props.onClick(); assert.equal(ui.values[0], step + 1);
  }
});


test('portal cancellation keeps manual participation and access constraints in the visible client state', async () => {
  for (const participationStatus of ['courtesy', 'inactive']) {
    const data = portal(); data.member.participationStatus = participationStatus; data.member.accessActive = participationStatus === 'courtesy'; data.financial.recurring = true; data.subscription = { status: 'active' };
    const ui = product({ initial: { 0: 'perfil', 5: data, 9: false }, fetch: async (url, init) => { assert.equal(url, '/api/portal'); assert.equal(JSON.parse(init.body).action, 'request_cancellation'); return Response.json({ cancelled: true, accessUntil: '2026-11-01' }); } });
    let tree = ui.render('PortalPage'); nodes(tree, (node) => node.type === 'button' && node.props.className === 'text-button text-button--danger')[0].props.onClick();
    tree = ui.render('PortalPage'); await nodes(tree, (node) => node.type === 'button' && node.props.className === 'danger-button')[0].props.onClick();
    assert.equal(ui.values[5].member.participationStatus, participationStatus); assert.equal(ui.values[5].member.accessActive, participationStatus === 'courtesy');
  }
});


test('member and application dialogs restore focus to the original trigger after their autofocus', async () => {
  for (const kind of ['member', 'application']) {
    const document = { activeElement: null };
    const trigger = { focus() { document.activeElement = this; } }; document.activeElement = trigger;
    const member = { id: 'member_1', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: 'courtesy', financial: { covered: true }, amountCents: 2000 };
    const application = { id: 'application_1', name: 'Candidato Exemplo', email: 'candidato@example.test', status: 'in_review', createdAt: '2026-10-01', answers: {}, notes: [] };
    const ui = product({ document, initial: { 0: kind === 'member' ? 'membros' : 'requerimentos', 4: [application], 5: [member], 21: false, 22: false }, fetch: async (url) => { assert.equal(url, kind === 'member' ? '/api/membros?id=member_1' : '/api/requerimentos?id=application_1'); return Response.json(kind === 'member' ? { member } : { application }); } });
    let tree = ui.render('AdminPage');
    const entry = nodes(tree, (node) => node.type?.name === (kind === 'member' ? 'MemberRecordsTable' : 'CrmKanban'))[0];
    await (kind === 'member' ? entry.props.onManage(member) : entry.props.onOpen(application.id));
    tree = ui.render('AdminPage');
    const detail = nodes(tree, (node) => node.type?.name === (kind === 'member' ? 'MemberManagementDetail' : 'ApplicationReviewDetail'))[0];
    document.activeElement = { name: 'Dialog close button' }; detail.props.onClose();
    assert.equal(document.activeElement, trigger);
    assert.equal(nodes(ui.render('AdminPage'), (node) => node.type?.name === (kind === 'member' ? 'MemberManagementDetail' : 'ApplicationReviewDetail')).length, 0);
  }
});


test('member refresh and save preserve the original opener until the dialog closes', async () => {
  for (const action of ['refresh', 'save']) {
    const document = { activeElement: null };
    const trigger = { focus() { document.activeElement = this; } }; document.activeElement = trigger;
    const member = { id: 'member_1', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: 'courtesy', financial: { covered: true }, amountCents: 2000 };
    const requests = [];
    const ui = product({ document, initial: { 0: 'membros', 5: [member], 21: false, 22: false }, fetch: async (url, init) => {
      requests.push([url, init?.method || 'GET']);
      if (url === '/api/membros?id=member_1') return Response.json({ member });
      if (url === '/api/membros?operations=1') return Response.json({ operations: null });
      assert.equal(url, '/api/membros');
      return Response.json(init?.method === 'PATCH' ? { member: { id: member.id, participationStatus: 'courtesy' } } : init ? { ok: true } : { members: [member], payments: [] });
    } });
    let tree = ui.render('AdminPage'); await nodes(tree, (node) => node.type?.name === 'MemberRecordsTable')[0].props.onManage(member);
    tree = ui.render('AdminPage'); let detail = nodes(tree, (node) => node.type?.name === 'MemberManagementDetail')[0];
    document.activeElement = { name: action === 'refresh' ? 'Atualizar no Asaas' : 'Salvar alterações' };
    if (action === 'refresh') await detail.props.onRefresh(); else assert.equal(await detail.props.onSave({ note: 'Conferência fictícia' }), true);
    tree = ui.render('AdminPage'); detail = nodes(tree, (node) => node.type?.name === 'MemberManagementDetail')[0]; detail.props.onClose();
    assert.equal(document.activeElement, trigger); assert.ok(requests.some(([url, method]) => url === '/api/membros' && method === (action === 'refresh' ? 'POST' : 'PATCH')));
  }
});

test('landing renders the actual member, calendar and enrollment destinations with readable FAQ content', () => {
  const ui = product();
  const tree = ui.render('LandingPage');
  const navigation = nodes(tree, (node) => node.type === 'header' && node.props.className === 'apt-site-nav')[0];
  const links = nodes(navigation, (node) => node.type === 'a');
  for (const destination of ['/entrar', '/calendario2026', '/requerimento', '#o-apt', '#ranking', '#temporada', '#duvidas']) {
    assert.ok(links.some((node) => node.props.href === destination), `Navigation keeps ${destination}`);
  }
  const hero = nodes(tree, (node) => node.props.className === 'apt-hero')[0];
  const photo = nodes(hero, (node) => node.type === 'img' && node.props.fetchPriority === 'high')[0];
  assert.ok(photo); assert.equal(Number(photo.props.width), 736); assert.equal(Number(photo.props.height), 981);
  assert.ok(nodes(hero, (node) => node.type === 'a' && node.props.href === '/requerimento').length);
  const faq = nodes(tree, (node) => node.type === 'details');
  assert.equal(faq.length, 5); assert.equal(faq[0].props.open, true);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Um clube de tênis por indicação. Para jogar com critério, constância e respeito/);
  assert.match(html, /O ranking fica no Tweener/);
});

test('landing footer groups real club and member destinations without placeholder links or forms', () => {
  const ui = product();
  const footer = nodes(ui.render('LandingPage'), (node) => node.type === 'footer')[0];
  const links = nodes(footer, (node) => node.type === 'a');
  assert.deepEqual(links.map((node) => node.props.href), ['#o-apt', '#ranking', '#temporada', '/calendario2026', '/requerimento', '/entrar', '#duvidas']);
  assert.equal(nodes(footer, (node) => node.type === 'nav')[0].props['aria-label'], 'Links do rodapé');
  assert.equal(nodes(footer, (node) => node.type === 'form' || node.type === 'input' || node.type === 'button').length, 0);
  const html = renderToStaticMarkup(footer);
  assert.match(html, /O clube/); assert.match(html, /Participe/); assert.match(html, /Beyond the Court/);
  assert.match(html, /Desde 2025/);
  assert.doesNotMatch(html, /APT TENNIS/);
  const closing = nodes(ui.render('LandingPage'), (node) => node.props.id === 'entrada')[0];
  const actions = nodes(closing, (node) => node.type === 'a');
  assert.equal(actions.length, 1); assert.equal(actions[0].props.href, '/requerimento');
  assert.match(renderToStaticMarkup(closing), /disponibilidade na divisão adequada/);
  assert.match(renderToStaticMarkup(closing), /Se aprovado/);
});

test('hero preserves readable content and native destinations with only the photo moving and OS reduced motion respected', () => {
  for (const reducedMotion of [false, true]) {
    const ui = product({ reducedMotion });
    const hero = nodes(ui.render('LandingPage'), (node) => node.props.className === 'apt-hero')[0];
    const planes = nodes(hero, (node) => node.props.className === 'apt-hero__photo');
    assert.equal(planes.length, 1);
    if (reducedMotion) assert.ok(planes.every((node) => node.props.style.y === 0));
    else assert.equal(planes[0].props.style.y, '3.5%');
    assert.ok(nodes(hero, (node) => node.type === 'a' && node.props.href === '/requerimento').length);
    assert.ok(nodes(hero, (node) => node.type === 'a' && node.props.href === '/calendario2026').length);
    assert.equal(nodes(hero, (node) => node.type === 'img' && node.props.fetchPriority === 'high').length, 1);
    assert.match(renderToStaticMarkup(hero), /A entrada depende de indicação e análise do perfil/);
  }
});


test('candidate returns focus to the invalid answer without advancing or discarding it', async () => {
  const ui = product({ initial: { 0: 1, 1: { email: 'not-an-email' } } });
  const tree = ui.render('CandidatePage');
  let focused = false;
  ui.references[0].current = { querySelector: () => ({ focus() { focused = true; } }) };
  await nodes(tree, (node) => node.type === 'button' && node.props.className === 'primary-button')[0].props.onClick();
  assert.equal(focused, true); assert.equal(ui.values[0], 1); assert.equal(ui.values[1].email, 'not-an-email');
});

test('member contact profile validates before PATCH and focuses the actual invalid field', async () => {
  for (const [name, phone, expected] of [[' ', '11999999999', 'member-name'], ['Atleta Exemplo', '123', 'member-whatsapp']]) {
    let requests = 0, focused = '';
    const ui = product({ initial: { 0: 'perfil', 5: portal(), 9: false, 13: name, 14: phone }, fetch: async () => { requests++; throw new Error('Validation should prevent requests'); } });
    const tree = ui.render('PortalPage');
    ui.references[0].current = { querySelector: (selector) => ({ focus() { focused = selector; } }) };
    await nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    assert.equal(requests, 0); assert.match(focused, new RegExp(expected)); assert.match(renderToStaticMarkup(ui.render('PortalPage')), /role="alert"/);
  }
});

test('profile save keeps edits on failure and uses only the existing contact action on success', async () => {
  const requests = []; let succeeds = false;
  const data = portal(); data.member.participationStatus = 'inactive';
  const ui = product({ initial: { 0: 'perfil', 5: data, 9: false, 13: 'Atleta Novo', 14: '(11) 99999-9999' }, fetch: async (url, init) => {
    requests.push([url, JSON.parse(init.body)]);
    return succeeds ? Response.json({ member: { name: 'Atleta Novo', whatsapp: '11999999999' } }) : Response.json({ error: 'Contato não salvo' }, { status: 502 });
  } });
  const save = async () => nodes(ui.render('PortalPage'), (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  await save(); assert.equal(ui.values[11], false); assert.equal(ui.values[13], 'Atleta Novo'); assert.match(renderToStaticMarkup(ui.render('PortalPage')), /Contato não salvo/);
  succeeds = true; await save();
  assert.equal(ui.values[5].member.name, 'Atleta Novo'); assert.equal(ui.values[5].member.whatsapp, '11999999999'); assert.equal(ui.values[5].member.participationStatus, 'inactive'); assert.equal(ui.values[5].member.accessActive, false);
  assert.deepEqual(requests, [['/api/portal', { action: 'update_profile', name: 'Atleta Novo', whatsapp: '(11) 99999-9999' }], ['/api/portal', { action: 'update_profile', name: 'Atleta Novo', whatsapp: '(11) 99999-9999' }]]);
});

test('member notes save through the existing member action, preserving text on failure and clearing only after success', async () => {
  const member = { id: 'member_notes', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: 'inactive', amountCents: 2000, financial: { reason: 'manual' }, notes: [], payments: [] };
  const changes = []; let succeeds = false;
  const ui = product();
  const props = { member, loading: false, saving: false, refreshing: false, error: '', onClose() {}, onSave: async (change) => { changes.push(change); return succeeds; }, onRefresh() {}, onDeleted() {} };
  let tree = ui.render('MemberManagementDetail', props);
  nodes(tree, (node) => node.type === 'textarea' && node.props.name === 'member-note')[0].props.onChange({ target: { value: '  Conversar sobre retorno.  ' } });
  const save = async () => { tree = ui.render('MemberManagementDetail', props); const notes = nodes(tree, (node) => node.props.className === 'crm-notes member-contact-notes')[0]; await nodes(notes, (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); };
  await save(); assert.equal(ui.values[3], '  Conversar sobre retorno.  ');
  succeeds = true; await save(); assert.equal(ui.values[3], '');
  assert.equal(JSON.stringify(changes), JSON.stringify([{ note: 'Conversar sobre retorno.' }, { note: 'Conversar sobre retorno.' }]));
});

test('portal payment and profile actions depend on actual recurring evidence and access links', () => {
  for (const method of ['pix', 'card', null]) {
    const data = portal(); data.financial.billingMethod = method; data.financial.recurring = method === 'card'; data.payments = [{ id: 'actual_invoice', status: 'CONFIRMED', valueCents: 2290, confirmedAt: '2026-10-01', receivedAt: null }];
    const ui = product({ initial: { 0: 'inicio', 5: data, 9: false } });
    let tree = ui.render('PortalPage');
    const recent = nodes(tree, (node) => node.type?.name === 'InvoiceTable')[0]; assert.equal(recent.props.payments[0].id, 'actual_invoice');
    assert.equal(nodes(tree, (node) => node.type === 'a' && /tweener|chat.whatsapp/.test(node.props.href || '')).length, 0);
    nodes(tree, (node) => node.type === 'button' && React.Children.toArray(node.props.children).some((child) => typeof child === 'string' && child.trim() === 'Ver histórico'))[0].props.onClick();
    assert.equal(ui.values[0], 'pagamentos'); tree = ui.render('PortalPage');
    assert.equal(nodes(tree, (node) => node.type === 'button' && node.props.children === 'Solicitar troca de cartão').length, method === 'card' ? 1 : 0);
    ui.values[0] = 'perfil'; tree = ui.render('PortalPage');
    assert.equal(nodes(tree, (node) => node.type === 'section' && node.props.className === 'exit-section').length, method === 'card' ? 1 : 0);
  }
});


test('portal next issued date follows the actual pending invoice and never a subscription schedule', () => {
  for (const nextInvoiceDueDate of [null, '2026-11-07']) {
    const data = portal(); data.subscription = { next_due_date: '2026-11-01' }; data.financial.nextInvoiceDueDate = nextInvoiceDueDate;
    const ui = product({ initial: { 0: 'pagamentos', 5: data, 9: false } });
    const overview = nodes(ui.render('PortalPage'), (node) => node.props.className === 'payment-overview')[0];
    const cell = nodes(overview, (node) => node.type === 'div' && nodes(node, (child) => child.type === 'span' && child.props.children === 'Próxima cobrança emitida').length)[0];
    assert.equal(cell.props.children[1].props.children, nextInvoiceDueDate ? '07 de novembro' : 'Não emitida');
  }
});

test('member contact reminder requires uncovered payable projection while direct conversation remains available', () => {
  for (const [stored, projected, covered, reminder] of [['pending_payment', 'active', true, false], ['courtesy', 'courtesy', false, false], ['inactive', 'inactive', false, false], ['cancelled', 'cancelled', false, false], ['active', 'delinquent', false, true]]) {
    const member = { id: 'reminder', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: stored, amountCents: 2000, financial: { participationStatus: projected, covered, reason: 'manual' }, payments: [], notes: [] };
    const ui = product();
    const tree = ui.render('MemberManagementDetail', { member, loading: false, saving: false, refreshing: false, error: '', onClose() {}, onSave: async () => true, onRefresh() {}, onDeleted() {} });
    assert.equal(nodes(tree, (node) => node.type === 'a' && node.props.children === 'Cobrar no WhatsApp').length, reminder ? 1 : 0);
    const direct = nodes(tree, (node) => node.type === 'a' && React.Children.toArray(node.props.children).some((child) => typeof child === 'string' && child.trim() === 'Conversar no WhatsApp'))[0];
    assert.ok(direct); assert.equal(direct.props.href, 'https://wa.me/5511999999999');
  }
});

test('member and application details open as native modal dialogs and close before restoring their trigger', async () => {
  for (const component of ['MemberManagementDetail', 'ApplicationReviewDetail']) {
    const events = [], bodyClasses = new Set();
    const document = { body: { classList: { add: (name) => bodyClasses.add(name), remove: (name) => bodyClasses.delete(name) } } };
    const ui = product({ document });
    const props = { member: null, application: null, loading: true, saving: false, refreshing: false, error: '', note: '', onClose: () => events.push('restore-trigger'), onSave() {}, onRefresh() {}, onDeleted() {}, onNoteChange() {}, onCopyInvite() {}, onResendInvite() {} };
    const dialog = ui.render(component, props);
    assert.equal(dialog.type, 'dialog'); assert.ok(dialog.props['aria-labelledby']);
    ui.references[0].current = { showModal: () => events.push('show-modal'), close: () => events.push('close-modal') };
    await ui.mount(); assert.deepEqual(events, ['show-modal']); assert.ok(bodyClasses.has('drawer-open'));
    let prevented = false;
    dialog.props.onCancel({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true); assert.deepEqual(events, ['show-modal', 'close-modal', 'restore-trigger']);
    ui.unmount(); assert.equal(bodyClasses.has('drawer-open'), false);
  }
});

test('partial member note receipt is deduplicated and consumed without reporting other edits as saved', async () => {
  const note = { id: 'saved_note', body: 'Próximo contato.', created_by: 'fixture-admin', created_at: '2026-10-03T03:00:00Z' };
  const member = { id: 'member_partial', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: 'inactive', financial: { covered: false }, amountCents: 2000, notes: [] };
  const ui = product({ initial: { 0: 'membros', 5: [member], 15: member, 21: false, 22: false }, fetch: async (url, init) => { assert.equal(url, '/api/membros'); assert.equal(init.method, 'PATCH'); return Response.json({ error: 'Falha ao registrar auditoria', noteRecorded: true, note }, { status: 500 }); } });
  const save = async (changes) => { const tree = ui.render('AdminPage'); const detail = nodes(tree, (node) => node.type?.name === 'MemberManagementDetail')[0]; return detail.props.onSave(changes); };
  assert.equal(await save({ note: note.body }), true);
  assert.equal(await save({ note: note.body }), true);
  let tree = ui.render('AdminPage'); let detail = nodes(tree, (node) => node.type?.name === 'MemberManagementDetail')[0];
  assert.equal(detail.props.member.notes.length, 1); assert.equal(detail.props.member.notes[0].id, note.id); assert.match(detail.props.error, /nota foi registrada/);
  assert.equal(await save({ note: note.body, participationStatus: 'courtesy' }), false);
  tree = ui.render('AdminPage'); detail = nodes(tree, (node) => node.type?.name === 'MemberManagementDetail')[0]; assert.equal(detail.props.member.participationStatus, 'inactive');
});


test('closing pending member/application reads unmounts the dialog and discards the late result', async () => {
  for (const kind of ['member', 'application']) {
    let complete; const pending = new Promise((resolve) => { complete = resolve; });
    const member = { id: 'pending_member', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: 'inactive', financial: { covered: false }, notes: [] };
    const application = { id: 'pending_application', name: 'Candidato Exemplo', email: 'candidato@example.test', status: 'new', createdAt: '2026-10-01', answers: {}, notes: [] };
    const ui = product({ initial: { 0: kind === 'member' ? 'membros' : 'requerimentos', 4: [application], 5: [member], 21: false, 22: false }, document: { activeElement: { focus() {} } }, fetch: async () => pending });
    const detailType = kind === 'member' ? 'MemberManagementDetail' : 'ApplicationReviewDetail';
    let tree = ui.render('AdminPage'); const list = nodes(tree, (node) => node.type?.name === (kind === 'member' ? 'MemberRecordsTable' : 'CrmKanban'))[0];
    const request = kind === 'member' ? list.props.onManage(member) : list.props.onOpen(application.id);
    tree = ui.render('AdminPage'); nodes(tree, (node) => node.type?.name === detailType)[0].props.onClose();
    assert.equal(nodes(ui.render('AdminPage'), (node) => node.type?.name === detailType).length, 0);
    complete(Response.json(kind === 'member' ? { member } : { application })); await request;
    assert.equal(nodes(ui.render('AdminPage'), (node) => node.type?.name === detailType).length, 0);
  }
});

test('member save/refresh after close updates the list without reopening or mixing another contact sheet', async () => {
  for (const action of ['save', 'refresh']) for (const openOther of [false, true]) {
    let complete; const pending = new Promise((resolve) => { complete = resolve; });
    const member = { id: 'old_member', name: 'Atleta Exemplo', email: 'atleta@example.test', whatsapp: '11999999999', participationStatus: 'inactive', financial: { covered: false }, notes: [], amountCents: 2000 };
    const other = { ...member, id: 'new_member', name: 'Outro Exemplo', email: 'outro@example.test', participationStatus: 'courtesy' };
    const ui = product({ initial: { 0: 'membros', 5: [member, other], 15: member, 21: false, 22: false }, document: { activeElement: { focus() {} } }, fetch: async (url, init) => {
      if (init?.method) return pending;
      if (url === '/api/membros') return Response.json({ members: [member, other], payments: [] });
      if (url === '/api/membros?operations=1') return Response.json({ operations: null });
      if (url === '/api/membros?id=new_member') return Response.json({ member: other });
      throw new Error('Closed sheet must not make another detail read: ' + url);
    } });
    let tree = ui.render('AdminPage'); const detail = nodes(tree, (node) => node.type?.name === 'MemberManagementDetail')[0];
    const request = action === 'save' ? detail.props.onSave({ note: 'Contato confirmado.' }) : detail.props.onRefresh();
    detail.props.onClose();
    if (openOther) { tree = ui.render('AdminPage'); await nodes(tree, (node) => node.type?.name === 'MemberRecordsTable')[0].props.onManage(other); }
    complete(Response.json(action === 'save' ? { member: { id: member.id, participationStatus: 'inactive' } } : {})); await request;
    tree = ui.render('AdminPage'); const remaining = nodes(tree, (node) => node.type?.name === 'MemberManagementDetail');
    assert.equal(remaining.length, openOther ? 1 : 0); if (openOther) { assert.equal(remaining[0].props.member.id, other.id); assert.equal(remaining[0].props.member.participationStatus, 'courtesy'); }
  }
});

test('enrollment without a link presents real entry paths while hosted checkout callbacks stay intact', async () => {
  const ui = product({ search: '' }); ui.render('EnrollmentPage'); await ui.mount();
  const tree = ui.render('EnrollmentPage'); const html = renderToStaticMarkup(tree);
  assert.match(html, /Cadastro por convite/); assert.doesNotMatch(html, /Você foi aprovado/); assert.equal(nodes(tree, (node) => node.type === 'form').length, 0);
  assert.deepEqual(nodes(tree, (node) => node.type === 'a' && ['/requerimento', '/entrar?next=/membros'].includes(node.props.href)).map((node) => node.props.href), ['/requerimento', '/entrar?next=/membros']);
  const callback = product({ search: '?status=sucesso' }); callback.render('EnrollmentPage'); await callback.mount(); assert.match(renderToStaticMarkup(callback.render('EnrollmentPage')), /Checkout concluído/);
});
