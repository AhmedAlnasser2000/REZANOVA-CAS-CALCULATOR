import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { constructRischNormanLrtLogPart } from './integration/risch-norman/lrt-log-part';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function construct(numeratorLatex: string, denominatorLatex: string, variable = 'x') {
  return constructRischNormanLrtLogPart({
    numerator: node(numeratorLatex),
    denominator: node(denominatorLatex),
    variable,
  });
}

function text(result: { exactLatex: string; definitionsLatex: string[] }) {
  return [result.exactLatex, ...result.definitionsLatex].join('\n');
}

describe('Risch-Norman LRT logarithmic-part substrate', () => {
  it('builds named-root logarithmic evidence for a cubic rational residual', () => {
    const result = construct('1', 'x^3+x+1');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected LRT substrate success');
    }

    expect(result.rootDescriptor.degree).toBe(3);
    expect(result.exactLatex).toContain('\\alpha_{1}\\cdot\\ln');
    expect(result.proofEvidence.resultantDefinitionLatex).toContain('\\operatorname{Res}_{x}');
    expect(result.proofEvidence.gcdDefinitionsLatex[0]).toContain('\\gcd');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('accepts target-free symbolic numerator coefficients under the descriptor cap', () => {
    const result = construct('A*x+1', 'x^3+x+1');
    if (result.kind !== 'success') {
      throw new Error(`expected LRT substrate success, got ${JSON.stringify(result)}`);
    }
    expect(result.kind).toBe('success');

    expect(result.resultantPolynomial.degree).toBeLessThanOrEqual(6);
    expect(result.definitionsLatex.join('\n')).toContain('S_{1}\\left(x\\right)');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('stops symbolic cubic denominators before expensive algebraic coefficient work', () => {
    expect(construct('2*x+1', 'x^3+a*x+1')).toMatchObject({
      kind: 'stop',
      reason: 'symbolic-denominator-cap',
    });
  });

  it('stops on non-squarefree denominators before constructing LRT logs', () => {
    expect(construct('1', '(x-1)^3')).toMatchObject({
      kind: 'stop',
      reason: 'non-squarefree-denominator',
    });
  });

  it('stops when bounded resultant construction exceeds the current cap', () => {
    expect(construct('1', 'x^4+x+1')).toMatchObject({
      kind: 'stop',
      reason: 'resultant-stop',
      primitiveReason: 'sylvester-dimension-limit',
    });
  });

  it('rejects improper rational residuals for this substrate', () => {
    expect(construct('x^3+1', 'x^3+x+1')).toMatchObject({
      kind: 'stop',
      reason: 'improper-rational-residual',
    });
  });

  it('adopts supported LRT rational residuals through partial fractions', () => {
    const result = resolveSymbolicIntegralFromLatex('\\frac{1}{x^3+x+1}');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected integration success');
    }

    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.verification.reason).toContain('LRT logarithmic-part');
    expect(result.exactLatex).toContain('\\alpha_{1}\\cdot\\ln');
    expect(result.exactSupplementLatex?.join(' ')).toContain('S_{1}\\left(x\\right)');
  });
});
