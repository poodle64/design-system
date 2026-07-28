/**
 * Gate: no component may ship a colour utility that compiles to nothing (#3).
 *
 * The defect this exists to make loud: `bg-card` is a perfectly ordinary class
 * name, and if `card` is not registered as a Tailwind theme colour, Tailwind
 * emits NO rule for it. The markup is identical either way, so a type check
 * passes, a lint passes, a render test passes, a screenshot diff passes — and
 * the component ships with no surface colour. ~126 such references survived
 * every gate in this repo and a full app migration before anyone noticed.
 *
 * The check compiles the real built package with the real Tailwind compiler,
 * wired up exactly as a consuming app wires it, and fails naming the missing
 * registration. Adding a component that references a new colour alias without
 * registering it now fails here instead of shipping dead.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
	colourCandidates,
	colourNameOf,
	compile,
	customProperties,
	declaration,
	distDir,
	flatten,
	packageRoot,
	walk
} from './tailwind-probe';

const distFiles = walk(distDir);
const candidates = [...colourCandidates(distFiles)].sort();

/** A colour name Tailwind would never have to resolve — it is built in. */
const BUILT_IN = new Set(['transparent', 'current', 'inherit', 'black', 'white']);

describe('colour utilities referenced by the built package', () => {
	it('finds candidates to check at all (guards the extractor itself)', () => {
		// A silent extractor regression would make every assertion below vacuous.
		expect(candidates.length).toBeGreaterThan(20);
		expect(candidates).toContain('bg-card');
		expect(candidates).toContain('border-input');
	});

	it('every one resolves to a real rule in a consuming app', () => {
		const emitted = compile(candidates);
		const silent = candidates.filter((candidate) => !ruleFor(emitted, candidate));

		// A candidate that emits nothing is either a dead colour utility (the
		// defect) or a string this extractor mistook for a class. Tailwind itself
		// tells the two apart: register the name it would need and recompile. If
		// a rule appears, it WAS a colour utility referencing an unregistered
		// name. If it stays silent, it was never a utility. That keeps this gate
		// free of an allow-list — an allow-list is the thing a future dead
		// utility would get quietly added to.
		const probe = [...new Set(silent.map(colourNameOf))]
			.filter((name) => /^[a-z0-9-]+$/.test(name))
			.map((name) => `\t--color-${name}: #abcdef;`)
			.join('\n');
		const probed = compile(silent, { extraCss: `@theme {\n${probe}\n}` });

		const dead = silent
			.filter((candidate) => ruleFor(probed, candidate))
			.map((candidate) => `${candidate} (needs --color-${colourNameOf(candidate)})`);

		expect(dead, 'colour utilities that generate no CSS in a consuming app').toEqual([]);
	});

	it('every one resolves through to a concrete colour, not a dangling var()', () => {
		// A registration pointing at a variable nothing defines emits a rule and
		// still paints nothing. Flattening the var chain is what separates
		// "Tailwind knew the name" from "the colour actually arrives".
		const emitted = compile(candidates);
		const properties = customProperties(emitted);

		const dangling = candidates
			.filter((candidate) => !BUILT_IN.has(colourNameOf(candidate)))
			.map((candidate) => [candidate, ruleFor(emitted, candidate)] as const)
			.filter(([, value]) => value !== null && flatten(value, properties) === null)
			.map(([candidate, value]) => `${candidate} -> ${value}`);

		expect(dangling, 'colour utilities whose var() chain never reaches a value').toEqual([]);
	});
});

describe('Tailwind theme variables the package reads directly', () => {
	/**
	 * Tailwind v4 tree-shakes theme variables: a `--color-*` / `--radius-*` key
	 * is only emitted when a generated utility uses it. So reading one from an
	 * inline style attribute or a plain CSS rule is a trap — it works right up
	 * until the utility that happened to retain it is removed from an unrelated
	 * component. This is exactly how the Toaster came to be painted with an
	 * undefined `var(--color-popover)`.
	 */
	it('survive into a consuming app rather than being tree-shaken away', () => {
		const referenced = new Set<string>();
		for (const file of [...distFiles, join(packageRoot, 'src', 'lib', 'styles.css')]) {
			const text = readFileSync(file, 'utf8');
			for (const [, name] of text.matchAll(/var\((--(?:color|radius|text|font|spacing)-[a-z0-9-]+)/g)) {
				referenced.add(name);
			}
		}

		// Compile the built package the way a consumer does — Tailwind scans it
		// and decides for itself which theme variables to keep.
		const emitted = compile([], { extraCss: `@source "${distDir}";` });
		const properties = customProperties(emitted);
		const missing = [...referenced].filter((name) => !properties.has(name)).sort();

		expect(missing, 'theme variables read by the package but absent from the output').toEqual([]);
	});
});

describe('the shadcn semantic surface', () => {
	const CASES = [
		['bg-card', 'background-color', '--ds-color-surface-2'],
		['bg-popover', 'background-color', '--ds-color-surface-3'],
		['bg-muted', 'background-color', '--ds-color-surface-1'],
		['bg-accent', 'background-color', '--ds-color-surface-2'],
		['bg-secondary', 'background-color', '--ds-color-surface-1'],
		['border-input', 'border-color', '--ds-color-border'],
		['text-card-foreground', 'color', '--ds-color-foreground'],
		['text-accent-foreground', 'color', '--ds-color-foreground'],
		['text-popover-foreground', 'color', '--ds-color-foreground'],
		['text-secondary-foreground', 'color', '--ds-color-foreground'],
		['text-muted-foreground', 'color', '--ds-color-muted-foreground']
	] as const;

	it.each(CASES)('%s resolves to the value of %s', (utility, property, token) => {
		const emitted = compile([utility]);
		const value = declaration(emitted, utility, property);
		expect(value, `${utility} generated no ${property}`).not.toBeNull();

		const properties = customProperties(emitted);
		const expected = flatten(`var(${token})`, properties);
		expect(expected, `${token} is not defined by the token package`).not.toBeNull();
		expect(flatten(value!, properties)).toBe(expected);
	});

	it('a per-app palette override still flows all the way through', () => {
		// The household contract is "override --ds-color-*, everything follows".
		// This asserts the chain is unbroken end to end rather than merely
		// present: change the token, and the utility's resolved colour changes.
		const emitted = compile(['bg-card'], {
			extraCss: ':root { --ds-color-surface-2: rebeccapurple; }'
		});
		const properties = customProperties(emitted);
		const value = declaration(emitted, 'bg-card', 'background-color');
		expect(flatten(value!, properties)).toBe('rebeccapurple');
	});

	it('is registered by this package, so a consuming app needs no alias layer', () => {
		// The whole point of #3: the contract ships beside the components that
		// depend on it. If this moved back out to per-app CSS, the next app to
		// adopt the package inherits the same broken surface.
		const stylesheet = readFileSync(join(distDir, 'styles.css'), 'utf8');
		for (const [utility] of CASES) {
			const name = colourNameOf(utility);
			expect(stylesheet, `--color-${name} is not registered in the shipped stylesheet`).toMatch(
				new RegExp(`--color-${name}\\s*:`)
			);
		}
	});

	it('ships the stylesheet at the documented subpath', () => {
		const exports = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).exports;
		expect(exports['./styles.css']).toBe(
			`./${relative(packageRoot, join(distDir, 'styles.css')).split('\\').join('/')}`
		);
	});
});

/** The declared value of whichever property `candidate`'s rule sets, or null. */
function ruleFor(css: string, candidate: string): string | null {
	for (const property of [
		'background-color',
		'color',
		'border-color',
		'--tw-ring-color',
		'outline-color',
		'fill',
		'stroke',
		'caret-color',
		'accent-color',
		'text-decoration-color',
		'--tw-gradient-from',
		'--tw-gradient-via',
		'--tw-gradient-to',
		'--tw-shadow-color',
		'--tw-inset-shadow-color',
		'--tw-inset-ring-color',
		'border-bottom-width',
		'border-top-width',
		'border-left-width',
		'border-right-width',
		'border-style',
		'border-width',
		'text-align',
		'font-size',
		'box-shadow',
		'background-clip',
		'outline-style',
		'text-wrap',
		'--tw-ring-offset-width',
		'--tw-ring-offset-color'
	]) {
		const value = declaration(css, candidate, property);
		if (value !== null) return value;
	}
	// Fall back to "a rule exists at all", so an unusual utility is never
	// reported dead just because this list does not name its property.
	const escaped = candidate.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
	return new RegExp(`(?:^|\\n)\\s*\\.${escaped}\\s*\\{`).test(css) ? '' : null;
}
