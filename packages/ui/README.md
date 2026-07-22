# @poodle64/ui

Household shared shadcn-svelte component primitives (bits-ui), extracted from
Portcullis (`repos/portcullis/frontend/src/lib/components/ui/`) — the reference
frontend, the best-looking and most-conformant implementation in the estate — plus
`alert`/`popover`/`progress`/`tabs` from Seshat, added when Seshat became the first
app migrated onto this package (WP-51 Lane WP) and needed them.

`bits-ui`, `mode-watcher`, and `svelte-sonner` are peerDependencies, not bundled
dependencies: each is a singleton the consuming app shares with this package
(compound-component context for `bits-ui`; a single dark-mode store for
`mode-watcher`; one toast queue for `svelte-sonner`'s `toast()` + `Toaster` pair).
A duplicated instance of any of the three is a real functional bug — mismatched
types at best, a `Toaster` that never sees the app's own `toast()` calls at worst
— not just wasted bytes.

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

**Component set** (25 — battle-tested implementations pulled from whichever app had
them first, not an invented "ideal" list): `alert`, `alert-dialog`, `badge`, `button`,
`card`, `checkbox`, `command`, `data-table`, `dialog`, `dropdown-menu`, `input`,
`input-group`, `label`, `password-input`, `popover`, `progress`, `select`,
`separator`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.

Not yet included: `sheet` — no app's `ui/` has vendored it yet. Add it here
(`pnpm dlx shadcn-svelte@latest add <name>` inside `packages/ui`, or hand-port from
a sibling app once one adopts it) the first time a converging app actually needs it;
do not invent it speculatively.

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
