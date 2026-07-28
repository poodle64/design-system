<script lang="ts">
	import type { Status } from '../status/index.js';

	// The one state chip: a coloured dot plus a label on a tinted pill. Styling
	// comes from .ds-chip / .ds-dot in @poodle64/ui/styles.css, so the whole app's
	// status vocabulary changes in one place.
	let { status, label }: { status: Status; label: string } = $props();
</script>

<span class="ds-chip ds-chip-{status}">
	<span class="ds-dot ds-dot-{status}"></span>
	{label}
</span>
