import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../app/pesquisa/survey-screen.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
function screen(initial, response) {
  let cursor = 0;
  const values = [...initial];
  const hooks = { ...React, useState(value) { const i = cursor++; if (!(i in values)) values[i] = value; return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; }, useCallback: fn => fn, useEffect() {} };
  const context = vm.createContext({ exports: {}, React: hooks, Intl, Date, Error, AbortController, fetch: async () => response, require(name) {
    if (name === 'react') return hooks;
    if (name.endsWith('.css')) return { default: {} };
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('/sidebar')) return { ProductSidebar: () => null };
    if (name.endsWith('/apt-app')) return { Brand: () => null };
    throw new Error(`Unexpected import: ${name}`);
  } });
  vm.runInContext(source, context);
  return { render(name) { cursor = 0; return context.exports[name]({ slug: 'experiencia-2026' }); } };
}
function nodes(tree, predicate) {
  const found = [];
  function visit(node) { if (!React.isValidElement(node)) return; if (predicate(node)) found.push(node); React.Children.forEach(node.props.children, visit); }
  visit(tree); return found;
}
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(setImmediate); };
const access = { title: 'Pesquisa', memberName: 'Atleta', state: 'open', submittedAt: null, formUrl: 'https://form.invalid/form/abcdef?apt_context=original' };

test('transient status failure keeps the active iframe and original context URL', async () => {
  const ui = screen([access, '', false, false], Response.json({ error: 'Indisponível' }, { status: 503 }));
  let tree = ui.render('MemberSurveyScreen');
  nodes(tree, n => n.type === 'button' && String(n.props.children).includes('Conferir registro'))[0].props.onClick();
  await flush(); tree = ui.render('MemberSurveyScreen');
  assert.equal(nodes(tree, n => n.type === 'iframe')[0].props.src, access.formUrl);
  assert.equal(nodes(tree, n => n.props.role === 'alert').length, 1);
});

test('expired member session removes the active iframe', async () => {
  const ui = screen([access, '', false, false], Response.json({}, { status: 401 }));
  const tree = ui.render('MemberSurveyScreen');
  nodes(tree, n => n.type === 'button')[0].props.onClick(); await flush();
  assert.equal(nodes(ui.render('MemberSurveyScreen'), n => n.type === 'iframe').length, 0);
});

test('expired management session clears previously loaded identified responses', async () => {
  const result = { survey: { id: 'campaign', title: 'Pesquisa', opens_at: '2026-11-17T00:00:00Z', closes_at: '2026-12-01T00:00:00Z', active: true, eligible_member_ids: ['member'], fields: [] }, responses: [{ id: 'response', member_id: 'member', received_at: '2026-11-17T12:00:00Z', answers: {}, members: { name: 'Atleta privado' } }] };
  const ui = screen([[result], '', false, false], Response.json({}, { status: 401 }));
  let tree = ui.render('SurveyResultsScreen'); assert.equal(nodes(tree, n => n.type === 'article').length, 1);
  nodes(tree, n => n.type === 'button')[0].props.onClick(); await flush();
  tree = ui.render('SurveyResultsScreen'); assert.equal(nodes(tree, n => n.type === 'article').length, 0);
  assert.equal(nodes(tree, n => n.type === 'a' && n.props.href === '/entrar?next=/gestao/pesquisas').length, 1);
});
