import { describe, expect, it } from 'vitest';
import { runMatrixInvertibility } from './matrix-invertibility';

describe('runMatrixInvertibility', () => {
  it('explains a nonsingular square matrix through determinant, rank, and nullity', () => {
    const response = runMatrixInvertibility({
      label: 'A',
      matrix: [[1, 2], [3, 4]],
    });

    expect(response.resultLatex).toBe('\\operatorname{invertible}(A)=\\text{Yes}');
    expect(response.approxText).toBe('det(A) = -2');
    expect(response.detailSections?.map((section) => section.title)).toEqual([
      'Invertibility Facts',
      'Invertibility Theorem',
    ]);
    expect(response.detailSections?.[0]?.lines).toContain('\\det(A)=-2');
    expect(response.detailSections?.[0]?.lines).toContain('\\operatorname{rank}(A)=2');
    expect(response.detailSections?.[0]?.lines).toContain('\\operatorname{nullity}(A)=0');
    expect(response.detailSections?.[1]?.lines).toContain(
      'Every column is a pivot. For every RHS b, this matrix times x equals b has exactly one solution.',
    );
  });

  it('explains a singular square matrix without claiming inverse existence', () => {
    const response = runMatrixInvertibility({
      label: 'S',
      matrix: [[1, 1], [2, 2]],
    });

    expect(response.resultLatex).toBe('\\operatorname{invertible}(S)=\\text{No}');
    expect(response.approxText).toBe('det(S) = 0');
    expect(response.detailSections?.[0]?.lines).toContain('\\operatorname{nullity}(S)=1');
    expect(response.detailSections?.[1]?.lines).toContain(
      'At least one column is free, so this matrix cannot have exactly one solution for every RHS b.',
    );
  });

  it('redirects rectangular matrices to rank-nullity guidance', () => {
    const response = runMatrixInvertibility({
      label: 'R',
      matrix: [[1, 2, 3], [4, 5, 6]],
    });

    expect(response.resultLatex).toBe('\\text{Invertibility applies only to square matrices}');
    expect(response.approxText).toBe('rank 2, nullity 1');
    expect(response.detailSections?.[0]?.title).toBe('Rank/Nullity Guidance');
    expect(response.detailSections?.[0]?.lines).toContain('\\operatorname{rank}(R)+\\operatorname{nullity}(R)=3');
    expect(response.detailSections?.[0]?.lines).toContain(
      'Invertibility is a square-matrix theorem. For rectangular matrices, use rank and nullity to understand the linear map instead.',
    );
  });

  it('uses exact sidecars for finite-decimal determinant facts', () => {
    const response = runMatrixInvertibility({
      label: 'D',
      matrix: [[0.5, 0], [0, 0.125]],
      exactMatrix: [
        [{ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 1 }],
        [{ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 8 }],
      ],
    });

    expect(response.resultLatex).toBe('\\operatorname{invertible}(D)=\\text{Yes}');
    expect(response.approxText).toBe('det(D) = \\frac{1}{16}');
    expect(response.detailSections?.[0]?.lines).toContain('\\det(D)=\\frac{1}{16}');
  });
});
