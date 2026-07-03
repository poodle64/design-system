# Changelog

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is CalVer (`YYYY.M.x`).

## [2026.7.1] - 2026-07-03

### Added

- `--ds-color-destructive-foreground` (near-white text on a solid destructive control, both modes) — review finding: shadcn-svelte destructive variants reference `text-destructive-foreground`, which had no token backing.

### Changed

- Tailwind `@theme` emitter simplified to one alias form for every semantic group (output byte-identical apart from the new token).
- CI contract assertion now also checks `tokens.tw.css` namespaces and that every `@theme` entry aliases a `--ds-*` var.
- README states the exact GitHub Packages auth contract per consumer class; `DESIGN.md.template` gains the `--destructive-foreground` alias line and current version.

## [2026.7.0] - 2026-07-03

### Added

- DTCG 2025.10 token source (`tokens/tokens.tokens.json`): OKLCH palette primitives, surface ladder, five-token status vocabulary (`success`/`warning`/`error`/`info`/`neutral`), primary/ring/destructive, radius scale (base `0.625rem`), named spacing scale (`xs`–`2xl`), `text-2xs` eyebrow size, and the three binding font families (Fraunces / Hanken Grotesk / JetBrains Mono).
- Style Dictionary v4 build emitting `dist/tokens.css` (`--ds-*` custom properties, `:root` + `.dark`), `dist/tokens.tw.css` (Tailwind v4 `@theme` aliases), and `dist/tokens.js` + `dist/tokens.d.ts` (`DS_*` constants).
- Publish workflow: tag `v*` → GitHub Packages (`@poodle64/design-tokens`).
- Per-app `DESIGN.md` North Star template under `templates/`.
