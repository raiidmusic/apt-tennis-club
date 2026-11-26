import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps member access editing admin-only, auditable and inside safe boundaries", async () => {
  const [membersRoute, portalRoute, client, packageJson, billingView] = await Promise.all([
    readFile(new URL("../app/api/membros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../lib/billing-view.ts", import.meta.url), "utf8"),
  ]);
  assert.match(membersRoute, /requireAdmin/);
  assert.match(membersRoute, /new Set\(\["pending_payment", "courtesy", "inactive"\]\)/);
  assert.match(membersRoute, /allowedClubUrl\(value, "tweener\.club"\)/);
  assert.match(membersRoute, /allowedClubUrl\(value, "chat\.whatsapp\.com"\)/);
  assert.match(membersRoute, /member\.management_updated/);
  assert.match(billingView, /isProtectedMembership\(memberStatus\)/);
  assert.match(portalRoute, /member\.participation_status === "courtesy"/);
  assert.match(client, /MemberOperationsKanban/);
  assert.match(client, /memberOperationsStage/);
  assert.match(client, /Cadastrou, não pagou/);
  assert.match(client, /Aguardando pagamento/);
  assert.match(client, /member\.checkoutStarted/);
  assert.match(client, /Lembretes automáticos em 1h e 20h/);
  assert.match(client, /Reenviar checkout/);
  assert.match(membersRoute, /action: "member\.checkout_reminder_sent"/);
  assert.match(membersRoute, /sendManualCheckoutReminder/);
  assert.match(membersRoute, /reconcileMemberBilling\(payload\.id\)/);
  assert.match(membersRoute, /requireTrustedOrigin/);
  assert.match(client, /cancellation_requested/);
  assert.match(client, /currentPeriodEnd/);
  assert.match(client, /Operação em tempo real, com conciliação segura/);
  assert.match(client, /Abrir ficha completa/);
  assert.match(client, /Histórico financeiro/);
  assert.match(client, /Nova nota interna/);
  assert.match(client, /paymentReminderUrl/);
  assert.match(membersRoute, /function projectMember/);
  assert.match(membersRoute, /billingMethod: financial\.billingMethod/);
  assert.match(client, /billing-method-chip/);
  assert.match(client, /Cartão recorrente/);
  assert.match(client, /Fila de lembretes/);
  assert.match(client, />Cobrar no WhatsApp</);
  assert.match(client, /https:\/\/wa\.me\//);
  assert.match(client, /Não há disparo automático/);
  assert.match(client, /Ativo e inadimplente são atualizados pelo fluxo financeiro/);
  assert.match(client, /Verificando acesso\./);
  assert.match(client, /if \(authChecking\) return/);
  assert.match(membersRoute, /supabaseAll<BillingPaymentRow>\("payments"/);
  assert.doesNotMatch(client, /paidAt \|\| payment\.createdAt/);
  assert.match(membersRoute, /payments: payments\.map\(financialPayment\)/);
  assert.match(client, /function ManagementDashboard/);
  assert.match(client, /Painel de decisão/);
  assert.match(client, /Recebimento no Asaas · últimos seis meses/);
  assert.match(client, /Recebido e confirmado em liquidação são séries separadas pela data do provedor/);
  assert.match(client, /O total do período soma apenas recebimentos/);
  assert.match(client, /Emitido vencido/);
  assert.match(client, /setPayments\(payload\.payments \|\| \[\]\)/);
  assert.match(client, /financialMetricRows/);
  const dependencies = JSON.parse(packageJson).dependencies;
  assert.ok(dependencies.recharts, "The selected Advanced Stats core uses Recharts");
  assert.equal(dependencies["react-is"], dependencies.react, "Recharts shares the installed React version");
  assert.doesNotMatch(packageJson, /chart\.js|"d3"\s*:/);
});
