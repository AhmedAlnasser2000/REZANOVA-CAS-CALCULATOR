import { describe, expect, it } from 'vitest';
import {
  parseLinearAlgebraEditorLatex,
  type LinearAlgebraEditorParseOptions,
} from './editor-parser';

function parsed(latex: string, mode?: 'matrix' | 'vector') {
  const result = parseLinearAlgebraEditorLatex(latex, { mode });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.expression;
}

function parsedWithOptions(latex: string, options: LinearAlgebraEditorParseOptions) {
  const result = parseLinearAlgebraEditorLatex(latex, options);
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
      left: { kind: 'named', name: 'A', displayLatex: 'A' },
      right: { kind: 'named', name: 'B', displayLatex: 'B' },
    });
    expect(parsed('A-B', 'matrix')).toMatchObject({ kind: 'binary', operator: 'subtract' });
    expect(parsed('A\\times B', 'matrix')).toMatchObject({ kind: 'binary', operator: 'multiply' });
    expect(parsed('AB', 'matrix')).toMatchObject({ kind: 'binary', operator: 'multiply' });
    expect(parsed('A^{\\mathsf{T}}', 'matrix')).toEqual({
      kind: 'unary',
      operator: 'transpose',
      value: { kind: 'named', name: 'A', displayLatex: 'A' },
    });
    expect(parsed('A^{-1}', 'matrix')).toEqual({
      kind: 'unary',
      operator: 'inverse',
      value: { kind: 'named', name: 'A', displayLatex: 'A' },
    });
    expect(parsed('\\det\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'determinant' });
    expect(parsed('\\operatorname{rank}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'rank' });
    expect(parsed('\\operatorname{rref}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'rref' });
    expect(parsed('\\operatorname{RREF}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'rref' });
    expect(parsed('\\operatorname{null}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'nullSpace' });
    expect(parsed('\\operatorname{col}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'columnSpace' });
    expect(parsed('\\operatorname{basis}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'basis' });
    expect(parsed('\\operatorname{lu}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'lu' });
    expect(parsed('\\operatorname{LU}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'lu' });
    expect(parsed('\\operatorname{plu}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'plu' });
    expect(parsed('\\operatorname{PLU}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'plu' });
    expect(parsed('\\operatorname{qr}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'qr' });
    expect(parsed('\\operatorname{QR}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'qr' });
    expect(parsed('\\operatorname{lusolve}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', 'matrix')).toEqual({
      kind: 'factorSolve',
      method: 'lu',
      matrix: { kind: 'named', name: 'A', displayLatex: 'A' },
      vector: {
        kind: 'vectorLiteral',
        value: [5, 11],
        exactValue: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        displayLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
    });
    expect(parsed('\\operatorname{plusolve}\\left(B,\\begin{bmatrix}3\\\\4\\end{bmatrix}\\right)', 'matrix')).toMatchObject({
      kind: 'factorSolve',
      method: 'plu',
    });
    expect(parsed('\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', 'matrix')).toEqual({
      kind: 'coordinates',
      basis: { kind: 'named', name: 'A', displayLatex: 'A' },
      vector: {
        kind: 'vectorLiteral',
        value: [5, 11],
        exactValue: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        displayLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
    });
    expect(parsed('\\operatorname{coord}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', 'matrix')).toMatchObject({
      kind: 'coordinates',
    });
    expect(parsed('\\operatorname{projcol}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', 'matrix')).toMatchObject({
      kind: 'columnProjection',
      matrix: { kind: 'named', name: 'A' },
      vector: { kind: 'vectorLiteral', value: [5, 11] },
    });
    expect(parsed('\\operatorname{ls}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', 'matrix')).toMatchObject({
      kind: 'leastSquares',
      matrix: { kind: 'named', name: 'A' },
      vector: { kind: 'vectorLiteral', value: [5, 11] },
    });
    expect(parsed('\\operatorname{change}\\left(A,B\\right)', 'matrix')).toEqual({
      kind: 'changeOfBasis',
      source: { kind: 'named', name: 'A', displayLatex: 'A' },
      target: { kind: 'named', name: 'B', displayLatex: 'B' },
    });
    expect(parsed('\\operatorname{changebasis}\\left(A,B\\right)', 'matrix')).toMatchObject({
      kind: 'changeOfBasis',
    });
    expect(parsed('\\operatorname{invertible}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'invertibility' });
    expect(parsed('\\operatorname{eigen}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'eigen' });
    expect(parsed('\\operatorname{diag}\\left(A\\right)', 'matrix')).toMatchObject({ kind: 'unary', operator: 'diagonalization' });
    expect(parsed('\\operatorname{mpow}\\left(A,3\\right)', 'matrix')).toMatchObject({
      kind: 'matrixPower',
      matrix: { kind: 'named', name: 'A' },
      exponent: 3,
      exponentLatex: '3',
    });
  });

  it('parses configured single-letter Matrix and Vector names', () => {
    expect(parsedWithOptions('C+D', {
      mode: 'matrix',
      matrixNamedValues: ['A', 'B', 'C', 'D'],
    })).toEqual({
      kind: 'binary',
      operator: 'add',
      left: { kind: 'named', name: 'C', displayLatex: 'C' },
      right: { kind: 'named', name: 'D', displayLatex: 'D' },
    });
    expect(parsedWithOptions('CD', {
      mode: 'matrix',
      matrixNamedValues: ['A', 'B', 'C', 'D'],
    })).toMatchObject({
      kind: 'binary',
      operator: 'multiply',
      left: { kind: 'named', name: 'C' },
      right: { kind: 'named', name: 'D' },
    });
    expect(parsedWithOptions('Cx=\\begin{bmatrix}5\\\\11\\end{bmatrix}', {
      mode: 'matrix',
      matrixNamedValues: ['A', 'B', 'C'],
    })).toMatchObject({
      kind: 'linearSystem',
      coefficients: { kind: 'named', name: 'C' },
      constants: { kind: 'vectorLiteral', value: [5, 11] },
    });
    expect(parsedWithOptions('p\\cdot q', {
      mode: 'vector',
      vectorNamedValues: ['u', 'v', 'p', 'q'],
    })).toEqual({
      kind: 'binary',
      operator: 'dot',
      left: { kind: 'named', name: 'p', displayLatex: 'p' },
      right: { kind: 'named', name: 'q', displayLatex: 'q' },
    });
    expect(parseLinearAlgebraEditorLatex('C+D', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'unsupported-expression',
    });
  });

  it('parses named Vector operations with u/v labels', () => {
    expect(parsed('u+v', 'vector')).toMatchObject({ kind: 'binary', operator: 'add' });
    expect(parsed('u-v', 'vector')).toMatchObject({ kind: 'binary', operator: 'subtract' });
    expect(parsed('u\\cdot v', 'vector')).toMatchObject({ kind: 'binary', operator: 'dot' });
    expect(parsed('u\\times v', 'vector')).toMatchObject({ kind: 'binary', operator: 'cross' });
    expect(parsed('\\left\\lVert u\\right\\rVert', 'vector')).toEqual({
      kind: 'unary',
      operator: 'norm',
      value: { kind: 'named', name: 'u', displayLatex: 'u' },
    });
    expect(parsedWithOptions('\\left\\lVert p-q\\right\\rVert', {
      mode: 'vector',
      vectorNamedValues: ['u', 'v', 'p', 'q'],
    })).toMatchObject({
      kind: 'unary',
      operator: 'norm',
      value: { kind: 'binary', operator: 'subtract' },
    });
    expect(parsed('\\angle\\left(u,v\\right)', 'vector')).toEqual({
      kind: 'angle',
      left: { kind: 'named', name: 'u', displayLatex: 'u' },
      right: { kind: 'named', name: 'v', displayLatex: 'v' },
    });
    expect(parsed('\\operatorname{angle}\\left(u,v\\right)', 'vector')).toMatchObject({ kind: 'angle' });
    expect(parsed('\\operatorname{proj}_{u}\\left(v\\right)', 'vector')).toEqual({
      kind: 'unary',
      operator: 'projectionOntoU',
      value: { kind: 'named', name: 'v', displayLatex: 'v' },
    });
    expect(parsed('\\operatorname{proj}_{v}\\left(u\\right)', 'vector')).toMatchObject({
      kind: 'unary',
      operator: 'projectionOntoV',
    });
    expect(parsed('\\operatorname{orth}_{u}\\left(v\\right)', 'vector')).toMatchObject({
      kind: 'unary',
      operator: 'orthogonalComponentToU',
    });
    expect(parsed('\\operatorname{unit}\\left(u\\right)', 'vector')).toMatchObject({
      kind: 'unary',
      operator: 'unit',
    });
    expect(parsed('\\operatorname{orthogonal}\\left(u,v\\right)', 'vector')).toEqual({
      kind: 'orthogonality',
      left: { kind: 'named', name: 'u', displayLatex: 'u' },
      right: { kind: 'named', name: 'v', displayLatex: 'v' },
    });
    expect(parsed('\\operatorname{gram}\\left(u,v\\right)', 'vector')).toEqual({
      kind: 'gramSchmidt',
      left: { kind: 'named', name: 'u', displayLatex: 'u' },
      right: { kind: 'named', name: 'v', displayLatex: 'v' },
    });
    expect(parsed('\\operatorname{proj}\\left(u,v\\right)', 'vector')).toEqual({
      kind: 'projection',
      base: { kind: 'named', name: 'u', displayLatex: 'u' },
      target: { kind: 'named', name: 'v', displayLatex: 'v' },
    });
    expect(parsed('\\operatorname{cross}\\left(u,v\\right)', 'vector')).toEqual({
      kind: 'binary',
      operator: 'cross',
      left: { kind: 'named', name: 'u', displayLatex: 'u' },
      right: { kind: 'named', name: 'v', displayLatex: 'v' },
    });
    expect(parsedWithOptions('\\operatorname{triple}\\left(u,v,w\\right)', {
      mode: 'vector',
      vectorNamedValues: ['u', 'v', 'w'],
    })).toEqual({
      kind: 'scalarTripleProduct',
      first: { kind: 'named', name: 'u', displayLatex: 'u' },
      second: { kind: 'named', name: 'v', displayLatex: 'v' },
      third: { kind: 'named', name: 'w', displayLatex: 'w' },
    });
  });

  it('parses exact scalar/vector combinations with natural precedence', () => {
    const options = {
      mode: 'vector' as const,
      vectorNamedValues: ['u', 'v', 'p', 'q'],
    };
    expect(parsedWithOptions('2p-q/3', options)).toMatchObject({
      kind: 'binary',
      operator: 'subtract',
      left: {
        kind: 'scale',
        scalar: { exactValue: { numerator: 2, denominator: 1 } },
        vector: { kind: 'named', name: 'p' },
      },
      right: {
        kind: 'vectorDivide',
        vector: { kind: 'named', name: 'q' },
        scalar: { exactValue: { numerator: 3, denominator: 1 } },
      },
    });
    expect(parsedWithOptions('-p', options)).toMatchObject({
      kind: 'negate',
      value: { kind: 'named', name: 'p' },
    });
    expect(parsedWithOptions('\\frac{1}{2}(p+q)', options)).toMatchObject({
      kind: 'scale',
      scalar: { exactValue: { numerator: 1, denominator: 2 } },
      vector: { kind: 'binary', operator: 'add' },
    });
    expect(parsedWithOptions('0.125p', options)).toMatchObject({
      kind: 'scale',
      scalar: { exactValue: { numerator: 1, denominator: 8 } },
    });
    expect(parsedWithOptions('2\\cdot p', options)).toMatchObject({
      kind: 'binary',
      operator: 'dot',
      left: { kind: 'scalar' },
      right: { kind: 'named', name: 'p' },
    });
    expect(parsedWithOptions('p\\times q', options)).toMatchObject({
      kind: 'binary',
      operator: 'cross',
    });
    expect(parseLinearAlgebraEditorLatex('ap', options)).toMatchObject({
      ok: false,
      message: expect.stringContaining('Symbolic vector coefficients'),
    });
  });

  it('parses inline bmatrix matrices and column vectors', () => {
    expect(parsed('\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}', 'matrix')).toEqual({
      kind: 'matrixLiteral',
      value: [[1, 2], [3, 4]],
      exactValue: [
        [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
        [{ numerator: 3, denominator: 1 }, { numerator: 4, denominator: 1 }],
      ],
      displayLatex: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
    });
    expect(parsed('\\begin{bmatrix}1\\\\-2\\\\\\frac{3}{2}\\end{bmatrix}', 'vector')).toEqual({
      kind: 'vectorLiteral',
      value: [1, -2, 1.5],
      exactValue: [
        { numerator: 1, denominator: 1 },
        { numerator: -2, denominator: 1 },
        { numerator: 3, denominator: 2 },
      ],
      displayLatex: '\\begin{bmatrix}1\\\\-2\\\\\\frac{3}{2}\\end{bmatrix}',
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
        displayLatex: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
      },
    });
  });

  it('parses MathLive matrix environment variants as matrix/vector literals', () => {
    expect(parsed('\\begin{matrix}1&2\\\\3&4\\end{matrix}', 'matrix')).toEqual({
      kind: 'matrixLiteral',
      value: [[1, 2], [3, 4]],
      exactValue: [
        [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
        [{ numerator: 3, denominator: 1 }, { numerator: 4, denominator: 1 }],
      ],
      displayLatex: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
    });
    expect(parsed('\\det\\left(\\begin{pmatrix}1&0\\\\0&3\\end{pmatrix}\\right)', 'matrix')).toMatchObject({
      kind: 'unary',
      operator: 'determinant',
      value: {
        kind: 'matrixLiteral',
        value: [[1, 0], [0, 3]],
        displayLatex: '\\begin{bmatrix}1&0\\\\0&3\\end{bmatrix}',
      },
    });
    expect(parsed('\\operatorname{rank}\\left(\\begin{array}{cc}1&2\\\\3&4\\end{array}\\right)', 'matrix')).toMatchObject({
      kind: 'unary',
      operator: 'rank',
      value: {
        kind: 'matrixLiteral',
        value: [[1, 2], [3, 4]],
      },
    });
    expect(parsed('\\begin{array}{c}5\\\\11\\end{array}', 'vector')).toEqual({
      kind: 'vectorLiteral',
      value: [5, 11],
      exactValue: [
        { numerator: 5, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      displayLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
    });
  });

  it('parses friendly plain list matrix and vector literals', () => {
    expect(parsed('[[1,2],[3,4]]', 'matrix')).toEqual({
      kind: 'matrixLiteral',
      value: [[1, 2], [3, 4]],
      exactValue: [
        [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
        [{ numerator: 3, denominator: 1 }, { numerator: 4, denominator: 1 }],
      ],
      displayLatex: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
    });
    expect(parsed('[5,11]', 'vector')).toEqual({
      kind: 'vectorLiteral',
      value: [5, 11],
      exactValue: [
        { numerator: 5, denominator: 1 },
        { numerator: 11, denominator: 1 },
      ],
      displayLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
    });
    expect(parsed('[1/2,0.125]', 'vector')).toEqual({
      kind: 'vectorLiteral',
      value: [0.5, 0.125],
      exactValue: [
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 8 },
      ],
      displayLatex: '\\begin{bmatrix}1/2\\\\0.125\\end{bmatrix}',
    });
  });

  it('parses friendly plain list syntax inside Matrix operations', () => {
    expect(parsed('eigen([[2,1],[1,2]])', 'matrix')).toMatchObject({
      kind: 'unary',
      operator: 'eigen',
      value: {
        kind: 'matrixLiteral',
        value: [[2, 1], [1, 2]],
        displayLatex: '\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}',
      },
    });
    expect(parsed('lu([[2,1],[4,3]])', 'matrix')).toMatchObject({
      kind: 'unary',
      operator: 'lu',
      value: { kind: 'matrixLiteral', value: [[2, 1], [4, 3]] },
    });
    expect(parsed('plu([[0,1],[2,3]])', 'matrix')).toMatchObject({
      kind: 'unary',
      operator: 'plu',
      value: { kind: 'matrixLiteral', value: [[0, 1], [2, 3]] },
    });
    expect(parsed('qr([[3,0],[4,5]])', 'matrix')).toMatchObject({
      kind: 'unary',
      operator: 'qr',
      value: { kind: 'matrixLiteral', value: [[3, 0], [4, 5]] },
    });
    expect(parsed('coords([[1,2],[3,4]],[5,11])', 'matrix')).toMatchObject({
      kind: 'coordinates',
      basis: { kind: 'matrixLiteral', value: [[1, 2], [3, 4]] },
      vector: { kind: 'vectorLiteral', value: [5, 11] },
    });
    expect(parsed('ls([[1,0],[0,1],[0,0]],[2,3,4])', 'matrix')).toMatchObject({
      kind: 'leastSquares',
      matrix: { kind: 'matrixLiteral', value: [[1, 0], [0, 1], [0, 0]] },
      vector: { kind: 'vectorLiteral', value: [2, 3, 4] },
    });
  });

  it('parses friendly plain list syntax inside Vector operations', () => {
    expect(parsed('proj_u([1/2,3])', 'vector')).toMatchObject({
      kind: 'unary',
      operator: 'projectionOntoU',
      value: {
        kind: 'vectorLiteral',
        value: [0.5, 3],
        exactValue: [
          { numerator: 1, denominator: 2 },
          { numerator: 3, denominator: 1 },
        ],
        displayLatex: '\\begin{bmatrix}1/2\\\\3\\end{bmatrix}',
      },
    });
    expect(parsed('gram([1,1],[1,0])', 'vector')).toMatchObject({
      kind: 'gramSchmidt',
      left: { kind: 'vectorLiteral', value: [1, 1] },
      right: { kind: 'vectorLiteral', value: [1, 0] },
    });
  });

  it('parses structured Matrix systems', () => {
    expect(parsed('Ax=\\begin{bmatrix}5\\\\11\\end{bmatrix}', 'matrix')).toEqual({
      kind: 'linearSystem',
      form: 'Ax=b',
      coefficients: { kind: 'named', name: 'A', displayLatex: 'A' },
      constants: {
        kind: 'vectorLiteral',
        value: [5, 11],
        exactValue: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        displayLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
    });
    expect(parsed(
      'A x + \\begin{bmatrix}-5\\\\-11\\end{bmatrix}=0',
      'matrix',
    )).toEqual({
      kind: 'linearSystem',
      form: 'Ax+b=0',
      coefficients: { kind: 'named', name: 'A', displayLatex: 'A' },
      constants: {
        kind: 'vectorLiteral',
        value: [5, 11],
        exactValue: [
          { numerator: 5, denominator: 1 },
          { numerator: 11, denominator: 1 },
        ],
        displayLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}',
      },
    });
    expect(parsed('A X = B', 'matrix')).toEqual({
      kind: 'multiRhsSystem',
      coefficients: { kind: 'named', name: 'A', displayLatex: 'A' },
      constants: { kind: 'named', name: 'B', displayLatex: 'B' },
    });
    expect(parsed('A X = \\begin{bmatrix}5&6\\\\11&14\\end{bmatrix}', 'matrix')).toEqual({
      kind: 'multiRhsSystem',
      coefficients: { kind: 'named', name: 'A', displayLatex: 'A' },
      constants: {
        kind: 'matrixLiteral',
        value: [[5, 6], [11, 14]],
        exactValue: [
          [{ numerator: 5, denominator: 1 }, { numerator: 6, denominator: 1 }],
          [{ numerator: 11, denominator: 1 }, { numerator: 14, denominator: 1 }],
        ],
        displayLatex: '\\begin{bmatrix}5&6\\\\11&14\\end{bmatrix}',
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
    expect(parseLinearAlgebraEditorLatex('\\begin{pmatrix}1&\\\\3&4\\end{pmatrix}', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'placeholder',
    });
    expect(parseLinearAlgebraEditorLatex('\\begin{matrix}\\placeholder{}&2\\\\3&4\\end{matrix}', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'placeholder',
    });
    expect(parseLinearAlgebraEditorLatex('\\begin{bmatrix}1&2\\\\3\\end{bmatrix}', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'invalid-matrix-literal',
    });
    expect(parseLinearAlgebraEditorLatex('[[1,2],[3]]', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'invalid-matrix-literal',
    });
    expect(parseLinearAlgebraEditorLatex('[[1,],[3,4]]', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'placeholder',
    });
    expect(parseLinearAlgebraEditorLatex('A=b', { mode: 'matrix' })).toMatchObject({
      ok: false,
      reason: 'unsupported-equation-shape',
    });
  });
});
