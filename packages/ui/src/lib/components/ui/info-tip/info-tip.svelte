<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Tooltip from '../tooltip/index.js';
	import Info from '@lucide/svelte/icons/info';

	// One tooltip pattern for the whole app. Pass `text` for the hint; wrap an
	// existing affordance by passing it as children (e.g. a status dot or a
	// capability chip), or omit children to render a small info icon trigger.
	let {
		text,
		side = 'top',
		children,
		class:
			className = 'text-muted-foreground/60 hover:text-muted-foreground size-3.5 transition-colors'
	}: {
		text: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
		children?: Snippet;
		class?: string;
	} = $props();
</script>

<Tooltip.Provider delayDuration={150}>
	<Tooltip.Root>
		<Tooltip.Trigger class="inline-flex cursor-help items-center align-middle">
			{#if children}
				{@render children()}
			{:else}
				<Info class={className} aria-hidden="true" />
			{/if}
			<span class="sr-only">{text}</span>
		</Tooltip.Trigger>
		<Tooltip.Content {side} class="max-w-xs text-xs">
			{text}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
