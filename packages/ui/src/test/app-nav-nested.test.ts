/**
 * Behaviour proof for nested navigation (rules-library/core/73-verification.md
 * §"Behaviour vs Appearance").
 *
 * Every claim here DRIVES something. A disclosure that renders a chevron wired
 * to nothing draws identically to one that works, and `aria-expanded="false"`
 * on a control that never changes it is the exact dead affordance this package
 * treats as worse than a missing one — so the assertions are on what the a11y
 * tree contains after the control is used, on where focus actually is, and on
 * what survives a navigation.
 *
 * What is NOT asserted here: indentation, the guide border, the chevron
 * rotation, and whether a nested tree overflows a 360px rail. jsdom applies no
 * stylesheet and has no layout, so it would pass on all four while every one of
 * them was broken. Those are measured in a real engine — `harness/drive.mjs`,
 * `?surface=nested`.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import NestedHarness from './app-nav-nested.svelte';
import {
	hasActiveNavChild,
	navChildren,
	toItems,
	type NavItem
} from '$lib/components/ui/app-shell/types.js';

/** The disclosure control for a branch, by the label it names. */
function chevron(label: string) {
	return screen.getByRole('button', { name: new RegExp(`(Expand|Collapse) ${label}`) });
}

describe('nested nav — the disclosure contract', () => {
	it('relates the control to the region it opens, and the region is real when shut', () => {
		// #12's rule, one level down: a dangling `aria-controls` is not a
		// relationship. The region exists whether open or shut precisely so the
		// reference never points at nothing.
		render(NestedHarness, { props: { currentPath: '/overview' } });
		const control = chevron('Education');

		expect(control).toHaveAttribute('aria-expanded', 'false');
		const panelId = control.getAttribute('aria-controls');
		expect(panelId).toBeTruthy();
		expect(document.getElementById(panelId as string)).toBeInTheDocument();
	});

	it('takes the closed rows out of the accessibility tree, not merely out of sight', async () => {
		render(NestedHarness, { props: { currentPath: '/overview' } });
		expect(screen.queryByRole('link', { name: 'Topic one' })).not.toBeInTheDocument();

		await fireEvent.click(chevron('Education'));

		await waitFor(() =>
			expect(screen.getByRole('link', { name: 'Topic one' })).toBeInTheDocument()
		);
		expect(chevron('Education')).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('link', { name: 'Topic one' })).toHaveAttribute(
			'href',
			'/education/one'
		);
	});

	it('closes again from the same control', async () => {
		render(NestedHarness, { props: { currentPath: '/overview' } });
		await fireEvent.click(chevron('Education'));
		await waitFor(() => expect(chevron('Education')).toHaveAttribute('aria-expanded', 'true'));

		await fireEvent.click(chevron('Education'));

		await waitFor(() =>
			expect(screen.queryByRole('link', { name: 'Topic one' })).not.toBeInTheDocument()
		);
	});

	it('keeps the parent a destination — the chevron expands, the label navigates', () => {
		// The whole reason the row is two controls. If the label had become an
		// expander, `href` would quietly stop meaning "go here" the day an app
		// added children to an item that already had one.
		render(NestedHarness, { props: { currentPath: '/overview' } });
		const parent = screen.getByRole('link', { name: 'Education' });

		expect(parent).toHaveAttribute('href', '/education');
		expect(parent).not.toHaveAttribute('aria-expanded');
		expect(chevron('Education')).toHaveAttribute('aria-expanded', 'false');
	});
});

describe('nested nav — expansion follows the path, until it is told otherwise', () => {
	it('opens the group containing the current page, with no click at all', () => {
		// The defect this feature exists to prevent: land three levels in and the
		// rail cannot tell you where you are. It has to be true on first paint,
		// which means derived, not stored — nothing clicked anything here.
		render(NestedHarness, { props: { currentPath: '/education/two' } });

		expect(chevron('Education')).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('link', { name: 'Topic two' })).toHaveAttribute('aria-current', 'page');
	});

	it('opens a group whose children live at their own top-level routes', () => {
		// `/archive` is not under `/records`, so prefix matching alone would leave
		// this group shut on the page it owns.
		render(NestedHarness, { props: { currentPath: '/archive' } });

		expect(chevron('Records')).toHaveAttribute('aria-expanded', 'true');
		expect(chevron('Education')).toHaveAttribute('aria-expanded', 'false');
	});

	it('marks a parent whose section you are in but whose own href does not match', () => {
		render(NestedHarness, { props: { currentPath: '/archive' } });
		const records = screen.getByRole('link', { name: 'Records' });

		expect(records).toHaveAttribute('data-within', 'true');
		// Exactly one row may claim to BE the page.
		expect(records).not.toHaveAttribute('data-active');
		expect(records).not.toHaveAttribute('aria-current');
		expect(screen.getByRole('link', { name: 'Archive' })).toHaveAttribute('aria-current', 'page');
	});

	it('follows the path across a navigation when the user has not intervened', async () => {
		const { rerender } = render(NestedHarness, { props: { currentPath: '/education/one' } });
		expect(chevron('Education')).toHaveAttribute('aria-expanded', 'true');

		await rerender({ currentPath: '/archive' });

		await waitFor(() => expect(chevron('Records')).toHaveAttribute('aria-expanded', 'true'));
		expect(chevron('Education')).toHaveAttribute('aria-expanded', 'false');
	});

	it('honours a deliberate toggle over the path, and keeps honouring it after navigating', async () => {
		// Opening a section you are not in is a decision, and a decision that
		// evaporates on the next link tap is not one. The override is why both
		// halves hold at once: this group stays open while an untouched one still
		// follows the path.
		const { rerender } = render(NestedHarness, { props: { currentPath: '/overview' } });
		await fireEvent.click(chevron('Records'));
		await waitFor(() => expect(chevron('Records')).toHaveAttribute('aria-expanded', 'true'));

		await rerender({ currentPath: '/education/one' });

		await waitFor(() => expect(chevron('Education')).toHaveAttribute('aria-expanded', 'true'));
		expect(chevron('Records')).toHaveAttribute('aria-expanded', 'true');
	});

	it('honours a deliberate close of the group you are standing in', async () => {
		const { rerender } = render(NestedHarness, { props: { currentPath: '/education/one' } });
		await fireEvent.click(chevron('Education'));
		await waitFor(() => expect(chevron('Education')).toHaveAttribute('aria-expanded', 'false'));

		await rerender({ currentPath: '/education/two' });

		// Still shut: the user said so, and moving within the section they closed
		// is not them changing their mind.
		expect(chevron('Education')).toHaveAttribute('aria-expanded', 'false');
	});
});

describe('nested nav — keyboard', () => {
	it('opens from the keyboard, because the control is a real button', async () => {
		render(NestedHarness, { props: { currentPath: '/overview' } });
		const control = chevron('Education');
		control.focus();

		// A <button> gets Enter and Space from the platform. Driving the click the
		// platform would synthesise is the honest test of that; what is actually
		// being asserted is that nothing here suppressed it.
		await fireEvent.click(control);

		await waitFor(() => expect(chevron('Education')).toHaveAttribute('aria-expanded', 'true'));
	});

	it('closes on Escape from inside, and puts focus back on the control', async () => {
		// Closing a region while the caret is inside it drops focus to the body,
		// which is the same stranding the drawer's own focus handling exists to
		// prevent, one level down.
		render(NestedHarness, { props: { currentPath: '/education/one' } });
		const child = screen.getByRole('link', { name: 'Topic one' });
		child.focus();

		await fireEvent.keyDown(child, { key: 'Escape' });

		await waitFor(() => expect(chevron('Education')).toHaveAttribute('aria-expanded', 'false'));
		expect(document.activeElement).toBe(chevron('Education'));
	});

	it('lets Escape through to the shell when it closed nothing', async () => {
		// The nesting rule: the inner surface wins first, the outer one stays
		// reachable. Swallowing Escape unconditionally would trap a phone user in
		// a drawer they can no longer dismiss.
		render(NestedHarness, { props: { currentPath: '/overview' } });
		await fireEvent.click(screen.getByTestId('ds-shell-menu'));
		await waitFor(() => expect(screen.getByTestId('ds-shell-drawer')).toBeInTheDocument());

		await fireEvent.keyDown(screen.getByRole('link', { name: 'Overview' }), { key: 'Escape' });

		await waitFor(() => expect(screen.queryByTestId('ds-shell-drawer')).not.toBeInTheDocument());
	});

	it('closes the group but NOT the drawer when both are open', async () => {
		render(NestedHarness, { props: { currentPath: '/education/one' } });
		await fireEvent.click(screen.getByTestId('ds-shell-menu'));
		await waitFor(() => expect(screen.getByTestId('ds-shell-drawer')).toBeInTheDocument());

		await fireEvent.keyDown(screen.getByRole('link', { name: 'Topic one' }), { key: 'Escape' });

		await waitFor(() => expect(chevron('Education')).toHaveAttribute('aria-expanded', 'false'));
		expect(screen.getByTestId('ds-shell-drawer')).toBeInTheDocument();
	});
});

describe('nested nav — the mobile drawer renders the same tree', () => {
	it('discloses in the drawer exactly as it does in the rail', async () => {
		// Parity is the entire reason this shape beat modules-on-a-top-bar: one
		// tree, one drawer. The rail and the drawer are one element, so this
		// asserts that nothing about the drawer state suppresses the branch.
		render(NestedHarness, { props: { currentPath: '/overview' } });
		await fireEvent.click(screen.getByTestId('ds-shell-menu'));
		const drawer = await screen.findByTestId('ds-shell-drawer');

		expect(within(drawer).getByRole('button', { name: 'Expand Education' })).toBeInTheDocument();
		expect(within(drawer).queryByRole('link', { name: 'Topic one' })).not.toBeInTheDocument();

		await fireEvent.click(within(drawer).getByRole('button', { name: 'Expand Education' }));

		await waitFor(() =>
			expect(within(drawer).getByRole('link', { name: 'Topic one' })).toBeInTheDocument()
		);
	});

	it('never hands a phone a collapsed drawer, even from a collapsed rail', async () => {
		// The pre-existing defect nesting would have made unrecoverable: rail and
		// drawer are one element carrying one `collapsed` state, and the Collapse
		// control is md-only, so a user who collapsed on a desktop and opened the
		// menu on a phone got 3.5rem of icons with no way back — and, with
		// children, no sub-navigation at all.
		render(NestedHarness, {
			props: { currentPath: '/overview', collapsible: true, collapsed: true }
		});
		expect(screen.queryByRole('button', { name: /Expand Education/ })).not.toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('ds-shell-menu'));
		const drawer = await screen.findByTestId('ds-shell-drawer');

		expect(drawer).not.toHaveAttribute('data-collapsed');
		expect(within(drawer).getByRole('button', { name: 'Expand Education' })).toBeInTheDocument();
	});
});

describe('nested nav — the collapsed rail', () => {
	it('renders neither children nor a disclosure control, and the parent still links', () => {
		// 3.5rem of icons cannot hold an indented tree, and sr-only rows nobody can
		// click are the dead affordance this package refuses. The way back is the
		// Collapse control the user just used.
		render(NestedHarness, {
			props: { currentPath: '/education/one', collapsible: true, collapsed: true }
		});

		expect(screen.queryByRole('button', { name: /Expand Education/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Collapse Education/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Topic one' })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Education' })).toHaveAttribute('href', '/education');
	});

	it('restores the tree when the rail is expanded again', async () => {
		render(NestedHarness, {
			props: { currentPath: '/education/one', collapsible: true, collapsed: true }
		});

		await fireEvent.click(screen.getByTestId('ds-rail-collapse'));

		await waitFor(() =>
			expect(screen.getByRole('link', { name: 'Topic one' })).toBeInTheDocument()
		);
	});
});

describe('nested nav — the vocabulary', () => {
	const branch: NavItem = {
		label: 'Education',
		href: '/education',
		children: [
			{ label: 'One', href: '/education/one' },
			{ label: 'Two', href: '/elsewhere' }
		]
	};

	it('normalises a childless item to an empty list', () => {
		expect(navChildren({ label: 'A', href: '/a' })).toEqual([]);
		expect(navChildren(branch)).toHaveLength(2);
	});

	it('detects an active child, including one at an unrelated path', () => {
		expect(hasActiveNavChild(branch, '/education/one')).toBe(true);
		expect(hasActiveNavChild(branch, '/elsewhere/deep')).toBe(true);
		expect(hasActiveNavChild(branch, '/education')).toBe(false);
		expect(hasActiveNavChild(branch, undefined)).toBe(false);
		expect(hasActiveNavChild({ label: 'A', href: '/a' }, '/a')).toBe(false);
	});

	it('flattens children into the palette, each parent followed by its own', () => {
		// A nested page the palette could not reach would make nesting a
		// regression for anyone using ⌘K to get around.
		const items = toItems([{ label: 'Overview', href: '/overview' }, branch]);

		expect(items.map((item) => item.href)).toEqual([
			'/overview',
			'/education',
			'/education/one',
			'/elsewhere'
		]);
	});

	it('leaves a childless nav flattening exactly as it always did', () => {
		expect(
			toItems([
				{ label: 'A', href: '/a' },
				{ heading: 'G', items: [{ label: 'B', href: '/b' }] }
			]).map((item) => item.href)
		).toEqual(['/a', '/b']);
	});

	it('caps nesting at one level, in the type rather than at runtime', () => {
		// This is a `svelte-check` assertion wearing a test's clothes: `pnpm check`
		// typechecks src/test, so if `children` ever became legal on a child the
		// unused @ts-expect-error is itself an error and the gate fails. A runtime
		// guard could only complain after an app had already written the tree.
		const nested: NavItem = {
			label: 'Education',
			href: '/education',
			children: [
				{
					label: 'One',
					href: '/education/one',
					// @ts-expect-error — a child may not disclose children of its own.
					children: [{ label: 'Deep', href: '/education/one/deep' }]
				}
			]
		};

		expect(navChildren(nested)).toHaveLength(1);
	});
});
