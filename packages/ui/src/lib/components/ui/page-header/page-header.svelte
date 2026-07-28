<script lang="ts">
	import type { Snippet } from 'svelte';
	import InfoTip from '../info-tip/info-tip.svelte';

	// The one page-title pattern for every route. `subtitle` is a short, single
	// line that never wraps (line-clamp-1); reserve longer explanation for `info`,
	// which renders an (i) tooltip beside the title, so the page never carries a
	// standing explainer banner.
	let {
		eyebrow,
		title,
		subtitle,
		info,
		actions
	}: {
		eyebrow?: string;
		title: string;
		subtitle?: string;
		info?: string;
		actions?: Snippet;
	} = $props();
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
	<div class="min-w-0">
		{#if eyebrow}
			<div class="text-primary text-2xs tracking-eyebrow mb-1 font-medium uppercase">
				{eyebrow}
			</div>
		{/if}
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
		{#if subtitle}
			<p class="text-muted-foreground mt-1.5 line-clamp-1 max-w-4xl text-sm">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center justify-end gap-2">{@render actions()}</div>
	{/if}
</div>
