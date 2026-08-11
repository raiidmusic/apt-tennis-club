import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the APT landing public and free of server secrets", async () => {
  const [page, client] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /LandingPage/);
  assert.match(client, /APT Tennis Club/i);
  assert.match(client, /Solicitar entrada/i);
  assert.match(client, /Um ranking para quem leva o tênis a sério/i);
  assert.match(client, /Quatro Courts\. Uma escada competitiva/i);
  assert.doesNotMatch(client, /SUPABASE_SECRET_KEY|ASAAS_API_KEY|service_role/i);
});

test("keeps public, invited, member and management journeys separate", async () => {
  await Promise.all([
    "../app/requerimento/page.tsx",
    "../app/cadastro/page.tsx",
    "../app/entrar/page.tsx",
    "../app/portal/page.tsx",
    "../app/gestao/page.tsx",
  ].map((path) => access(new URL(path, import.meta.url))));
  const product = await readFile(new URL("../PRODUCT.md", import.meta.url), "utf8");
  assert.match(product, /\/requerimento/);
  assert.match(product, /\/cadastro\?convite=/);
  assert.match(product, /\/portal/);
  assert.match(product, /\/gestao/);
});

test("Supabase migration protects the complete membership lifecycle", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202608070001_apt_hub.sql", import.meta.url), "utf8");
  for (const table of ["applications", "invites", "members", "subscriptions", "payments", "webhook_events", "audit_logs"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /cpf_hash text not null unique/);
  assert.doesNotMatch(sql, /cpf\s+text/i);
});

test("versions the published application form without exposing it publicly", async () => {
  const [sql, route, client] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608110001_form_versioning.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/formularios/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  for (const table of ["forms", "form_versions", "form_questions", "form_submissions"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /revoke all on public\.forms[\s\S]+from anon, authenticated/);
  assert.match(sql, /grant select, insert, update, delete[\s\S]+to service_role/);
  assert.match(sql, /'consent', 18/);
  assert.match(route, /requireAdmin/);
  assert.match(client, /A versão publicada é imutável/);
});

test("revokes earlier invitations and validates applications on the server", async () => {
  const [migration, applicationsRoute, enrollmentRoute] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608110002_invite_revocation.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/requerimentos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /add column if not exists revoked_at timestamptz/);
  assert.match(applicationsRoute, /value\.length <= 3/);
  assert.match(applicationsRoute, /application\.submitted/);
  assert.match(applicationsRoute, /body: \{ revoked_at: new Date\(\)\.toISOString\(\) \}/);
  assert.match(enrollmentRoute, /revoked_at: "is\.null"/);
});

test("keeps paid access after recurring billing is cancelled", async () => {
  const [portalRoute, client] = await Promise.all([
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(portalRoute, /current_period_end/);
  assert.match(portalRoute, /accessActive/);
  assert.match(portalRoute, /participation_status: accessRemains \? "cancellation_requested" : "cancelled"/);
  assert.match(client, /if \(cancelling\) return/);
  assert.match(client, /Cancelando no Asaas/);
});
