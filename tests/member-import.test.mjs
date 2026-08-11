import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseAthleteCsv, prepareAthleteImport } from "../lib/member-import.ts";

test("imports only active athletes and normalizes their contact data", () => {
  const parsed = parseAthleteCsv([
    "NOME,EMAIL,TELEFONE,RANQUEADO",
    '"Atleta Um",ATLETA@EXAMPLE.COM,"(61) 99999-0000",ATIVO',
    '"Atleta Dois",dois@example.com,61988880000,INATIVO',
  ].join("\n"));
  const prepared = prepareAthleteImport(parsed);
  assert.deepEqual(prepared, {
    athletes: [{ name: "Atleta Um", email: "atleta@example.com", phone: "61999990000" }],
    rejected: [],
  });
});

test("rejects duplicate emails and malformed active rows", () => {
  const prepared = prepareAthleteImport([
    { name: "Atleta Um", email: "um@example.com", phone: "61999990000", status: "ATIVO" },
    { name: "Atleta Repetido", email: "UM@example.com", phone: "61999990001", status: "ATIVO" },
    { name: "", email: "sem-nome@example.com", phone: "", status: "ATIVO" },
  ]);
  assert.equal(prepared.athletes.length, 1);
  assert.deepEqual(prepared.rejected.map((item) => item.reason), ["E-mail duplicado no arquivo", "Nome inválido"]);
});

test("recadastro migration keeps CPF nullable until self-entry and gives an invite one target", async () => {
  const [migration, importRoute, enrollmentRoute, webhookRoute] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608110003_member_recadastro.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/membros/importacao/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/asaas/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /alter column cpf_hash drop not null/);
  assert.match(migration, /invites_exactly_one_target_check/);
  assert.match(importRoute, /requireAdmin/);
  assert.match(importRoute, /token_hash: await sha256\(token\)/);
  assert.doesNotMatch(importRoute, /cpf_last4: athlete|cpf_hash: athlete/);
  assert.match(enrollmentRoute, /checkout_attempted_at/);
  assert.match(enrollmentRoute, /prefer: "return=representation"/);
  assert.match(enrollmentRoute, /checkouts\/\$\{encodeURIComponent\(checkoutId\)\}\/cancel/);
  assert.match(webhookRoute, /processed_at: null/);
  assert.match(webhookRoute, /payments\/\$\{encodeURIComponent\(payment\.id\)\}/);
  assert.match(webhookRoute, /current_period_end: providerNextDueDate/);
  assert.doesNotMatch(webhookRoute, /reconciled: false/);
});
