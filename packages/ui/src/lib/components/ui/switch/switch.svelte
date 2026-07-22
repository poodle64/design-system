<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> = $props();
</script>

<!--
  Standard shadcn-svelte Switch with two adaptations for Portcullis: the console's
  root font-size is 18px (not 16px), which inflates the stock rem-based
  h-5/h-4/translate-x-4 and leaves the thumb filling the track, so the dimensions
  are pinned in px with a 3px inset all round (the border); and the thumb is
  darkened to dark:bg-foreground so the ball stays light on the dark-first theme.
  The track colour comes from the project tokens.
-->
<SwitchPrimitive.Root
	bind:ref
	bind:checked
	class={cn(
		'peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border-[3px] border-transparent shadow-sm transition-colors',
		'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		class={cn(
			'bg-background dark:bg-foreground pointer-events-none block h-[16px] w-[16px] rounded-full shadow-lg ring-0 transition-transform',
			'data-[state=checked]:translate-x-[16px] data-[state=unchecked]:translate-x-0'
		)}
	/>
</SwitchPrimitive.Root>
