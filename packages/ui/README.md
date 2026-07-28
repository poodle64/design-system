# @poodle64/ui

Household shared shadcn-svelte component primitives (bits-ui), extracted from
the estate's most conformant consuming app's frontend — the best-looking,
most battle-tested implementation of each primitive — plus `alert`/`popover`/
`progress`/`tabs` from the first app that migrated onto this package (WP-51
Lane WP) and needed them.

`bits-ui` is a required peerDependency: components share compound-component
context across the package, so a duplicated `bits-ui` instance is a real
functional bug (mismatched types at best). `mode-watcher` and `svelte-sonner`
are optional peers (`peerDependenciesMeta`), needed only if the consuming app
uses `@poodle64/ui/sonner` (a single dark-mode store for `mode-watcher`, one
toast queue for `svelte-sonner`'s `toast()` + `Toaster` pair — a duplicated
instance there means a `Toaster` that never sees the app's own `toast()`
calls). Declare whichever peers you use directly in your own `package.json` —
pnpm auto-installs missing peers, but an explicit dependency is what lets
Renovate track the version and `pnpm ls` show it.

Every app previously vendored its own copy of these primitives and restyled them
through its `@poodle64/design-tokens` alias layer. That let apps differ by palette,
but a fix (an accessibility bug, a focus-trap issue) had to be applied once per app.
This package is the same restyling mechanism — components consume shadcn's standard
CSS variable names (`bg-primary`, `text-foreground`, `--radius`, …), which resolve
through whichever consuming app's own alias layer is active — but the component code
itself now lives once.

## What is here

```text
src/lib/
  utils.ts              cn() (clsx + tailwind-merge) and the shared TS helper types
  styles.css            the component stylesheet: scale keys, .ds-edge, .ds-chip/.ds-dot,
                          the dialogue-section divider rule
  components/ui/         one directory per component — the shadcn-svelte primitives
                          (bits-ui behaviour + shadcn markup/variants) and the composed
                          page-chrome components built on top of them
dist/                    generated — run `pnpm build` (@sveltejs/package); never edit
```

**Primitives** (25 — battle-tested implementations pulled from whichever app had
them first, not an invented "ideal" list): `alert`, `alert-dialog`, `badge`, `button`,
`card`, `checkbox`, `command`, `data-table`, `dialog`, `dropdown-menu`, `input`,
`input-group`, `label`, `password-input`, `popover`, `progress`, `select`,
`separator`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.

Not yet included: `sheet` — no app's `ui/` has vendored it yet. Add it here
(`pnpm dlx shadcn-svelte@latest add <name>` inside `packages/ui`, or hand-port from
a sibling app once one adopts it) the first time a converging app actually needs it;
do not invent it speculatively.

**Composed components** (16). Primitives are not what makes an app look like an
app — the page chrome is. These are the cross-cutting surfaces every route
composes from, so a household app gets its layout language from the package
rather than rebuilding it:

| Import | What it is |
| --- | --- |
| `page-header` | The only page-title pattern: eyebrow, title, one clamped subtitle, an `info` tooltip, an `actions` slot. |
| `panel` | The generic titled card: optional icon, subtitle and trailing actions over a body that can opt out of padding. |
| `detail-panel` | The entity-detail surface: header with icon/eyebrow/title/`StatusBadge`/close, scrollable body, footer of actions. |
| `context-column` | The persistent right-hand column: a standing `StatList` plus an optional detail that flows in on select. |
| `app-dialog` | The dialogue frame: titled header, scrollable body, footer action bar, three sizes. |
| `dialog-section` | One section of a dialogue body; adjacent sections are divided automatically. |
| `stat-card` | A single metric that earns its space (label, value, unit, sub, status dot). |
| `stat-list` | A route's low-context integers as a label→value list. Zero-aware: `muted` keeps a healthy zero quiet. |
| `status` / `status-badge` | The fixed five-state vocabulary (`success \| warning \| error \| info \| neutral`) and the one state chip. |
| `empty-state` / `error-state` / `loading-state` | The shared blank, error and loading surfaces. Never hand-roll one. |
| `info-tip` | One tooltip pattern: a small info trigger, or wrap an existing affordance as children. |
| `data-table-toolbar` | Search field plus filter-chip groups for a TanStack table. Owns no state; fires callbacks. |
| `data-table-tanstack` | The TanStack-backed table: global search, column filters, master-detail row select, opt-in bulk selection, responsive column hiding, a first-class empty branch. |

The table is the TanStack-shaped pair the household actually runs, not a
`rows`/`columns` config API. The page owns the `Table` instance (built with
`createSvelteTable` from `@poodle64/ui/data-table`) and passes it in; the
component owns how it looks and how a row is picked. For a small static table
that does not earn a table instance, `@poodle64/ui/table` also exports the
`TH_CLASS` / `TD_CLASS` / `TH_HIDDEN_UNTIL_XL` constants for the raw-`<table>`
idiom.

## Consuming the package

Same registry and auth story as `@poodle64/design-tokens` (see the workspace root
README and that package's README for the `.npmrc` / CI token setup).

```bash
pnpm add @poodle64/ui @poodle64/design-tokens
```

```svelte
<script lang="ts">
	import { Button } from '@poodle64/ui/button';
	import * as Dialog from '@poodle64/ui/dialog';
	import PageHeader from '@poodle64/ui/page-header';
	import StatusBadge from '@poodle64/ui/status-badge';
	import type { Status } from '@poodle64/ui/status';
</script>
```

Composed components export both a default and a named binding, so either import
style works. `stat-list` also exports its `StatItem` type, and
`data-table-toolbar` its `ChipGroup` / `ChipSpec` types.

Each component is its own subpath export (`@poodle64/ui/<name>`), matching
shadcn-svelte's own convention — a flat barrel would collide on the generic names
(`Root`, `Content`, `Trigger`) that most primitives share.

**Two lines in the app's `app.css`**, after the token imports:

```css
@import '@poodle64/design-tokens/tokens.tw.css';
@import '@poodle64/design-tokens/tokens.css';
@import '@poodle64/ui/styles.css'; /* component stylesheet */
@source '../node_modules/@poodle64/ui/dist'; /* Tailwind content scan */
```

`@poodle64/ui/styles.css` carries what the shadcn variable layer does not: the
`text-display` / `text-body` / `text-stat` / `tracking-eyebrow` scale keys, the
`.ds-edge` card treatment, the `.ds-dialog-section` divider rule, and the
`.ds-chip` / `.ds-dot` status classes. Without it the composed components lose
their chips, dots, card edges and dialogue dividers. It holds no palette: every
value resolves through a `--ds-*` token or a shadcn semantic variable, so your
own alias layer still owns the colour. Override any key by re-declaring it after
the import.

`@source` is needed because the package's Tailwind classes live in
`node_modules/@poodle64/ui/dist`, outside the app's own `src/`, so the default
source scan misses them. Without it the components render unstyled (no build
error, no lint hit; the classes just never reach the compiled CSS).

## Releasing

1. Change a component; bump `version` in `package.json` (CalVer).
2. `pnpm build` — runs `svelte-package` then `publint` (package.json/exports sanity).
3. Commit, tag `ui-v<version>`, push the tag — CI publishes to GitHub Packages.
