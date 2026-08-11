# APT development protocol

Read `APT_BRAIN.md` before changing code. It is the canonical execution memory for this repository.

## Required cycle

1. Do not implement a feature unless its task is `READY` in `APT_BRAIN.md` and the user has chosen or authorized it.
2. Trace the real flow end to end before editing: UI, API, database, external service, response and visible state.
3. Use `ponytail` for the smallest correct solution. Reuse existing code and platform features before adding files, abstractions or dependencies.
4. Run a correctness/security review and `ponytail-review` on the change before closing it.
5. Consult the latest `ponytail-audit` in `APT_BRAIN.md`. Rerun the whole-repo audit only after structural or dependency changes; do not repeat it when the repository structure is unchanged.
6. Update the task status, evidence, decisions and corrections in `APT_BRAIN.md` in the same work cycle.

## Completion gates

- `DONE` requires proportionate evidence: typecheck/build, the smallest meaningful automated check, and browser/integration verification when behavior is visual or crosses an external service.
- A responding URL is not visual verification. A mocked or configured integration is not a verified integration.
- Never apply migrations, deploy, send email or call production billing when the target project/environment is ambiguous.
- Keep Supabase as the canonical application database and Asaas as the hosted billing boundary unless a recorded decision changes this.
- Do not restore shimmer, gradient text or multi-word hero rotation without explicit approval.

## Source hierarchy

1. Explicit current user decision.
2. `APT_BRAIN.md` decisions and active task.
3. `PRODUCT.md` for product architecture.
4. `DESIGN.md` and `APT_LANDING_SPEC.md` for approved experience direction.
5. `PROMPTS_LOVABLE_APT.md` as historical requirements, not current implementation truth.
6. Code describes current behavior, not necessarily approved or verified behavior.
