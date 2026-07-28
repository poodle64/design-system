# Changelog

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is CalVer (`YYYY.M.x`).

## [2026.7.1] - 2026-07-28

### Added

- **16 composed page-chrome components**, each its own subpath export alongside the primitives: `page-header`, `panel`, `detail-panel`, `context-column`, `app-dialog`, `dialog-section`, `stat-card`, `stat-list`, `status`, `status-badge`, `empty-state`, `error-state`, `loading-state`, `info-tip`, `data-table-toolbar`, `data-table-tanstack`. Primitives are not what makes an app look like an app; the page chrome is, and every app was hand-building it. Extracted from the household reference frontend as they actually run there, not designed from a spec: the table is the TanStack-shaped pair (the page owns the `Table` instance, the component owns how it looks and how a row is picked), not a `rows`/`columns` config API.
- `@poodle64/ui/styles.css` — the component stylesheet these components require, imported once in the consuming app's `app.css`. Carries the `text-display` / `text-body` / `text-stat` / `tracking-eyebrow` scale keys, the `.ds-edge` card treatment, the `.ds-dialog-section` divider rule, and the `.ds-chip` / `.ds-dot` status classes. Every value resolves through a `--ds-*` token or a shadcn semantic variable, so the consuming app's alias layer still owns the palette; the sole literal is a neutral shadow, overridable via `--ds-shadow-sm`.
- `TH_CLASS` / `TD_CLASS` / `TH_HIDDEN_UNTIL_XL` on the existing `table` export, for a small static table that does not earn a full TanStack instance.
- Behaviour-driving tests for the new set (31 total): the table's sorting, global search, chip filters, empty branch, master-detail select (mouse and keyboard), bulk selection and filter-eviction; the dialogue's open and close; the context column's detail flowing in and out; the empty/error action snippets; the loading state's live region.

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
