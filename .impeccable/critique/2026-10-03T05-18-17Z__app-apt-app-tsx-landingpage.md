---
target: "app/apt-app.tsx#LandingPage"
total_score: 32
p0_count: 0
p1_count: 0
timestamp: 2026-10-03T05-18-17Z
slug: app-apt-app-tsx-landingpage
---
Method: dual-agent (A: v2_ui · B: v2_003_registration_quality)

# APT landing — final Impeccable review

Target: `app/apt-app.tsx#LandingPage`, public `/`. Current source TSX `bb8d88a5`, CSS `030cba1b`. Gabriel inspected the concrete preview and approved continuation: “ok, prossiga”. No open actionable P0–P3 remains in this landing pass.

## Design health — Assessment A

| Nielsen heuristic | Score | Evidence / practical limit |
| --- | ---: | --- |
| Visibility of system status | 3/4 | Season, native FAQ state and focus are visible; header does not track the current section. |
| Match with the real world | 4/4 | Match cadence, fourteen-day deadline, Courts and promotion/relegation explain the actual sport. |
| Control and freedom | 3/4 | Native links/disclosures; uninterrupted words follow the explicit human preference. OS reduced-motion remains static. |
| Consistency and standards | 3/4 | Outfit, official identity and semantic actions are consistent; three mobile finishing issues were corrected. |
| Error prevention | 3/4 | Request copy explains review and vacancy instead of promising immediate admission. Form submission is outside this assessment. |
| Recognition over recall | 3/4 | Format and destinations are visible at the relevant point; FAQ repeats the important distinctions. |
| Flexibility and efficiency | 3/4 | Persistent navigation exposes entry/member actions; compact mobile Courts shorten the page. |
| Aesthetic and essential information | 3/4 | Photography and restrained ending establish hierarchy without invented metrics or testimonials. |
| Error recovery | 3/4 | Landing has no asynchronous transaction to recover; authenticated flows are assessed separately. |
| Help and documentation | 4/4 | FAQ covers admission and distinguishes Tweener from APT participation. |
| **Total** | **32/40 — Good** | The score is not increased mechanically after minor fixes and is not comparable with an earlier whole-app score. |

## Technical/visual dimensions — Assessment B

Accessibility3/4, performance3/4, theming4/4, responsive4/4, anti-patterns4/4: **18/20**. No full WCAG, screen-reader, 200% zoom or Core Web Vitals certification is claimed. Perpetual rotation without an in-page pause is the owner's explicit preference; restoring the rejected control is not proposed.

## Anti-pattern verdict and strengths

The selected blue-court photograph, official APT marks, Outfit and Amber Hearth accents give the page a clear club identity. The narrative proceeds from invitation to actual format, Courts, season, member handoff and FAQ. The navy closing invitation explains the conditions of entry and has one action; the light footer groups seven real destinations. The rejected outlined wordmark and large orange conversion block are absent.

The gallery's local horizontal overflow is intentional; the document remains contained. Numbered season steps describe an actual sequence and the two large numerical cards explain real match cadence rather than fabricated growth.

## Priority findings — corrected in this cycle

1. **P3 resolved:** all five mobile header links fit at390px; navigation clientWidth/scrollWidth358/358, with44px targets.
2. **P3 resolved:** divider dots no longer head a wrapped mobile tag line; they return from768px.
3. **P3 resolved:** mobile Courts are288px rather than352px, without clipping content; larger grids retain their composition.
4. The owner-reported glass hover backing rectangle is bounded by an isolated clipped pseudo-element; actual pointer entry/exit and scroll showed no extra rectangle in the tested samples.
5. The hero cycle returns from pertencer to competir continuously at1280/768/390, with no rejected pause control. The fixed accessible heading and reduced-motion alternative remain.

## Cognitive load, emotional journey and persona limits

One primary request action and progressive FAQ disclosure keep cognitive load low. The hero establishes emotional interest; concrete match rules and Courts provide the rational decision; the closing section explains review/vacancy and avoids a false admission promise. Five header sections exceed a literal four-option checklist but remain short and grouped apart from account/entry actions.

First-time visitors receive entry conditions; mobile visitors retain access to entry/member paths; visitors seeking detail can inspect deadlines, divisions, season and FAQ. Landing copy does not attempt to reproduce the whole sports regulation. Native forms, authenticated payments and provider events are outside this landing assessment.

## Evidence and runtime checks

Fresh native viewport screenshots at1280×900,768×900 and390×900 plus whole-page records have all15images loaded, Outfit loaded and no document overflow. Hero and ending screenshots were inspected directly; actual screenshot dimensions were verified. Browser loop/hover/scroll receipts belong to the root's separate inspection tab, not fabricated agent gestures.

Impeccable detector:0 findings.21st detector:0 errors,4 contextual native-dialog autofocus warnings and44 deliberate color suggestions (32approved tokens and12photo/glass/shadow/backdrop rules), without fixes mode. The final divider/handle amendments add no color or landing-structure finding.

Focal correctness/security and ponytail review pass.207/207 tests and standard TypeScript pass; the final webpack build generates27routes. Separately, the real Kanban grip gesture persisted after a full reload on the fictional upstream; the sample was restored. Production/provider verification is a release gate, not this visual proof.

## Review provenance and remaining scope

A and B remained isolated until completion. The shared read-only browser disallows mutable detector overlay injection; assessments inspected actual native screenshots and DOM plus source, deterministic scan and real React/Framer SSR. No injected overlay or full WCAG certification is claimed. The local preview is kept running because Gabriel requested to inspect it; stop with Ctrl-C in execution session73812.

Questions skipped: the three finishing findings were straightforward and all local fixes were already authorized. Gabriel subsequently approved proceeding. Commit/deployment, live recovery/email evidence and Notion macro closeout remain separate execution steps. Cadence005 and Roberval/dot007 remain unactivated.
