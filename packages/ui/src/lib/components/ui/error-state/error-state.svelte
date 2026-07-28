<script lang="ts">
	import type { Snippet } from 'svelte';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import { cn } from '$lib/utils.js';

	interface Props {
		message: string;
		action?: Snippet;
		class?: string;
	}

	let { message, action, class: className }: Props = $props();
</script>

<div
	class={cn(
		'bg-card border-destructive/40 ds-edge flex flex-col items-center justify-center rounded-lg border p-8 text-center',
		className
	)}
>
	<div class="bg-destructive/10 mb-4 rounded-full p-3">
		<AlertCircle class="text-destructive size-6" />
	</div>
	<p class="text-destructive mb-4 max-w-sm text-sm">{message}</p>
	{#if action}
		{@render action()}
	{/if}
</div>
