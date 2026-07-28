/**
 * Gate: every shorthand `data-*:` variant this package writes must compile to a
 * selector that matches an attribute the DOM actually carries.
 *
 * The defect, one along from the `dark` one that `dark-variant.test.ts` guards.
 * Tailwind v4 compiles a bare `data-open:` to `&[data-open]`. bits-ui does not
 * emit `data-open` — it emits `data-state="open"`. So the ~47 `data-open:` /
 * `data-closed:` utilities this package ships across the dialogue,
 * alert-dialogue, dropdown-menu, popover, tooltip, select and command surfaces
 * compiled into rules that matched nothing, and every overlay opened and closed
 * with no transition at all.
 *
 * It survives every other check for the same reason the dark one did: the
 * markup is identical whether the rule matches or not. No build error, no lint
 * hit, no failing test, no visual diff on a static screenshot — the enter
 * animation simply never runs. Four of the five apps that adopted this package
 * shipped with dead overlay transitions; the fifth had copied the declarations
 * into its own app.css years earlier and looked fine, which made the whole thing
 * read as app-level inconsistency rather than a package gap.
 *
 * Two halves, and both are needed:
 *
 *   1. the CSS half — compile the built package the way a consuming app does,
 *      with NO app-supplied declarations, and check what selector each shorthand
 *      variant actually produces;
 *   2. the DOM half — mount the real components and check which attributes
 *      bits-ui actually sets. Half one alone can only prove a rule exists; it
 *      cannot know `data-open` is a fiction. Pinning both against each other is
 *      what makes the gate about reality rather than about a table someone typed.
 *
 * The OWNED map below is deliberately exhaustive rather than an allow-list of
 * exceptions: a variant this package ships that is absent from it fails, so a
 * new shorthand cannot arrive unowned the way `data-open` did.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile, distDir, walk } from './tailwind-probe';
import OverlayStates from './overlay-states.svelte';

/**
 * Every shorthand data-variant this package is allowed to ship, and the
 * attribute its compiled rule must target.
 *
 * `data-open` / `data-closed` are the two that need a declaration, because the
 * attribute is `data-state` and the value is what distinguishes them. The rest
 * are bare attributes — bits-ui writes them as empty-string-or-undefined, and
 * this package writes `data-inset` on its own menu items — so Tailwind's
 * default `&[data-x]` already matches and a declaration would only restate it.
 */
const OWNED: Record<string, string> = {
	'data-open': '[data-state="open"]',
	'data-closed': '[data-state="closed"]',
	'data-selected': '[data-selected]',
	'data-highlighted': '[data-highlighted]',
	'data-disabled': '[data-disabled]',
	'data-placeholder': '[data-placeholder]',
	'data-inset': '[data-inset]'
};

/** Shorthand `data-name:` variants (never the `data-[…]:` bracketed form). */
function shippedVariants(): Map<string, string> {
	const byVariant = new Map<string, string>();
	for (const file of walk(distDir)) {
		if (!file.endsWith('.svelte') && !file.endsWith('.js')) continue;
		const text = readFileSync(file, 'utf8');
		for (const [, utility, variant] of text.matchAll(
			/\b(data-([a-z][a-z-]*):[a-zA-Z0-9[\]/.%_-]+)/g
		)) {
			if (!byVariant.has(`data-${variant}`)) byVariant.set(`data-${variant}`, utility);
		}
	}
	return byVariant;
}

/** Attribute quoting is the compiler's business, not this gate's. */
function normaliseQuotes(text: string): string {
	return text.replace(/'/g, '"');
}

/** The emitted rule for `candidate`, brace-matched (custom variants nest). */
function ruleBlock(css: string, candidate: string): string | null {
	const pattern = [...candidate]
		.map((char) => (/[\w-]/.test(char) ? char : `\\\\?\\${char}`))
		.join('');
	const start = new RegExp(`\\.${pattern}\\s*\\{`).exec(css);
	if (!start) return null;
	let depth = 0;
	for (let i = start.index; i < css.length; i += 1) {
		if (css[i] === '{') depth += 1;
		else if (css[i] === '}') {
			depth -= 1;
			if (depth === 0) return css.slice(start.index, i + 1);
		}
	}
	return null;
}

const shipped = shippedVariants();

describe('the shorthand data-attribute variants', () => {
	it('finds variants to check at all (guards the extractor itself)', () => {
		// A silent extractor regression makes every assertion below vacuous, and
		// this gate's whole value is that it notices a NEW variant.
		expect(shipped.size).toBeGreaterThan(4);
		expect([...shipped.keys()]).toContain('data-open');
		expect([...shipped.keys()]).toContain('data-closed');
	});

	it('are all owned — no variant ships without a declared target attribute', () => {
		const unowned = [...shipped.entries()]
			.filter(([variant]) => !(variant in OWNED))
			.map(([variant, example]) => `${variant} (e.g. ${example})`)
			.sort();

		expect(
			unowned,
			'shorthand data-variants with no entry in OWNED — decide what attribute each targets, and ship a @custom-variant if it is not the bare one'
		).toEqual([]);
	});

	it('each compiles to a rule targeting the attribute it is owned against', () => {
		const candidates = [...shipped.keys()].map((variant) => `${variant}:hidden`);
		const css = compile(candidates);

		const wrong: string[] = [];
		for (const variant of shipped.keys()) {
			const candidate = `${variant}:hidden`;
			const block = ruleBlock(css, candidate);
			if (block === null) {
				wrong.push(`${candidate} generated no rule at all`);
				continue;
			}
			if (!normaliseQuotes(block).includes(normaliseQuotes(OWNED[variant]))) {
				const selector = /&([^{]*)\{/.exec(block.slice(block.indexOf('{') + 1))?.[1]?.trim();
				wrong.push(`${variant} targets ${selector ?? '?'} — expected ${OWNED[variant]}`);
			}
		}

		expect(wrong, 'variants whose compiled rule cannot match the DOM').toEqual([]);
	});

	it('ships the open/closed declarations rather than assuming the app has them', () => {
		// The contract has to travel with the utilities, exactly as @custom-variant
		// dark now does. An app that tidies its own app.css must not be able to
		// take the package's overlay transitions down with it.
		const stylesheet = readFileSync(join(distDir, 'styles.css'), 'utf8');
		expect(stylesheet).toMatch(/@custom-variant\s+data-open\s*\(&\[data-state=['"]open['"]\]\)/);
		expect(stylesheet).toMatch(
			/@custom-variant\s+data-closed\s*\(&\[data-state=['"]closed['"]\]\)/
		);
	});
});

describe('the enter/exit animations those variants gate', () => {
	/**
	 * The second dead layer, found while driving the first. Getting the variant
	 * right only buys a rule that MATCHES; the utility inside it has to exist too,
	 * and `animate-in`, `fade-in-0`, `zoom-in-95` and `slide-in-from-*` are not
	 * Tailwind utilities — they come from tw-animate-css. In an app that never
	 * imported it, all ~40 of them compiled to nothing, so the transitions stayed
	 * just as dead with the variants fixed, for a completely separate reason and
	 * with exactly the same silence.
	 *
	 * The package now imports tw-animate-css itself, on the same principle as the
	 * variants: it writes the utility, so it owns what makes the utility real.
	 */
	const ANIMATION_FAMILIES =
		/\b((?:data-(?:open|closed):)?(?:animate-(?:in|out)|fade-(?:in|out)-\d+|zoom-(?:in|out)-\d+|slide-in-from-[a-z]+-\d+))\b/g;

	function animationCandidates(): string[] {
		const found = new Set<string>();
		for (const file of walk(distDir)) {
			if (!file.endsWith('.svelte') && !file.endsWith('.js')) continue;
			for (const [, utility] of readFileSync(file, 'utf8').matchAll(ANIMATION_FAMILIES)) {
				found.add(utility);
			}
		}
		return [...found].sort();
	}

	const candidates = animationCandidates();

	it('finds animation utilities to check (guards the extractor)', () => {
		expect(candidates.length).toBeGreaterThan(10);
		expect(candidates).toContain('data-open:animate-in');
	});

	it('every one emits a rule in a consuming app that imports nothing extra', () => {
		const css = compile(candidates);
		const dead = candidates.filter((candidate) => ruleBlock(css, candidate) === null);

		expect(
			dead,
			'animation utilities that compile to no CSS — the package writes them, so the package must import what defines them'
		).toEqual([]);
	});

	it('an open overlay actually gets the enter animation, and a closed one the exit', () => {
		// The end of the chain, and the only assertion that says the transition
		// RUNS rather than that a rule exists: the animation shorthand names a real
		// keyframe set, and both keyframe sets are in the output.
		const css = compile(['data-open:animate-in', 'data-closed:animate-out']);

		expect(ruleBlock(css, 'data-open:animate-in')).toMatch(/animation:\s*enter\b/);
		expect(ruleBlock(css, 'data-closed:animate-out')).toMatch(/animation:\s*exit\b/);
		expect(css).toMatch(/@keyframes\s+enter\b/);
		expect(css).toMatch(/@keyframes\s+exit\b/);
	});
});

describe('what bits-ui actually puts in the DOM', () => {
	// The other half of the pin. Without this, OWNED is just a table someone
	// typed, and the day bits-ui renames an attribute the CSS half stays green
	// while every refinement goes dead again.

	it('marks an open overlay with data-state, never with data-open', async () => {
		render(OverlayStates);
		await fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

		const content = await waitFor(() => {
			const el = document.querySelector('[data-slot="dialog-content"]');
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});

		expect(content.getAttribute('data-state')).toBe('open');
		expect(content.hasAttribute('data-open')).toBe(false);
		expect(content.hasAttribute('data-closed')).toBe(false);
	});

	it('marks a menu item that is disabled with the bare attribute', async () => {
		render(OverlayStates);
		await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

		const item = await waitFor(() => {
			const el = screen.getByText('Disabled item');
			return el.closest('[data-slot="dropdown-menu-item"]') ?? el;
		});

		expect(item.hasAttribute('data-disabled')).toBe(true);
	});

	it('marks a select trigger with no value as a placeholder', () => {
		render(OverlayStates);
		const trigger = screen.getByTestId('overlay-select-trigger');
		expect(trigger.hasAttribute('data-placeholder')).toBe(true);
	});
});
