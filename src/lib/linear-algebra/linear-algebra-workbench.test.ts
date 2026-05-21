import { describe, expect, it } from 'vitest';
import {
  buildMatrixNotationLatex,
  buildVectorNotationLatex,
} from './linear-algebra-workbench';

describe('linear-algebra-workbench', () => {
  it('builds matrix notation presets from current matrices', () => {
    const matrixA = [[1, 2], [3, 4]];
    const matrixB = [[5, 6], [7, 8]];

    expect(buildMatrixNotationLatex('matrixA', matrixA, matrixB)).toContain('\\begin{bmatrix}');
    expect(buildMatrixNotationLatex('detA', matrixA, matrixB)).toContain('\\det');
    expect(buildMatrixNotationLatex('transposeB', matrixA, matrixB)).toContain('^{\\mathsf{T}}');
    expect(buildMatrixNotationLatex('inverseA', matrixA, matrixB)).toContain('^{-1}');
    expect(buildMatrixNotationLatex('add', matrixA, matrixB)).toContain('+');
  });

  it('builds vector notation presets from current vectors', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [4, 5, 6];

    expect(buildVectorNotationLatex('vectorA', vectorA, vectorB)).toContain('\\begin{bmatrix}');
    expect(buildVectorNotationLatex('dot', vectorA, vectorB)).toContain('\\cdot');
    expect(buildVectorNotationLatex('cross', vectorA, vectorB)).toContain('\\times');
    expect(buildVectorNotationLatex('normA', vectorA, vectorB)).toContain('\\left\\|');
  });
});
