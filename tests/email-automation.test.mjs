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
  const [applications, enrollment, portal, webhook, reconciliation, email, outboxMigration, cron] = await Promise.all([
    readFile(new URL("../app/api/requerimentos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/asaas/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/billing-reconciliation.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/apt-email.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608160002_billing_email_outbox.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cron/billing-reconciliation/route.ts", import.meta.url), "utf8"),
  ]);
  for (const route of [applications, enrollment, portal]) {
    assert.match(route, /sendManagementEmail/);
    assert.match(route, /sendMemberEmail/);
  }
  assert.match(applications, /application_receipt/);
  assert.match(applications, /application_rejected/);
  assert.match(enrollment, /registration_checkout/);
  assert.match(enrollment, /member\.community_registration_completed/);
  assert.match(portal, /card_change_management/);
  assert.match(portal, /cancellation_member/);
  assert.match(webhook, /sendBillingTransitionEmails/);
  assert.match(webhook, /paymentId && paymentIsReceived/);
  assert.match(webhook, /paymentId && paymentHasFailed/);
  assert.match(reconciliation, /sendBillingTransitionEmails/);
  assert.match(reconciliation, /customer: recoveredCustomerId \|\| localSubscription\.asaas_customer_id/);
  assert.match(email, /payment_confirmed_member/);
  assert.match(email, /payment_attention_member/);
  assert.match(email, /billing_email_deliveries/);
  assert.match(email, /retryBillingEmailDeliveries/);
  assert.match(email, /resolution=ignore-duplicates/);
  assert.match(outboxMigration, /dedupe_key text not null unique/);
  assert.match(outboxMigration, /enable row level security/);
  assert.match(outboxMigration, /revoke all.*anon, authenticated/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /reconcileMemberBilling/);
  assert.match(cron, /retryBillingEmailDeliveries/);
});

test("keeps approvals individual while direct enrollment uses one management-held link", async () => {
  const [applications, client] = await Promise.all([
    readFile(new URL("../app/api/requerimentos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(applications, /action === "rotate_direct_link"/);
  assert.match(applications, /action === "resend_invite"/);
  assert.match(applications, /registration\.direct_link_rotated/);
  assert.match(applications, /application\.invite_resent/);
  assert.match(applications, /flow: "eq\.direct", revoked_at: "is\.null"/);
  assert.match(client, /Gerar link direto/);
  assert.match(client, /Reenviar convite por e-mail/);
});
