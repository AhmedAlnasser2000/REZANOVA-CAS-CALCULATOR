import { describe, expect, it } from 'vitest';
import { runMatrixMode } from './matrix';

function detailMathValues(result: ReturnType<typeof runMatrixMode>) {
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

describe('runMatrixMode', () => {
  it('uses editor expressions as Matrix result titles when present', () => {
    const expressionLatex = '\\det\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\right)';
    const result = runMatrixMode({
      operation: 'detA',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
      editorExpressionLatex: expressionLatex,
      matrixOperandLatexA: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
    });

    expect(result.title).toBe(expressionLatex);
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.approxText).toBeUndefined();
    expect(result.sourceMode).toBe('matrix');
  });

  it('labels Matrix basis operations for direct runs', () => {
    const result = runMatrixMode({
      operation: 'basisA',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('basis(A)');
    expect(result.kind).toBe('success');
  });

  it('labels and presents Matrix linear-map profiles directly', () => {
    const result = runMatrixMode({
      operation: 'profileA',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('profile(A)');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      const document = result.canonicalResult;
      expect(document?.version).toBe(2);
      expect(document?.version === 2 ? document.primary : undefined)
        .toMatchObject({
          kind: 'linear-map-profile',
          domainDimension: 2,
          codomainDimension: 2,
          rank: 1,
          nullity: 1,
        });
      expect(result.approxText).toBeUndefined();
      expect(result.detailSections?.map((section) => section.title)).toEqual([
        'Rank-Nullity Facts',
        'Kernel',
        'Image',
        'Invertibility',
        'RREF Evidence',
      ]);
    }
  });

  it('proves inline Matrix profile leaves from the owned exact matrix', () => {
    const matrixLatex = '\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}';
    const result = runMatrixMode({
      operation: 'profileA',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[5, 6], [7, 8]],
      matrixOperandLatexA: matrixLatex,
      editorExpressionLatex: `\\operatorname{profile}\\left(${matrixLatex}\\right)`,
    });

    expect(result.kind).toBe('success');
    const document = result.kind === 'success' ? result.canonicalResult : undefined;
    expect(document?.version === 2
      && document.primary?.kind === 'linear-map-profile'
      ? document.primary.operand.mathJson
      : undefined).toBeDefined();
    const detailValues = detailMathValues(result);
    expect(detailValues.find((value) => value.canonicalLatex === '1+1=2')?.mathJson)
      .toEqual(['Equal', ['Add', 1, 1], 2]);
    expect(detailValues.find((value) => value.canonicalLatex === '\\left\\{1\\right\\}')?.mathJson)
      .toEqual(['Set', 1]);
    expect(detailValues.find((value) => value.canonicalLatex.startsWith('\\left\\{\\begin{bmatrix}-1'))?.mathJson)
      .toBeDefined();
    expect(detailValues.find((value) => value.canonicalLatex.startsWith('\\begin{bmatrix}1 & 1'))?.mathJson)
      .toBeDefined();
  });

  it('uses editor expressions as Matrix coordinate titles', () => {
    const expressionLatex = '\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)';
    const result = runMatrixMode({
      operation: 'coordinatesA',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [7, 8]],
      coordinateVector: [5, 11],
      exactCoordinateVector: [
        { numerator: 5, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      editorExpressionLatex: expressionLatex,
      matrixOperandLatexA: 'A',
      coordinateVectorLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
    });

    expect(result.title).toBe(expressionLatex);
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('[\\begin{bmatrix}5\\\\11\\end{bmatrix}]_{A}=\\begin{bmatrix}1\\\\2\\end{bmatrix}');
    expect(result.detailSections?.map((section) => section.title)).toEqual(['Coordinate Facts', 'Coordinate Proof']);
  });

  it('labels change-of-basis runs with their conversion direction', () => {
    const result = runMatrixMode({
      operation: 'changeBasis',
      matrixA: [[1, 0], [0, 1]],
      matrixB: [[1, 1], [0, 1]],
    });

    expect(result.title).toBe('change(A,B)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('P_{B\\leftarrow A}=\\begin{bmatrix}1 & -1\\\\0 & 1\\end{bmatrix}');
    expect(result.detailSections?.[1]?.lines).toContain('P_{B\\leftarrow A}=B^{-1}A');
  });

  it('labels LU factorization runs directly', () => {
    const result = runMatrixMode({
      operation: 'luA',
      matrixA: [[2, 1], [4, 3]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('lu(A)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('A=LU');
    expect(result.approxText).toBeUndefined();
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'LU Factors',
      'Factorization Row Steps',
      'LU Proof',
    ]);
  });

  it('labels PLU factorization runs directly', () => {
    const result = runMatrixMode({
      operation: 'pluA',
      matrixA: [[0, 1], [1, 0]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('plu(A)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('PA=LU');
    expect(result.approxText).toBeUndefined();
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'PLU Factors',
      'PLU Row Swaps',
      'Factorization Row Steps',
      'PLU Proof',
    ]);
  });

  it('labels factor solve runs directly while carrying RHS readback', () => {
    const result = runMatrixMode({
      operation: 'luSolveA',
      matrixA: [[2, 1], [4, 3]],
      matrixB: [[5, 6], [7, 8]],
      systemRhs: [5, 11],
      exactSystemRhs: [
        { numerator: 5, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      systemRhsLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
    });

    expect(result.title).toBe('lusolve(A,b)');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('x=\\begin{bmatrix}2\\\\1\\end{bmatrix}');
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'LU Factors',
      'Factorization Row Steps',
      'Factor Solve Proof',
    ]);
  });

  it('labels multi-RHS solve runs directly', () => {
    const result = runMatrixMode({
      operation: 'multiRhsSolve',
      matrixA: [[1, 2], [3, 4]],
      matrixB: [[5, 6], [11, 14]],
    });

    expect(result.title).toBe('AX=B');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }
    expect(result.exactLatex).toBe('X=\\begin{bmatrix}1 & 2\\\\2 & 2\\end{bmatrix}');
    expect(result.detailSections?.[0]?.title).toBe('Multi-RHS Proof');
  });

  it('proves native Matrix-system facts without promoting display labels', () => {
    const unique = runMatrixMode({
      operation: 'linearSystem',
      matrixA: [[2, 1], [1, -1]],
      matrixB: [[1, 0], [0, 1]],
      systemRhs: [5, 1],
      systemForm: 'Ax=b',
    });
    const inconsistent = runMatrixMode({
      operation: 'linearSystem',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[1, 0], [0, 1]],
      systemRhs: [1, 3],
      systemForm: 'Ax=b',
    });
    const underdetermined = runMatrixMode({
      operation: 'linearSystem',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[1, 0], [0, 1]],
      systemRhs: [2, 4],
      systemForm: 'Ax=b',
    });

    const uniqueMath = detailMathValues(unique);
    expect(uniqueMath.find((value) => value.canonicalLatex.startsWith('\\begin{bmatrix}1 & 0 & 2'))?.mathJson)
      .toBeDefined();
    expect(detailMathValues(inconsistent).find((value) => value.canonicalLatex === '0=1')?.mathJson)
      .toBeDefined();
    expect(detailMathValues(underdetermined).filter((value) => value.canonicalLatex === '1'))
      .toEqual(expect.arrayContaining([expect.objectContaining({ mathJson: 1 })]));
  });

  it('labels QR runs directly', () => {
    const result = runMatrixMode({
      operation: 'qrA',
      matrixA: [[3, 0], [4, 5]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('qr(A)');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.detailSections?.[0]?.title).toBe('QR Factors');
    }
  });

  it('labels column projection runs directly', () => {
    const result = runMatrixMode({
      operation: 'columnProjectionA',
      matrixA: [[1, 0], [0, 1], [0, 0]],
      matrixB: [[5, 6], [7, 8]],
      systemRhs: [2, 3, 4],
    });

    expect(result.title).toBe('projCol(A,b)');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.detailSections?.[0]?.title).toBe('Column Projection Facts');
    }
  });

  it('labels least-squares runs directly', () => {
    const result = runMatrixMode({
      operation: 'leastSquaresA',
      matrixA: [[1, 0], [0, 1], [0, 0]],
      matrixB: [[5, 6], [7, 8]],
      systemRhs: [2, 3, 4],
    });

    expect(result.title).toBe('ls(A,b)');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.detailSections?.[0]?.title).toBe('Least-Squares Solution');
    }
  });

  it('labels diagonalization runs directly', () => {
    const result = runMatrixMode({
      operation: 'diagonalizeA',
      matrixA: [[2, 1], [1, 2]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('diag(A)');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.detailSections?.[0]?.title).toBe('Characteristic Polynomial');
      expect(result.detailSections?.[1]?.title).toBe('Diagonalization Factors');
    }
  });

  it('labels spectral power runs directly', () => {
    const result = runMatrixMode({
      operation: 'spectralPowerA',
      matrixA: [[2, 1], [1, 2]],
      matrixB: [[5, 6], [7, 8]],
      matrixPowerExponent: 3,
    });

    expect(result.title).toBe('mpow(A,n)');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.exactLatex).toBe('A^{3}=\\begin{bmatrix}14 & 13\\\\13 & 14\\end{bmatrix}');
      expect(result.detailSections?.[1]?.title).toBe('Power Factors');
    }
  });

  it('labels and proves definiteness runs directly', () => {
    const result = runMatrixMode({
      operation: 'definiteA',
      matrixA: [[2, -1], [-1, 2]],
      matrixB: [[5, 6], [7, 8]],
    });

    expect(result.title).toBe('definite(A)');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.canonicalResult?.version).toBe(2);
      expect(result.exactLatex).toBe('\\operatorname{definite}(A)=\\text{Positive definite}');
      expect(result.detailSections?.[0]?.title).toBe('Exact Principal-Minor Evidence');
      expect(detailMathValues(result)).toHaveLength(3);
    }
  });

  it('adds an explicit Equation action for deferred eigen polynomial roots', () => {
    const result = runMatrixMode({
      operation: 'eigenA',
      matrixA: [[0, -1], [1, 0]],
      matrixB: [[1, 0], [0, 1]],
    });

    expect(result).toMatchObject({
      kind: 'error',
      title: 'eigen(A)',
      error: 'Complex eigenvalue and eigenvector readback is deferred for Matrix V1.',
      actions: [{
        version: 2,
        kind: 'send',
        target: 'equation',
        math: {
          canonicalLatex: '\\lambda^{2}+1=0',
        },
      }],
    });
  });
});
