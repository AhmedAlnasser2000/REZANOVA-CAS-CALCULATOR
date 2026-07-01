import { describe, expect, it } from 'vitest';
import type { DisplayBlock } from '../../lib/display/result/display-blocks';
import {
  buildFormulaViewerArtifact,
  formulaViewerArtifactFromSurfaceState,
  formulaViewerSurfaceState,
} from './formula-viewer-artifacts';

function caseMathBlock(): DisplayBlock {
  return {
    id: 'display-outcome-exact',
    kind: 'answer',
    label: 'Answer',
    rawContent: [],
    renderKind: 'caseMath',
    text: 'z\\in',
    trustSummary: 'Exact roots',
    lines: [
      {
        conditionLatex: String.raw`\Delta>0`,
        groupLatex: String.raw`F=b`,
        id: 'row.1',
        latex: 'z_1',
      },
      {
        conditionLatex: String.raw`\Delta=0`,
        groupLatex: String.raw`F=-b`,
        id: 'row.2',
        latex: 'z_2',
      },
    ],
  };
}

describe('formula viewer artifacts', () => {
  it('builds a structured caseMath artifact without raw-LaTeX fallback parsing', () => {
    const answer = caseMathBlock();
    const validWhen: DisplayBlock = {
      id: 'valid-when',
      kind: 'validWhen',
      label: 'Valid When',
      latex: String.raw`b\ge0`,
      rawContent: [String.raw`b\ge0`],
      renderKind: 'mathList',
    };
    const detail: DisplayBlock = {
      id: 'detail.1',
      kind: 'detail',
      label: 'Trig Formula Cases',
      rawContent: [],
      renderKind: 'caseMath',
      lines: answer.lines,
    };

    const artifact = buildFormulaViewerArtifact({
      block: answer,
      displayBlocks: [answer, validWhen, detail],
      now: () => 42,
      source: {
        copyLatex: String.raw`z\in\begin{cases}z_1&\Delta>0\end{cases}`,
        resolvedInputLatex: String.raw`\sin(F)=b`,
        resultTitle: 'Symbolic',
        sourceExpressionLatex: String.raw`\sin(F)=b`,
        sourceWorkspaceInstanceId: 'equation.1',
        sourceWorkspaceKind: 'equation',
        sourceWorkspaceTitle: 'Equation',
      },
    });

    expect(artifact).toMatchObject({
      copyLatex: String.raw`z\in\begin{cases}z_1&\Delta>0\end{cases}`,
      createdAt: 42,
      countSummary: {
        branchFamilyCount: 2,
        guardedRowCount: 2,
        kind: 'branchFamilies',
        text: '2 branch families · 2 guarded rows',
      },
      kind: 'formula-viewer-artifact',
      resultTitle: 'Symbolic',
      rowCount: 2,
      groupCount: 2,
      sourceWorkspaceInstanceId: 'equation.1',
      sourceWorkspaceKind: 'equation',
      sourceWorkspaceTitle: 'Equation',
      trustSummary: 'Exact roots',
    });
    expect(artifact.id).toBe(`formula-viewer.${artifact.resultSignature}`);
    expect(artifact.primaryBlock).toBe(answer);
    expect(artifact.globalFactBlocks).toEqual([validWhen]);
    expect(artifact.detailBlocks).toEqual([detail]);
    expect(artifact.latexLength).toBeGreaterThan(0);
  });

  it('round-trips through the session-only formula viewer surface state', () => {
    const artifact = buildFormulaViewerArtifact({
      block: caseMathBlock(),
      displayBlocks: [],
      now: () => 7,
    });

    const surfaceState = formulaViewerSurfaceState(artifact);

    expect(formulaViewerArtifactFromSurfaceState(surfaceState)).toBe(artifact);
    expect(formulaViewerArtifactFromSurfaceState({ kind: 'calculate' })).toBeNull();
  });
});
