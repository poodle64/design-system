/**
 * The real-browser gate.
 *
 * `harness/drive.md` records the choreography a human (or an agent) drives by
 * hand; this is the subset a machine can run every time, unattended, in CI. It
 * exists because the three most expensive defects on this programme were all
 * invisible to every other check in the repo AND to jsdom, and were each found
 * by someone happening to look:
 *
 *   - overlay transitions that were dead because the variant matched nothing
 *     and, underneath that, because the animation utility did not exist;
 *   - a shell whose content region scrolled sideways on a phone while the
 *     document-level overflow check stayed green;
 *   - an avatar fallback that only a real failed request exercises.
 *
 * The compiled-CSS gates in `src/test/` prove a rule EXISTS and what selector
 * it carries. Only an engine proves the rule APPLIES to an element that has
 * actually opened, and only an engine has a layout to measure at all.
 *
 * Deterministic on purpose (rules-library/core/73-verification.md §"Scripts
 * Drive, Models Judge"): the choreography is scripted, so a pass is a machine
 * verdict rather than a screenshot someone eyeballed.
 *
 *     pnpm run test:browser        # harness:build + this
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, 'dist');
const PORT = 4181;

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.map': 'application/json'
};

if (!existsSync(join(root, 'index.html'))) {
	console.error('harness/dist is missing — run `pnpm run harness:build` first');
	process.exit(1);
}

const failures = [];
const checks = [];

/** Record a check. `detail` is what was actually observed, and is always shown. */
function check(name, ok, detail) {
	checks.push({ name, ok, detail });
	if (!ok) failures.push(`${name} — observed: ${detail}`);
}

const server = createServer((request, response) => {
	const path = decodeURIComponent(request.url.split('?')[0]);
	let file = join(root, path);
	// A 404 must not silently fall back to index.html: the avatar surface's whole
	// broken-image case depends on a request genuinely failing.
	if (path === '/') file = join(root, 'index.html');
	if (!existsSync(file) || statSync(file).isDirectory()) {
		response.statusCode = 404;
		response.end('not found');
		return;
	}
	response.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream');
	response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const browser = await chromium.launch();

/** A fresh context per surface: a stylesheet cached across navigations is the
 *  trap recorded in drive.md — the new JS runs against the old CSS. */
async function open(query, viewport = { width: 1440, height: 900 }, colorScheme = 'light') {
	const context = await browser.newContext({ viewport, colorScheme });
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto(`http://127.0.0.1:${PORT}/index.html?${query}`, { waitUntil: 'load' });
	return { context, page, errors };
}

// ── The overlay transitions (#6) ────────────────────────────────────────────
// A class-name assertion passes today while the transition is dead, and jsdom
// resolves no animation at all, so the claim is the RESOLVED animation-name on
// the element that opened.
{
	const OVERLAYS = [
		{ trigger: 'Open dialog', body: 'Dialogue body', slot: 'dialog-content', how: 'click' },
		{
			trigger: 'Open menu',
			body: 'Menu body',
			slot: 'dropdown-menu-content',
			how: 'click'
		},
		{ trigger: 'Open popover', body: 'Popover body', slot: 'popover-content', how: 'click' },
		{ trigger: 'Open select', body: 'Select body', slot: 'select-content', how: 'enter' }
	];

	for (const overlay of OVERLAYS) {
		const { context, page, errors } = await open('surface=overlays');
		const trigger = page.getByText(overlay.trigger, { exact: true });
		if (overlay.how === 'enter') {
			await trigger.focus();
			await page.keyboard.press('Enter');
		} else {
			await trigger.click();
		}

		let opened = true;
		try {
			await page
				.getByText(overlay.body, { exact: true })
				.first()
				.waitFor({ state: 'visible', timeout: 4000 });
		} catch {
			opened = false;
		}
		check(`${overlay.trigger}: the overlay opens`, opened, opened ? 'visible' : 'never appeared');

		const measured = await page.evaluate((slot) => {
			const el = document.querySelector(`[data-slot="${slot}"]`);
			if (!el) return null;
			const style = getComputedStyle(el);
			return {
				state: el.getAttribute('data-state'),
				animationName: style.animationName,
				animationDuration: style.animationDuration
			};
		}, overlay.slot);

		check(
			`${overlay.trigger}: bits-ui marks it data-state="open"`,
			measured?.state === 'open',
			JSON.stringify(measured)
		);
		// `none` is exactly what a dead variant OR a missing animation utility
		// produces, and it is what the whole class of defect looks like.
		check(
			`${overlay.trigger}: the enter animation resolves, not "none"`,
			measured?.animationName === 'enter',
			`animation-name: ${measured?.animationName}`
		);
		check(
			`${overlay.trigger}: it has a real duration`,
			measured !== null && parseFloat(measured.animationDuration) > 0,
			`animation-duration: ${measured?.animationDuration}`
		);
		check(`${overlay.trigger}: no page error`, errors.length === 0, JSON.stringify(errors));
		await context.close();
	}
}

// ── The shell's hidden sideways scroll (#5) ─────────────────────────────────
// The measurement every app already takes (documentElement.scrollWidth) is
// asserted here too, and shown to be blind: it passes in both cases while the
// content region genuinely overflows, which is why the region is measured
// directly.
{
	for (const width of [375, 320]) {
		for (const wrapper of ['plain', 'auto']) {
			for (const content of ['table', 'word']) {
				const { context, page } = await open(
					`surface=overflow&wrapper=${wrapper}&content=${content}`,
					{ width, height: 800 }
				);
				await page.waitForSelector('#ds-main');

				const measured = await page.evaluate(() => {
					const main = document.querySelector('#ds-main');
					const container = main.firstElementChild;
					const tableScroller = document.querySelector('[data-slot="table-container"]');
					return {
						mainScroll: main.scrollWidth,
						mainClient: main.clientWidth,
						containerClient: container.clientWidth,
						containerScroll: container.scrollWidth,
						documentScroll: document.documentElement.scrollWidth,
						innerWidth: window.innerWidth,
						tableScrolls: tableScroller.scrollWidth > tableScroller.clientWidth
					};
				});
				const where = `${width}px, ${wrapper} wrapper, ${content}`;

				// The claim the shell actually owns, and the one min-w-0 buys: its
				// content container is the content box, never its own min-content.
				// This is what fails without the fix — the container measured WIDER
				// than <main>, and every child then laid out against that wider box.
				check(
					`${where}: the content container is exactly the content box`,
					measured.containerClient === measured.mainClient,
					`container clientWidth ${measured.containerClient} vs main clientWidth ${measured.mainClient}`
				);

				if (content === 'table') {
					// The reported case. A wide child that carries its own scroller must
					// scroll inside it rather than widening the region around it.
					check(
						`${where}: the content region does not scroll sideways`,
						measured.mainScroll <= measured.mainClient,
						`main scrollWidth ${measured.mainScroll} vs clientWidth ${measured.mainClient} (+${measured.mainScroll - measured.mainClient}px)`
					);
					// Without this the fix could "pass" by clipping the table instead.
					check(
						`${where}: the wide table scrolls inside its own container`,
						measured.tableScrolls,
						`table container scrolls: ${measured.tableScrolls}`
					);
				}

				// Recorded, never asserted as sufficient: this is the measurement every
				// consuming app already takes, and it stays green through real overflow
				// because <main> is the scroll container. Printing it beside the real
				// numbers is the point.
				checks.push({
					name: `${where}: document-level check (the blind one)`,
					ok: true,
					detail: `documentElement.scrollWidth ${measured.documentScroll} vs innerWidth ${measured.innerWidth}; main overflow +${measured.mainScroll - measured.mainClient}px`
				});
				await context.close();
			}
		}
	}
}

// ── Overlays holding more rows than fit (#8) ────────────────────────────────
// `overflow-y-auto` only does something if a height constrains the box, and
// nothing in the class list says so out loud — the utility is present and inert.
// jsdom cannot see it: with no layout, scrollHeight and clientHeight are both 0,
// so `scrollHeight > clientHeight` is false on the fixed build and on the broken
// one alike. The claim has to be measured against a real box, which is why it is
// here and not in `src/test/`.
{
	// `scroller` is the element that genuinely scrolls, which is not always the
	// one carrying the cap. Select is the exception: bits-ui lays its content out
	// as a flex column and gives the viewport `flex: 1; overflow: auto`, so the
	// cap on the content is what gives the viewport a height to be `1` of, and
	// the viewport is what moves. Asserting `scrollHeight > clientHeight` on the
	// content there reads 740 vs 740 and calls a working select broken.
	const LONG = [
		{
			what: 'select',
			trigger: 'Open select',
			how: 'enter',
			slot: 'select-content',
			scroller: '[data-select-viewport]',
			// The pair only bits-ui can render, and only when the viewport can
			// actually scroll — which is the user-visible half of this defect.
			scrollButton: 'select-scroll-down-button'
		},
		{
			what: 'dropdown menu',
			trigger: 'Open menu',
			how: 'click',
			slot: 'dropdown-menu-content',
			scroller: '[data-slot="dropdown-menu-content"]'
		},
		{
			what: 'popover',
			trigger: 'Open popover',
			how: 'click',
			slot: 'popover-content',
			scroller: '[data-slot="popover-content"]'
		},
		{
			what: 'command list',
			trigger: 'Open command',
			how: 'click',
			slot: 'command-list',
			scroller: '[data-slot="command-list"]'
		}
	];

	// Two viewport heights, because one cannot tell a cap that tracks the space
	// available from a lucky constant. A static `max-h-96` passes at 800 and
	// fails at 560; the bits-ui variable passes at both.
	const HEIGHTS = [800, 560];

	for (const overlay of LONG) {
		for (const height of HEIGHTS) {
			// 1280x800 is the viewport the defect was reported at; 36 rows overflow
			// it by several hundred pixels, so nothing here turns on a pixel.
			const { context, page, errors } = await open('surface=long-lists', {
				width: 1280,
				height
			});
			const where = `${overlay.what} @ ${height}px`;
			const trigger = page.getByText(overlay.trigger, { exact: true });
			if (overlay.how === 'enter') {
				await trigger.focus();
				await page.keyboard.press('Enter');
			} else {
				await trigger.click();
			}
			await page.waitForSelector(`[data-slot="${overlay.slot}"]`, { timeout: 4000 });
			// The floating layer positions on a frame, so read after it has settled.
			await page.waitForTimeout(300);

			const measured = await page.evaluate(
				async ({ slot, scroller }) => {
					// The deepest element whose whole text is the last row.
					// Deliberately not a leaf test: a select item wraps its label
					// beside a check indicator, so nothing inside it is childless, and
					// a leaf test finds nothing and reports "unreachable" for entirely
					// the wrong reason.
					const findLastRow = () =>
						[...document.querySelectorAll('*')]
							.filter((node) => node.textContent.trim() === 'Option 36')
							.pop();

					const el = document.querySelector(`[data-slot="${slot}"]`);
					const scroll = document.querySelector(scroller);
					const rect = el.getBoundingClientRect();
					const opened = {
						contentRect: {
							top: Math.round(rect.top),
							height: Math.round(rect.height),
							bottom: Math.round(rect.bottom)
						},
						windowHeight: window.innerHeight,
						scrollHeight: scroll.scrollHeight,
						clientHeight: scroll.clientHeight,
						// Recorded whether or not it resolves: an unset custom property
						// and a consumed one look identical in the class list, and the
						// computed value is the only place the two differ.
						maxHeight: getComputedStyle(el).getPropertyValue('max-height'),
						rowRendered: findLastRow() !== undefined
					};
					// Reaching the last row is the outcome a mouse user needs, so drive
					// the scroll rather than inferring it from the numbers above.
					scroll.scrollTop = scroll.scrollHeight;
					await new Promise((resolve) => requestAnimationFrame(resolve));
					const lastRect = findLastRow()?.getBoundingClientRect();
					return {
						...opened,
						scrolledBy: Math.round(scroll.scrollTop),
						lastRow: lastRect
							? { top: Math.round(lastRect.top), bottom: Math.round(lastRect.bottom) }
							: null
					};
				},
				{ slot: overlay.slot, scroller: overlay.scroller }
			);

			// A row that was never rendered is neither reachable nor unreachable, and
			// would quietly turn the reachability claim below into a no-op.
			check(`${where}: the last of the 36 rows renders`, measured.rowRendered, 'Option 36');
			check(
				`${where}: the rows do not push it past the bottom of the window`,
				measured.contentRect.bottom <= measured.windowHeight,
				`content bottom ${measured.contentRect.bottom} vs window ${measured.windowHeight} (height ${measured.contentRect.height}, max-height ${measured.maxHeight})`
			);
			// Without this the cap could "pass" by clipping the rows instead of
			// scrolling them, which is the same defect wearing a different mask.
			check(
				`${where}: the rows past the fold scroll rather than being clipped`,
				measured.scrollHeight > measured.clientHeight,
				`scrollHeight ${measured.scrollHeight} vs clientHeight ${measured.clientHeight}`
			);
			check(
				`${where}: the last row can actually be reached`,
				measured.lastRow !== null &&
					measured.lastRow.top >= 0 &&
					measured.lastRow.bottom <= measured.windowHeight,
				`after scrolling ${measured.scrolledBy}px, last row at ${JSON.stringify(measured.lastRow)} in a ${measured.windowHeight}px window`
			);

			if (overlay.scrollButton) {
				// bits-ui renders these only while scrolling is possible, so their
				// absence is the user-facing half of the defect rather than a separate
				// one: a select that cannot scroll also shows nothing saying it could.
				const buttonShown = await page.evaluate(
					(slot) => document.querySelectorAll(`[data-slot="${slot}"]`).length,
					overlay.scrollButton
				);
				check(
					`${where}: the scroll affordance appears`,
					buttonShown > 0,
					`[data-slot="${overlay.scrollButton}"] count: ${buttonShown}`
				);
			}
			check(`${where}: no page error`, errors.length === 0, JSON.stringify(errors));
			await context.close();
		}
	}
}

// ── Nav ink against the chrome it is painted on (#11) ───────────────────────
// The defect class: a SHARED component painting a CONSUMER-supplied colour as
// ink. `--ds-color-primary` is validated across the estate as a FILL — the
// template's stated constraint is that it clear AA against its own
// `-foreground` pair — and the shell was additionally consuming it as text on
// its chrome, which is a stricter requirement no app was ever told about. Two
// real app palettes failed it (2.16:1 and 3.48:1 in light mode) while
// satisfying the documented one comfortably.
//
// Nothing but an engine can see this. jsdom applies no stylesheet and hands
// back the unresolved `var(--…)` literal, and the compiled-CSS gates prove a
// rule exists without ever resolving `color-mix()` over a real ancestor stack.
// So the claim is made here, from resolved computed colour, composited the way
// the compositor does it, in both themes.
{
	// Two genuinely different consumer palettes plus the package default. Both
	// fixtures satisfy the DOCUMENTED constraint (asserted below) — that is the
	// whole point: a palette can be entirely sanctioned and still be illegible
	// as ink, which is why the shell may not ask it to be ink.
	const PALETTES = [
		{ name: 'package default', light: null, dark: null },
		{
			// The failing shape: high-lightness warm hue. Barely moves against a
			// near-white chrome, and is unimpeachable as a fill.
			name: 'warm amber',
			light: { primary: 'oklch(0.75 0.11 75)', foreground: 'oklch(0.22 0.03 75)' },
			dark: { primary: 'oklch(0.80 0.10 75)', foreground: 'oklch(0.20 0.03 75)' }
		},
		{
			name: 'saturated blue',
			light: { primary: 'oklch(0.62 0.18 250)', foreground: 'oklch(0.20 0.03 250)' },
			dark: { primary: 'oklch(0.72 0.16 250)', foreground: 'oklch(0.20 0.03 250)' }
		}
	];

	// `.ds-nav-item` transitions `color` over 150ms, and a custom-property swap
	// starts that transition. Reading `getComputedStyle` mid-flight returns the
	// INTERPOLATED colour — serialised as oklab, and still most of the way back
	// at the old hue — so the first run of this gate measured the package
	// default while believing it was measuring the override. Every measurement
	// here is of a settled resting state, so the transition is switched off
	// rather than waited out.
	const SETTLE = '*, *::before, *::after { transition: none !important; animation: none !important; }';

	/** The override a consuming app writes: the sanctioned surface, nothing else. */
	function paletteCss(palette) {
		if (!palette.light) return SETTLE;
		return [
			SETTLE,
			`:root { --ds-color-primary: ${palette.light.primary};`,
			`        --ds-color-primary-foreground: ${palette.light.foreground}; }`,
			`.dark { --ds-color-primary: ${palette.dark.primary};`,
			`        --ds-color-primary-foreground: ${palette.dark.foreground}; }`
		].join('\n');
	}

	// Everything the page needs to answer "what colour is actually painted
	// here", injected as a real script tag: `page.evaluate` cannot close over
	// module scope, and a probe the page owns can be reused by both passes below.
	const PROBE = `
	(() => {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 1;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });

	// Composite a bottom-to-top stack of CSS colours and read the resulting
	// opaque pixel. Letting the engine do it is the point: an oklch(), a
	// color-mix() result and an rgba() all parse and blend exactly as they do on
	// screen, so no colour-space or premultiplication assumption of ours can be
	// wrong. The white base only shows through if every layer is transparent,
	// which is the browser's own canvas default too.
	const composite = (layers) => {
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, 1, 1);
		for (const layer of layers) {
			ctx.fillStyle = layer;
			ctx.fillRect(0, 0, 1, 1);
		}
		const d = ctx.getImageData(0, 0, 1, 1).data;
		return [d[0] / 255, d[1] / 255, d[2] / 255];
	};

	/** Every background between <html> and \`el\`, bottom first. */
	const stack = (el, includeSelf) => {
		const layers = [];
		for (let n = includeSelf ? el : el.parentElement; n; n = n.parentElement) {
			layers.push(getComputedStyle(n).backgroundColor);
		}
		return layers.reverse();
	};

	const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const luminance = ([r, g, b]) =>
		0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
	const contrast = (a, b) => {
		const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
		return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
	};

	/** Contrast of an element's ink against everything painted behind it. */
	const inkRatio = (el, pseudo) => {
		if (!el) return null;
		const colour = getComputedStyle(el, pseudo ?? undefined).color;
		const behind = stack(el, true);
		return contrast(composite([...behind, colour]), composite(behind));
	};

	/** Contrast of an element's own fill against everything behind it. */
	const fillRatio = (el, pseudo) => {
		if (!el) return null;
		const fill = getComputedStyle(el, pseudo ?? undefined).backgroundColor;
		const behind = stack(el, false);
		return contrast(composite([...behind, fill]), composite(behind));
	};

	window.__probe = { composite, stack, contrast, inkRatio, fillRatio };
	})();
	`;

	for (const palette of PALETTES) {
		const css = paletteCss(palette);
		for (const mode of ['light', 'dark']) {
			for (const variant of ['rail', 'header']) {
				const { context, page, errors } = await open(
					`surface=shell&variant=${variant}`,
					{ width: 1440, height: 900 },
					mode
				);
				await page.addStyleTag({ content: css });
				await page.addScriptTag({ content: PROBE });
				await page.waitForSelector('.ds-nav-item[data-active="true"]');
				// Which theme is on screen is the load-bearing fact of this whole
				// section, so it is waited on and never assumed.
				await page.waitForFunction(
					(want) => document.documentElement.classList.contains('dark') === (want === 'dark'),
					mode
				);

				const measured = await page.evaluate(
					(isHeader) => {
						const { inkRatio, fillRatio, composite, contrast } = window.__probe;

						const active = document.querySelector('.ds-nav-item[data-active="true"]');
						const resting = document.querySelector('.ds-nav-item:not([data-active])');
						const badge = active.querySelector('.ds-nav-badge');
						// The rail marks the active row with a flush edge bar; the
						// horizontal row with an underline drawn as ::after, since a
						// left bar there would read as a divider.
						const indicator = active.querySelector('.ds-nav-indicator');

						const style = (el, pseudo) => getComputedStyle(el, pseudo ?? undefined);
						return {
							activeInk: inkRatio(active),
							restingInk: inkRatio(resting),
							badgeInk: badge ? inkRatio(badge) : null,
							indicator: isHeader ? fillRatio(active, '::after') : fillRatio(indicator),
							// The redundancy that licenses not holding the indicator to
							// 1.4.11's 3:1 — asserted, never assumed.
							ariaCurrent: active.getAttribute('aria-current'),
							activeWeight: style(active).fontWeight,
							restingWeight: style(resting).fontWeight,
							activeColour: style(active).color,
							restingColour: style(resting).color,
							// The documented constraint the palette DOES carry, proved
							// against the built package rather than asserted in prose.
							fillPair: (() => {
								const probeEl = document.createElement('span');
								probeEl.style.background = 'var(--primary)';
								probeEl.style.color = 'var(--primary-foreground)';
								document.body.appendChild(probeEl);
								const s = getComputedStyle(probeEl);
								const ratio = contrast(
									composite([s.backgroundColor, s.color]),
									composite([s.backgroundColor])
								);
								probeEl.remove();
								return ratio;
							})()
						};
					},
					variant === 'header'
				);

				const where = `${palette.name}/${mode}/${variant}`;

				// The palette is sanctioned. If this ever fails the fixture is wrong,
				// not the shell — and the whole argument below collapses without it.
				check(
					`${where}: the fixture palette clears AA as a fill, as the template requires`,
					measured.fillPair >= 4.5,
					`primary under primary-foreground: ${measured.fillPair}:1`
				);

				// The headline claim of #11.
				check(
					`${where}: the ACTIVE nav label clears AA on the chrome it sits on`,
					measured.activeInk >= 4.5,
					`${measured.activeInk}:1 (needs 4.5)`
				);
				// Asserted since #13 moved the token (was recorded-only: the resting
				// label is painted in `--ds-color-muted-foreground`, which was below
				// the text floor on every light surface the token package defines —
				// identical under all three palettes here because no consumer colour
				// is involved at all, unlike #11's active-label case above). #13
				// corrected the token package's own value; this is what pins it so it
				// cannot drift back.
				check(
					`${where}: resting nav label clears AA`,
					measured.restingInk >= 4.5,
					`${measured.restingInk}:1 against a 4.5 floor`
				);
				if (measured.badgeInk !== null) {
					// A count badge is text on a tint, so it carries the text floor too —
					// and it sits on the active row's tint as well as its own.
					check(
						`${where}: the nav badge count clears AA on its tint`,
						measured.badgeInk >= 4.5,
						`${measured.badgeInk}:1 (needs 4.5)`
					);
				}

				// WCAG 1.4.11 binds a state indicator at 3:1 only when the state is not
				// available another way. Here it is, three times over — so the bar is
				// free to carry the app's brand hue at full strength, and what gets
				// asserted is the redundancy that earns it that freedom.
				check(
					`${where}: the active state does not rest on the indicator alone`,
					measured.ariaCurrent === 'page' &&
						Number(measured.activeWeight) > Number(measured.restingWeight) &&
						measured.activeColour !== measured.restingColour,
					`aria-current=${measured.ariaCurrent}, weight ${measured.restingWeight}->${measured.activeWeight}, ink ${measured.restingColour} vs ${measured.activeColour}`
				);
				checks.push({
					name: `${where}: brand indicator against the chrome (recorded, not gated)`,
					ok: true,
					detail: `${measured.indicator}:1 — non-text, and redundant per the check above`
				});

				check(`${where}: no page error`, errors.length === 0, JSON.stringify(errors));
				await context.close();
			}
		}
	}

	// The chrome-ink override has to actually reach the nav, or the shell's one
	// documented escape hatch for an inverted chrome is a dead affordance — the
	// exact trap `theme-coverage.test.ts` calls "worse than a missing key".
	// A compiled-CSS gate cannot see this: both declarations exist and are
	// correct in isolation; what decides it is which element the winning
	// declaration sits on, which is a cascade fact only an engine resolves.
	{
		// `sidebar=1` puts a SECOND AppNav on the page background, outside the
		// chrome, because the rule under test has to give two opposite answers at
		// once: the rail follows the chrome's ink, and a route-scoped secondary
		// column must NOT be dragged along with it. Only asserting the loud half
		// would let the quiet half break silently — which is the shape of every
		// defect this harness exists for.
		const { context, page } = await open('surface=shell&variant=rail&sidebar=1');
		await page.addStyleTag({
			content: `${SETTLE}\n:root { --ds-shell-chrome: oklch(0.30 0.03 260); --ds-shell-chrome-foreground: oklch(0.97 0.01 260); --ds-shell-chrome-muted-foreground: oklch(0.80 0.02 260); }`
		});
		await page.addScriptTag({ content: PROBE });
		await page.waitForSelector('.ds-nav-item[data-active="true"]');
		await page.waitForSelector('nav[aria-label="Section"]');
		const measured = await page.evaluate(() => {
			const { inkRatio, composite } = window.__probe;
			// Both sides have to be normalised before they can be compared. A custom
			// property and a `color` resolve to the SAME colour and serialise
			// differently — `oklch(60% .012 85)` against `oklch(0.6 0.012 85)` — so a
			// string compare of the two is a tautology that would pass on the broken
			// build too. Painting each into the canvas and reading the pixel back
			// makes the engine answer "is this the same colour", which is the actual
			// question.
			const rgb = (value) => `rgb(${composite([value]).map((c) => Math.round(c * 255)).join(' ')})`;
			const page = getComputedStyle(document.body);
			const rail = document.querySelector('.ds-shell-rail');
			const secondary = document.querySelector('nav[aria-label="Section"]');
			const read = (scope, selector) => {
				const el = scope.querySelector(selector);
				return { rgb: rgb(getComputedStyle(el).color), ratio: inkRatio(el) };
			};
			return {
				railResting: read(rail, '.ds-nav-item:not([data-active])'),
				railActive: read(rail, '.ds-nav-item[data-active="true"]'),
				secondaryResting: read(secondary, '.ds-nav-item:not([data-active])'),
				secondaryActive: read(secondary, '.ds-nav-item[data-active="true"]'),
				// What the nav WOULD have painted had it kept reading the page's own
				// ink: the value the broken cascade was stuck on, and, for the
				// secondary column, the value it is still supposed to be on.
				pageMuted: rgb(page.getPropertyValue('--muted-foreground')),
				pageInk: rgb(page.getPropertyValue('--foreground'))
			};
		});
		// Two claims, and both are needed. The ratios prove the ink is legible on
		// the inverted chrome; the inequality proves it got there by FOLLOWING the
		// override rather than by the page's ink happening to suit — which is
		// exactly how this stayed invisible while the two defaulted to the same
		// token.
		check(
			'inverted chrome: the nav ink follows --ds-shell-chrome-foreground',
			measured.railResting.rgb !== measured.pageMuted &&
				measured.railActive.rgb !== measured.pageInk &&
				measured.railResting.ratio >= 4.5 &&
				measured.railActive.ratio >= 4.5,
			`resting ${measured.railResting.rgb} at ${measured.railResting.ratio}:1, active ${measured.railActive.rgb} at ${measured.railActive.ratio}:1 (the page's own ink is ${measured.pageMuted} / ${measured.pageInk}, which is what the broken cascade was stuck on)`
		);
		// The other half of the same rule, and the half that would go quiet: a
		// route-scoped column sits on the page background, so dragging it along
		// with the chrome would paint near-white ink on a near-white surface. One
		// rule has to give both answers, so both are asserted.
		check(
			'inverted chrome: a secondary nav outside it keeps the PAGE ink',
			measured.secondaryResting.rgb === measured.pageMuted &&
				measured.secondaryActive.rgb === measured.pageInk &&
				measured.secondaryActive.ratio >= 4.5,
			`resting ${measured.secondaryResting.rgb} at ${measured.secondaryResting.ratio}:1, active ${measured.secondaryActive.rgb} at ${measured.secondaryActive.ratio}:1 (page ink ${measured.pageMuted} / ${measured.pageInk}; the chrome's is ${measured.railActive.rgb})`
		);
		await context.close();
	}
}

// ── The avatar load-state swap (#7) ─────────────────────────────────────────
// Driven over the real network: a genuine 404 and a genuine decode, which is
// the pair jsdom can only stub.
{
	const { context, page } = await open('surface=avatar');
	await page.waitForSelector('[data-probe="avatar-broken"] [data-slot="avatar"]');

	const measured = await page.evaluate(async () => {
		const read = (probe) => {
			const root = document.querySelector(`[data-probe="${probe}"]`);
			const image = root.querySelector('[data-slot="avatar-image"]');
			const fallback = root.querySelector('[data-slot="avatar-fallback"]');
			return {
				status: root.querySelector('[data-slot="avatar"]').getAttribute('data-status'),
				imageShown: image ? getComputedStyle(image).display !== 'none' : false,
				fallbackShown: fallback ? getComputedStyle(fallback).display !== 'none' : false,
				fallbackText: fallback?.textContent?.trim() ?? ''
			};
		};
		// Give the real request time to fail and the real image time to decode.
		await new Promise((resolve) => setTimeout(resolve, 800));
		return {
			broken: read('avatar-broken'),
			loaded: read('avatar-loaded'),
			sourceless: read('avatar-sourceless')
		};
	});

	check(
		'avatar: a source that 404s falls back to the initials',
		measured.broken.status === 'error' &&
			measured.broken.fallbackShown &&
			!measured.broken.imageShown &&
			measured.broken.fallbackText === 'OP',
		JSON.stringify(measured.broken)
	);
	check(
		'avatar: a source that resolves takes over from the fallback',
		measured.loaded.status === 'loaded' &&
			measured.loaded.imageShown &&
			!measured.loaded.fallbackShown,
		JSON.stringify(measured.loaded)
	);
	check(
		'avatar: no source at all still shows the initials',
		measured.sourceless.fallbackShown && measured.sourceless.fallbackText === 'OP',
		JSON.stringify(measured.sourceless)
	);
	await context.close();
}

// ── Scoped theming (#8) ──────────────────────────────────────────────────────
// The claim jsdom cannot make: it never resolves a var() chain, so it cannot
// tell "resolved once at :root, then inherited unchanged below it" apart from
// "resolved live at the element the class sits on" — only a real cascade can.
// Three identical probe sets (see App.svelte): the page default, a subtree
// overriding --ds-color-* only, and a subtree carrying a scoped .dark class.
{
	const { context, page } = await open('surface=theming');
	await page.waitForSelector('[data-probe="root"] [data-slot="bg-background"]');

	const SLOTS = [
		['bg-background', 'backgroundColor'],
		['bg-card', 'backgroundColor'],
		['bg-popover', 'backgroundColor'],
		['bg-muted', 'backgroundColor'],
		['bg-accent', 'backgroundColor'],
		['bg-secondary', 'backgroundColor'],
		['border-input', 'borderTopColor'],
		['text-muted-foreground', 'color']
	];

	const measured = await page.evaluate((slots) => {
		const read = (probe) => {
			const root = document.querySelector(`[data-probe="${probe}"]`);
			return Object.fromEntries(
				slots.map(([slot, prop]) => [
					slot,
					getComputedStyle(root.querySelector(`[data-slot="${slot}"]`))[prop]
				])
			);
		};
		return { root: read('root'), scopedDsColor: read('scoped-ds-color'), scopedDark: read('scoped-dark') };
	}, SLOTS);

	// The scoped subtree set every --ds-color-* key these utilities read to the
	// SAME single colour, so every slot inside it must resolve to that one
	// value — both packages' halves of the surface, one documented lever.
	const overrideValues = new Set(Object.values(measured.scopedDsColor));
	check(
		'scoped --ds-color-* override: every shadcn utility in the subtree resolves to it',
		overrideValues.size === 1,
		JSON.stringify(measured.scopedDsColor)
	);
	// And it must actually have moved something, not coincidentally matched
	// the page default (which would pass the check above for the wrong reason).
	const unmoved = SLOTS.filter(([slot]) => measured.scopedDsColor[slot] === measured.root[slot]).map(
		([slot]) => slot
	);
	check(
		'scoped --ds-color-* override: differs from the unscoped page default',
		unmoved.length === 0,
		`unchanged from root: ${JSON.stringify(unmoved)} (root ${JSON.stringify(measured.root)}, scoped ${JSON.stringify(measured.scopedDsColor)})`
	);

	// A scoped .dark wrapper must move the WHOLE surface within it — every
	// slot, both packages' keys — not just the half that happened to work
	// before #8 (bg-card's bare-name lever) or none of it (bg-background's
	// frozen theme-name lever).
	const stillLight = SLOTS.filter(([slot]) => measured.scopedDark[slot] === measured.root[slot]).map(
		([slot]) => slot
	);
	check(
		'scoped .dark wrapper: moves every shadcn utility in the subtree',
		stillLight.length === 0,
		`unchanged from the light root: ${JSON.stringify(stillLight)} (root ${JSON.stringify(measured.root)}, scoped-dark ${JSON.stringify(measured.scopedDark)})`
	);

	await context.close();
}

await browser.close();
server.close();

for (const { name, ok, detail } of checks) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  [${detail}]`);
}
console.log(`\n${checks.length - failures.length}/${checks.length} checks passed`);
if (failures.length > 0) {
	console.error(`\n${failures.length} FAILED:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
	process.exit(1);
}
