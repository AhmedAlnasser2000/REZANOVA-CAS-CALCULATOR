import { describe, expect, it } from 'vitest';
import { runVectorOperation } from './vector';

describe('runVectorOperation', () => {
  it('runs shipped numeric vector scalar and vector operations', () => {
    expect(runVectorOperation({
      operation: 'dot',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).resultLatex).toBe('32');
    expect(runVectorOperation({
      operation: 'cross',
      vectorA: [1, 0, 0],
      vectorB: [0, 1, 0],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}0\\\\0\\\\1\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'add',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}5\\\\7\\\\9\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'subtract',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}-3\\\\-3\\\\-3\\end{bmatrix}');
  });

  it('runs shipped numeric norm and angle operations', () => {
    const norm = runVectorOperation({
      operation: 'normA',
      vectorA: [3, 4],
      angleUnit: 'deg',
    });
    const angle = runVectorOperation({
      operation: 'angle',
      vectorA: [1, 0],
      vectorB: [0, 1],
      angleUnit: 'deg',
    });

    expect(norm.resultLatex).toBe('5');
    expect(norm.approxText).toBe('5');
    expect(angle.resultLatex).toBe('90^{\\circ}');
    expect(angle.approxText).toBe('90');
  });

  it('runs projection, orthogonal component, unit vector, and orthogonality readback', () => {
    expect(runVectorOperation({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [2, 3],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}2\\\\0\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'orthogonalToU',
      vectorA: [1, 0],
      vectorB: [2, 3],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}0\\\\3\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'unitA',
      vectorA: [3, 4],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}\\frac{3}{5}\\\\\\frac{4}{5}\\end{bmatrix}');
    const orthogonal = runVectorOperation({
      operation: 'orthogonalCheck',
      vectorA: [1, 0],
      vectorB: [0, 3],
      angleUnit: 'deg',
    });
    expect(orthogonal.resultLatex).toBe('\\text{Orthogonal}');
    expect(orthogonal.approxText).toBe('dot = 0');

    expect(runVectorOperation({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [0.5, 3],
      exactVectorB: [
        { numerator: 3, denominator: 1 },
        { numerator: 3, denominator: 1 },
      ],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}0.5\\\\0\\end{bmatrix}');
  });

  it('runs two-vector Gram-Schmidt with orthonormal and dependency details', () => {
    const independent = runVectorOperation({
      operation: 'gramSchmidtUV',
      vectorA: [1, 1],
      vectorB: [1, 0],
      angleUnit: 'deg',
    });
    expect(independent.resultLatex).toBe(
      '\\operatorname{orthogonal\\ basis}=\\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix},\\begin{bmatrix}\\frac{1}{2}\\\\-\\frac{1}{2}\\end{bmatrix}\\right\\}',
    );
    expect(independent.detailSections?.map((section) => section.title)).toEqual([
      'Orthonormal Basis',
      'Gram-Schmidt Proof',
    ]);
    const inlineSecond = runVectorOperation({
      operation: 'gramSchmidtUV',
      vectorA: [1, 1],
      vectorB: [1, 0],
      angleUnit: 'deg',
      vectorOperandLatexB: '\\begin{bmatrix}1\\\\0\\end{bmatrix}',
    });
    expect(inlineSecond.detailSections?.find((section) => section.title === 'Gram-Schmidt Proof')?.lines).toContain(
      'w_{2}=\\begin{bmatrix}1\\\\0\\end{bmatrix}-\\operatorname{proj}_{w_{1}}(\\begin{bmatrix}1\\\\0\\end{bmatrix})=\\begin{bmatrix}\\frac{1}{2}\\\\-\\frac{1}{2}\\end{bmatrix}',
    );

    const dependent = runVectorOperation({
      operation: 'gramSchmidtUV',
      vectorA: [1, 1],
      vectorB: [2, 2],
      angleUnit: 'deg',
    });
    expect(dependent.approxText).toBe('1 basis direction; dependent input skipped');
    expect(dependent.detailSections?.find((section) => section.title === 'Dependency Note')?.lines).toEqual([
      'The second vector has zero residual after projection, so it is dependent on the earlier basis vectors.',
    ]);
  });

  it('uses exact vector sidecars for finite-decimal projection and orthogonality readback', () => {
    expect(runVectorOperation({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [0.5, 3],
      exactVectorB: [
        { numerator: 1, denominator: 2 },
        { numerator: 3, denominator: 1 },
      ],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}\\frac{1}{2}\\\\0\\end{bmatrix}');

    const orthogonal = runVectorOperation({
      operation: 'orthogonalCheck',
      vectorA: [0.5, 1],
      vectorB: [2, -1],
      exactVectorA: [
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 1 },
      ],
      angleUnit: 'deg',
    });
    expect(orthogonal.resultLatex).toBe('\\text{Orthogonal}');
    expect(orthogonal.approxText).toBe('dot = 0');
  });

  it('falls back to numeric unit readback when the exact norm is irrational', () => {
    expect(runVectorOperation({
      operation: 'unitA',
      vectorA: [1, 1],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}0.707107\\\\0.707107\\end{bmatrix}');
  });

  it('stops on incomplete, mismatched, non-3D cross, and zero-vector angle requests', () => {
    expect(runVectorOperation({
      operation: 'normA',
      vectorA: [],
      vectorB: [],
      angleUnit: 'deg',
    }).error).toBe('Vector u is incomplete.');
    expect(runVectorOperation({
      operation: 'dot',
      vectorA: [1, 2],
      angleUnit: 'deg',
    }).error).toBe('Vector v is required for this operation.');
    expect(runVectorOperation({
      operation: 'dot',
      vectorA: [1, 2],
      vectorB: [1, 2, 3],
      angleUnit: 'deg',
    }).error).toBe('Vector dimensions must match.');
    expect(runVectorOperation({
      operation: 'cross',
      vectorA: [1, 2],
      vectorB: [3, 4],
      angleUnit: 'deg',
    }).error).toBe('Cross product requires 3D vectors.');
    expect(runVectorOperation({
      operation: 'angle',
      vectorA: [0, 0],
      vectorB: [1, 0],
      angleUnit: 'deg',
    }).error).toBe('Angle is undefined when one vector has zero length.');
    expect(runVectorOperation({
      operation: 'projectionUofV',
      vectorA: [0, 0],
      vectorB: [1, 0],
      angleUnit: 'deg',
    }).error).toBe('Projection needs a nonzero vector to project onto.');
    expect(runVectorOperation({
      operation: 'unitA',
      vectorA: [0, 0],
      angleUnit: 'deg',
    }).error).toBe('Unit vector is undefined for the zero vector.');
    expect(runVectorOperation({
      operation: 'gramSchmidtUV',
      vectorA: [0, 0],
      vectorB: [0, 0],
      angleUnit: 'deg',
    }).error).toBe('Gram-Schmidt needs at least one nonzero vector.');
    expect(runVectorOperation({
      operation: 'normA',
      vectorA: Array(9).fill(1),
      angleUnit: 'deg',
    }).error).toBe(
      'Vector inputs support up to 8 entries; received 9. Resize the vector before running.',
    );
  });
});
