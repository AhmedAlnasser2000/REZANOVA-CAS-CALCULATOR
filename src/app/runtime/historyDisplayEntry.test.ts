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
        canonicalMath: {
          version: 1,
          canonicalLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
          mathJson: ['Equal', 'c', ['List', 1, 2]],
        },
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
    expect(entry).not.toHaveProperty('canonicalMath');
  });

  it('persists Equation route seeds for guided screen history replay', () => {
    const entry = buildHistoryDisplayEntry({
      outcome: {
        kind: 'success',
        title: 'Polynomial 2x2',
        exactLatex: '\\left(x,y\\right)\\in\\left\\{\\left(-4,-6\\right),\\left(3,1\\right)\\right\\}',
        systemReadback: {
          label: 'Solution pairs',
          variablesLatex: ['x', 'y'],
          rows: [
            { valuesLatex: ['-4', '-6'] },
            { valuesLatex: ['3', '1'] },
          ],
        },
        warnings: [],
      },
      inputLatex: 'x^{2}+y=10\\quad;\\quadx-y=2',
      mode: 'equation',
      context: {
        equationScreen: 'polynomialSystem2',
        equationSeed: {
          screen: 'polynomialSystem2',
          equationLatex: 'x^{2}+y=10\\quad;\\quadx-y=2',
          polynomialSystem2Latex: ['x^{2}+y=10', 'x-y=2'],
        },
      },
      currentCalculateHistoryContext: () => ({}),
      currentCalculusHistoryContext: () => ({}),
      geometryScreen: 'triangleArea',
      trigScreen: 'functions',
      statisticsScreen: 'descriptive',
    });

    expect(entry).toMatchObject({
      mode: 'equation',
      equationScreen: 'polynomialSystem2',
      equationSeed: {
        screen: 'polynomialSystem2',
        polynomialSystem2Latex: ['x^{2}+y=10', 'x-y=2'],
      },
      systemReadback: {
        label: 'Solution pairs',
        variablesLatex: ['x', 'y'],
        rows: [
          { valuesLatex: ['-4', '-6'] },
          { valuesLatex: ['3', '1'] },
        ],
      },
    });
  });
});
