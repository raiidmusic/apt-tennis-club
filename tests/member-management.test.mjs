import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps member access editing admin-only, auditable and inside safe boundaries", async () => {
  const [membersRoute, portalRoute, client, packageJson] = await Promise.all([
    readFile(new URL("../app/api/membros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(membersRoute, /requireAdmin/);
  assert.match(membersRoute, /new Set\(\["pending_payment", "courtesy", "inactive"\]\)/);
  assert.match(membersRoute, /allowedClubUrl\(value, "tweener\.club"\)/);
  assert.match(membersRoute, /allowedClubUrl\(value, "chat\.whatsapp\.com"\)/);
  assert.match(membersRoute, /member\.management_updated/);
  assert.match(membersRoute, /\["courtesy", "inactive"\]\.includes\(member\.participation_status\)/);
  assert.match(portalRoute, /member\.participation_status === "courtesy"/);
  assert.match(client, /MemberOperationsKanban/);
  assert.match(client, /memberOperationsStage/);
  assert.match(client, /cancellation_requested/);
  assert.match(client, /currentPeriodEnd/);
  assert.match(client, /Operação em tempo real, sem movimentação manual/);
  assert.match(client, /Abrir ficha completa/);
  assert.match(client, /Histórico financeiro/);
  assert.match(client, /Nova nota interna/);
  assert.match(client, /paymentReminderUrl/);
  assert.match(client, /Fila de lembretes/);
  assert.match(client, />Cobrar no WhatsApp</);
  assert.match(client, /https:\/\/wa\.me\//);
  assert.match(client, /Não há disparo automático/);
  assert.match(client, /Ativo e inadimplente são atualizados pelo fluxo financeiro/);
  assert.match(client, /Verificando acesso\./);
  assert.match(client, /if \(authChecking\) return/);
  assert.match(membersRoute, /supabaseAdmin<ManagementPaymentRow\[]>\("payments"/);
  assert.match(membersRoute, /paid_at\.gte/);
  assert.match(membersRoute, /valueCents: payment\.value_cents/);
  assert.match(client, /function ManagementDashboard/);
  assert.match(client, /Painel de decisão/);
  assert.match(client, /Receita confirmada nos últimos seis meses/);
  assert.match(client, /Receita em risco/);
  assert.match(client, /setPayments\(payload\.payments \|\| \[\]\)/);
  assert.match(client, /memberOperationsStage\(member\) === "active"/);
  assert.doesNotMatch(packageJson, /recharts|chart\.js|d3/);
});
