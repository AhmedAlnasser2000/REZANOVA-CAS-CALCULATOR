import { describe, expect, it } from 'vitest';
import { runMatrixLinearMapProfile } from './matrix-linear-map-profile';

function sectionLines(
  response: ReturnType<typeof runMatrixLinearMapProfile>,
  title: string,
) {
  return response.detailSections?.find((section) => section.title === title)?.lines ?? [];
}

describe('runMatrixLinearMapProfile', () => {
  it('profiles a singular square map with exact kernel, image, and invertibility facts', () => {
    const response = runMatrixLinearMapProfile({
      label: 'A',
      matrix: [[1, 1], [2, 2]],
    });

    expect(response.approxText).toBeUndefined();
    expect(response.answerRows?.rows.map((row) => row.latex)).toEqual([
      'A:\\mathbb{R}^{2}\\to\\mathbb{R}^{2}',
      '\\operatorname{rank}(A)=1',
      '\\operatorname{nullity}(A)=1',
    ]);
    expect(sectionLines(response, 'Kernel')).toContain(
      '\\ker(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}',
    );
    expect(sectionLines(response, 'Kernel')).toContain(
      '\\operatorname{one\\text{-}to\\text{-}one}(A)=\\text{No}',
    );
    expect(sectionLines(response, 'Image')).toContain(
      '\\operatorname{Im}(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\2\\end{bmatrix}\\right\\}',
    );
    expect(sectionLines(response, 'Image')).toContain('\\operatorname{onto}(A)=\\text{No}');
    expect(sectionLines(response, 'Invertibility')).toEqual([
      '\\det(A)=0',
      '\\operatorname{invertible}(A)=\\text{No}',
      'The determinant is zero, so the square matrix is not invertible.',
    ]);
    expect(response.detailSections?.at(-1)?.title).toBe('RREF Evidence');
  });

  it('distinguishes tall one-to-one and wide onto rectangular maps', () => {
    const tall = runMatrixLinearMapProfile({
      label: 'T',
      matrix: [[1, 0], [0, 1], [0, 0]],
    });
    expect(sectionLines(tall, 'Kernel')).toContain(
      '\\operatorname{one\\text{-}to\\text{-}one}(T)=\\text{Yes}',
    );
    expect(sectionLines(tall, 'Image')).toContain('\\operatorname{onto}(T)=\\text{No}');
    expect(sectionLines(tall, 'Invertibility')).toContain(
      'Invertibility is not applicable to rectangular matrices.',
    );

    const wide = runMatrixLinearMapProfile({
      label: 'W',
      matrix: [[1, 0, 0], [0, 1, 0]],
    });
    expect(sectionLines(wide, 'Kernel')).toContain(
      '\\operatorname{one\\text{-}to\\text{-}one}(W)=\\text{No}',
    );
    expect(sectionLines(wide, 'Image')).toContain('\\operatorname{onto}(W)=\\text{Yes}');
    expect(sectionLines(wide, 'Invertibility')).toContain(
      'Invertibility is not applicable to rectangular matrices.',
    );
  });

  it('profiles identity as one-to-one, onto, and invertible', () => {
    const response = runMatrixLinearMapProfile({
      label: 'I',
      matrix: [[1, 0], [0, 1]],
    });
    expect(sectionLines(response, 'Kernel')).toContain(
      '\\operatorname{one\\text{-}to\\text{-}one}(I)=\\text{Yes}',
    );
    expect(sectionLines(response, 'Image')).toContain('\\operatorname{onto}(I)=\\text{Yes}');
    expect(sectionLines(response, 'Invertibility')).toContain(
      '\\operatorname{invertible}(I)=\\text{Yes}',
    );
  });

  it('stops above the exact 6 by 6 profile limit', () => {
    expect(runMatrixLinearMapProfile({
      label: 'L',
      matrix: Array.from({ length: 7 }, () => [1]),
    })).toMatchObject({
      error: 'The exact matrix limit for linear-map profiles is 6 by 6.',
    });
  });
});
