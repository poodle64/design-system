// Behaviour proof for the page-chrome components (rules-library/core/73-verification.md
// §"Behaviour vs Appearance"). Anything with state or a callback is DRIVEN and its
// outcome read from a non-visual probe; the purely declarative components are
// asserted on the branch logic they actually own (a status maps to a chip class,
// a muted stat suppresses its dot), not on the fact that they rendered.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ChromeHarness from './composed-chrome.svelte';

describe('AppDialog', () => {
	it('is closed until the trigger is pressed, then shows its frame', async () => {
		render(ChromeHarness);
		expect(screen.queryByText('Harness dialog')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Open app dialog' }));

		await waitFor(() => {
			expect(screen.getByText('Harness dialog')).toBeInTheDocument();
		});
		expect(screen.getByText('A subtitle')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
	});

	it('closes again from its own close control', async () => {
		render(ChromeHarness);
		await fireEvent.click(screen.getByRole('button', { name: 'Open app dialog' }));
		await waitFor(() => expect(screen.getByText('Harness dialog')).toBeInTheDocument());

		await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

		await waitFor(() => {
			expect(screen.queryByText('Harness dialog')).not.toBeInTheDocument();
		});
	});
});

describe('DialogSection', () => {
	it('renders each body section under the class the divider rule keys off', async () => {
		render(ChromeHarness);
		await fireEvent.click(screen.getByRole('button', { name: 'Open app dialog' }));
		await waitFor(() => expect(screen.getByText('Section one body')).toBeInTheDocument());

		// The between-sections divider is the adjacent-sibling rule in
		// @poodle64/ui/styles.css; jsdom applies no stylesheet, so what is provable
		// here is that adjacent siblings both carry the hook the rule selects on.
		const sections = document.querySelectorAll('.ds-dialog-section');
		expect(sections).toHaveLength(2);
		expect(sections[0].nextElementSibling).toBe(sections[1]);
		expect(screen.getByText('Section two body')).toBeInTheDocument();
	});
});

describe('DetailPanel', () => {
	it('fires onClose when its close control is pressed', async () => {
		render(ChromeHarness);
		expect(screen.getByTestId('panel-closed')).toHaveTextContent('open');

		await fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));

		await waitFor(() => {
			expect(screen.getByTestId('panel-closed')).toHaveTextContent('closed');
		});
	});

	it('renders its status chip when both status and statusLabel are given', () => {
		render(ChromeHarness);
		const chip = screen.getByText('Expiring').closest('.ds-chip');
		expect(chip).not.toBeNull();
		expect(chip?.className).toContain('ds-chip-warning');
	});

	it('draws no chip for a status with no label', () => {
		render(ChromeHarness);
		// A colour with no label is the WCAG 1.4.1 failure the status vocabulary
		// exists to prevent, so the panel must suppress the chip entirely rather
		// than render an empty one.
		const panel = screen.getByText('record-99').closest('section');
		expect(panel).not.toBeNull();
		expect(panel?.querySelector('.ds-chip')).toBeNull();
		expect(panel?.querySelector('.ds-dot-error')).toBeNull();
	});
});

describe('ContextColumn', () => {
	it('flows the detail panel in and out without disturbing the stat card', async () => {
		render(ChromeHarness);
		expect(screen.getByText('record-42')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Toggle detail' }));

		await waitFor(() => {
			expect(screen.queryByText('record-42')).not.toBeInTheDocument();
		});
		// The standing stat card is unaffected — the column never changes shape.
		expect(screen.getByText('Totals')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Toggle detail' }));
		await waitFor(() => {
			expect(screen.getByText('record-42')).toBeInTheDocument();
		});
	});
});

describe('EmptyState / ErrorState', () => {
	it('runs the action snippet the caller supplied', async () => {
		render(ChromeHarness);
		expect(screen.getByTestId('empty-action')).toHaveTextContent('idle');
		expect(screen.getByTestId('error-action')).toHaveTextContent('idle');

		await fireEvent.click(screen.getByRole('button', { name: 'Create' }));
		await waitFor(() => expect(screen.getByTestId('empty-action')).toHaveTextContent('fired'));

		await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
		await waitFor(() => expect(screen.getByTestId('error-action')).toHaveTextContent('fired'));
	});
});

describe('LoadingState', () => {
	it('announces itself as a live status region', () => {
		render(ChromeHarness);
		const status = screen.getByRole('status', { name: 'Fetching records…' });
		expect(status).toHaveAttribute('aria-live', 'polite');
		// The spinner is decorative; the message carries the meaning.
		expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull();
	});
});

describe('InfoTip', () => {
	it('exposes the hint to assistive tech whether or not it is hovered', () => {
		render(ChromeHarness);
		expect(screen.getByText('Standalone hint')).toHaveClass('sr-only');
		expect(screen.getByText('Wrapping hint')).toHaveClass('sr-only');
	});

	it('wraps supplied children instead of drawing its own icon trigger', () => {
		render(ChromeHarness);
		const wrapped = screen.getByTestId('wrapped-trigger');
		const trigger = wrapped.closest('button');
		expect(trigger).not.toBeNull();
		// The wrapping trigger renders the child, not the fallback info glyph.
		expect(trigger?.querySelector('svg')).toBeNull();
	});
});

describe('StatusBadge / StatCard / StatList', () => {
	it('maps a status onto the shared chip and dot vocabulary', () => {
		render(ChromeHarness);
		const badge = screen.getByText('Healthy').closest('.ds-chip');
		expect(badge?.className).toContain('ds-chip-success');
		expect(badge?.querySelector('.ds-dot-success')).not.toBeNull();
	});

	it('shows a StatCard dot for its status and renders unit and sub', () => {
		render(ChromeHarness);
		const card = screen.getByText('Sessions').closest('div')?.parentElement;
		expect(card?.querySelector('.ds-dot-info')).not.toBeNull();
		expect(screen.getByText('live')).toBeInTheDocument();
		expect(screen.getByText('last hour')).toBeInTheDocument();
	});

	it('suppresses the dot on a muted stat but keeps one on a live stat', () => {
		render(ChromeHarness);
		const warm = screen.getByText('Warm').closest('div');
		const cold = screen.getByText('Cold').closest('div');

		expect(warm?.querySelector('.ds-dot-success')).not.toBeNull();
		// Cold is a healthy zero: status is set, muted wins, so no dot is drawn.
		expect(cold?.querySelector('.ds-dot-error')).toBeNull();
	});
});

describe('PageHeader / Panel', () => {
	it('renders the eyebrow, title, clamped subtitle and actions slot', () => {
		render(ChromeHarness);
		expect(screen.getByRole('heading', { level: 1, name: 'Chrome harness' })).toBeInTheDocument();
		expect(screen.getByText('Section')).toBeInTheDocument();
		expect(screen.getByText('One line, clamped.')).toHaveClass('line-clamp-1');
		expect(screen.getByRole('button', { name: 'Primary action' })).toBeInTheDocument();
	});

	it('renders a Panel header with its subtitle above the body', () => {
		render(ChromeHarness);
		expect(screen.getByRole('heading', { level: 2, name: 'Panel title' })).toBeInTheDocument();
		expect(screen.getByText('Panel subtitle')).toBeInTheDocument();
		expect(screen.getByText('Panel body')).toBeInTheDocument();
	});
});
