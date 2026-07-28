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
async function open(query, viewport = { width: 1440, height: 900 }) {
	const context = await browser.newContext({ viewport });
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
