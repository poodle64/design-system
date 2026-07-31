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
	import AppNav from '../dist/components/ui/app-shell/app-nav.svelte';
	import CommandPalette from '../dist/components/ui/command-palette/command-palette.svelte';
	import LoadingState from '../dist/components/ui/loading-state/loading-state.svelte';
	import ErrorState from '../dist/components/ui/error-state/error-state.svelte';
	import EmptyState from '../dist/components/ui/empty-state/empty-state.svelte';
	import AppDialog from '../dist/components/ui/app-dialog/app-dialog.svelte';
	import * as DropdownMenu from '../dist/components/ui/dropdown-menu/index.js';
	import * as Popover from '../dist/components/ui/popover/index.js';
	import * as Select from '../dist/components/ui/select/index.js';
	import * as Command from '../dist/components/ui/command/index.js';
	import * as Table from '../dist/components/ui/table/index.js';
	import Avatar from '../dist/components/ui/avatar/avatar.svelte';
	import AvatarImage from '../dist/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '../dist/components/ui/avatar/avatar-fallback.svelte';
	import Card from '../dist/components/ui/card/card.svelte';
	import CardHeader from '../dist/components/ui/card/card-header.svelte';
	import CardTitle from '../dist/components/ui/card/card-title.svelte';
	import CardDescription from '../dist/components/ui/card/card-description.svelte';
	import CardContent from '../dist/components/ui/card/card-content.svelte';
	import DetailPanel from '../dist/components/ui/detail-panel/detail-panel.svelte';
	import ArcGauge from '../dist/components/ui/arc-gauge/arc-gauge.svelte';
	import BarRow from '../dist/components/ui/bar-row/bar-row.svelte';
	import Scorecard from '../dist/components/ui/scorecard/scorecard.svelte';
	import Sparkline from '../dist/components/ui/sparkline/sparkline.svelte';
	import StatusBadge from '../dist/components/ui/status-badge/status-badge.svelte';
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

	// The collapse state is driven from the URL query so the capture script sets
	// it by navigation rather than by synthesising clicks.
	const params = new URLSearchParams(location.search);
	const collapsible = params.get('collapsible') === '1';
	// `?surface=states` swaps the shell for the async-outcome surfaces. Their
	// announcement contract is a claim about the platform accessibility tree,
	// which jsdom does not build: testing-library computes a role from a static
	// element→role table, so it confirms the attribute string and nothing about
	// what a screen reader is actually handed.
	// `?surface=card` puts a div-mode CardTitle beside a heading-mode one in the
	// same card, so the "a heading looks byte-identical to the div" claim is
	// measured rather than argued. jsdom cannot make it: `<h3>` and `<div>`
	// differ only in what the UA stylesheet adds, and jsdom applies no
	// stylesheet at all, so the two are trivially identical there whether or
	// not anything neutralises the UA margins.
	// `?surface=overlays` drives the four bits-ui overlay families whose
	// enter/exit transitions the package's data-open:/data-closed: utilities
	// carry. Neither jsdom nor a compiled-CSS gate can see the end of that
	// chain: only an engine resolves `animation-name` on an element that has
	// actually opened.
	// `?surface=overflow` puts a table wider than the viewport inside the shell,
	// so the hidden sideways scroll of #5 is measured rather than reasoned about
	// — `&wrapper=auto` reproduces the second mechanism (an `mx-auto` page
	// wrapper suppressing cross-axis stretch), which is a different sizing rule
	// and needs its own case.
	// `?surface=avatar` drives the real load-state swap over the network: a URL
	// that cannot resolve, one that can, and no source at all.
	// `?surface=theming` drives scoped theming (#8): the same probe set at the
	// page root, inside a subtree overriding --ds-color-* only, and inside a
	// subtree carrying a scoped .dark class. Neither jsdom nor a compiled-CSS
	// gate can tell "resolved once at :root, then inherited unchanged" apart
	// from "resolved live at this element" — only a real cascade can.
	// `?surface=long-lists` opens each floating overlay over a list longer than
	// the viewport. Nothing short of an engine can make this claim: whether
	// `overflow-y-auto` does anything depends entirely on whether a height
	// constrains the box, which is a layout fact, and jsdom has no layout — it
	// reports scrollHeight and clientHeight as 0 either way.
	const surface = params.get('surface') ?? 'shell';
	const wrapper = params.get('wrapper') ?? 'plain';
	// `table` is the reported case: a wide child that carries its own scroller.
	// `word` is the harsher one — an unbreakable string with no scroller of its
	// own, which nothing can make fit; it is here to pin what the shell DOES
	// guarantee under it (its own box stays the content box) rather than to
	// claim an overflow that is the page's to solve.
	const overflowContent = params.get('content') ?? 'table';
	// `?sidebar=1` adds a route-scoped secondary AppNav on the page background,
	// so the half of the nav-ink rule that must NOT follow the chrome is driven too.
	const withSidebar = params.get('sidebar') === '1';
	// `?surface=console` (design-system#15) drives the five console-dashboard
	// primitives promoted from mission-command. jsdom cannot resolve any
	// --ds-color-status-*/--ds-color-primary var() chain, so ArcGauge's tone
	// colour, StatusBadge's new `primary` extension and BarRow's fill-as-a-
	// real-percentage-of-its-track are measured here against a real cascade;
	// drive.mjs reads them back. Scorecard and Sparkline's claims (a dot class
	// per score, point coordinates derived from the data) need no CSS
	// resolution and are proved under jsdom in src/test/ — they render here
	// only for visual completeness.
	const ARC_TONES = ['success', 'warning', 'error'] as const;
	const BADGE_STATUSES = ['success', 'warning', 'error', 'info', 'neutral', 'primary'] as const;

	let overlayDialogOpen = $state(false);
	// A 1x1 transparent GIF, inline: the harness serves no assets and the claim
	// is about the load-state machine, not about what the picture is.
	const REAL_IMAGE =
		'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
	const LEVELS = [1, 2, 3, 4, 5, 6] as const;

	// 36 is the count from the report: enough that the list is taller than an
	// 800px viewport by a clear margin, so a missing cap cannot be mistaken for
	// a rounding error.
	const LONG_LIST = Array.from({ length: 36 }, (_, i) => `Option ${String(i + 1).padStart(2, '0')}`);

	let phase: 'idle' | 'loading' | 'failed' | 'empty' = $state('idle');

	let paletteOpen = $state(false);
	let collapsed = $state(false);
	const currentPath = '#/credentials';

	// The theme follows the OS preference, and a driver picks it by emulating
	// `prefers-color-scheme` rather than by passing a mode here.
	//
	// This used to read `defaultMode="dark"`, which was measurably not doing
	// what it says: mode-watcher tracks the system preference, and Chromium's
	// default is light, so every surface in this harness has in fact been
	// rendering LIGHT since the day it was written. The contrast gate has to
	// visit both themes and be certain which one it is looking at, so the lever
	// is now the one that actually moves — `browser.newContext({ colorScheme })`.
</script>

<ModeWatcher defaultMode="system" />

{#if surface === 'detail-panel'}
	<!-- design-system#9: DetailPanel's title face is a class-name choice
	     (font-mono vs font-display), which is exactly the shape of dead
	     utility this package's other gates guard against — the class can be
	     present in the DOM with no compiled rule behind it. Two panels, one
	     per supported titleFace, so the CLAIM (a resolved computed
	     font-family, not a class string) is measured. -->
	<div class="flex flex-col gap-4 p-8">
		<div data-probe="mono">
			<DetailPanel title="record-42">
				<p>Default (mono) body</p>
			</DetailPanel>
		</div>
		<div data-probe="display">
			<DetailPanel title="Jordan Rivers" titleFace="display">
				<p>Display body</p>
			</DetailPanel>
		</div>
	</div>
{:else if surface === 'theming'}
	<!-- design-system#8: scoped theming. jsdom cannot make either claim here —
	     it applies no stylesheet, so it never resolves a var() chain at all,
	     and it has no cascade to distinguish "declared at :root" from
	     "declared on this element's ancestor". Three identical probe sets:
	     the page default, a subtree overriding --ds-color-* only, and a
	     subtree carrying a scoped .dark class — proving the ONE documented
	     lever (--ds-color-*) reaches every shadcn colour utility this
	     package ships, in a scope smaller than the page, on both halves of
	     the surface (bg-background/text-muted-foreground/border-input are
	     @poodle64/design-tokens' own keys; bg-card/bg-popover/bg-muted/
	     bg-accent/bg-secondary are @poodle64/ui's). -->
	{#snippet probes(probe: string)}
		<div data-probe={probe} class="flex flex-wrap gap-2 p-2">
			<div data-slot="bg-background" class="bg-background p-2">background</div>
			<div data-slot="bg-card" class="bg-card p-2">card</div>
			<div data-slot="bg-popover" class="bg-popover p-2">popover</div>
			<div data-slot="bg-muted" class="bg-muted p-2">muted</div>
			<div data-slot="bg-accent" class="bg-accent p-2">accent</div>
			<div data-slot="bg-secondary" class="bg-secondary p-2">secondary</div>
			<div data-slot="border-input" class="border-input border-4 p-2">input</div>
			<div data-slot="text-muted-foreground" class="text-muted-foreground p-2">muted-foreground</div>
		</div>
	{/snippet}
	<div class="flex flex-col gap-4 p-8">
		<div data-probe="root">{@render probes('root')}</div>
		<div
			data-probe="scoped-ds-color"
			style="--ds-color-background: oklch(0.55 0.2 30); --ds-color-surface-1: oklch(0.55 0.2 30); --ds-color-surface-2: oklch(0.55 0.2 30); --ds-color-surface-3: oklch(0.55 0.2 30); --ds-color-border: oklch(0.55 0.2 30); --ds-color-muted-foreground: oklch(0.55 0.2 30);"
		>
			{@render probes('scoped-ds-color')}
		</div>
		<div data-probe="scoped-dark" class="dark">
			{@render probes('scoped-dark')}
		</div>
	</div>
{:else if surface === 'overlays'}
	<div class="flex flex-col items-start gap-4 p-8">
		<button type="button" onclick={() => (overlayDialogOpen = true)}>Open dialog</button>
		<AppDialog bind:open={overlayDialogOpen} title="Overlay dialogue">
			<p>Dialogue body</p>
		</AppDialog>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item>Menu body</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<Popover.Root>
			<Popover.Trigger>Open popover</Popover.Trigger>
			<Popover.Content>Popover body</Popover.Content>
		</Popover.Root>

		<Select.Root type="single">
			<Select.Trigger>Open select</Select.Trigger>
			<Select.Content>
				<Select.Item value="a" label="Select body">Select body</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>
{:else if surface === 'long-lists'}
	<!-- Every floating overlay this package ships, each holding more rows than
	     fit. The triggers sit near the top so the popper has the whole viewport
	     below it to overflow into: an overlay opening from the bottom edge would
	     flip above the trigger and could fit by accident, which would prove
	     nothing. -->
	<div class="flex flex-wrap items-start gap-4 p-6">
		<Select.Root type="single">
			<Select.Trigger>Open select</Select.Trigger>
			<Select.Content>
				{#each LONG_LIST as option (option)}
					<Select.Item value={option} label={option}>{option}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>Open menu</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				{#each LONG_LIST as option (option)}
					<DropdownMenu.Item>{option}</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<Popover.Root>
			<Popover.Trigger>Open popover</Popover.Trigger>
			<Popover.Content>
				{#each LONG_LIST as option (option)}
					<p>{option}</p>
				{/each}
			</Popover.Content>
		</Popover.Root>

		<button type="button" onclick={() => (paletteOpen = true)}>Open command</button>
		<Command.Dialog bind:open={paletteOpen} title="Long command list" description="Search">
			<Command.Input placeholder="Search" />
			<Command.List>
				<Command.Empty>Nothing matched.</Command.Empty>
				<Command.Group heading="Options">
					{#each LONG_LIST as option (option)}
						<Command.Item value={option}>{option}</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Dialog>
	</div>
{:else if surface === 'avatar'}
	<div class="flex items-center gap-4 p-8">
		<div data-probe="avatar-broken">
			<Avatar>
				<AvatarImage src="/definitely-not-here.png" alt="Operator" />
				<AvatarFallback>OP</AvatarFallback>
			</Avatar>
		</div>
		<div data-probe="avatar-loaded">
			<Avatar>
				<AvatarImage src={REAL_IMAGE} alt="Operator" />
				<AvatarFallback>OP</AvatarFallback>
			</Avatar>
		</div>
		<div data-probe="avatar-sourceless">
			<Avatar>
				<AvatarFallback>OP</AvatarFallback>
			</Avatar>
		</div>
	</div>
{:else if surface === 'overflow'}
	<AppShell {nav} currentPath="#/overview" brandTitle="Harness">
		<!-- A consumer-shaped page: the root wrapper an app writes, holding
		     something wider than a phone. `wrapper=auto` adds the `mx-auto`
		     centring that is the ordinary way to cap a measure and the second,
		     independent mechanism behind the overflow. -->
		<div class={wrapper === 'auto' ? 'mx-auto w-full max-w-[80rem]' : ''} data-probe="page-wrapper">
			<h1 class="font-display text-display font-semibold">Wide page</h1>
			{#if overflowContent === 'word'}
				<p data-probe="long-word" class="text-sm">
					pneumonoultramicroscopicsilicovolcanoconiosisandthensomemoreforgoodmeasure
				</p>
			{/if}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						{#each ['Identifier', 'Owner', 'Environment', 'Rotated', 'Expires', 'Consumer', 'Scope', 'Status'] as head (head)}
							<Table.Head>{head}</Table.Head>
						{/each}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each [1, 2, 3] as row (row)}
						<Table.Row>
							{#each ['credential-alpha-00' + row, 'platform', 'production', '2026-07-01', '2027-07-01', 'gateway', 'read:all', 'active'] as cell (cell)}
								<Table.Cell>{cell}</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</AppShell>
{:else if surface === 'card'}
	<div class="flex flex-col gap-4 p-8">
		<!-- Seven cards built from the identical snippet of markup, differing in
		     one prop. Same width container, same siblings, same body, so a
		     measured difference in the title can only have come from the tag
		     name. -->
		<div class="w-96" data-probe="div">
			<Card>
				<CardHeader>
					<CardTitle>Estate summary</CardTitle>
					<CardDescription>Everything under management.</CardDescription>
				</CardHeader>
				<CardContent>Body copy under the title.</CardContent>
			</Card>
		</div>
		{#each LEVELS as level (level)}
			<div class="w-96" data-probe={`h${level}`}>
				<Card>
					<CardHeader>
						<CardTitle {level}>Estate summary</CardTitle>
						<CardDescription>Everything under management.</CardDescription>
					</CardHeader>
					<CardContent>Body copy under the title.</CardContent>
				</Card>
			</div>
		{/each}
	</div>
{:else if surface === 'states'}
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
{:else if surface === 'console'}
	<div class="flex flex-col gap-6 p-8">
		<div class="flex items-center gap-4">
			{#each ARC_TONES as tone (tone)}
				<div data-probe="arc-{tone}">
					<ArcGauge pct={65} {tone} size={42} showLabel label="5h" />
				</div>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#each BADGE_STATUSES as status (status)}
				<div data-probe="badge-{status}">
					<StatusBadge {status} label={status} />
				</div>
			{/each}
		</div>
		<div class="w-96" data-probe="bar-row">
			<BarRow label="Lane A" value="42%" pct={42} />
		</div>
		<div data-probe="scorecard">
			<Scorecard scores={[0, 1, 2, 1, 0]} />
		</div>
		<div data-probe="sparkline">
			<Sparkline
				series={[{ vals: [2, 8, 4, 10, 6], color: 'var(--ds-color-status-success)' }]}
				width={160}
				height={40}
			/>
		</div>
	</div>
{:else}
	{#snippet secondaryNav()}
		<!-- A route-scoped secondary nav: the OTHER surface AppNav is rendered on,
		     the ordinary page background, OUTSIDE the shell's chrome. It has to
		     keep the PAGE's ink at the same moment the rail follows
		     `--ds-shell-chrome-foreground` — one rule, two opposite answers, and
		     the half that is easy to break while the loud half still passes. So it
		     is driven rather than argued.

		     Behind `?sidebar=1` because a second nav landmark changes the landmark
		     and tab-stop counts the hand-driven checks in `drive.md` pin. -->
		<AppNav {nav} {currentPath} label="Section" class="w-56" />
	{/snippet}
	<AppShell
		{nav}
		{collapsible}
		{currentPath}
		bind:collapsed
		brandTitle="Harness"
		onSearch={() => (paletteOpen = true)}
		sidebar={withSidebar ? secondaryNav : undefined}
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
