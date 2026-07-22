<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> & { class?: string } = $props();
</script>

<CheckboxPrimitive.Root
	bind:ref
	bind:checked
	bind:indeterminate
	data-slot="checkbox"
	class={cn(
		'peer border-border focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary size-4 shrink-0 rounded-sm border shadow-none transition-shadow focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{#snippet children({ checked: isChecked, indeterminate: isIndeterminate })}
		<span class="flex items-center justify-center text-current">
			{#if isIndeterminate}
				<Minus class="size-3" />
			{:else if isChecked}
				<Check class="size-3" />
			{/if}
		</span>
	{/snippet}
</CheckboxPrimitive.Root>
