import { describe, expect, it } from 'vitest';
import {
  buildSignChartInequalitySet,
  relationToSymbol,
  testSignRelation,
} from '../inequality-sign-analysis-core';
import { inequalitySetToLatex } from '../inequality-core';

describe('inequality-sign-analysis-core', () => {
  it('maps sign relations to stable symbols and sampled truth values', () => {
    expect(relationToSymbol('Less')).toBe('<');
    expect(relationToSymbol('LessEqual')).toBe('<=');
    expect(relationToSymbol('Greater')).toBe('>');
    expect(relationToSymbol('GreaterEqual')).toBe('>=');

    expect(testSignRelation(-1, 'Less')).toBe(true);
    expect(testSignRelation(0, 'Less')).toBe(false);
    expect(testSignRelation(0, 'LessEqual')).toBe(true);
    expect(testSignRelation(1, 'Greater')).toBe(true);
    expect(testSignRelation(0, 'GreaterEqual')).toBe(true);
  });

  it('returns all-real or empty sets when no critical points exist', () => {
    const allReal = buildSignChartInequalitySet({
      variable: 'x',
      relation: 'Greater',
      evaluateAt: () => 2,
    });
    expect(allReal.kind).toBe('success');
    if (allReal.kind === 'success') {
      expect(inequalitySetToLatex(allReal.set)).toBe('x\\in\\mathbb{R}');
    }

    const empty = buildSignChartInequalitySet({
      variable: 'x',
      relation: 'Less',
      evaluateAt: () => 2,
    });
    expect(empty.kind).toBe('success');
    if (empty.kind === 'success') {
      expect(inequalitySetToLatex(empty.set)).toBe('x\\in\\varnothing');
    }
  });

  it('classifies open cells and denominator exclusions', () => {
    const result = buildSignChartInequalitySet({
      variable: 'x',
      relation: 'Greater',
      roots: [{ numeric: 1, latex: '1' }],
      exclusions: [{ numeric: -2, latex: '-2' }],
      evaluateAt: (value) => (value - 1) / (value + 2),
    });

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(inequalitySetToLatex(result.set)).toBe('x<-2\\;\\cup\\;x>1');
      expect(result.boundaryPoints.map((point) => ({
        latex: point.latex,
        zero: point.zero,
        excluded: point.excluded,
      }))).toEqual([
        { latex: '-2', zero: false, excluded: true },
        { latex: '1', zero: true, excluded: false },
      ]);
    }
  });

  it('adds equality points for closed relations while preserving repeated-root behavior', () => {
    const result = buildSignChartInequalitySet({
      variable: 'x',
      relation: 'LessEqual',
      roots: [{ numeric: 1, latex: '1' }],
      evaluateAt: (value) => (value - 1) ** 2,
    });

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(inequalitySetToLatex(result.set)).toBe('x=1');
    }
  });

  it('reports invalid boundaries and failed samples', () => {
    expect(buildSignChartInequalitySet({
      variable: 'x',
      relation: 'Greater',
      roots: [{ numeric: Number.POSITIVE_INFINITY, latex: '\\infty' }],
      evaluateAt: () => 1,
    })).toEqual({ kind: 'stop', reason: 'invalid-boundary' });

    expect(buildSignChartInequalitySet({
      variable: 'x',
      relation: 'Greater',
      roots: [{ numeric: 0, latex: '0' }],
      evaluateAt: () => null,
    })).toEqual({ kind: 'stop', reason: 'sample-failed' });
  });
});
