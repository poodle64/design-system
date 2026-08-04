<script lang="ts">
	/**
	 * The application shell: navigation, top bar and page frame, once.
	 *
	 * Primitives and page chrome are not what makes an app feel like an app — the
	 * shell is. Five household frontends were surveyed before this API was
	 * settled, and between them they had built five shells: a rail-plus-drawer,
	 * an eleven-file collapsible sidebar tree under its own top bar, and three
	 * header-only bars that each solved the mobile question differently. They
	 * agreed on almost nothing structurally while looking like they were trying
	 * to be the same thing.
	 *
	 * There is now exactly one composition, no variant prop to choose it: a
	 * permanent side rail on md+ (an overlay drawer below it) carrying primary
	 * navigation, brand and the collapse toggle, PLUS a real top navbar (search,
	 * leading/trailing slots, theme toggle, identity) — always both together.
	 * Operator ruling, 31/07/2026: every household app renders one shell shape;
	 * apps do not choose variants.
	 *
	 * Content WIDTH is the one dimension that came back, as `measure`, and it
	 * came back on a measurement rather than on taste. "Always full-width" did
	 * not remove the decision, it pushed it down into every page: a consumer was
	 * surveyed at 2560px and had six distinct caps across nine routes, every one
	 * of them a hand-written `mx-auto max-w-*` at the top of a `+page.svelte`,
	 * between them using 15% to 79% of the width actually available. That is
	 * fifteen independent guesses, not a shell shape.
	 *
	 * `measure` is a small named scale, chosen once in the layout, and it is not
	 * the old `content` prop returning. It defaults to `full`, so a shell that
	 * never mentions it renders byte-identically; its tiers are CSS custom
	 * properties an app retunes without a release; and it exists to REPLACE
	 * per-page width decisions rather than to offer an app a look.
	 *
	 * Everything else the surveyed apps differed on turned out to be a slot, not
	 * a variant: the brand, the identity surface, a context switcher, a banner, a
	 * secondary column. Those are snippets, so this package imports no app store,
	 * no app route and no app brand — the coupling that made the best shell in
	 * the estate unliftable in the first place.
	 *
	 * The minimum useful call is two props:
	 *
	 *     <AppShell nav={navGroups} brandTitle="Console" currentPath={page.url.pathname}>
	 *       {@render children()}
	 *     </AppShell>
	 */
	import type { Snippet } from 'svelte';
	import type { ShellMeasure } from './measure.js';
	import { toggleMode } from 'mode-watcher';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import Search from '@lucide/svelte/icons/search';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import AppNav from './app-nav.svelte';
	import { toItems, type NavSource } from './types.js';
	import { cn } from '$lib/utils.js';

	let {
		nav,
		navLabel = 'Primary',
		currentPath,
		collapsible = false,
		collapsed = $bindable(false),
		brand,
		brandTitle,
		brandMark,
		homeHref = '/',
		banner,
		context,
		actions,
		identity,
		sidebar,
		onSearch,
		searchLabel = 'Search…',
		searchShortcut = '⌘K',
		themeToggle = true,
		onToggleTheme,
		padded = true,
		measure = 'full',
		mainClass,
		children
	}: {
		/** Navigation: bare items, groups, or a mix. Filter for permissions first. */
		nav?: NavSource;
		/** The primary nav landmark's accessible name — forwarded to the rail/drawer
		    AppNav. Distinguish it from a second shell on the same page, or from a
		    route-scoped secondary AppNav. */
		navLabel?: string;
		/**
		 * The current path, for active state and for closing the mobile nav on
		 * navigation. Apps pass `page.url.pathname`.
		 *
		 * It is a prop rather than a `$app/state` import on purpose: this package
		 * is built with svelte-package and has no SvelteKit runtime of its own, so
		 * importing `$app/state` would make SvelteKit a hard peer AND make the
		 * shell untestable outside a running app. One line at the call site buys
		 * a component that is framework-agnostic and genuinely drivable.
		 */
		currentPath?: string;
		/** Offer an icon-only collapse toggle at the rail foot. */
		collapsible?: boolean;
		/** Rail collapse state. Bind it to persist the choice across sessions. */
		collapsed?: boolean;
		/** Full control of the brand lockup. Overrides brandTitle/brandMark. */
		brand?: Snippet;
		/** Wordmark text, rendered in the display face. */
		brandTitle?: string;
		/** The mark beside the wordmark — an app's own logo component. */
		brandMark?: Snippet;
		/** Where the brand links. */
		homeHref?: string;
		/** Full-width region directly under the top bar: reconnect notices, trials. */
		banner?: Snippet;
		/** Leading top-bar slot, before the search affordance: a context switcher. */
		context?: Snippet;
		/** Trailing top-bar slot, before the theme toggle: app-level action buttons. */
		actions?: Snippet;
		/** The signed-in user surface. Rendered once, at the end of the top bar. */
		identity?: Snippet;
		/** A secondary, route-scoped column between the nav and the page body. */
		sidebar?: Snippet;
		/** Provide to render the search affordance. Usually opens a CommandPalette. */
		onSearch?: () => void;
		searchLabel?: string;
		/** The shortcut hint rendered in the search affordance; '' hides the kbd. */
		searchShortcut?: string;
		themeToggle?: boolean;
		/** Override the theme action. Defaults to mode-watcher's toggleMode. */
		onToggleTheme?: () => void;
		padded?: boolean;
		/**
		 * How wide the page body may get, from a named scale: `prose` (72ch, for
		 * long-form running text), `page` (80rem — forms, detail views,
		 * settings), `wide` (120rem — indexes, grids, tables, dashboards), or
		 * `full` (no cap).
		 *
		 * Defaults to `full`, so a shell that does not mention it is unchanged.
		 * Set it in the layout, once: the point is that pages stop each deciding
		 * their own width. The cap is the content box's border box, so `padded`
		 * spends its padding inside the measure.
		 */
		measure?: ShellMeasure;
		/** Extra classes on the scrolling content container (a background texture). */
		mainClass?: string;
		children: Snippet;
	} = $props();

	const hasNav = $derived(toItems(nav).length > 0);

	// The measure is resolved ONCE, and the class and the attribute both read
	// that one answer. Two independently-worded conditionals looked symmetric
	// and were not: Svelte omits an attribute whose value is `null`, while a
	// class token under the same test survives, so `measure={null}` — which the
	// type forbids but a loosely-typed prop bag or a nullable route field can
	// still deliver — produced the class with no attribute and therefore no
	// matching rule. Harmless to look at, but it breaks the DOM contract the
	// additivity gate states, and a guarantee with a hole in it is not one.
	const capped = $derived(measure != null && measure !== 'full' ? measure : null);

	// The disclosure toggle and the region it opens have to be programmatically
	// related, not merely adjacent: `aria-expanded` says the control is open,
	// `aria-controls` says WHAT it opened, and assistive technology uses the
	// pair to jump straight to the region instead of trusting DOM order (#12).
	//
	// Generated rather than a literal, because the id is a real one in the
	// consumer's document. A fixed `ds-shell-nav` would collide with an app's
	// own element of that name, and would collide with ITSELF the moment a page
	// mounts two shells — and `document.getElementById` would answer with a coin
	// toss, which is the same failure the rail deliberately avoids by being one
	// element rather than two.
	const shellId = $props.id();
	const navRegionId = `${shellId}-nav`;

	// The mobile nav is an overlay below `md`; on `md`+ the rail is a permanent
	// column and this stays false. It closes on any navigation so a tap-through
	// never leaves it covering the page it just opened.
	let mobileNavOpen = $state(false);
	$effect(() => {
		// Reading `currentPath` registers this effect to re-run on every
		// navigation — link tap, palette jump, or back button — which is exactly
		// when the mobile nav should close.
		void currentPath;
		mobileNavOpen = false;
	});

	// The DRAWER is never collapsed, and that `&& !mobileNavOpen` is a fix rather
	// than a flourish. The rail and the drawer are one element carrying one
	// `collapsed` state, so a user who collapsed the rail on a desktop and later
	// opened the menu on a phone was handed a 3.5rem icon-only drawer with no way
	// out — the Collapse control is `md:flex` and does not render at that width.
	// Nesting did not cause that, it raised the stakes: a collapsed rail renders
	// no children, so the phone would have lost the sub-navigation entirely.
	// `mobileNavOpen` implies narrow (the matchMedia effect below is what earns
	// that), so this can never suppress a legitimate desktop collapse.
	const railCollapsed = $derived(collapsible && collapsed && !mobileNavOpen);

	// Focus follows the overlay, in both directions. Opening a drawer and leaving
	// the caret behind it strands a keyboard user in a page they can no longer
	// see; closing it without returning focus drops them at the top of the
	// document. Neither is visible in a screenshot and neither is something the
	// consuming app can fix from the outside, so the shell owns it.
	let menuButton = $state<HTMLButtonElement | null>(null);
	let overlayFirstFocus = $state<HTMLElement | null>(null);
	$effect(() => {
		if (mobileNavOpen) overlayFirstFocus?.focus();
	});

	function closeMobileNav() {
		if (!mobileNavOpen) return;
		mobileNavOpen = false;
		menuButton?.focus();
	}

	// Crossing up into md closes the overlay. Without this, opening the drawer on
	// a phone and then widening (rotate, split-view, a resized window) leaves
	// `mobileNavOpen` true while the rail is back in flow — a stale state that
	// also makes the modal semantics below wrong. Closing it here is what earns
	// the invariant the dialog role depends on: open implies narrow.
	$effect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return;
		const wide = window.matchMedia('(min-width: 48rem)');
		const sync = () => {
			if (wide.matches) mobileNavOpen = false;
		};
		sync();
		wide.addEventListener('change', sync);
		return () => wide.removeEventListener('change', sync);
	});

	// Tab must not walk out of an overlay into the page it is covering. A full
	// `inert` on the rest of the shell would be the heavier answer; wrapping at
	// the ends is enough here because the overlay's content is a short, flat list.
	function trapTab(event: KeyboardEvent) {
		if (event.key !== 'Tab' || !mobileNavOpen) return;
		const overlay = event.currentTarget as HTMLElement;
		const candidates = [
			...overlay.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
		].filter((el) => el.tabIndex !== -1);
		// Drop what CSS has hidden — the collapse control is display:none below md
		// and must not be a tab stop. `getClientRects()` is the check that works
		// against a real layout; where there is no layout engine at all it reports
		// EVERYTHING as hidden, so an empty result means "cannot tell", not "none",
		// and the trap falls back to the unfiltered set rather than silently
		// switching itself off.
		const visible = candidates.filter((el) => el.getClientRects().length > 0);
		const focusable = visible.length > 0 ? visible : candidates;
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function toggleTheme() {
		if (onToggleTheme) onToggleTheme();
		else toggleMode();
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closeMobileNav();
	}}
/>

{#snippet brandLockup(compact = false)}
	<a
		href={homeHref}
		class={cn(
			'flex flex-none items-center gap-2.5',
			compact ? '' : 'h-14 px-4',
			railCollapsed && !compact && 'justify-center px-0'
		)}
		aria-label={brandTitle ?? 'Home'}
	>
		{#if brand}
			{@render brand()}
		{:else}
			{#if brandMark}
				<span class="border-border bg-background grid size-8 flex-none place-items-center rounded-md border">
					{@render brandMark()}
				</span>
			{/if}
			{#if brandTitle && !railCollapsed}
				<span class="font-display text-body font-semibold tracking-tight">{brandTitle}</span>
			{/if}
		{/if}
	</a>
{/snippet}

<div class="ds-shell bg-background text-foreground flex h-dvh overflow-hidden">
	<!-- WCAG 2.4.1: every app gets the bypass link, rather than one app having it. -->
	<a href="#ds-main" class="ds-skip-link">Skip to content</a>

	{#if hasNav}
		{#if mobileNavOpen}
			<button
				class="bg-background/70 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
				aria-label="Dismiss menu"
				tabindex="-1"
				onclick={closeMobileNav}
			></button>
		{/if}

		<!--
			ONE element, not two. The desktop rail and the mobile drawer are the
			same aside wearing a different `data-drawer` state, because rendering
			the rail's contents twice duplicates whatever the CONSUMER put in the
			`identity` snippet — a second copy of their menu, their test hooks, and
			any `id` they wrote, live in the DOM at the same time. Which of the two
			`document.getElementById` then answers with is a coin toss the consumer
			never agreed to. The reference shell rendered it twice; that is the one
			piece of its behaviour deliberately not carried over.

			The rail/drawer swap is therefore CSS on this single element (see
			`.ds-shell-rail[data-drawer]` in styles.css) rather than two branches.
		-->
		<aside
			id={navRegionId}
			class="ds-shell-rail bg-shell text-shell-foreground border-border flex-none flex-col border-r"
			data-collapsed={railCollapsed ? 'true' : undefined}
			data-drawer={mobileNavOpen ? 'true' : undefined}
			data-testid={mobileNavOpen ? 'ds-shell-drawer' : undefined}
			role={mobileNavOpen ? 'dialog' : undefined}
			aria-modal={mobileNavOpen ? 'true' : undefined}
			aria-label={mobileNavOpen ? 'Navigation' : undefined}
			onkeydown={trapTab}
		>
			{#if mobileNavOpen}
				<button
					bind:this={overlayFirstFocus}
					onclick={closeMobileNav}
					class="border-border text-shell-muted-foreground hover:text-shell-foreground absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-md border md:hidden"
					aria-label="Close menu"
				>
					<X class="size-4" />
				</button>
			{/if}

			{@render brandLockup()}
			<AppNav
				{nav}
				{currentPath}
				collapsed={railCollapsed}
				label={navLabel}
				onNavigate={() => (mobileNavOpen = false)}
			/>

			{#if collapsible}
				<button
					type="button"
					onclick={() => (collapsed = !collapsed)}
					class="text-shell-muted-foreground hover:text-shell-foreground hidden items-center gap-2.5 px-4 py-2 text-sm transition-colors md:flex"
					aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
					aria-pressed={collapsed}
					data-testid="ds-rail-collapse"
				>
					{#if collapsed}
						<PanelLeftOpen class="size-4 flex-none" />
					{:else}
						<PanelLeftClose class="size-4 flex-none" />
						<span>Collapse</span>
					{/if}
				</button>
			{/if}
		</aside>
	{/if}

	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<header
			class="ds-shell-bar bg-shell/80 text-shell-foreground border-border sticky top-0 z-20 flex h-14 flex-none items-center gap-2 border-b px-3 backdrop-blur sm:gap-3 sm:px-5"
		>
			{#if hasNav}
				<!-- `aria-controls` names the region this toggle opens. It is present
				     whenever that region is in the document, which is always — the
				     rail and the drawer are ONE element, so the reference is live from
				     first render and never dangles. -->
				<button
					bind:this={menuButton}
					onclick={() => (mobileNavOpen ? closeMobileNav() : (mobileNavOpen = true))}
					class="border-border text-shell-muted-foreground hover:text-shell-foreground grid size-9 flex-none place-items-center rounded-md border md:hidden"
					aria-label="Menu"
					aria-expanded={mobileNavOpen}
					aria-controls={navRegionId}
					data-testid="ds-shell-menu"
				>
					{#if mobileNavOpen}
						<X class="size-4" />
					{:else}
						<Menu class="size-4" />
					{/if}
				</button>
			{/if}

			<!-- The rail carries the brand on md+; below md the rail is gone, so the
			     bar carries it or the app loses its identity on a phone entirely. -->
			<span class={hasNav ? 'flex md:hidden' : 'flex'}>
				{@render brandLockup(true)}
			</span>

			{#if context}{@render context()}{/if}

			{#if onSearch}
				<button
					onclick={onSearch}
					class="border-border text-shell-muted-foreground hover:text-shell-foreground flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors sm:w-[clamp(200px,32vw,560px)] sm:flex-none"
					data-testid="ds-shell-search"
				>
					<Search class="size-4 flex-none" />
					<span class="truncate">{searchLabel}</span>
					{#if searchShortcut}
						<kbd
							class="border-border bg-background text-shell-muted-foreground text-2xs ml-auto hidden rounded border px-1.5 py-0.5 font-mono sm:block"
							>{searchShortcut}</kbd
						>
					{/if}
				</button>
			{/if}

			<div class="ml-auto flex flex-none items-center gap-2 sm:gap-3">
				{#if actions}{@render actions()}{/if}

				{#if themeToggle}
					<button
						onclick={toggleTheme}
						class="border-border text-shell-muted-foreground hover:text-shell-foreground grid size-9 flex-none place-items-center rounded-md border transition-colors"
						aria-label="Toggle theme"
						data-testid="ds-shell-theme"
					>
						<Sun class="size-4 dark:hidden" />
						<Moon class="hidden size-4 dark:block" />
					</button>
				{/if}

				{#if identity}{@render identity()}{/if}
			</div>
		</header>

		{#if banner}{@render banner()}{/if}

		<div class="flex min-h-0 min-w-0 flex-1">
			{#if sidebar}
				<div class="border-border hidden min-h-0 flex-none border-r md:flex">
					{@render sidebar()}
				</div>
			{/if}
			<!--
				The scrolling content region, and the element a consumer's
				"no horizontal overflow" test must measure.

				`overflow-y: auto` makes `overflow-x` compute to `auto` too, so this
				box — not the document — is where a wide child's excess ends up. Every
				app's overflow check measures `document.documentElement.scrollWidth`,
				which is why one app carried 39px of sideways scroll at 375px with its
				suite green throughout: the number it was reading could not move.

				`data-slot` rather than the `id` for that: `ds-main` is the skip link's
				target and an app is free to have its own `#ds-main` ambitions, whereas
				the slot marker is the same stable hook every other component here
				exposes. `harness/drive.mjs` measures this element at 375px and 320px
				and prints the document-level number beside it, blind, for contrast.
			-->
			<main
				id="ds-main"
				data-slot="app-shell-content"
				tabindex="-1"
				class={cn('relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto', mainClass)}
			>
				<!--
					`min-w-0` on a flex child, for the same reason `<main>` and both
					boxes above it carry it: a flex item's default `min-width: auto` can
					size it by its own min-content rather than by its container.

					Measured rather than assumed, and the measurement is worth writing
					down because it contradicts the obvious reading: in THIS structure
					the declaration is currently INERT. The automatic minimum size
					applies to a flex item's MAIN axis, and `<main>` is a column, so this
					box's width is already cross-axis stretch and cannot grow past its
					container. Driving the harness at 375px and 320px, with and without
					the declaration, against a plain page wrapper and an `mx-auto` one,
					moved nothing — `harness/drive.mjs` pins that.

					It stays because it is the correct declaration for the box, and
					because the day this container becomes a row item the omission would
					be invisible all over again. What it is NOT is the cause of the
					sideways scroll in #5: that comes from a child with no scroller of
					its own, which no sizing rule here can prevent — only the child
					carrying its own scroller can, as this package's Table does. The half
					of that defect the shell genuinely owns is on `<main>` above.
				-->
				<!--
					`measure` caps and centres this box, through `.ds-shell-measure`
					in styles.css rather than a utility here — an arbitrary
					`max-w-[var(…)]` only exists if the consumer's Tailwind build
					scanned the file spelling it, and a cap that silently does not
					compile is the failure mode this package gates against everywhere
					else.

					At `full` the class and the attribute are both ABSENT, not set to
					a no-op value. That is what makes the prop additive: a consumer
					who never names it gets the same element, the same class string
					and the same declarations as before it existed, so there is
					nothing for the cascade to resolve differently. Both read the
					single `capped` answer above, so they cannot disagree.
				-->
				<div
					class={cn(
						'flex min-h-0 min-w-0 flex-1 flex-col',
						'w-full',
						capped && 'ds-shell-measure',
						padded && 'px-4 py-5 sm:px-6 md:px-8 md:py-7 2xl:px-12'
					)}
					data-measure={capped ?? undefined}
				>
					{@render children()}
				</div>
			</main>
		</div>
	</div>
</div>
