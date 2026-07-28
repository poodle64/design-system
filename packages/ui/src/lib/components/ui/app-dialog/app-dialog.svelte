<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import * as Dialog from '../dialog/index.js';
	import X from '@lucide/svelte/icons/x';

	// The one dialogue frame: a titled header with optional icon and subtitle, a
	// scrollable body, and an optional footer action bar. Compose the body from
	// DialogSection so every dialogue separates its information identically.
	let {
		open = $bindable(false),
		title,
		subtitle,
		icon: Icon,
		size = 'md',
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		subtitle?: string;
		icon?: Component<{ class?: string }>;
		size?: 'sm' | 'md' | 'lg';
		children: Snippet;
		footer?: Snippet;
	} = $props();

	const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' };
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="border-border-strong ds-edge flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 {widths[
			size
		]}"
		showCloseButton={false}
	>
		<header class="border-border flex items-start gap-3 border-b px-6 py-5">
			{#if Icon}
				<span
					class="bg-primary/15 text-primary mt-0.5 grid size-8 flex-none place-items-center rounded-md"
				>
					<Icon class="size-4" />
				</span>
			{/if}
			<div class="min-w-0 flex-1">
				<Dialog.Title class="font-display text-lg leading-tight font-semibold tracking-tight"
					>{title}</Dialog.Title
				>
				{#if subtitle}
					<Dialog.Description class="text-muted-foreground mt-0.5 text-sm"
						>{subtitle}</Dialog.Description
					>
				{/if}
			</div>
			<Dialog.Close
				class="text-muted-foreground hover:text-foreground -mt-1 -mr-1 grid size-8 flex-none place-items-center rounded-md transition-colors"
			>
				<X class="size-4" />
				<span class="sr-only">Close</span>
			</Dialog.Close>
		</header>
		<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
			{@render children()}
		</div>
		{#if footer}
			<footer
				class="border-border bg-card/50 flex items-center justify-end gap-3 border-t px-6 py-4"
			>
				{@render footer()}
			</footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
