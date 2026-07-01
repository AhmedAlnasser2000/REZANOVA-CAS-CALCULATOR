import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { reduceTranscendentalRischEquationCandidate } from './integration/transcendental-reduced-equation';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function reduce(latex: string, variable = 'x') {
  return reduceTranscendentalRischEquationCandidate(node(latex), variable);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('transcendental Risch reduced-equation proof layer', () => {
  it('turns exp-quadratic certificate candidates into a reduced RDE obstruction', () => {
    const result = reduce('e^{x^2}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected reduced equation success');
    }

    expect(result.family).toBe('liouville-rde-obstruction');
    expect(result.towerDepth).toBe(1);
    expect(result.readiness).toContain('depth1-exp-polynomial');
    expect(result.proofObligations[0]).toMatchObject({
      kind: 'rational-certificate-rde',
    });
    expect(result.proofObligations[0]?.equationLatex).toContain("r'(x)");
    expect(result.proofObligations[0]?.proofSummary).toContain('no rational solution');
    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
  });

  it('keeps arbitrary selected-variable evidence in symbolic exp-quadratic reduced equations', () => {
    const result = reduce('e^{a*t^2+x*t+b}', 't');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected t-variable reduced equation success');
    }

    expect(result.variable).toBe('t');
    expect(result.family).toBe('liouville-rde-obstruction');
    expect(result.exactSupplementLatex?.join(' ')).toContain('2a\\ne0');
    expect(result.proofObligations[0]?.proofSteps.join(' ')).toContain('incompatible polynomial degrees');
  });

  it('classifies rational log-derivative residuals as ordinary logarithmic reduced equations', () => {
    const result = reduce('\\frac{k*(2a*x+b)}{a*x^2+b*x+c}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected log-derivative reduced equation success');
    }

    expect(result.family).toBe('ordinary-log-derivative');
    expect(result.proofObligations[0]?.kind).toBe('ordinary-logarithmic-derivative');
    expect(result.proofObligations[0]?.proofSummary).toContain('log-derivative');
    expect(compact(result.proofObligations[0]?.proofSteps[0] ?? '')).toContain('k\\cdot\\ln');
  });

  it('classifies Hermite rational corrections through the reduced-equation layer', () => {
    const result = reduce(
      '\\frac{A*(a*x^2+b*x+c)-(A*x+B)*(2a*x+b)}{(a*x^2+b*x+c)^2}',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected Hermite reduced equation success');
    }

    expect(result.family).toBe('hermite-rational-correction');
    expect(result.proofObligations[0]?.kind).toBe('hermite-rational-correction');
    expect(result.proofObligations[0]?.proofSummary).toContain('Hermite rational-correction');
    expect(compact(result.proofObligations[0]?.proofSteps[0] ?? '')).toContain('\\frac{Ax+B}{ax^2+bx+c}');
  });

  it('classifies LRT algebraic-log residuals as reduced logarithmic parts', () => {
    const result = reduce('\\frac{1}{x^3+x+1}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected LRT reduced equation success');
    }

    expect(result.family).toBe('lrt-algebraic-log');
    expect(result.proofObligations[0]?.kind).toBe('lrt-algebraic-logarithmic-part');
    expect(result.proofObligations[0]?.proofSummary).toContain('LRT logarithmic-part');
    expect(result.proofObligations[0]?.proofSteps[0]).toContain('\\alpha_{1}\\cdot\\ln');
  });

  it('returns deterministic stops for deferred towers and unsafe proof inputs', () => {
    expect(reduce('e^{e^x}')).toMatchObject({
      kind: 'stop',
      reason: 'depth2-reduced-equation-deferred',
    });

    expect(reduce('e^{\\sin(x)}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-depth2-composition',
    });

    expect(reduce('\\ln(\\ln(\\ln(x)))')).toMatchObject({
      kind: 'stop',
      reason: 'depth-over-cap',
    });

    expect(reduce('\\sqrt{x}e^x')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-algebraic-head',
    });
  });

  it('marks elementary-owned exponentials as outside reduced-equation work', () => {
    expect(reduce('e^{a*x+b}')).toMatchObject({
      kind: 'stop',
      reason: 'elementary-owned',
    });
  });
});
