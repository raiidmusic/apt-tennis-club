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

test("keeps payer identity and address inside hosted Asaas Checkout", async () => {
  const [enrollmentRoute, client] = await Promise.all([
    readFile(new URL("../app/api/cadastros/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(enrollmentRoute, /customerData/);
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
  assert.match(reconciliation, /email: member\.email/);
  assert.match(reconciliation, /normalizedEmail\(customer\.email\).*normalizedEmail\(member\.email\)/s);
  assert.match(reconciliation, /normalizedName\(customer\.name\).*normalizedName\(member\.name\)/s);
  assert.match(reconciliation, /cpfCnpj.*endsWith\(member\.cpf_last4/s);
  assert.match(reconciliation, /customer: recoveredCustomerId/);
  assert.match(reconciliation, /sendBillingTransitionEmails/);
  assert.match(webhook, /payload\.event === "CHECKOUT_PAID"/);
  assert.match(webhook, /resolveMemberId/);
  assert.match(webhook, /payment\?\.checkoutSession/);
  assert.match(webhook, /payment\?\.customer/);
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
  assert.match(client, /<SignOutButton(?:\s+[^>]*)?\s*\/>/);
  assert.match(logoutRoute, /clearAccessCookie\(\)/);
});

test("keeps protected navigation responsive and accessible", async () => {
  const [client, sidebar, styles] = await Promise.all([
    readFile(new URL("../app/apt-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(client, /<ProductSidebar/);
  assert.match(sidebar, /useReducedMotion/);
  assert.match(sidebar, /className="product-mobile-appbar"/);
  assert.match(sidebar, /className="product-mobile-tabbar"/);
  assert.match(sidebar, /mobileLabel \|\| item\.label/);
  assert.doesNotMatch(sidebar, /role="dialog"|aria-modal|mobileOpen|Menu aria-hidden/);
  assert.match(styles, /\.product-mobile-tabbar \{[^}]*position: fixed/);
  assert.match(styles, /\.product-mobile-tabbar \{[^}]*env\(safe-area-inset-bottom\)/);
  assert.match(styles, /\.product-mobile-tabbar__item \{[^}]*min-height: 3\.65rem/);
  assert.match(styles, /@media \(min-width: 64rem\)[\s\S]*\.product-sidebar \{[^}]*display: flex/);
  assert.match(styles, /@media \(min-width: 64rem\)[\s\S]*\.product-mobile-appbar, \.product-mobile-tabbar \{ display: none/);
  assert.match(styles, /\.product-sidebar__collapse[^}]*width: 2\.75rem; height: 2\.75rem/);
  assert.doesNotMatch(client, /className="(?:member-rail|admin-sidebar|mobile-tabbar|admin-mobile-nav)/);
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

test("protects browser writes and sensitive API responses at the application boundary", async () => {
  const [security, nextConfig, webhook, ...browserWriteRoutes] = await Promise.all([
    readFile(new URL("../lib/request-security.ts", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/asaas/route.ts", import.meta.url), "utf8"),
    ...[
      "../app/api/requerimentos/route.ts", "../app/api/cadastros/route.ts", "../app/api/portal/route.ts",
      "../app/api/membros/route.ts", "../app/api/membros/importacao/route.ts", "../app/api/auth/login/route.ts",
      "../app/api/auth/logout/route.ts", "../app/api/auth/recovery/route.ts", "../app/api/auth/magic-link/route.ts",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  ]);
  assert.match(security, /APT_PUBLIC_URL/);
  assert.match(security, /VERCEL_URL/);
  assert.match(security, /Origem da solicitação não autorizada/);
  assert.match(nextConfig, /Content-Security-Policy/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /Cache-Control.*no-store/);
  for (const route of browserWriteRoutes) assert.match(route, /requireTrustedOrigin\(request\)/);
  assert.doesNotMatch(webhook, /requireTrustedOrigin/);
  assert.match(webhook, /asaas-access-token/);
});

test("publishes the official transparent identity in social previews and installable PWA metadata", async () => {
  const [layout, manifest, landingSpec] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/manifest.ts", import.meta.url), "utf8"),
    readFile(new URL("../APT_LANDING_SPEC.md", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /og-apt-social\.png/);
  assert.doesNotMatch(layout, /apt-logo-(?:light|navy)\.png/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /start_url: "\/membros"/);
  assert.match(manifest, /icon-maskable-512\.png/);
  assert.match(landingSpec, /logos obrigatórias: `logo-apt1\*\.svg`, `logo-apt2\*\.svg` e `logo-apt3\*\.svg`, sempre transparentes/);
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
  assert.match(route, /isValidNewPassword\(password\)/);
  assert.match(client, /minLength=\{12\}/);
  assert.match(client, /maiúscula, minúscula e número/);
  const auth = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /password\.length >= 12/);
  assert.match(auth, /\[a-z\]/);
  assert.match(auth, /\[A-Z\]/);
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
