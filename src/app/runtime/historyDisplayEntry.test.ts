import { describe, expect, it } from 'vitest';
import type { DisplayDetailSection, HistoryEntry, TableResponse } from '../../types/calculator';
import { buildHistoryDisplayEntry, readHistoryResult } from './historyDisplayEntry';
import { withCanonicalResult } from './canonical-outcome-test-helper';

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
      outcome: withCanonicalResult({
        kind: 'success',
        title: '\\operatorname{coords}(A,b)',
        exactLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
        canonicalMath: {
          version: 1,
          canonicalLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
          mathJson: ['Equal', 'c', ['List', 1, 2]],
        },
        detailSections,
        actions: [{ kind: 'send', target: 'equation', latex: 'c=1' }],
        runtimeAdvisories: { stopReason: { kind: 'range-guard', source: 'stage' } },
        warnings: [],
      }),
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
      resultDocument: {
        version: 1,
        outcomeKind: 'success',
        title: '\\operatorname{coords}(A,b)',
        primaryMath: {
          canonicalLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
          mathJson: ['Equal', 'c', ['List', 1, 2]],
        },
        warnings: [],
      },
    });
    expect(entry).not.toHaveProperty('resultLatex');
    expect(entry).not.toHaveProperty('detailSections');
    expect(entry).not.toHaveProperty('canonicalMath');
    expect(JSON.stringify(entry.resultDocument)).not.toMatch(/actions|runtimeAdvisories/u);
    expect(readHistoryResult(entry)).toMatchObject({
      source: 'structured',
      outcome: {
        kind: 'success',
        title: '\\operatorname{coords}(A,b)',
        exactLatex: 'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      },
    });
  });

  it('persists Equation route seeds for guided screen history replay', () => {
    const entry = buildHistoryDisplayEntry({
      outcome: withCanonicalResult({
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
      }),
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
      resultDocument: {
        systemReadback: {
          label: 'Solution pairs',
          variables: [{ canonicalLatex: 'x' }, { canonicalLatex: 'y' }],
          rows: [
            { values: [{ canonicalLatex: '-4' }, { canonicalLatex: '-6' }] },
            { values: [{ canonicalLatex: '3' }, { canonicalLatex: '1' }] },
          ],
        },
      },
    });
  });

  it('stores exact Table rows and never leaks transient commit context', () => {
    const tableResponse: TableResponse = {
      headers: ['x', '\\sqrt{x}'],
      rows: [
        { x: '-1', primary: 'undefined' },
        { x: '0', primary: '0' },
      ],
      warnings: ['Some sampled rows were outside the real domain.'],
    };
    const entry = buildHistoryDisplayEntry({
      outcome: {
        kind: 'success',
        title: 'Table',
        exactLatex: '\\operatorname{Table}(\\sqrt{x})',
        canonicalResult: {
          version: 1,
          outcomeKind: 'success',
          title: 'Table',
          primaryMath: { canonicalLatex: '\\operatorname{Table}(\\sqrt{x})' },
          warnings: [...tableResponse.warnings],
          table: {
            headers: [...tableResponse.headers],
            rows: tableResponse.rows.map((row) => ({
              x: { canonicalLatex: row.x },
              primary: { canonicalLatex: row.primary },
            })),
          },
        },
        warnings: [...tableResponse.warnings],
      },
      inputLatex: '\\sqrt{x}',
      mode: 'table',
      context: {
        historyTicketId: 'ticket.private',
        historyLaunchOrder: 7,
        suppressDisplayCommit: true,
        tableResponse,
      },
      currentCalculateHistoryContext: () => ({}),
      currentCalculusHistoryContext: () => ({}),
      geometryScreen: 'triangleArea',
      trigScreen: 'functions',
      statisticsScreen: 'descriptive',
    });

    expect(readHistoryResult(entry).tableResponse).toEqual(tableResponse);
    expect(entry).not.toHaveProperty('historyTicketId');
    expect(entry).not.toHaveProperty('suppressDisplayCommit');
    expect(entry).not.toHaveProperty('tableResponse');
  });

  it('fails closed when native canonical structure is oversized', () => {
    expect(() => buildHistoryDisplayEntry({
      outcome: {
        kind: 'success',
        title: 'Large result',
        exactLatex: 'x=1',
        canonicalResult: {
          version: 1,
          outcomeKind: 'success',
          title: 'Large result',
          primaryMath: { canonicalLatex: 'x=1' },
          warnings: ['x'.repeat(641_000)],
        },
        warnings: [],
      },
      inputLatex: 'x=1',
      mode: 'equation',
      context: {},
      currentCalculateHistoryContext: () => ({}),
      currentCalculusHistoryContext: () => ({}),
      geometryScreen: 'triangleArea',
      trigScreen: 'functions',
      statisticsScreen: 'descriptive',
    })).toThrow('History success entries require native canonical result authority.');
  });

  it('rejects malformed or future documents from the V1 read path', () => {
    const entry = {
      id: 'legacy-with-bad-extension',
      mode: 'calculate',
      inputLatex: '2+2',
      resultDocument: { version: 2, title: 'future' },
      timestamp: '2026-07-12T00:00:00.000Z',
    } as unknown as HistoryEntry;

    expect(() => readHistoryResult(entry)).toThrow(
      'History entry requires a valid canonical result document.',
    );
  });
});
