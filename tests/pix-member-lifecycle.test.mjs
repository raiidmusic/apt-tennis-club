import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("creates identified Pix charges without weakening the recurring card boundary", async () => {
  const [enrollment, asaas, client] = await Promise.all([
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/asaas.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(enrollment, /paymentMethod\?: "card" \| "pix"/);
  assert.match(enrollment, /billingType: "PIX"/);
  assert.match(enrollment, /externalReference: memberId/);
  assert.match(enrollment, /pixQrCode/);
  assert.match(enrollment, /APT_PIX_KEY/);
  assert.match(enrollment, /billingTypes: \["CREDIT_CARD"\]/);
  assert.match(asaas, /externalReference: input\.memberId/);
  assert.match(asaas, /cpfCnpj: input\.cpf/);
  assert.match(client, /Cartão recorrente/);
  assert.match(client, /Pix copia e cola identificado/);
  assert.doesNotMatch(enrollment, /creditCard|remoteIp|holderName/);
});

test("keeps manual Pix ownership explicit, provider-backed and audited", async () => {
  const [members, reconciliation, client] = await Promise.all([
    readFile(new URL("../app/api/membros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/billing-reconciliation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(members, /action === "find_pix"/);
  assert.match(members, /payment\.externalReference && payment\.externalReference !== member\.id/);
  assert.match(members, /payment\.billingType !== "PIX"/);
  assert.match(members, /reconcileMemberBilling\(member\.id, \{ paymentId: payload\.paymentId \}\)/);
  assert.match(members, /payment\.pix_linked_by_operator/);
  assert.match(reconciliation, /billingDecision/);
  assert.match(reconciliation, /decision\.notice/);
  assert.match(reconciliation, /latest\?\.value \? Math\.round\(latest\.value \* 100\)/);
  assert.match(client, /O APT não escolhe por semelhança de nome/);
  assert.match(client, /Confira nome, valor, data e final do CPF/);
  assert.match(client, /Esta é uma mensagem automática do APT Tennis Club/);
  assert.match(client, /Você deseja continuar participando do ranking do APT Tennis Club/);
  assert.match(client, /billingMethod/);
  assert.match(reconciliation, /saoPauloDate/);
});

test("adds athletes through the canonical invite path and guards permanent deletion", async () => {
  const [members, importer, importRoute, client] = await Promise.all([
    readFile(new URL("../app/api/membros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/member-import.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/membros/importacao/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(client, /Adicionar atleta ao CRM/);
  assert.match(client, /Adicionar e gerar convite/);
  assert.match(importer, /classLevel/);
  assert.match(importRoute, /class_level: athlete\.classLevel/);
  assert.match(members, /export async function DELETE/);
  assert.match(members, /!member\.joined_at && \["pending_payment", "awaiting_payment"\]\.includes\(member\.participation_status\)/);
  assert.match(members, /member\.auth_user_id \|\| payment \|\| subscription\?\.asaas_customer_id/);
  assert.match(members, /member\.incomplete_record_deletion_authorized/);
  assert.match(client, /Inativar atleta/);
  assert.match(client, /Excluir cadastro incompleto/);
});
