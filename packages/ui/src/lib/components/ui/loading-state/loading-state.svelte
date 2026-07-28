<script lang="ts">
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { cn } from '$lib/utils.js';

	interface Props {
		message?: string;
		class?: string;
	}

	let { message = 'Loading…', class: className }: Props = $props();
</script>

<div
	class={cn('flex flex-col items-center justify-center p-8', className)}
	role="status"
	aria-live="polite"
	aria-label={message}
>
	<Loader2 class="text-muted-foreground mb-2 size-8 animate-spin" aria-hidden="true" />
	<p class="text-muted-foreground text-sm">{message}</p>
</div>
