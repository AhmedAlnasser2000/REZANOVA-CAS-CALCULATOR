import { describe, expect, it } from 'vitest';
import type { SerializableMathJson } from '../../../types/calculator';
import { equationV6Printer, printEquationMath } from './equation-v6';

const p = (v: unknown, descendingIn?: string) => printEquationMath(v as SerializableMathJson, descendingIn ? { descendingIn } : {});

describe('Equation V6 printer', () => {
  it.each([
    ['e − 1 from −1 + e', ['Add', -1, ['Exp', 1]], 'e - 1', 'e - 1'],
    ['−(1 − e) distributed', ['Multiply', -1, ['Add', 1, ['Multiply', -1, ['Exp', 1]]]], 'e - 1', 'e - 1'],
    ['2√3', ['Multiply', 2, ['Power', 3, ['Rational', 1, 2]]], '2\\sqrt{3}', '2√3'],
    ['√3/2', ['Multiply', ['Rational', 1, 2], ['Power', 3, ['Rational', 1, 2]]], '\\frac{\\sqrt{3}}{2}', '√3/2'],
    ['π/6 + 2πk', ['Add', ['Multiply', ['Rational', 1, 6], 'Pi'], ['Multiply', 2, 'Pi', 'k']], '\\frac{\\pi}{6} + 2\\pi k', 'π/6 + 2πk'],
    ['1/x', ['Power', 'x', -1], '\\frac{1}{x}', '1/x'],
    ['−1/a', ['Multiply', -1, ['Power', 'a', -1]], '-\\frac{1}{a}', '-1/a'],
    ['√(x + 1)', ['Power', ['Add', 'x', 1], ['Rational', 1, 2]], '\\sqrt{x + 1}', '√(x + 1)'],
    ['∛2', ['Power', 2, ['Rational', 1, 3]], '\\sqrt[3]{2}', '∛2'],
    ['ln 2', ['Ln', 2], '\\ln\\left(2\\right)', 'ln(2)'],
    ['e^x', ['Exp', 'x'], 'e^{x}', 'e^x'],
    ['W₋₁', ['LambertW', ['Multiply', -1, ['Power', ['Exp', 1], -1]], -1], 'W_{-1}\\left(-\\frac{1}{e}\\right)', 'W₋₁(-1/e)'],
    ['binder', 'r_12', 'r_{12}', 'r₁₂'],
    ['|x − 1|', ['Abs', ['Add', 'x', -1]], '\\left|x - 1\\right|', '|x - 1|'],
    ['2·3^x needs a dot', ['Multiply', 2, ['Power', 3, 'x']], '2\\cdot 3^{x}', '2·3^x'],
    ['(x + 1)²', ['Power', ['Add', 'x', 1], 2], '\\left(x + 1\\right)^{2}', '(x + 1)^2'],
    ['huge integer', { num: '-123456789012345678901234567890' }, '-123456789012345678901234567890', '-123456789012345678901234567890'],
    ['(1 − √5)/2', ['Add', ['Rational', 1, 2], ['Multiply', ['Rational', -1, 2], ['Power', 5, ['Rational', 1, 2]]]], '\\frac{1}{2} - \\frac{\\sqrt{5}}{2}', '1/2 - √5/2'],
  ])('%s', (_, v, latex, text) => {
    expect(p(v)).toEqual({ latex, text });
  });

  it('orders polynomial terms by descending degree on request', () => {
    expect(p(['Add', -1, ['Power', 'x', 5], ['Multiply', -1, 'x']], 'x')).toEqual({ latex: 'x^{5} - x - 1', text: 'x^5 - x - 1' });
  });

  it('refuses unknown heads (the caller falls back) and serves the adapter contract', () => {
    expect(p(['RootOf', ['List', 1, 2], 1])).toBeUndefined();
    const ok = equationV6Printer.print(['Sqrt', 2], { profile: 'pedagogical-v1', target: 'plain-text' }, {});
    expect(ok).toMatchObject({ ok: true, text: '√2', canonicalLatex: '\\sqrt{2}' });
    expect(equationV6Printer.print(['Foo', 1], { profile: 'pedagogical-v1', target: 'canonical-latex' }, {}).ok).toBe(false);
  });
});
