# design-system — `@poodle64/design-tokens`

The household web design-language factory. One DTCG token source, built by Style Dictionary v4, published to GitHub Packages, consumed by every SvelteKit app.

## What is here

```text
tokens/
  tokens.tokens.json    DTCG 2025.10 token source — the single source of truth
sd.config.js            Style Dictionary v4 config (css / tw / js platforms)
templates/
  DESIGN.md.template    Per-app North Star template (copy → DESIGN.md, fill in)
dist/                   Generated — run `pnpm build`; never edit by hand
  tokens.css            :root (light) + .dark custom properties (--ds-*)
  tokens.tw.css         Tailwind v4 @theme block (aliases the --ds-* vars)
  tokens.js             JS constants (DS_*)
  tokens.d.ts           Type declarations for tokens.js
```

## Binding constraints

Non-negotiable across every household app. Per-app exceptions are not permitted on named semantic tokens.

| Constraint         | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| Corner radius base | `0.625rem` (`--ds-radius-lg`)                         |
| Display font       | Fraunces                                              |
| Body font          | Hanken Grotesk                                        |
| Code / data font   | JetBrains Mono                                        |
| Status vocabulary  | `success` / `warning` / `error` / `info` / `neutral`  |
| Eyebrow size       | `text-2xs` (`--ds-text-2xs`) — never `text-[11px]`    |
| Colour space       | OKLCH                                                 |
| CSS namespace      | `--ds-*`                                              |
| Token format       | W3C DTCG 2025.10                                      |
| Build tool         | Style Dictionary v4                                   |

## Consuming the package

GitHub Packages requires authentication for every install, public packages included.

**Project `.npmrc`** (committed):

```ini
@poodle64:registry=https://npm.pkg.github.com
```

**Local dev** (once per machine, in `~/.npmrc` — any GitHub token with `read:packages`):

```ini
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

**CI** (GitHub Actions): the workflow's own `GITHUB_TOKEN` can install this package because it is public — pass it as `NODE_AUTH_TOKEN`, or use `actions/setup-node` with `registry-url`.

**Install and wire** (Tailwind v4 app):

```bash
pnpm add @poodle64/design-tokens
```

```css
/* app.css — import order matters */
@import 'tailwindcss';
@import '@poodle64/design-tokens/tokens.tw.css'; /* @theme aliases            */
@import '@poodle64/design-tokens/tokens.css';    /* :root + .dark --ds-* vars */

/* then: per-app primary override + shadcn-svelte alias layer
   (full snippet in templates/DESIGN.md.template §8) */
```

TypeScript:

```ts
import { DS_COLOR_STATUS_SUCCESS_LIGHT } from '@poodle64/design-tokens';
```

Fonts are self-hosted per app — add `@fontsource-variable/fraunces`, `@fontsource-variable/hanken-grotesk`, and `@fontsource-variable/jetbrains-mono` and import them in the root layout. The package declares the family stacks; the app supplies the font files.

## Per-app customisation

Only the primary accent changes between apps. Every other semantic token is used as-is.

1. Copy `templates/DESIGN.md.template` to the app repo as `DESIGN.md`.
2. Fill in all `REQUIRED` fields (name, description, primary colours).
3. Add the per-app `:root` override from §8 of the template to `app.css`.
4. Delete template comments before committing.

## Token architecture

```text
tokens.tokens.json
  └─ palette/           Raw OKLCH primitives (not for direct component use)
       neutral/         warm-neutral light + cool-dark scale
       primary/         Slate-blue defaults (override per app)
       status/          Five semantic status hues (light + dark)
  └─ semantic/          What components consume
       radius/          none / sm / md / lg / xl / full
       spacing/         xs / sm / md / lg / xl / 2xl
       text/            2xs (eyebrow / column head)
       font/            display / body / code
       colour/          surface ladder + status + primary + destructive
                        Each colour has .light and .dark sub-values,
                        emitted as :root + .dark blocks
```

## Changing tokens

1. Edit `tokens/tokens.tokens.json` only.
2. `pnpm build` and check `dist/`.
3. Bump `version` in `package.json` and `meta.version` in the token file (CalVer), update `CHANGELOG.md`.
4. Commit, tag `v<version>`, push the tag — CI publishes to GitHub Packages.
5. Renovate raises the bump PR in each consuming app.

Never edit `dist/` by hand; it is generated and gitignored.
