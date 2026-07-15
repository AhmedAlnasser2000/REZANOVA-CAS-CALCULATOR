import { describe, expect, it } from 'vitest';
import { linearAlgebraCanonicalEvidenceForResponse } from './canonical-evidence';
import { runMatrixDefiniteness } from './matrix-definiteness';

describe('runMatrixDefiniteness', () => {
  it('classifies the positive-definite golden matrix from exact principal minors', () => {
    const result = runMatrixDefiniteness({
      label: 'A',
      matrix: [[2, -1], [-1, 2]],
    });

    expect(result.resultLatex).toBe('\\operatorname{definite}(A)=\\text{Positive definite}');
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'Exact Principal-Minor Evidence',
      'Classification Criterion',
    ]);
    expect(result.detailSections?.[0]?.lines).toContain(
      'Leading principal minors: \\begin{bmatrix}2\\\\3\\end{bmatrix}',
    );
    expect(result.detailSections?.[1]?.lines).toContain(
      'All 3 nonempty principal minors were evaluated exactly.',
    );
    expect(linearAlgebraCanonicalEvidenceForResponse(result).details).toHaveLength(3);
  });

  it('classifies the required symmetric indefinite matrix exactly', () => {
    const result = runMatrixDefiniteness({
      label: 'A',
      matrix: [[1, 2], [2, 1]],
    });

    expect(result.resultLatex).toBe('\\operatorname{definite}(A)=\\text{Indefinite}');
  });

  it('evaluates every principal minor at the exact 6 by 6 boundary', () => {
    const matrix = Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 6 }, (_, column) => (row === column ? row + 1 : 0)));
    const result = runMatrixDefiniteness({ label: 'D', matrix });

    expect(result.resultLatex).toBe('\\operatorname{definite}(D)=\\text{Positive definite}');
    expect(result.detailSections?.[1]?.lines).toContain(
      'All 63 nonempty principal minors were evaluated exactly.',
    );
  });

  it.each([
    [[[-2, 0], [0, -3]], 'Negative definite'],
    [[[1, 0], [0, 0]], 'Positive semidefinite'],
    [[[-1, 0], [0, 0]], 'Negative semidefinite'],
    [[[0, 0], [0, 0]], 'Positive and negative semidefinite'],
  ] as const)('classifies exact semidefinite and negative cases', (matrix, label) => {
    expect(runMatrixDefiniteness({ label: 'A', matrix: matrix.map((row) => [...row]) }).resultLatex)
      .toContain(`\\text{${label}}`);
  });

  it('reports exact nonsymmetry without applying a definiteness theorem', () => {
    const result = runMatrixDefiniteness({
      label: 'A',
      matrix: [[1, 2], [3, 4]],
    });

    expect(result.resultLatex).toBe('\\operatorname{definite}(A)=\\text{Nonsymmetric}');
    expect(result.detailSections?.[0]?.lines).toContain(
      'First unequal transposed entries: \\begin{bmatrix}2\\\\3\\end{bmatrix}',
    );
  });

  it('uses the tolerance-labelled Jacobi path for decimal matrices through 8 by 8', () => {
    const matrix = Array.from({ length: 8 }, (_, row) =>
      Array.from({ length: 8 }, (_, column) => (row === column ? row + 0.5 : 0)));
    const result = runMatrixDefiniteness({ label: 'D', matrix });

    expect(result.resultLatex).toBe('\\operatorname{definite}(D)=\\text{Positive definite}');
    expect(result.warnings).toContain(
      'Numerical definiteness is tolerance-based; inspect the displayed threshold near semidefinite boundaries.',
    );
    expect(result.detailSections?.[0]?.title).toBe('Tolerance-Labeled Spectral Evidence');
    expect(result.detailSections?.[0]?.lines.some((line) => line.startsWith('Automatic scale-aware tolerance: '))).toBe(true);
    expect(result.detailSections?.[0]?.lines.some((line) => line.startsWith('Jacobi eigenvalue estimates: '))).toBe(true);
  });

  it('uses the displayed tolerance for decimal nonsymmetry and semidefinite boundaries', () => {
    const nonsymmetric = runMatrixDefiniteness({
      label: 'A',
      matrix: [[1.5, 0.25], [0.5, 2.5]],
    });
    const semidefinite = runMatrixDefiniteness({
      label: 'A',
      matrix: [[1.5, 0], [0, 1e-12]],
    });

    expect(nonsymmetric.resultLatex).toContain('\\text{Nonsymmetric}');
    expect(nonsymmetric.detailSections?.[0]?.lines).toHaveLength(2);
    expect(semidefinite.resultLatex).toContain('\\text{Positive semidefinite}');
  });

  it('fails closed for rectangular matrices', () => {
    expect(runMatrixDefiniteness({ label: 'A', matrix: [[1, 0, 0], [0, 1, 0]] }).error)
      .toBe('definite(A) requires a square matrix.');
  });
});
