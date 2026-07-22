# @poodle64/ui

Household shared shadcn-svelte component primitives (bits-ui), extracted from
Portcullis (`repos/portcullis/frontend/src/lib/components/ui/`) — the reference
frontend, the best-looking and most-conformant implementation in the estate.

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
  components/ui/         one directory per shadcn-svelte primitive (bits-ui behaviour
                          + shadcn markup/variants), copied from Portcullis verbatim
dist/                    generated — run `pnpm build` (@sveltejs/package); never edit
```

**Component set** (Portcullis's actual, battle-tested set — not an invented "ideal"
list): `alert-dialog`, `badge`, `button`, `card`, `checkbox`, `command`, `data-table`,
`dialog`, `dropdown-menu`, `input`, `input-group`, `label`, `password-input`,
`select`, `separator`, `skeleton`, `sonner`, `switch`, `table`, `textarea`, `tooltip`.

Not yet included: `alert`, `popover`, `sheet`, `tabs` — no app's `ui/` has vendored
these yet. Add them here (`pnpm dlx shadcn-svelte@latest add <name>` inside
`packages/ui`, or hand-port from a sibling app once one adopts it) the first time a
converging app actually needs one; do not invent them speculatively.

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
</script>
```

Each component is its own subpath export (`@poodle64/ui/<name>`), matching
shadcn-svelte's own convention — a flat barrel would collide on the generic names
(`Root`, `Content`, `Trigger`) that most primitives share.

**Tailwind v4 content scanning.** The package's classes live in
`node_modules/@poodle64/ui/dist`, outside the app's own `src/`, so Tailwind's
default source scan misses them unless told to look. Add one line to the app's
`app.css`, after the token imports:

```css
@source '../node_modules/@poodle64/ui/dist';
```

Without it the components render unstyled (no build error, no lint hit — the classes
just never make it into the compiled CSS).

## Releasing

1. Change a component; bump `version` in `package.json` (CalVer).
2. `pnpm build` — runs `svelte-package` then `publint` (package.json/exports sanity).
3. Commit, tag `ui-v<version>`, push the tag — CI publishes to GitHub Packages.
