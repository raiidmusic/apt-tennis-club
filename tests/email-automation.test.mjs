import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps transactional Resend mail server-only and idempotent", async () => {
  const email = await readFile(new URL("../lib/apt-email.ts", import.meta.url), "utf8");
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /"User-Agent": "APT-Tennis-Club\/1\.0"/);
  assert.match(email, /"Idempotency-Key": input\.idempotencyKey/);
  assert.match(email, /APT_APPLICATION_TO_EMAIL.*APT_ADMIN_EMAILS/);
  assert.match(email, /function emailHtml/);
  assert.match(email, /logo-apt1\.svg/);
  assert.doesNotMatch(email, /apt-logo-light\.png/);
  assert.match(email, /supported-color-schemes/);
  assert.match(email, /prefers-color-scheme:dark/);
  assert.match(email, /max-width:600px/);
  assert.match(email, /APT Tennis Club · Brasília/);
  assert.match(email, /html: emailHtml\(input\.subject, input\.text, currentEnv\.APT_PUBLIC_URL\)/);
  assert.doesNotMatch(email, /cpf|card|cvv|ASAAS_API_KEY/i);
});

test("wires member and management notices to completed canonical events", async () => {
  const [applications, enrollment, portal, webhook] = await Promise.all([
    readFile(new URL("../app/api/requerimentos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/asaas/route.ts", import.meta.url), "utf8"),
  ]);
  for (const route of [applications, enrollment, portal, webhook]) {
    assert.match(route, /sendManagementEmail/);
    assert.match(route, /sendMemberEmail/);
  }
  assert.match(applications, /application_receipt/);
  assert.match(applications, /application_rejected/);
  assert.match(enrollment, /registration_checkout/);
  assert.match(enrollment, /quick_recadastro_management/);
  assert.match(portal, /card_change_management/);
  assert.match(portal, /cancellation_member/);
  assert.match(webhook, /payment_confirmed_member/);
  assert.match(webhook, /payment_attention_member/);
  assert.match(webhook, /!paymentIsPaid\(previousPayment\?\.status\)/);
  assert.match(webhook, /!paymentNeedsAttention\(previousPayment\?\.status\)/);
});
