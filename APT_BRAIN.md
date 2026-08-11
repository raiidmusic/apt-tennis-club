# APT Brain

Last audited: 2026-08-11  
State: implementation in progress — APT-001  
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
| D-008 | Canonical deploy runtime: Vercel Next or Codex/Cloudflare Vinext. | OPEN | both stacks exist; no APT Vercel project found |
| D-009 | Canonical package manager: npm or pnpm. | OPEN | both lockfiles exist; Vercel config currently invokes npm |
| D-010 | Keep or remove dynamic form versioning before production. | OPEN, RECOMMEND REMOVE | one static form exists; feature was built before prioritization |
| D-011 | Reconcile the approved five-block landing spec with the larger current landing. | OPEN | current page includes gallery, metrics, Courts, cycle and FAQ |
| D-012 | Payment secrets have separate ownership and values: Asaas generates `ASAAS_API_KEY`; Asaas generates or accepts the webhook `authToken`; APT generates `CPF_HASH_SECRET`. None may be reused, exposed to the browser, committed, logged or stored in application tables. | CONFIRMED | Asaas authentication/webhook docs; Supabase secrets docs; `.env.example` |
| D-013 | APT and Supabase must never receive or store card PAN, expiry, CVV or a reusable card token. Card entry and card changes remain entirely inside hosted Asaas pages. | CONFIRMED | Asaas Checkout and PCI-DSS docs; current checkout flow and schema search |

## Payment security gate — selected 2026-08-11

This gate must pass before any billing feature is treated as integrated or production-ready.

| Secret | Created by | Canonical storage | Explicit boundary |
|---|---|---|---|
| `ASAAS_API_KEY` | An Asaas administrator in the Asaas dashboard; it is shown once | The secret manager of the canonical backend runtime | Never Supabase tables, browser code, Git, chat, email or logs |
| `ASAAS_WEBHOOK_TOKEN` | Prefer the secure generator in Asaas; 32–255 characters | Asaas webhook configuration and the same backend runtime secret store | Must be different from every API/database/hash key; validate `asaas-access-token` before parsing business effects |
| `CPF_HASH_SECRET` | APT, from a cryptographically secure random generator | Backend runtime secret store | Used only for CPF hashing; never reused as a webhook token or API key |
| `SUPABASE_SECRET_KEY` | Supabase | Backend runtime secret store | Server-only and unrelated to Asaas authentication; it bypasses RLS |

The current code calls Asaas from Next/Vinext server routes. Therefore `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` and `CPF_HASH_SECRET` belong in the chosen deployment runtime's secret manager, not in Supabase. They belong in Supabase Edge Function Secrets only if the payment API is deliberately moved to Edge Functions after D-008 is closed. Duplicating secrets across both runtimes is prohibited without an active caller in each runtime.

Minimum card-security controls:

1. Redirect to Asaas Checkout; do not add card inputs to APT.
2. Store only Asaas checkout/payment/subscription IDs, URLs and normalized business status.
3. Validate the webhook token, deduplicate by event ID and reconcile provider state before acknowledging a business result.
4. Keep RLS enabled and deny client roles direct writes to billing/event tables; use the server secret only in trusted backend code.
5. Redact request payloads and secrets from application, support and monitoring logs.
6. Use separate Sandbox and Production keys, minimum access, expiry/rotation and immediate revocation after suspected exposure.
7. Verify approval, refusal, duplicate webhook, invalid token and timeout paths in Asaas Sandbox before production.

Current gate status: policy is locked; remote configuration is blocked until the canonical runtime, the APT Supabase project and an Asaas Sandbox account with administrator access are identified. A read-only check on 2026-08-11 found no project named APT in the connected Supabase account. No secret value should be pasted into this file or into chat.

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
| Supabase | migrations only | Correct APT project, applied migrations, table query, security/performance advisors |
| Deployment | local build; old protected preview history | No APT project in connected Vercel account; Cloudflare/Codex target not verified; no live browser proof |
| Tests | 7 static/focused checks pass | Runtime API tests and one sandbox end-to-end happy path plus failure paths |
| Lint | 15 errors, 20 warnings | Zero-error quality gate |
| Version control | absent at workspace root | Git repository or confirmed canonical repository/worktree |

## Correctness and security review

### P0 — foundation and release blockers

1. No Git repository exists at the workspace root. Safe diff review, rollback and change attribution are unavailable.
2. No connected Supabase or Vercel project is identifiable as APT. Migrations, environment variables and deployments cannot be verified or safely changed.
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

## Ponytail audit — whole repository

One-shot snapshot from 2026-08-11. No fixes applied.

1. `delete:` old app and CSS copies add 678 lines and also pollute lint. Replacement: nothing. [`app/apt-app 2.tsx`, `app/globals 2.css`]
2. `delete:` D1/Drizzle schema, example route, migration packaging and database binding duplicate the canonical Supabase architecture. Replacement: Supabase REST server helpers already in use. [`db/`, `examples/d1/`, `drizzle/`, `drizzle.config.ts`, D1 portions of worker/config]
3. `delete:` the 443-line design generator and generated design outputs after the implemented landing receives visual sign-off. Replacement: current app plus final screenshots. [`scripts/generate-apt-v2.mjs`, `design-output/`]
4. `delete:` unused ChatGPT header-auth helper has no callers and competes with Supabase Auth. Replacement: nothing. [`app/chatgpt-auth.ts`]
5. `delete:` unused Tailwind toolchain while active CSS is plain CSS and PostCSS has no plugins. Replacement: native CSS. [`tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs`]
6. `delete:` one package-manager lock and its workspace file. Replacement: the package manager chosen in D-009. [`package-lock.json` or `pnpm-lock.yaml` + `pnpm-workspace.yaml`]
7. `delete:` nine unused starter/legacy public assets after visual comparison. Replacement: referenced approved assets only. [`public/apt-hero.jpg`, `apt-motion.jpg`, `apt-ritual.jpg`, `favicon.svg`, `file.svg`, `globe.svg`, `logo-apt3.svg`, `og 2.png`, `window.svg`]
8. `delete:` local backup/cache artifacts from the working tree and add the missing backup path to ignore rules. Replacement: package reinstall and Git history. [`.node_modules.clean-backup`, local generated state]

net: about -1,400 source lines, -4 direct dependencies possible, plus generated files and one lockfile.

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
| APT-000 | P0 | BLOCKED | Establish the Asaas Sandbox security baseline in the canonical backend runtime. | Secret names are present without exposed values; Asaas Checkout proves card data stays outside APT/Supabase; invalid-token and duplicate signed webhook checks pass; key owner, expiry and rotation procedure are recorded. | APT-002, APT-003, Asaas Sandbox administrator access |
| APT-001 | P0 | IN_PROGRESS | Establish canonical Git repository/worktree and preserve the audited state. | `git status` works; initial state is recoverable; ignored generated files are confirmed. | — |
| APT-002 | P0 | READY | Decide deployment runtime and package manager. Recommendation: Vercel Next + npm unless Codex hosting is the intended production owner. | Decision recorded; one build path and one lockfile remain planned. | — |
| APT-003 | P0 | BLOCKED | Connect the correct Supabase APT project and inspect current schema/migrations/advisors read-only. | Project ID recorded; tables, migrations, security and performance advisors captured. | User/project access |
| APT-004 | P0 | PENDING | Reconcile local migrations with the real APT database before applying anything. | Clean migration plan reviewed; no fabricated or duplicate history; rollback/recovery described. | APT-003 |
| APT-005 | P0 | PENDING | Remove partial-failure traps from registration and checkout. | Repeatable failure tests prove no orphan Auth user, member, checkout or consumed invitation. | APT-003, APT-004 |
| APT-006 | P0 | PENDING | Make Asaas webhook reconciliation retry-safe and lifecycle-correct. | Signed sandbox events cover confirmed, overdue, refunded/deleted and duplicate delivery; dates match provider truth. | APT-003, APT-004 |
| APT-007 | P1 | PENDING | Make application review operational. | Admin reads every answer, records notes/decision and sends or records information requests without false delivery claims. | APT-003 |
| APT-008 | P1 | PENDING | Make member management operational. | Admin updates Twinner/community links and allowed participation states with audit records. | APT-003 |
| APT-009 | P1 | PENDING | Complete registration callback and retry UX. | Success/cancel/expired states render correctly and retry does not duplicate identity or billing. | APT-005, APT-006 |
| APT-010 | P1 | PENDING | Complete member portal essentials. | Class, active community link, logout, session-expiry recovery and correct paid-through state verified. | APT-006, APT-008 |
| APT-011 | P1 | READY | Remove production-local Impeccable script and restore a zero-error lint baseline. | Typecheck, build, tests and lint all pass. | APT-001 recommended |
| APT-012 | P1 | PENDING | Remove dead starter architecture and dependencies approved by the Ponytail audit. | Chosen build passes; no D1/Drizzle/unused auth/Tailwind callers; dependency diff reviewed. | APT-001, APT-002 |
| APT-013 | P1 | READY | Decide whether to revert form versioning. Recommendation: revert before remote application. | D-010 closed; only necessary schema/code remains; tests updated. | APT-001 recommended |
| APT-014 | P2 | READY | Reconcile landing spec, current claims and current expanded design. | Owner confirms content/structure; one canonical spec remains; claims are sourced. | D-011 |
| APT-015 | P2 | PENDING | Add the smallest runtime tests for trust and money boundaries. | One runnable check per application, invite, registration, webhook and cancellation flow. | APT-005, APT-006 |
| APT-016 | P2 | PENDING | Verify every user journey visually and end to end. | Mobile and desktop browser evidence; API/data evidence; no console errors; exact live target recorded. | APT-003 through APT-015 as applicable |
| APT-017 | P2 | PENDING | Configure production services and observability. | Supabase, Asaas, Resend, domain, webhook and failure logs verified in the chosen target. | APT-002, APT-003, APT-006 |

## Recommended execution sequence

1. `APT-001` — recover safe history.
2. `APT-002` — choose one runtime and package manager; this also fixes the payment secret owner.
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

## Next decision

Payment security is now the selected product gate. The immediate executable task remains `APT-001`; then close `APT-002` so secrets have one runtime owner, connect the real APT Supabase project in `APT-003`, and unblock `APT-000`. No billing construction or production key configuration should happen before those targets are unambiguous.
