import { describe, expect, it } from 'vitest';
import { runMatrixOperation, solveLinearSystem } from './matrix';

describe('runMatrixOperation', () => {
  const matrixA = [[1, 2], [3, 4]];
  const matrixB = [[5, 6], [7, 8]];

  it('runs shipped numeric matrix arithmetic and transforms', () => {
    expect(runMatrixOperation({ operation: 'add', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}6 & 8\\\\10 & 12\\end{bmatrix}',
    );
    expect(runMatrixOperation({ operation: 'subtract', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}-4 & -4\\\\-4 & -4\\end{bmatrix}',
    );
    expect(runMatrixOperation({ operation: 'multiply', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}19 & 22\\\\43 & 50\\end{bmatrix}',
    );
    expect(runMatrixOperation({ operation: 'transposeA', matrixA, matrixB }).resultLatex).toBe(
      '\\begin{bmatrix}1 & 3\\\\2 & 4\\end{bmatrix}',
    );
  });

  it('runs shipped numeric determinant and inverse operations', () => {
    const determinant = runMatrixOperation({ operation: 'detA', matrixA, matrixB });
    const inverse = runMatrixOperation({ operation: 'inverseA', matrixA, matrixB });

    expect(determinant.resultLatex).toBe('-2');
    expect(determinant.approxText).toBe('-2');
    expect(inverse.resultLatex).toBe('\\begin{bmatrix}-2 & 1\\\\\\frac{3}{2} & -\\frac{1}{2}\\end{bmatrix}');
  });

  it('runs exact rank and RREF operations', () => {
    const rank = runMatrixOperation({
      operation: 'rankA',
      matrixA: [[1, 2], [2, 4]],
      matrixB,
    });
    const rref = runMatrixOperation({
      operation: 'rrefA',
      matrixA: [[1, 2], [2, 4]],
      matrixB,
    });

    expect(rank.resultLatex).toBe('1');
    expect(rank.approxText).toBe('1');
    expect(rref.resultLatex).toBe('\\begin{bmatrix}1 & 2\\\\0 & 0\\end{bmatrix}');
    expect(rref.detailSections).toEqual([{
      title: 'Row Reduction Steps',
      lines: ['R_{2}\\leftarrow R_{2}-2R_{1}'],
      lineKind: 'math',
    }]);
  });

  it('keeps rank and RREF off decimal grids without exact sidecars', () => {
    expect(runMatrixOperation({
      operation: 'rankA',
      matrixA: [[0.5, 1]],
      matrixB,
    }).error).toBe('Rank and RREF need exact Matrix entries in this move.');
  });

  it('keeps decimal Matrix inverse output on the numeric readback path', () => {
    const inverse = runMatrixOperation({
      operation: 'inverseA',
      matrixA: [[0.5, 0], [0, 2]],
      matrixB,
    });

    expect(inverse.resultLatex).toBe('\\begin{bmatrix}2 & 0\\\\0 & 0.5\\end{bmatrix}');
  });

  it('uses exact sidecars for editor-entered fractions and finite decimals', () => {
    const determinant = runMatrixOperation({
      operation: 'detA',
      matrixA: [[0.5, 0], [0, 1 / 3]],
      matrixB,
      exactMatrixA: [
        [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 3 }],
      ],
    });
    const rref = runMatrixOperation({
      operation: 'rrefA',
      matrixA: [[0.5, 1], [1, 2]],
      matrixB,
      exactMatrixA: [
        [{ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 1 }],
        [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
      ],
    });

    expect(determinant.resultLatex).toBe('\\frac{1}{6}');
    expect(rref.resultLatex).toBe('\\begin{bmatrix}1 & 2\\\\0 & 0\\end{bmatrix}');
  });

  it('computes Matrix null space and column space bases from RREF pivots', () => {
    const nullSpace = runMatrixOperation({
      operation: 'nullSpaceA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
    });
    const columnSpace = runMatrixOperation({
      operation: 'columnSpaceA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
    });

    expect(nullSpace.resultLatex).toBe(
      '\\operatorname{Null}(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}',
    );
    expect(nullSpace.approxText).toBe('dimension 1');
    expect(nullSpace.detailSections?.[0]?.lines).toContain('\\operatorname{nullity}(A)=1');
    expect(columnSpace.resultLatex).toBe(
      '\\operatorname{Col}(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\2\\end{bmatrix}\\right\\}',
    );
    expect(columnSpace.approxText).toBe('dimension 1');
    expect(columnSpace.detailSections?.[0]?.lines).toContain('\\dim\\operatorname{Col}(A)=\\operatorname{rank}(A)=1');
  });

  it('uses inline Matrix operand labels in space, invertibility, and eigen readback', () => {
    const singularLabel = '\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}';
    const nullSpace = runMatrixOperation({
      operation: 'nullSpaceA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
      matrixOperandLatexA: singularLabel,
    });

    expect(nullSpace.resultLatex).toBe(
      `\\operatorname{Null}(${singularLabel})=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}`,
    );
    expect(nullSpace.detailSections?.[0]?.lines).toContain(`\\operatorname{rank}(${singularLabel})=1`);

    const invertibleLabel = '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}';
    const invertible = runMatrixOperation({
      operation: 'invertibilityA',
      matrixA,
      matrixB,
      matrixOperandLatexA: invertibleLabel,
    });

    expect(invertible.resultLatex).toBe(`\\operatorname{invertible}(${invertibleLabel})=\\text{Yes}`);
    expect(invertible.detailSections?.[0]?.lines).toContain(`\\det(${invertibleLabel})=-2`);

    const eigenLabel = '\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}';
    const eigen = runMatrixOperation({
      operation: 'eigenA',
      matrixA: [[2, 1], [1, 2]],
      matrixB,
      matrixOperandLatexA: eigenLabel,
    });

    expect(eigen.resultLatex).toContain(`\\operatorname{eigen}(${eigenLabel})=`);
    expect(eigen.detailSections?.[0]?.lines).toContain(`\\operatorname{tr}(${eigenLabel})=4`);
    expect(eigen.detailSections?.[2]?.lines).toContain(
      `E_{3}=\\operatorname{Null}(${eigenLabel}-3I)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\}`,
    );
  });

  it('reports zero-subspace Matrix spaces cleanly', () => {
    const nullSpace = runMatrixOperation({
      operation: 'nullSpaceA',
      matrixA: [[1, 0], [0, 1]],
      matrixB,
    });
    const columnSpace = runMatrixOperation({
      operation: 'columnSpaceA',
      matrixA: [[0, 0], [0, 0]],
      matrixB,
    });

    expect(nullSpace.resultLatex).toBe('\\operatorname{Null}(A)=\\{0\\}');
    expect(columnSpace.resultLatex).toBe('\\operatorname{Col}(A)=\\{0\\}');
  });

  it('validates whether matrix columns form a basis', () => {
    const basis = runMatrixOperation({
      operation: 'basisA',
      matrixA,
      matrixB,
    });
    const singular = runMatrixOperation({
      operation: 'basisA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
    });
    const rectangular = runMatrixOperation({
      operation: 'basisA',
      matrixA: [[1, 2, 3], [4, 5, 6]],
      matrixB,
    });

    expect(basis.resultLatex).toBe('\\operatorname{basis}(A)=\\text{Yes}');
    expect(basis.approxText).toBe('det(A) = -2');
    expect(basis.detailSections?.map((section) => section.title)).toEqual(['Basis Facts', 'Basis Proof']);
    expect(basis.detailSections?.[0]?.lines).toContain('\\operatorname{pivot\\ columns}=\\{1, 2\\}');
    expect(basis.detailSections?.[1]?.lines).toContain(
      'The matrix is square and every column is a pivot, so its columns form a basis for \\mathbb{R}^{2}.',
    );

    expect(singular.resultLatex).toBe('\\operatorname{basis}(A)=\\text{No}');
    expect(singular.approxText).toBe('det(A) = 0');
    expect(singular.detailSections?.[0]?.lines).toContain('\\operatorname{rank}(A)=1');
    expect(singular.detailSections?.[1]?.lines).toContain(
      'The matrix is square, but at least one column is not a pivot, so the columns are dependent and do not form a basis.',
    );

    expect(rectangular.resultLatex).toBe('\\operatorname{basis}(A)=\\text{No}');
    expect(rectangular.approxText).toBe('rank 2, 3 column vectors in R^2');
    expect(rectangular.detailSections?.[1]?.lines).toContain(
      'A basis for \\mathbb{R}^{2} needs exactly 2 independent vectors. This matrix has 3 column vectors and rank 2.',
    );
  });

  it('uses inline Matrix operand labels in basis readback', () => {
    const label = '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}';
    const basis = runMatrixOperation({
      operation: 'basisA',
      matrixA,
      matrixB,
      matrixOperandLatexA: label,
    });

    expect(basis.resultLatex).toBe(`\\operatorname{basis}(${label})=\\text{Yes}`);
    expect(basis.detailSections?.[0]?.lines).toContain(`\\operatorname{rank}(${label})=2`);
  });

  it('computes exact coordinates of a vector in a basis matrix', () => {
    const coordinates = runMatrixOperation({
      operation: 'coordinatesA',
      matrixA,
      matrixB,
      coordinateVector: [5, 11],
      exactCoordinateVector: [
        { numerator: 5, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      coordinateVectorLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
    });

    expect(coordinates.resultLatex).toBe('[\\begin{bmatrix}5\\\\11\\end{bmatrix}]_{A}=\\begin{bmatrix}1\\\\2\\end{bmatrix}');
    expect(coordinates.approxText).toBe('2 coordinates');
    expect(coordinates.detailSections?.map((section) => section.title)).toEqual(['Coordinate Facts', 'Coordinate Proof']);
    expect(coordinates.detailSections?.[0]?.lines).toContain('\\det(A)=-2');
    expect(coordinates.detailSections?.[1]?.lines).toContain('Ac=\\begin{bmatrix}5\\\\11\\end{bmatrix}');
    expect(coordinates.detailSections?.[1]?.lines).toContain(
      '\\operatorname{rref}\\left([A|\\begin{bmatrix}5\\\\11\\end{bmatrix}]\\right)=\\begin{bmatrix}1 & 0 & 1\\\\0 & 1 & 2\\end{bmatrix}',
    );
    expect(coordinates.detailSections?.[1]?.lines).toContain(
      'The basis matrix has one pivot in every column, so the coordinate vector is unique.',
    );
  });

  it('stops coordinates on non-basis matrices with proof cards', () => {
    const coordinates = runMatrixOperation({
      operation: 'coordinatesA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
      coordinateVector: [2, 4],
    });

    expect(coordinates.error).toBe('Coordinates need a square full-rank basis matrix. Run basis(...) to inspect this matrix.');
    expect(coordinates.detailSections?.map((section) => section.title)).toEqual(['Coordinate Facts', 'Coordinate Proof']);
    expect(coordinates.detailSections?.[0]?.lines).toContain('\\operatorname{rank}(A)=1');
    expect(coordinates.detailSections?.[1]?.lines).toContain(
      'At least one column is not a pivot, so the columns do not form a basis. Coordinates are only unique when the basis matrix has one pivot in every column.',
    );
  });

  it('computes exact change-of-basis matrices with direction readback', () => {
    const change = runMatrixOperation({
      operation: 'changeBasis',
      matrixA: [[1, 0], [0, 1]],
      matrixB: [[1, 1], [0, 1]],
    });

    expect(change.resultLatex).toBe('P_{B\\leftarrow A}=\\begin{bmatrix}1 & -1\\\\0 & 1\\end{bmatrix}');
    expect(change.approxText).toBe('2 by 2 coordinate conversion');
    expect(change.detailSections?.map((section) => section.title)).toEqual([
      'Change-of-Basis Facts',
      'Change-of-Basis Proof',
    ]);
    expect(change.detailSections?.[0]?.lines).toContain('\\det(A)=1');
    expect(change.detailSections?.[0]?.lines).toContain('\\det(B)=1');
    expect(change.detailSections?.[1]?.lines).toContain('P_{B\\leftarrow A}=B^{-1}A');
    expect(change.detailSections?.[1]?.lines).toContain(
      '\\text{If }[v]_{A}\\text{ is known, then }[v]_{B}=P_{B\\leftarrow A}[v]_{A}.',
    );
  });

  it('stops change of basis on non-basis operands with proof cards', () => {
    const change = runMatrixOperation({
      operation: 'changeBasis',
      matrixA: [[1, 0], [0, 1]],
      matrixB: [[1, 1], [2, 2]],
    });

    expect(change.error).toBe('Change of basis needs two square full-rank basis matrices. Run basis(...) to inspect the target matrix.');
    expect(change.detailSections?.map((section) => section.title)).toEqual([
      'Change-of-Basis Facts',
      'Change-of-Basis Proof',
    ]);
    expect(change.detailSections?.[0]?.lines).toContain('\\operatorname{rank}(B)=1');
    expect(change.detailSections?.[1]?.lines).toContain(
      'At least one column is not a pivot, so this matrix is not a basis and cannot define unique coordinate conversion.',
    );
  });

  it('explains invertibility theorem facts for square matrices', () => {
    const invertible = runMatrixOperation({
      operation: 'invertibilityA',
      matrixA,
      matrixB,
    });
    const singular = runMatrixOperation({
      operation: 'invertibilityA',
      matrixA: [[1, 1], [2, 2]],
      matrixB,
    });

    expect(invertible.resultLatex).toBe('\\operatorname{invertible}(A)=\\text{Yes}');
    expect(invertible.approxText).toBe('det(A) = -2');
    expect(invertible.detailSections?.[0]?.lines).toContain('\\det(A)=-2');
    expect(invertible.detailSections?.[0]?.lines).toContain('\\operatorname{rank}(A)=2');
    expect(invertible.detailSections?.[1]?.lines).toContain(
      'Every column is a pivot. For every RHS b, this matrix times x equals b has exactly one solution.',
    );

    expect(singular.resultLatex).toBe('\\operatorname{invertible}(A)=\\text{No}');
    expect(singular.approxText).toBe('det(A) = 0');
    expect(singular.detailSections?.[0]?.lines).toContain('\\operatorname{nullity}(A)=1');
    expect(singular.detailSections?.[1]?.lines).toContain(
      'At least one column is free, so this matrix cannot have exactly one solution for every RHS b.',
    );
  });

  it('redirects rectangular invertibility requests to rank/nullity guidance', () => {
    const response = runMatrixOperation({
      operation: 'invertibilityA',
      matrixA: [[1, 2, 3], [4, 5, 6]],
      matrixB,
    });

    expect(response.resultLatex).toBe('\\text{Invertibility applies only to square matrices}');
    expect(response.approxText).toBe('rank 2, nullity 1');
    expect(response.detailSections?.[0]?.title).toBe('Rank/Nullity Guidance');
    expect(response.detailSections?.[0]?.lines).toContain('\\operatorname{rank}(A)+\\operatorname{nullity}(A)=3');
  });

  it('computes 2x2 rational eigenvalues and eigenspaces through the typed Equation boundary', () => {
    const response = runMatrixOperation({
      operation: 'eigenA',
      matrixA: [[2, 1], [1, 2]],
      matrixB,
    });

    expect(response.resultLatex).toBe(
      '\\operatorname{eigen}(A)=\\left\\{\\lambda=3:E_{3}=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\},\\lambda=1:E_{1}=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}\\right\\}',
    );
    expect(response.approxText).toBe('eigenvalues 3, 1');
    expect(response.detailSections?.[0]?.lines).toContain('\\lambda^{2}-4\\lambda+3=0');
    expect(response.detailSections?.[1]?.title).toBe('How Eigenvalues Were Found');
    expect(response.detailSections?.[1]?.lines).toContain(
      'Matrix formed the characteristic polynomial, then Equation found the exact eigenvalues.',
    );
    expect(response.detailSections?.[1]?.lines).toContain(
      'Matrix used those rational eigenvalues to compute the eigenspaces locally.',
    );
    expect(response.detailSections?.[2]?.lines).toContain(
      'E_{3}=\\operatorname{Null}(A-3I)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\}',
    );
  });

  it('hands deferred irrational and complex eigenvalue cases to Equation explicitly', () => {
    const irrational = runMatrixOperation({
      operation: 'eigenA',
      matrixA: [[0, 2], [1, 0]],
      matrixB,
    });
    const complex = runMatrixOperation({
      operation: 'eigenA',
      matrixA: [[0, -1], [1, 0]],
      matrixB,
    });

    expect(irrational).toMatchObject({
      error: 'Irrational eigenvalue vector readback is deferred for Matrix V1.',
      handoffEquationLatex: '\\lambda^{2}-2=0',
    });
    expect(irrational.detailSections?.[1]?.title).toBe('How Eigenvalues Were Found');
    expect(irrational.detailSections?.[1]?.lines).toContain(
      'Matrix formed \\lambda^{2}-2=0 from the characteristic polynomial.',
    );
    expect(complex).toMatchObject({
      error: 'Complex eigenvalue and eigenvector readback is deferred for Matrix V1.',
      handoffEquationLatex: '\\lambda^{2}+1=0',
    });
  });

  it('stops on incomplete, mismatched, singular, and non-square requests', () => {
    expect(runMatrixOperation({ operation: 'add', matrixA: [], matrixB }).error).toBe(
      'Matrix A is incomplete.',
    );
    expect(runMatrixOperation({
      operation: 'add',
      matrixA,
      matrixB: [[1, 2, 3]],
    }).error).toBe('Addition and subtraction require matching matrix dimensions.');
    expect(runMatrixOperation({
      operation: 'multiply',
      matrixA,
      matrixB: [[1, 2]],
    }).error).toBe('Matrix multiplication requires A columns to match B rows.');
    expect(runMatrixOperation({
      operation: 'detA',
      matrixA: [[1, 2, 3], [4, 5, 6]],
      matrixB,
    }).error).toBe('det(A) requires a square matrix.');
    expect(runMatrixOperation({
      operation: 'inverseA',
      matrixA: [[1, 2], [2, 4]],
      matrixB,
    }).error).toBe('Matrix A is singular or not square.');
  });
});

describe('solveLinearSystem', () => {
  it('solves current numeric square systems', () => {
    expect(solveLinearSystem([[2, 1], [1, -1]], [5, 1])).toEqual([2, 1]);
  });

  it('returns null for incomplete or singular numeric systems', () => {
    expect(solveLinearSystem([[1, 2]], [1, 2])).toBeNull();
    expect(solveLinearSystem([[1, 2], [2, 4]], [3, 6])).toBeNull();
  });
});
