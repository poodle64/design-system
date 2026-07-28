<script lang="ts">
	import type { Status } from '../status/index.js';
	import type { Component } from 'svelte';

	// A single metric, reserved for a figure that earns the space with real
	// context. A bare integer belongs in a StatList.
	let {
		label,
		value,
		unit,
		sub,
		status,
		icon: Icon
	}: {
		label: string;
		value: string | number;
		unit?: string;
		sub?: string;
		status?: Status;
		icon?: Component<{ class?: string }>;
	} = $props();
</script>

<div class="bg-card border-border ds-edge flex flex-col gap-1.5 rounded-lg border p-4">
	<div class="flex items-center gap-2">
		{#if Icon}
			<Icon class="text-muted-foreground size-4" />
		{/if}
		<span class="text-muted-foreground text-2xs tracking-eyebrow font-medium uppercase">
			{label}
		</span>
		{#if status}
			<span class="ds-dot ds-dot-{status} ml-auto"></span>
		{/if}
	</div>
	<div class="flex items-baseline gap-1.5">
		<span class="ds-tabular text-display font-mono leading-none font-semibold">{value}</span>
		{#if unit}
			<span class="text-muted-foreground text-sm">{unit}</span>
		{/if}
	</div>
	{#if sub}
		<p class="text-muted-foreground text-xs">{sub}</p>
	{/if}
</div>
