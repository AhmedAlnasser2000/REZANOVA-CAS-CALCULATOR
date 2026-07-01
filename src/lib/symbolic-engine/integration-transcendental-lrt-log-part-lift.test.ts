import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { tryRischNormanLrtRationalIntegrationRule } from './integration/risch-norman/lrt-log-part';
import { liftTranscendentalRationalLogPartLrt } from './integration/transcendental-lrt-log-part-lift';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function lift(numeratorLatex: string, denominatorLatex: string, variable = 'x') {
  return liftTranscendentalRationalLogPartLrt({
    numerator: node(numeratorLatex),
    denominator: node(denominatorLatex),
    variable,
  });
}

function allText(result: { exactLatex: string; definitionsLatex: string[]; proofSteps: string[] }) {
  return [result.exactLatex, ...result.definitionsLatex, ...result.proofSteps].join('\n');
}

describe('transcendental Risch LRT logarithmic-part lift', () => {
  it('lifts exact quartic residuals under the formal descriptor cap without live routing', () => {
    const result = lift('1', 'x^4+x+1');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(`expected formal LRT lift success, got ${JSON.stringify(result)}`);
    }

    expect(result.family).toBe('lrt-logarithmic-completion');
    expect(result.descriptorDegree).toBeLessThanOrEqual(8);
    expect(result.exactLatex).toContain('\\alpha_{1}\\cdot\\ln');
    expect(result.proofSteps[0]).toContain('\\operatorname{Res}_{x}');
    expect(result.ownership.method).toBe('integration-risch-norman-owned');
    expect(allText(result)).not.toMatch(/RootOf|rootof/i);

    const liveDefault = tryRischNormanLrtRationalIntegrationRule(
      node('\\frac{1}{x^4+x+1}'),
      'x',
    );
    expect(liveDefault).toMatchObject({
      kind: 'stop',
      reason: 'resultant-stop',
    });
  });

  it('accepts target-free symbolic numerator coefficients with exact denominator roots', () => {
    const result = lift('A*x^2+B*x+1', 'x^4+x+1');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(`expected formal LRT lift success, got ${JSON.stringify(result)}`);
    }

    expect(result.capEvidence.algebraicDescriptorDegreeCap).toBe(8);
    expect(result.capEvidence.polynomialDegreeCap).toBe(10);
    expect(result.definitionsLatex.join('\n')).toContain('S_{1}\\left(x\\right)');
  });

  it('keeps symbolic denominator coefficients stopped until algebraic coefficient reduction exists', () => {
    const result = lift('1', 'x^4+a*x+1');
    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'symbolic-denominator-cap',
      capEvidence: {
        algebraicDescriptorDegreeCap: 8,
      },
    });
  });

  it('stops over the bounded resultant descriptor cap', () => {
    const result = lift('1', 'x^5+x+1');
    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'resultant-stop',
      primitiveReason: 'sylvester-dimension-limit',
    });
  });
});
