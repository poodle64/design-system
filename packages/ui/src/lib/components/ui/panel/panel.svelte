<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { WithElementRef } from '$lib/utils.js';

	// The generic titled card. Where DetailPanel is the *entity* surface (and owns
	// a status and a close affordance), Panel is the plain sectioning card any
	// route reaches for: an optional header with icon, subtitle and trailing
	// actions, over a body that can opt out of padding for a flush table.
	let {
		title,
		subtitle,
		icon: Icon,
		action,
		children,
		pad = true,
		class: klass = '',
		ref = $bindable(null),
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		subtitle?: string;
		icon?: Component<{ class?: string }>;
		action?: Snippet;
		children: Snippet;
		pad?: boolean;
	} = $props();
</script>

<section
	bind:this={ref}
	class="bg-card border-border ds-edge flex flex-col overflow-hidden rounded-lg border {klass}"
	{...restProps}
>
	{#if title}
		<header class="border-border flex items-center gap-2.5 border-b px-4 py-3">
			{#if Icon}
				<Icon class="text-muted-foreground size-4" />
			{/if}
			<div class="min-w-0">
				<h2 class="text-body leading-tight font-semibold tracking-tight">{title}</h2>
				{#if subtitle}
					<p class="text-muted-foreground truncate text-xs">{subtitle}</p>
				{/if}
			</div>
			{#if action}
				<div class="ml-auto flex items-center gap-1.5">{@render action()}</div>
			{/if}
		</header>
	{/if}
	<div class={pad ? 'p-4' : ''}>
		{@render children()}
	</div>
</section>
