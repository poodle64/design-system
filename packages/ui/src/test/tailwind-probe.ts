/**
 * Shared harness for the two build gates in this suite.
 *
 * Both gates guard failures that are invisible to every other check in the
 * repo: a class name that compiles to no rule at all (#3), and a rule whose
 * value silently comes off the wrong scale (#4). Neither shows up in a type
 * check, a lint, a render test, or a screenshot — the markup is identical
 * either way. Only the real compiler's output can tell them apart, so this
 * harness runs the real compiler over the real built package, wired up the
 * way a consuming app wires it.
 *
 * jsdom cannot stand in for this: it does not resolve var() in computed
 * styles (it returns the literal "var(--card)"), so a jsdom assertion would
 * pass on a completely unregistered colour. Hence compile-and-flatten.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

export const packageRoot = resolve(import.meta.dirname, '..', '..');
export const distDir = join(packageRoot, 'dist');

const cli = join(packageRoot, 'node_modules', '.bin', 'tailwindcss');
// Resolved through the package's own exports, so the gate reads the token
// stylesheets a consumer would get rather than a path guessed from the layout.
const require_ = createRequire(join(packageRoot, 'package.json'));

/**
 * The import chain a consuming app writes in its app.css, in order. The gates
 * compile against exactly this, because a registration that only works in some
 * other order is not a contract a consumer can rely on.
 */
const CONSUMER_CHAIN = [
	['tokens.tw.css', require_.resolve('@poodle64/design-tokens/tokens.tw.css')],
	['tokens.css', require_.resolve('@poodle64/design-tokens/tokens.css')],
	['styles.css', join(distDir, 'styles.css')]
] as const;

export interface CompileOptions {
	/** Import the design-system chain. False compiles bare Tailwind, for A/B comparison. */
	designSystem?: boolean;
	/** Extra CSS appended after the chain (used to probe hypothetical registrations). */
	extraCss?: string;
}

/** Compile `candidates` as class names and return the emitted CSS. */
export function compile(candidates: string[], options: CompileOptions = {}): string {
	const { designSystem = true, extraCss = '' } = options;
	// The fixture lives under node_modules so `@import "tailwindcss"` resolves
	// against this package's own dependency tree.
	const dir = mkdtempSync(join(packageRoot, 'node_modules', '.tw-probe-'));
	try {
		writeFileSync(join(dir, 'probe.html'), `<div class="${candidates.join(' ')}"></div>\n`);
		const imports = ['@import "tailwindcss";'];
		if (designSystem) {
			for (const [name, source] of CONSUMER_CHAIN) {
				cpSync(source, join(dir, name));
				imports.push(`@import "./${name}";`);
			}
		}
		writeFileSync(
			join(dir, 'in.css'),
			[...imports, '@source "./probe.html";', extraCss].filter(Boolean).join('\n')
		);
		execFileSync(cli, ['-i', join(dir, 'in.css'), '-o', join(dir, 'out.css')], { stdio: 'pipe' });
		return readFileSync(join(dir, 'out.css'), 'utf8');
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/** The value of `prop` inside rule `.selector`, or null when the rule is absent. */
export function declaration(css: string, selector: string, prop: string): string | null {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
	const rule = new RegExp(`(?:^|\\n)\\s*\\.${escaped}\\s*\\{([^}]*)\\}`).exec(css);
	if (!rule) return null;
	const decl = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`, 'm').exec(rule[1]);
	return decl ? decl[1].trim() : null;
}

/**
 * Every custom property the compiled sheet defines outside a `.dark` scope,
 * so a var() chain can be flattened to the concrete light-mode value.
 */
export function customProperties(css: string): Map<string, string> {
	const properties = new Map<string, string>();
	const blocks = css.matchAll(/(?:^|\n)([^{}@\n][^{}]*?)\{([^{}]*)\}/g);
	for (const [, selector, body] of blocks) {
		if (selector.includes('.dark')) continue;
		for (const [, name, value] of body.matchAll(/(--[a-zA-Z0-9-]+):\s*([^;]+);/g)) {
			properties.set(name, value.trim());
		}
	}
	return properties;
}

/**
 * Resolve a declaration value down to concrete CSS by substituting var()
 * references against `properties`. Returns null when any link in the chain is
 * undefined — which is the exact shape of the #3 failure: the utility exists,
 * the variable does not.
 */
export function flatten(value: string, properties: Map<string, string>, depth = 0): string | null {
	if (depth > 12) return null;
	if (!value.includes('var(')) return value;
	const match = /var\((--[a-zA-Z0-9-]+)(?:,\s*([^)]*))?\)/.exec(value);
	if (!match) return value;
	const [whole, name, fallback] = match;
	const referenced = properties.get(name) ?? fallback;
	if (referenced === undefined) return null;
	return flatten(value.replace(whole, referenced), properties, depth + 1);
}

/** Recursively list every file under `dir`. */
export function walk(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else out.push(full);
	}
	return out;
}

/**
 * Utility families whose value slot is a theme colour. A member of this set
 * followed by an unregistered name is the #3 defect: no rule, no error.
 */
const COLOUR_FAMILIES = new Set([
	'bg',
	'text',
	'border',
	'ring',
	'inset-ring',
	'outline',
	'fill',
	'stroke',
	'decoration',
	'caret',
	'accent',
	'divide',
	'placeholder',
	'shadow',
	'inset-shadow',
	'from',
	'via',
	'to'
]);

/**
 * Extract every colour-family utility candidate the built package can put in
 * the DOM.
 *
 * Words are split on whitespace and string delimiters, so a family prefix
 * reached mid-word (the `from-bottom-2` inside `slide-in-from-bottom-2`, the
 * `to-rows-min` inside `auto-rows-min`) is never treated as a candidate.
 * Variants are stripped at the last unbracketed colon, which also discards
 * CSS declarations appearing in inline style attributes (`border-radius:`
 * reduces to an empty bare part).
 */
export function colourCandidates(files: string[]): Set<string> {
	const found = new Set<string>();
	for (const file of files) {
		const text = readFileSync(file, 'utf8');
		for (const word of text.split(/[\s"'`{}();,]+/)) {
			const bare = stripVariants(word);
			if (!bare) continue;
			// An arbitrary value carries its own colour; nothing to register.
			if (bare.includes('[')) continue;
			const family = familyOf(bare);
			if (family && COLOUR_FAMILIES.has(family)) found.add(bare);
		}
	}
	return found;
}

/** Drop `hover:`, `dark:`, `data-[state=open]:` … leaving the bare utility. */
function stripVariants(word: string): string {
	let depth = 0;
	let lastColon = -1;
	for (let i = 0; i < word.length; i += 1) {
		const char = word[i];
		if (char === '[') depth += 1;
		else if (char === ']') depth -= 1;
		else if (char === ':' && depth === 0) lastColon = i;
	}
	return word.slice(lastColon + 1).replace(/^!/, '');
}

/** The utility family of a bare candidate: the longest known prefix. */
function familyOf(bare: string): string | null {
	const parts = bare.split('-');
	for (let take = Math.min(2, parts.length - 1); take >= 1; take -= 1) {
		const prefix = parts.slice(0, take).join('-');
		if (COLOUR_FAMILIES.has(prefix)) return prefix;
	}
	return null;
}

/** The colour name a candidate would need registered, e.g. `bg-input/30` → `input`. */
export function colourNameOf(bare: string): string {
	const family = familyOf(bare) ?? '';
	return bare.slice(family.length + 1).replace(/\/[0-9.]+$/, '');
}
