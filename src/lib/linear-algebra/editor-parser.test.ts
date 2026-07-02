import { describe, expect, it } from 'vitest';
import { parseLinearAlgebraEditorLatex } from './editor-parser';

function parsed(latex: string, mode?: 'matrix' | 'vector') {
  const result = parseLinearAlgebraEditorLatex(latex, { mode });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.expression;
}

describe('parseLinearAlgebraEditorLatex', () => {
  it('parses named Matrix operations and suffix operators', () => {
    expect(parsed('A+B', 'matrix')).toEqual({
      kind: 'binary',
      operator: 'add',
      left: { kind: 'named', name: 'A' },
      right: { kind: 'named', name: 'B' },
    });
    expect(parsed('A-B', 'matrix')).toMatchObject({ kind: 'binary', operator: 'subtract' });
    expect(parsed('A\\times B', 'matrix')).toMatchObject({ kind: 'binary', operator: 'multiply' });
    expect(parsed('AB', 'matrix')).toMatchObject({ kind: 'binary', operator: 'multiply' });
    expect(parsed('A^{\\mathsf{T}}', 'matrix')).toEqual({
      kind: 'unary',
      operator: 'transpose',
      value: { kind: 'named', name: 'A' },
    });
    expect(parsed('A^{-1}', 'matrix')).toEqual({
      kind: 'unary',
      operator: 'inverse',
      value: { kind: 'named', name: 'A' },
    });
    expect(parsed('\\det\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'determinant' });
    expect(parsed('\\operatorname{rank}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'rank' });
    expect(parsed('\\operatorname{rref}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'rref' });
    expect(parsed('\\operatorname{RREF}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'rref' });
  });

  it('parses named Vector operations with u/v labels', () => {
    expect(parsed('u+v', 'vector')).toMatchObject({ kind: 'binary', operator: 'add' });
    expect(parsed('u-v', 'vector')).toMatchObject({ kind: 'binary', operator: 'subtract' });
    expect(parsed('u\\cdot v', 'vector')).toMatchObject({ kind: 'binary', operator: 'dot' });
    expect(parsed('u\\times v', 'vector')).toMatchObject({ kind: 'binary', operator: 'cross' });
    expect(parsed('\\left\\lVert u\\right\\rVert', 'vector')).toEqual({
      kind: 'unary',
      operator: 'norm',
      value: { kind: 'named', name: 'u' },
    });
    expect(parsed('\\angle\\left(u,v\\right)', 'vector')).toEqual({
      kind: 'angle',
      left: { kind: 'named', name: 'u' },
      right: { kind: 'named', name: 'v' },
    });
    expect(parsed('\\operatorname{angle}\\left(u,v\\right)', 'vector')).toMatchObject({ kind: 'angle' });
  });

  it('parses inline bmatrix matrices and column vectors', () => {
    expect(parsed('\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}', 'matrix')).toEqual({
      kind: 'matrixLiteral',
      value: [[1, 2], [3, 4]],
      exactValue: [
        [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
        [{ numerator: 3, denominator: 1 }, { numerator: 4, denominator: 1 }],
      ],
    });
    expect(parsed('\\begin{bmatrix}1\\\\-2\\\\\\frac{3}{2}\\end{bmatrix}', 'vector')).toEqual({
      kind: 'vectorLiteral',
      value: [1, -2, 1.5],
      exactValue: [
        { numerator: 1, denominator: 1 },
        { numerator: -2, denominator: 1 },
        { numerator: 3, denominator: 2 },
      ],
    });
    expect(parsed('\\begin{bmatrix}0.125&\\frac{1.5}{3}\\\\-.25&1\\end{bmatrix}', 'matrix')).toMatchObject({
      kind: 'matrixLiteral',
      value: [[0.125, 0.5], [-0.25, 1]],
      exactValue: [
        [{ numerator: 1, denominator: 8 }, { numerator: 1, denominator: 2 }],
        [{ numerator: -1, denominator: 4 }, { numerator: 1, denominator: 1 }],
      ],
    });
    expect(parsed('\\det\\left(\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\right)', 'matrix')).toEqual({
      kind: 'unary',
      operator: 'determinant',
      value: {
        kind: 'matrixLiteral',
        value: [[1, 2], [3, 4]],
        exactValue: [
          [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
          [{ numerator: 3, denominator: 1 }, { numerator: 4, denominator: 1 }],
        ],
      },
    });
  });

  it('parses structured Matrix systems', () => {
    expect(parsed('Ax=\\begin{bmatrix}5\\\\11\\end{bmatrix}', 'matrix')).toEqual({
      kind: 'linearSystem',
      form: 'Ax=b',
      coefficients: { kind: 'named', name: 'A' },
      constants: {
        kind: 'vectorLiteral',
        value: [5, 11],
        exactValue: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
      },
    });
    expect(parsed(
      'A x + \\begin{bmatrix}-5\\\\-11\\end{bmatrix}=0',
      'matrix',
    )).toEqual({
      kind: 'linearSystem',
      form: 'Ax+b=0',
      coefficients: { kind: 'named', name: 'A' },
      constants: {
        kind: 'vectorLiteral',
        value: [5, 11],
        exactValue: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
      },
    });
  });

  it('returns controlled errors for empty, template, malformed, and unsupported forms', () => {
    expect(parseLinearAlgebraEditorLatex('', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'empty-expression',
    });
    expect(parseLinearAlgebraEditorLatex('\\begin{bmatrix}#0 & #?\\\\#? & #?\\end{bmatrix}', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'placeholder',
    });
    expect(parseLinearAlgebraEditorLatex('\\begin{bmatrix}1&2\\\\3\\end{bmatrix}', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'invalid-matrix-literal',
    });
    expect(parseLinearAlgebraEditorLatex('A=b', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'unsupported-equation-shape',
    });
  });
});
