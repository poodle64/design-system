# Changelog

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is CalVer (`YYYY.M.x`).

## [2026.7.0] - 2026-07-03

### Added

- DTCG 2025.10 token source (`tokens/tokens.tokens.json`): OKLCH palette primitives, surface ladder, five-token status vocabulary (`success`/`warning`/`error`/`info`/`neutral`), primary/ring/destructive, radius scale (base `0.625rem`), named spacing scale (`xs`–`2xl`), `text-2xs` eyebrow size, and the three binding font families (Fraunces / Hanken Grotesk / JetBrains Mono).
- Style Dictionary v4 build emitting `dist/tokens.css` (`--ds-*` custom properties, `:root` + `.dark`), `dist/tokens.tw.css` (Tailwind v4 `@theme` aliases), and `dist/tokens.js` + `dist/tokens.d.ts` (`DS_*` constants).
- Publish workflow: tag `v*` → GitHub Packages (`@poodle64/design-tokens`).
- Per-app `DESIGN.md` North Star template under `templates/`.
