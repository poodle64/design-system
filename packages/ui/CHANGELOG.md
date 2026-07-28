# Changelog

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is CalVer (`YYYY.M.x`).

## [Unreleased]

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
