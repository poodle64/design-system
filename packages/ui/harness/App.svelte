<script lang="ts">
	/**
	 * The real-browser harness for AppShell.
	 *
	 * It exists because jsdom cannot make any of the shell's visual claims:
	 * `getComputedStyle` there returns the unresolved `var(--…)` literal, so a
	 * jsdom assertion passes just as happily on a colour nothing defines. That
	 * blind spot has hidden five separate defects in this programme. Everything
	 * about width, colour, breakpoint and the actual light/dark flip is proved
	 * here, driven by a script against a real engine; the interaction logic is
	 * proved in `src/test/app-shell.test.ts`.
	 *
	 * The imports point at `../dist`, not `../src`: the claim being verified is
	 * about the artefact a consuming app installs, and svelte-package rewrites
	 * import specifiers on the way out, so the source is not the same input.
	 *
	 * `harness/drive.md` records the choreography and the assertions.
	 */
	import { ModeWatcher } from 'mode-watcher';
	import AppShell from '../dist/components/ui/app-shell/app-shell.svelte';
	import CommandPalette from '../dist/components/ui/command-palette/command-palette.svelte';
	import LoadingState from '../dist/components/ui/loading-state/loading-state.svelte';
	import ErrorState from '../dist/components/ui/error-state/error-state.svelte';
	import EmptyState from '../dist/components/ui/empty-state/empty-state.svelte';
	import type { NavSource } from '../dist/components/ui/app-shell/types.js';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Package from '@lucide/svelte/icons/package';
	import KeySquare from '@lucide/svelte/icons/key-square';
	import ScrollText from '@lucide/svelte/icons/scroll-text';

	const nav: NavSource = [
		{ label: 'Overview', href: '#/overview', icon: LayoutDashboard },
		{
			heading: 'Access',
			items: [
				{ label: 'Credentials', href: '#/credentials', icon: Package, badge: 3 },
				{ label: 'Identities', href: '#/identities', icon: KeySquare }
			]
		},
		{ heading: 'Activity', items: [{ label: 'Audit', href: '#/audit', icon: ScrollText }] }
	];

	// The variant and collapse state are driven from the URL query so the capture
	// script sets them by navigation rather than by synthesising clicks.
	const params = new URLSearchParams(location.search);
	const variant = (params.get('variant') as 'rail' | 'header') ?? 'rail';
	const collapsible = params.get('collapsible') === '1';
	// `?surface=states` swaps the shell for the async-outcome surfaces. Their
	// announcement contract is a claim about the platform accessibility tree,
	// which jsdom does not build: testing-library computes a role from a static
	// element→role table, so it confirms the attribute string and nothing about
	// what a screen reader is actually handed.
	const surface = params.get('surface') ?? 'shell';

	let phase: 'idle' | 'loading' | 'failed' | 'empty' = $state('idle');

	let paletteOpen = $state(false);
	let collapsed = $state(false);
	const currentPath = '#/credentials';
</script>

<ModeWatcher defaultMode="dark" />

{#if surface === 'states'}
	<div class="flex flex-col gap-4 p-8">
		<div class="flex gap-2">
			<button type="button" onclick={() => (phase = 'loading')}>Start load</button>
			<button type="button" onclick={() => (phase = 'failed')}>Fail the load</button>
			<button type="button" onclick={() => (phase = 'empty')}>Settle with no rows</button>
		</div>
		{#if phase === 'loading'}
			<LoadingState message="Fetching records…" />
		{:else if phase === 'failed'}
			<ErrorState message="Could not load the estate." />
		{:else if phase === 'empty'}
			<EmptyState title="No records" description="Nothing matched that filter." />
		{/if}
	</div>
{:else}
	<AppShell
		{nav}
		{variant}
		{collapsible}
		{currentPath}
		bind:collapsed
		brandTitle="Harness"
		onSearch={() => (paletteOpen = true)}
	>
		{#snippet brandMark()}
			<span class="text-primary text-xs font-bold">H</span>
		{/snippet}
		{#snippet identity()}
			<button class="flex w-full items-center gap-2.5 px-3 py-3 text-sm" data-testid="identity">
				<span
					class="bg-primary/15 text-primary grid size-8 flex-none place-items-center rounded-full text-xs font-semibold"
					>OP</span
				>
				<span>Operator</span>
			</button>
		{/snippet}
		<h1 class="font-display text-display font-semibold">Page body</h1>
		<p class="text-muted-foreground mt-2 text-sm">
			Content the shell frames. Everything around it is the shared component.
		</p>
	</AppShell>

	<CommandPalette
		bind:open={paletteOpen}
		{nav}
		onNavigate={(href) => (location.hash = href.slice(1))}
	/>
{/if}
