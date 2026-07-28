# Changelog

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is CalVer (`YYYY.M.x`).

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
