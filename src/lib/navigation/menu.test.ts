import { describe, expect, it } from 'vitest';
import {
  KEYPAD_ROWS,
  getWorkspaceKeypadRows,
  resolveKeypadButtonForLayer,
} from './menu';

function keypadButton(id: string) {
  const button = KEYPAD_ROWS.flat().find((candidate) => candidate.id === id);
  if (!button) {
    throw new Error(`Missing keypad button ${id}`);
  }
  return button;
}

describe('keypad layer actions', () => {
  it('routes Shift and Alpha keypad layers to their alternate actions', () => {
    expect(resolveKeypadButtonForLayer(keypadButton('sin'), 'shift').latex).toBe(
      '\\arcsin\\left(#0\\right)',
    );
    expect(resolveKeypadButtonForLayer(keypadButton('sin'), 'alpha').latex).toBe('a');
    expect(resolveKeypadButtonForLayer(keypadButton('7'), 'shift').latex).toBe('\\le');
    expect(resolveKeypadButtonForLayer(keypadButton('7'), 'alpha').latex).toBe('d');
  });

  it('routes Ctrl keypad layer to commands while preserving base actions', () => {
    expect(resolveKeypadButtonForLayer(keypadButton('menu'), 'ctrl').command).toBe('open-menu');
    expect(resolveKeypadButtonForLayer(keypadButton('delete'), 'ctrl').command).toBe('clear');
    expect(resolveKeypadButtonForLayer(keypadButton('sin'), 'base').latex).toBe(
      '\\sin\\left(#0\\right)',
    );
  });
});

describe('workspace keypad overlays', () => {
  it('uses derivative operator templates only on derivative-family Calculus screens', () => {
    const derivativeRows = getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: 'calculus',
      calculusScreen: 'partialDerivative',
    });
    const finiteLimitRows = getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: 'calculus',
      calculusScreen: 'finiteLimit',
    });
    const calculateRows = getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: 'calculate',
    });

    expect(derivativeRows.flat().find((button) => button.id === '00')).toBeUndefined();
    expect(derivativeRows.flat().find((button) => button.id === 'derivative-partial-symbol')?.latex)
      .toBe('\\partial');
    expect(derivativeRows.flat().find((button) => button.id === 'derivative-higher-template')?.latex)
      .toBe('\\frac{d^{#0}}{dx^{#0}}\\left(#?\\right)');
    expect(derivativeRows.flat().find((button) => button.id === 'derivative-mixed-partial-template')?.latex)
      .toBe('\\frac{\\partial^{#0}}{\\partial x\\partial y}\\left(#?\\right)');
    expect(finiteLimitRows.flat().find((button) => button.id === '00')).toBeDefined();
    expect(calculateRows.flat().find((button) => button.id === '00')).toBeDefined();
  });

  it('uses Limit templates only on the canonical Limit screen', () => {
    const limitRows = getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: 'calculus',
      calculusScreen: 'limit',
    });
    const finiteLimitRows = getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: 'calculus',
      calculusScreen: 'finiteLimit',
    });
    const calculateRows = getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: 'calculate',
    });

    expect(limitRows.flat().find((button) => button.id === '00')).toBeUndefined();
    expect(limitRows.flat().find((button) => button.id === 'limit-piecewise-template')?.label)
      .toBe('Piecewise');
    expect(limitRows.flat().find((button) => button.id === 'limit-piecewise-template')?.latex)
      .toBeUndefined();
    expect(limitRows.flat().find((button) => button.id === 'limit-piecewise-branch'))
      .toBeUndefined();
    expect(limitRows.flat().find((button) => button.id === 'limit-if-text'))
      .toBeUndefined();
    expect(limitRows.flat().find((button) => button.id === 'limit-otherwise-text'))
      .toBeUndefined();
    expect(finiteLimitRows.flat().find((button) => button.id === 'limit-piecewise-template'))
      .toBeUndefined();
    expect(calculateRows.flat().find((button) => button.id === 'limit-piecewise-template'))
      .toBeUndefined();
  });

  it('uses Matrix and Vector operator rows only in linear algebra modes', () => {
    const matrixRows = getWorkspaceKeypadRows(KEYPAD_ROWS, { mode: 'matrix' });
    const vectorRows = getWorkspaceKeypadRows(KEYPAD_ROWS, { mode: 'vector' });
    const calculateRows = getWorkspaceKeypadRows(KEYPAD_ROWS, { mode: 'calculate' });
    const derivativeRows = getWorkspaceKeypadRows(KEYPAD_ROWS, {
      mode: 'calculus',
      calculusScreen: 'derivative',
    });

    expect(matrixRows.flat().find((button) => button.id === 'sqrt')).toBeUndefined();
    expect(matrixRows.flat().find((button) => button.id === 'linear-matrix-template')?.latex)
      .toBe('\\begin{bmatrix}#0 & #?\\\\#? & #?\\end{bmatrix}');
    expect(matrixRows.flat().find((button) => button.id === 'linear-row-break')?.latex).toBe('\\\\');
    expect(matrixRows.flat().find((button) => button.id === 'linear-rank')?.latex)
      .toBe('\\operatorname{rank}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-rref')?.latex)
      .toBe('\\operatorname{rref}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-eigen')?.latex)
      .toBe('\\operatorname{eigen}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-eigen')?.layers?.shift?.latex)
      .toBe('\\operatorname{diag}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-null')?.latex)
      .toBe('\\operatorname{null}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-col')?.latex)
      .toBe('\\operatorname{col}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-col')?.layers?.shift?.latex)
      .toBe('\\operatorname{projcol}\\left(#0,#?\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-invertible')?.latex)
      .toBe('\\operatorname{invertible}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-inverse')?.layers?.shift?.latex)
      .toBe('\\operatorname{mpow}\\left(#0,#?\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-qr')?.latex)
      .toBe('\\operatorname{qr}\\left(#0\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'linear-qr')?.layers?.shift?.latex)
      .toBe('\\operatorname{ls}\\left(#0,#?\\right)');
    expect(matrixRows.flat().find((button) => button.id === 'left')?.command).toBe('cursor-left');
    expect(matrixRows.flat().find((button) => button.id === 'execute')?.command).toBe('evaluate');

    expect(vectorRows.flat().find((button) => button.id === 'linear-vector-template')?.latex)
      .toBe('\\begin{bmatrix}#0\\\\#?\\\\#?\\end{bmatrix}');
    expect(vectorRows.flat().find((button) => button.id === 'linear-vector-u')?.latex).toBe('u');
    expect(vectorRows.flat().find((button) => button.id === 'linear-vector-v')?.latex).toBe('v');
    expect(vectorRows.flat().find((button) => button.id === 'linear-vector-a')).toBeUndefined();
    expect(vectorRows.flat().find((button) => button.id === 'linear-proj-u')?.latex)
      .toBe('\\operatorname{proj}_{u}\\left(#0\\right)');
    expect(vectorRows.flat().find((button) => button.id === 'linear-proj-v')?.latex)
      .toBe('\\operatorname{proj}_{v}\\left(#0\\right)');
    expect(vectorRows.flat().find((button) => button.id === 'linear-unit')?.latex)
      .toBe('\\operatorname{unit}\\left(#0\\right)');
    expect(vectorRows.flat().find((button) => button.id === 'linear-gram')?.latex)
      .toBe('\\operatorname{gram}\\left(#0,#?\\right)');
    expect(vectorRows.flat().find((button) => button.id === 'linear-orth-u')?.latex)
      .toBe('\\operatorname{orth}_{u}\\left(#0\\right)');
    expect(vectorRows.flat().find((button) => button.id === 'linear-orth-v')?.latex)
      .toBe('\\operatorname{orth}_{v}\\left(#0\\right)');
    expect(vectorRows.flat().find((button) => button.id === 'linear-dot')?.latex).toBe('\\cdot');
    expect(vectorRows.flat().find((button) => button.id === 'linear-cross')?.latex).toBe('\\times');
    expect(vectorRows.flat().find((button) => button.id === 'linear-norm')?.latex)
      .toBe('\\left\\lVert#0\\right\\rVert');
    expect(vectorRows.flat().find((button) => button.id === 'linear-rank')).toBeUndefined();
    expect(vectorRows.flat().find((button) => button.id === 'linear-null')).toBeUndefined();
    expect(vectorRows.flat().find((button) => button.id === 'linear-col')).toBeUndefined();
    expect(vectorRows.flat().find((button) => button.id === 'linear-invertible')).toBeUndefined();
    expect(vectorRows.flat().find((button) => button.id === 'linear-qr')).toBeUndefined();
    expect(vectorRows.flat().find((button) => button.id === 'linear-eigen')).toBeUndefined();
    expect(matrixRows.flat().find((button) => button.id === 'linear-proj-u')).toBeUndefined();

    expect(calculateRows.flat().find((button) => button.id === 'sqrt')).toBeDefined();
    expect(calculateRows.flat().find((button) => button.id === 'linear-rank')).toBeUndefined();
    expect(calculateRows.flat().find((button) => button.id === 'linear-invertible')).toBeUndefined();
    expect(calculateRows.flat().find((button) => button.id === 'linear-eigen')).toBeUndefined();
    expect(derivativeRows.flat().find((button) => button.id === 'derivative-partial-symbol')).toBeDefined();
    expect(derivativeRows.flat().find((button) => button.id === 'linear-rank')).toBeUndefined();
    expect(derivativeRows.flat().find((button) => button.id === 'linear-invertible')).toBeUndefined();
    expect(derivativeRows.flat().find((button) => button.id === 'linear-eigen')).toBeUndefined();
  });
});
