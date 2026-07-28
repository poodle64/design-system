# Changelog

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is CalVer (`YYYY.M.x`).

## [Unreleased]

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
