# Changelog

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is CalVer (`YYYY.M.x`).

## [Unreleased]

### Changed

- **`AppShell`'s `content="standard"` is renamed `content="prose"`.** Operator ruling, 31/07/2026: `"standard"` read as though it were the default, but it was always the 80rem-capped, reading-weight mode; `"prose"` says what it actually is. `"standard"` is kept as a deprecated alias mapping to the identical `mx-auto w-full max-w-[80rem]` class, purely so an existing caller's rendering does not change until it opts into the new name. The **default stays `content="full"`** (`w-full`, no max-width cap): it always has been, since the shell's very first commit (`c43cc60`) — this was never a fluid-vs-capped default flip, only the capped mode's name catching up to what it is. `"wide"` (120rem) is unchanged.

  Consumer impact, checked against every household frontend that renders `AppShell`: every one is unaffected by this release. `earworm` (`content="wide"`) and `eight` (`content="full"`) pass an explicit value untouched by the rename. `fixxxer`, `mission-command` and `seshat` pass `content="standard"`, which keeps rendering the identical 80rem cap via the alias. `godswood`, `milton` (both layouts), `portcullis` and `tapestry` pass no `content` prop at all and have always rendered full-width, unchanged by this release. `mission-command`'s own capped rendering, the one that prompted the ruling, is its own explicit choice and stays exactly as it is until `mission-command` itself chooses to switch to `content="full"` or drop the prop; that is a change for `mission-command`'s repo, not this package.

### Docs

- **`README.md` records `variant="header"` (top navbar) as the household standard** for `AppShell`, with `variant="rail"` a recorded per-app exception. The component's own default stays `"rail"` (unchanged): flipping every app's nav orientation on a patch bump would violate least-surprise for everything already relying on the current default. The standard is enforced by rule and by each app's own explicit prop, not by the component default.

## [2026.7.10] - 2026-07-31

### Added

- **Four new console-dashboard primitives, promoted from mission-command**: `arc-gauge`, `bar-row`, `scorecard` and `sparkline` (design-system#15, master-project#230 Finding 5). mission-command was the only household app still hand-rolling dashboard chrome instead of consuming this package; these four had no equivalent here, so its local copies were untested and unreachable by an upstream fix. Each is generalised only as far as mission-command's real call sites already needed, not speculatively:
  - `arc-gauge` — a radial capacity/percentage ring. Its `tone` prop is a named 3-member subset of the shared `Status` vocabulary (`Extract<Status, 'success' | 'warning' | 'error'>`), using the same names the rest of the package uses rather than the source's abbreviated `ok`/`warn`/`err` — info/neutral stay out because nothing calls them today. `size` now also sets the SVG's `width`/`height` attributes explicitly (previously relied on ambient sizing), making the source's own stated intent — the size IS the ring's physical footprint — literal rather than incidental. The embedded percentage/unit-label glyphs stay at the source's literal 10 and 5.4 SVG user-unit sizes: they are graphic annotations scaled by the viewBox, not CSS/DOM running text, so the household's ~0.75rem type floor does not apply to them — documented at the point of use so a future edit does not "fix" them into a floor violation of the ring's own established geometry.
  - `bar-row` — a labelled horizontal bar with a trailing tabular value, for a ranked list (a token-burn chart, a per-lane usage table) where a full `stat-card`/`stat-list` row would be too heavy. `color` stays a free CSS colour string rather than the shared `Status` vocabulary, since real usage already passes arbitrary per-row/per-series hues. Restyled from the source's scoped `<style>` block onto Tailwind utilities plus this package's existing `.ds-tabular` value-column utility, matching every other composed component's convention; the two raw font-size literals (0.86rem/0.84rem) both land on `text-sm`, the nearest step on the shared scale.
  - `scorecard` — a compact 0/1/2 dot-row health strip, for several independent checks read at a glance where `stat-card`'s single figure or `status-badge`'s single pill cannot represent more than one state at once. Reuses this package's own `.ds-dot`/`.ds-dot-{status}` classes instead of a second colour scale, and adds a computed `role="img"`/`aria-label` summary (e.g. `"off, on, warn"`) so the row is readable without colour (WCAG 1.4.1) — free, since it derives from the existing `scores` prop alone.
  - `sparkline` — an inline multi-series area+line trend, for a row or card with room for a trend but not a full Tier-1 chart. Ported as-is (already generalised: multi-series, caller-supplied colour per series); its internal grid-line derivation moves from a `$derived` holding a closure invoked in the template to `$derived.by`, which is the idiomatic Svelte 5 form for a multi-statement derivation and avoids recomputing an inert wrapper function every render.

  All four follow the package's composed-component conventions: kebab-case directory, `<name>.svelte` + `index.ts` exporting default and named, tokens/Tailwind only (no raw colour literals), and — where the root is a real element a consumer might need to address — the `WithElementRef<HTMLAttributes<...>>` + bindable `ref` + rest-prop-spread pattern from design-system#14. `arc-gauge` and `sparkline`'s SVG roots use the same shape without `WithElementRef` itself, since its `U extends HTMLElement` constraint cannot express an `SVGSVGElement`.

- **`StatusBadge` gains a `'primary'` status value**, additive to its own `status` prop only (`Status | 'primary'`) — the shared `Status` type itself is unchanged and stays closed at five states, so `StatCard`, `StatList` and `DataTableToolbar` are unaffected and never see it. mission-command's local `StatusBadge` carried a sixth tone, `pri`, confirmed live (a backend-sourced `RepublicItem.tone`) rather than dead code, for brand-emphasis chips — a genuinely different semantic axis (brand emphasis, not a health state) from the other five. Backed by two new rules in `styles.css`, `.ds-chip-primary`/`.ds-dot-primary`, keyed off `--ds-color-primary` next to the existing five-state block, whose doc comment now states plainly that `primary` is a `StatusBadge`-only extension.

## [2026.7.9] - 2026-07-31

### Added

- **`DetailPanel` takes `titleFace?: 'mono' | 'display'`** (defaults to `'mono'`, unchanged), so a consuming app whose titles are names rather than machine values — a hostname, a key — is not forced into the monospace face (design-system#9). No prop, slot or token previously reached it; the only route was a per-app CSS override of a package internal, or a fork. A closed choice on the component, the same shape as `AppDialog`'s `size` or `AppShell`'s `content`, so the face stays a design-system decision rather than a free-form class escape hatch. Additive: omitting it is unchanged from today.
- **A nav item can now claim additional path prefixes beyond its own `href`**, via `matchPrefixes?: string[]` on `NavItem` (design-system#10). Flat navigation — every section's children under the section's own path — already worked; this covers a section whose children live at their own top-level route (a "browse" list whose detail pages sit at a short URL rather than nested under the list), where the rail previously went dark on a page reached from its own nav item. Each prefix matches exactly like `href` does (prefix, with the same path-segment boundary as the existing `+ '/'` check), and independently of `href` being forced to exact at `/` — a root item can still claim a second, unrelated section. Additive: an item with no `matchPrefixes` is unaffected.
- **`PageHeader`, `StatCard`, `StatList`, `Panel`, `DetailPanel`, `ContextColumn`, `EmptyState`, `ErrorState` and `LoadingState` now spread rest props onto their root element** (design-system#14) — `class`, `id`, `aria-*`, `data-*`, and anything else an adopting app needs to identify or style an element, exactly as the primitives (`Card`, `Button`, `Table.Root`, …) already do. `class` merges with the component's own layout classes (`cn()`) rather than replacing them; every other attribute passes straight through. Each also carries a bindable `ref` to the root element, matching the primitives' idiom. Fully additive: a caller passing nothing sees no change.
- **`ContextColumn` takes `ariaLabel`.** Its `<aside>` had no accessible name, so it was exposed as a bare "complementary" landmark with no way for an app to distinguish it from any other. Additive; omitting it is unchanged from today.
- **`AppShell` takes `navLabel`** (defaults to `"Primary"`, matching today's behaviour), forwarded to every place the primary nav landmark renders: the rail/drawer `AppNav`, the header variant's inline horizontal nav, and the header variant's mobile disclosure panel's `AppNav`. Previously `AppNav`'s own `label` prop existed but `AppShell` never forwarded it, so an app replacing its own labelled landmark with the shared shell silently lost the name.

### Changed

- The resting nav label's AA contrast check in `harness/drive.mjs` flips from recorded to asserted (design-system#13, fixed upstream in `@poodle64/design-tokens`'s `muted-foreground` token): now 5.03–5.08:1 in light mode, 6.53–6.58:1 in dark, against the shell chrome surface — was 3.62:1 in light mode before the token moved.

### Fixed

- Scoped theming (design-system#8). `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `bg-secondary` and `border-input` now re-resolve against a scoped `--ds-color-*` override or a scoped `.dark` wrapper, not just at the page root. Previously each utility read a bare shadcn name (`--card`, `--popover`, …) declared once at `:root`; that name froze at its root-level value and never re-evaluated for a subtree override or a scoped `.dark` class below it. Each theme registration is now a fallback chain — `--color-card: var(--card, var(--ds-color-surface-2))` — so the bare name, if an app sets it, still wins (unchanged, additive); if it is unset (the default, and every app today), the utility resolves the live `--ds-color-*` token instead of a frozen alias.
- `.ds-skip-link` and `Sonner`'s CSS-variable bridge (`--normal-bg`/`--normal-text`) read `--popover`/`--popover-foreground` through the same fallback, for the same reason — they consume those names directly, outside the Tailwind theme mapping.

### Changed

- `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--accent`, `--accent-foreground` and `--input` no longer carry a default declaration in `:root`; they are pure by-name override hooks now, consumed only via the fallback chains above. An app that never set these is unaffected (the fallback supplies the same default value as before); an app that already overrides one by name is unaffected (still wins). See `@poodle64/design-tokens`'s own changelog for the companion, **breaking** change to `--color-*`-by-name override on the keys that package registers (`--color-background`, `--color-primary`, etc.) — this package's own bare-name levers (`--card` etc.) are unaffected by that.

## [2026.7.8] - 2026-07-29

### Fixed

- **`AppShell` painted the active nav label in `--ds-color-primary`, so an app whose brand hue is light shipped an unreadable nav entry** (#11). Measured in Chromium from resolved computed colours, composited over the surfaces the label actually sits on: a warm amber brand read **1.90:1**, a saturated blue **2.87:1**, against a 4.5:1 floor. The package default cleared it by 0.05. The nav's count badge was worse still, at **1.73:1** under the amber palette and **3.72:1** on the package default, because it sits on the active row's tint as well as its own.

  The framing matters more than the numbers. `--ds-color-primary` is the one token this package invites every app to override, and the only constraint stated where an app picks it is that it clear AA against its own `-foreground` pair: the **fill** case, primary as a background with text on top. Both failing palettes cleared that comfortably (7.69:1 and 5.00:1) and were illegible anyway. Consuming the token as **ink** on the chrome was a second, stricter requirement that nothing documented and that constrains a brand hue far more tightly than the stated rule implies. Every app picking a light or high-lightness hue inherited it silently.

  So the shell stops asking a colour it does not control to be legible text. The active row's ink is now the chrome's own foreground, whose legibility the app's palette is **already** obliged to guarantee, so the fix inherits an existing contract instead of inventing a new one. No app is told to repaint its brand. Light mode now measures **12.60–13.97:1** across all three fixture palettes and both variants; dark mode, which never failed, moves from 6.05–8.21:1 to 12.45–13.13:1.

  The brand is not lost, it moves to where it is not text: the 12% tint, the rail's edge bar, the header's underline. Those keep `--primary` at full strength deliberately. WCAG 1.4.11 holds a state indicator to 3:1 only where the state is not conveyed another way, and here it is conveyed three others (the ink lifts from muted to full, the weight steps to 500, the row carries `aria-current="page"`), so the bar stays the one place an app's brand hue survives undiluted. The gate asserts that redundancy rather than trusting the argument.

  An app whose primary genuinely is legible as ink on its chrome puts it back with `--ds-nav-ink-active`, and owns the contrast knowingly. `DESIGN.md.template` now states the fill-vs-ink distinction where an app picks its hue, which was the other half of what the report asked for.

  Two alternatives were measured and lost. Deriving an accessible ink by clamping lightness in `oklch(from …)` is not sound across the gamut: a saturated green clamped to L 0.55 still lands at 3.44:1, so it trades a visible failure for a subtler one. Mixing primary into the chrome ink **is** provable (35% clears 4.5:1 for every in-gamut primary in both modes) but at that ratio the hue reads as warm or cool grey, degrading every palette that was already fine to buy safety for palettes no app has.

- **An app inverting its chrome got no effect on the nav at all.** Found by the new gate, not by the report. `--ds-shell-chrome-foreground` is the documented way to invert the rail and bar against the palette; the nav rows ignored it entirely. A custom property declared **on** an element beats one inherited **into** it, and `.ds-nav` is a descendant of every chrome surface, so the chrome re-pointing `--ds-nav-ink` was overridden by `.ds-nav`'s own declaration on the very element that consumes it. Both declarations were correct in isolation and only their placement was wrong, which is why no compiled-CSS gate could see it: the winner is a cascade fact and needs an engine. It was invisible in use too, because both sides default to the same token, so the only symptom was an app asking for an inverted chrome and getting silence. The chrome now sets a variable the nav **reads** rather than one it redeclares.

  The gate pins both halves of that rule, because it has to give two opposite answers at once: `AppNav` is also exported for a route-scoped secondary column on the ordinary page background, and that one must NOT follow the chrome — an inverted chrome would otherwise paint near-white ink on a near-white surface. The harness renders one beside the inverted rail and asserts each stays where it belongs.

### Added

- **`aria-controls` on the mobile disclosure toggle** (#12). The toggle already managed `aria-expanded` correctly and moved focus into the panel, trapped it, and returned it on Escape; what was missing was the programmatic relationship between the control and the region, which is how assistive technology offers to jump to the region rather than relying on DOM order, and how automated tooling can tell the two elements are related at all. Both variants carry it: under `variant="rail"` the reference is live from first render, because the rail and the drawer are one element; under `variant="header"` the disclosure panel is created and destroyed with the state, so the reference is present while the panel is and omitted rather than left dangling when it is not. The region id is generated per instance, so two shells on one page cannot collide with each other or with an app's own ids.

- **A real-browser contrast gate for the whole defect class** (`harness/drive.mjs`). The class is *a shared component painting a colour the consumer owns as ink*, and nothing cheaper can see it: jsdom applies no stylesheet and returns the unresolved `var(--…)` literal, so a unit test passes just as happily on a colour nothing defines, and a compiled-CSS gate proves a rule exists without ever resolving `color-mix()` over a real surface. The gate drives the built package under three palettes (the package default plus two deliberately different consumer brands, including the low-luminance-on-light amber that is the failing shape) across both themes and both variants, and asserts the resolved ratio.

  Three measurement details are load-bearing, each having produced a wrong answer first. Contrast is taken against the **composited ancestor stack**, not the page background: the active row's background is a 12% `color-mix` over the chrome and the chrome is `bg-shell/80` over the page, so the label sits on three layers and any single one of them is the wrong comparison. **Transitions are disabled** before reading, because swapping a custom property starts `.ds-nav-item`'s 150ms colour transition and `getComputedStyle` mid-flight returns an interpolated value; the first run of this gate reported the package default while believing it had applied the override. And each fixture palette is asserted to clear AA **as a fill** first, so a future edit that breaks the fixture fails as a fixture problem rather than quietly weakening the claim.

  The gate also records two numbers it does not assert, each with its reason: the brand indicator's own ratio (non-text, and redundant per the assertion above), and the resting nav label's, which is a genuine AA failure at 3.62:1 in light mode but belongs to `--ds-color-muted-foreground` in the token package rather than to this shell, and is tracked as #13.

  `src/test/nav-ink.test.ts` is the cheap structural half that runs on every `pnpm test`: it cannot report a ratio, but it catches the one-character regression that puts `var(--primary)` back, in milliseconds and without a browser.

### Changed

- **The harness follows the OS colour-scheme preference instead of claiming a default mode.** `ModeWatcher` was passed `defaultMode="dark"`, which was measurably not doing what it said: mode-watcher tracks the system preference and Chromium's default is light, so every surface in the harness had in fact been rendering **light** since the day it was written. The contrast gate has to know which theme it is looking at, so the theme is now driven by `browser.newContext({ colorScheme })` and waited on rather than assumed.

## [2026.7.7] - 2026-07-29

### Fixed

- **An overlay with more rows than fit the window ran off the bottom of it, and could not be scrolled back.** Found in the first app to adopt `2026.7.6`, by opening a select with 36 options in a real browser; it reproduces on `2026.7.2` and is as old as the components. It affects the select, the dropdown menu and the popover — every app rendering any of the three over a list longer than the viewport.

  The mechanism is one missing declaration and it is invisible in the class list. The select's content carried `overflow-y-auto`, correctly spelled, doing nothing: `overflow` only produces a scroll when something constrains the height, and nothing did. So a 36-option popper laid out 1008px tall in an 800px window, its last option at y=1040, with `scrollHeight` and `clientHeight` both 1008 — not scrollable, not clipped, simply gone past the fold. bits-ui mounts `SelectScrollDownButton` only while scrolling is possible, so the one affordance that would have said "there is more" was absent too. A keyboard user could still press End and commit a value blind; a mouse user could not reach it at all.

  bits-ui publishes the space available as `--bits-select-content-available-height`, and the content now caps to it. The cap tracks the viewport rather than being a constant, which is asserted at two window heights so that stays true.

  The dropdown menu had the identical omission and takes the identical fix. The popover was the same defect in its other form — no cap **and** no `overflow-y-auto`, so tall content was not even a scroll container; it takes both, because capping alone would have traded unreachable content for clipped content.

  Command's list was checked and left alone: its `max-h-72` genuinely constrains it, it scrolls, and its last row is reachable. Tooltip carries no list. Dialogue and alert-dialogue are not on the floating layer and size themselves.

  Worth recording for whoever next diffs these against upstream: this is **not** a port that drifted. shadcn-svelte carried `max-h-(--bits-select-content-available-height)` at `1.0.0` and removed it in the rewrite that moved utilities into per-style `cn-*` classes — current `cn-select-content`, `cn-dropdown-menu-content` and `cn-popover-content` carry no height cap at all. The fix restores the `1.0.0` utility; matching current `main` would reintroduce the defect.

### Added

- **A browser gate for the whole class** (`harness/drive.mjs`, `?surface=long-lists`). Nothing cheaper could have caught this. jsdom has no layout, so `scrollHeight` and `clientHeight` are both `0` there and `scrollHeight > clientHeight` is false on a working build and a broken one alike — a unit test asserting the real behaviour would fail on the fix. A compiled-CSS gate can prove the rule exists but not that a box obeyed it. The gate opens each overlay over 36 rows at 800px and 560px, and for each one asserts the content ends inside the window, that the rows past the fold scroll rather than being clipped, and that driving that scroll brings the last row into view. It fails 20 checks on the previous build.

  It measures the element that genuinely scrolls, which for the select is not the one carrying the cap: bits-ui lays the content out as a flex column and gives the viewport `flex: 1; overflow: auto`, so the cap on the content is what gives the viewport a height, and the viewport is what moves. Read on the content, the fixed select reports 740 vs 740 and looks broken.

## [2026.7.6] - 2026-07-28

Five apps migrated onto this package. What they found is below; the package
absorbs it so no app has to fork around it.

### Fixed

- **Every overlay this package ships opened and closed with no transition** — dialogue, alert-dialogue, dropdown menu, popover, tooltip, select and command — in any app that had not, years earlier, copied a pair of declarations into its own `app.css`. Four of the five adopting apps were shipping that.

  Two independent dead layers, one underneath the other, and each is silent in exactly the way the `@custom-variant dark` defect fixed in `2026.7.3` was: the markup is identical whether the rule matches or not, so there is no build error, no lint hit, no failing test and no visual diff on a static screenshot.

  The first is the variant. This package writes ~47 `data-open:` / `data-closed:` utilities; Tailwind v4 compiles a bare `data-open:` to `&[data-open]`, and bits-ui emits `data-state="open"` — an attribute nothing in the tree carries. The two declarations now ship in `styles.css` beside the utilities that depend on them.

  The second only became visible once the first was fixed, by driving a dialogue open in a real browser and reading the resolved `animation-name`: still `none`. `animate-in`, `animate-out`, `fade-in-0`, `zoom-in-95` and `slide-in-from-*` are not Tailwind utilities — they come from `tw-animate-css`, which this package neither imported nor declared. It is now a dependency, imported from `styles.css`, on the same principle: the package writes the utility, so the package owns what makes the utility real. An app that also imports it itself loses nothing; the definitions are identical.

  Only `data-open` and `data-closed` needed declaring. The other five shorthand data-variants this package writes — `data-selected`, `data-highlighted`, `data-disabled`, `data-placeholder` (bits-ui writes all four as empty-string-or-undefined) and `data-inset` (this package's own menu items) — are bare attributes that Tailwind's default `&[data-x]` already matches, so a declaration would only restate it. That distinction is measured rather than assumed, and pinned; see the gate below.

- **The popover's zoom scaled from the wrong origin.** Its content carried the React registry's `transform-origin` custom property, inherited verbatim when the component was ported, and nothing in a Svelte tree ever sets it — bits-ui uses its own. An undefined custom property makes the declaration invalid at computed-value time, so the property silently fell back and the panel zoomed from its own centre instead of from its trigger. It also gained the `data-slot` marker every other content component in the package already had.

- **`--color-shell-foreground` was registered as a theme colour and read by nothing.** The shell painted its chrome text off `--foreground` and `--muted-foreground`, so an app pointing `--ds-shell-chrome-foreground` at a contrasting value got no effect at all, and the only route to chrome ink that inverts against the palette was to override a package style — the per-app divergence this package exists to end. A registered key with no consumer is worse than a missing one: a missing key fails loudly at the utility, a dead one looks like a supported option.

  The rail, the top bar, every chrome control and every navigation rule now read it, alongside a new `--ds-shell-chrome-muted-foreground` for the resting state. Both default to the tokens the chrome previously hard-coded, so no app's rendering moves until it asks. Navigation ink resolves through a pair of locals rather than the chrome key directly, because `AppNav` is also exported for a route-scoped secondary column on the ordinary page background: inverting the chrome must not drag that with it.

### Added

- **`avatar`** (`@poodle64/ui/avatar`) — root, image and load-state-aware fallback. `AppShell` defines the `identity` slot and building that surface needs an avatar, so every consumer was keeping a private copy of the upstream primitive purely to fill a slot the shell itself asks for; in one app it was the sole survivor of a hundred-file vendored folder, a file that could never receive an upstream fix. The group and badge variants are not included: no surveyed app had a consumer for either.

- **`AppDialog` takes `onOpenChange`**, so a caller can act on the dismissals it did not drive — Escape, the scrim, the close control, which is how 12 of one app's 28 dialogues close. `bind:open` reports the new value but offers no moment to act on it, so the workaround is an `$effect` that also fires on the open leg. The two compose: bind for state, take this for the side effect.

- **`AppDialog`'s width scale grows to five** (`xs` `sm` `md` `lg` `xl`). Three was one app's whole reason for keeping a local dialogue frame. The scale extends at its ends rather than being renumbered, so `sm`, `md` and `lg` mean exactly what they always did and no existing call site changes width.

- **`StatusBadge` takes `pulse` and `class`.** The status vocabulary is five settled states and deliberately closed, so it had no way to say "in progress": a sync that is running and one that has finished are both `info` and read identically. Motion is the axis that separates them without adding a sixth word, and it composes with all five because it carries no colour meaning. The animation stops under `prefers-reduced-motion: reduce`, so it never carries meaning alone — the label still says what is happening. `class` is for placement, which only the call site knows; colour and shape stay the package's.

- **`StatCard` takes `valueTone`.** A negative figure rendered in the default foreground with a coloured dot beside its label, which is the wrong element carrying the meaning — the eye goes to the figure, and the figure said nothing. `status` remains the health of the source and `valueTone` the sign of the number; a card often makes both claims at once (a healthy feed reporting a loss). Colour is a refinement, never the message: the figure still carries its own sign.

- **`PageHeader` takes a `breadcrumbs` snippet, and `title` is now optional.** One app could not adopt this component at all: 19 of its 22 page headers carry a trail and 15 have no title, because its page header IS a breadcrumb bar with actions opposite. It grew a slot rather than becoming a second component — a `BreadcrumbHeader` would have had to re-implement the actions row, the eyebrow, the info tip and the spacing, and every app would then face a choice between two page headers that must not drift, which is the drift this package exists to end. The trail itself stays the app's, as a snippet: a breadcrumb trail is made of routed links, and a package with no SvelteKit runtime cannot own those (the same reasoning that makes `AppShell` take `currentPath` as a prop). A title-less header emits no heading at all — an empty `<h1>` would be worse than not adopting.

- **`Table` takes `containerClass`.** The table and its scroll container are different boxes and only one of them can be told to be shorter; a sticky header needs a bounded, scrolling ancestor and `class` lands on the `<table>`. An app wanting one had to reach in from the outside with `[&>[data-slot=table-container]]:…`, an arbitrary-variant selector aimed at a structure this package is free to change — a private detail in use as public API. Naming the seam makes it public and keeps the structure ours.

- **A real-browser gate, wired into CI** (`harness/drive.mjs`, `pnpm run test:browser`). Three of the most expensive defects on this programme were invisible to every gate in this repo *and* to jsdom, and each was found by a person happening to look. The script opens all four bits-ui overlay families and asserts the resolved `animation-name` is the enter animation rather than `none`, measures the shell's content region at 375px and 320px across four page-wrapper shapes, and drives the avatar through a genuine 404 and a genuine decode. It is a script rather than a model-driven session because the choreography is pre-known; it prints every observed value beside its verdict, passing or failing.

- **Four new compiled-CSS gates**, each driven red before being kept:

  - every shorthand `data-*:` variant the built package ships must appear in an exhaustive owned map (so a new one cannot arrive unowned), must compile to a selector targeting the attribute it is owned against, and that map is pinned against what bits-ui really puts in the DOM — otherwise it is only a table someone typed;
  - every animation utility the package writes must emit a rule in a consuming app that imports nothing extra;
  - every `--color-*` key this package registers must be read by a utility or a `var()` in the built output — the gate that would have caught `shell-foreground`;
  - nothing in the built package may reference a Radix custom property, which no Svelte tree sets.

  Plus per-component gates for each new prop: the dialogue's self-dismissal driven through a probe, the width scale compiled to five distinct container widths with none of them unprefixed, the untoned figure asserted inert, the title-less header asserted to emit no heading, the two table class seams asserted to land on different boxes, and the avatar's load-state machine driven rather than rendered.

### Changed

- **The `svelte` peerDependency floor moves from `^5.0.0` to `^5.33.0`** — bits-ui's own requirement, and the lowest version covered by the sweep below.

  A report reached this package that every bits-ui overlay was silently dead on Svelte `5.53.5` with bits-ui `2.18.1`, with a type check, a lint, 257 unit tests and a production build all green, and asked for `>=5.56.2` to be encoded as a floor. It was swept before being encoded: sixteen Svelte versions from `5.30.0` to `5.56.8`, each in an isolated project holding nothing but bits-ui, that Svelte, and the four overlay families, driven in a real browser. Every version opened every overlay; jsdom agreed; and a deliberately duplicated Svelte instance (bits-ui given its own nested copy, with Vite's dedupe both on and off) did not reproduce it either.

  So it is not encoded. A floor that locks consumers out of a range measured to work is a worse defect than the one it claims to prevent, and a version range can only ever express a break someone has already characterised. What replaced it is the scripted overlay gate above, which catches the class of defect whatever causes it. `harness/drive.md` records the full sweep.

- **`<main>` in `AppShell` carries `data-slot="app-shell-content"`**, and the shell's content container carries `min-w-0`.

  The second of those is honest bookkeeping rather than a fix, and the distinction is worth stating because it contradicts the obvious reading of the report. `min-w-0` there was measured **inert** in the current structure — the harness reports identical numbers with and without it, at both phone widths, under both wrapper shapes — because the automatic minimum size applies to a flex item's main axis and `<main>` is a column. It stays as the correct declaration for the box, not as the thing that fixes anything.

  What the shell genuinely owns is the **blindness**. `overflow-y: auto` makes `overflow-x` compute to `auto` too, so `<main>` — not the document — is where a wide child's excess lands, and `document.documentElement.scrollWidth` (the number nearly every app's overflow test reads) therefore cannot move. That is how an app carries real sideways scroll on a phone with its suite green throughout. The slot marker gives every consumer a stable element to measure instead, and the README documents the check. A child wider than the region still has to carry its own scroller — this package's `Table` does; a `<pre>` or an unbreakable string needs one from the page.

- **`CardTitle`'s `level` prop was already published**, in `2026.7.5`. The app that reported it missing was on `2026.7.3`; verified against the tarball on the registry. No change was needed, and the ARIA workaround it describes can be deleted on upgrade.


## [2026.7.5] - 2026-07-28

### Added

- **`CardTitle` can now be a real heading, via an optional `level` prop** (`1`–`6`). Given one it renders the matching `<h1>`–`<h6>`; omitted, it renders the `<div>` it always did.

  A card title is not always a heading, so the `<div>` default is right and stays — it matches upstream shadcn, and a card whose title merely labels a figure would put a phantom stop in the document outline. What was missing was any way for a consumer to say "this one IS the heading", and that gap is not free: it is invisible. The app this component's `<h3>` was replaced in has dozens of call sites where the card title is genuinely the heading for that card's content, on pages whose only other landmark is the page `<h1>`. After migrating onto this package those pages have an `h1` and then nothing — a screen-reader user navigating by heading gets one stop for an entire admin dashboard. No error, no lint hit, no visual difference; every app adopting this package inherits the same loss the same way, which is why the escape hatch belongs here rather than in each consumer's own fork of the component.

  `level` is a heading LEVEL and never a size. The class list, `data-slot` and every rest prop are identical in both modes — the component is one `<svelte:element>` rather than two branches, so there is nowhere for them to drift apart — and the identity is measured, not asserted: seven cards differing only in that prop render at the same 352×22 title box inside the same 384×114 card, with all eighteen probed computed properties equal. That matters because `<h1>`–`<h6>` carry UA font-size, weight and margin a `<div>` does not. The class list overrides size and weight itself; **margin is neutralised by Tailwind's preflight and by nothing in this package**, so that dependency is now pinned against the compiled consumer chain rather than left to be rediscovered by an app that drops preflight.

  Sizing stays where it already was, on `class`. Existing consumers are untouched: the default is unchanged, measured against a rebuild of the previous component in the same engine (identical class list, attribute set, box and computed style). The one difference in the whole read is the position of Svelte's empty anchor comment inside the element — invisible to layout, to the cascade and to the accessibility tree, all three measured. `harness/drive.md` records it, along with why the two-branch alternative was built, measured and rejected.

- **A gate for both halves of that claim** (`src/test/card-title.*`). The heading branch and the div default are asserted against *each other* rather than against a copied-out class string, so the pin cannot rot the next time the class list is edited. Five red drives, each isolating one assertion: ignoring `level` fails only the six level tests; dropping `font-medium` from the heading branch fails only the parity test; dropping its rest props fails only the rest-props test; defaulting `level` to `3` fails only the "renders a div" test; and compiling the consumer chain without preflight fails only the UA-metrics test — which is what shows that last one is guarding a real dependency rather than restating the class list.

  The real-browser leg is `harness/drive.md` (`?surface=card`), because jsdom can make neither claim: it applies no stylesheet, so a `<div>` and an `<h3>` are trivially identical there whether or not anything neutralises the UA metrics, and its `getByRole` is a static element→role table rather than a tree a browser built. In a real engine the six heading cards expose `heading "Estate summary" [level=1…6]` and the div card exposes plain text with no heading node anywhere on the page.

  Deliberately left alone, having been assessed: `DialogTitle` is bits-ui's and already carries the dialogue's `aria-labelledby` semantics, so a heading there would add an outline entry to a surface that is already named. `PageHeader` is documented as the one page-title pattern and its `<h1>` is the point. `Panel`, `DetailPanel`, `EmptyState` and `AlertTitle` are a different defect class from this one — they hard-code a level (`h2`, `h2`, `h3`, `h5`) rather than omitting the element, so they contribute to the outline already and the open question is whether their fixed level suits every nesting an app puts them in. That is worth its own pass; changing them here would move existing consumers' outlines for symmetry rather than for evidence.

## [2026.7.4] - 2026-07-28

### Fixed

- **`ErrorState` announced nothing at all.** It is rendered when an async load fails, so it arrives *after* the page has settled — and it carried no live region, so a screen-reader user was told nothing: the page silently changed and the failure was invisible. Every app adopting this package inherited that, and it was found by the fourth adopter, whose own local `ErrorState` had `role="alert"` from the start and lost it on migrating here.

  This was an inconsistency inside the package rather than a decision. The sibling `LoadingState` has had `role="status"` + `aria-live="polite"` since the initial release; `ErrorState` was extracted without the equivalent. It now carries `role="alert"` + `aria-live="assertive"`, and the pairing is deliberately not the sibling's: loading is not urgent and waits its turn, whereas this surface only exists because the user's task has already broken, so it interrupts. `EmptyState` is deliberately left alone — an empty result is ordinary static content the app placed, and announcing a blank list as loudly as a broken one is the over-correction, now pinned by its own assertion.

  Attributes only. The class list, the prop contract and the markup are untouched, and the null visual result was measured against a pre-change build in a real engine rather than assumed: identical bounding box, background, border, radius, padding and text metrics, with `role`/`aria-live` the only difference in the whole read.

### Added

- **A live-region gate for the async-outcome surfaces** (`src/test/live-regions.*`). It reaches each state by *driving* a load rather than by mounting the finished markup, because the claim is not that an attribute is present — it is that the region exists at the instant the outcome lands, which is the only instant a screen reader has to announce it. Driven red first: with the attributes removed the failure surfaces as a bare paragraph and four assertions fail; with `role="alert"` restored but `aria-live` dropped, three still fail, which is what keeps the explicit pairing from silently decaying into the implicit one.

- **The real-browser harness now covers those surfaces too** (`?surface=states`), because jsdom cannot make this claim either: `getByRole` there is testing-library resolving a static element→role table, so it proves the string and nothing about what the platform is handed. A real engine exposes the failure as an `alert` node carrying the message, and exposed the pre-change build as a bare paragraph. `harness/drive.md` records both.

## [2026.7.3] - 2026-07-28

### Added

- **The application shell (`app-shell`), and `command-palette` alongside it.** Primitives and page chrome are not what makes an app feel like an app; the shell is. Every household frontend still hand-built its own, and five were surveyed before this API was settled: a rail-plus-drawer, an eleven-file collapsible sidebar tree under its own top bar, and three header-only bars that each answered the mobile question differently. They agreed on almost nothing structurally while trying to be the same thing.

  Two variants cover all five, because the only structural disagreement that survived scrutiny is **where primary navigation lives**: `variant="rail"` gives a permanent left column with an overlay drawer below `md`, `variant="header"` a horizontal row in the top bar with a disclosure panel. Everything the apps otherwise differed on turned out to be a slot rather than a variant, so the brand, the identity surface, a context switcher, a banner and a secondary column are snippets. The package therefore imports no app store, no app route and no app brand, which is exactly the coupling that made the best existing shell unliftable: its navigation was a module-level import, not a prop, and it reached directly into two app stores and two hardcoded routes.

  `NavItem` and `NavGroup` are exported so apps type their own config against them. They carry no notion of who may see an item: two surveyed apps gate navigation on admin or per-module permission and both do it with their own auth store, so apps filter before they pass. `currentPath` is a prop rather than a `$app/state` import for a related reason — this package has no SvelteKit runtime, so importing it would make SvelteKit a hard peer and make the shell untestable outside a running app.

  Sensible defaults were a design constraint: `nav` plus a brand gets a working shell, with a bypass link (WCAG 2.4.1), a theme toggle, a mobile treatment and an active-state marker that is never colour alone. `CommandPalette` ships beside it because it had the identical coupling to a hardcoded navigation module, and leaving it behind would have stranded the shell's search affordance; one nav config now feeds both, and the palette owns its own ⌘K binding instead of each app re-typing the handler.

- Focus management and modal semantics for the shell's mobile overlay: focus moves in on open and returns to the trigger on close, Tab wraps rather than walking out into the covered page, the overlay carries `role="dialog"`/`aria-modal` only while it *is* the overlay, and crossing up past `md` closes it so "open" genuinely implies "narrow". The scrim, the close button and the trigger each carry a distinct accessible name; the trigger uses the ordinary disclosure pattern (a stable name plus `aria-expanded`).

- **A real-browser verification harness (`harness/`).** jsdom applies no stylesheet and returns the unresolved `var(…)` literal from `getComputedStyle`, so it passes on a colour nothing defines: the blind spot behind five defects in this programme. The harness compiles the real Tailwind consumer chain over the built package and is driven at desktop and phone viewports; `harness/drive.md` records every claim, the observed value, and three measurement traps that produced false failures. The stateful behaviour is driven separately in jsdom, where it belongs.

- **A named regression guard for the `checkbox` barrel export**, ported from the reference frontend the primitive was extracted from as that app migrates onto this package — the coverage belongs where the component now lives, not re-forked in the consumer. It pins the defect fixed in 2026.7.0 (bits-ui's compound namespace exported under the name `Checkbox`, shadowing the styled wrapper) by mounting the *named* export and asserting the wrapper's own `data-slot="checkbox"` marker, then driving the control off → on → off. Both assertions were driven red first: the historical barrel fails at mount, and a mountable-but-wrong export (`CheckboxPrimitive.Root`) fails only the marker check while toggling perfectly — which is precisely why asserting the marker is not redundant with driving the control.

## [2026.7.2] - 2026-07-28

### Fixed

- **The shadcn colour surface generated no CSS in a consuming app (#3).** Every component here is written against the shadcn semantic names, but nothing ever registered them as Tailwind theme colours. A consuming app declared `--card` in a plain `:root`, which makes the variable exist and tells Tailwind nothing, so `bg-card` compiled to no rule at all. Eleven aliases were dead across ~126 references: `card`, `popover`, `muted`, `accent`, `secondary`, `input` and their `-foreground` pairs. In practice that meant dropdown menus with no hover state, inputs and textareas with no border of their own, and cards and popovers with no surface colour. Note the asymmetry that made it easy to miss: `muted-foreground` was registered while `muted` was not, so `text-muted-foreground` worked and `bg-muted` silently did not.

  `@poodle64/ui/styles.css` now ships the mapping and the registration together, beside the components that depend on them. The values are not a fresh design: every app in the estate that had an alias layer had already converged on the same surface ladder (`card`/`accent` on `surface-2`, `popover` on `surface-3`, `muted`/`secondary` on `surface-1`, `input` on `border`), so they are hoisted verbatim. There was no disagreement to arbitrate. A consuming app now needs no alias layer of its own, which is the per-app divergence this package exists to delete; an app that keeps one can drop it at leisure, since adopting this release is a single added import either way. Sidebar and chart colours are deliberately excluded: no component here references them, and they are the one part of the surface apps genuinely differ on.

- **The width scale resolved to padding-sized values (#4).** `max-w-sm` capped an element at 8px rather than 24rem, wrapping text one word per line. This was fixed upstream in `@poodle64/design-tokens` 2026.7.2, which is published; the reports came from apps still resolving 2026.7.1. Nothing in this package reintroduces it, and it is now guarded here as well as there.

- The Toaster read `var(--color-popover)` from an inline style attribute. Tailwind v4 tree-shakes theme variables that no generated utility uses, so that key was never emitted and the toast surface fell back to nothing. It now reads the bare shadcn variable, which is declared unconditionally and cannot be shaken away.

### Added

- **A gate that fails loudly when a component references a colour utility with no matching theme registration.** This is worth more than the mapping work: a dead utility passed every gate in this repo and survived a full app migration unnoticed, because the markup is identical whether the rule exists or not. The check compiles the real built package with the real Tailwind compiler, wired exactly as a consuming app wires it, and names the missing registration. It carries no allow-list; where a candidate emits nothing, it recompiles with that colour name registered and reports only the ones that come alive, which is what separates a dead utility from a string that was never a class.

- **A namespace guard covering this package's own stylesheet.** The collision behind #4 has been independently rediscovered three times across the estate and hand-patched locally each time. `@poodle64/design-tokens` guards its own `@theme` block, but this package now ships one too, so a scale key added here would shadow Tailwind's container scale identically while that guard stayed green. This one compiles the whole shipped import chain and asserts every sizing utility means exactly what plain Tailwind means.

- **A one-owner-per-key check, and an import-order check.** `@theme` registration is decided by import order, so a colour key both this package and `@poodle64/design-tokens` registered would resolve differently depending on which stylesheet an app imported last: the same override working in one app and silently doing nothing in another. This package now registers only the keys the token package does not, and the gate asserts both that the two sets stay disjoint and that every shadcn utility resolves to the same colour with the stylesheets imported in either order.

  All three gates assert on compiled output and resolved values rather than on class names, and each was driven red against its own defect before being kept. A class-name assertion is precisely the check that passes today while the component renders unstyled, and jsdom cannot stand in either: it does not resolve `var()` in computed styles, so a jsdom assertion passes on a completely unregistered colour.

### Changed

- `@poodle64/ui/styles.css` is now **required**, not an optional extra for the composed components: it carries the theme registration every component depends on. The README states the contract.

## [2026.7.1] - 2026-07-28

### Added

- **16 composed page-chrome components**, each its own subpath export alongside the primitives: `page-header`, `panel`, `detail-panel`, `context-column`, `app-dialog`, `dialog-section`, `stat-card`, `stat-list`, `status`, `status-badge`, `empty-state`, `error-state`, `loading-state`, `info-tip`, `data-table-toolbar`, `data-table-tanstack`. Primitives are not what makes an app look like an app; the page chrome is, and every app was hand-building it. Extracted from the household reference frontend as they actually run there, not designed from a spec: the table is the TanStack-shaped pair (the page owns the `Table` instance, the component owns how it looks and how a row is picked), not a `rows`/`columns` config API.
- `@poodle64/ui/styles.css` — the component stylesheet these components require, imported once in the consuming app's `app.css`. Carries the `text-display` / `text-body` / `text-stat` / `tracking-eyebrow` scale keys, the `.ds-edge` card treatment, the `.ds-dialog-section` divider rule, and the `.ds-chip` / `.ds-dot` status classes. Every value resolves through a `--ds-*` token or a shadcn semantic variable, so the consuming app's alias layer still owns the palette; the sole literal is a neutral shadow, overridable via `--ds-shadow-sm`.
- `TH_CLASS` / `TD_CLASS` / `TH_HIDDEN_UNTIL_XL` on the existing `table` export, for a small static table that does not earn a full TanStack instance.
- Behaviour-driving tests for the new set (34 total): the table's sorting, global search, chip filters, empty branch, master-detail select (mouse and keyboard), bulk selection, indeterminate header state, the imperative `getSelectedIds()` accessor and filter-eviction; the dialogue's open and close; the context column's detail flowing in and out; the empty/error action snippets; the loading state's live region; and the negative branch where a `DetailPanel` status carrying no label draws no chip at all.

### Fixed

- `DataTableTanstack` select-all could never deselect. `toggleAll()` read the `allSelected` derived *after* clearing the set it derives from, so it always re-evaluated to false and the branch re-selected every row. Inherited from the source app; found by driving the control rather than rendering it.
- `DataTableTanstack` row checkboxes never registered a selection. The checkbox's wrapper handled the click to stop it reaching the master-detail row *and* toggled the selection, while the checkbox's own `onCheckedChange` toggled it again, netting out to nothing. The wrapper now only stops propagation.
- A code comment in `switch` named the private app the primitives came from. This repo is public; the sizing rationale is kept, the identifier removed.

## [2026.7.0] - 2026-07-23

### Added

- Initial release: 25 shadcn-svelte primitives (bits-ui) — 21 extracted verbatim from the estate's reference frontend (`alert-dialog`, `badge`, `button`, `card`, `checkbox`, `command`, `data-table`, `dialog`, `dropdown-menu`, `input`, `input-group`, `label`, `password-input`, `select`, `separator`, `skeleton`, `sonner`, `switch`, `table`, `textarea`, `tooltip`), plus `alert`/`popover`/`progress`/`tabs` from the first app that migrated onto this package and needed them — plus the shared `cn()` helper and TS utility types.
- Built with `@sveltejs/package`; per-component subpath exports (`@poodle64/ui/<name>`), matching shadcn-svelte's own convention (a flat barrel would collide on shared names like `Root`/`Content`/`Trigger`).
- Publish workflow: tag `ui-v*` → GitHub Packages (`@poodle64/ui`).

### Fixed

- `checkbox/index.ts` exported the raw `bits-ui` `Checkbox` primitive namespace under the name `Checkbox`, shadowing the actual shadcn wrapper component (exported as `default`) — a latent bug inherited verbatim from the source app, which never itself imports `{ Checkbox }` from its own copy. Surfaced by the first real second consumer, trying `<Checkbox bind:checked={...} />`. Fixed to export the wrapper component.
- `checkbox.svelte`'s props type didn't strip bits-ui's `children`/`child` snippet props before merging in its own `{#snippet children(...)}`, causing a type conflict for any consumer binding `checked` — the same `WithoutChildrenOrChild` wrapper the other snippet-based primitives (`dropdown-menu-checkbox-item`, `dropdown-menu-radio-item`, `select-item`) already used.
- `bits-ui`, `mode-watcher`, and `svelte-sonner` moved from `dependencies` to `peerDependencies` (kept as `devDependencies` for this package's own build/typecheck) — each is a singleton the consuming app must share with this package, not something safe to bundle a second copy of.

WP-51 Lane WP (`master-project#174`): supersedes the vendor-per-app pattern for the frontend component-system factory surface — see `docs/development/wp51-canonical-shape.md` in `poodle64/master-project`.
