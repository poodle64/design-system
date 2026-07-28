# design-system

The household web design-language factory: a pnpm workspace publishing the two
packages every SvelteKit app consumes to converge on the same look and the same
components. Personality differs by palette only (per-app `DESIGN.md`); everything
else — tokens, radius, fonts, and now the component primitives themselves — comes
from here.

```text
packages/
  design-tokens/    @poodle64/design-tokens — DTCG token source, Style Dictionary
                     build, --ds-* CSS custom properties, Tailwind v4 @theme block.
                     See packages/design-tokens/README.md.
  ui/                @poodle64/ui — the shared component layer: shadcn-svelte
                     primitives (bits-ui) plus the composed page chrome (page
                     header, panels, states, stat cards, dialogue frame, data
                     table), extracted from the household's most conformant
                     consuming app and restyled by whichever app's token alias
                     layer is active. See packages/ui/README.md.
```

Both packages publish to GitHub Packages under the `@poodle64` scope. See each
package's own README for its contents, consumption snippet, and release process.

WP-51 background: `docs/development/wp51-canonical-shape.md` and
`docs/master/templates/golden-patterns/app-shape-and-frontend.md` in
`poodle64/master-project` (`master-project#174`).

## Workspace commands

```bash
pnpm install          # installs both packages
pnpm build             # builds both packages (pnpm -r run build)
pnpm test              # tests both packages
pnpm --filter @poodle64/ui run <script>   # scope to one package
```

## Releasing a package

Each package versions and tags independently — `design-tokens-v<version>` or
`ui-v<version>` — so one package's release cadence never forces a bump on the
other. See the per-package README for the full steps.
