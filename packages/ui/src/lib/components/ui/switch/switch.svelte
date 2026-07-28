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
  Standard shadcn-svelte Switch, rem-based (h-5/w-9/border-2, thumb h-4/w-4/
  translate-x-4) so it scales with the consuming app's root font-size instead
  of a fixed pixel size. The thumb is darkened to dark:bg-foreground so the
  ball stays light on the dark-first theme. The track colour comes from the
  project tokens. An app with a non-standard root font-size (e.g. Portcullis's
  18px console) compensates in its own override layer, not here.
-->
<SwitchPrimitive.Root
	bind:ref
	bind:checked
	class={cn(
		'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors',
		'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		class={cn(
			'bg-background dark:bg-foreground pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform',
			'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
		)}
	/>
</SwitchPrimitive.Root>
