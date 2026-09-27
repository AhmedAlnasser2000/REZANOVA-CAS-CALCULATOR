import { describe, expect, it } from 'vitest';
import { evaluateTypedLinearAlgebraExpression } from './typed-expression';
import { dispatchMatrixEditorLatex, dispatchVectorEditorLatex } from './editor-dispatch';
import { runMatrixMode } from '../modes/matrix';
import { runVectorMode } from '../modes/vector';
import { runCalculateMode } from '../modes/calculate';

const A = [[1, 2], [3, 4]];
const B = [[2, 0], [0, 2]];

describe('typed Linear Algebra expressions', () => {
  it('combines exact scalar results and keeps the exact value', () => {
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'det(A)+det(B)', matrixA: A, matrixB: B,
    })).toMatchObject({ ok: true, kind: 'scalar', latex: '2' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'det(A)/det(B)', matrixA: A, matrixB: B,
    })).toMatchObject({ ok: true, kind: 'scalar', latex: '\\frac{-1}{2}' });
  });

  it('scales matrices and divides only by nonzero scalars', () => {
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: '2A-B', matrixA: A, matrixB: B,
    })).toMatchObject({ ok: true, kind: 'matrix', latex: '\\begin{bmatrix}0&4\\\\6&6\\end{bmatrix}' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A/0', matrixA: A,
    })).toMatchObject({ ok: false, message: 'Division by zero is undefined.' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A/2', matrixA: A,
    })).toMatchObject({ ok: true, kind: 'matrix', latex: '\\begin{bmatrix}\\frac{1}{2}&1\\\\\\frac{3}{2}&2\\end{bmatrix}' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A+1', matrixA: A,
    })).toMatchObject({ ok: false, message: 'A scalar cannot be added to a Matrix or Vector.' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A/B', matrixA: A, matrixB: B,
    })).toMatchObject({ ok: false, message: 'Matrix/Vector division needs a scalar denominator.' });
  });

  it('multiplies a matrix by an inline vector and checks dimensions', () => {
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A\\times\\begin{bmatrix}1\\\\2\\end{bmatrix}', matrixA: A,
    })).toMatchObject({ ok: true, kind: 'vector', latex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A\\times\\begin{bmatrix}1\\\\2\\\\3\\end{bmatrix}', matrixA: A,
    })).toMatchObject({ ok: false, message: 'Matrix columns must match Vector length.' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A(\\begin{bmatrix}1\\\\2\\end{bmatrix}+\\begin{bmatrix}3\\\\4\\end{bmatrix})', matrixA: A,
    })).toMatchObject({ ok: true, kind: 'vector', latex: '\\begin{bmatrix}16\\\\36\\end{bmatrix}' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: 'A(u+v)', matrixA: A,
    })).toMatchObject({ ok: false, message: 'u is not defined in this workspace.' });
  });

  it('preserves symbolic entries through matrix scaling', () => {
    const result = evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: '2\\times\\begin{bmatrix}x&1\\\\a+1&3\\end{bmatrix}',
    });
    expect(result).toMatchObject({ ok: true, kind: 'matrix' });
    if (result.ok) {
      expect(result.latex).toContain('x');
      expect(result.latex).toContain('a');
    }
  });

  it('composes vector operations and stops at the size cap', () => {
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'vector', latex: 'unit(u+v)', vectorA: [1, 0], vectorB: [0, 0],
    })).toMatchObject({ ok: true, kind: 'vector', latex: '\\begin{bmatrix}1\\\\0\\end{bmatrix}' });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'matrix', latex: '\\begin{bmatrix}1&2&3&4&5&6&7&8&9\\end{bmatrix}',
    })).toMatchObject({ ok: false, message: expect.stringContaining('up to 8 by 8') });
    expect(evaluateTypedLinearAlgebraExpression({
      mode: 'vector', latex: 'unit(u+v)', vectorA: [0, 0], vectorB: [0, 0],
    })).toMatchObject({ ok: false, message: 'Division by zero is undefined.' });
  });

  it('runs typed Matrix and Vector requests through their ordinary result contracts', () => {
    const matrix = dispatchMatrixEditorLatex({ latex: 'det(A)+det(B)', matrixA: A, matrixB: B });
    expect(matrix).toMatchObject({ ok: true, request: { operation: 'editorExpression' } });
    if (!matrix.ok) throw new Error(matrix.message);
    expect(runMatrixMode(matrix.request)).toMatchObject({ kind: 'success', exactLatex: '2' });
    for (const latex of [
      '2A-B',
      'A/2',
      'A\\times\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      '2\\times\\begin{bmatrix}x&1\\\\a+1&3\\end{bmatrix}',
    ]) {
      const dispatched = dispatchMatrixEditorLatex({ latex, matrixA: A, matrixB: B });
      expect(dispatched).toMatchObject({ ok: true, request: { operation: 'editorExpression' } });
      if (!dispatched.ok) throw new Error(dispatched.message);
      expect(runMatrixMode(dispatched.request).kind).toBe('success');
    }

    const vector = dispatchVectorEditorLatex({
      latex: 'dot(u,v)+dot(u,v)', vectorA: [1, 2], vectorB: [3, 4], angleUnit: 'deg',
    });
    expect(vector).toMatchObject({ ok: true, request: { operation: 'editorExpression' } });
    if (!vector.ok) throw new Error(vector.message);
    expect(runVectorMode(vector.request)).toMatchObject({ kind: 'success', exactLatex: '22' });
    const composedUnit = dispatchVectorEditorLatex({
      latex: 'unit(u+v)', vectorA: [1, 0], vectorB: [0, 0], angleUnit: 'deg',
    });
    expect(composedUnit).toMatchObject({ ok: true, request: { operation: 'editorExpression' } });
    if (!composedUnit.ok) throw new Error(composedUnit.message);
    expect(runVectorMode(composedUnit.request)).toMatchObject({
      kind: 'success', exactLatex: '\\begin{bmatrix}1\\\\0\\end{bmatrix}',
    });
  });

  it('returns only an inline Calculate answer and uses Calculate scalar variables', () => {
    const request = { action: 'evaluate' as const, angleUnit: 'deg' as const,
      outputStyle: 'both' as const, ansLatex: '0' };
    expect(runCalculateMode({
      ...request, latex: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}\\times\\begin{bmatrix}1\\\\2\\end{bmatrix}',
    })).toMatchObject({ kind: 'success', exactLatex: '\\begin{bmatrix}5\\\\11\\end{bmatrix}' });
    expect(runCalculateMode({
      ...request,
      latex: 'A\\times\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
      storedVariables: [{ name: 'A', valueLatex: '2', numericValue: 2 }],
    })).toMatchObject({ kind: 'success', exactLatex: '\\begin{bmatrix}2&4\\\\6&8\\end{bmatrix}' });
  });
});
