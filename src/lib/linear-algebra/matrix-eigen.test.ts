import { describe, expect, it } from 'vitest';
import { analyzeMatrixEigen2x2, runMatrixEigen } from './matrix-eigen';

describe('matrix eigen analysis', () => {
  it('computes rational 2x2 eigenvalues and eigenspaces through the typed boundary', () => {
    const response = runMatrixEigen({
      label: 'A',
      matrix: [[2, 1], [1, 2]],
    });

    expect(response.resultLatex).toBe(
      '\\operatorname{eigen}(A)=\\left\\{\\lambda=3\\text{:}E_{3}=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\},\\lambda=1\\text{:}E_{1}=\\operatorname{span}\\left\\{\\begin{bmatrix}-1\\\\1\\end{bmatrix}\\right\\}\\right\\}',
    );
    expect(response.approxText).toBe('eigenvalues 3, 1');
    expect(response.detailSections?.map((section) => section.title)).toEqual([
      'Characteristic Polynomial',
      'How Eigenvalues Were Found',
      'Eigenspaces',
    ]);
    expect(response.detailSections?.[0]?.lines).toContain('\\lambda^{2}-4\\lambda+3=0');
    expect(response.detailSections?.[1]?.lines).toContain(
      'Matrix formed the characteristic polynomial, then Equation found the exact eigenvalues.',
    );
    expect(response.detailSections?.[2]?.lines).toContain(
      'E_{3}=\\operatorname{Null}(A-(3)I)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\}',
    );
  });

  it('preserves inline operand labels in characteristic and eigenspace cards', () => {
    const label = '\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}';
    const response = runMatrixEigen({
      label,
      matrix: [[2, 1], [1, 2]],
    });

    expect(response.resultLatex).toContain(`\\operatorname{eigen}(${label})=`);
    expect(response.detailSections?.[0]?.lines).toContain(`\\operatorname{tr}(${label})=4`);
    expect(response.detailSections?.[2]?.lines).toContain(
      `E_{3}=\\operatorname{Null}(${label}-(3)I)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}\\right\\}`,
    );
  });

  it('exposes repeated eigenvalue multiplicity for defective-case callers', () => {
    const analyzed = analyzeMatrixEigen2x2({
      label: 'J',
      matrix: [[2, 1], [0, 2]],
    });

    expect(analyzed.kind).toBe('success');
    if (analyzed.kind !== 'success') {
      return;
    }

    expect(analyzed.analysis.roots).toHaveLength(1);
    expect(analyzed.analysis.roots[0].eigenvalueLatex).toBe('2');
    expect(analyzed.analysis.roots[0].multiplicity).toBe(2);
    expect(analyzed.analysis.roots[0].basis).toHaveLength(1);
    expect(analyzed.analysis.roots[0].spaceLatex).toBe(
      '\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\0\\end{bmatrix}\\right\\}',
    );
  });

  it('stops complex eigenvalues with an explicit Equation handoff', () => {
    const response = runMatrixEigen({
      label: 'C',
      matrix: [[0, -1], [1, 0]],
    });

    expect(response.error).toBe('Complex eigenvalue and eigenvector readback is deferred for Matrix V1.');
    expect(response.handoffEquationLatex).toBe('\\lambda^{2}+1=0');
    expect(response.detailSections?.[0]?.title).toBe('Characteristic Polynomial');
    expect(response.detailSections?.[1]?.title).toBe('How Eigenvalues Were Found');
    expect(response.detailSections?.[1]?.lines).toContain(
      'Open the characteristic polynomial in Equation for roots outside Matrix V1 rational eigenvalue readback.',
    );
  });
});
