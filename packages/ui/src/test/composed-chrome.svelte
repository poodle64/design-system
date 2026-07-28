<script lang="ts">
	// Harness for the page-chrome components. Every interactive affordance is
	// wired to a state flag rendered as a non-visual <output> probe, so a test
	// asserts the callback actually fired rather than that something merely drew.
	import PageHeader from '$lib/components/ui/page-header/page-header.svelte';
	import DetailPanel from '$lib/components/ui/detail-panel/detail-panel.svelte';
	import AppDialog from '$lib/components/ui/app-dialog/app-dialog.svelte';
	import DialogSection from '$lib/components/ui/dialog-section/dialog-section.svelte';
	import ContextColumn from '$lib/components/ui/context-column/context-column.svelte';
	import EmptyState from '$lib/components/ui/empty-state/empty-state.svelte';
	import ErrorState from '$lib/components/ui/error-state/error-state.svelte';
	import LoadingState from '$lib/components/ui/loading-state/loading-state.svelte';
	import InfoTip from '$lib/components/ui/info-tip/info-tip.svelte';
	import StatusBadge from '$lib/components/ui/status-badge/status-badge.svelte';
	import StatCard from '$lib/components/ui/stat-card/stat-card.svelte';
	import StatList from '$lib/components/ui/stat-list/stat-list.svelte';
	import Panel from '$lib/components/ui/panel/panel.svelte';

	let dialogOpen = $state(false);
	let panelClosed = $state(false);
	let showDetail = $state(true);
	let emptyActionFired = $state(false);
	let errorActionFired = $state(false);
</script>

<PageHeader
	eyebrow="Section"
	title="Chrome harness"
	subtitle="One line, clamped."
	info="Explains the page."
>
	{#snippet actions()}
		<button type="button">Primary action</button>
	{/snippet}
</PageHeader>

<button type="button" onclick={() => (dialogOpen = true)}>Open app dialog</button>
<AppDialog bind:open={dialogOpen} title="Harness dialog" subtitle="A subtitle" size="lg">
	<DialogSection label="First">
		<p>Section one body</p>
	</DialogSection>
	<DialogSection label="Second">
		<p>Section two body</p>
	</DialogSection>
	{#snippet footer()}
		<button type="button">Confirm</button>
	{/snippet}
</AppDialog>

<ContextColumn
	stats={[
		{ label: 'Active', value: 3, status: 'success' },
		{ label: 'Failed', value: 0, muted: true, status: 'error' }
	]}
	statsInfo="What these count."
>
	{#snippet detail()}
		{#if showDetail}
			<DetailPanel
				eyebrow="Record"
				title="record-42"
				status="warning"
				statusLabel="Expiring"
				onClose={() => (panelClosed = true)}
			>
				<p>Detail body</p>
				{#snippet footer()}
					<button type="button">Revoke</button>
				{/snippet}
			</DetailPanel>
		{/if}
	{/snippet}
</ContextColumn>

<button type="button" onclick={() => (showDetail = !showDetail)}>Toggle detail</button>

<!-- Negative branch: a status with no statusLabel must draw no chip, since a
     colour with no label is the WCAG 1.4.1 failure StatusBadge exists to stop. -->
<DetailPanel title="record-99" status="error">
	<p>Unlabelled status body</p>
</DetailPanel>

<EmptyState title="Nothing yet" description="Add the first one.">
	{#snippet action()}
		<button type="button" onclick={() => (emptyActionFired = true)}>Create</button>
	{/snippet}
</EmptyState>

<ErrorState message="Could not load the estate.">
	{#snippet action()}
		<button type="button" onclick={() => (errorActionFired = true)}>Retry</button>
	{/snippet}
</ErrorState>

<LoadingState message="Fetching records…" />

<InfoTip text="Standalone hint" />
<InfoTip text="Wrapping hint">
	<span data-testid="wrapped-trigger">wrapped</span>
</InfoTip>

<StatusBadge status="success" label="Healthy" />
<StatCard label="Sessions" value={12} unit="live" sub="last hour" status="info" />
<StatList
	title="Totals"
	items={[
		{ label: 'Warm', value: 4, status: 'success' },
		{ label: 'Cold', value: 0, status: 'error', muted: true }
	]}
/>
<Panel title="Panel title" subtitle="Panel subtitle">
	<p>Panel body</p>
</Panel>

<!-- Non-visual outcome probes. -->
<output data-testid="panel-closed">{panelClosed ? 'closed' : 'open'}</output>
<output data-testid="empty-action">{emptyActionFired ? 'fired' : 'idle'}</output>
<output data-testid="error-action">{errorActionFired ? 'fired' : 'idle'}</output>
