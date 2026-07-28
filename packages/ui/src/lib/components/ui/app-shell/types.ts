/**
 * The navigation vocabulary every app types its own config against.
 *
 * Five apps in the estate were surveyed before this shape was settled, and each
 * had reinvented the same three fields under different names (`label`/`title`,
 * `href`/`path`) plus one or two extras nobody else had. The intersection —
 * label, href, icon — is what every one of them actually needed; `badge`,
 * `exact` and `external` are the union of the genuine extras, each optional so
 * the common case stays two fields.
 *
 * Deliberately ABSENT: any notion of who may see an item. Two apps gate nav on
 * `is_admin` / per-module permission, and both do it with their own auth store.
 * A shared package that knew about permissions would have to know about auth,
 * which is exactly the coupling that made the reference shell unliftable. Apps
 * filter before they pass:
 *
 *     const nav = $derived(allNav.filter((i) => !i.adminOnly || user.isAdmin));
 */
import type { Component } from 'svelte';

/** A Lucide (or equivalent) icon component: takes a class, renders an SVG. */
export type IconComponent = Component<{ class?: string }>;

/** One navigable destination. */
export interface NavItem {
	/** The visible text. Also the accessible name when the rail is collapsed. */
	label: string;
	/** Destination path. */
	href: string;
	/** Optional leading icon. Omit it for a label-only row; alignment is kept. */
	icon?: IconComponent;
	/** Optional trailing count or short tag (an unread count, a "beta" tag). */
	badge?: string | number;
	/**
	 * Match the current path exactly rather than by prefix. Prefix is the
	 * default because a section root should stay lit while you are inside it;
	 * `href: '/'` is always treated as exact, since every path is prefixed by it.
	 */
	exact?: boolean;
	/** Open in a new tab. Renders the standard rel and an off-site affordance. */
	external?: boolean;
}

/** A titled run of items. The heading is optional — a leading group usually has none. */
export interface NavGroup {
	heading?: string;
	items: NavItem[];
}

/**
 * What the `nav` prop accepts: bare items, groups, or a mix.
 *
 * Three of the five surveyed apps have flat navigation and two have groups, so
 * requiring one shape would have made three apps write `[{ items: [...] }]`
 * wrapper noise or two apps flatten away their headings. A mixed array costs one
 * type guard here and nothing at the call site.
 */
export type NavEntry = NavItem | NavGroup;
export type NavSource = readonly NavEntry[];

/** Narrow a mixed entry to a group. */
export function isNavGroup(entry: NavEntry): entry is NavGroup {
	return 'items' in entry && Array.isArray((entry as NavGroup).items);
}

/** Normalise any accepted shape to groups, dropping groups that would render empty. */
export function toGroups(nav: NavSource | undefined): NavGroup[] {
	if (!nav) return [];
	const groups: NavGroup[] = [];
	// Consecutive bare items collapse into one unheaded run, so a flat array
	// renders as a single group rather than one group per item (which would
	// space every link apart). A group entry closes the run.
	let run: NavGroup | null = null;
	for (const entry of nav) {
		if (isNavGroup(entry)) {
			run = null;
			if (entry.items.length > 0) groups.push(entry);
		} else {
			if (!run) {
				run = { items: [] };
				groups.push(run);
			}
			run.items.push(entry);
		}
	}
	return groups;
}

/** Every item in source order, ignoring grouping. Used by the command palette. */
export function toItems(nav: NavSource | undefined): NavItem[] {
	if (!nav) return [];
	return nav.flatMap((entry) => (isNavGroup(entry) ? entry.items : [entry]));
}

/**
 * Whether `item` is the current page.
 *
 * Prefix matching is what makes a section root stay lit on its children; the
 * `+ '/'` is what stops `/audit` lighting up on `/audit-log`. A root href is
 * forced to exact or it would match every path in the app.
 */
export function isNavItemActive(item: NavItem, currentPath: string | undefined): boolean {
	if (!currentPath) return false;
	if (item.exact || item.href === '/') return currentPath === item.href;
	return currentPath === item.href || currentPath.startsWith(item.href + '/');
}
