# APT Brain

Last audited: 2026-08-11  
State: APT-007 and APT-021 in verification; local build complete, external gates pending
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
- member access to payments, community links and Twinner;
- operational management of members and payment states.

Twinner remains responsible for ranking and matches. Supabase is the intended canonical database and identity provider. The APT must not collect full card data or persist plaintext CPF.

## Non-negotiable decisions

| ID | Decision | State | Evidence |
|---|---|---|---|
| D-001 | Supabase is the application database; D1 is not part of the product architecture. | CONFIRMED | `PRODUCT.md`, `README.md`, `lib/supabase-server.ts` |
| D-002 | Asaas hosted checkout owns card entry and recurring billing. | CONFIRMED | `PRODUCT.md`, `lib/asaas.ts`, `app/api/cadastros/route.ts` |
| D-003 | Twinner owns ranking and matches; APT owns membership and billing. | CONFIRMED | `PRODUCT.md` |
| D-004 | Store only CPF hash plus last four digits. | CONFIRMED | `supabase/migrations/202608070001_apt_hub.sql` |
| D-005 | Invitations are hashed, single-use, valid for seven days and earlier replacements must be revoked. | CONFIRMED LOCALLY | migrations and invitation routes; remote state unverified |
| D-006 | Hero rotates one solid word: `competir.`, `evoluir.`, `pertencer.`. No shimmer or gradient text. | CONFIRMED | historical approval and current code |
| D-007 | No fake data, fake buttons or simulated integration may be described as functional. | CONFIRMED | product requirements |
| D-008 | Vercel Next is the canonical deployment runtime. Vinext/Cloudflare files are retired starter architecture scheduled for removal in APT-012. | CONFIRMED | user decision 2026-08-11; successful Next webpack and Turbopack builds |
| D-009 | npm is the canonical package manager; `package-lock.json` is the only lockfile. | CONFIRMED | user decision 2026-08-11; lock root validated against `package.json` |
| D-010 | Keep or remove dynamic form versioning before production. | OPEN, RECOMMEND REMOVE | one static form exists; feature was built before prioritization |
| D-011 | Reconcile the approved five-block landing spec with the larger current landing. | OPEN | current page includes gallery, metrics, Courts, cycle and FAQ |
| D-012 | Payment secrets have separate ownership and values: Asaas generates `ASAAS_API_KEY`; Asaas generates or accepts the webhook `authToken`; APT generates `CPF_HASH_SECRET`. None may be reused, exposed to the browser, committed, logged or stored in application tables. | CONFIRMED | Asaas authentication/webhook docs; Supabase secrets docs; `.env.example` |
| D-013 | APT and Supabase must never receive or store card PAN, expiry, CVV or a reusable card token. Card entry and card changes remain entirely inside hosted Asaas pages. | CONFIRMED | Asaas Checkout and PCI-DSS docs; current checkout flow and schema search |
| D-014 | APT external projects and browser operations must use accounts tied to `gaagustavo`; do not use Guedes Associados/Kelly Guedes accounts. Continue browser work in the Codex in-app browser (IAB), not Chrome. | CONFIRMED | explicit user decision 2026-08-11 |
| D-015 | Preserve the real remote migration history. Reconcile drift with reviewed forward-only migrations; never fabricate, copy or mark historical migrations as applied. | CONFIRMED | APT-004 remote/local reconciliation |
| D-016 | Keep the eight APT Hub tables server-only: RLS enabled, no `anon`/`authenticated` table privileges, explicit `service_role` access. Grants and RLS are separate controls and both must be verified. | CONFIRMED | current callers and remote policy inspection |
| D-017 | A credential embedded in historical SQL is permanently compromised. Containment requires session revocation before account disable/delete, removal of the legacy Auth trigger/function path and rotation of any reused credential. | CONFIRMED | APT-004 migration and Auth inspection |
| D-018 | Existing athletes enter as preloaded members with no CPF, Auth identity or billing record. A hashed individual invite unlocks recadastro; CPF is then stored only as hash plus last four digits and card entry remains in hosted Asaas Checkout. Do not fabricate application answers for imported athletes. | CONFIRMED | explicit user priority 2026-08-11; roster and current-flow audit |
| D-019 | The canonical club access links are the APT Tweener group `dd12bbfd-db69-43a2-b683-cccffc322daf` and the supplied WhatsApp community invite. They appear only to authenticated members with active participation; member-specific database values may override them later. | CONFIRMED | user-provided links 2026-08-11 |

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

Current gate status: policy and runtime owner are locked. The canonical Supabase and Vercel projects are identified under `gaagustavo`. `ASAAS_WEBHOOK_TOKEN` now exists as a Sensitive, Production-only Vercel variable; its value is not recorded here. The matching production Asaas webhook is saved, uses API v3 with sequential delivery, and remains disabled with zero penalized events until deployment and signed-event verification. `ASAAS_API_KEY`, Sandbox credentials and the other required runtime variables remain unconfigured. APT-004 completed the read-only reconciliation plan; no secret value should be pasted into this file or into chat.

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
| Management `/gestao` | CODED, CHECKED; application detail, internal notes and recorded information requests added locally | Authenticated browser proof with a real application; member editing, Twinner/community links |
| Invitation approval | CODED, CHECKED | Applied revocation migration, real email/manual-copy test, retry behavior |
| Private registration `/cadastro` | CODED, CHECKED; imported-member recadastro and checkout-attempt lock added locally | Apply reviewed migration; valid-invite visual check; real Sandbox checkout and failure-path proof |
| Asaas webhook | CODED, CHECKED; provider re-query, retryable event record and lifecycle reconciliation added locally | Real signed Sandbox events and concurrent/timeout evidence |
| Member portal `/portal` | CODED, CHECKED; active-member quick access to the canonical Tweener group and WhatsApp community added locally | Authenticated browser proof; class in profile, logout, reliable paid-through date, real payments |
| Form versioning | CODED LOCALLY | Product need; remote migration; recommendation is to remove until a second form/editor is approved |
| Supabase | Project `APT TENNIS CLUB` (`cjwxqfxrkdgmqbomzhkm`) in organization `AI`, `sa-east-1`; 17 public tables with zero estimated rows; 10 historical migrations; eight APT Hub tables are API-disabled; security advisor 0 errors/33 warnings/8 suggestions; performance advisor 0 errors/34 warnings/16 suggestions | Contain the compromised legacy admin path, remove premature local form versioning, then fold the four local migrations into one validated forward-only reconciliation before any apply |
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

Tracked-tree snapshot refreshed after the APT-002 runtime decision on 2026-08-11. Findings only; cleanup remains task-scoped.

1. `delete:` the 443-line design generator after the implemented landing receives visual sign-off. Replacement: current app plus final screenshots. [`scripts/generate-apt-v2.mjs`]
2. `delete:` 399 lines of D1/Drizzle schema, examples and migrations duplicate canonical Supabase. Replacement: existing Supabase server helpers. [`db/`, `examples/d1/`, `drizzle/`, `drizzle.config.ts`]
3. `delete:` about 230 lines of form CMS/versioning support a single hard-coded application form with no approved editor. Replacement: canonical `applications.answers` and the existing question list. [`supabase/migrations/202608110001_form_versioning.sql`, `app/api/formularios/route.ts`, related callers/UI/tests]
4. `delete:` 162 lines and seven direct dependencies from the retired Vinext/Cloudflare runtime. Replacement: native Next on Vercel. [`vite.config.ts`, `worker/`, `build/sites-vite-plugin.ts`, `.openai/`, Vinext/Vite/Cloudflare dependencies]
5. `delete:` unused 86-line ChatGPT header-auth helper has no callers and competes with Supabase Auth. Replacement: nothing. [`app/chatgpt-auth.ts`]
6. `delete:` unused Tailwind toolchain while active CSS is plain CSS and PostCSS has no plugins. Replacement: native CSS. [`tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs`]
7. `delete:` nine unreferenced starter/legacy public assets after visual comparison. Replacement: referenced approved assets only. [`public/apt-hero.jpg`, `apt-motion.jpg`, `apt-ritual.jpg`, `favicon.svg`, `file.svg`, `globe.svg`, `logo-apt3.svg`, `og 2.png`, `window.svg`]
8. `delete after use:` the CSV import panel, endpoint, parser and import-only CSS once the audited legacy roster has been imported and its links exported. Replacement: the normal application/approval flow for future members. [`app/api/membros/importacao/route.ts`, `lib/member-import.ts`, `MemberImportPanel`, related CSS/tests]

net: about -1,570 source lines, -11 direct dependencies and 9 assets possible after the one-time roster transition.

## Ponytail review — recent form/versioning change

Diff baseline is unavailable because the workspace has no Git repository. Review is based on the files added in the preceding work cycle. No fixes applied.

- `supabase/migrations/202608110001_form_versioning.sql:L1-118: yagni:` four-table form CMS for one hard-coded form with no approved editor. `applications.answers` and the existing question constant cover the current need.
- `app/api/formularios/route.ts:L20-24: delete:` loading up to 10,000 submissions only to show a management count. Nothing replaces it until that metric drives a decision.
- `app/api/requerimentos/route.ts:L94-115: delete:` mirrors every answer into `form_submissions` although `applications.answers` is already canonical. Keep one copy until a second form exists.
- `app/apt-app.tsx:L430-476: shrink:` versions, selector state and version metadata support a single form. Render the existing question list read-only if management still needs visibility.

net: about -230 lines possible.

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
| APT-008 | P1 | IN_PROGRESS | Make member management operational. | Admin updates Tweener/community links and allowed participation states with audit records; an isolated authenticated non-production flow proves the member portal and audit row. | APT-003 |
| APT-009 | P1 | PENDING | Complete registration callback and retry UX. | Success/cancel/expired states render correctly and retry does not duplicate identity or billing. | APT-005, APT-006 |
| APT-010 | P1 | PENDING | Complete member portal essentials. | Class, active community link, logout, session-expiry recovery and correct paid-through state verified. | APT-006, APT-008 |
| APT-011 | P1 | READY | Remove production-local Impeccable script and restore a zero-error lint baseline. | Typecheck, build, tests and lint all pass. | APT-001 recommended |
| APT-012 | P1 | READY | Remove dead starter architecture and dependencies approved by the Ponytail audit. | Chosen build passes; no Vinext/Cloudflare/D1/Drizzle/unused auth/Tailwind callers; dependency diff reviewed. | APT-001, APT-002 |
| APT-013 | P1 | READY | Decide whether to revert form versioning. Recommendation: revert before remote application. | D-010 closed; only necessary schema/code remains; tests updated. | APT-001 recommended |
| APT-014 | P2 | READY | Reconcile landing spec, current claims and current expanded design. | Owner confirms content/structure; one canonical spec remains; claims are sourced. | D-011 |
| APT-015 | P2 | PENDING | Add the smallest runtime tests for trust and money boundaries. | One runnable check per application, invite, registration, webhook and cancellation flow. | APT-005, APT-006 |
| APT-016 | P2 | PENDING | Verify every user journey visually and end to end. | Mobile and desktop browser evidence; API/data evidence; no console errors; exact live target recorded. | APT-003 through APT-015 as applicable |
| APT-017 | P2 | IN_PROGRESS | Configure production services and observability. | Supabase, Asaas, Resend, domain, webhook and failure logs verified in the chosen target. | APT-002, APT-003, APT-006 |
| APT-018 | P0 | READY | Contain the compromised legacy Supabase administrator and Auth automation path. | Pre-change backup recorded; sessions revoked before account disable/delete; any reused credential rotated; legacy Auth trigger and unnecessary definer functions removed with explicit function grants; the historical Auth redirect allowlist is reduced to approved live hosts; a controlled Auth signup creates no legacy profile; advisors and logs reviewed. | APT-004, explicit destructive-action approval |
| APT-019 | P0 | PENDING | Apply the approved forward-only schema, grant and legacy-surface reconciliation outside production first. | Isolated validation proves the eight canonical tables and constraints, invite revocation, explicit grants/default privileges and RLS; no public legacy data surface, fake history or form-CMS schema; dump diff and advisors reviewed before a separately authorized production apply. | APT-013, APT-018, legacy-data disposition decision |
| APT-020 | P0 | DROPPED | Start August 2026 collection directly in Asaas while APT automation remains gated. | Replaced by APT-021 after the user required athletes to enter APT and complete their own CPF recadastro before recurrence. | Replaced by APT-021 |
| APT-021 | P0 | VERIFY | Import current athletes and issue an individual recadastro that creates one hosted monthly Asaas recurrence. | Import preview accepts the validated active roster, deduplicates by normalized email and never imports CPF/card data; each stored token is hashed and revocable; the athlete confirms contact data, enters CPF and creates access; only CPF hash/last four persist; retries do not duplicate Auth, member, checkout or subscription; invalid/expired token and Asaas failure paths pass; full flow is proven in Sandbox before separately authorized production charging. | APT-004; production rollout also requires APT-018, APT-019, Asaas credentials and billing terms |

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

## Next decision

APT-004 is complete and APT-021 is locally built but not integrated. The production webhook is saved but disabled. The next source deployment contains the official password-recovery route; send the recovery only after its deploy and the two custom-DNS records resolve. Real rollout then requires: approve the one unresolved roster status and the final 35-person active set; approve monthly price and first due date; execute APT-018 containment; validate/apply APT-019 in a non-production target; configure the remaining Supabase/Asaas/CPF secrets in Vercel; prove recadastro, duplicate/timeout and signed webhook paths in Asaas Sandbox; then separately activate the production webhook and authorize the production import and real recurring checkouts. No real athlete, CPF or charge has been created yet.
