import { describe, expect, it } from 'vitest';
import { applyExpressionTransformToLatex } from './registry';
import type { AlgebraTransformAction } from './types';
import { requireProvenCanonicalMathValueV2 } from '../../result-contract/proven-answer-mathjson';

const cases: Array<[AlgebraTransformAction, string]> = [
  ['rewriteAsRoot', String.raw`x^{\frac{1}{3}}`],
  ['rewriteAsPower', String.raw`\sqrt[3]{\sqrt{x}}`],
  ['changeBase', String.raw`\log_{2}(x)`],
  ['combineFractions', String.raw`\frac{1}{x}+\frac{1}{x+1}`],
  ['cancelFactors', String.raw`\frac{x^2-1}{x-1}`],
  ['useLCD', String.raw`\frac{1}{x}+\frac{1}{x+1}`],
  ['rationalize', String.raw`\frac{1}{1+\sqrt{2}}`],
  ['conjugate', String.raw`\frac{1}{\sqrt{x}+1}`],
];

describe('Calculate transform native evidence prerequisite', () => {
  it.each(cases)('%s retains its actual answer tree and native restrictions', (action, source) => {
    const value = applyExpressionTransformToLatex(source, action);
    expect(value).not.toBeNull();
    if (!value) throw new Error('Expected native transform result.');
    expect(value.exactMathJson).toBeDefined();
    const prove = (canonicalLatex: string, mathJson: unknown) => requireProvenCanonicalMathValueV2({
      canonicalLatex, mathJson, owner: 'calculate', routeId: 'calculate.transforms',
      source: `native-transform:${action}`,
    });
    expect(() => prove(value.exactLatex, value.exactMathJson)).not.toThrow();
    if (value.transformSummaryLatex) {
      expect(value.transformSummaryMathJson).toBeDefined();
      expect(() => prove(value.transformSummaryLatex!, value.transformSummaryMathJson)).not.toThrow();
    }
    for (const constraint of value.domainConstraints ?? []) {
      if ('expressionLatex' in constraint) expect(constraint.expressionMathJson).toBeDefined();
    }
    expect(structuredClone(value)).toEqual(value);
  });
});
