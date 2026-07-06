import { describe, expect, it } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import { resolveAntiderivativeRule } from './antiderivative-rules';

const ce = new ComputeEngine();

function parseBody(latex: string) {
  const expr = ce.parse(`\\int ${latex} \\, dx`);
  const json = expr.json as unknown as unknown[];
  const fn = json[1] as unknown[];
  const block = fn[1] as unknown[];
  return block[1];
}

describe('resolveAntiderivativeRule', () => {
  it('handles supported rule-based antiderivatives', () => {
    expect(resolveAntiderivativeRule(parseBody('x^2'))).toContain('x^{3}');
    expect(resolveAntiderivativeRule(parseBody('\\frac{1}{x}'))).toContain('\\ln');
    expect(resolveAntiderivativeRule(parseBody('\\sin(2x+1)'))).toContain('\\cos');
    expect(resolveAntiderivativeRule(parseBody('\\tan(2x+1)'))).toContain('\\ln');
    expect(resolveAntiderivativeRule(parseBody('\\cot(2x+1)'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\sin(x)^2'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\sin^{5}(x)'))).toContain('\\cos');
    expect(resolveAntiderivativeRule(parseBody('\\sin^{6}(2x+1)'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\cos^{7}(x)'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\cos^{12}(2x+3)'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\cos(2x+1)^2'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\tan(x)^2'))).toContain('\\tan');
    expect(resolveAntiderivativeRule(parseBody('\\tan^{3}(x)\\sec^{2}(x)'))).toContain('\\tan');
    expect(resolveAntiderivativeRule(parseBody('\\tan^{4}(2x+1)'))).toContain('2x+1');
    expect(resolveAntiderivativeRule(parseBody('\\cot(2x+1)^2'))).toContain('\\cot');
    expect(resolveAntiderivativeRule(parseBody('\\cot^{3}(x)\\csc^{2}(x)'))).toContain('\\cot');
    expect(resolveAntiderivativeRule(parseBody('\\sec(2x+1)^2'))).toContain('\\tan');
    expect(resolveAntiderivativeRule(parseBody('\\sec^{4}(x)'))).toContain('\\tan');
    expect(resolveAntiderivativeRule(parseBody('\\csc(2x+1)^2'))).toContain('\\cot');
    expect(resolveAntiderivativeRule(parseBody('\\csc^{6}(2x+1)'))).toContain('\\cot');
    expect(resolveAntiderivativeRule(parseBody('\\sin(2x)\\cos(3x)'))).toContain('\\cos');
    expect(resolveAntiderivativeRule(parseBody('3\\sin(2x)\\cos(5x)'))).toContain('\\cos');
    expect(resolveAntiderivativeRule(parseBody('\\cos(3x)\\sin(2x)'))).toContain('\\cos');
    expect(resolveAntiderivativeRule(parseBody('\\sin(2x+1)\\sin(3x-2)'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\cos(2x)\\cos(3x)'))).toContain('\\sin');
    expect(resolveAntiderivativeRule(parseBody('\\sec(\\frac{1}{2}x+1)^2'))).toContain('2');
    expect(resolveAntiderivativeRule(parseBody('\\exponentialE^{3x}'))).toContain('\\exponentialE');
    expect(resolveAntiderivativeRule(parseBody('2^{2x+1}'))).toContain('\\ln');
    expect(resolveAntiderivativeRule(parseBody('(\\frac{1}{2})^{3x-1}'))).toContain('\\frac{1}{2}');
    expect(resolveAntiderivativeRule(parseBody('(2x+1)^3'))).toContain('2x+1');
  });

  it('returns undefined for unsupported forms', () => {
    expect(resolveAntiderivativeRule(parseBody('\\sin(x^2)'))).toBeUndefined();
    expect(resolveAntiderivativeRule(parseBody('\\sin^{13}(x)'))).toBeUndefined();
    expect(resolveAntiderivativeRule(parseBody('\\tan^{9}(x)'))).toBeUndefined();
    expect(resolveAntiderivativeRule(parseBody('\\sin(x)\\cos(x)\\tan(x)'))).toBeUndefined();
    expect(resolveAntiderivativeRule(parseBody('a\\sin(x)\\cos(2x)'))).toBeUndefined();
    expect(resolveAntiderivativeRule(parseBody('a^{2x+1}'))).toBeUndefined();
    expect(resolveAntiderivativeRule(parseBody('(-2)^x'))).toBeUndefined();
  });
});
