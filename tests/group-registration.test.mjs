import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the community recadastro link private, expiring and server-only", async () => {
  const [migration, route, client] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260814223000_group_registration_links.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /token_hash text not null unique/);
  assert.match(migration, /expires_at timestamptz not null/);
  assert.match(migration, /revoked_at timestamptz/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.group_registration_links from anon, authenticated/);
  assert.match(route, /const tokenHash = await sha256\(token\)/);
  assert.match(route, /new Date\(link\.expires_at\)\.getTime\(\) <= Date\.now\(\)/);
  assert.match(route, /action: "member\.group_recadastro_qualified"/);
  assert.match(route, /emailMember && phoneMember && emailMember\.id === phoneMember\.id/);
  assert.match(route, /action: "application\.quick_recadastro_submitted"/);
  assert.match(route, /status: "in_review"/);
  assert.match(client, /action: "qualify_group", groupToken: groupToken\.current/);
  assert.match(client, /grupo=\$\{encodeURIComponent\(communityToken\)\}/);
  assert.match(client, /CPF, senha e pagamento só serão solicitados depois desta conferência/);
  assert.doesNotMatch(migration, /card|cpf|password/i);
});

test("does not turn the normal public cadastro route into open registration", async () => {
  const [route, client] = await Promise.all([
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(route, /\[inviteToken, groupToken, directToken\]\.filter\(Boolean\)\.length !== 1/);
  assert.match(route, /if \(!groupLink\).*link de recadastro não é válido/);
  assert.match(route, /\[inviteToken, directToken\]\.filter\(Boolean\)\.length !== 1/);
  assert.match(route, /Já existe um cadastro associado a este e-mail ou CPF/);
  assert.match(client, /Este cadastro precisa de um acesso válido/);
});

test("keeps one revocable direct registration link separate from the community recadastro", async () => {
  const [migration, applications, enrollment, client] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608160001_direct_registration_link.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/requerimentos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /flow text not null default 'community'/);
  assert.match(migration, /check \(flow in \('community', 'direct'\)\)/);
  assert.match(applications, /action === "rotate_direct_link"/);
  assert.match(applications, /flow: "eq\.direct", revoked_at: "is\.null"/);
  assert.match(applications, /action: "registration\.direct_link_rotated"/);
  assert.match(enrollment, /findGroupRegistrationLink\(directToken, "direct"\)/);
  assert.match(enrollment, /action: directLink \? "member\.direct_registration_completed"/);
  assert.match(enrollment, /directLink && !existingMember\.application_id/);
  assert.match(client, /\?direto=\$\{encodeURIComponent\(payload\.directToken\)\}/);
  assert.match(client, /Gerar link direto/);
  assert.doesNotMatch(applications, /direct_invite/);
});
