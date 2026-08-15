# APT Brain

Last audited: 2026-08-15
State: APT-022 billing reconciliation is live for the controlled member; final responsive UI/design increment is coded and checked locally, with authenticated production visual proof still pending
Rule: plan, review and audit before construction

## Purpose

This file is the single execution memory for the APT system. It records current truth, decisions, corrections, feature status and the ordered task queue so work is not repeated or declared complete without evidence.

It does not replace `PRODUCT.md`, `DESIGN.md` or the code. It decides how those sources are interpreted and what should happen next.

## Product direction

The APT Hub manages the relationship outside the sports app:

- public positioning and application;
- internal review and approval;
- single-use invitation and private registration;
- recurring billing through hosted Asaas checkout;
- member access to payments, community links and Tweener;
- operational management of members and payment states.

Tweener remains responsible for ranking and matches. Supabase is the intended canonical database and identity provider. The APT must not collect full card data or persist plaintext CPF.

## Non-negotiable decisions

| ID | Decision | State | Evidence |
|---|---|---|---|
| D-001 | Supabase is the application database; D1 is not part of the product architecture. | CONFIRMED | `PRODUCT.md`, `README.md`, `lib/supabase-server.ts` |
| D-002 | Asaas hosted checkout owns card entry and recurring billing. | CONFIRMED | `PRODUCT.md`, `lib/asaas.ts`, `app/api/cadastros/route.ts` |
| D-003 | Tweener owns ranking and matches; APT owns membership and billing. | CONFIRMED | `PRODUCT.md` |
| D-004 | Store only CPF hash plus last four digits. | CONFIRMED | `supabase/migrations/202608070001_apt_hub.sql` |
| D-005 | Invitations are hashed, single-use, valid for seven days and earlier replacements must be revoked. | CONFIRMED LOCALLY | migrations and invitation routes; remote state unverified |
| D-006 | Hero rotates one solid word: `competir.`, `evoluir.`, `pertencer.`. No shimmer or gradient text. | CONFIRMED | historical approval and current code |
| D-007 | No fake data, fake buttons or simulated integration may be described as functional. | CONFIRMED | product requirements |
| D-008 | Vercel Next is the canonical deployment runtime. Vinext/Cloudflare files are retired starter architecture scheduled for removal in APT-012. | CONFIRMED | user decision 2026-08-11; successful Next webpack and Turbopack builds |
| D-009 | npm is the canonical package manager; `package-lock.json` is the only lockfile. | CONFIRMED | user decision 2026-08-11; lock root validated against `package.json` |
| D-010 | Keep or remove dynamic form versioning before production. | RESOLVED — REMOVED LOCALLY | one static form uses canonical `applications.answers`; no form editor was approved |
| D-011 | Reconcile the approved five-block landing spec with the larger current landing. | OPEN | current page includes gallery, metrics, Courts, cycle and FAQ |
| D-012 | Payment secrets have separate ownership and values: Asaas generates `ASAAS_API_KEY`; Asaas generates or accepts the webhook `authToken`; APT generates `CPF_HASH_SECRET`. None may be reused, exposed to the browser, committed, logged or stored in application tables. | CONFIRMED | Asaas authentication/webhook docs; Supabase secrets docs; `.env.example` |
| D-013 | APT and Supabase must never receive or store card PAN, expiry, CVV or a reusable card token. Card entry and card changes remain entirely inside hosted Asaas pages. | CONFIRMED | Asaas Checkout and PCI-DSS docs; current checkout flow and schema search |
| D-014 | APT external projects and browser operations must use accounts tied to `gaagustavo`; do not use Guedes Associados/Kelly Guedes accounts. Continue browser work in the Codex in-app browser (IAB), not Chrome. | CONFIRMED | explicit user decision 2026-08-11 |
| D-015 | Preserve the real remote migration history. Reconcile drift with reviewed forward-only migrations; never fabricate, copy or mark historical migrations as applied. | CONFIRMED | APT-004 remote/local reconciliation |
| D-016 | Keep the eight APT Hub tables server-only: RLS enabled, no `anon`/`authenticated` table privileges, explicit `service_role` access. Grants and RLS are separate controls and both must be verified. | CONFIRMED | current callers and remote policy inspection |
| D-017 | A credential embedded in historical SQL is permanently compromised. Containment requires session revocation before account disable/delete, removal of the legacy Auth trigger/function path and rotation of any reused credential. | CONFIRMED | APT-004 migration and Auth inspection |
| D-018 | Existing athletes enter as preloaded members with no CPF, Auth identity or billing record. A hashed individual invite unlocks recadastro; CPF is then stored only as hash plus last four digits and card entry remains in hosted Asaas Checkout. Do not fabricate application answers for imported athletes. | CONFIRMED | explicit user priority 2026-08-11; roster and current-flow audit |
| D-019 | The canonical club access links are the APT Tweener group `dd12bbfd-db69-43a2-b683-cccffc322daf` and the supplied WhatsApp community invite. They appear only to authenticated members with active participation; member-specific database values may override them later. | CONFIRMED | user-provided links 2026-08-11 |
| D-020 | V1 is one complete operational loop: application, CRM decision, invite, recadastro, hosted recurring checkout, webhook reconciliation, member portal and management finance. A route or button without its real backend state is not part of V1. | CONFIRMED | explicit launch decision 2026-08-13 |
| D-021 | The requested ranking shortcut means Tweener. APT links to Tweener and does not rebuild ranking or match management. | CONFIRMED | D-003, user correction context and canonical group link |
| D-022 | APT never captures, stores or proxies card details. First card registration uses hosted Asaas Checkout. Removing a card means ending its recurring charge; replacement must use a new hosted checkout and only retire the previous subscription after provider-confirmed replacement. | CONFIRMED | D-002, D-013 and official Asaas Checkout/subscription documentation reviewed 2026-08-13 |
| D-023 | V1 CRM reuses canonical lifecycle states. Application Kanban: `new`, `in_review`, `awaiting_info`, `approved`, `invite_sent`, `registered`, `rejected`. Member operations reuse participation and subscription states; no parallel CRM tables. | CONFIRMED | current schema, Ponytail review and explicit user requirement 2026-08-13 |
| D-024 | The current community receives one private, reusable recadastro link instead of individual invitations. The unguessable token is stored only as a hash, expires and can be revoked. Exact e-mail plus WhatsApp correspondence with the imported current roster goes directly to recadastro; unmatched people become `in_review` CRM cards for quick approval and provide no CPF/password/payment data first. Normal public applicants still use the full application flow. | AUTHORIZED | explicit user decisions 2026-08-14; current-list workbook and production member preflight |
| D-025 | Every APT surface, including transactional e-mail, uses only the official transparent SVG lockups. `logo-apt1.svg` is the complete light lockup for dark surfaces; the legacy `apt-logo-light.png` and `apt-logo-navy.png` files are prohibited. | CONFIRMED | explicit owner correction 2026-08-15; `APT_LANDING_SPEC.md` |

## Payment security gate — selected 2026-08-11

This gate must pass before any billing feature is treated as integrated or production-ready.

| Secret | Created by | Canonical storage | Explicit boundary |
|---|---|---|---|
| `ASAAS_API_KEY` | An Asaas administrator in the Asaas dashboard; it is shown once | The secret manager of the canonical backend runtime | Never Supabase tables, browser code, Git, chat, email or logs |
| `ASAAS_WEBHOOK_TOKEN` | Prefer the secure generator in Asaas; 32–255 characters | Asaas webhook configuration and the same backend runtime secret store | Must be different from every API/database/hash key; validate `asaas-access-token` before parsing business effects |
| `CPF_HASH_SECRET` | APT, from a cryptographically secure random generator | Backend runtime secret store | Used only for CPF hashing; never reused as a webhook token or API key |
| `SUPABASE_SECRET_KEY` | Supabase | Backend runtime secret store | Server-only and unrelated to Asaas authentication; it bypasses RLS |

The current code calls Asaas from Next server routes. Therefore `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` and `CPF_HASH_SECRET` belong in Vercel Environment Variables, not in Supabase. They belong in Supabase Edge Function Secrets only if a future approved task deliberately moves the payment API to Edge Functions. Duplicating secrets across both runtimes is prohibited without an active caller in each runtime.

Minimum card-security controls:

1. Redirect to Asaas Checkout; do not add card inputs to APT.
2. Store only Asaas checkout/payment/subscription IDs, URLs and normalized business status.
3. Validate the webhook token, deduplicate by event ID and reconcile provider state before acknowledging a business result.
4. Keep RLS enabled and deny client roles direct writes to billing/event tables; use the server secret only in trusted backend code.
5. Redact request payloads and secrets from application, support and monitoring logs.
6. Use separate Sandbox and Production keys, minimum access, expiry/rotation and immediate revocation after suspected exposure.
7. Verify approval, refusal, duplicate webhook, invalid token and timeout paths in Asaas Sandbox before production.

Current gate status: policy and runtime owner are locked. The canonical Supabase and Vercel projects are identified under `gaagustavo`. `ASAAS_WEBHOOK_TOKEN` now exists as a Sensitive, Production-only Vercel variable; its value is not recorded here. The matching production Asaas webhook is saved, uses API v3 with sequential delivery, and remains disabled with zero penalized events until deployment and signed-event verification. `ASAAS_API_KEY`, Sandbox credentials and the other required runtime variables remain unconfigured. On 2026-08-13, the owner reported that a newly issued `SUPABASE_SECRET_KEY` was saved in Vercel. The code now accepts only that server-only variable and never falls back to the exposed legacy service-role key; a source deployment and runtime check are still required. APT-004 completed the read-only reconciliation plan; no secret value should be pasted into this file or into chat.

Review evidence: a repository search found no active APT card fields or PAN/CVV persistence, and the existing API key/webhook token reads are server-side. The known webhook reconciliation defects remain tracked in APT-006, so this is not integration proof. `ponytail-review`: Lean already. Ship. The whole-repository `ponytail-audit` was not repeated because this cycle changed only execution memory, not code, dependencies or structure.

## Evidence scale

- `CODED`: present in source only.
- `CHECKED`: typecheck/build or focused automated check passed.
- `VISUAL`: exact UI inspected in browser at required breakpoints.
- `INTEGRATED`: real external service and persisted data verified end to end.
- `LIVE`: correct production target, domain and runtime observed.

`DONE` never means only `CODED`.

## Current system map

| Area | Current evidence | What is missing |
|---|---|---|
| Landing `/` | CODED, CHECKED | Visual approval of current expanded page; reconcile with landing spec; production target |
| Application `/requerimento` | CODED, CHECKED | Real Supabase persistence, Resend delivery, admin visibility of full answers, browser flow |
| Admin login `/entrar` | CODED, CHECKED, VISUAL; `apttennisexclusive@gmail.com` is an existing confirmed Supabase Auth user and was added to the Vercel `APT_ADMIN_EMAILS` allowlist for Production and Preview on 2026-08-11; Preview `dpl_7oyfxATeji7xzfadUef6wg1LRSMA` is Ready and visibly renders `/entrar` | Configure the canonical Site URL before password recovery, then prove `/gestao`, session refresh/expiry UX and visible logout with that account |
| Management `/gestao` | CODED, CHECKED; mobile CRM Kanban, application detail, internal notes and recorded information requests added locally | Authenticated browser proof with a real application; member editing, Tweener/community links |
| Invitation approval | CODED, CHECKED; `revoked_at` and the active-invite index applied to canonical production on 2026-08-13 | Real email/manual-copy test and retry behavior |
| Private registration `/cadastro` | CODED, CHECKED; imported-member recadastro schema and checkout-attempt lock applied to canonical production on 2026-08-13 | Valid-invite visual check; real Sandbox checkout and failure-path proof |
| Asaas webhook | CODED, CHECKED; provider re-query, retryable event record and lifecycle reconciliation added locally | Real signed Sandbox events and concurrent/timeout evidence |
| Member portal `/portal` | CODED, CHECKED; active-member quick access to the canonical Tweener group and WhatsApp community added locally | Authenticated browser proof; class in profile, logout, reliable paid-through date, real payments |
| Form versioning | REMOVED LOCALLY | The public form writes only to canonical `applications.answers`; no second form/editor is approved |
| Supabase | Project `APT TENNIS CLUB` (`cjwxqfxrkdgmqbomzhkm`) in organization `AI`, `sa-east-1`; recadastro migration verified on the production `main` branch on 2026-08-13: `invites.revoked_at`, `invites.member_id`, one-target constraint, checkout fields and retryable webhook fields now exist; the preflight found zero orphan invites | Re-run security advisors after the separately scoped legacy-credential containment; prove Vercel server-secret runtime through an authenticated data journey |
| Deployment | Vercel project `apt-tennis-club` (`prj_gnjjgijeXutKy5vZM5Q0nn9hXnx3`) under `gaagustavo-9339's projects`; Preview `dpl_7oyfxATeji7xzfadUef6wg1LRSMA` is Ready; `ASAAS_WEBHOOK_TOKEN` is configured as Sensitive and Production-only; no production deployment exists. `apttennis.com.br` now redirects permanently to `www.apttennis.com.br`, which is attached to Production but awaiting DNS. Supabase Site URL is `https://www.apttennis.com.br`. The deployed source is detached from this local Git worktree (no Git remote), so the Preview confirms settings and legacy login UI but not the current local changes. | Create the two DNS records, connect the approved Git/local source, configure the reviewed variables and authorize a production deployment in later tasks |
| Tests | 13 static/focused checks pass; typecheck and production build pass | Runtime API tests and one sandbox end-to-end happy path plus failure paths |
| Lint | 15 errors, 20 warnings | Zero-error quality gate |
| Version control | Git `main`; recoverable baseline `03ce2ab` | Remote owner is not configured; not required for the local baseline |

## Correctness and security review

### P0 — foundation and release blockers

1. `[RESOLVED — APT-001]` Git `main` now exists at the workspace root with recoverable baseline `03ce2ab`.
2. `[APT-004 COMPLETE; OPEN IN APT-018/APT-019]` Remote/local drift is mapped. A legacy migration contains an administrative credential, the corresponding Auth user remains present, and legacy Auth functions/triggers and permissive public policies remain exposed. Containment must precede schema construction or production billing.
3. `[CODED IN APT-021; VERIFY IN SANDBOX]` Auth creation is now compensated if the member write fails, while preloaded members persist CPF hash/contact before Auth and can resume the flow without creating another member.
4. `[CODED IN APT-021; VERIFY IN SANDBOX]` The subscription row exists before the Checkout POST, one conditional database claim owns the attempt, inconclusive responses block automatic retry and a returned checkout is cancelled if its database persistence fails.
5. `[CODED IN APT-021; VERIFY IN SANDBOX]` A webhook without a valid member reference or local subscription returns failure so Asaas retries instead of accepting an unreconciled event.
6. `[CODED IN APT-021; VERIFY IN SANDBOX]` Webhook events are persisted as unprocessed, business state is reconciled idempotently and `processed_at` is set only after success; failures retain an error and remain retryable.
7. `[CODED IN APT-021; VERIFY IN SANDBOX]` Confirmed/received payments re-query the current Asaas payment and subscription, then record the provider's `nextDueDate` as the local paid-through boundary.

### P1 — core operational gaps

1. `[CODED — APT-007]` Management can now open every saved answer, record an internal note and make an informed decision; authenticated Supabase/browser proof remains pending.
2. `[CODED — APT-007]` “Pedir informação” now requires and records an internal note. It deliberately does not claim that the candidate was contacted.
3. `[IN PROGRESS — APT-008]` The portal exposes the canonical Tweener and WhatsApp links only to active members. Management now updates per-member overrides and only `pending_payment`, `courtesy` or `inactive` with an audit record; the public Preview login page is visually verified, while authenticated non-production proof remains pending.
4. `[RESOLVED LOCALLY — APT-007]` The application list returns an explicit error rather than an empty business state when Supabase fails; integration proof remains pending.
5. Checkout callbacks return to `/cadastro?status=...`, but the page does not render success, cancellation or expiration states.
6. The portal receives `whatsappCommunityUrl` but never renders it; the profile also omits class and logout.
7. Access-token-only cookies expire after about one hour and there is no refresh flow (`lib/auth.ts:25-38`).
8. The webhook writes the paid invoice due date into `next_due_date`, which is not evidence of the next billing date (`app/api/webhooks/asaas/route.ts:64-73`).
9. `PAYMENT_REFUNDED` and `PAYMENT_DELETED` update member state but not subscription state consistently.
10. A synchronous localhost Impeccable script is present in the production root layout (`app/layout.tsx:44`).

### P2 — product completeness and quality

1. No runtime test covers application, invitation, registration, webhook or cancellation boundaries.
2. No observability contract exists for external-service failures or partial writes.
3. Current landing contains factual operating claims that need owner confirmation before live use: two matches per fortnight, four Courts, quarterly movement and APT Finals.
4. Current landing diverges from the approved minimal landing spec, which explicitly excludes FAQ, extensive gallery and invented metrics.
5. Global lint is red: 15 errors and 20 warnings.
6. Visual verification is missing for the active landing, application, registration, management and portal at mobile and desktop widths.
7. Next build warns that `metadataBase` is missing, so social images fall back to `http://localhost:3000` until the production origin is configured.

## Ponytail audit — whole repository

Tracked-tree snapshot refreshed after the APT-022 form-versioning removal on 2026-08-13. Findings only; cleanup remains task-scoped.

1. `delete:` the 443-line design generator after the implemented landing receives visual sign-off. Replacement: current app plus final screenshots. [`scripts/generate-apt-v2.mjs`]
2. `delete:` 399 lines of D1/Drizzle schema, examples and migrations duplicate canonical Supabase. Replacement: existing Supabase server helpers. [`db/`, `examples/d1/`, `drizzle/`, `drizzle.config.ts`]
3. `delete:` 162 lines and seven direct dependencies from the retired Vinext/Cloudflare runtime. Replacement: native Next on Vercel. [`vite.config.ts`, `worker/`, `build/sites-vite-plugin.ts`, `.openai/`, Vinext/Vite/Cloudflare dependencies]
4. `delete:` unused 86-line ChatGPT header-auth helper has no callers and competes with Supabase Auth. Replacement: nothing. [`app/chatgpt-auth.ts`]
5. `delete:` unused Tailwind toolchain while active CSS is plain CSS and PostCSS has no plugins. Replacement: native CSS. [`tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs`]
6. `delete:` nine unreferenced starter/legacy public assets after visual comparison. Replacement: referenced approved assets only. [`public/apt-hero.jpg`, `apt-motion.jpg`, `apt-ritual.jpg`, `favicon.svg`, `file.svg`, `globe.svg`, `logo-apt3.svg`, `og 2.png`, `window.svg`]
7. `delete after use:` the CSV import panel, endpoint, parser and import-only CSS once the audited legacy roster has been imported and its links exported. Replacement: the normal application/approval flow for future members. [`app/api/membros/importacao/route.ts`, `lib/member-import.ts`, `MemberImportPanel`, related CSS/tests]

Resolved this cycle: about -230 lines of unapproved form CMS/versioning were removed; public applications now have one canonical record. Remaining opportunity: about -1,340 source lines, -11 direct dependencies and 9 assets after the one-time roster transition.

## Ponytail review — APT-022 CRM, callback and server-secret change

The local Git diff was reviewed on 2026-08-13. No fixes applied.

- `app/api/requerimentos/route.ts`: one public application write plus a best-effort audit record is the smallest current operational boundary; there is no duplicate form store.
- `app/apt-app.tsx`: the CRM maps existing application states and opens the existing detail flow. It introduces no tables, drag library, workflow engine or duplicate member state.
- `lib/supabase-server.ts`: only `SUPABASE_SECRET_KEY` can make server-only calls. The historical service-role variable is absent from the implementation.
- `app/apt-app.tsx`: checkout callback rendering is presentational; provider webhook reconciliation remains the only source of billing activation.

`ponytail-review`: Lean already. Ship.

## Ordered task queue

Only one task may be `IN_PROGRESS`. Construction starts only after the user selects the next `READY` task.

| ID | Priority | Status | Outcome | Acceptance evidence | Depends on |
|---|---:|---|---|---|---|
| APT-000 | P0 | BLOCKED | Establish the Asaas Sandbox security baseline in the canonical backend runtime. | Secret names are present without exposed values; Asaas Checkout proves card data stays outside APT/Supabase; invalid-token and duplicate signed webhook checks pass; key owner, expiry and rotation procedure are recorded. | APT-004, Asaas Sandbox administrator access |
| APT-001 | P0 | DONE | Establish canonical Git repository/worktree and preserve the audited state. | Git `main`; baseline `03ce2ab`; secret scan clean; generated/local files confirmed ignored; build passed; 7/7 tests passed. | — |
| APT-002 | P0 | DONE | Select Vercel Next and npm; make Next the default build and keep one canonical lockfile. | User decision recorded; Next webpack and native Turbopack builds pass; 7/7 tests pass; package lock matches manifest; pnpm/Vercel override files removed. | — |
| APT-003 | P0 | DONE | Connect the correct Supabase APT project and inspect current schema/migrations/advisors read-only. | Project ID, 17 tables, 10 migrations and both advisor result sets captured in IAB. | — |
| APT-004 | P0 | DONE | Reconcile local migrations with the real APT database before applying anything. | Ten remote and three local migrations mapped; grants, RLS, functions, triggers and Auth exposure inspected; forward-only recovery plan reviewed; no remote apply. | APT-003 |
| APT-005 | P0 | PENDING | Remove partial-failure traps from registration and checkout. | Repeatable failure tests prove no orphan Auth user, member, checkout or consumed invitation. | APT-000, APT-019 |
| APT-006 | P0 | PENDING | Make Asaas webhook reconciliation retry-safe and lifecycle-correct. | Signed sandbox events cover confirmed, overdue, refunded/deleted and duplicate delivery; dates match provider truth. | APT-000, APT-019 |
| APT-007 | P1 | VERIFY | Make application review operational. | Admin reads every answer, records notes/decision and sends or records information requests without false delivery claims. | APT-003 |
| APT-008 | P1 | VERIFY | Make member management operational. | Admin updates Tweener/community links and allowed participation states with audit records; an isolated authenticated non-production flow proves the member portal and audit row. | APT-003 |
| APT-009 | P1 | VERIFY | Complete registration callback and retry UX. | Local success/cancel/expired states and focused test pass; retry/identity/billing requires Sandbox proof. | APT-005, APT-006 |
| APT-010 | P1 | VERIFY | Complete member portal essentials. | Class, active community link, safe logout and local checks are coded; session-expiry and paid-through require integration proof. | APT-006, APT-008 |
| APT-011 | P1 | READY | Remove production-local Impeccable script and restore a zero-error lint baseline. | Typecheck, build, tests and lint all pass. | APT-001 recommended |
| APT-012 | P1 | READY | Remove dead starter architecture and dependencies approved by the Ponytail audit. | Chosen build passes; no Vinext/Cloudflare/D1/Drizzle/unused auth/Tailwind callers; dependency diff reviewed. | APT-001, APT-002 |
| APT-013 | P1 | VERIFY | Remove form versioning before remote application. | D-010 closed; only necessary schema/code remains; tests updated. | APT-001 recommended |
| APT-014 | P2 | READY | Reconcile landing spec, current claims and current expanded design. | Owner confirms content/structure; one canonical spec remains; claims are sourced. | D-011 |
| APT-015 | P2 | PENDING | Add the smallest runtime tests for trust and money boundaries. | One runnable check per application, invite, registration, webhook and cancellation flow. | APT-005, APT-006 |
| APT-016 | P2 | PENDING | Verify every user journey visually and end to end. | Mobile and desktop browser evidence; API/data evidence; no console errors; exact live target recorded. | APT-003 through APT-015 as applicable |
| APT-017 | P2 | VERIFY | Configure production services and observability. | Supabase, Asaas, Resend, domain, webhook and failure logs verified in the chosen target. | APT-002, APT-003, APT-006 |
| APT-018 | P0 | READY | Contain the compromised legacy Supabase administrator and Auth automation path. | Pre-change backup recorded; sessions revoked before account disable/delete; any reused credential rotated; legacy Auth trigger and unnecessary definer functions removed with explicit function grants; the historical Auth redirect allowlist is reduced to approved live hosts; a controlled Auth signup creates no legacy profile; advisors and logs reviewed. | APT-004, explicit destructive-action approval |
| APT-019 | P0 | PENDING | Apply the approved forward-only schema, grant and legacy-surface reconciliation outside production first. | Isolated validation proves the eight canonical tables and constraints, invite revocation, explicit grants/default privileges and RLS; no public legacy data surface, fake history or form-CMS schema; dump diff and advisors reviewed before a separately authorized production apply. | APT-013, APT-018, legacy-data disposition decision |
| APT-020 | P0 | DROPPED | Start August 2026 collection directly in Asaas while APT automation remains gated. | Replaced by APT-021 after the user required athletes to enter APT and complete their own CPF recadastro before recurrence. | Replaced by APT-021 |
| APT-021 | P0 | VERIFY | Import current athletes and issue an individual recadastro that creates one hosted monthly Asaas recurrence. | Import preview accepts the validated active roster, deduplicates by normalized email and never imports CPF/card data; each stored token is hashed and revocable; the athlete confirms contact data, enters CPF and creates access; only CPF hash/last four persist; retries do not duplicate Auth, member, checkout or subscription; invalid/expired token and Asaas failure paths pass; full flow is proven in Sandbox before separately authorized production charging. | APT-004; production rollout also requires APT-018, APT-019, Asaas credentials and billing terms |
| APT-022 | P0 | IN_PROGRESS | Release the complete operational V1 on the official domain. | All eight release gates below pass with production-target evidence; no visible `not configured`, fake state or dead action remains in an authorized journey; first real member can complete recadastro and reach `/membros`; management sees the same application, member, subscription and payment truth. | Explicit user authorization 2026-08-13; gates retain their destructive and financial confirmations |

## APT-022 V1 release gates — authorized 2026-08-13

### Execution increment authorized 2026-08-15 — final responsive product design

- The owner authorized a complete UX/UI review and implementation across every current route and breakpoint, explicitly including a replacement for the desktop sidebar and use of selected 21st.dev component prompts.
- Design inputs: the existing `PRODUCT.md`/`DESIGN.md`, the `impeccable`, `mobile-app-ui-design` and `frontend-design` skills, the supplied `Design-da-Apple.pdf`, and the supplied 21st.dev sidebar integration prompt.
- 21st.dev is a pattern and source reference, not permission to import demo content. No Acme data, external avatar, fake metrics, dead links or starter dashboard may enter APT. The official APT lockups, canonical routes and real state remain mandatory.
- The supplied sidebar pattern may be adapted to the existing Next/TypeScript application. New dependencies must earn their place, preserve reduced-motion behavior and pass the structural review; no second UI framework or generic shadcn demo shell is approved.
- Responsive acceptance: 375px mobile, intermediate tablet and 1440px desktop; no horizontal viewport overflow; 44px touch targets; readable placeholders and muted text; immediate press feedback; interruptible drawer/sidebar motion; consistent loading, empty, error, success and disabled states.
- Scope is presentational and interaction-level only unless a discovered UX defect requires a separately recorded behavior decision. Supabase, Asaas, authentication, data boundaries and production-side effects remain unchanged.

### Progress — CODED, CHECKED LOCALLY

- The supplied 21st.dev sidebar prompt was adapted into `components/ui/sidebar.tsx` instead of copying its Acme demo. Member and management use the official APT lockup, canonical tabs/links, real profile/status/badge values and the existing secure logout. Desktop navigation is manually collapsible rather than hover-dependent. After the owner's mobile-first correction, mobile uses a persistent app-style bottom tab bar with safe-area spacing, concise labels, badges, current-tab semantics and a compact app bar with logout; no hamburger or desktop-derived drawer remains.
- The Apple motion reference informed immediate pressed feedback and reduced-motion behavior. Framer Motion is limited to the collapsible desktop sidebar; mobile navigation uses native links/buttons and short CSS feedback without a drawer lifecycle. Lucide supplies the coherent navigation icon set. No Tailwind/shadcn demo shell, generic dashboard data, remote avatar, gradient text, shimmer or multi-word hero rotation was introduced.
- Product surfaces now share restrained radii, quieter typography, readable placeholders, less repetitive uppercase labelling and the existing APT navy/clay/mineral system. Public hero/navigation content is no longer hidden behind page-load animation. The member and management content grids use `minmax(0, 1fr)` and the previous fixed rail/mobile-tab CSS was deleted.
- Responsive structure is mobile-first: the compact app bar and fixed bottom tab bar are the default; content reserves space for the device safe area and persistent navigation. At 64rem the sticky full-height desktop sidebar replaces both mobile bars. The focused regression check asserts the app-shell structure, safe-area use, minimum 44px controls, desktop breakpoint and absence of the retired drawer/navigation classes.
- Verification: Next 16.2.6 Turbopack compiled, typechecked and generated all 24 routes; independent TypeScript passes after removing a corrupt interrupted `.next/dev` artifact; all 28 focused tests pass; lint has zero errors and the same 20 pre-existing image/legacy-generator warnings; `git diff --check` passes. Browser inspection rendered the landing, application, registration, login, recovery and protected-entry states and found no horizontal document overflow across all eight public/protected routes at the available 1280px viewport. The authenticated member/management production gate was subsequently closed by the evidence below.
- Production publication (2026-08-15): commit `1592f544f72bbdf5687c59593e5504b0b216ffee` (`feat: finalize responsive APT product design`) is on `origin/main`. Vercel deployment `dpl_DbLY5i54Bbt4i18FLNPd1e11rn1X` completed in 29 seconds, is `Ready`, `Current` and `Production`, and assigns `https://www.apttennis.com.br` to that exact source commit. The official host returned the deployed application at 375x844, 768x1024 and 1440x1000 with document width equal to viewport width on `/`, `/requerimento`, `/entrar`, `/membros` and `/gestao`; the browser console error scan was empty and Vercel's recent runtime log view showed the inspected requests completing without 5xx responses. Mobile landing and tablet application screenshots were visually inspected. The owner then completed a real administrative login in the IAB; authenticated proof of the corrected mobile app navigation remains pending publication of the follow-up source commit and is not claimed here.
- Mobile-first correction published (2026-08-15): commits `7ef8984d56836e4c6db846ea7cb6a7874ee18ae2` and `30108b761fae4b451009563c3564b06b8afcd3a9` replaced the mobile drawer with the app bar plus persistent bottom tab bar and centered the tablet bar. Final Vercel deployment `dpl_4GWPKhA7xVi8QY8aqXWbrxomuQcY` built in 25 seconds and is `Ready`, `Current`, `Production` on `https://www.apttennis.com.br`. A real admin session proved `/gestao` at 375x844 and 768x1024 with app navigation, tab selection, 58px tab targets, correct `aria-current`, zero document overflow and no console errors. A separate real member session proved `/membros` at the same two mobile/tablet breakpoints with four persistent tabs, 58px targets, correct active-state changes for Início, Pagamentos and Perfil, the centered 576px tablet bar, zero document overflow and no console errors. At 1440x1000 both authenticated surfaces render only the 280px desktop sidebar; it contracts to 76px, keeps a 44px control and does not overflow. The authenticated responsive design gate is complete.
- Correctness/security review: no API, Supabase, Asaas, Auth, schema or financial transition changed. The new navigation only calls the existing tab setters, canonical external links and logout route. Production dependency audit attributes four high findings to the pre-existing Next 16.2.6 tree (`next`, bundled `postcss`/`sharp` and its `nanoid`); neither new UI dependency is named. Upgrading Next is a separate dependency task and was not auto-applied inside the design increment.
- Refreshed `ponytail-audit`: the previously ranked deletion candidates remain unchanged. One new single-use class utility and unused compact flag were removed during review. `ponytail-review`: lean; one shared navigation component now owns the desktop sidebar and mobile app shell, Framer Motion is restricted to the desktop collapse interaction, and Lucide replaces mixed text glyphs with one navigation icon system.

### Execution increment authorized 2026-08-14 — member portal and management completion

- The user explicitly delegated the complete implementation with `IMPLEMENTE TUDO` after testing the first real registration and identifying the member/admin gaps.
- `IN_PROGRESS` boundary: provider-backed billing reconciliation; current-month status, due date and history; visible Tweener/WhatsApp access state; safe profile editing; card-change request without card capture; compact mobile-first member UI; compact desktop-first management UI and finance filters.
- Provider boundary: the portal may perform one explicit reconciliation against Asaas when local billing is incomplete, but must not continuously poll. Card data, holder data and reusable tokens remain outside APT/Supabase. The Asaas hosted boundary is preserved.
- Non-goals remain unchanged: no native ranking engine, no second CRM/schema, no automatic WhatsApp blast, no real test charge initiated by the agent.
- Acceptance: focused tests plus typecheck, lint and production build; 375px member and 1440px management visual verification; provider reconciliation has a deterministic no-result and provider-failure path; production publication must point to the committed Git source.

### Execution increment authorized 2026-08-14 — one community recadastro link

- The owner rejected individual links for the current community and authorized one link to be posted in the existing group so every current athlete can complete recadastro directly.
- Production preflight found only one member in `members`, with identity and protected CPF already completed; therefore a lookup against a preloaded roster would reject the rest of the community.
- The selected boundary is one unguessable, reusable, expiring and revocable group token. Its plaintext appears only in the distributed URL; Supabase stores only its SHA-256 hash. Direct recadastro additionally requires the same member row to match both normalized e-mail and WhatsApp. Unmatched people become `in_review` applications with only name/contact/consent, visibly labelled for quick approval in the existing CRM.
- The group token reuses the existing `/cadastro`, Auth, CPF protection, member, subscription and hosted Asaas Checkout flow. It creates no parallel member or billing domain and captures no card data.
- Source reconciliation: `membros.xlsx` contains 37 names but masks every e-mail and phone. The previously validated active-roster CSV supplies 35 names, 34 phones and zero rejected rows; the new workbook adds two names. Only real contact fields from the validated CSV may be imported. New/unmatched names use quick approval instead of inferred data.
- Acceptance: invalid, expired and revoked group tokens fail; a direct path requires exact e-mail plus WhatsApp against one imported member; unmatched contacts appear in CRM without CPF/password collection; duplicate e-mail/CPF rules remain enforced; focused tests, typecheck, lint and build pass; the exact production link is visually verified without creating a new charge.

1. **Foundation and security** — configure a newly issued server-only Supabase secret in the `gaagustavo` Vercel project; contain the exposed legacy credential/trigger; reconcile only the required forward schema; re-run security advisors. No old service-role credential may be reused.
2. **Application and CRM** — `/requerimento` persists one canonical application and shows success; management renders a mobile-first Kanban from existing states, opens every answer, records notes and moves cards through valid transitions.
3. **Approval and invitation** — approval creates one hashed seven-day invite, revokes older unused invites, sends or exposes one operational link and records delivery state without false claims.
4. **Recadastro and identity** — invited/imported athlete confirms contact, enters CPF transiently, creates Auth identity and reaches hosted Asaas Checkout; retries cannot duplicate member, identity, subscription or checkout.
5. **Asaas boundary** — use hosted recurring Checkout for card entry; configure production API key, amount, webhook token and official callback URL; prove Sandbox approval, refusal, duplicate event, invalid token and timeout before production activation. Card data never enters APT/Supabase/logs.
6. **Management operations** — members, participation, WhatsApp contact, reminder queue, subscriptions, payments and financial history render from canonical tables. Summary metrics derive from persisted truth; no decorative/fake metrics.
7. **Member portal** — `/membros` shows participation, next due date, payment history/invoice links, logout, profile/class, WhatsApp and Tweener shortcuts. Cancellation stops future recurrence while preserving earned access through the paid period. Card replacement uses a new hosted checkout and provider-confirmed handoff; APT does not expose card fields.
8. **Launch proof** — focused tests, typecheck, build and lint pass; mobile 375px and desktop journeys are browser-verified on the exact production source; runtime errors/logs reviewed; one controlled first-member end-to-end test passes before roster-wide invitation.

### V1 exclusions that prevent unsafe or duplicated work

- No native ranking, matches or tournament engine; Tweener remains canonical.
- No card form, PAN/CVV storage or reusable card token in APT/Supabase.
- No second CRM schema, generic workflow builder, drag library, chart library or new UI framework.
- No automatic bulk WhatsApp sending. Management opens reviewed, prefilled individual conversations.
- No production roster blast or real recurrence before the controlled first-member proof.

### Current hard blockers observed on the official domain

- `CPF_HASH_SECRET` was generated and saved as a Sensitive Vercel variable for Production and Preview on 2026-08-14. Production redeploy `dpl_6Fa8JU9hMe3J7VgZb4CvGB9oC7Wu` is Ready on source `f7b4329`; the previous visible CPF-configuration block is cleared at runtime only by this deployment. The secret value was not recorded, displayed or committed.
- Production Asaas API key and monthly amount are present as Sensitive variables; live signed webhook proof is still absent and the saved webhook remains disabled.
- A valid invited registration, authenticated management data load and member portal have not yet been proved against the exact production runtime. That controlled test must happen before importing the roster or activating recurring charges.

## Recommended execution sequence

1. `APT-001` — DONE: recover safe history.
2. `APT-002` — DONE: Vercel Next + npm; payment secrets belong to Vercel.
3. `APT-003` and `APT-004` — DONE: canonical targets and remote/local drift mapped without mutation.
4. `APT-021` — build the import and individual recadastro path now; do not generate a real checkout during construction.
5. `APT-018` — contain the exposed legacy administrator and Auth automation before the first imported athlete creates an identity.
6. `APT-000` — configure and prove the Asaas Sandbox security gate as soon as an Asaas administrator is available.
7. `APT-013`, then `APT-019` — remove the premature form CMS locally and validate one forward-only database reconciliation including the APT-021 schema.
8. `APT-005` and `APT-006` — close the remaining registration and webhook compensation/reconciliation defects; APT-021 shares these gates.
9. `APT-011` — make the baseline green.
10. `APT-007` through `APT-010` — complete operational features.
11. `APT-014` — settle landing content and structure.
12. `APT-015` through `APT-017` — runtime tests, full verification and live operations.

## Task lifecycle

`PENDING → READY → IN_PROGRESS → VERIFY → DONE`

Alternative terminal states: `BLOCKED`, with concrete blocker; `DROPPED`, with reason and replacement.

Each task must record:

- intended outcome, not a list of files;
- boundary and explicit non-goals;
- evidence that currently proves the problem;
- acceptance check and failure-path check;
- dependencies and external target;
- final evidence and any new correction.

## Definition of done

A task is `DONE` only when:

1. the requested outcome exists and unnecessary scope was skipped;
2. correctness/security review found no unresolved issue in its boundary;
3. `ponytail-review` found no unjustified added complexity;
4. typecheck/build and the smallest meaningful automated check pass;
5. browser verification exists for visual work;
6. real integration evidence exists for Supabase, Asaas, Resend or deployment work;
7. this brain contains the new status, evidence, decisions and corrections.

## Corrections and durable memory

- Do not start constructing from a broad request to “continue tasks”. First show the plan and obtain/identify the active task.
- Do not treat historical prompts as a current backlog without auditing the actual code and operational state.
- Do not add architecture “for later”. A second form, second provider or second runtime must exist before generalizing for it.
- A local build proves compilation, not Supabase, Asaas, Resend, browser quality or deployment.
- A protected deployment URL returning a response is not visual approval.
- Errors must not be converted into empty business states.
- Identity and money paths require failure-path evidence, not only happy-path UI.
- When the repository structure has not changed, reuse this audit instead of repeating it. Rerun after dependency, runtime or major architecture changes.
- The initial Git baseline excludes `.env*`, dependencies, builds, local live sessions, backups, operational spreadsheets and previews; do not force-add them.
- Browser work must stay in IAB and external targets must belong to `gaagustavo`; a similarly named project in a Guedes Associados/Kelly Guedes account is not an acceptable target.
- Never repeat a secret discovered in Git or migration history. Treat it as compromised, record only the exposure class, and rotate/revoke through an explicitly authorized containment task.
- Remote row estimates are discovery signals, not backup evidence. Destructive cleanup requires an export/snapshot and an explicit data-disposition decision.
- `CREATE TABLE IF NOT EXISTS` is not schema reconciliation: it can silently preserve wrong constraints, grants and indexes on an existing table.

## APT-001 completion record — 2026-08-11

- Local repository initialized on `main`; audited baseline commit: `03ce2ab`.
- Secret-pattern scan found no populated Asaas/Supabase key or private key in the tracked candidates.
- `.gitignore` was reduced to one native rule for the Impeccable live directory and now excludes `.node_modules.clean-backup/`.
- Vinext build passed; Node tests passed 7/7.
- Correctness/security review: no ignored secret, dependency tree, build output, operational spreadsheet or preview entered the index.
- `ponytail-review`: Lean already. Ship.
- Existing whole-repository `ponytail-audit` reused; not rerun because no product architecture or dependency changed.

## APT-002 completion record — 2026-08-11

- User confirmed Vercel Next + npm; D-008 and D-009 are closed.
- `dev`, `build`, `start` and `test` now use native Next/npm commands; the custom Vercel build override was deleted.
- `pnpm-lock.yaml` and `pnpm-workspace.yaml` were deleted; `package-lock.json` is canonical and its root matches `package.json`.
- A stale `react-loading-skeleton` lock entry was removed; no application source imported it.
- Next 16.2.6 production builds passed with webpack and with the native Turbopack default; tests passed 7/7.
- First sandboxed build failed only because Google Fonts network access was blocked; the authorized build fetched Poppins and passed.
- Correctness/security review: secrets remain server-only and no remote target, deploy or production key was changed.
- `ponytail-review`: Lean already. Ship.
- Whole-repository `ponytail-audit` refreshed because the canonical runtime and repository structure changed.

## APT-003 completion record — 2026-08-11

- Canonical Supabase target identified: organization `AI`, project `APT TENNIS CLUB`, reference `cjwxqfxrkdgmqbomzhkm`, production branch `main`, region `sa-east-1`.
- The public schema contains 17 APT-related tables. Every table displayed zero estimated rows; Realtime was enabled only for `tennis_form_responses` in the captured table list.
- Supabase shows 10 historical migrations dated from 2025-07-01 through 2025-07-25. Local source contains only `202608070001_apt_hub.sql`, `202608110001_form_versioning.sql` and `202608110002_invite_revocation.sql`; no reconciliation or migration apply has occurred.
- Supabase Security Advisor: 0 errors, 33 warnings and 8 suggestions. Captured warnings include mutable function search paths; always-true RLS write policies on `apt_applications`, `ct_survey_responses` and `tennis_form_responses`; broad public listing on `storage.profile-photos`; and public GraphQL visibility including `apt_applications`, `ct_survey_responses`, `matches` and `points_history`.
- Supabase Performance Advisor: 0 errors, 34 warnings and 16 suggestions. Captured warnings include repeated per-row Auth/RLS initialization on `matches`, `ranking`, `rounds`, `seasons`, `profiles` and `points_history`.
- Canonical Vercel target identified under `gaagustavo-9339's projects`: `apt-tennis-club`, project ID `prj_gnjjgijeXutKy5vZM5Q0nn9hXnx3`, domain `apt-tennis-club.vercel.app`.
- Vercel shows no project environment variables and no production deployment. The failed production attempt `GW7hU8kGL` from 2026-08-08 stopped on the retired `cloudflare:workers` import in `lib/supabase-server.ts`; that import is absent from current local source after APT-002. Six later preview deployments display `Ready`. No variable, deployment, domain or project setting was changed.
- User corrected the durable boundary: continue all browser work in IAB and only in accounts tied to `gaagustavo`.
- Correctness/security review: APT-003 is complete as a read-only discovery task, but the warning counts and exposed objects are production blockers assigned to APT-004; zero advisor errors does not mean the database is secure.
- `ponytail-review`: the target discovery avoided duplicate project creation and did not mix remediation into inspection. No code, dependency or repository structure changed; reuse the latest whole-repository `ponytail-audit`.

## APT-004 completion record — 2026-08-11

- Scope remained read-only. No migration, user, function, policy, grant, secret or deployment was changed.
- Remote truth contains ten July 2025 migrations for a legacy tennis/ranking and public-form system. Local truth contains three August 2026 migrations for the APT Hub, form versioning and invite revocation. The remote history must remain unchanged.
- The eight canonical APT Hub tables already exist remotely with RLS enabled, client API access disabled and no policies. Current application callers use the server-only Supabase secret, so this is the intended permission boundary.
- The canonical core migration is absent from remote history even though its eight tables exist. Applying it blindly would not reconcile existing constraints because it relies on `CREATE TABLE IF NOT EXISTS`; fabricating an applied migration record is prohibited.
- Remote `invites` lacks `revoked_at`, so the local revocation migration is unapplied. The four form-versioning tables are absent, which matches the recommendation to remove that premature feature in APT-013 before any database apply.
- Three legacy intake tables allow unrestricted public insert and select. Legacy ranking/profile tables retain broad policies, a public profile-photo bucket remains listed, and four functions have mutable `search_path`; two functions run as `SECURITY DEFINER`.
- A historical migration embeds an administrative credential and creates its Auth user. The user still exists. The secret was not copied into this Brain or chat and must be treated as permanently compromised. A legacy Auth-user trigger can also create an unwanted profile during current APT registration.
- Local tooling has no Supabase CLI or `supabase/config.toml`; APT-019 must first obtain a canonical schema/grant dump in an isolated, reviewed environment rather than improvising remote history.
- Recovery boundary: record a logical backup/snapshot and current grants/policies before mutation; test forward changes in an isolated branch/project; if validation fails, stop and restore into an isolated target or issue a corrective forward migration. Do not use destructive history rewrites as rollback.
- Approved plan: APT-018 contains the credential and Auth trigger first; APT-013 removes local form CMS scope; APT-019 creates one reviewed forward-only reconciliation for exact core constraints/indexes, invite revocation, explicit grants/default privileges, function execution privileges and approved legacy cleanup. Production application remains separately authorized.
- Correctness/security review: explicit table grants and RLS are treated as independent controls; `PUBLIC` function execution and definer-function `search_path` must be reviewed; user sessions must be revoked before disabling/deleting the compromised account; estimated zero rows do not authorize data deletion.
- `ponytail-review`: do not import ten legacy migrations, add a parallel schema, install dependencies or apply all three local migrations. The smallest correct path is one containment task plus one forward reconciliation after the existing form-versioning deletion. Lean already. Ship.
- Whole-repository `ponytail-audit` was not repeated because this cycle changed execution memory only; the latest structural audit remains current.

## APT-021 progress record — 2026-08-11

- Source workbook reconciled visually and structurally: 53 athletes total, 35 active, 17 inactive and one status to review. All 35 active athletes have e-mail, 34 have phone and none has CPF.
- Prepared import CSV contains only the 35 active names, normalized e-mails, phone numbers and `ATIVO` status. It contains no CPF, payment or inactive-athlete data and passes the same parser with 35 accepted and zero rejected rows.
- The management import performs a preview, normalizes and deduplicates by e-mail, requires an admin session, imports no CPF/card field and generates a new seven-day individual token stored only as SHA-256. Previous unused member invitations are revoked.
- Existing-athlete onboarding reuses `/cadastro?convite=...`; it does not create fake applications. The e-mail from the invite is locked, contact data may be corrected, CPF is validated and only its keyed hash and last four digits persist.
- `ASAAS_MONTHLY_VALUE` has no fallback price. The recadastro displays the configured BRL amount and keeps the checkout button disabled until management explicitly configures a positive value.
- The checkout remains hosted by Asaas with `RECURRENT` and `MONTHLY`. A conditional database claim prevents two simultaneous attempts; inconclusive calls stop automatic retry; a returned checkout is cancelled if its local persistence fails.
- Webhooks now persist an unprocessed event before reconciliation, query current payment/subscription truth from Asaas, require existing member/subscription rows, update lifecycle state, and mark the event processed only after success. Duplicate processed events return without a second business effect.
- No new package or alternate onboarding system was added. New source is one shared CSV normalizer, one admin import endpoint, one additive local migration and the extensions to the existing management/registration/webhook surfaces.
- Verification: prepared CSV 35 accepted/zero rejected; 10/10 focused tests passed; TypeScript passed; Next 16.2.6 production build passed after providing the bundled Node runtime and network access for Poppins. Local IAB rendered `/cadastro`; invalid-token state and card-boundary copy were present. A valid invite/admin import view cannot be verified until the migration and an authenticated non-production target exist.
- Correctness/security review: no populated secret was introduced; raw tokens are returned only once; CSV export neutralizes spreadsheet-formula prefixes; CPF is transient in the request and not logged or persisted raw; the import route is admin-only and capped; production mutation and real charging remain disabled.
- `ponytail-review`: reuse of members, invites, `/cadastro`, subscriptions and webhook tables avoids a second onboarding domain. The CSV importer is justified only for the current roster and must be deleted after successful import/export. No new dependency is justified. Lean enough to verify; do not ship before the external gates.
- Whole-repository `ponytail-audit` refreshed because a route, shared helper and migration were added. Existing deletion candidates remain; the only new debt is the explicitly temporary roster importer.
- Production webhook preparation: the correct Vercel project received a newly rotated `ASAAS_WEBHOOK_TOKEN` as a Sensitive, Production-only variable. The Asaas account at `apttennisexclusive@gmail.com` had no existing webhook; an inactive `APT Tennis Club - Produção` webhook is now saved for `https://apt-tennis-club.vercel.app/api/webhooks/asaas`, using API v3, sequential delivery and only the nine payment events currently handled by the route. It is disabled with zero penalized events. Earlier candidate tokens were discarded before Asaas persistence; only the final value exists in Vercel and the saved Asaas webhook. No API key or charge was created.
- Correctness/security review: the webhook was not activated against a `404` target; its token is separate from the Asaas API key, limited to Production in Vercel and absent from repository/chat/Brain; subscriptions and unrelated event families were not selected. `ponytail-review`: no new code, dependency or abstraction. Lean already. Ship after deployment and signed-event verification. The whole-repository `ponytail-audit` was reused because no repository structure or dependency changed.

## APT-007 progress record — 2026-08-11

- User selected the operational-management panel as the first app-surface task. Scope was restricted to the existing management queue and existing `applications`, `admin_notes`, `invites` and `audit_logs` tables; no migration, billing call, new dependency or separate management domain was added.
- An administrator can open a single application and read its saved answers, profession, delivery status and chronological internal notes. The list continues to expose only the summary fields needed for queue triage.
- Management can record an internal note, reject, approve/generate an invite, or set `awaiting_info`. The latter requires a note and the UI explicitly says that the team must still make the actual contact; it does not fabricate email, WhatsApp or delivery evidence.
- Admin-only handlers validate the application UUID, the allowed state and note length. The detailed response and note body remain behind `requireAdmin`. Supabase read errors now surface as errors instead of an empty queue. An information-request note is persisted before its visible status change, so the queue cannot imply a request without internal context.
- Verification: TypeScript `--noEmit` passed; 11/11 focused tests passed, including the application-review boundary test; production Next build passed. The first sandbox build was blocked solely by the external Google Fonts request; the authorized rerun passed. No full authenticated visual/integration proof exists because there is no approved non-production Supabase target with an administrator and application data. A local dev process already held port 3000 and the integrated browser could not complete a second local navigation in this environment; no browser result is represented as verification.
- Correctness/security review: no client role receives answers or notes, no untrusted status bypasses the server allow-list, no access token/secret/card/CPF handling was added, and the UI no longer turns a data outage into “no applications”. Approval keeps the existing hashed-invite and Resend boundary; its real delivery remains an external gate.
- `ponytail-review`: Lean already. Ship. The new detail component is one concrete screen, notes reuse an existing table, browser formatting uses native `Intl.DateTimeFormat`, and the focused test is the minimum check. The whole-repository `ponytail-audit` was reused because there was no dependency, runtime or structural change.

## APT-008 progress record — 2026-08-11

- User selected Tweener as the first member-area priority and supplied the canonical APT Tweener group plus WhatsApp community invite.
- The active-member portal now resolves those two links as safe defaults when a member has no individual database override. They are returned only after member authentication and only when `accessActive` is true; unpaid, inactive and public visitors receive neither link.
- The links sit together in one `Acessos rápidos` section: `Cadastro no Tweener` invites the member to complete the club migration, and `Comunidade APT no WhatsApp` opens the operational group. The duplicate header shortcut was removed.
- Scope deliberately excludes writing the links into all existing members, calling Tweener/WhatsApp, changing the external groups, or creating a parallel integration. Existing `members.twinner_url` and `members.whatsapp_community_url` remain the future per-member override boundary.
- Management now uses phone-first member cards with a full-width `Gerenciar integrante` action, then renders the existing information-dense table only at `48rem` and above. The selected member opens a native, labelled form with visible inline errors and no modal or new UI dependency. Courtesy is visually marked as access-enabled in both layouts.
- `PATCH /api/membros` is admin-only and validates UUID, HTTPS and exact allowed hosts (`*.tweener.club` and `chat.whatsapp.com`). It accepts only `pending_payment`, `courtesy` and `inactive`; `active` and `delinquent` remain owned by the financial flow. It writes an `audit_logs` event that names changed fields but not URL contents. Courtesy is a deliberate active-access exception; inactive remains inactive even if an old subscription is overdue.
- Verification: TypeScript `--noEmit` passed; 13/13 focused tests passed, including the new member-management boundary contract and active-only Tweener/community contract; Next 16.2.6 production build passed. Build retains the pre-existing `metadataBase` warning. The system-design artifact was rendered and visually inspected at `APT_MEMBER_ACCESS_SYSTEM_DESIGN.docx`. Authenticated portal visual/integration proof remains pending because the approved Supabase environment has no isolated test member session/data for this flow.
- Correctness/security review: the URLs are not public, no credential, card, CPF or payment action was introduced, input errors stay server-enforced, and external links retain `target="_blank"` plus `rel="noreferrer"`. The member update and audit insertion are currently two REST writes, so the first integration test must inspect both records; a future transaction/RPC remains a recorded reliability decision rather than unreviewed scope expansion.
- `ponytail-review`: Lean already. Ship. The implementation reuses the existing route, member fields, audit table, CSS system and responsive table; no integration client, new table, dependency, configuration framework or modal was justified. The whole-repository `ponytail-audit` was reused because no dependency, runtime or structural change occurred.
- Deployment/configuration follow-up: `apttennisexclusive@gmail.com` already existed as a confirmed Supabase Auth user (last sign-in recorded by Supabase), so no duplicate account or invite was created. It is now allowlisted through Vercel `APT_ADMIN_EMAILS` for Preview and Production. Vercel Preview `dpl_7oyfxATeji7xzfadUef6wg1LRSMA` is Ready and `/entrar` visibly renders email/password controls. The actual password-authenticated management flow remains unproven.
- Domain/auth configuration: `apttennis.com.br` and `www.apttennis.com.br` are attached in Vercel. Vercel redirects the apex permanently to the `www` hostname; Supabase `SITE_URL` is now `https://www.apttennis.com.br`. On 2026-08-12 the owner authorized and activated Registro.br Advanced DNS, but its zone editor is in its mandatory transition window until approximately 12:08 BRT; it shows no existing records and rejects additions until that period ends. Resume by inserting `A apttennis.com.br -> 216.198.79.1` and `CNAME www.apttennis.com.br -> 66ecfb2fb3faf43f.vercel-dns-017.com.` then save once. Do not send a password-recovery email until propagation is confirmed. The historic Supabase redirect allowlist still contains 20 unrelated Lovable URLs; retain this as an APT-018 containment item rather than deleting unreviewed URLs during domain setup.
- Publication boundary: this Vercel project was deployed using `vercel deploy`, while the current local Git worktree has no remote. The refreshed Preview therefore carries current Vercel settings but not the uncommitted local member-management code. Connect the source explicitly before treating a deployed app as current.
- Source-publication follow-up (2026-08-12): the authorized GitHub account `raiidmusic` owns the private repository `apt-tennis-club`. The local audited state was pushed to `main` through `2d6e6a9`, including `b8dfa42` (`feat: complete operational member management`), and `origin` points to that private repository. The Vercel project is now connected to `raiiidmusic/apt-tennis-club`; its next `main` push triggers the first source-backed production deployment. A temporary repository-scoped read/write deploy key was used only for this push, then deleted from GitHub and the local temporary directory.
- Credential correction (2026-08-12): the first fine-grained token was scoped correctly (one repository, Contents read/write, seven-day expiry) but was accidentally exposed in an automation response before use. It was immediately deleted in GitHub and never used; no credential value was persisted in the repository, Vercel, Brain or local configuration. Publication was completed without a personal access token through the short-lived repository deploy key above.
- Source-backed deployment verification (2026-08-12): Vercel initially blocked `7e6222c` because its commit e-mail did not map to a GitHub account. Repository-local Git authorship now uses the verified `raiiidmusic` no-reply address; the content-identical trigger commit `33a9526` was accepted and the Vercel production hostname now returns the Next application. A temporary repository-scoped deploy key was deleted from GitHub and the local temporary directory immediately after that push. Public landing, `/entrar` and `/gestao` were browser-verified on the Vercel hostname. The administration page now renders an access-verification state before it can render the management shell, preventing unauthenticated visitors from seeing even its operational placeholders. TypeScript, the production webpack build and 14/14 focused tests passed; `metadataBase` is configured. The pre-existing lint baseline remains tracked separately.
- Supabase runtime preparation (2026-08-12): `SUPABASE_URL` and the selected project publishable key are now Vercel Sensitive variables for Production and Preview. Public password authentication is deliberately separated from server-only database operations, so the allowlisted master administrator can be verified without adding a server key. A legacy service-role credential was exposed during configuration inspection and must be treated as compromised; do not add it to Vercel, local files, chat or any deployment. APT-018 must revoke/rotate the legacy credential and Auth automation with its pre-change backup and session-revocation gate before any data mutation, athlete import or real billing.
- Official password recovery (2026-08-12): the member login now links to `/recuperar-senha`; `/redefinir-senha` consumes only the single-use Supabase recovery token and sets a minimum-eight-character password through the public Auth boundary. No server key, card or CPF is involved. Supabase `SITE_URL` and the explicit redirect allowlist both contain `https://www.apttennis.com.br/redefinir-senha`; Vercel has `APT_PUBLIC_URL` for Production and Preview. TypeScript, 15/15 focused tests and the Webpack production build pass. Registro.br now serves the Vercel apex and `www` records, Vercel shows the custom domain in Production, HTTPS returns 200 for `www` and apex returns 308 to `www`. A password-recovery e-mail was sent from Supabase to `apttennisexclusive@gmail.com` after those checks.
- Canonical paths (2026-08-12): public navigation remains `/` and `/requerimento`; authentication is `/entrar`, recovery is `/recuperar-senha` and `/redefinir-senha`; staff administration is `/gestao`; the member-facing area is `/membros`. `/portal` is retained only as a compatible alias while older links exist. Management is never added to the public menu.
- V1 operations continuation (2026-08-12): management now has one direct, prefilled `wa.me` payment-reminder link per valid member contact plus a sequential reminder queue for the active base. The operator opens, reviews and sends one conversation at a time; the system does not claim or simulate automatic WhatsApp delivery. The feature reuses the existing admin-only member response and adds no provider, table, secret or stored message. Full focused suite passed 15/15, TypeScript passed and the production webpack build passed locally. Authenticated production visual proof remains pending the containment/server-key gate and source publication.
- Recovery correction (2026-08-12): a password-recovery email sent from the Supabase dashboard can use the project Site URL and therefore arrive at `/` rather than the configured app recovery route. The landing now detects only the recovery hash in the holder's browser and replaces the address with `/redefinir-senha` while preserving the fragment; it neither persists nor sends the token to APT. Full focused suite passed 15/15 and TypeScript passed. The recovery link supplied in chat was treated as exposed and is not reused.
- Management passwordless access (2026-08-13, APT-017): `/entrar?next=/gestao` now offers the configured administrator an e-mail magic link. The public Supabase Auth endpoint sends a single-use link with account creation disabled; the landing preserves the fragment only while moving it to `/acesso-gestao`; that page validates the token with Supabase, re-checks the `APT_ADMIN_EMAILS` allowlist and sets the existing HttpOnly session cookie before redirecting to `/gestao`. The route returns the same send acknowledgement for an unlisted address, never uses a server key, never logs/persists the token and cannot grant member access. TypeScript and 10/10 focused checks passed. Commit `2a4ba10` was published to the source-backed Production target and the official login visibly renders the management-link control. First live send returned HTTP 500; a native Supabase dashboard magic link was sent to the master account for authenticated browser proof. The request route logs only its failure class/status, never a token, e-mail body or credential, until the upstream status is corrected. The full local build is blocked only by the sandbox being unable to fetch the pre-existing Google Poppins font.
- Auth cleanup (2026-08-13): by explicit owner instruction, deleted only Auth user `Vinicius` / `vinicius.lopes.albuquerque@gmail.com` (`98409413-3f29-461f-b9d6-05247bfdf2be`) in the canonical Supabase project. Supabase confirmed deletion. `Gabriel Guedes` (`gaagustavo@gmail.com`), the APT master account and all other users were left intact.
- Management-access correction (2026-08-13): Supabase allowed `https://www.apttennis.com.br/redefinir-senha` but not the exact official root URL requested by the passwordless link. Added only `https://www.apttennis.com.br` to the Auth redirect allowlist. The management allowlist now has an in-code fallback limited to the two owner-controlled accounts (`apttennisexclusive@gmail.com` and `gaagustavo@gmail.com`), plus the Vercel variable for future approved administrators; therefore a stale/misread deployment variable cannot lock the owners out. Non-owner e-mails remain denied. Repeated preceding tests hit the Auth e-mail send rate limit; the application now reports that safe retry instruction instead of a generic failure. No token or credential is logged.
- Magic-link diagnosis (2026-08-13): Supabase Auth logs show the user verified a link successfully at 08:54 BRT, followed by APT completion 403. Completion now emits only `token_validation_failed` or `email_not_authorized` to the Vercel server log and returns the matching safe client message. It never logs an access token, e-mail address, raw response or credential. This is a temporary diagnosis guard inside the existing route, not a new service or storage path.
- Management password access verified (2026-08-13, APT-017): the official Production deployment was redeployed after correcting the public Supabase authentication configuration. The confirmed owner account `apttennisexclusive@gmail.com` completed `POST /api/auth/login` with HTTP 200, then `/api/auth/session` returned the `admin` role with HTTP 200. A real browser session subsequently reached `https://www.apttennis.com.br/gestao` and rendered the `GESTÃO APT` shell. The email magic-link route is no longer required for owner access and is not part of the launch path. The management page currently reports that it cannot load applications because no valid server-only Supabase database credential is configured; do not reuse the previously exposed legacy key. Enabling the operational data panel needs one newly generated, server-only Supabase secret and the APT-018 containment/rotation gate before any production data or billing action.
- Server-secret and checkout callback correction (2026-08-13, APT-022): the owner reports a new `SUPABASE_SECRET_KEY` is saved in Vercel. `lib/supabase-server.ts` now accepts only that server-only key as `apikey`; it refuses the exposed legacy service-role variable entirely. The recadastro screen now renders Asaas success, cancellation and expiry callbacks instead of interpreting them as invalid invitations. Dynamic form/versioning support and its unreferenced duplicate client file were deleted because the one approved public form already has `applications.answers` as its canonical record. Member and management areas now include a server-cleared logout control. The remote Google-font build dependency was removed, so production build no longer requires an external font fetch. Local proof: 19/19 focused tests and TypeScript pass; lint has 0 errors and 20 non-blocking image-optimization/legacy-script warnings. The sandbox blocks the Next compiler from creating its internal process/port, so the final build must be evidenced by the authorized Vercel target rather than claimed locally. Source deployment and runtime/Sandbox proof remain required.

- Production-schema continuation (2026-08-13, APT-022): in the canonical Supabase project `APT TENNIS CLUB` (`cjwxqfxrkdgmqbomzhkm`), preflight found zero `invites` without an application target. The forward migration for revocable invitations then completed successfully, followed by the imported-member recadastro migration. The editor returned `Success. No rows returned` for both. The database now has nullable pre-recadastro CPF columns, an invite member target with the exactly-one-target constraint, checkout-attempt fields, and retryable webhook-event fields. A public production request to `/api/cadastros?convite=invalid-token` returned the expected `403` invalid/expired-invite response, with no record or billing effect. TypeScript and all 19 focused tests passed locally after the applied schema. No real athlete, CPF, hosted checkout, Asaas event or recurring charge was created. The next proof requires the owner to authenticate in `/gestao`, then a separately approved controlled first-member test using Sandbox before any roster-wide import or live billing.
- Correctness/security review: the applied changes are forward-only and did not alter existing rows; the preflight prevented a newly added one-target rule from invalidating existing invitations. Card information remains outside APT in hosted Asaas Checkout. `ponytail-review`: the existing tables and columns were extended without a new schema or dependency; no structural audit rerun is needed. Git remote fetch is currently blocked by the local machine's missing GitHub SSH authorization, so this execution-memory update has not been published from this worktree.

## APT-007/APT-008 CRM correction — 2026-08-13

- The management Kanban now renders every application as an actionable card. Opening a person loads the existing detailed application record into an accessible right-side CRM drawer, with contact shortcuts, answers, chronological internal notes and the current stage visible together.
- Management can move a lead back to `new`, place it in review, request information with a required note, reject it, or explicitly approve and generate the individual registration invitation. A manual invitation link returned by the existing approval boundary can be copied immediately. Only a registered application is locked from further pipeline manipulation.
- Member management no longer changes interaction model between mobile and desktop: every member is a card and opens the same CRM drawer pattern. The drawer includes participation and club-access controls, internal notes, direct WhatsApp/payment-reminder actions, subscription summary and payment history. Statuses and dates are translated into operational Portuguese instead of exposing backend codes.
- `GET /api/membros?id=...` reuses the canonical member, subscription, payment and `admin_notes` records and runs only when the operator opens a card. `PATCH /api/membros` now accepts a bounded internal note and records the existing audit event. No card, CPF or hosted-checkout boundary changed.
- Controlled UI polish was applied across the public, member and management surfaces with existing tokens and components: deliberate route/content/drawer transitions, clearer focus/invalid states, branded loading states and reduced-motion support. No shimmer, gradient text, multi-word hero rotation, dependency, schema or parallel CRM was introduced.
- Verification: TypeScript `--noEmit` passed; all 19 focused tests passed; lint reports zero errors and the same 20 non-blocking image/legacy-script warnings; the Next 16.2.6 Turbopack production build compiled, typechecked and generated all 24 pages successfully. The first sandbox build failed only because Turbopack could not bind its internal process port; the authorized build outside that restriction passed.
- Correctness/security review: every detailed application/member read and write remains admin-only; status and note inputs are allowlisted and bounded; URLs retain their approved host validation; WhatsApp actions only open a prefilled conversation and never claim automatic delivery; financial history is read-only and card data remains hosted by Asaas.
- `ponytail-review`: Lean enough. The correction extends the two existing detail flows and canonical tables, loads expensive detail on demand and adds no package, generic framework, duplicate model or migration. The latest whole-repository `ponytail-audit` remains current because repository structure and dependencies did not change. Authenticated production visual verification remains a deployment/session gate and is not represented by the passing build.

## V1 source publication — 2026-08-14

- The final CRM/member-card source commit `f7b4329` (`feat: deliver operational crm and member cards`) was published to `raiidmusic/apt-tennis-club` `main` through the authenticated GitHub Desktop client. The remote `main` SHA was read back and matches `f7b4329`; the local branch has no pending source changes relative to `origin/main`.
- Vercel reported a successful deployment for that commit. The official host `https://www.apttennis.com.br/` and `https://www.apttennis.com.br/gestao` each returned HTTPS 200 from Vercel after the deployment. This proves source publication, platform deployment and hostname routing; authenticated visual verification of the management workflow remains a separate launch check.

## Production Auth signup correction — 2026-08-14

- A controlled invited registration reached Supabase Auth after the CPF secret deployment and returned `Database error creating new user`. Auth logs identified the exact database cause on `POST /admin/users`: legacy trigger `on_auth_user_created` called `public.handle_new_user`, whose unqualified `user_status` cast failed in the Auth execution context and aborted the transaction.
- The current APT registration route owns member creation in canonical `public.members`; no application code reads or writes the legacy `public.profiles` automation. Production migration `20260814193323_remove_legacy_auth_trigger` therefore removed only that custom trigger and its sole function. It did not delete users, profiles or any table row. Read-back confirms zero custom triggers on `auth.users` and zero remaining `public.handle_new_user` functions.
- The failed attempt created no Auth user, hosted checkout or recurring charge. Database reconciliation reports zero inconclusive checkout attempts and zero configured checkouts. The invitation remains available for the owner-controlled retry; that retry is the remaining end-to-end Auth/Asaas proof and must be completed by the owner because it can create a real recurring checkout.
- Verification: Supabase recorded the migration; 20/20 focused tests pass; TypeScript passes; lint has zero errors and 20 existing non-blocking image/legacy-script warnings; the Next 16.2.6 production build compiled, typechecked and generated all 24 pages. Security and performance advisors were rerun. The canonical APT Hub tables remain intentionally server-only with RLS and no client policies; unrelated legacy-table exposure/search-path warnings remain scoped to APT-019 rather than being changed speculatively during an Auth incident.
- Correctness/security review: removing the obsolete shared Auth side effect fixes every Auth-user creation caller at the root without weakening validation or RLS. Existing legacy profile rows were preserved. `ponytail-review`: lean; one obsolete trigger/function removal is smaller and safer than repairing enum casts and continuing to duplicate users into an unused model. The whole-repository `ponytail-audit` was not repeated because dependencies and application structure did not change.

## Production recurring Checkout correction — 2026-08-14

- Production registration reached Asaas after the Auth correction, but Checkout rejected the partial `customerData` payload with `O campo address deve ser informado`.
- Asaas documents three customer-data modes: complete `customerData`, a previously created `customer` ID, or omitting both so hosted Checkout collects the complete payer data. APT now uses the third mode.
- `app/api/cadastros/route.ts` no longer sends partial payer data to `/checkouts`. Hosted Asaas collects address and confirms payer data together with the card; APT continues to store neither address nor card data.
- The registration screen now tells the member that address and card are entered only in Asaas. A focused regression check prevents partial `customerData` from returning.
- Deterministic-rejection recovery remains intact: `checkout_attempted_at` is cleared after an Asaas 4xx response, so the same invitation can safely retry without creating another member or Auth user.
- Verification: 21/21 focused tests pass; TypeScript passes; lint has zero errors and the same 20 non-blocking warnings; the Next 16.2.6 production build compiled, typechecked and generated all 24 pages. The first two build attempts were environment-only failures (sandbox port restriction, then missing child-process PATH); the same build passed with the bundled Node runtime available to Turbopack workers.
- Source commit `a4e6697` was published to `origin/main`. The official `https://www.apttennis.com.br/cadastro` HTML then rendered the new hosted-boundary copy, proving the corrected source-backed deployment is live; a real Checkout remains deliberately unexecuted by the agent.
- Remaining production proof: the owner must retry the existing invitation and personally complete hosted Checkout because that action can create a real recurring charge.
- `ponytail-review`: Lean already. Removing one optional payload object uses provider-hosted data collection and avoids new address fields, CEP lookup, schema storage and privacy surface. The whole-repository audit was not repeated because no structure or dependency changed.

## APT-022 member, finance and management completion — 2026-08-14

- The member portal now performs one explicit Asaas reconciliation when local financial state is incomplete and exposes a manual refresh; it does not continuously poll. Reconciliation locates the subscription by its saved provider ID or member `externalReference`, falls back from a paid hosted Checkout to its saved `asaas_checkout_id` and `checkoutSession`, imports the provider payment history idempotently and updates access only from confirmed provider payment states.
- Checkout webhook handling now recognizes the documented `CHECKOUT_*` family, resolves a checkout that omits `externalReference` through the canonical local subscription row, preserves event idempotency and leaves an unprocessed failure for provider retry instead of falsely activating a member.
- The mobile-first member area now includes current status, amount, next due date, latest payment, history/invoice links, explicit synchronization, protected-card explanation, safe card-change request, editable name/WhatsApp, password recovery, cancellation, Tweener and community shortcuts. Card number, validity, CVV, holder data and reusable card tokens remain outside APT/Supabase.
- Management now has compact search/status filters, payment-reminder queue, full member cards, a detailed CRM drawer with contact actions, notes, club-link controls, financial history and an explicit authenticated `Atualizar no Asaas` action. A desktop grid min-size correction prevents the summary and Kanban container from escaping the available management viewport.
- Visual direction reused the existing APT typography, clay accent, navy rail, tokens and native motion. The Cruip React reference informed only density/hierarchy. The proposed Lenis/shadcn/Tailwind smooth-scroll component was not copied: APT already has native smooth scrolling plus `prefers-reduced-motion`, the full-screen sticky demo conflicts with operational forms/CRM and the latest ponytail audit already marks the unused Tailwind toolchain for deletion.
- Verification: all 23 focused tests pass; TypeScript passes; lint has zero errors and the same 20 non-blocking image/legacy-script warnings; Next 16.2.6 Turbopack compiled, typechecked and generated all 24 pages. Impeccable type/layout detection returned no finding for the changed TSX/CSS.
- Browser verification used an isolated temporary Dia session with intercepted local fixtures only: the 390x844 member portal had no horizontal overflow and visibly exposed the monthly amount, Tweener, community, payment and profile flows; the 1440x1000 management shell fit its complete signal strip, rendered the Kanban, opened the full member CRM drawer, exposed notes/contact/reconciliation actions and had no document overflow. No fixture touched Supabase or Asaas.
- Correctness/security review: all reconciliation triggers require an authenticated member or administrator except the separately token-authenticated webhook; the webhook authenticates its dedicated Asaas token and persists event idempotency; member profile edits are bounded; management controls remain admin-only; the browser never handles the Asaas secret; card replacement does not collect card data. The official Asaas documentation confirms `externalReference`, `subscription` and `checkoutSession` as reconciliation filters and recommends webhooks rather than continuous polling.
- `ponytail-review`: lean. Two small shared billing helpers centralize provider status and reconciliation used by portal, management and webhook; no package, schema, UI kit, native ranking, second CRM, polling service or card surface was added. The latest whole-repository `ponytail-audit` remains current because dependencies and repository structure did not change.
- Release status remains `IN_PROGRESS` until this exact commit is published, the resulting production deployment is identified and an authenticated production session confirms the real Supabase/Asaas state. A local fixture and a successful build are not live billing proof.

## Next decision

Close this billing-reconciliation cycle. In a future owner-authorized task, resume the remaining V1 gates from the queue; keep UI/design refinements separate as explicitly requested. Before inviting the full roster, verify one signed production webhook event and its duplicate delivery without a second business effect.

## APT-022 production billing correction — 2026-08-14

- Production source commit `0dd61f9` is visible on the official `/membros` route. In the controlled member session, the Asaas hosted Checkout displayed a confirmed payment, but the portal's explicit `Atualizar situação` action still returned no local payment and kept access pending.
- The end-to-end trace isolated the mismatch: the registration flow persisted `subscriptions.asaas_checkout_id`, while manual reconciliation selected neither that column nor its `checkoutSession` filter. It could therefore miss a paid Checkout before a provider subscription ID or member `externalReference` became discoverable.
- The smallest correction selects the already persisted `asaas_checkout_id` and uses it as the payment lookup fallback. No schema, dependency, polling, card surface or duplicate billing path was added. Production publication and a second controlled refresh are required before this correction is `LIVE`.
- Owner verification in the Asaas dashboard confirms the controlled card payment is `CONFIRMED` and already charged, while provider settlement is not yet `RECEIVED`. APT intentionally treats both `CONFIRMED` and `RECEIVED` as paid access states; settlement timing must never delay member access.
- The first production correction (`42f03d9`) proved that the saved Checkout identifier alone was not enough for this recurring Checkout: the provider payment was visibly confirmed and linked to an Asaas subscription, but the `checkoutSession` lookup still returned no canonical payment and no webhook event had reached `webhook_events`.
- The follow-up keeps exact-identifier reconciliation and adds the provider-documented `externalReference` fallback when the Checkout filter returns no charge. It does not match by name, amount, e-mail or date.
- A signed `CHECKOUT_PAID` event now activates access even when the provider has not yet exposed the generated payment/subscription through list endpoints, but only after the event Checkout ID exactly matches the member's stored `asaas_checkout_id`. This provider-confirmed access fallback also preserves the existing webhook idempotency record; it never treats the success redirect as proof of payment.
- Local verification for the follow-up: 23/23 focused tests pass, lint has zero errors and the same 20 pre-existing warnings, `git diff --check` passes, and the Next 16.2.6 production build compiles, typechecks and generates all 24 routes. Publication and the controlled production refresh remain required before marking the payment/access flow `LIVE`.
- Correctness/security review: both reconciliation paths use provider identifiers that originate from the canonical member/subscription record; the webhook fallback additionally requires the dedicated token and an exact local Checkout ownership match. `ponytail-review`: lean; one fallback query and one verified webhook state transition, with no dependency, schema, polling job or manual amount-based approval. The whole-repository audit remains current because structure and dependencies did not change.
- The remaining production mismatch is now explained by identity, not payment state: the controlled Asaas Checkout used a payer e-mail different from the authenticated APT member e-mail. The CPF and exact provider invoice identify the same controlled payment, but name, amount, date and e-mail are deliberately not used as automatic ownership rules.
- The final recovery path accepts an exact `asaas_payment_id` already attached to that member's canonical local payment row, retrieves `/payments/{id}` from Asaas and only then applies the provider status. It also reuses an already known provider customer to locate the subscription. This permits a one-time administrative link for the controlled historical Checkout without weakening future automatic reconciliation.
- Future `CHECKOUT_PAID` deliveries now preserve `checkout.customer` on the exact local subscription whose saved Checkout ID matched the signed event. This keeps subsequent subscription/payment lookups deterministic even when the Checkout was paid with a different contact e-mail.
- Security boundary: the one-time recovery row must start as `RECONCILING`; inserting the provider reference is not payment approval. The member becomes active only after the production server retrieves that exact payment from the configured Asaas account and observes a paid state such as `CONFIRMED` or `RECEIVED`. No card data, broad customer search or manual status override is allowed.
- Local verification for this final path: 23/23 focused tests pass, lint has zero errors and the same 20 pre-existing warnings, and the Next 16.2.6 production build compiles, typechecks and generates all 24 routes. `ponytail-review`: lean; two exact-identifier fallbacks reuse the existing reconciliation helper and webhook table, with no schema, dependency, polling job or parallel billing state.
- Production proof completed: commit `a4fcadc` was pushed to `origin/main` and Vercel deployment `47DchCAumJ5ZSqaz93pFejJS3Bos` reached `Ready` from that exact Git commit. The controlled historical payment reference was inserted only as `RECONCILING`; an authenticated production refresh then retrieved the exact payment from Asaas and changed it to `CONFIRMED` without a manual access override.
- Canonical state after provider verification: member `active`, subscription `active`, provider customer and subscription identifiers present, next due date `2026-09-14`, payment value 2290 cents, payment due date `2026-08-14` and provider paid timestamp present. The member portal visibly reports `Mensalidade em dia`, `Pago`, automatic renewal and the next date.
- Authenticated browser proof on the official `/membros` route confirms both protected shortcuts are now links: the canonical Tweener group and the canonical APT WhatsApp community. The Payments view shows one R$ 22,90 charge with a hosted Asaas invoice link; the APT UI still never receives card number, validity or CVV.
- APT-022 billing reconciliation for the controlled member is `LIVE`. UI/design refinements are explicitly deferred by the owner to a future work cycle; do not continue design tasks in this cycle.

## Community recadastro release — 2026-08-14

- The owner authorized one private reusable link for the current community. Production received one expiring, revocable group-link record whose plaintext token is never stored: only its SHA-256 hash is persisted in the server-only `group_registration_links` table. Client roles have no table grant and RLS is enabled.
- The active-roster source was reconciled without inventing data. The new workbook contains 37 names but masks all e-mails and phones; the previously validated CSV supplied 35 real contact rows and those rows now exist in the canonical `members` table. The two workbook-only names remain unmatched and therefore use quick CRM approval.
- Direct recadastro requires exact normalized e-mail and WhatsApp to match the same pending member row. It creates a fresh single-use 24-hour individual invitation and then reuses the existing CPF, Auth and hosted Asaas Checkout flow. It does not rewrite roster identity from untrusted form input. A registered account is sent to login.
- Anyone not matching the roster submits only name, e-mail, WhatsApp and consent. One `in_review` application appears in the existing CRM with a visible quick-approval label; CPF, password and payment are not requested before approval. Normal public applications remain unchanged.
- Correctness/security review: invalid, expired and revoked group tokens fail server-side; name/e-mail/phone inputs are bounded; exact dual-contact matching prevents a single leaked contact from claiming a roster slot; duplicate pending applications are suppressed by e-mail; audit failure cannot turn a persisted quick application into a false client failure; card data remains entirely hosted by Asaas.
- Local verification: TypeScript passes; 25/25 focused tests pass; lint has zero errors and the same 20 pre-existing image/legacy-generator warnings; `git diff --check` passes; Next 16.2.6 compiled, typechecked and generated all 24 routes.
- `ponytail-review`: lean. The solution reuses `/cadastro`, canonical members/applications/invites, the existing CRM and hosted Checkout. The one new table is limited to the reusable token lifecycle; no second CRM, roster model, billing flow, UI kit, dependency or card surface was added.
- Refreshed whole-repository `ponytail-audit` after the schema addition: the previous ranked deletion candidates remain unchanged. The CSV import surface is now eligible for later deletion because the audited roster has been imported, but removing an operator surface is not mixed into this launch change. `delete:` retired design generator, D1/Drizzle, Vinext/Cloudflare, unused header Auth, unused Tailwind and unreferenced assets; `delete after use:` roster import surface. Net opportunity remains approximately -1,340 source lines, -11 direct dependencies and 9 assets. The group-link table is not an abstraction candidate because revocation and expiry are required launch controls.
- Production publication, exact deployment identification and non-mutating visual verification of the distributed URL remain the final gates for this release increment.

## APT-022 transactional Resend automation — authorized 2026-08-15

- The owner authorized the operational e-mail layer for management and members. This increment reuses the existing Resend server variables, canonical application/member/subscription/payment records and the authenticated Asaas webhook; it does not add a provider, database table, bulk campaign, card-data surface or scheduled collection.
- Required transactional notifications: management receives a new public or quick-recadastro request, a member registration that created a hosted Checkout, a card-change request, a cancellation and a newly confirmed or attention-required provider payment. The applicant/member receives request receipt, approval/private invitation, rejection, registration/hosted-checkout continuation and confirmed or attention-required payment status.
- Notification is best effort only after the canonical business write succeeds. A Resend failure may never reject a valid application, registration, cancellation or verified payment. Every send uses a deterministic, recipient-specific idempotency key; repeated Asaas deliveries must not send a second confirmed-payment e-mail.
- Non-goals: password recovery and management magic links stay in Supabase Auth; no scheduled dunning/reminder cadence is created without a separately chosen sending rule; no actual e-mail is sent by development checks. Resend must have a verified sender domain and the three existing production variables before a controlled live send can be claimed.
- Acceptance: a focused check proves every supported event is wired to the shared server-only sender, source contains no API key/card/CPF in mail content, typecheck/lint/build pass, and a controlled production send is verified only after the management recipient and sender domain are confirmed.

### Progress — CODED, CHECKED

- `lib/apt-email.ts` is the only Resend sender. It uses the server-only `RESEND_API_KEY`, verified `APT_RESEND_FROM_EMAIL` and management `APT_APPLICATION_TO_EMAIL` variable, falling back to the already-configured `APT_ADMIN_EMAILS` allowlist when no dedicated notification recipient exists. It adds the required explicit HTTP user agent, filters recipient lists and gives each recipient/event a deterministic Resend idempotency key. No SDK, queue, new environment variable or database table was added.
- Public applications now alert management and acknowledge the applicant. Quick recadastro alerts management; approval sends the private invite only after the application is saved; rejection informs the applicant. A completed registration alerts both sides only after the member, subscription, invitation and audit records are persisted.
- Member actions notify management for card-change requests and both sides for confirmed cancellations. The authenticated Asaas webhook notifies both sides only on a payment transition: `CONFIRMED` unlocks access and sends one confirmation; `RECEIVED` does not repeat it. New failure/refund/risk states send one attention notification. The failure-status mapping now includes documented card risk/capture refusal states.
- Correctness/security review: notification failure is best effort and cannot reject a valid business event; payment notifications compare the previous persisted provider status before sending; no e-mail includes a secret, CPF value, PAN, CVV, expiry or card token; signup/recovery remains owned by Supabase Auth. Resend sends occur only after canonical database state is written.
- Verification: new focused e-mail boundary test plus the full suite pass 27/27; TypeScript passes; `git diff --check` passes; lint has zero errors and the same 20 pre-existing image/legacy-script warnings; Next 16.2.6 production build compiled, typechecked and generated all 24 routes.
- `ponytail-review`: Lean. One native-fetch helper replaces two existing direct senders and is reused across existing routes. A provider SDK, template framework, worker, queue, new table, scheduled campaign and duplicate notification service were not justified. The existing whole-repository audit is reused because no dependency or structural change occurred.
- Production configuration and proof 2026-08-15: Resend verified `apttennis.com.br` with DKIM, SPF and MX records. The canonical Vercel Production environment now has a domain-scoped, sending-only `RESEND_API_KEY` and `APT_RESEND_FROM_EMAIL` set to the verified APT sender; the pre-rotation key and its Vercel value were revoked after exposure. No dedicated management-recipient variable is needed because the existing `APT_ADMIN_EMAILS` allowlist is the intentional fallback.
- Live integration proof 2026-08-15: Production deployment `GBgK4APoL4mCqtgdxCF9huCqBLW5` is Ready on source commit `478d111`. One clearly labelled, non-billing technical application produced two Resend `POST /emails` responses with HTTP 200: the member acknowledgement (`application_receipt`) and management notification (`application_management`) to the configured management inbox. Both used `APT Tennis Club <contato@apttennis.com.br>` and the APT user agent. The test created no Asaas checkout, subscription or charge.

## APT-022 transactional e-mail presentation — authorized 2026-08-15

- The owner authorized a deliberately restrained official APT template for every existing Resend transactional flow. It reuses the one server-only sender, existing plain-text message content, verified public origin and approved product palette; no campaign tool, component library, image host, new variable or per-route template was introduced.
- `lib/apt-email.ts` now sends both plain text and an accessible responsive-safe table e-mail: official light lockup over deep navy, one clay rule, mineral background, readable copy, automatic safe links for existing URLs and a restrained APT footer. The plain-text part remains the fallback for clients that do not render HTML.
- Correctness/security review: all variable subject/body/link text is HTML-escaped before rendering; e-mail URLs are escaped before entering `href`; the image comes only from the configured public APT origin; no key, CPF, card number, CVV, payment token or new client-side surface was added. Resend delivery remains best effort after the canonical business write.
- Verification: focused transactional e-mail checks and TypeScript pass; the optimized Next production build passes; `git diff --check` passes. `ponytail-review`: Lean already. The shared sender was the one correct integration point; a template provider, MJML build step, React e-mail package, CMS and duplicated per-flow markup were not justified. The existing whole-repository audit remains current because no dependency or structural change occurred.
- Live proof 2026-08-15: source commit `9e8e7c2` was pushed to `origin/main`; GitHub reported the linked Vercel deployment as successful and the official domain returned HTTP 200. One clearly marked technical application (`5e647859-ca3a-4d9f-9c49-a5365722504b`) then completed in Production with audit recording and `emailStatus: sent`; it creates neither an Asaas checkout, subscription nor charge. The shared helper executed the member receipt and management notification paths using the new HTML template; provider acceptance is surfaced by the current endpoint for the management notification.
- Mobile and dark-mode refinement — authorized 2026-08-15: the same e-mail markup declares light/dark support, supplies compatible dark selectors (including Outlook's `data-ogsc` variant) and reduces shell/content spacing and title scale below 600px. Client-selected dark mode is respected where the e-mail client supports it; the message never asks the member to change an app setting or receives a separate duplicated campaign.
