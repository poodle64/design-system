// Behaviour proof for the TanStack-backed pair (rules-library/core/73-verification.md
// §"Behaviour vs Appearance"). Every assertion drives the real table pipeline and
// then reads an OUTCOME — the rendered row order, the surviving row count, a
// callback's recorded value — never a static render. A data table that draws
// perfectly and never sorts would pass a snapshot gate and fail every test here.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import DataTableHarness from './composed-data-table.svelte';

/** Row order as the component actually rendered it, read from the DOM. */
function renderedNames(): string[] {
	const body = document.querySelector('tbody');
	if (!body) return [];
	return [...body.querySelectorAll('tr')].map(
		// Column 0 is the bulk-selection checkbox; column 1 is `name`.
		(tr) => tr.querySelectorAll('td')[1]?.textContent?.trim() ?? ''
	);
}

describe('DataTableTanstack — sorting', () => {
	it('reorders the rendered rows when a sort is applied', async () => {
		render(DataTableHarness);

		// Instant one: source order.
		expect(renderedNames()).toEqual(['charlie', 'alpha', 'bravo']);

		await fireEvent.click(screen.getByRole('button', { name: 'Sort by name' }));

		// Instant two: the order actually advanced, it is not frozen at its initial value.
		await waitFor(() => {
			expect(renderedNames()).toEqual(['alpha', 'bravo', 'charlie']);
		});
	});
});

describe('DataTableToolbar — global search', () => {
	it('narrows the table to matching rows as the search value changes', async () => {
		render(DataTableHarness);
		expect(renderedNames()).toHaveLength(3);

		const search = screen.getByPlaceholderText('Filter rows…');
		await fireEvent.input(search, { target: { value: 'alph' } });

		await waitFor(() => {
			expect(renderedNames()).toEqual(['alpha']);
		});
	});

	it('renders the empty branch when the search matches nothing', async () => {
		render(DataTableHarness);

		await fireEvent.input(screen.getByPlaceholderText('Filter rows…'), {
			target: { value: 'no-such-row' }
		});

		await waitFor(() => {
			expect(screen.getByText('No rows match')).toBeInTheDocument();
			expect(screen.getByText('Loosen the filter.')).toBeInTheDocument();
		});
		expect(document.querySelector('tbody')).not.toBeInTheDocument();
	});
});

describe('DataTableToolbar — filter chips', () => {
	it('applies a column filter and marks the pressed chip', async () => {
		render(DataTableHarness);

		const failed = screen.getByRole('button', { name: 'Failed' });
		expect(failed).toHaveAttribute('aria-pressed', 'false');

		await fireEvent.click(failed);

		await waitFor(() => {
			expect(renderedNames()).toEqual(['alpha']);
		});
		expect(failed).toHaveAttribute('aria-pressed', 'true');
		expect(failed.className).toContain('ds-chip-error');
	});

	it('restores every row when the All chip is pressed again', async () => {
		render(DataTableHarness);

		await fireEvent.click(screen.getByRole('button', { name: 'Healthy' }));
		await waitFor(() => expect(renderedNames()).toEqual(['charlie', 'bravo']));

		await fireEvent.click(screen.getByRole('button', { name: 'All' }));
		await waitFor(() => expect(renderedNames()).toHaveLength(3));
	});
});

describe('DataTableTanstack — master-detail selection', () => {
	it('fires onSelect with the row id and marks the row selected', async () => {
		render(DataTableHarness);
		expect(screen.getByTestId('selected-id')).toHaveTextContent('none');

		const rows = document.querySelectorAll('tbody tr');
		await fireEvent.click(rows[1]);

		await waitFor(() => {
			expect(screen.getByTestId('selected-id')).toHaveTextContent('r2');
		});
		await waitFor(() => {
			expect(document.querySelectorAll('tbody tr')[1]).toHaveAttribute('data-state', 'selected');
		});
	});

	it('selects a row from the keyboard', async () => {
		render(DataTableHarness);

		await fireEvent.keyDown(document.querySelectorAll('tbody tr')[2], { key: 'Enter' });

		await waitFor(() => {
			expect(screen.getByTestId('selected-id')).toHaveTextContent('r3');
		});
	});
});

describe('DataTableTanstack — bulk selection', () => {
	it('reports the selected ids when a row checkbox is ticked', async () => {
		render(DataTableHarness);
		expect(screen.getByTestId('bulk-selection')).toHaveTextContent('none');

		const firstRow = document.querySelectorAll('tbody tr')[0];
		await fireEvent.click(within(firstRow as HTMLElement).getByRole('checkbox'));

		await waitFor(() => {
			expect(screen.getByTestId('bulk-selection')).toHaveTextContent('r1');
		});
	});

	it('does not trigger the master-detail select when the checkbox is clicked', async () => {
		render(DataTableHarness);

		const firstRow = document.querySelectorAll('tbody tr')[0];
		await fireEvent.click(within(firstRow as HTMLElement).getByRole('checkbox'));

		await waitFor(() => expect(screen.getByTestId('bulk-selection')).toHaveTextContent('r1'));
		expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
	});

	it('selects and clears every visible row from the header checkbox', async () => {
		render(DataTableHarness);

		const selectAll = screen.getByRole('checkbox', { name: 'Select all rows' });
		await fireEvent.click(selectAll);

		await waitFor(() => {
			expect(screen.getByTestId('bulk-selection')).toHaveTextContent('r1,r2,r3');
		});

		await fireEvent.click(selectAll);
		await waitFor(() => {
			expect(screen.getByTestId('bulk-selection')).toHaveTextContent('none');
		});
	});

	it('drops a filtered-away row from the bulk selection', async () => {
		render(DataTableHarness);

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
		await waitFor(() => expect(screen.getByTestId('bulk-selection')).toHaveTextContent('r1,r2,r3'));

		// 'alpha' (r2) is the only 'error' row, so filtering to Healthy must evict it.
		await fireEvent.click(screen.getByRole('button', { name: 'Healthy' }));

		await waitFor(() => {
			expect(screen.getByTestId('bulk-selection')).toHaveTextContent('r1,r3');
		});
	});
});
