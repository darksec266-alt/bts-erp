# UI/UX Design System & Guideline
## Brother's Technology System — Frontend Design Specification (v3.0)

**Source references:** a full, working HTML dashboard mockup (`bts-dashboard-mockup.html`, 49 distinct views across every major module) supplied directly for this project — superseding the earlier "Databrain" reference screenshot entirely. Per the user's explicit instruction, this document extracts the mockup's *core concepts* (token values, component patterns, layout rules) rather than treating it as a pixel-exact spec to copy — every section below says which parts are taken directly from the mockup versus reasoned from it.
**Companion documents:** `architecture.md` (v3.4), `prd.md` (v2.5), `database-schema.md`, `api-spec.md`, `Accounting_and_Finance_Full_Specification.md` (v3.1).

**v2.0 revision note:** cross-checked against `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md` plus four explicitly-raised requirements. Adds three new components to Section 8 (Print Options modal, Drill-Down pattern, Edit/Delete Request badge & flow), updates the Chart of Accounts tree manager's cross-reference (it pointed at a section that never existed in `architecture.md` v2.0 — now corrected), extends the relevant per-role dashboards in Section 12, and adds matching rows to Sections 13, 14, and 17. Nothing from v1.0 was removed or renumbered.

**v2.0.1–v2.2 revision notes:** companion-document version syncs (Nginx addition, `prd.md` requirements-validation pass), plus a new MFA entry step and a self-approval-aware Edit/Delete Request component. Superseded in detail by v3.0 below where the same components are touched again.

**v3.0 revision note — full visual-direction update from the supplied mockup:** this is the largest revision this document has had. **What changed:** the entire color system (Section 2) — brand color moves from red to blue (`#2F6FED`), the sidebar becomes a dark navy panel (`#0A1730`) rather than a light one, and the earlier mislabeled-swatch problem (§2, v2.1) is moot — the mockup defines every token unambiguously, with no source-swatch conflict to resolve. The type scale (Section 3) is refined slightly (h1 28→26px, h2 20→18px, h3 16→15px — tighter, denser hierarchy). The component library (Section 8) grows substantially: delta pills on stat cards, a donut-chart-with-center-label pattern, an activity feed, a quick-actions grid, six badge colors instead of four, a row-action kebab menu, a Chart-of-Accounts tree view, financial-statement row formatting (section/sub/total/grand), and command-palette search (`Ctrl+K`) confirmed as built, not just proposed. The application shell (Section 7) gets exact, tested responsive breakpoints (1180px / 1023px / 767px) and a sidebar branch-switcher chip. **What did not change:** the underlying design philosophy (Section 1), the anti-AI-generic-look anti-pattern list (Section 14, still fully in force against the new token set too), accessibility rules (Section 15), and asset conventions (Section 16) — none of these were about color or layout specifics, so none needed touching. Every per-role dashboard's *content* (Section 12 — which stat cards, which charts, per `prd.md`'s actual metrics) is unchanged; only the visual treatment of those cards changes, per Section 8's updated component specs.

---

## 0. How To Use This Document

This file is **mandatory and binding**, not a suggestion. It exists so that no screen in this product is designed ad hoc — by a human, by Claude Code, or by any other AI assistant working on this codebase.

Rules for anyone (human or AI) building UI for this project:

- **Every screen must be built from the tokens and components defined here.** Do not invent a new color, font size, spacing value, card style, or button shape "because it looks fine" — if it isn't in this document, either it's missing and should be added here first, or it shouldn't exist.
- **Section 12 (Per-Role Dashboard Requirements) and Section 14 (Anti-Patterns) are the two sections most likely to be skipped under time pressure. Both are mandatory.**
- If a new component or pattern is genuinely needed and isn't covered here, propose an addition to this file first (following the token system already defined), then build it. Don't design in isolation and leave this document stale.
- This document intentionally does not hard-code copy strings, demo numbers, or sample names as literal content to paste into the UI — see Section 16. It defines the *rules* those must follow, not a script to copy-paste, because copy-pasted placeholder text is exactly what makes an interface look unfinished and synthetic.
- Nothing in this document should read, in the shipped product, as identifiably AI-generated. Section 14 lists the specific tells to eliminate. Treat that section as a pre-ship checklist, not background reading.

---

## 1. Design Philosophy & Principles

Brother's Technology System is an internal, multi-branch operations platform — not a consumer SaaS product and not a marketing site. The people using it are back-office staff, field technicians, accountants, and branch managers who will open it dozens of times a day. Every design decision should serve that reality.

1. **Operational clarity over decoration.** The interface's job is to let someone find a number, approve something, or finish a form quickly. Visual polish supports that goal; it never competes with it.
2. **Numbers are the hero, not illustrations.** This product runs on inventory counts, taka amounts, dates, and statuses. Typography and layout should make numbers and statuses instantly scannable — not sit behind generic stock-illustration decoration.
3. **One product, many surfaces.** The same visual language must feel native on a desktop back-office screen and a technician's phone mid-job. Density and layout adapt; color, type, and component identity do not.
4. **Nothing is generic.** Every dashboard, list, and form in this product is grounded in a real Brother's Technology System workflow (a `ServiceAssignment`, a `PayslipLine`, an `ApprovalRequest`). Layouts borrowed from the reference dashboard must be re-grounded in this domain's real content and real actions — never left as a re-skinned copy of the reference with BTS labels pasted over unrelated content (see the property-listing cards and world map in the reference — Section 12 explains what replaces each of these and why).
5. **Restraint.** One accent color carries the emphasis. Motion is used to explain a state change, never as decoration. A screen with fewer, better-chosen elements beats one that uses every component in this library at once.

---

## 2. Design Tokens — Color System

Color values are taken directly from `bts-dashboard-mockup.html`'s CSS custom properties — every one of them is an exact, unambiguous, already-in-use hex value, unlike the earlier reference screenshot this document used before v3.0. Wire these into the Tailwind theme (`tailwind.config`) as named tokens, and reference the token names in code, never raw hex.

| Token name | Hex | Role |
|---|---|---|
| `color-primary` | `#2F6FED` | Brand blue. Primary buttons, active nav item, active pagination, focus rings, brand mark, links. The one accent color per screen (Principle 5) — replaces the earlier red primary from v2.x entirely. |
| `color-primary-hover` | `#1E56C9` | Hover/pressed state for `color-primary` surfaces — not a separate brand color, purely an interaction state. |
| `color-primary-tint` | `rgba(47,111,237,.10)` | Light fill: selected nav-adjacent backgrounds, icon chips, hovering a quick-action button. |
| `color-primary-tint-strong` | `rgba(47,111,237,.16)` | Text selection highlight, stronger emphasis fills than `color-primary-tint`. |
| `color-success` | `#16A34A` | Positive states: approved, in stock, profit, completed, upward KPI delta. |
| `color-success-tint` | `rgba(22,163,74,.12)` | Background for success badges/pills — never used with `color-success` text alone at body-text contrast; always paired via the badge component (Section 8). |
| `color-warning` | `#DA8B14` | Attention states: pending approval, low stock, aging advance, upcoming installment. Badge/pill text color specifically (not the tint). |
| `color-warning-tint` | `rgba(240,194,68,.20)` | Warning badge/pill background. |
| `color-danger` | `#D73E3D` | Negative states and every destructive action: rejected, overdue, out of stock, loss, delete/reject buttons. This is the *only* place the old v2.x primary red survives — now correctly scoped to danger/destructive only, never competing with the brand color for attention. |
| `color-danger-tint` | `rgba(215,62,61,.12)` | Danger badge/pill background, notification-count dot background is the solid `color-danger` itself (not the tint) per Section 8. |
| `color-purple` | `#7C5CFC` | Fourth chart series / category color; avatar gradient partner color (paired with `color-primary` in a diagonal gradient, Section 8). |
| `color-purple-tint` | `rgba(124,92,252,.12)` | Purple badge/pill background. |
| `color-teal` | `#0EA5A0` | Fifth chart series / category color, for screens needing more than four distinct series (e.g., Sales by Category donut with 5 segments). |
| `color-teal-tint` | `rgba(14,165,160,.12)` | Teal badge/pill background. |
| `color-ink` | `#0D0B33` | Primary text color and headings. |
| `color-text-muted` | `#5C5C5C` | Secondary text: sublabels, captions, helper text, timestamps, table headers. |
| `color-border` | `#E4E6ED` | Card borders, table row dividers, input borders. **No longer a derived/uncertain value** — confirmed directly from the mockup's own token set, resolving the v2.1–v2.2 open issue below. |
| `color-surface` | `#FFFFFF` | Card and panel backgrounds. |
| `color-page-bg` | `#F5F6FA` | App background behind cards. **Also now confirmed directly**, resolving the same open issue. |
| `color-sidebar-bg` | `#0A1730` | The sidebar's own background — a dark navy, not a light panel. This is the single biggest visual change from v2.x: the sidebar is now a dark, high-contrast surface against the light `color-page-bg` content area, not a light sidebar matching the page. |
| `color-sidebar-bg-hover` | `#132646` | Sidebar nav-item hover background. |
| `color-sidebar-text` | `#9FACCB` | Default (inactive) sidebar nav-item text — a muted blue-grey, not the light-mode `color-text-muted`. |
| `color-sidebar-text-active` | `#FFFFFF` | Active/hovered sidebar nav-item text. |

**v2.1–v2.2's open issue is resolved as of v3.0, not carried forward:** the earlier mislabeled-swatch ambiguity around `color-page-bg`/`color-border` (both previously "provisional, derived, needs source confirmation") is moot — `bts-dashboard-mockup.html` states both values directly and unambiguously as working CSS, already used consistently across all 49 of its views. No further brand-owner confirmation step is needed for these two tokens specifically.

**Dark mode:** still not required for v1 as a *toggleable* app-wide mode — but note that the sidebar itself is now permanently a dark surface by design (not a future dark-mode variant), so any component that can appear inside the sidebar (nav items, the branch-switcher chip, the brand tagline) must be designed against `color-sidebar-bg`'s contrast requirements from the start, not treated as a content-area component reused there unchanged.

---

## 3. Design Tokens — Typography

**Typeface:** Manrope (Google Fonts), for everything — headings, body, labels, numbers. Unchanged from v2.x — the mockup confirms the same family, weights 400/500/600/700/800.

Weights available and their role:

| Weight | Use |
|---|---|
| Regular (400) | Body text, table cell content, form input text |
| Medium (500) | Sublabels, secondary emphasis, active nav item |
| SemiBold (600) | Card titles, section headings, stat card labels |
| Bold (700) | Big KPI numbers, page titles, primary headline figures |

Type scale (desktop; scale down one step on mobile per Section 15) — **refined in v3.0 to the exact values `bts-dashboard-mockup.html` uses across all 49 views** (tighter than v2.x's scale, denser hierarchy):

| Token | Size / Line-height | Weight | Use |
|---|---|---|---|
| `type-display` | 32px / 40px | Bold, tabular-nums | Big KPI numbers on stat cards (e.g. a project count, a taka total) — unchanged from v2.x |
| `type-h1` | 26px / 34px | Bold | Page title ("Dashboard", "Purchase Orders") — was 28/36 in v2.x |
| `type-h2` | 18px / 26px | SemiBold | Section/card headings ("Revenue & Profit Trend", "Recent Orders") — was 20/28 in v2.x |
| `type-h3` | 15px / 22px | SemiBold | Sub-section headings, table group headers — was 16/24 in v2.x |
| `type-body` | 14px / 20px | Regular | Default body text, table cells, form values — unchanged |
| `type-body-strong` | 14px / 20px | Medium | Emphasized inline text, list item primary text — unchanged |
| `type-caption` | 12px / 16px | Regular | Timestamps, helper text, sublabels under a KPI number — unchanged |
| `type-label` | 12px / 16px | Medium | Form field labels, table column headers, badge text |

Rules:
- Sentence case everywhere. Do not use uppercase for labels, column headers, or badges — it's a template default, not a deliberate choice for this product. The only acceptable uppercase is a genuine fixed abbreviation the business already uses (`GRN`, `PO`, `VAT`, `SKU`) — never a stylistic label like "STATUS" or "TOTAL REVENUE".
- Never simulate emphasis by bolding or coloring a single word inside a heading or sentence. If something needs emphasis, it earns its own line, badge, or stat card.
- Line length for body/paragraph text (help text, empty-state copy, modals) stays under ~75 characters per line.
- Numbers (currency, counts) always use tabular figures where the font/library supports it, so numbers align in columns and don't jitter when they update in real time (relevant for the live-updating reconciliation figures in Section 11).

---

## 4. Design Tokens — Spacing, Radius, Elevation, Grid

**Spacing scale** (4px base unit — use these exact steps, nothing in between):
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64` (px)

- Inside a component (icon-to-label gap, padding inside a badge): 4–12px.
- Between related elements (label and its value, a card's internal sections): 16–20px.
- Between unrelated blocks (between two stat cards, between a card and the section below it): 24–32px.
- Page-level margins (content area padding from the viewport edge): 32px desktop, 16px mobile.

**Radius:**
- `radius-sm` (6px): inputs, small badges, buttons.
- `radius-md` (12px): cards, modals, dropdown menus.
- `radius-full`: pills/status badges, avatars.
- Do not apply the same radius to every element regardless of hierarchy — that flattening is what makes an interface look like an unstyled component kit. A stat card, a badge inside it, and the button inside that card should each use the radius that matches their scale (`md`, `full`, `sm` respectively), not all `md`.

**Elevation:** two levels only.
- `elevation-1`: resting cards — `0 1px 2px rgba(13,11,51,0.06)`. Subtle, barely visible; separation comes primarily from `color-page-bg` vs `color-surface` contrast, not from shadow.
- `elevation-2`: popovers, dropdowns, modals — `0 8px 24px rgba(13,11,51,0.12)`.
- Never stack a heavier shadow on every card "for depth." Flat cards on a tinted page background (as in the reference) already read as elevated; a heavy identical shadow under every card is the generic SaaS-kit tell to avoid.

**Grid:**
- Desktop content area: 12-column grid, 24px gutters, max content width 1440px (wider dashboards can use full width; forms and detail views cap at ~960px so line lengths stay readable).
- Standard dashboard row: 3 stat cards at 4 columns each, or a primary chart at 8 columns paired with a secondary panel at 4 columns (matches the reference's proportions).
- Sidebar: fixed 240px on desktop, collapses to icon-only 72px at the tablet breakpoint, becomes a bottom tab bar or slide-out drawer on mobile (Section 15).

---

## 5. Iconography

- **Icon set:** `lucide-react` throughout (already available in this stack). Do not mix in a second icon library, emoji-as-icons, or hand-drawn/duotone icon packs — visual consistency of stroke weight matters more than any single icon being "cuter."
- **Stroke width:** 1.75px at 20px size (the default that keeps icons legible at the sizes used in the sidebar and table row actions).
- Icons are functional, not decorative. Don't add an icon to a stat card, table column, or heading unless it helps someone recognize or scan faster than the label alone would. The reference dashboard's sidebar icons (dashboard grid, people, chart, gear) are a good density — don't go further and start iconizing every KPI card too.
- Status is communicated primarily through the badge/pill component (Section 9), not through icon shape or color alone — icons next to a status badge are a bonus for scannability, never the only signal (accessibility, Section 15).

---

## 6. Additional Frontend Technology

`architecture.md` (Section 3) already fixes the core stack: Next.js + TypeScript + Tailwind + shadcn/ui, Zustand for workspace state, Socket.IO for realtime. The following libraries are approved additions specifically to achieve the visual/interaction quality this document requires — do not reach for alternatives to these without updating this section first:

| Need | Library | Why this one |
|---|---|---|
| Charts (bar, line, area, donut) | `recharts`, via shadcn/ui's `chart` wrapper | Composes directly with the existing Tailwind/shadcn setup and token system (Section 10) instead of pulling in a separately-themed charting kit. |
| Branch/coverage map | `react-simple-maps` + a Bangladesh division/district GeoJSON | The reference's world map is irrelevant to a single-country, multi-branch business (Section 10 explains the replacement) — a lightweight SVG map keyed to real administrative boundaries is the correct tool, not a heavier map SDK, since this view is a static choropleth, not an interactive live map. |
| Live technician tracking map | Google Maps JS API (already specified in `architecture.md` Section 3) | Used only where live GPS pins and routes are genuinely needed (Section 21) — not for the branch-overview choropleth above. |
| Toasts | `sonner` | Lightweight, matches shadcn/ui conventions, supports the "same verb throughout a flow" rule in Section 13. |
| File/image upload (receipts, cheque photos, NID, signatures) | `react-dropzone` + client-side image compression before upload | Every one of these upload points (Sections 28–29 of `architecture.md`) needs the same drag/drop-or-browse, preview-before-submit pattern — build it once as a shared component (Section 9), not per module. |
| Command palette / global search | `cmdk` | Powers the top-bar search (Section 8) as a real fuzzy command palette (jump to a module, an invoice number, a customer) rather than a decorative input box that does nothing until a backend search endpoint exists. |
| Motion | `framer-motion`, used sparingly | Reserved for state-driven transitions (Section 11) — a drawer opening, a number updating — never for scroll-triggered entrance animations on every card. |
| Date/time formatting | `date-fns` with the `Asia/Dhaka` timezone applied at the formatting layer | Matches the localization requirement in `architecture.md` Section 23. |

---

## 7. Application Shell & Navigation

**Structure and exact breakpoints below are taken directly from `bts-dashboard-mockup.html`** — these are working, tested values across 49 views, not a proposal:

- **Top bar** (64px height, `color-surface` background, bottom hairline `color-border`):
  - Left: hamburger menu (mobile/tablet only, Section 15) + BTS logo mark + wordmark + the brand tagline **"Smarter Business. Better Tomorrow."** in `type-caption`/`color-text-muted`, hidden below 1023px.
  - Center-left: global search (the `cmdk` command palette from Section 6) — confirmed built as `Ctrl/Cmd+K`, fixed width ~360px on desktop, expands to full width on focus, collapses to an icon-only trigger below 1023px.
  - Right, in order: a filter icon (context-sensitive, as before), **three dropdown triggers — Calendar, Chat/Messages, Notifications** (each an icon button with an unread-count badge using `color-danger` as a solid dot, opening a `dropdown-panel`, Section 8), then the user menu (avatar, name, role, a dropdown for profile/settings/logout).

- **Sidebar** (240px desktop, `color-sidebar-bg` background — **dark, not light, as of v3.0**):
  - Grouped by domain, not a flat alphabetical list: Dashboard first, then operational groups (Sales, Inventory, Field Service, Finance, HR) matching the domains in `architecture.md` §39, then Settings/Security last. Each group is collapsible (chevron-rotate on click, per Section 11's motion rule) — expanded by default only for the group containing the current active page.
  - Nav item text: `color-sidebar-text` (inactive) → `color-sidebar-text-active` + `color-sidebar-bg-hover` background (hover/active) — never `color-primary` text directly on the dark sidebar background (contrast-insufficient at body-text size; the active *indicator* is the background fill + a `color-primary` left border, 3px, not the text color itself).
  - Badge counts (pending approvals, etc.) use a small `color-primary` pill, reserved for counts that require action.
  - **Branch-switcher chip**, fixed to the sidebar footer above the collapse toggle: current branch name + a small chevron, opening a lightweight dropdown of the user's accessible branches (Super Admin/Admin see all; every other role sees only their assigned branch(es), per `prd.md` §6.1 — the chip itself is hidden entirely, not just disabled, for a single-branch user with nothing to switch to).
  - **No upsell/upgrade card anywhere in the sidebar** — unchanged rule from v2.x, now applying to a dark sidebar footer instead of a light one; the same reasoning (no pricing tiers exist in an internal ops tool) still governs the footer slot, which holds only the branch chip and collapse toggle.

- **Multi-Module Workspace taskbar** (`architecture.md` §41's equivalent capability — no equivalent in the mockup, designed fresh, unchanged from v2.x): a slim (40px) bar fixed to the bottom of the viewport, appearing only when at least one module is minimized.

- **Responsive breakpoints — exact values confirmed from the mockup's own tested CSS, more specific than v2.x's general guidance:**
  - **≥1180px:** full three-column layouts (e.g., Dashboard's stats/table/activity row) render side by side.
  - **1023–1179px:** three-column rows collapse to a single stacked column; sidebar stays full-width (240px).
  - **768–1023px:** sidebar collapses to icon-only (72px, per Section 4) — the collapse is a fixed breakpoint behavior here, not just a manual user toggle as v2.x implied; a user can still manually expand it temporarily, but it defaults to icon-only in this range.
  - **≤767px:** sidebar becomes a full-screen overlay drawer, opened via the top bar's hamburger icon and closed by a scrim tap or an explicit close action — never a permanently-visible sidebar below this width, on any role's screen including the Technician PWA.

---

## 8. Core Component Library

Every component below is built once, in the shared `packages/ui` (per `architecture.md` Section 5), and reused everywhere — never rebuilt per-module with slightly different padding or radius.

**Buttons**
- Primary (`color-primary` fill, white text, `radius-sm`): the one primary action per screen/section.
- Secondary (outline, `color-ink` text, `color-border` border): secondary actions.
- Ghost (no border/fill, `color-primary` text): tertiary/inline actions (e.g. "View details").
- Destructive (`color-danger` fill): reject/delete/discard only, always with a confirming dialog for anything irreversible. **v3.0 note:** `color-danger` is no longer shared with the brand primary (that was a v2.x consequence of red being both brand and danger) — a destructive button and a primary button are now unambiguous by color alone as well as by label.
- Sizes: 40px (default), 32px (compact, inside tables/toolbars).

**Stat / KPI card:**
- Structure, refined in v3.0 to match the mockup's tested pattern exactly: a small icon chip (top-left, `color-primary-tint` background, an outline icon at 20px), a `type-caption`/`color-text-muted` label, a `type-display` bold number below it, and a **delta pill** (bottom, not inline with the number) — an up/down triangle glyph + percentage in `type-caption`, `color-success`/`color-danger` text on the matching tint background, plus a trailing muted phrase ("vs last month") so the comparison period is never ambiguous.
- Never invent a KPI to fill a row — every stat card must map to a number defined in `prd.md` §8.10 or §12. If a screen only has two meaningful KPIs, ship two cards, not three with a filler.

**Data table**
- Every list screen gets: the search bar + filter panel from `architecture.md` §18, sortable column headers (`type-label`, sentence case), row hover state (`color-page-bg` tint), and a **row-action kebab menu** (⋮, trailing column) opening a small dropdown of actions — replacing v2.x's "trailing icon-button group," per the mockup's consistent pattern across all 49 list views: a row with 3+ possible actions (view/edit/duplicate/export/delete) is visually cleaner as one kebab trigger than 3+ always-visible icons, and it scales to a row needing a 4th or 5th action later without redesigning every table.
- Status columns render the **status badge** component (below), never raw colored text.
- Pagination: numbered + prev/next, page size selector, total-count label ("Showing 1–20 of 248"), active page number in `color-primary` fill.
- Empty state: see Section 13.

**Status / approval badge — six colors as of v3.0 (was four in v2.x):**
- Pill shape (`radius-full`), tint background + full-strength text: `color-success` (approved/paid/in-stock), `color-warning` (pending), `color-danger` (rejected/overdue), `color-primary` (in-progress/active — new), `color-purple` (a distinct category state — e.g. "Draft" or a fourth workflow stage where success/warning/danger don't fit), `color-teal` (a fifth, rarer state) — `color-text-muted`/no-tint for neutral/draft where none of the six semantic colors genuinely apply.
- Label text is the actual status word from the data model (`architecture.md`'s enums), sentence case — never a re-worded synonym that no longer matches the audit trail.

**Activity feed** (new in v3.0, confirmed built in the mockup's Dashboard and several module-dashboard views): a vertical list of recent-event rows, each with a small colored dot (the event-type's semantic color, matching its badge color) + a one-line description in `type-body` + a `type-caption`/`color-text-muted` relative timestamp ("2h ago"). Used specifically for "what just happened" context, distinct from the Approval Inbox (below) which is "what needs my decision" — a feed item is never itself actionable; if it needs an action, it belongs in the inbox instead, not duplicated in both places.

**Quick actions grid** (new in v3.0): a small grid (2×2 or 3×2 depending on available space) of icon+label buttons for a role's most common create-actions (e.g., Sales Executive's dashboard: New Quotation, New Order, Record Payment, New Ticket) — `color-primary-tint` icon chip on `color-surface`, hover lifts to `color-primary` fill. Never more than 6 actions; a role needing more than 6 frequent shortcuts has a scope problem to raise (`prd.md` §6.1), not a grid to make bigger.

**Dropdown panel** (new in v3.0 — the Notification/Chat/Calendar top-bar triggers, Section 7): a floating panel (`radius-md`, `elevation-2`) anchored below its trigger icon, with a header (title + a "Mark all read"/"View all" ghost-action where relevant), a scrollable list of items (each following the Activity Feed's row pattern above for Notifications specifically), and a footer link to the full page for that domain. Closes on outside click or `Escape` — never requires its own explicit close button, unlike a Modal (below), since it's lightweight, contextual chrome, not a task surface.

**Chart card** — see Section 9.

**Map card** — see Section 10.

**Approval inbox item** (new — required by `architecture.md` Section 10's "My Approvals" inbox): a compact card showing the approval type badge, requester, amount (right-aligned, tabular figures), the linked project/reference, and two inline actions (Approve / Reject) — reject always opens a required-reason field before submitting, approve is a single click for low-risk types and a confirm step for anything above a configurable amount threshold.

**File/image upload** (new — required by the receipt/cheque/NID upload points across the product): drag-and-drop zone with a browse fallback, live thumbnail preview, a visible file-size/type constraint line, and a required flag when the business rule demands it (e.g. a bank-mode payment cannot be marked paid without one, per `architecture.md` Section 29) — the required state is a `color-danger`-bordered empty zone with inline copy naming exactly what's missing, not a generic red asterisk.

**Export menu** (`architecture.md` Section 16, extended by Section 33): a single dropdown, consistent placement (top-right of every list/report/document screen), with **Print** pinned as the first item (a divider beneath it), followed by the four download formats (CSV, PDF, Word, XML) — icons distinguish each at a glance, no extra chrome. Selecting Print or PDF on an outbound document triggers the Print Options modal (above) first; every other item renders immediately.

**Chart of Accounts tree manager** (new — required by the Chart of Accounts hierarchy, `Accounting_and_Finance_Full_Specification.md` Section 65 — corrected in v2.0; this previously pointed at "`architecture.md` Section 30," which did not exist in `architecture.md` v2.0): a nested, indented list (not a generic data table) — each row shows an expand/collapse control (only if it has children), the account name (inline-editable on click), its account code if set, and a trailing action group (Add child, Move up/down, Deactivate). Group rows render in `type-body-strong`; leaf rows in `type-body` with a small muted "leaf" indicator (a dot or tag) so the group/leaf distinction from the data model is always visible, not just enforced behind the scenes. Reordering siblings uses simple Move up/down icon-buttons, not a drag-and-drop library — this tree is edited occasionally, not constantly, so a small extra dependency isn't justified here (Section 6 stays as specified: no new library added for this). The five root nodes (Assets, Liabilities, Equity, Income, Expenses) render without an Add-sibling or Delete action, only Add-child — visually signaling that they're permanent without needing a disabled-button tooltip to explain why. A `isControlAccount` row (Finance spec Section 65.2) gets a small "Control" tag next to its name — a visual cue that this account's balance is expected to always match a subledger total, so no one mistakes it for an ordinary posting account.

**Print Options modal** (new — required by the Universal Print & Letterhead Toggle Engine, `Accounting_and_Finance_Full_Specification.md` Section 66 / `architecture.md` Section 33): a short, single-purpose modal (per the Modals/Drawers rule below) shown once per print/export action on an outbound document —

```text
Include company letterhead header/footer?

[ Yes, include letterhead ]     [ No, plain print ]

☐ Remember my choice for this document type
```

Both buttons are equal-weight secondary buttons (this is a genuine either/or choice, not a primary/cancel pair) side by side, `radius-sm`, with the "Remember my choice" checkbox left-aligned beneath. Confirming either option immediately renders the print/PDF output — the modal never blocks on a second confirmation. Purely internal reports (Ledger, Trial Balance, P&L, dashboards, the Voucher Register) never trigger this modal — their **Print**/**Export ▾** controls render immediately, plain, with no prompt. Once a user has set "Remember my choice" for a document type, the **Print**/**Export ▾** controls skip the modal on subsequent actions but always expose a small "Change letterhead preference" ghost-button next to the result so the choice is never permanently locked in.

**Drill-down pattern** (new — required by the Universal Report & Dashboard Drill-Down Standard, `Accounting_and_Finance_Full_Specification.md` Section 68 / `architecture.md` Section 35): applies to every stat/KPI card (above), every chart data point (Section 9), and every report line item (Sections 8, 12) that represents an aggregate figure. The number itself is rendered as a ghost-button-style clickable element (underline-on-hover only, not a permanently-underlined link — a dashboard full of underlined numbers reads as noisy) that opens a side drawer (per the Modals/Drawers rule below) titled with the exact figure and its filter context (e.g. "Technician Cost — ৳340,000 — Project #SA-2291"), containing the pre-filtered breakdown list (the data-table component, above) of the transactions behind it. Each row in that breakdown list is itself clickable through to its source voucher/invoice/bill (Finance spec Section 68.2's "Source Document" tier), opened as a further drawer layered on top — never a full page navigation that loses the dashboard underneath. A figure with no drill-down path is a build defect, not an acceptable simplification — never ship a stat card or report line as plain, non-interactive text.

**Edit/Delete Request badge & flow** (new — required by Data Edit & Delete Governance, `Accounting_and_Finance_Full_Specification.md` Section 67 / `architecture.md` Section 34): once a record has left DRAFT status, its Edit/Delete controls are replaced — not merely disabled — with a single button reading **"Request edit"** / **"Request delete,"** styled as a secondary button with a small lock-outline icon (`lucide-react`, per Section 5). Clicking it opens a short modal capturing the mandatory reason (and, for edits, the changed fields inline, shown as a before/after two-column diff). Once filed, the record header shows a status badge (the existing badge component, above) reading **"Edit pending approval"** or **"Delete pending approval"** in `color-warning`, visible to anyone who can see the record — this is not hidden from non-Super-Admin viewers, since the pending state itself is not sensitive. The Super Admin's own "My Approvals" inbox (the approval-inbox-item component, above) gets a filter chip for these two types, and opening one shows the same before/after diff plus Approve/Reject actions. **v2.1 addition — self-approval prevention (`prd.md` Section 9.6):** if the item in the inbox was filed by the Super Admin currently viewing it, the Approve/Reject buttons are replaced with a disabled state reading **"Awaiting another approver — you filed this request"** rather than silently hiding the row. This is a real gap the PRD itself flags as unresolved (see its Section 14): the component is built to make that gap visible in the product rather than pretend it's handled, until a fallback approver mechanism exists to route to.

**Financial statement rows** (new in v3.0, confirmed built for Trial Balance/P&L/Balance Sheet views): a distinct row hierarchy separate from the standard data table — `statement-section` (a group header, `type-h3`, e.g. "Revenue," "Operating Expenses"), `statement-row` (a normal line item, `type-body`, amount right-aligned in tabular figures), `statement-subtotal` (a light top-border, `type-body-strong`), and `statement-grand-total` (a `color-primary-tint` background band, `type-h2`, top-and-bottom border) — this four-tier hierarchy is used consistently across every financial statement so a user's eye learns it once and reads any statement in the product the same way.

**Toggle switch** (new in v3.0): standard on/off switch (`color-primary` when on, `color-border`-grey track when off) for boolean settings (feature flags, notification preferences, the letterhead-remember-choice pattern above could use this instead of a checkbox where it reads more naturally as on/off rather than a one-time choice).

**Category / settings card** (new in v3.0): a clickable card (icon chip + title + one-line description + chevron) used for grid-of-options screens — the System Administration and Reports landing pages specifically, where a role picks a sub-area rather than seeing a data table.

**Role / permission row** (new in v3.0, for the Admin Permission Migration Matrix's eventual settings UI, `admin-permission-migration-matrix.md`): a row per role showing its name, a short description, member count, and a trailing edit action — expands in place (not a drawer) to show the full permission grid for that role, since this is inherently a dense, wide grid better read in-line than squeezed into a drawer's narrower width.

**Module-specific row patterns** (new in v3.0 — confirmed as a *pattern*, not a fixed list; extend it the same way for any future module's list view): several modules need a richer row than the standard data table provides — a warehouse row showing a small stock-level bar alongside its numbers, a supplier row with a small logo/initial avatar, a tree-style row for hierarchical data (Chart of Accounts, below). These are the standard data table's row slot customized per module's specific data shape, not a competing table component — the surrounding chrome (header, search, pagination) stays identical everywhere.

**Modals / drawers:** modals for short, single-purpose actions (approve, confirm, quick-edit, the Print Options prompt above); side drawers for anything that needs more room (a full form, a record's detail view, a drill-down breakdown above) so the user's place in a list is never lost.

**Toasts** (`sonner`): bottom-right, auto-dismiss after 4s for confirmations, persistent (manual dismiss) for errors. Copy rules in Section 13.

**MFA entry step** (new — required by `prd.md` Section 10.5, mandatory for Super Admin and Accounts/Finance only): a second, separate screen after password entry, not a modal over it — treat it as its own step in the login flow rather than an interruption. A single 6-digit code input (auto-advancing per digit, numeric keyboard on mobile), the same `type-h2`/`type-body` type scale as any other form, a "Resend code" ghost-button with a 30-second countdown, and no CAPTCHA-style distortion or decoration — this is a security step, not a puzzle. Roles that don't require MFA never see this screen at all; it isn't shown-then-skipped.

---

## 9. Charts & Data Visualization

- Library: `recharts` via shadcn/ui's chart wrapper (Section 6) — the mockup itself uses Chart.js, but `recharts` stays the choice here since it's already wired into this project's component approach (Section 6) and switching libraries for chart-fidelity reasons alone isn't justified; the *visual pattern* below is what's taken from the mockup, not its charting library.
- Bar charts use a gradient-fill treatment (full-opacity at the top of the bar fading toward the axis) **only** where it aids readability of a two-series comparison (e.g. revenue vs. cost); don't apply the gradient decoratively to single-series bars where a flat fill reads more clearly.
- Two-series comparisons use `color-primary` and `color-purple` (never `color-primary` twice at different opacities to fake a second series). A third series adds `color-teal`; beyond three, reconsider whether the chart is trying to show too much at once rather than adding a fourth color.
- **Donut chart with center label** (confirmed pattern from the mockup, used for category-breakdown cards — "Sales by Category," "Expense Breakdown"): a standard donut, segments in `color-primary`/`color-purple`/`color-teal`/`color-warning` in that priority order, with the total figure rendered in `type-h2` at the exact center of the ring (not beside the chart) and a simple color-dot + label + value legend below it, never a legend crowded inside the chart area itself.
- **Line chart** (revenue/profit trend cards): `color-primary` for the primary series, a light `color-primary-tint` area fill beneath the line, data points appearing only on hover — no permanently-visible dot markers cluttering a dense multi-month trend line.
- Tooltip: a dark pill tooltip pattern — `color-ink` background, white text, appears on hover/tap, shows the exact value with the correct unit (৳ for currency, not $).
- Every chart needs a real, current data source. If a chart has no data yet for a given filter (e.g. a brand-new branch with no sales history), show the chart's empty state (Section 13), never a chart pre-populated with placeholder numbers "to show what it'll look like."

---

## 10. Maps & Geo-Visualization

Two distinct map needs exist in this product — do not conflate them into one component:

### 10.1 Branch/Coverage Overview

Replaces the reference's world map: a Bangladesh choropleth (division or district level, depending on how granular branch data is) shaded by whatever metric the dashboard is about — sales volume, active technicians, open tickets. Built with `react-simple-maps` (Section 6). Static, no pan/zoom controls needed (the reference's zoom buttons don't apply here — the whole country fits in a card).

### 10.2 Live Technician Tracking

The actual Google Maps embed (`architecture.md` Section 21), with live pins updating over the existing Socket.IO channel, geofence circles at customer addresses, and a route trail for completed visits. This is a full-featured interactive map with its own pan/zoom — used on the Branch Manager and Admin dashboards (Section 12) and inside a single technician's assignment detail view, not on every screen.

---

## 11. Motion & Interaction

- Default transition: 150–200ms ease-out for hovers, dropdown/menu open, and tab switches.
- The Multi-Module Workspace taskbar (Section 7) and the real-time advance/conveyance reconciliation figures (`architecture.md` Section 28) are the product's two legitimate "something changed, show it" moments — animate those deliberately (a number rolling to its new value, a pill sliding into the taskbar). Don't add scroll-triggered fade-ins to dashboard cards, table rows, or sidebar items; a dashboard the user opens dozens of times a day should render instantly and completely, not perform an entrance animation every time.
- Loading state: skeleton placeholders shaped like the real content (a stat card skeleton is a card-shaped grey block, not a spinner floating in empty space). Skeletons for anything expected to load in under ~2 seconds; a progress indicator with a status line for anything longer (e.g. a queued CSV export per `architecture.md` Section 16).

---

## 12. Per-Role Dashboard Content — What Must Be Visualized

This is the direct answer to "which things must be shown on the dashboard," per role. Every dashboard follows the reference's overall rhythm (stat cards → primary chart + side panel → a list/grid below) but each card and chart must map to a real number from `prd.md`. Nothing here is optional filler.

### 12.1 Super Admin / Admin (company-wide)
- **Stat cards:** Company revenue (this month, vs. last month), Active `ServiceAssignment`s in progress, Pending approvals (all types, count), Outstanding customer advance + outstanding company loan balance (combined liability view). Every card uses the Drill-Down pattern (Section 8) — clicking any figure opens its breakdown.
- **Primary chart:** Company-wide P&L trend, monthly, revenue vs. cost (two-series bar, Section 9) — each bar/point is drill-down-enabled per Section 8.
- **Side panel:** Branch coverage map (Section 10.1), shaded by revenue or open-ticket count.
- **List below:** Pending approvals queue (the approval-inbox-item component, Section 8), newest/highest-value first — this replaces the reference's property-listing grid with the thing an admin actually needs to act on daily. **Super Admin only:** a distinct, always-visible "Edit/Delete Requests" filter chip on this same queue (Section 8's Edit/Delete Request badge & flow) — this is the one approval type no other role can see or clear, so it never gets buried inside a generic "all types" filter.
- **Sidebar footer slot:** a "Needs attention today" summary (overdue loan installments + aging unreconciled advances + unresolved Suspense entries older than the business's tolerance, Finance spec Section 63.3) instead of an upsell card.

### 12.2 Accounts / Finance
- **Stat cards:** Cash position, Total customer dues outstanding, Company loan outstanding balance, Bank transactions missing proof (`architecture.md` Section 29 — a genuinely new, genuinely useful count that didn't exist before this feature), Unresolved Suspense balance (Finance spec Section 63). All drill-down enabled (Section 8).
- **Primary chart:** Department/head-wise expense breakdown (Module 58) — a stacked or grouped bar, not a generic pie chart, since comparing department magnitudes matters more than parts-of-a-whole here.
- **Side panel:** Aging report widget — a simple horizontal bar list of oldest unreconciled advances/overdue installments/unresolved Suspense entries, most urgent at top.
- **List below:** Recent transactions requiring bank-proof attachment, or the "My Approvals" inbox filtered to finance-type approvals (including Suspense reclassification requests, Finance spec Section 63.2).
- **Settings entry point:** a "Manage Chart of Accounts" link into the tree manager (Section 8, `Accounting_and_Finance_Full_Specification.md` Section 65) — this lives in Accounts/Finance settings, not buried in generic system admin settings, since Accounts is who actually maintains it.
- **Report screens** (Day Book, Cash Book, Bank Book, Receipt & Payment Statement, Voucher Register, Trial Balance, P&L, Balance Sheet — Finance spec Sections 37 & 62): every one gets the extended Export menu (Print pinned first, Section 8) and every line drills down (Section 8) — these are the highest-traffic screens for this role, so both patterns matter most here.

### 12.3 Branch Manager
- **Stat cards:** Branch sales (month), Branch stock value, Active technicians today, Branch-specific pending approvals.
- **Primary chart:** Branch sales trend, monthly.
- **Side panel:** Live technician tracking map (Section 10.2) scoped to the branch's own technicians.
- **List below:** Today's service assignments for the branch, with status badges.

### 12.4 Sales Executive
- **Stat cards:** My sales (month), My active customers, My KPI score, My pending customer advances to follow up.
- **Primary chart:** My sales trend.
- **List below:** My recent quotations/orders with status — quotation rows use the full `QuotationStatus` lifecycle badge (Draft/Sent/Accepted/Rejected/Expired/Converted, Finance spec Section 69.1) and each gets the Print + Export control (letterhead defaulting to "Yes," Section 8) for handing to a customer.
- **Secondary list:** Quotation Register + Win/Loss report (Finance spec Section 69.6), filterable to "my quotations."
- No branch-wide or company-wide figures — row-level scoped per `architecture.md` Section 2.

### 12.5 Warehouse / Inventory Staff
- **Stat cards:** Pending GRNs, Low-stock SKU count, Stock adjustments pending approval, Transfers in transit.
- **Primary view:** a table, not a chart-heavy dashboard — this role's daily work is list-driven (Section 8's data table component), sorted by urgency (low stock first).
- **Side panel:** SKU lifecycle "current status" widget — count of units in each lifecycle stage (`architecture.md` Section 7.6), as a simple horizontal bar, not a full chart.

### 12.6 Technician / Field Staff (mobile PWA — layout differs entirely from desktop, per Section 15)
- **Not** a desktop-style stat-card dashboard. Mobile home screen is a vertical card stack:
  1. Today's assignments (primary content, first thing visible).
  2. **My Salary summary** (`architecture.md` Section 28) — running month figure, with the advance/other-dues/project-reconciliation breakdown collapsed by default (tap to expand) so it doesn't crowd the assignment list.
  3. Quick actions: Request advance, Submit conveyance bill, Check-in/out for the active assignment.
- No map widget on the home screen itself — the live map is company/branch-manager-facing; a technician needs their own GPS status only inside an active assignment's check-in screen.

### 12.7 HR / Payroll Officer
- **Stat cards:** Employees on leave today, Pending employee loan requests, Current payroll run status, Attendance exceptions today.
- **Primary chart:** none required by default — this role's dashboard leads with the payroll-run status list and the approvals queue (loan/leave requests), since HR's daily work is approval- and record-driven, not trend-driven.

### 12.8 Customer Portal
- Not an admin-style dashboard at all — a simple "My Account" summary: outstanding due (large, prominent, since this is the one number a customer opens the portal to check), active orders/tickets list, recent invoices with download links (Section 8's export component, customer-facing subset: PDF only — a customer has no use for the XML/CSV formats meant for internal systems).

### 12.9 Vendor / Supplier Portal
- Similarly minimal: outstanding payments from BTS to the vendor, recent POs, and a statement download.

---

## 13. Content, Copy & Microcopy Guidelines

- Write from the user's perspective, in plain language: a technician "submits a conveyance bill," not "initiates a `ConveyanceBill` mutation." A branch manager "approves" a request; the system never says "process request."
- Use the same verb through an entire flow: if a button says "Approve," the resulting toast says "Approved" — not "Success!" or "Request processed."
- Every button describes exactly what happens: "Save changes," "Send invoice," "Request advance" — not "Submit," "OK," or "Confirm" alone.
- Empty states name the specific situation and, where relevant, the next action: "No pending approvals right now," "No technicians assigned yet — assign one to get started," "No sales recorded for this branch this month." Never a bare "No data available" or "Nothing here yet 🎉" — no emoji in system copy.
- Error messages state what happened and how to fix it, without apologizing or being vague: "This invoice number already exists in this branch," not "Oops! Something went wrong."
- No filler phrases anywhere in the product: no "Welcome to your dashboard!", no "We're glad you're here," no marketing-voice onboarding copy. This is a work tool people open dozens of times a day.
- Currency is always ৳ (BDT) formatted per the localization rule in `architecture.md` Section 23 — never `$`, even in placeholder/demo states.
- Bilingual labels (Bangla + English, per `architecture.md` Section 23): English is the default in this specification; wherever a Bangla string is shown alongside it, it follows the same sentence-case, no-filler rules — a literal, stiff translation of an English marketing phrase is as much a "generic" tell as the English original.
- The Print Options prompt (Section 8) always asks the same way — "Include company letterhead header/footer?" — never a reworded variant per module; consistency here matters more than novelty.
- The Edit/Delete Request notice (Section 8) states the rule plainly — "Requires Super Admin approval" — never a softened or apologetic variant ("Sorry, you can't do that right now"); the person needs to know exactly why the normal action is unavailable and what happens next (a request is filed, not silently blocked).

---

## 14. Anti-Patterns — What This Product Must Never Look Like

This section exists because the instruction was explicit: nothing in this product should be identifiable as AI-generated. These are the specific, checkable tells — check every screen against this list before it ships.

**Visual tells to eliminate:**
- The "SaaS-card kit" look: every single element in an identical rounded card with an identical soft grey shadow and no size/radius hierarchy. Section 4 already fixes two radius scales and two elevation levels specifically to avoid this — use them as specified, not uniformly.
- Decorative gradient washes, blob shapes, or abstract shapes used purely as background filler. If a gradient appears, it's the intentional bar-chart fill from Section 9 and nothing else.
- Generic stock-illustration people (undraw.co-style line-art figures) anywhere — empty states use short text (Section 13), not an illustration of a person looking at a magnifying glass.
- A near-black background with one neon accent, or a warm cream background with a terracotta accent — neither has any grounding in this brand's actual tokens (Section 2); don't drift toward either as a "modern dark mode" or "warm" shortcut.

**Copy/chrome tells to eliminate:**
- Tracked-out ALL-CAPS "eyebrow" labels above headings.
- Meta strings joined with middle dots ("Branch · Region · Status").
- Labels written as "Word — fragment" with a spaced em dash.
- A monospace font for small data labels or badges (this product uses Manrope everywhere, per Section 3 — no exceptions for "that data-y look").
- An arrow (→) appended to link or button text ("View report →").
- Numbered markers (01 / 02 / 03) on anything that isn't a genuine, business-defined sequence (a real onboarding checklist step order is fine; three unrelated stat cards numbered 01/02/03 is not).
- Bolding or coloring a single word inside an otherwise plain sentence or heading for emphasis.

**Data/content tells to eliminate (see also Section 16):**
- Lorem ipsum, "John Doe," "Company XYZ," "Test Customer," "Sample Product," or any other obviously-fake placeholder string appearing anywhere in a shippable screen.
- Round, suspiciously clean demo numbers everywhere (every stat card showing exactly 100, 1000, or 50%) — real operational data is irregular.
- A chart or map rendered with static placeholder data left in after the real data source was wired up.

---

## 15. Accessibility & Responsiveness

- Color is never the only signal for status — every status badge pairs color with a text label (Section 8); every chart series is distinguishable by more than hue alone where practical (pattern or direct labeling for critical financial charts).
- Visible keyboard focus states on every interactive element (buttons, table rows with actions, form fields) — do not suppress the default focus ring without providing an equally visible custom one.
- Text contrast meets WCAG AA against its background at every token pairing in Section 2 (verify `color-text-muted` on `color-surface` specifically — it's the tightest pairing in the palette).
- Respect `prefers-reduced-motion`: the deliberate transitions in Section 11 (taskbar, live-updating numbers) fall back to an instant state change, not a slowed-down version of the same animation.
- **Responsive behavior:**
  - Desktop (≥1024px): full sidebar + top bar layout as specified in Section 7.
  - Tablet (768–1023px): sidebar collapses to icon-only (72px); stat-card rows wrap to 2 columns.
  - Mobile (<768px, primarily the Technician/Sales PWA surfaces per `architecture.md` Section 20): sidebar becomes a bottom tab bar or slide-out drawer; dashboards switch to the single-column card-stack pattern (Section 12.6), never a horizontally-scrolled, shrunk-down version of the desktop grid.

---

## 16. Asset & Data Conventions

- **No content in the shipped product may be literal placeholder text.** Every label, empty state, and default value must be either a real string this product actually uses (an enum value from `architecture.md`, a real module name) or left genuinely empty with the empty-state treatment from Section 13 — never a filler string standing in for content that "will be added later."
- **Demo/seed data**, where needed for development or a demo environment, must look like real Brother's Technology System data: real-format Bangladeshi names, real district/branch-name conventions, BDT amounts at realistic (non-round) magnitudes, and dates within a plausible recent range — not obviously synthetic data that gives away a demo/AI origin the moment someone looks closely.
- **Branding:** this product has its own name and mark — it does not reuse "Databrain" (the reference's name/logo) anywhere. The reference is a structural and token source only, per the note at the top of this document.
- **Images** (product photos, technician-uploaded receipts/cheques, profile photos): real aspect ratios per component — product/catalog images 4:3, uploaded receipt/cheque images preserve their native aspect ratio with a max preview height (Section 8's upload component), profile avatars 1:1 with an initials-based fallback (not a generic silhouette icon) when no photo exists.

---

## 17. Compliance Checklist

Before any screen in this product is considered done, verify:

- [ ] Every color used is a named token from Section 2 — no raw/one-off hex values in code.
- [ ] Every text style is a named token from Section 3 — no one-off font sizes.
- [ ] Every card, badge, and button uses the radius/elevation rules from Section 4 (not the same radius on everything).
- [ ] Icons are `lucide-react` only, at the specified stroke width.
- [ ] Every stat card and chart on this screen maps to a real metric named in Section 12 or `prd.md` — nothing added just to fill a row of three.
- [ ] Status is shown with the badge component, never raw colored text.
- [ ] Empty and error states use real, specific copy per Section 13 — no generic placeholders.
- [ ] No item from the Section 14 anti-pattern list appears anywhere on this screen.
- [ ] Layout is verified at desktop, tablet, and mobile per Section 15.
- [ ] No literal placeholder/lorem-ipsum/fake-name content remains anywhere on the screen.
- [ ] Every stat card, chart point, and report line on this screen has a working Drill-Down path (Section 8) — none are plain, non-interactive text.
- [ ] Every outbound document's Print/Export triggers the Print Options letterhead prompt (Section 8); every purely internal report skips it.
- [ ] Any edit/delete action on a submitted/posted record shows the Edit/Delete Request flow (Section 8), not a direct Save/Delete — and the resulting badge is visible to anyone who can see the record.
