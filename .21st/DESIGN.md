<!-- Generated locally from .21st/design.json. No repository context exported. -->
# APT Design Context

Updated at 2026-10-03T02:46:05.540445+00:00.

## Product

Tennis club landing, membership operations, member portal and existing enrollment/authentication journeys.
Operational product: 16px controls/body, 14px data, 24–28px headings; spacious landing.

## Composition

- Selected Advanced Stats composition: dominant 2fr chart, dark real-base card and decisions aside; six exact-ledger metrics below (desktop 6, intermediate 3×2, mobile 2×3)
- Exact-record ledger per metric
- Native member table and operational board with the same filters
- Member detail: identity, financial coverage and invoice history before administrative forms
- Native disclosure sections and labelled fieldsets for existing actions
- Editorial landing with existing photography, compact navigation and member/calendar links visible on mobile
- Real selected theme tokens; 12px surfaces and selfhosted variable Outfit

- Current explicit user decision: chart first, real-base/decisions aside, then six financial metrics; this supersedes the earlier metrics-before-chart order without changing financial definitions or exact ledgers

## Constraints

- Apply the selected Amber Hearth light theme, selfhosted Outfit and official APT SVG assets
- 44px interactive controls, visible focus and reduced motion
- Separate payment, participation, forecast and debt
- Reuse native CSS and existing React components
- Product headings use the UI font at 24–28px, with 16px controls and 14px data
- 240px sidebar, 72px collapsed; metric cards spaced by 16px with 16px radius; selected Advanced Stats chart/aside cards use 24px radius
- Received cash and confirmed settlement remain separate, using the provider calendar
- Content remains visible without animation; reduced motion and 44px controls apply to every surface
- Use dark foreground on light amber actions and stronger muted/focus roles where the original palette misses accessible contrast

## Avoid

- New UI dependencies without need
- Decorative shimmer, gradient text or multi-word hero rotation
- Sending repository context to external catalog

## Source tokens

- `--background`: `#ffffff` (app/globals.css).
- `--foreground`: `#111827` (app/globals.css).
- `--card`: `#ffffff` (app/globals.css).
- `--primary`: `#d87943` (app/globals.css).
- `--primary-foreground`: `#111827` (app/globals.css).
- `--secondary`: `#527575` (app/globals.css).
- `--secondary-foreground`: `#ffffff` (app/globals.css).
- `--muted`: `#f3f4f6` (app/globals.css).
- `--muted-foreground`: `#6b7280` (app/globals.css).
- `--muted-text`: `color-mix(in srgb, var(--muted-foreground) 85%, var(--foreground))` (app/globals.css).
- `--accent`: `#eeeeee` (app/globals.css).
- `--border`: `#e5e7eb` (app/globals.css).
- `--focus`: `var(--secondary)` (app/globals.css).
- `--destructive`: `#ef4444` (app/globals.css).
- `--danger`: `color-mix(in srgb, var(--destructive) 65%, var(--foreground))` (app/globals.css).
- `--sidebar`: `#f3f4f6` (app/globals.css).
- `--sidebar-primary`: `#d87943` (app/globals.css).
- `--sidebar-primary-foreground`: `#111827` (app/globals.css).
- `--chart-1`: `#5f8787` (app/globals.css).
- `--chart-2`: `#e78a53` (app/globals.css).
- `--chart-3`: `#fbcb97` (app/globals.css).
- `--chart-received`: `color-mix(in srgb, var(--chart-2) 80%, var(--foreground))` (app/globals.css).
- `--chart-confirmed`: `var(--secondary)` (app/globals.css).
- `--font-sans`: `"Outfit", ui-sans-serif, sans-serif, system-ui` (app/globals.css).
- `--font-ui`: `var(--font-sans)` (app/globals.css).
- `--font-display`: `var(--font-sans)` (app/globals.css).
- `--space-1`: `0.25rem` (app/globals.css).
- `--space-2`: `0.5rem` (app/globals.css).
- `--space-3`: `0.75rem` (app/globals.css).
- `--space-4`: `1rem` (app/globals.css).
- `--space-6`: `1.5rem` (app/globals.css).
- `--space-8`: `2rem` (app/globals.css).
- `--space-10`: `2.5rem` (app/globals.css).
- `--space-12`: `3rem` (app/globals.css).
- `--space-16`: `4rem` (app/globals.css).
- `--radius`: `0.75rem` (app/globals.css).
- `--radius-sm`: `0.5rem` (app/globals.css).
- `--radius-md`: `var(--radius)` (app/globals.css).
- `--product-radius`: `0.75rem` (app/globals.css).
- `--shadow-raised`: `0 1px 4px rgb(0 0 0 / 0.05)` (app/globals.css).
- `--ease`: `cubic-bezier(0.22, 1, 0.36, 1)` (app/globals.css).
- `--ease-snap`: `cubic-bezier(0.16, 1, 0.3, 1)` (app/globals.css).

## Decisions

- User authorized the total product UI/UX redesign, including management, portal, authentication and existing forms. Club identity and verified financial/API behavior remain the product boundaries. Source: Current user authorization relayed by root, 2026-10-02.
- Implement hierarchy and interactions with the existing React/CSS/SVG/Lucide/Motion stack. Use catalog composition as reference, with original APT markup. Source: Implementation under authorized scope.
- User explicitly selected Amber Hearth by serafimcloud, and expanded refinement to landing and every existing screen. Apply its light tokens while correcting foreground contrast. Source: Current owner instruction relayed by root, 2026-10-02; APT_BRAIN.md.

## References inspected before coding

- [Invoice History Table](https://21st.dev/@cnippet-dev/components/v-table-12): Inspiration for status badges, per-row actions, explicit outstanding totals; adapt existing HTML/CSS, no registry installation
- [App Dashboard Layout](https://21st.dev/@shadcnstore/components/app-1): License not declared in GET; hierarchy only, original APT implementation
- [Records Table](https://21st.dev/@theshanelevine/components/records-table): License not declared in GET; semantic table hierarchy only, original APT implementation
- [Revenue Bars](https://21st.dev/@olewandowski1/components/charts-1): MIT public source read; native SVG implementation with real provider-calendar receipts
- [Sidebar](https://21st.dev/@wensity/components/sidebar): MIT preview inspected; core not obtained, existing APT sidebar implementation
- [Kanban](https://21st.dev/@arihantcodes_1f7b8c4d/components/kanban-board): MIT public reference inspected; native columns, financial stages remain derived
- [Login](https://21st.dev/@ephraimduncan/components/login-2): MIT documented blocks.so/login-04 source read; native labelled fields, existing auth actions
- [Account Settings Fieldset](https://21st.dev/@cnippet-dev/components/v-fieldset-7): MIT demo inspected; semantic grouping of existing fields only
- [Amber Hearth](https://21st.dev/@serafimcloud/themes/amber-hearth): Actual public theme tokens retrieved before coding; explicit user selection. Native semantic mapping, with accessible foreground/muted/focus exceptions.
- [Editorial Hero](https://21st.dev/@felipemenezes098/components/hero-05): MIT public preview inspected before landing changes; editorial text/photo hierarchy only, original APT markup and claims.
- [Navbar 1](https://21st.dev/@preetsuthar17/components/navbar-1): MIT public preview inspected; compact native navigation with all existing destinations and keyboard targets.

## Accessibility and provenance

The theme keeps its original light amber/teal colors. Dark foreground on amber, stronger muted text on gray and teal focus correct normal-text and focus contrast. Original serif/mono theme families are optional declarations; only Outfit is loaded and used for UI. Official SVG artwork is preserved.

Catalog generation remains disabled; no hosted context export, registry installation or fabricated action.

## Selected landing amendments

- [Solace UI Footer Section 5](https://21st.dev/@solaceui/components/footer-section-5), ID19358: actual public author registry read at `https://www.solaceui.com/r/footer-section-5.json` (148-line main block). Catalog metadata declares `no-license`, so the APT version uses original HTML/CSS for grouped real links. The latest explicit owner correction removes the outline wordmark/orange CTA: one restrained navy closing CTA with small official logo and high-contrast white text precedes a light navigation footer. No reference code, shader, SVG/social assets or dependency copied.
- [Osmo Parallax Scrolling](https://21st.dev/@osmosupply/components/parallax-scrolling): the real page and user-pasted four-layer GSAP/Lenis example were consulted before implementation. The original APT adaptation uses existing Framer hooks, three bounded transforms and native scrolling. Content is visible in initial HTML; reduced motion sets every plane to zero. The human photograph was adapted with lateral outpaint to public/apt-assets/hero-parallax-v2.webp (1672×941 native,134740bytes); the earlier generated alternative is not public.

The latest explicit owner correction supersedes the finite word sequence: only competir./evoluir./pertencer. repeat every two seconds at all viewport sizes. The owner then explicitly rejected pause/resume controls, so there is no user stop button. OS reduced-motion content and the accessible headline stay static. The season frame is a dark translucent glass surface with white text, a thin border and restrained backdrop blur/saturation; its blur layer is isolated and clipped inside the frame, with no broad outside shadow. Unsupported browsers use the opaque dark fallback. Desktop/tablet/mobile cycle, motion, crop, focus and glass inspection remain browser gates before the owner's requested preview acceptance.

## Interactive operational references

- [Efferd Dashboard 2](https://21st.dev/@efferd/components/efferd-dashboard-2): MIT source recovered from the public author registry before chart/sidebar refinements; hierarchy only, without demo deltas or data.
- [Efferd App Shell 2](https://efferd.com/blocks/app-shell#app-shell-2): Public author header/sidebar source read; native APT navigation, actual routes/actions and selected Amber tokens.
- [Hover Trace Bar Chart](https://21st.dev/@LegionWebDev/components/hover-trace-bar-chart): MIT public source read; pointer/focus tracking informed the earlier iteration; current chart uses the exact Advanced Stats core.
- [Chart Example Legend](https://21st.dev/@uiable/components/chart-example-legend): MIT public source read; distinct series legend and exact readout informed the earlier iteration; current chart uses the Advanced Stats core and existing projection.

Received and confirmed are exact separate monthly series. Confirmed-line contrast is strengthened to 3.68:1 on white and 3.29:1 over the received-area tint, with a dashed pattern and explicit legend. Application moves use the existing protected API; registration/payment lanes remain derived.

Application drag uses the native article and a visible noninteractive grip outside the detail-opening button. Mutable cards alone expose the grip; busy requests and decisions hide it. Keyboard/mobile stage selection remains the accessible alternative. Handler tests cover lifecycle guards; a real pointer gesture from the grip and persisted reload are separate browser evidence.

- [Advanced Stats / ClippedAreaChart](https://21st.dev/@uilayout.contact/components/advanced-stats): exact user-selected light reference and public MIT core read before integration; Recharts area/ghost line/clipped cursor with real financial data. Full UI LAYOUT license notice preserved; no sample goals, deltas or totals.

## Member and contact polish

The current member portal/table priority adapts the user-provided CRM ZIP and screenshots as inspiration, not an exact clone. All identity/contact/financial/notes information comes from APT DTOs and existing actions. No ZIP backend, demo roles/activity, generated avatars or new dependency is used.

- Table: six proportional financial columns, compact identity/email, no frozen column overlay, native local horizontal scrolling and a clear mobile hint.
- Portal: identity, actual payment method/coverage/receipts, contextual next action, authorized club links and exact invoice history. Protected membership and proven card recurrence keep their existing behavior.
- Contact detail: labelled real attributes, financial summary/history, explicit saved notes and existing monitoring/communications before less frequent configuration controls.
- Forms: names/autocomplete/spellcheck semantics, inline status/errors and first-invalid focus. Hero presentation retains only the three approved words and ends after a single sequence.
- [User Table · Alain · 31848](https://21st.dev/@alain00/components/user-table): complete official public MIT source read; original APT markup/CSS inspired by its identity and row hierarchy.
- [Settle · 941](https://21st.dev/@uvain/templates/settle-payment-operations-dashboard): public preview only, sold source unavailable; hierarchy inspiration without sample data.
- [Sidebar · Manu Arora · 315](https://21st.dev/@manuarora700/components/sidebar): official public core inspected; APT keeps explicit accessible collapse and existing mobile navigation.

Member/contact verification fixes: issued invoice date comes only from the pending-invoice projection; paid/manual-protected athletes have no pending-payment reminder shortcut, while direct conversation remains available. Native modal dialogs own focus containment and close before trigger restoration. Partial note receipts remain explicit/deduplicated, preventing draft replay after a later audit failure.

Final async/contact fixes: closing either native detail invalidates pending reads and clears loading; completed mutations update lists without resurrecting a closed/replaced sheet. Public enrollment without a token shows actual invitation/application/login paths and no data form. Mobile invoice history has a visible local-scroll hint.
