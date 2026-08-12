import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps member access editing admin-only, auditable and inside safe boundaries", async () => {
  const [membersRoute, portalRoute, client] = await Promise.all([
    readFile(new URL("../app/api/membros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(membersRoute, /requireAdmin/);
  assert.match(membersRoute, /new Set\(\["pending_payment", "courtesy", "inactive"\]\)/);
  assert.match(membersRoute, /allowedClubUrl\(value, "tweener\.club"\)/);
  assert.match(membersRoute, /allowedClubUrl\(value, "chat\.whatsapp\.com"\)/);
  assert.match(membersRoute, /member\.management_updated/);
  assert.match(membersRoute, /\["courtesy", "inactive"\]\.includes\(member\.participation_status\)/);
  assert.match(portalRoute, /member\.participation_status === "courtesy"/);
  assert.match(client, /MemberManagementList/);
  assert.match(client, /Gerenciar integrante/);
  assert.match(client, /Ativo e inadimplente são atualizados pelo fluxo financeiro/);
  assert.match(client, /Verificando acesso\./);
  assert.match(client, /if \(authChecking\) return/);
});
