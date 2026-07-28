<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfoTip from '../info-tip/info-tip.svelte';

	/**
	 * The one page-title pattern for every route. `subtitle` is a short, single
	 * line that never wraps (line-clamp-1); reserve longer explanation for `info`,
	 * which renders an (i) tooltip beside the title, so the page never carries a
	 * standing explainer banner.
	 *
	 * `title` is optional, and that is a deliberate widening rather than an
	 * oversight. One adopting app could not use this component at all: 19 of its
	 * 22 page headers carry breadcrumbs and 15 have no title, because its page
	 * header IS a breadcrumb bar with actions on the right. A component that
	 * insists on a title excludes that shape entirely.
	 *
	 * It grew a breadcrumb slot rather than becoming a second component. A
	 * separate `BreadcrumbHeader` would have had to re-implement the actions row,
	 * the eyebrow, the info tip and the spacing, and every app would then face a
	 * choice between two page headers that must not drift — which is precisely
	 * the drift this package exists to end. One component, one spacing rhythm,
	 * two shapes.
	 *
	 * The trail itself stays the app's, as a snippet: a breadcrumb trail is made
	 * of routed links, and a package with no SvelteKit runtime of its own cannot
	 * own those (the same reasoning that makes AppShell take `currentPath` as a
	 * prop rather than importing `$app/state`).
	 */
	let {
		eyebrow,
		breadcrumbs,
		title,
		subtitle,
		info,
		actions
	}: {
		/** A short kicker above the title. Use this OR `breadcrumbs`, not both. */
		eyebrow?: string;
		/** The trail above the title — the app's own routed links. */
		breadcrumbs?: Snippet;
		/** Omit for a header that is a breadcrumb bar with actions. */
		title?: string;
		subtitle?: string;
		info?: string;
		actions?: Snippet;
	} = $props();
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
	<div class="min-w-0">
		{#if breadcrumbs}
			<div class="text-muted-foreground mb-1.5 flex min-w-0 items-center text-sm">
				{@render breadcrumbs()}
			</div>
		{/if}
		{#if eyebrow}
			<div class="text-primary text-2xs tracking-eyebrow mb-1 font-medium uppercase">
				{eyebrow}
			</div>
		{/if}
		{#if title}
			<div class="flex items-center gap-2">
				<h1 class="font-display text-display leading-tight font-semibold tracking-[-0.02em]">
					{title}
				</h1>
				{#if info}
					<InfoTip
						text={info}
						class="text-muted-foreground/50 hover:text-muted-foreground mt-0.5 size-4 transition-colors"
					/>
				{/if}
			</div>
		{:else if info}
			<!-- Title-less, but the page still has something to explain. The tip
			     keeps a row of its own rather than being dropped along with the
			     heading it usually sits beside. -->
			<div class="flex items-center gap-2">
				<InfoTip
					text={info}
					class="text-muted-foreground/50 hover:text-muted-foreground size-4 transition-colors"
				/>
			</div>
		{/if}
		{#if subtitle}
			<p class="text-muted-foreground mt-1.5 line-clamp-1 max-w-4xl text-sm">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center justify-end gap-2">{@render actions()}</div>
	{/if}
</div>
