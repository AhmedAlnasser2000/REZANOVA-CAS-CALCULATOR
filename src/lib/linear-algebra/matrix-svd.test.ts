import { describe, expect, it } from 'vitest';
import { linearAlgebraCanonicalEvidenceForResponse } from './canonical-evidence';
import { runMatrixNumericDecomposition } from './matrix-svd';

describe('runMatrixNumericDecomposition', () => {
  it('computes the required rank-one pseudoinverse numerically', () => {
    const result = runMatrixNumericDecomposition({
      operation: 'pinv',
      label: 'A',
      matrix: [[3, 0], [4, 0]],
      approxDigits: 6,
    });

    expect(result.resultLatex).toBe(
      '\\operatorname{pinv}\\left(A\\right)\\approx \\begin{bmatrix}0.12 & 0.16\\\\0 & 0\\end{bmatrix}',
    );
    expect(result.warnings).toContain(
      'SVD, pseudoinverse, condition number, and numerical rank are approximate; inspect the displayed threshold.',
    );
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'SVD Diagnostics',
      'Pseudoinverse Check',
    ]);
    expect(result.detailSections?.[0]?.lines.some((line) => line.includes('Numerical rank:'))).toBe(true);
    expect(linearAlgebraCanonicalEvidenceForResponse(result).details).toHaveLength(6);
  });

  it('reports the required condition number and singular infinity', () => {
    const regular = runMatrixNumericDecomposition({
      operation: 'cond',
      label: 'A',
      matrix: [[3, 0], [0, 1]],
    });
    const singular = runMatrixNumericDecomposition({
      operation: 'cond',
      label: 'A',
      matrix: [[1, 0], [0, 0]],
    });

    expect(regular.resultLatex).toBe('\\operatorname{cond}\\left(A\\right)\\approx 3');
    expect(singular.resultLatex).toBe('\\operatorname{cond}\\left(A\\right)= \\infty');
    expect(linearAlgebraCanonicalEvidenceForResponse(singular).primary?.mathJson).toEqual([
      'Equal',
      ['InvisibleOperator', 'cond', ['Delimiter', 'A']],
      'PositiveInfinity',
    ]);
  });

  it('exposes bounded rectangular SVD factors, diagnostics, and reconstruction evidence', () => {
    const result = runMatrixNumericDecomposition({
      operation: 'svd',
      label: 'M',
      matrix: [[1, 2, 3], [4, 5, 6]],
      approxDigits: 5,
    });

    expect(result.resultLatex).toContain('\\operatorname{svd}\\left(M\\right)\\approx');
    expect(result.detailSections?.map((section) => section.title)).toEqual([
      'Numerical SVD Factors',
      'SVD Diagnostics',
      'Pseudoinverse Check',
    ]);
    expect(result.detailSections?.[0]?.lines.some((line) => line.includes('Frobenius reconstruction residual'))).toBe(true);
    expect(linearAlgebraCanonicalEvidenceForResponse(result).details).toHaveLength(10);
  });

  it('classifies numerical rank through the library threshold at the 8 by 8 boundary', () => {
    const matrix = Array.from({ length: 8 }, (_, row) =>
      Array.from({ length: 8 }, (_, column) => (row === column && row < 7 ? row + 1 : 0)));
    const result = runMatrixNumericDecomposition({
      operation: 'nrank',
      label: 'D',
      matrix,
    });

    expect(result.resultLatex).toBe('\\operatorname{nrank}\\left(D\\right)=7');
    expect(result.detailSections?.[0]?.lines.some((line) => line.includes('Automatic SVD threshold'))).toBe(true);
  });

  it('fails closed for incomplete and nonfinite matrices', () => {
    expect(runMatrixNumericDecomposition({
      operation: 'svd',
      label: 'A',
      matrix: [[1, 2], [3]],
    }).error).toBe('svd(A) needs a complete rectangular Matrix.');
    expect(runMatrixNumericDecomposition({
      operation: 'pinv',
      label: 'A',
      matrix: [[1, Number.POSITIVE_INFINITY]],
    }).error).toBe('pinv(A) needs finite real Matrix entries.');
  });
});
