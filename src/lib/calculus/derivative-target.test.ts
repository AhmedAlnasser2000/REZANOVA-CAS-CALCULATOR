import { describe, expect, it } from 'vitest';
import {
  derivativeVariableLatex,
  parseDerivativeVariable,
} from './derivative-target';

describe('derivative target variables', () => {
  it('accepts one Latin symbol or supported Greek target name', () => {
    expect(parseDerivativeVariable('t')).toEqual({ ok: true, variable: 't' });
    expect(parseDerivativeVariable('\\theta')).toEqual({ ok: true, variable: 'theta' });
    expect(parseDerivativeVariable('theta')).toEqual({ ok: true, variable: 'theta' });
    expect(derivativeVariableLatex('theta')).toBe('\\theta');
  });

  it('rejects empty, numeric, and multi-symbol targets', () => {
    expect(parseDerivativeVariable('').ok).toBe(false);
    expect(parseDerivativeVariable('2').ok).toBe(false);
    expect(parseDerivativeVariable('xy').ok).toBe(false);
    expect(parseDerivativeVariable('x+1').ok).toBe(false);
  });
});
