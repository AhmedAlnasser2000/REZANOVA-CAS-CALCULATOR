import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StatisticsVisualizationPayloadV1 } from '../../types/calculator';
import { WorkspaceLowerPanel } from './WorkspaceLowerPanel';

vi.mock('./statistics/StatisticsEChart', () => ({
  StatisticsEChart: ({ view }: { view: { ariaDescription: string } }) => (
    <div data-testid="statistics-visualization-chart" aria-label={view.ariaDescription} />
  ),
}));

const rows = [[{ id: 'one', label: '1', variant: 'digit' as const, latex: '1' }]];

const payload: StatisticsVisualizationPayloadV1 = {
  version: 1,
  defaultKind: 'histogram',
  views: [
    {
      kind: 'histogram',
      title: 'Distribution of values',
      xLabel: 'Value',
      yLabel: 'Frequency',
      ariaDescription: 'Histogram of five observations.',
      weightedValues: [{ value: 12, weight: 1 }, { value: 15, weight: 2 }],
      table: {
        columns: ['Value', 'Frequency'],
        rows: [[12, 1], [15, 2]],
        totalRows: 2,
      },
    },
    {
      kind: 'boxPlot',
      title: 'Five-number summary',
      xLabel: 'Value',
      yLabel: '',
      ariaDescription: 'Box plot of five observations.',
      weightedValues: [{ value: 12, weight: 1 }, { value: 15, weight: 2 }],
      table: {
        columns: ['Value', 'Frequency'],
        rows: [[12, 1], [15, 2]],
        totalRows: 2,
      },
    },
  ],
};

const baseProps = {
  rows,
  activeLayer: 'base' as const,
  layerLocked: false,
  onKeypad: vi.fn(),
  onSelectLayer: vi.fn(),
  onToggleLayerLock: vi.fn(),
  statisticsSection: 'dataSummary' as const,
  statisticsInputMode: 'guided' as const,
  statisticsVisualization: payload,
  statisticsVisualizationKind: 'histogram' as const,
  statisticsHistogramBinCount: 'auto' as const,
  approxDigits: 6,
  statisticsResultIsStale: false,
  statisticsOutcomeKind: 'success' as const,
  runtimeStatusLabel: 'Ready',
  onStatisticsVisualizationKindChange: vi.fn(),
  onStatisticsHistogramBinCountChange: vi.fn(),
};

describe('WorkspaceLowerPanel', () => {
  it('replaces the keypad only for Statistics', async () => {
    const view = render(<WorkspaceLowerPanel {...baseProps} currentMode="statistics" />);
    expect(await screen.findByTestId('statistics-visualization-dock')).toBeVisible();
    expect(screen.queryByTestId('keypad-one')).not.toBeInTheDocument();

    view.rerender(<WorkspaceLowerPanel {...baseProps} currentMode="calculate" />);
    expect(screen.queryByTestId('statistics-visualization-dock')).not.toBeInTheDocument();
    expect(screen.getByTestId('keypad-one')).toBeVisible();
  });

  it('selects result visuals and changes histogram bins without reevaluation', async () => {
    const onKindChange = vi.fn();
    const onBinsChange = vi.fn();
    render(
      <WorkspaceLowerPanel
        {...baseProps}
        currentMode="statistics"
        statisticsResultIsStale
        onStatisticsVisualizationKindChange={onKindChange}
        onStatisticsHistogramBinCountChange={onBinsChange}
      />,
    );

    expect(await screen.findByTestId('statistics-visualization-dock')).toBeVisible();
    expect(screen.getByText('Stale')).toBeVisible();
    expect(screen.getByText('Visualization', { selector: 'span' })).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Visualization' }), {
      target: { value: 'boxPlot' },
    });
    expect(onKindChange).toHaveBeenCalledWith('boxPlot');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Histogram bins' }), {
      target: { value: '8' },
    });
    expect(onBinsChange).toHaveBeenCalledWith(8);
  });

  it('opens a precision-formatted chart data table without replacing the plot', async () => {
    render(
      <WorkspaceLowerPanel
        {...baseProps}
        currentMode="statistics"
        approxDigits={2}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View data' }));
    expect(screen.getByTestId('statistics-visualization-chart')).toBeVisible();
    expect(screen.getByRole('table', { name: 'Distribution of values data' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Interval' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous data page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next data page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hide data' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('gives stopped empty docks a stable explicit state', async () => {
    render(
      <WorkspaceLowerPanel
        {...baseProps}
        currentMode="statistics"
        statisticsVisualization={undefined}
        statisticsVisualizationKind={undefined}
        runtimeStatusLabel="Stopped"
      />,
    );

    expect(await screen.findByTestId('statistics-visualization-dock')).toBeVisible();
    expect(screen.getByText('Stopped')).toBeVisible();
    expect(screen.getByTestId('statistics-visualization-empty')).toBeVisible();
  });

  it('offers the existing keypad as a temporary Expression-only swap', async () => {
    const view = render(
      <WorkspaceLowerPanel
        {...baseProps}
        currentMode="statistics"
        statisticsInputMode="expression"
        statisticsResultRevision="revision-1"
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Show keypad' }));
    expect(screen.getByTestId('statistics-expression-keypad')).toBeVisible();
    expect(screen.getByTestId('keypad-one')).toBeVisible();

    view.rerender(
      <WorkspaceLowerPanel
        {...baseProps}
        currentMode="statistics"
        statisticsInputMode="expression"
        statisticsResultRevision="revision-2"
      />,
    );
    expect(screen.queryByTestId('statistics-expression-keypad')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Show keypad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show visualization' }));
    expect(screen.queryByTestId('statistics-expression-keypad')).not.toBeInTheDocument();

    view.rerender(
      <WorkspaceLowerPanel
        {...baseProps}
        currentMode="statistics"
        statisticsInputMode="guided"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Show keypad' })).not.toBeInTheDocument();
  });
});
