import { describe, expect, it } from 'vitest';
import { runMatrixSpaceOperation } from './matrix-spaces';

describe('runMatrixSpaceOperation', () => {
  it('computes a null-space basis with rank-nullity proof cards', () => {
    const response = runMatrixSpaceOperation({
      kind: 'nullSpace',
      label: '\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix}',
      matrix: [[1, 1], [2, 2]],
    });

    expect(response.resultLatex).toBe(
      '\\operatorname{Null}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}',
    );
    expect(response.approxText).toBe('dimension 1');
    expect(response.detailSections?.map((section) => section.title)).toEqual([
      'Space Facts',
      'Null Space Proof',
    ]);
    expect(response.detailSections?.[0]?.lines).toContain(
      '\\operatorname{rank}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})=1',
    );
    expect(response.detailSections?.[0]?.lines).toContain(
      '\\operatorname{rank}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})+\\operatorname{nullity}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})=2',
    );
    expect(response.detailSections?.[1]?.lines).toContain(
      '\\operatorname{pivotColumns}(\\begin{bmatrix}1&1\\\\2&2\\end{bmatrix})=\\{1\\}',
    );
    expect(response.detailSections?.[1]?.lines).toContain(
      'Each free variable creates one basis vector for the homogeneous system.',
    );
  });

  it('computes a column-space basis from original pivot columns', () => {
    const response = runMatrixSpaceOperation({
      kind: 'columnSpace',
      label: 'A',
      matrix: [[1, 1], [2, 2]],
    });

    expect(response.resultLatex).toBe(
      '\\operatorname{Col}(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\2\\end{bmatrix}\\right\\}',
    );
    expect(response.approxText).toBe('dimension 1');
    expect(response.detailSections?.map((section) => section.title)).toEqual([
      'Space Facts',
      'Column Space Proof',
    ]);
    expect(response.detailSections?.[0]?.lines).toContain(
      '\\dim\\operatorname{Col}(A)=\\operatorname{rank}(A)=1',
    );
    expect(response.detailSections?.[1]?.lines).toContain(
      'The pivot columns of the original matrix form a basis for its column space.',
    );
  });

  it('uses exact sidecars for finite-decimal Matrix spaces', () => {
    const response = runMatrixSpaceOperation({
      kind: 'nullSpace',
      label: 'D',
      matrix: [[0.5, 1], [1, 2]],
      exactMatrix: [
        [{ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 1 }],
        [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
      ],
    });

    expect(response.resultLatex).toBe(
      '\\operatorname{Null}(D)=\\operatorname{span}\\left\\{\\begin{bmatrix}-2\\\\1\\end{bmatrix}\\right\\}',
    );
    expect(response.detailSections?.[1]?.lines).toContain(
      '\\operatorname{rref}(D)=\\begin{bmatrix}1 & 2\\\\0 & 0\\end{bmatrix}',
    );
  });

  it('returns controlled errors for non-exact decimal space input', () => {
    expect(runMatrixSpaceOperation({
      kind: 'nullSpace',
      label: 'A',
      matrix: [[0.5, 1]],
    }).error).toBe('Matrix spaces need exact Matrix entries in this move.');
  });
});
