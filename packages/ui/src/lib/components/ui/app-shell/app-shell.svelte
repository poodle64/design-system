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
	 * Two variants cover all five, because the only structural disagreement that
	 * survived scrutiny is WHERE PRIMARY NAVIGATION LIVES:
	 *
	 *   variant="rail"    a permanent left column on md+, an overlay drawer below
	 *   variant="header"  a horizontal row in the top bar, a disclosure panel below
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
	import { toggleMode } from 'mode-watcher';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import Search from '@lucide/svelte/icons/search';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import AppNav from './app-nav.svelte';
	import { isNavItemActive, toItems, type NavSource } from './types.js';
	import { cn } from '$lib/utils.js';

	let {
		nav,
		currentPath,
		variant = 'rail',
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
		content = 'full',
		padded = true,
		mainClass,
		children
	}: {
		/** Navigation: bare items, groups, or a mix. Filter for permissions first. */
		nav?: NavSource;
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
		/** Where primary navigation lives. */
		variant?: 'rail' | 'header';
		/** Rail only: offer an icon-only collapse toggle at the rail foot. */
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
		/**
		 * The signed-in user surface. Rendered in the rail foot under
		 * variant="rail" and at the end of the top bar under variant="header",
		 * which is where the surveyed apps already put it in each case.
		 */
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
		/**
		 * The content ceiling. Named rather than free-form because a page's
		 * measure is a design-system decision: 'full' for a dense console that
		 * earns the whole viewport, 'wide' (120rem) for dashboards, 'standard'
		 * (80rem) for reading-weight pages.
		 */
		content?: 'full' | 'wide' | 'standard';
		padded?: boolean;
		/** Extra classes on the scrolling content container (a background texture). */
		mainClass?: string;
		children: Snippet;
	} = $props();

	const isRail = $derived(variant === 'rail');
	const hasNav = $derived(toItems(nav).length > 0);
	const railCollapsed = $derived(isRail && collapsible && collapsed);

	// The mobile nav is an overlay below `md`; on `md`+ the rail is a permanent
	// column (or the nav is inline in the bar) and this stays false. It closes on
	// any navigation so a tap-through never leaves it covering the page it just
	// opened.
	let mobileNavOpen = $state(false);
	$effect(() => {
		// Reading `currentPath` registers this effect to re-run on every
		// navigation — link tap, palette jump, or back button — which is exactly
		// when the mobile nav should close.
		void currentPath;
		mobileNavOpen = false;
	});

	function toggleTheme() {
		if (onToggleTheme) onToggleTheme();
		else toggleMode();
	}

	const contentWidth = $derived(
		content === 'wide'
			? 'mx-auto w-full max-w-[120rem]'
			: content === 'standard'
				? 'mx-auto w-full max-w-[80rem]'
				: 'w-full'
	);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') mobileNavOpen = false;
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

	{#if isRail && hasNav}
		{#if mobileNavOpen}
			<button
				class="bg-background/70 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
				aria-label="Close menu"
				onclick={() => (mobileNavOpen = false)}
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
			class="ds-shell-rail bg-shell border-border flex-none flex-col border-r"
			data-collapsed={railCollapsed ? 'true' : undefined}
			data-drawer={mobileNavOpen ? 'true' : undefined}
			data-testid={mobileNavOpen ? 'ds-shell-drawer' : undefined}
		>
			{#if mobileNavOpen}
				<button
					onclick={() => (mobileNavOpen = false)}
					class="border-border text-muted-foreground hover:text-foreground absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-md border md:hidden"
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
				onNavigate={() => (mobileNavOpen = false)}
			/>

			{#if collapsible}
				<button
					type="button"
					onclick={() => (collapsed = !collapsed)}
					class="text-muted-foreground hover:text-foreground hidden items-center gap-2.5 px-4 py-2 text-sm transition-colors md:flex"
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

			{#if identity}
				<div class="border-border border-t">{@render identity()}</div>
			{/if}
		</aside>
	{/if}

	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<header
			class="ds-shell-bar bg-shell/80 border-border sticky top-0 z-20 flex h-14 flex-none items-center gap-2 border-b px-3 backdrop-blur sm:gap-3 sm:px-5"
		>
			{#if hasNav}
				<button
					onclick={() => (mobileNavOpen = !mobileNavOpen)}
					class="border-border text-muted-foreground hover:text-foreground grid size-9 flex-none place-items-center rounded-md border md:hidden"
					aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={mobileNavOpen}
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
			<span class={isRail && hasNav ? 'flex md:hidden' : 'flex'}>
				{@render brandLockup(true)}
			</span>

			{#if !isRail && hasNav}
				<nav
					class="ds-nav ds-nav-horizontal hidden min-w-0 items-center gap-1 overflow-x-auto md:flex"
					aria-label="Primary"
				>
					{#each toItems(nav) as item (item.href)}
						{@const active = isNavItemActive(item, currentPath)}
						<a
							href={item.href}
							class="ds-nav-item"
							data-active={active ? 'true' : undefined}
							aria-current={active ? 'page' : undefined}
							target={item.external ? '_blank' : undefined}
							rel={item.external ? 'noreferrer noopener' : undefined}
						>
							{#if item.icon}<item.icon class="size-4 flex-none" />{/if}
							<span class="hidden lg:inline">{item.label}</span>
							<span class="sr-only lg:hidden">{item.label}</span>
							{#if item.badge !== undefined}<span class="ds-nav-badge">{item.badge}</span>{/if}
						</a>
					{/each}
				</nav>
			{/if}

			{#if context}{@render context()}{/if}

			{#if onSearch}
				<button
					onclick={onSearch}
					class="border-border text-muted-foreground hover:text-foreground flex min-w-0 flex-1 items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors sm:w-[clamp(200px,32vw,560px)] sm:flex-none"
					data-testid="ds-shell-search"
				>
					<Search class="size-4 flex-none" />
					<span class="truncate">{searchLabel}</span>
					{#if searchShortcut}
						<kbd
							class="border-border bg-background text-muted-foreground text-2xs ml-auto hidden rounded border px-1.5 py-0.5 font-mono sm:block"
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
						class="border-border text-muted-foreground hover:text-foreground grid size-9 flex-none place-items-center rounded-md border transition-colors"
						aria-label="Toggle theme"
						data-testid="ds-shell-theme"
					>
						<Sun class="size-4 dark:hidden" />
						<Moon class="hidden size-4 dark:block" />
					</button>
				{/if}

				{#if identity && !isRail}{@render identity()}{/if}
			</div>
		</header>

		{#if !isRail && hasNav && mobileNavOpen}
			<!-- Header variant, below md: nav opens as a disclosure panel under the
			     bar rather than a side drawer. A drawer sliding in from the left
			     with nothing on the left is a gesture with no origin; the panel
			     drops from the control that opened it. -->
			<div class="ds-shell-panel border-border bg-shell border-b md:hidden" data-testid="ds-shell-panel">
				<AppNav
					{nav}
					{currentPath}
					class="max-h-[60vh] py-2"
					onNavigate={() => (mobileNavOpen = false)}
				/>
			</div>
		{/if}

		{#if banner}{@render banner()}{/if}

		<div class="flex min-h-0 min-w-0 flex-1">
			{#if sidebar}
				<div class="border-border hidden min-h-0 flex-none border-r md:flex">
					{@render sidebar()}
				</div>
			{/if}
			<main
				id="ds-main"
				tabindex="-1"
				class={cn('relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto', mainClass)}
			>
				<div
					class={cn(
						'flex min-h-0 flex-1 flex-col',
						contentWidth,
						padded && 'px-4 py-5 sm:px-6 md:px-8 md:py-7 2xl:px-12'
					)}
				>
					{@render children()}
				</div>
			</main>
		</div>
	</div>
</div>
