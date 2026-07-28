<script lang="ts">
	// Fixture for data-state-variants.test.ts: one overlay of each shape whose
	// state attributes the package writes utilities against, so the CSS side of
	// that gate is pinned to what bits-ui really renders rather than to a table.
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
</script>

<Dialog.Root>
	<Dialog.Trigger>Open dialog</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Title>Overlay dialog</Dialog.Title>
	</Dialog.Content>
</Dialog.Root>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<DropdownMenu.Item>Live item</DropdownMenu.Item>
		<DropdownMenu.Item disabled>Disabled item</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<Select.Root type="single">
	<Select.Trigger data-testid="overlay-select-trigger">Pick one</Select.Trigger>
	<Select.Content>
		<Select.Item value="a" label="Alpha">Alpha</Select.Item>
	</Select.Content>
</Select.Root>
