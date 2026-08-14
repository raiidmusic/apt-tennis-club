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
  assert.match(route, /const tokenHash = await sha256\(groupToken\)/);
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

  assert.match(route, /if \(!inviteToken && !groupToken\).*status: 400/);
  assert.match(route, /if \(!groupLink\).*link de recadastro não é válido/);
  assert.match(route, /if \(!inviteToken \|\| groupToken/);
  assert.match(route, /Já existe um cadastro associado a este e-mail ou CPF/);
  assert.match(client, /Este cadastro precisa de um acesso válido/);
});
