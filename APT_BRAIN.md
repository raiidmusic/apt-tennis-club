# APT Brain

Last audited: 2026-08-11  
State: APT-003 in progress; canonical Supabase and Vercel targets identified
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

Current gate status: policy and runtime owner are locked. The canonical Supabase and Vercel projects are now identified under `gaagustavo`, but no payment secret is configured. Vercel currently shows no project environment variables. Remote configuration remains blocked until APT-003 finishes and an Asaas Sandbox administrator provides or generates the Asaas credentials through the approved secret-manager flow. No secret value should be pasted into this file or into chat.

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
| Admin login `/entrar` | CODED, CHECKED | Session refresh/expiry UX, production auth verification, visible logout |
| Management `/gestao` | CODED, CHECKED | Full application detail, notes, information-request action, member editing, Twinner/community links |
| Invitation approval | CODED, CHECKED | Applied revocation migration, real email/manual-copy test, retry behavior |
| Private registration `/cadastro` | CODED, CHECKED | Compensation for partial Auth/DB/Asaas failures; callback states; real sandbox checkout |
| Asaas webhook | CODED, CHECKED statically | Real signed event, reliable reconciliation, lifecycle dates, retry/error evidence |
| Member portal `/portal` | CODED, CHECKED | Community link rendering, class in profile, logout, reliable paid-through date, real payments |
| Form versioning | CODED LOCALLY | Product need; remote migration; recommendation is to remove until a second form/editor is approved |
| Supabase | Project `APT TENNIS CLUB` (`cjwxqfxrkdgmqbomzhkm`) in organization `AI`, `sa-east-1`; 17 public tables with zero estimated rows; 10 historical migrations visible | Security/performance advisor results; reconcile remote July 2025 history with the three local August 2026 migrations before any apply |
| Deployment | Vercel project `apt-tennis-club` (`prj_gnjjgijeXutKy5vZM5Q0nn9hXnx3`) under `gaagustavo-9339's projects`; `apt-tennis-club.vercel.app`; no project environment variables | Re-authenticate the `gaagustavo` account in IAB; inspect current deployment failure; no new deploy until explicitly authorized |
| Tests | 7 static/focused checks pass | Runtime API tests and one sandbox end-to-end happy path plus failure paths |
| Lint | 15 errors, 20 warnings | Zero-error quality gate |
| Version control | Git `main`; recoverable baseline `03ce2ab` | Remote owner is not configured; not required for the local baseline |

## Correctness and security review

### P0 — foundation and release blockers

1. `[RESOLVED — APT-001]` Git `main` now exists at the workspace root with recoverable baseline `03ce2ab`.
2. The canonical Supabase and Vercel projects are identified, but remote migration history is not reconciled and Supabase advisors are not captured. Migrations and payment secrets still cannot be safely changed.
3. Registration creates an Auth user before inserting the member. A failed member insert leaves an orphan user and can block retry with the same email (`app/api/cadastros/route.ts:73-84`).
4. An Asaas checkout is created before subscription/invitation/application writes complete. A database failure can leave an orphan checkout and conflicting local state (`app/api/cadastros/route.ts:86-125`).
5. The webhook returns success when no member reference exists, which can stop provider retries without reconciliation (`app/api/webhooks/asaas/route.ts:34-36`).
6. Webhook updates do not prove the member/subscription rows existed before recording the event as processed (`app/api/webhooks/asaas/route.ts:37-97`).
7. `current_period_end` is used to preserve paid access but is never populated by the current webhook flow (`app/api/portal/route.ts:28-32`).

### P1 — core operational gaps

1. Management cannot open and read all application answers, so approval is not operationally informed.
2. “Pedir informação” only changes status; it does not record a request or contact the candidate.
3. Management cannot set Twinner URL, WhatsApp community URL, courtesy status or correct member data.
4. The application list converts any Supabase failure into an empty list, making outage indistinguishable from no applications (`app/api/requerimentos/route.ts:172-182`).
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

net: about -1,320 source lines, -11 direct dependencies and 9 assets possible.

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
| APT-000 | P0 | BLOCKED | Establish the Asaas Sandbox security baseline in the canonical backend runtime. | Secret names are present without exposed values; Asaas Checkout proves card data stays outside APT/Supabase; invalid-token and duplicate signed webhook checks pass; key owner, expiry and rotation procedure are recorded. | APT-003, Asaas Sandbox administrator access |
| APT-001 | P0 | DONE | Establish canonical Git repository/worktree and preserve the audited state. | Git `main`; baseline `03ce2ab`; secret scan clean; generated/local files confirmed ignored; build passed; 7/7 tests passed. | — |
| APT-002 | P0 | DONE | Select Vercel Next and npm; make Next the default build and keep one canonical lockfile. | User decision recorded; Next webpack and native Turbopack builds pass; 7/7 tests pass; package lock matches manifest; pnpm/Vercel override files removed. | — |
| APT-003 | P0 | IN_PROGRESS | Connect the correct Supabase APT project and inspect current schema/migrations/advisors read-only. | Project ID recorded; tables, migrations, security and performance advisors captured. | Authenticated `gaagustavo` access in IAB |
| APT-004 | P0 | PENDING | Reconcile local migrations with the real APT database before applying anything. | Clean migration plan reviewed; no fabricated or duplicate history; rollback/recovery described. | APT-003 |
| APT-005 | P0 | PENDING | Remove partial-failure traps from registration and checkout. | Repeatable failure tests prove no orphan Auth user, member, checkout or consumed invitation. | APT-003, APT-004 |
| APT-006 | P0 | PENDING | Make Asaas webhook reconciliation retry-safe and lifecycle-correct. | Signed sandbox events cover confirmed, overdue, refunded/deleted and duplicate delivery; dates match provider truth. | APT-003, APT-004 |
| APT-007 | P1 | PENDING | Make application review operational. | Admin reads every answer, records notes/decision and sends or records information requests without false delivery claims. | APT-003 |
| APT-008 | P1 | PENDING | Make member management operational. | Admin updates Twinner/community links and allowed participation states with audit records. | APT-003 |
| APT-009 | P1 | PENDING | Complete registration callback and retry UX. | Success/cancel/expired states render correctly and retry does not duplicate identity or billing. | APT-005, APT-006 |
| APT-010 | P1 | PENDING | Complete member portal essentials. | Class, active community link, logout, session-expiry recovery and correct paid-through state verified. | APT-006, APT-008 |
| APT-011 | P1 | READY | Remove production-local Impeccable script and restore a zero-error lint baseline. | Typecheck, build, tests and lint all pass. | APT-001 recommended |
| APT-012 | P1 | READY | Remove dead starter architecture and dependencies approved by the Ponytail audit. | Chosen build passes; no Vinext/Cloudflare/D1/Drizzle/unused auth/Tailwind callers; dependency diff reviewed. | APT-001, APT-002 |
| APT-013 | P1 | READY | Decide whether to revert form versioning. Recommendation: revert before remote application. | D-010 closed; only necessary schema/code remains; tests updated. | APT-001 recommended |
| APT-014 | P2 | READY | Reconcile landing spec, current claims and current expanded design. | Owner confirms content/structure; one canonical spec remains; claims are sourced. | D-011 |
| APT-015 | P2 | PENDING | Add the smallest runtime tests for trust and money boundaries. | One runnable check per application, invite, registration, webhook and cancellation flow. | APT-005, APT-006 |
| APT-016 | P2 | PENDING | Verify every user journey visually and end to end. | Mobile and desktop browser evidence; API/data evidence; no console errors; exact live target recorded. | APT-003 through APT-015 as applicable |
| APT-017 | P2 | PENDING | Configure production services and observability. | Supabase, Asaas, Resend, domain, webhook and failure logs verified in the chosen target. | APT-002, APT-003, APT-006 |

## Recommended execution sequence

1. `APT-001` — DONE: recover safe history.
2. `APT-002` — DONE: Vercel Next + npm; payment secrets belong to Vercel.
3. `APT-003` and `APT-004` — connect and reconcile the real database.
4. `APT-000` — configure and prove the Asaas Sandbox security gate before billing implementation.
5. `APT-013` — remove the premature form CMS unless there is a real near-term editor requirement.
6. `APT-011` — make the baseline green.
7. `APT-005` and `APT-006` — secure identity and money flows before expanding UI.
8. `APT-007` through `APT-010` — complete operational features.
9. `APT-014` — settle landing content and structure.
10. `APT-015` through `APT-017` — runtime tests, full verification and live operations.

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

## APT-003 progress record — 2026-08-11

- Canonical Supabase target identified: organization `AI`, project `APT TENNIS CLUB`, reference `cjwxqfxrkdgmqbomzhkm`, production branch `main`, region `sa-east-1`.
- The public schema contains 17 APT-related tables. Every table displayed zero estimated rows; Realtime was enabled only for `tennis_form_responses` in the captured table list.
- Supabase shows 10 historical migrations dated from 2025-07-01 through 2025-07-25. Local source contains only `202608070001_apt_hub.sql`, `202608110001_form_versioning.sql` and `202608110002_invite_revocation.sql`; no reconciliation or migration apply has occurred.
- Supabase Advisor results remain unverified because the dashboard did not finish returning the security page during the read-only inspection. This is a blocker, not evidence of zero findings.
- Canonical Vercel target identified under `gaagustavo-9339's projects`: `apt-tennis-club`, project ID `prj_gnjjgijeXutKy5vZM5Q0nn9hXnx3`, domain `apt-tennis-club.vercel.app`.
- Vercel shows no project environment variables and the project settings report the latest deployment as failed. No variable, deployment, domain or project setting was changed.
- User corrected the durable boundary: continue all browser work in IAB and only in accounts tied to `gaagustavo`.
- `ponytail-review`: the target discovery avoided duplicate project creation; no code, dependency or repository structure changed. Reuse the latest whole-repository `ponytail-audit`.

## Next decision

Payment security remains the selected product gate. `APT-003` is active with both canonical projects identified under `gaagustavo`. The next step is to authenticate `gaagustavo` in IAB, capture Supabase security/performance advisors and inspect the Vercel deployment failure read-only. Then APT-004 can reconcile remote and local migration histories. An Asaas Sandbox administrator is still required to unblock APT-000. No billing construction, migration, deployment or production key configuration should happen before these checks pass.
