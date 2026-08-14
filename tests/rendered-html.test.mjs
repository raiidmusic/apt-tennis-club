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
  assert.match(client, /type === "recovery" \|\| type === "magiclink"/);
  assert.match(client, /type === "recovery" \? "\/redefinir-senha" : "\/acesso-gestao"/);
  assert.doesNotMatch(client, /SUPABASE_SECRET_KEY|ASAAS_API_KEY|service_role/i);
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(layout, /localhost:8400\/live\.js/);
  assert.doesNotMatch(layout, /next\/font\/google|Poppins\(/);
});

test("keeps public, invited, member and management journeys separate", async () => {
  await Promise.all([
    "../app/requerimento/page.tsx",
    "../app/cadastro/page.tsx",
    "../app/entrar/page.tsx",
    "../app/acesso-gestao/page.tsx",
    "../app/portal/page.tsx",
    "../app/membros/page.tsx",
    "../app/gestao/page.tsx",
  ].map((path) => access(new URL(path, import.meta.url))));
  const product = await readFile(new URL("../PRODUCT.md", import.meta.url), "utf8");
  assert.match(product, /\/requerimento/);
  assert.match(product, /\/cadastro\?convite=/);
  assert.match(product, /\/membros/);
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

test("keeps legacy profiles automation out of Supabase Auth signup", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260814193323_remove_legacy_auth_trigger.sql", import.meta.url), "utf8");
  assert.match(sql, /drop trigger if exists on_auth_user_created on auth\.users/);
  assert.match(sql, /drop function if exists public\.handle_new_user/);
  assert.doesNotMatch(sql, /drop table|delete from|truncate/i);
});

test("uses one canonical application record and renders the operational CRM", async () => {
  const [route, client] = await Promise.all([
    readFile(new URL("../app/api/requerimentos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /body: \{ actor: email, action: "application\.submitted"/);
  assert.doesNotMatch(route, /form_submissions|form_versions/);
  assert.match(client, /function CrmKanban/);
  assert.match(client, /Pipeline de requerimentos/);
  assert.doesNotMatch(client, /api\/formularios/);
  await assert.rejects(readFile(new URL("../app/apt-app 2.tsx", import.meta.url), "utf8"));
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

test("lets hosted Asaas Checkout collect the complete billing address", async () => {
  const [enrollmentRoute, client] = await Promise.all([
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(enrollmentRoute, /customerData:/);
  assert.match(client, /Endereço e cartão serão informados somente no ambiente seguro do Asaas\./);
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

test("keeps Tweener and community access inside an active member portal", async () => {
  const [portalRoute, client] = await Promise.all([
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(portalRoute, /app\.tweener\.club\/groups\/dd12bbfd-db69-43a2-b683-cccffc322daf/);
  assert.match(portalRoute, /chat\.whatsapp\.com\/EJOW47yPnwM0q9Zfm6CaUH/);
  assert.match(portalRoute, /accessActive \? member\.twinner_url \|\| clubLinks\.tweenerUrl : null/);
  assert.match(client, /Acessos rápidos/);
  assert.match(client, /Ranking no Tweener/);
  assert.match(client, /Comunidade APT/);
  assert.match(client, /Liberado após confirmação/);
});

test("reconciles billing without collecting card data in the APT portal", async () => {
  const [portalRoute, reconciliation, webhook, client] = await Promise.all([
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/billing-reconciliation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/asaas/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(portalRoute, /refresh_billing/);
  assert.match(portalRoute, /request_card_change/);
  assert.match(reconciliation, /externalReference/);
  assert.match(webhook, /asaas_checkout_id/);
  assert.match(reconciliation, /checkoutSession/);
  assert.match(reconciliation, /localSubscription\.asaas_checkout_id/);
  assert.match(reconciliation, /externalReference: memberId/);
  assert.match(reconciliation, /localPayment\?\.asaas_payment_id/);
  assert.match(reconciliation, /customer: localSubscription\.asaas_customer_id/);
  assert.match(webhook, /payload\.event === "CHECKOUT_PAID"/);
  assert.match(webhook, /asaas_customer_id: payload\.checkout\.customer/);
  assert.match(webhook, /participation_status: "active"/);
  assert.match(reconciliation, /subscriptions\/\$\{encodeURIComponent\(providerSubscription\.id\)\}\/payments/);
  assert.doesNotMatch(portalRoute, /creditCardHolderInfo|creditCardToken|\bcvv\b/i);
  assert.doesNotMatch(client, /<input[^>]+(?:card|cvv)/i);
  assert.match(client, /APT não recebe número, validade ou CVV/);
});

test("offers a safe session exit in protected areas", async () => {
  const [client, logoutRoute] = await Promise.all([
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(client, /function SignOutButton/);
  assert.match(client, /fetch\("\/api\/auth\/logout", \{ method: "POST" \}\)/);
  assert.match(client, /<SignOutButton \/>/);
  assert.match(logoutRoute, /clearAccessCookie\(\)/);
});

test("allows the master admin to authenticate before server-only operations are configured", async () => {
  const [auth, supabase] = await Promise.all([
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase-server.ts", import.meta.url), "utf8"),
  ]);
  assert.match(supabase, /function supabasePublicConfig\(\)/);
  assert.match(supabase, /function supabaseAdminConfig\(\)/);
  assert.match(supabase, /Supabase administrativo não configurado/);
  assert.match(auth, /if \(isAdminEmail\(email\)\) return/);
});

test("uses only the new Supabase server secret for administrative calls", async () => {
  const supabase = await readFile(new URL("../lib/supabase-server.ts", import.meta.url), "utf8");
  assert.match(supabase, /function supabaseSecretHeaders/);
  assert.match(supabase, /const secretKey = runtimeEnv\(\)\.SUPABASE_SECRET_KEY;/);
  assert.doesNotMatch(supabase, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(supabase, /return \{ apikey: secretKey \};/);
  assert.match(supabase, /\.\.\.supabaseSecretHeaders\(secretKey\)/);
});

test("renders a real checkout callback state instead of treating it as an invalid invitation", async () => {
  const client = await readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8");
  assert.match(client, /const \[checkoutStatus, setCheckoutStatus\]/);
  assert.match(client, /status === "sucesso" \|\| status === "cancelado" \|\| status === "expirado"/);
  assert.match(client, /checkoutStatus === "sucesso"/);
  assert.match(client, /Checkout não concluído/);
  assert.match(client, /Entrar na área do membro/);
});

test("keeps password recovery inside the official app and Supabase public-auth boundary", async () => {
  const [client, route, supabase] = await Promise.all([
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/recovery/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase-server.ts", import.meta.url), "utf8"),
  ]);
  assert.match(client, /Esqueci minha senha/);
  assert.match(client, /Crie sua nova senha/);
  assert.match(route, /APT_PUBLIC_URL/);
  assert.match(route, /\/redefinir-senha/);
  assert.match(route, /password\.length < 8/);
  assert.match(supabase, /auth\/v1\/recover/);
  assert.match(supabase, /auth\/v1\/user/);
  assert.doesNotMatch(route, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test("limits passwordless management access to the configured administrator", async () => {
  const [client, route, auth, supabase] = await Promise.all([
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/magic-link/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase-server.ts", import.meta.url), "utf8"),
  ]);
  assert.match(client, /Receber link de acesso da gestão/);
  assert.match(client, /window\.location\.replace\("\/gestao"\)/);
  assert.match(route, /isAdminEmail\(email\)/);
  assert.match(route, /getAuthUser\(accessToken\)/);
  assert.match(route, /token_validation_failed/);
  assert.match(route, /email_not_authorized/);
  assert.match(route, /accessCookie\(accessToken\)/);
  assert.match(auth, /export function isAdminEmail/);
  assert.match(auth, /MASTER_ADMIN_EMAILS/);
  assert.match(auth, /apttennisexclusive@gmail\.com/);
  assert.match(auth, /gaagustavo@gmail\.com/);
  assert.match(supabase, /auth\/v1\/otp\?/);
  assert.match(supabase, /create_user: false/);
  assert.doesNotMatch(route, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
