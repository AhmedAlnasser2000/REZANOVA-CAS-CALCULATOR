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

function answerBlock(): DisplayBlock {
  return {
    id: 'answer',
    kind: 'answer',
    label: 'Symbolic',
    latex: 'x=1',
    rawContent: ['x=1'],
    renderKind: 'latex',
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

describe('ActiveSurfaceHost', () => {
  it('renders calculator workspaces through the calculator surface slot', () => {
    render(
      <ActiveSurfaceHost
        activeInstance={createWorkspaceInstance('calculate', 1)}
        onCopyResult={vi.fn()}
        onFocusTab={vi.fn()}
        renderCalculatorSurface={() => (
          <div data-testid="calculator-shell">Calculator body</div>
        )}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
        workspaceInstances={[]}
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
        activeInstance={formulaViewerInstance()}
        onCopyResult={onCopyResult}
        onFocusTab={onFocusTab}
        renderCalculatorSurface={() => (
          <div data-testid="calculator-shell">Calculator body</div>
        )}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
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
});
