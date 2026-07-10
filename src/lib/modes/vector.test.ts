import { describe, expect, it } from 'vitest';
import { buildVectorOoeSnapshot, runVectorMode } from './vector';

describe('runVectorMode', () => {
  it('reads exact linear combinations without nonnumeric approximation text', () => {
    expect(runVectorMode({
      operation: 'linearCombination',
      vectorA: [4.5, 4.5],
      vectorB: [0, 0],
      exactVectorA: [
        { numerator: 9, denominator: 2 },
        { numerator: 9, denominator: 2 },
      ],
      editorExpressionLatex: '\\frac{1}{2}\\left(p+q\\right)',
      vectorOperandLatexA: '\\frac{1}{2}\\left(p+q\\right)',
      angleUnit: 'rad',
    })).toMatchObject({
      kind: 'success',
      title: '\\frac{1}{2}\\left(p+q\\right)',
      exactLatex: '\\begin{bmatrix}\\frac{9}{2}\\\\\\frac{9}{2}\\end{bmatrix}',
      answerRows: {
        rows: [{
          latex: '\\frac{1}{2}\\left(p+q\\right)=\\begin{bmatrix}\\frac{9}{2}\\\\\\frac{9}{2}\\end{bmatrix}',
        }],
      },
      approxText: undefined,
    });
  });

  it('uses editor expressions as Vector result titles when present', () => {
    const expressionLatex = '\\operatorname{proj}_{u}\\left(\\begin{bmatrix}2\\\\3\\end{bmatrix}\\right)';
    const result = runVectorMode({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [2, 3],
      angleUnit: 'deg',
      editorExpressionLatex: expressionLatex,
      vectorOperandLatexA: 'u',
      vectorOperandLatexB: '\\begin{bmatrix}2\\\\3\\end{bmatrix}',
    });

    expect(result.title).toBe(expressionLatex);
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.sourceMode).toBe('vector');
  });

  it('keeps vector operation ids working with u/v readback labels', () => {
    expect(runVectorMode({
      operation: 'dot',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).title).toBe('u·v');
    expect(runVectorMode({
      operation: 'normA',
      vectorA: [3, 4],
      vectorB: [0, 0],
      angleUnit: 'deg',
    }).title).toBe('‖u‖');
    expect(runVectorMode({
      operation: 'add',
      vectorA: [1, 2],
      vectorB: [3, 4],
      angleUnit: 'deg',
    }).title).toBe('u+v');
    expect(runVectorMode({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [2, 3],
      angleUnit: 'deg',
    }).title).toBe('proj_u(v)');
    const orthogonality = runVectorMode({
      operation: 'orthogonalCheck',
      vectorA: [1, 0],
      vectorB: [0, 3],
      angleUnit: 'deg',
    });
    expect(orthogonality.kind).toBe('success');
    if (orthogonality.kind === 'success') {
      expect(orthogonality.exactLatex).toBe('\\text{Orthogonal}');
      expect(orthogonality.approxText).toBeUndefined();
    }
    const gram = runVectorMode({
      operation: 'gramSchmidtUV',
      vectorA: [1, 1],
      vectorB: [1, 0],
      angleUnit: 'deg',
    });
    expect(gram.title).toBe('gram(u,v)');
    expect(gram.kind).toBe('success');
    if (gram.kind === 'success') {
      expect(gram.approxText).toBeUndefined();
      expect(gram.detailSections?.map((section) => section.title)).toContain('Gram-Schmidt Proof');
    }
  });

  it('keeps numeric Vector approximations but hides nonnumeric summaries', () => {
    const dot = runVectorMode({
      operation: 'dot',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    });
    expect(dot.kind).toBe('success');
    if (dot.kind === 'success') {
      expect(dot.approxText).toBe('32');
    }

    const gram = runVectorMode({
      operation: 'gramSchmidtUV',
      vectorA: [1, 1],
      vectorB: [1, 0],
      angleUnit: 'deg',
    });
    expect(gram.kind).toBe('success');
    if (gram.kind === 'success') {
      expect(gram.approxText).toBeUndefined();
    }
  });

  it('carries exact vector sidecars through OOE snapshots', () => {
    const snapshot = buildVectorOoeSnapshot({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [0.5, 3],
      exactVectorB: [
        { numerator: 1, denominator: 2 },
        { numerator: 3, denominator: 1 },
      ],
      angleUnit: 'deg',
      editorExpressionLatex: '\\operatorname{proj}_{u}\\left(\\begin{bmatrix}\\frac{1}{2}\\\\3\\end{bmatrix}\\right)',
      vectorOperandLatexA: 'u',
      vectorOperandLatexB: '\\begin{bmatrix}\\frac{1}{2}\\\\3\\end{bmatrix}',
    });

    expect(snapshot.request).toMatchObject({
      operation: 'projectionUofV',
      lengthA: 2,
      lengthB: 2,
      exactVectorB: [
        { numerator: 1, denominator: 2 },
        { numerator: 3, denominator: 1 },
      ],
    });

    const combinationSnapshot = buildVectorOoeSnapshot({
      operation: 'linearCombination',
      vectorA: [4, 11],
      vectorB: [6, 3],
      exactVectorA: [
        { numerator: 4, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      angleUnit: 'rad',
      editorExpressionLatex: '2p-\\frac{q}{3}',
      vectorOperandLatexA: '2p-\\frac{q}{3}',
    });
    expect(combinationSnapshot.request).toMatchObject({
      operation: 'linearCombination',
      exactVectorA: [
        { numerator: 4, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      editorExpressionLatex: '2p-\\frac{q}{3}',
    });
  });
});
