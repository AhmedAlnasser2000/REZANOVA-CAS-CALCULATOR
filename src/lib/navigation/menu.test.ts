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
});
