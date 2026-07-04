import { describe, expect, it } from 'vitest';
import type { DisplayDetailSection } from '../../types/calculator';
import { buildHistoryDisplayEntry } from './historyDisplayEntry';

describe('buildHistoryDisplayEntry', () => {
  it('persists display detail sections so History replay can restore result cards', () => {
    const detailSections: DisplayDetailSection[] = [
      {
        title: 'Coordinate Proof',
        lines: ['A c=b', 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}'],
        lineKinds: ['math', 'math'],
      },
    ];

    const entry = buildHistoryDisplayEntry({
      outcome: {
        kind: 'success',
        title: '\\operatorname{coords}(A,b)',
        exactLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
        detailSections,
        warnings: [],
      },
      inputLatex: '\\operatorname{coords}(A,b)',
      mode: 'matrix',
      context: {
        matrixSeed: {
          operation: 'coordinatesA',
          matrixA: [[1, 2], [3, 4]],
          matrixB: [[1, 0], [0, 1]],
          coordinateVector: [5, 11],
          editorExpressionLatex: '\\operatorname{coords}(A,b)',
        },
      },
      currentCalculateHistoryContext: () => ({}),
      currentCalculusHistoryContext: () => ({}),
      geometryScreen: 'triangleArea',
      trigScreen: 'functions',
      statisticsScreen: 'descriptive',
    });

    expect(entry).toMatchObject({
      mode: 'matrix',
      inputLatex: '\\operatorname{coords}(A,b)',
      resultLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      detailSections,
    });
  });
});
