import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphItemSpecV1, GraphPiecewiseConditionEvidenceV1 } from '../../lib/graphing';
import { buildVisibleGraphItem, graphPiecewiseDraftFromItem } from './graph-document';
import { GraphPiecewiseEditor, type GraphPiecewiseEditorProps } from './GraphPiecewiseEditor';
import '../../styles/app/graphing.css';

type Piecewise = Extract<GraphItemSpecV1, { kind: 'piecewise' }>;
const item = buildVisibleGraphItem({
  itemId: 'p', sourceLatex: String.raw`y=\begin{cases}x^2&x<1\\5&x<3\end{cases}`, sourceRevision: 1, index: 0,
}) as Piecewise;

const evidence: GraphPiecewiseConditionEvidenceV1 = {
  version: 1, independentSymbol: 'x', basis: 'exact-global', validatedInterval: { minimum: -10, maximum: 10, tolerancePixels: 0.35 },
  branchApplicability: [], overlapBranchPairs: [], unresolvedBoundaryCount: 0,
  boundaries: [{ value: 1, includedBranchIds: ['branch.2'], excludedBranchIds: ['branch.1'] }, { value: 3, includedBranchIds: [], excludedBranchIds: ['branch.2'] }],
  uncoveredGaps: [{ minimum: 3, maximum: 10, minimumInclusive: true, maximumInclusive: true }],
  drawnIntervals: [
    { branchId: 'branch.1', intervals: [{ minimum: -10, maximum: 1, minimumInclusive: true, maximumInclusive: false }] },
    { branchId: 'branch.2', intervals: [{ minimum: 1, maximum: 3, minimumInclusive: true, maximumInclusive: false }] },
  ],
};

function renderEditor(extra: Partial<GraphPiecewiseEditorProps> = {}) {
  const props: GraphPiecewiseEditorProps = {
    appearance: { theme: 'technical', colorVisionMode: 'standard' }, draft: graphPiecewiseDraftFromItem(item), embedded: true,
    evidence, item, onBranchStyle: vi.fn(), onChange: vi.fn(), onCommit: vi.fn(() => true), onDelete: vi.fn(), onMutate: vi.fn(), ...extra,
  };
  render(<GraphPiecewiseEditor {...props} />);
  return props;
}

describe('GraphPiecewiseEditor (GRAPHING-PIECEWISE2)', () => {
  it('lays the branches out under one brace with their own colours and an otherwise row', () => {
    renderEditor();
    const editor = screen.getByRole('group', { name: 'Piecewise branches' });
    expect(within(editor).getByText('y =')).toBeInTheDocument();
    expect(within(editor).getAllByText('if')).toHaveLength(2);
    expect(screen.getByTestId('graph-piecewise-otherwise')).toHaveClass('is-empty');
    const swatches = [1, 2].map((index) => screen.getByRole('button', { name: `Style branch ${index}` }).style.getPropertyValue('--graph-branch-color'));
    expect(new Set(swatches).size).toBe(2);
    // Nothing changed yet: Apply waits.
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('reorders from the keyboard and through each branch menu', () => {
    const props = renderEditor();
    fireEvent.keyDown(screen.getByTestId('graph-piecewise-branch-2'), { key: 'ArrowUp', altKey: true });
    expect(props.onMutate).toHaveBeenLastCalledWith({ action: 'up', branchId: 'branch.2' });
    fireEvent.click(screen.getByRole('button', { name: 'Branch 1 options' }));
    expect(screen.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(props.onMutate).toHaveBeenLastCalledWith({ action: 'duplicate', branchId: 'branch.1' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows where each branch is drawn and where nothing is, and goes to a branch from the strip', () => {
    renderEditor();
    const strip = screen.getByTestId('graph-piecewise-coverage');
    expect(within(strip).getByRole('button', { name: 'Branch 1 for x < 1' })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: 'Branch 2 for 1 ≤ x < 3' })).toBeInTheDocument();
    expect(within(strip).getByRole('img', { name: 'Nothing drawn for x ≥ 3' })).toBeInTheDocument();
  });

  it('opens a branch style and can return it to its default colour', () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Style branch 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Branch 2 style' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use orange' }));
    expect(props.onBranchStyle).toHaveBeenLastCalledWith('branch.2', expect.objectContaining({ color: { kind: 'token', token: 'graph-orange' } }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Default' }));
    expect(props.onBranchStyle).toHaveBeenLastCalledWith('branch.2', null);
  });
});
