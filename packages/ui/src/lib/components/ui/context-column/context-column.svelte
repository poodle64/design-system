<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import StatList from '../stat-list/stat-list.svelte';
	import type { StatItem } from '../stat-list/stat-list.svelte';

	// The persistent right-hand context column, identical on every route. It holds
	// one standing "At a glance" stat card and, on routes with a selectable table,
	// the selected-row detail beneath it (a DetailPanel passed as the `detail`
	// snippet). The stat card stays put; the detail flows in on select and leaves
	// on deselect, so the column never changes shape.
	//
	// Width is clamped (shared-design-language §6) so a wide screen earns
	// information, not emptiness. The column is a flex child of the page body row;
	// the stat card is shrink-0 and any detail takes the remaining height with its
	// own inner scroll.
	//
	// Below xl (1280px) the column is hidden so the primary pane keeps full width:
	// a fixed nav rail plus a ~400px column would crush the content on a narrow
	// screen. The proper narrow-viewport treatment (off-canvas nav, stacking panes)
	// is a separate workstream; this is the regression guard until it lands.
	let {
		stats,
		statsTitle = 'At a glance',
		statsInfo,
		detail,
		/** The landmark's accessible name. `<aside>` with no name is exposed as
		    "complementary" alone — set this to identify which one. */
		ariaLabel,
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> & {
		stats: StatItem[];
		statsTitle?: string;
		statsInfo?: string;
		detail?: Snippet;
		ariaLabel?: string;
	} = $props();
</script>

<aside
	bind:this={ref}
	aria-label={ariaLabel}
	class={cn(
		'hidden max-h-full min-h-0 w-[clamp(360px,28vw,460px)] shrink-0 flex-col gap-5 xl:flex',
		className
	)}
	{...restProps}
>
	<StatList items={stats} title={statsTitle} info={statsInfo} />
	{#if detail}
		{@render detail()}
	{/if}
</aside>
