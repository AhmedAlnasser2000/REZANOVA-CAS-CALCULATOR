import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FormulaViewerPage } from './FormulaViewerPage';
import type { FormulaViewerArtifact } from '../runtime/formula-viewer-artifacts';
import type { DisplayBlock, DisplayBlockLine } from '../../lib/display/result/display-blocks';
import { DEFAULT_SETTINGS } from '../../types/calculator';

const giantLatex = String.raw`\left\{\sqrt[3]{-\frac{2\pi mn+m\arcsin(b)+1}{2}+\sqrt{\left(\frac{2\pi mn+m\arcsin(b)+1}{2}\right)^2+\left(\frac{-2\pi n-\arcsin(b)+1}{3}\right)^3}}+\sqrt[3]{-\frac{2\pi mn+m\arcsin(b)+1}{2}-\sqrt{\left(\frac{2\pi mn+m\arcsin(b)+1}{2}\right)^2+\left(\frac{-2\pi n-\arcsin(b)+1}{3}\right)^3}}\right\}`;
const giantCondition = String.raw`\Delta<0,\ P<0,\ t=2\sqrt{-\frac{P}{3}}\cos\left(\frac{1}{3}\arccos\left(\frac{3Q}{2P}\sqrt{-\frac{3}{P}}\right)-\frac{2\pi k}{3}\right),\ k=0,1,2`;

function makeCaseRows(count: number): DisplayBlockLine[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `case-${index}`,
    groupLatex: index % 4 === 0
      ? String.raw`\frac{z^3+z+1}{z-m}=\arcsin(b)+2\pi n`
      : undefined,
    latex: `${giantLatex}_${index}`,
    conditionLatex: giantCondition,
  }));
}

function caseBlock(id: string, kind: DisplayBlock['kind'], rows: DisplayBlockLine[]): DisplayBlock {
  return {
    id,
    kind,
    label: kind === 'answer' ? 'Answer' : 'Trig Formula Cases',
    renderKind: 'caseMath',
    text: String.raw`z\in`,
    lines: rows,
    rawContent: rows.map((row) => row.latex ?? ''),
    collapsible: kind === 'detail',
    defaultCollapsed: kind === 'detail',
    testId: kind === 'detail' ? 'viewer-trig-detail' : 'viewer-answer',
  };
}

function artifact(options: { primaryRows?: number; detailRows?: number } = {}): FormulaViewerArtifact {
  const primaryRows = options.primaryRows ?? 60;
  const detailRows = options.detailRows ?? 24;
  const primaryBlock = caseBlock('answer', 'answer', makeCaseRows(primaryRows));
  const validWhen: DisplayBlock = {
    id: 'valid',
    kind: 'validWhen',
    label: 'Valid When',
    renderKind: 'mathList',
    lines: [
      {
        id: 'valid-1',
        latex: String.raw`z-m\ne0`,
      },
    ],
    rawContent: [String.raw`z-m\ne0`],
  };
  const detailBlock = caseBlock('detail-trig-cases', 'detail', makeCaseRows(detailRows));

  return {
    kind: 'formula-viewer-artifact',
    id: 'formula-viewer.test',
    resultSignature: 'test-signature',
    sourceWorkspaceInstanceId: 'equation.1',
    sourceWorkspaceKind: 'equation',
    sourceWorkspaceTitle: 'Equation',
    sourceExpressionLatex: String.raw`\sin\left(\frac{z^3+z+1}{z-m}\right)=b`,
    resolvedInputLatex: String.raw`\sin\left(\frac{z^3+z+1}{z-m}\right)=b`,
    resultTitle: 'Symbolic',
    copyLatex: String.raw`z\in\begin{cases}...\end{cases}`,
    primaryBlock,
    globalFactBlocks: [validWhen],
    detailBlocks: [detailBlock],
    rowCount: primaryRows + detailRows,
    groupCount: 2,
    latexLength: 4000,
    createdAt: 1,
  };
}

describe('FormulaViewerPage virtualization', () => {
  it('mounts only a virtual subset of giant answer rows and reveals one row on request', () => {
    const copy = vi.fn();
    render(
      <FormulaViewerPage
        artifact={artifact()}
        onCopyResult={copy}
        sourceAvailable
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const scroll = screen.getByTestId('formula-viewer-scroll');
    const rowButtons = within(scroll).getAllByRole('button', { name: 'Show formula row' });
    expect(rowButtons.length).toBeGreaterThan(0);
    expect(rowButtons.length).toBeLessThan(60);
    expect(within(scroll).queryAllByTestId('formula-viewer-case-row-59')).toHaveLength(0);

    fireEvent.click(rowButtons[0]);

    const rowButtonsAfterReveal = within(scroll).getAllByRole('button', { name: 'Show formula row' });
    expect(rowButtonsAfterReveal.length).toBe(rowButtons.length - 1);
    fireEvent.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(copy).toHaveBeenCalledWith(String.raw`z\in\begin{cases}...\end{cases}`);
  });

  it('keeps collapsed case details as headers and virtualizes rows after opening them', () => {
    render(
      <FormulaViewerPage
        artifact={artifact({ primaryRows: 1, detailRows: 60 })}
        onCopyResult={vi.fn()}
        sourceAvailable
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const scroll = screen.getByTestId('formula-viewer-scroll');
    const detailHeader = within(scroll).getByTestId('viewer-trig-detail');
    expect(detailHeader).toHaveAttribute('aria-expanded', 'false');
    expect(within(scroll).queryByText('Formula route: cubic-cardano')).not.toBeInTheDocument();

    fireEvent.click(detailHeader);

    expect(detailHeader).toHaveAttribute('aria-expanded', 'true');
    const visibleItems = within(scroll).getAllByTestId('formula-viewer-virtual-item');
    expect(visibleItems.length).toBeLessThan(90);
  });
});
