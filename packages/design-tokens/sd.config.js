/**
 * Style Dictionary v4 configuration.
 *
 * Spec refs:
 *   W3C DTCG 2025.10  https://design-tokens.github.io/community-group/format/
 *   Style Dictionary v4  https://styledictionary.com/reference/config/
 *   Tailwind v4 @theme   https://tailwindcss.com/docs/theme
 *   shadcn-svelte Tailwind v4 mapping  https://shadcn-svelte.com/docs/theming
 *
 * Three platforms:
 *   css → dist/tokens.css    (:root light tokens + .dark overrides, --ds-* namespace)
 *   js  → dist/tokens.js + dist/tokens.d.ts  (DS_* constants)
 *   tw  → dist/tokens.tw.css (@theme block for Tailwind v4; every semantic
 *                             group except THEME_EXCLUDED_NAMESPACES below)
 *
 * Emitted-name contract (what every consuming app relies on):
 *   semantic.colour.X.{light,dark} → --ds-color-X in :root and .dark
 *   semantic.radius.X              → --ds-radius-X
 *   semantic.spacing.X             → --ds-spacing-X
 *   semantic.text.X                → --ds-text-X
 *   semantic.font.X                → --ds-font-X
 *   palette.*                      → --ds-palette-* (primitives; not for components)
 *   meta.*                         → omitted from CSS output
 */

import StyleDictionary from 'style-dictionary';
import { fileHeader } from 'style-dictionary/utils';

/**
 * Normalise a token path to its public --ds-* name:
 * drop the 'semantic' level, spell 'colour' as 'color' (CSS convention),
 * and drop a trailing 'light'/'dark' mode key (the mode is carried by
 * :root vs .dark, not by the property name).
 *
 * The mode-split applies to palette primitives too, BY DESIGN: a palette
 * pair like palette.primary.{light,dark} emits one --ds-palette-primary
 * that follows the mode, exactly like the semantic tokens. The JS constants
 * keep both values (DS_PALETTE_PRIMARY_LIGHT / _DARK) for consumers that
 * need a specific mode's value.
 */
const dsName = (parts) => {
  const trimmed = parts[0] === 'semantic' ? parts.slice(1) : parts;
  const mapped = trimmed.map((p) => (p === 'colour' ? 'color' : p));
  const last = mapped[mapped.length - 1];
  const mode = last === 'light' || last === 'dark' ? last : null;
  return {
    name: (mode ? mapped.slice(0, -1) : mapped).join('-'),
    mode,
  };
};

/** Depth-first walk over the resolved token tree, yielding [pathParts, node]. */
const leaves = (tokens, path = []) => {
  const out = [];
  for (const [key, node] of Object.entries(tokens)) {
    if (key.startsWith('$') || (path.length === 0 && key === 'meta')) continue;
    if (node && node.$value !== undefined) out.push([[...path, key], node]);
    else if (node && typeof node === 'object') out.push(...leaves(node, [...path, key]));
  }
  return out;
};

// ---------------------------------------------------------------------------
// Custom format: scoped CSS custom properties with .dark overrides
// ---------------------------------------------------------------------------
StyleDictionary.registerFormat({
  name: 'css/ds-variables',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const rootLines = [];
    const darkLines = [];

    for (const [parts, node] of leaves(dictionary.tokens)) {
      const { name, mode } = dsName(parts);
      const line = `  --ds-${name}: ${node.$value};`;
      if (mode === 'dark') darkLines.push(line);
      else rootLines.push(line);
    }

    return `${header}:root {\n${rootLines.join('\n')}\n}\n\n.dark {\n${darkLines.join('\n')}\n}\n`;
  },
});

// ---------------------------------------------------------------------------
// Custom format: Tailwind v4 @theme block
// ---------------------------------------------------------------------------

/**
 * Tailwind namespaces this package must never register in @theme.
 *
 * spacing: Tailwind resolves the sizing utilities (w-*, max-w-*, min-w-*,
 * basis-*) against --spacing-* BEFORE --container-*, so a named --spacing-<key>
 * whose key also exists on the container scale (xs…7xl) silently rewrites them
 * — max-w-2xl drops from 42rem to the 3rem spacing value, collapsing every
 * shadcn-svelte dialogue, sheet, and tooltip. Our named scale is exactly
 * xs…2xl, so every key collides, and every value is already reachable on the
 * numeric scale anyway (--ds-spacing-md = 1rem = p-4).
 *
 * The --ds-spacing-* custom properties in tokens.css are unaffected: they stay
 * the way to consume the named rhythm from hand-written CSS.
 *
 * Guarded by test/tailwind-namespace.test.js, which compiles real Tailwind and
 * asserts the sizing scale means the same with and without this package.
 */
const THEME_EXCLUDED_NAMESPACES = new Set(['spacing']);

StyleDictionary.registerFormat({
  name: 'css/tailwind-v4-theme',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const lines = [];
    const seen = new Set();

    for (const [parts] of leaves(dictionary.tokens)) {
      if (parts[0] !== 'semantic') continue; // palette primitives stay out of @theme
      const { name } = dsName(parts);
      if (THEME_EXCLUDED_NAMESPACES.has(name.split('-')[0])) continue;
      if (seen.has(name)) continue; // light/dark pairs collapse to one alias
      seen.add(name);

      // Alias the live --ds-* custom property so .dark toggling flows through
      // @theme utilities automatically. The normalised name already carries its
      // Tailwind namespace (color-*, radius-*, spacing-*, text-*, font-*).
      lines.push(`  --${name}: var(--ds-${name});`);
    }

    // Default Tailwind family hooks so font-sans / font-serif / font-mono
    // resolve to the binding families without per-app wiring.
    lines.push('  --font-sans: var(--ds-font-body);');
    lines.push('  --font-serif: var(--ds-font-display);');
    lines.push('  --font-mono: var(--ds-font-code);');

    return `${header}@theme {\n${lines.join('\n')}\n}\n`;
  },
});

// ---------------------------------------------------------------------------
// Custom formats: JS constants + type declarations (DS_* names)
// ---------------------------------------------------------------------------
const constEntries = (dictionary) =>
  leaves(dictionary.tokens).map(([parts, node]) => {
    const trimmed = parts[0] === 'semantic' ? parts.slice(1) : parts;
    const mapped = trimmed.map((p) => (p === 'colour' ? 'color' : p));
    const constName = `DS_${mapped.join('_').toUpperCase().replace(/-/g, '_')}`;
    return [constName, node.$value];
  });

StyleDictionary.registerFormat({
  name: 'js/ds-constants',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const lines = constEntries(dictionary).map(
      ([name, value]) => `export const ${name} = ${JSON.stringify(value)};`,
    );
    return `${header}// Source: tokens/tokens.tokens.json\n\n${lines.join('\n')}\n`;
  },
});

StyleDictionary.registerFormat({
  name: 'ts/ds-declarations',
  format: async ({ dictionary, file }) => {
    const header = await fileHeader({ file });
    const lines = constEntries(dictionary).map(
      ([name, value]) => `export declare const ${name}: ${JSON.stringify(value)};`,
    );
    return `${header}${lines.join('\n')}\n`;
  },
});

// ---------------------------------------------------------------------------
// Style Dictionary configuration
// ---------------------------------------------------------------------------
export default {
  source: ['tokens/tokens.tokens.json'],

  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [
        { destination: 'tokens.css', format: 'css/ds-variables' },
      ],
    },

    tw: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.tw.css',
          format: 'css/tailwind-v4-theme',
        },
      ],
    },

    js: {
      transformGroup: 'js',
      buildPath: 'dist/',
      files: [
        { destination: 'tokens.js', format: 'js/ds-constants' },
        {
          destination: 'tokens.d.ts',
          format: 'ts/ds-declarations',
        },
      ],
    },
  },
};
