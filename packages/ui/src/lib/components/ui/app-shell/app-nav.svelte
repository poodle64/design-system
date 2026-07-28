<script lang="ts">
	/**
	 * The vertical navigation list.
	 *
	 * Rendered in three places by AppShell — the desktop rail, the mobile drawer,
	 * and the header variant's mobile disclosure panel — and exported in its own
	 * right so an app with a SECOND, route-scoped navigation column (a per-module
	 * sidebar) uses the same affordance rather than hand-building a near-copy.
	 * That was the concrete shape of the drift in the estate: one app's inner
	 * sidebar had reimplemented the active indicator, the group separators and
	 * the collapse behaviour independently of its own top bar.
	 */
	import { isNavItemActive, toGroups, type NavSource } from './types.js';
	import { cn } from '$lib/utils.js';

	let {
		nav,
		currentPath,
		collapsed = false,
		label = 'Primary',
		onNavigate,
		class: className
	}: {
		nav?: NavSource;
		/** The active path. Apps pass `page.url.pathname`; see AppShell. */
		currentPath?: string;
		/** Icon-only mode. Labels stay in the accessible tree via sr-only text. */
		collapsed?: boolean;
		/** Accessible name for the landmark; distinguish a secondary column. */
		label?: string;
		/** Fired after any nav link activates — AppShell uses it to shut the drawer. */
		onNavigate?: () => void;
		class?: string;
	} = $props();

	const groups = $derived(toGroups(nav));
</script>

<nav
	class={cn('ds-nav flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4', className)}
	aria-label={label}
	data-collapsed={collapsed ? 'true' : undefined}
>
	{#each groups as group, i (group.heading ?? group.items[0]?.href ?? i)}
		<div class="flex flex-col gap-1">
			{#if group.heading && !collapsed}
				<div class="ds-nav-heading">{group.heading}</div>
			{:else if group.heading && collapsed && i > 0}
				<!-- Collapsed, a heading cannot be read, so the grouping it conveyed
				     survives as a rule instead of vanishing. -->
				<div class="border-border mx-1 mb-1 border-t" role="presentation"></div>
			{/if}
			{#each group.items as item (item.href)}
				{@const active = isNavItemActive(item, currentPath)}
				<a
					href={item.href}
					class="ds-nav-item"
					data-active={active ? 'true' : undefined}
					aria-current={active ? 'page' : undefined}
					title={collapsed ? item.label : undefined}
					target={item.external ? '_blank' : undefined}
					rel={item.external ? 'noreferrer noopener' : undefined}
					onclick={onNavigate}
				>
					{#if active}
						<span class="ds-nav-indicator"></span>
					{/if}
					{#if item.icon}
						<item.icon class="size-4.5 flex-none" />
					{:else if collapsed}
						<!-- Icon-less item, collapsed: an initial keeps the row clickable
						     and identifiable rather than rendering an empty target. -->
						<span class="grid size-4.5 flex-none place-items-center text-xs font-semibold"
							>{item.label.slice(0, 1).toUpperCase()}</span
						>
					{/if}
					<span class={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
					{#if item.badge !== undefined && !collapsed}
						<span class="ds-nav-badge">{item.badge}</span>
					{/if}
				</a>
			{/each}
		</div>
	{/each}
</nav>
