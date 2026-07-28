<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		icon?: Component<{ class?: string }>;
		title: string;
		description?: string;
		action?: Snippet;
		class?: string;
	}

	let { icon: Icon, title, description, action, class: className }: Props = $props();
</script>

<div
	class={cn(
		'bg-card border-border ds-edge flex flex-col items-center justify-center rounded-lg border p-8 text-center',
		className
	)}
>
	{#if Icon}
		<div class="bg-muted mb-4 rounded-full p-3">
			<Icon class="text-muted-foreground size-6" />
		</div>
	{/if}
	<h3 class="text-foreground mb-1 text-lg font-semibold">{title}</h3>
	{#if description}
		<p class="text-muted-foreground mb-4 max-w-sm text-sm">{description}</p>
	{/if}
	{#if action}
		{@render action()}
	{/if}
</div>
