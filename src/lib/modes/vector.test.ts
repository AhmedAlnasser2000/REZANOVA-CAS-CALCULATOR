import { describe, expect, it } from 'vitest';
import { buildVectorOoeSnapshot, runVectorMode } from './vector';

function detailMathValues(result: ReturnType<typeof runVectorMode>) {
  if (result.kind === 'prompt') return [];
  const values = [];
  for (const section of result.canonicalResult?.details ?? []) {
    for (const line of section.lines) {
      for (const part of line) {
        if (part.kind === 'math') values.push(part.math);
      }
    }
  }
  return values;
}

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

  it('presents variadic independence without nonnumeric approximation leakage', () => {
    const outcome = runVectorMode({
      operation: 'independent',
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorOperands: [[1, 0], [0, 1], [1, 1]],
      exactVectorOperands: [
        [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
        [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
      ],
      vectorOperandLatexList: ['p', 'q', 'r'],
      vectorOperandLatexA: 'p',
      vectorOperandLatexB: 'q',
      editorExpressionLatex: '\\operatorname{independent}\\left(p,q,r\\right)',
      angleUnit: 'rad',
    });

    expect(outcome).toMatchObject({
      kind: 'success',
      title: '\\operatorname{independent}\\left(p,q,r\\right)',
      exactLatex: '\\operatorname{independent}\\left(p,q,r\\right)=\\text{No}',
      approxText: undefined,
    });
    expect(outcome.kind === 'success' ? outcome.detailSections?.map((section) => section.title) : [])
      .toEqual(['Span Facts', 'Dependence Relation', 'RREF Evidence']);
    const document = outcome.kind === 'success' ? outcome.canonicalResult : undefined;
    expect(document?.version === 2
      ? document.primary
      : undefined).toMatchObject({
      kind: 'linear-independence',
      independent: false,
    });
    const detailValues = detailMathValues(outcome);
    expect(detailValues.find((value) => value.canonicalLatex === '2')?.mathJson).toBe(2);
    expect(detailValues.find((value) => value.canonicalLatex === '\\left\\{1,2\\right\\}')?.mathJson)
      .toEqual(['Set', 1, 2]);
    expect(detailValues.find((value) => value.canonicalLatex === '\\left\\{p,q\\right\\}')?.mathJson)
      .toEqual(['Set', 'p', 'q']);
    expect(detailValues.find((value) => value.canonicalLatex.startsWith('\\begin{bmatrix}1 & 0 & 1'))?.mathJson)
      .toBeDefined();
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

    const familySnapshot = buildVectorOoeSnapshot({
      operation: 'span',
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorOperands: [[1, 0], [0, 1], [1, 1]],
      exactVectorOperands: [
        [{ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 1 }],
        [{ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }],
      ],
      vectorOperandLatexList: ['p', 'q', 'r'],
      angleUnit: 'rad',
    });
    expect(familySnapshot.request).toMatchObject({
      operation: 'span',
      vectorOperands: [[1, 0], [0, 1], [1, 1]],
      vectorOperandLatexList: ['p', 'q', 'r'],
    });
  });
});
