import { describe, expect, it } from 'vitest';
import { runMatrixLinearMapProfile } from './matrix-linear-map-profile';

function sectionLines(
  response: ReturnType<typeof runMatrixLinearMapProfile>,
  title: string,
) {
  return response.detailSections?.find((section) => section.title === title)?.lines ?? [];
}

function section(
  response: ReturnType<typeof runMatrixLinearMapProfile>,
  title: string,
) {
  return response.detailSections?.find((candidate) => candidate.title === title);
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
    expect(sectionLines(response, 'Rank-Nullity Facts')).toEqual([
      'Rank-nullity: 1+1=2',
      'Pivot columns: \\left\\{1\\right\\}',
      'Rank counts independent output directions; nullity counts independent input directions that map to zero.',
    ]);
    expect(sectionLines(response, 'Kernel')).toContain(
      'Kernel spanning set: \\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}',
    );
    expect(sectionLines(response, 'Kernel')).toContain('One-to-one: no.');
    expect(sectionLines(response, 'Image')).toContain(
      'Image spanning set: \\left\\{\\begin{bmatrix}1\\\\2\\end{bmatrix}\\right\\}',
    );
    expect(sectionLines(response, 'Image')).toContain('Onto: no.');
    expect(sectionLines(response, 'Invertibility')).toEqual([
      'Determinant: 0',
      'Invertible: no.',
      'The determinant is zero, so the square matrix is not invertible.',
    ]);
    expect(section(response, 'Kernel')?.lineParts?.[0]).toEqual([
      { kind: 'text', text: 'Kernel spanning set: ' },
      { kind: 'math', latex: '\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}' },
    ]);
    expect(response.detailSections?.at(-1)?.title).toBe('RREF Evidence');
  });

  it('distinguishes tall one-to-one and wide onto rectangular maps', () => {
    const tall = runMatrixLinearMapProfile({
      label: 'T',
      matrix: [[1, 0], [0, 1], [0, 0]],
    });
    expect(sectionLines(tall, 'Kernel')).toContain('One-to-one: yes.');
    expect(sectionLines(tall, 'Kernel')).toContain('Kernel spanning set: \\varnothing');
    expect(sectionLines(tall, 'Image')).toContain('Onto: no.');
    expect(sectionLines(tall, 'Invertibility')).toContain(
      'Invertibility is not applicable to rectangular matrices.',
    );

    const wide = runMatrixLinearMapProfile({
      label: 'W',
      matrix: [[1, 0, 0], [0, 1, 0]],
    });
    expect(sectionLines(wide, 'Kernel')).toContain('One-to-one: no.');
    expect(sectionLines(wide, 'Image')).toContain('Onto: yes.');
    expect(sectionLines(wide, 'Invertibility')).toContain(
      'Invertibility is not applicable to rectangular matrices.',
    );
  });

  it('profiles identity as one-to-one, onto, and invertible', () => {
    const response = runMatrixLinearMapProfile({
      label: 'I',
      matrix: [[1, 0], [0, 1]],
    });
    expect(sectionLines(response, 'Kernel')).toContain('One-to-one: yes.');
    expect(sectionLines(response, 'Image')).toContain('Onto: yes.');
    expect(sectionLines(response, 'Invertibility')).toContain('Invertible: yes.');
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
