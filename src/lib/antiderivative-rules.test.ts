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
    expect(resolveAntiderivativeRule(parseBody('\\exponentialE^{3x}'))).toContain('\\exponentialE');
    expect(resolveAntiderivativeRule(parseBody('(2x+1)^3'))).toContain('2x+1');
  });

  it('returns undefined for unsupported forms', () => {
    expect(resolveAntiderivativeRule(parseBody('\\sin(x^2)'))).toBeUndefined();
  });
});
