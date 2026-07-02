import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../types/calculator';
import type { DisplayBlock } from '../../lib/display/result/display-blocks';
import {
  buildFormulaViewerArtifact,
  formulaViewerSurfaceState,
} from '../runtime/formula-viewer-artifacts';
import {
  createWorkspaceInstance,
  type WorkspaceInstance,
} from '../runtime/workspace-instances';
import { ActiveSurfaceHost } from './ActiveSurfaceHost';
import type { ModeId } from '../../types/calculator';

const modeLabels: Record<ModeId, string> = {
  calculate: 'Calculate',
  calculus: 'Calculus',
  equation: 'Equation',
  geometry: 'Geometry',
  guide: 'Guide',
  labs: 'Labs',
  matrix: 'Matrix',
  statistics: 'Statistics',
  table: 'Table',
  trigonometry: 'Trigonometry',
  vector: 'Vector',
};

function answerBlock(): DisplayBlock {
  return {
    id: 'answer',
    kind: 'answer',
    label: 'Symbolic',
    latex: 'x=1',
    rawContent: ['x=1'],
    renderKind: 'math',
  };
}

function formulaViewerInstance(): WorkspaceInstance {
  const artifact = buildFormulaViewerArtifact({
    block: answerBlock(),
    displayBlocks: [answerBlock()],
    now: () => 1,
    source: {
      copyLatex: 'x=1',
      resolvedInputLatex: 'x+1=2',
      sourceExpressionLatex: 'x+1=2',
      sourceWorkspaceInstanceId: 'equation.1',
      sourceWorkspaceKind: 'equation',
      sourceWorkspaceTitle: 'Equation',
    },
  });

  return {
    ...createWorkspaceInstance('formula-viewer', 2, {
      idFactory: (kind, order) => `${kind}.${order}`,
      now: () => 2,
    }),
    surfaceState: formulaViewerSurfaceState(artifact),
  };
}

function activeSurfaceHostProps() {
  return {
    history: [],
    modeLabels,
    onCopyResult: vi.fn(),
    onDeleteHistoryEntry: vi.fn(),
    onDeleteSelectedHistoryEntries: vi.fn(),
    onFocusTab: vi.fn(),
    onPatchSettings: vi.fn(),
    onReplayHistoryEntry: vi.fn(),
    onReplayHistoryEntryInNewTab: vi.fn(),
    onResetCalculatorMemory: vi.fn(),
    onResetHistory: vi.fn(),
    onStopPendingHistoryTicket: vi.fn(),
    pendingHistory: [],
    renderCalculatorSurface: () => (
      <div data-testid="calculator-shell">Calculator body</div>
    ),
    settings: DEFAULT_SETTINGS,
    symbolicDisplayPrefs: DEFAULT_SETTINGS,
    workspaceInstances: [],
  };
}

describe('ActiveSurfaceHost', () => {
  it('renders calculator workspaces through the calculator surface slot', () => {
    render(
      <ActiveSurfaceHost
        {...activeSurfaceHostProps()}
        activeInstance={createWorkspaceInstance('calculate', 1)}
      />,
    );

    expect(screen.getByTestId('active-surface-calculator')).toContainElement(
      screen.getByTestId('calculator-shell'),
    );
    expect(screen.queryByTestId('active-surface-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('formula-viewer-page')).not.toBeInTheDocument();
  });

  it('renders Formula Viewer as a page surface outside the calculator shell', () => {
    const onCopyResult = vi.fn();
    const onFocusTab = vi.fn();
    const source = createWorkspaceInstance('equation', 1, {
      idFactory: (kind, order) => `${kind}.${order}`,
    });

    render(
      <ActiveSurfaceHost
        {...activeSurfaceHostProps()}
        activeInstance={formulaViewerInstance()}
        onCopyResult={onCopyResult}
        onFocusTab={onFocusTab}
        workspaceInstances={[source]}
      />,
    );

    const pageSurface = screen.getByTestId('active-surface-page');
    expect(pageSurface).toHaveAttribute('data-surface-kind', 'formula-viewer');
    expect(pageSurface).toContainElement(screen.getByTestId('formula-viewer-page'));
    expect(screen.queryByTestId('calculator-shell')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(onCopyResult).toHaveBeenCalledWith('x=1');

    fireEvent.click(screen.getByRole('button', { name: 'Back to source' }));
    expect(onFocusTab).toHaveBeenCalledWith('equation.1');
  });

  it('renders Settings as a page surface outside the calculator shell', () => {
    render(
      <ActiveSurfaceHost
        {...activeSurfaceHostProps()}
        activeInstance={createWorkspaceInstance('settings', 2)}
      />,
    );

    const pageSurface = screen.getByTestId('active-surface-page');
    expect(pageSurface).toHaveAttribute('data-surface-kind', 'settings');
    expect(pageSurface).toContainElement(screen.getByTestId('settings-page'));
    expect(screen.queryByTestId('calculator-shell')).not.toBeInTheDocument();
  });

  it('applies page scale and high contrast to page surfaces without calculator context', () => {
    render(
      <ActiveSurfaceHost
        {...activeSurfaceHostProps()}
        activeInstance={createWorkspaceInstance('settings', 2)}
        settings={{
          ...DEFAULT_SETTINGS,
          highContrast: true,
          mathScale: 130,
          resultScale: 115,
          uiScale: 145,
        }}
      />,
    );

    const pageSurface = screen.getByTestId('active-surface-page');
    expect(pageSurface).toHaveClass('is-high-contrast');
    expect(pageSurface.getAttribute('style') ?? '').toContain('--page-ui-scale: 1.45');
    expect(pageSurface.getAttribute('style') ?? '').toContain('--math-scale: 1.3');
    expect(pageSurface.getAttribute('style') ?? '').toContain('--result-scale: 1.15');
    expect(screen.queryByTestId('calculator-shell')).not.toBeInTheDocument();
  });

  it('renders History as a page surface outside the calculator shell', () => {
    render(
      <ActiveSurfaceHost
        {...activeSurfaceHostProps()}
        activeInstance={createWorkspaceInstance('history', 3)}
        history={[
          {
            id: 'history.1',
            inputLatex: 'x+1=2',
            mode: 'equation',
            resultLatex: 'x=1',
            timestamp: '2026-07-01T10:00:00Z',
          },
        ]}
      />,
    );

    const pageSurface = screen.getByTestId('active-surface-page');
    expect(pageSurface).toHaveAttribute('data-surface-kind', 'history');
    expect(pageSurface).toContainElement(screen.getByTestId('history-page'));
    expect(screen.queryByTestId('calculator-shell')).not.toBeInTheDocument();
  });
});
