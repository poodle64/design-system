<script lang="ts">
	// The one catalogue table, shared by LibraryBrowse and CollectionDetail so
	// the two surfaces cannot drift apart. Columns come and go with the data —
	// a consumer that passes no `collections` never sees an empty column —
	// which is what lets one table serve both the whole-catalogue view and a
	// single collection's slice.
	import {
		Table as TableRoot,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '../table/index.js';
	import StatusBadge from '../status-badge/status-badge.svelte';
	import type { LibraryDocument } from './types.js';

	let {
		documents,
		documentHref,
		onOpen
	}: {
		documents: LibraryDocument[];
		/** The app's own routed link per row; this package has no router of its own. */
		documentHref?: (doc: LibraryDocument) => string;
		onOpen?: (doc: LibraryDocument) => void;
	} = $props();

	const hasTags = $derived(documents.some((d) => d.tags?.length));
	const hasCollections = $derived(documents.some((d) => d.collections?.length));
	const hasBadges = $derived(documents.some((d) => d.badges?.length));
</script>

<div class="rounded-md border">
	<TableRoot>
		<TableHeader>
			<TableRow>
				<TableHead>Title</TableHead>
				{#if hasTags}
					<TableHead class="w-40">Tags</TableHead>
				{/if}
				{#if hasCollections}
					<TableHead class="w-40">Collections</TableHead>
				{/if}
				{#if hasBadges}
					<TableHead class="w-40 text-center">Status</TableHead>
				{/if}
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each documents as doc (doc.id)}
				<TableRow>
					<TableCell>
						{#if documentHref}
							<a
								href={documentHref(doc)}
								class="font-medium hover:underline"
								onclick={() => onOpen?.(doc)}
							>
								{doc.title}
							</a>
						{:else if onOpen}
							<button
								type="button"
								class="text-left font-medium hover:underline"
								onclick={() => onOpen(doc)}
							>
								{doc.title}
							</button>
						{:else}
							<span class="font-medium">{doc.title}</span>
						{/if}
					</TableCell>
					{#if hasTags}
						<TableCell class="text-muted-foreground text-xs">
							{doc.tags?.join(', ') || '—'}
						</TableCell>
					{/if}
					{#if hasCollections}
						<TableCell class="text-muted-foreground text-xs">
							{doc.collections?.join(', ') || '—'}
						</TableCell>
					{/if}
					{#if hasBadges}
						<TableCell class="text-center">
							<div class="flex flex-wrap justify-center gap-1">
								<!-- Keyed by index: LibraryBadge carries no id, and two memberships
								     can legitimately map to the same label+status. -->
								{#each doc.badges ?? [] as badge, i (i)}
									<StatusBadge status={badge.status} label={badge.label} />
								{:else}
									<span class="text-muted-foreground text-xs">—</span>
								{/each}
							</div>
						</TableCell>
					{/if}
				</TableRow>
			{/each}
		</TableBody>
	</TableRoot>
</div>
