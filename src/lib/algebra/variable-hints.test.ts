import { describe, expect, it } from 'vitest';
import { buildVariableHints } from './variable-hints';
import type { StoredVariableValue } from '../../types/calculator';

const stored: StoredVariableValue[] = [
  { name: 'a', valueLatex: '4', numericValue: 4, updatedAt: '2026-05-25T00:00:00.000Z' },
  { name: 'mass', valueLatex: '5', numericValue: 5, updatedAt: '2026-05-25T00:00:00.000Z' },
  { name: 'x', valueLatex: '9', numericValue: 9, updatedAt: '2026-05-25T00:00:00.000Z' },
  { name: 'z', valueLatex: '8', numericValue: 8, updatedAt: '2026-05-25T00:00:00.000Z' },
];

function hintKinds(latex: string, context: Parameters<typeof buildVariableHints>[1]) {
  return buildVariableHints(latex, context).map((hint) => `${hint.label}:${hint.kind}`);
}

describe('variable hints', () => {
  it('marks stored values and protected active variables', () => {
    expect(hintKinds('a x^2', {
      mode: 'table',
      activeVariable: 'x',
      storedVariables: stored,
    })).toEqual(['a:stored-value', 'x:active-variable']);
  });

  it('keeps stored equation parameters symbolic during symbolic solving', () => {
    const hints = buildVariableHints('x+z=5', {
      mode: 'equation',
      screenHint: 'symbolic',
      solveTarget: 'x',
      storedVariables: stored,
    });

    expect(hints.map((hint) => `${hint.label}:${hint.kind}`)).toEqual([
      'x:solve-target',
      'z:stored-ignored',
    ]);
    expect(hints.find((hint) => hint.label === 'z')?.detail).toContain('keeps it as a symbolic parameter');
  });

  it('marks reserved functions/constants and adjacent-letter ambiguity', () => {
    expect(hintKinds('sin(x)+pi+az', {
      mode: 'calculate',
      storedVariables: stored,
    })).toEqual([
      'pi:reserved-constant',
      'sin:reserved-function',
      'az:ambiguous-adjacent',
      'a:stored-value',
      'x:stored-value',
      'z:stored-value',
    ]);
  });

  it('marks plain complex locus calls as functions instead of adjacent-letter products', () => {
    expect(hintKinds('Re(z)=1', {
      mode: 'equation',
      screenHint: 'symbolic',
      solveTarget: 'z',
      storedVariables: stored,
    })).toEqual([
      'Re:reserved-function',
      'z:solve-target',
    ]);

    expect(hintKinds('Im(z)=0', {
      mode: 'equation',
      screenHint: 'symbolic',
      solveTarget: 'z',
      storedVariables: stored,
    })).toEqual([
      'Im:reserved-function',
      'z:solve-target',
    ]);

    expect(hintKinds('conj(z)=z', {
      mode: 'equation',
      screenHint: 'symbolic',
      solveTarget: 'z',
      storedVariables: stored,
    })).toEqual([
      'conj:reserved-function',
      'z:solve-target',
    ]);
  });

  it('does not turn Matrix editor functions and bmatrix syntax into variable hints', () => {
    expect(hintKinds('\\operatorname{eigen}\\left(\\begin{bmatrix}2&1\\\\1&2\\end{bmatrix}\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('A x = \\begin{bmatrix}5\\\\11\\end{bmatrix}', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('A X = B', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('rref\\left(\\begin{bmatrix}1&2\\\\2&4\\end{bmatrix}\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{coords}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{change}\\left(A,B\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{diag}\\left(A\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{mpow}\\left(A,3\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{lu}\\left(A\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{plu}\\left(A\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{qr}\\left(A\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{projcol}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{ls}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{profile}\\left(A\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{lusolve}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{plusolve}\\left(A,\\begin{bmatrix}5\\\\11\\end{bmatrix}\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      storedVariables: stored,
    })).toEqual([]);
  });

  it('does not turn Vector editor functions and named vectors into variable hints', () => {
    expect(hintKinds('\\operatorname{proj}_{u}\\left(v\\right)', {
      mode: 'vector',
      screenHint: 'vector',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('gram(u,v)', {
      mode: 'vector',
      screenHint: 'vector',
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{proj}\\left(p,q\\right)', {
      mode: 'vector',
      screenHint: 'vector',
      linearAlgebraNamedValues: ['u', 'v', 'p', 'q'],
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{span}\\left(p,q,r\\right)', {
      mode: 'vector',
      screenHint: 'vector',
      linearAlgebraNamedValues: ['u', 'v', 'p', 'q', 'r'],
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\operatorname{independent}\\left(p,q\\right)', {
      mode: 'vector',
      screenHint: 'vector',
      linearAlgebraNamedValues: ['u', 'v', 'p', 'q'],
      storedVariables: stored,
    })).toEqual([]);
  });

  it('does not turn Matrix named values or adjacent named products into variable hints', () => {
    expect(hintKinds('\\det\\left(C\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      linearAlgebraNamedValues: ['A', 'B', 'C', 'D', 'E'],
      storedVariables: stored,
    })).toEqual([]);

    expect(hintKinds('\\det\\left(CDE\\right)', {
      mode: 'matrix',
      screenHint: 'matrix',
      linearAlgebraNamedValues: ['A', 'B', 'C', 'D', 'E'],
      storedVariables: stored,
    })).toEqual([]);
  });

  it('marks the imaginary unit as a reserved unit in Equation analysis', () => {
    const hints = buildVariableHints('x+i+\\imaginaryI=0', {
      mode: 'equation',
      screenHint: 'symbolic',
      solveTarget: 'x',
      storedVariables: stored,
    });

    expect(hints.map((hint) => `${hint.label}:${hint.kind}`)).toEqual([
      'i:reserved-unit',
      'x:solve-target',
    ]);
    expect(hints.find((hint) => hint.label === 'i')?.detail)
      .toContain('reserved unit');
  });

  it('distinguishes explicit named variables from raw adjacent text', () => {
    const explicit = buildVariableHints('@mass+var(rate)+hello', {
      mode: 'calculate',
      storedVariables: stored,
    });

    expect(explicit.map((hint) => `${hint.label}:${hint.kind}`)).toContain('mass:stored-value');
    expect(explicit.map((hint) => `${hint.label}:${hint.kind}`)).toContain('rate:symbolic-parameter');
    expect(explicit.map((hint) => `${hint.label}:${hint.kind}`)).toContain('hello:ambiguous-adjacent');
    expect(explicit.find((hint) => hint.label === 'mass')?.detail).toContain('one explicit named variable');
    expect(explicit.find((hint) => hint.label === 'rate')?.detail).toContain('one explicit named variable');
    expect(explicit.find((hint) => hint.label === 'hello')?.detail).toContain('@hello');
  });
});
