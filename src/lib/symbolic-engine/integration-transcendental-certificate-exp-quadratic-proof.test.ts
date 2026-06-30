import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { proveExpQuadraticNonElementary } from './integration/transcendental-certificate/proof';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function prove(latex: string, variable = 'x') {
  return proveExpQuadraticNonElementary(node(latex), variable);
}

function compact(latex: string) {
  return latex.replace(/\s+/g, '');
}

describe('transcendental Risch exp-quadratic proof evidence', () => {
  it('proves exact-rational quadratic exponential candidates without live adoption', () => {
    const cases = [
      prove('e^{x^2}'),
      prove('e^{-x^2}'),
      prove('e^{2*x^2+3*x+1}'),
    ];

    for (const result of cases) {
      expect(result.kind).toBe('proof-ready');
      if (result.kind !== 'proof-ready') {
        throw new Error('expected proof-ready exp-quadratic certificate');
      }
      expect(result.family).toBe('exp-quadratic');
      expect(result.theorem).toBe('quadratic-exponential-liouville-obstruction');
      expect(result.exponentDifferentiation.strategies).not.toContain('compute-engine');
      expect(result.integrandDifferentiation.strategies).not.toContain('compute-engine');
      expect(result.requiredFacts).toEqual([]);
      expect(result.proofDetails.map((section) => section.title)).toEqual([
        'Certificate Proof Evidence',
        'Liouville Obstruction',
      ]);
      expect(result.proofDetails[0]?.lines.join(' ')).toContain('auxiliary rational function');
      expect(result.proofDetails[0]?.lines.join(' ')).toContain('Required equation');
      expect(result.proofDetails[1]?.lines.join(' ')).toContain('not a condition on the original input');
      expect(result.liouvilleEquationLatex).toContain('= 1');
    }
  });

  it('proves target-free symbolic quadratic exponential candidates with leading facts', () => {
    const result = prove('e^{a*x^2+b*x+c}');

    expect(result.kind).toBe('proof-ready');
    if (result.kind !== 'proof-ready') {
      throw new Error('expected proof-ready symbolic exp-quadratic certificate');
    }

    expect(result.variable).toBe('x');
    expect(result.fieldDescriptor).toMatchObject({
      base: 'target-free-coefficient-field',
      extension: 'e^q',
      selectedVariable: 'x',
    });
    expect(result.requiredFacts.map((fact) => `${fact.expressionLatex}${fact.relation}`)).toContain('a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(compact(result.exponentDerivativeLatex)).toContain('2ax');
    expect(compact(result.exponentDerivativeLatex)).toContain('b');
    expect(result.proofSummary).toContain('Liouville');
  });

  it('keeps arbitrary selected-variable support in proof evidence', () => {
    const result = prove('e^{a*t^2+x*t+b}', 't');

    expect(result.kind).toBe('proof-ready');
    if (result.kind !== 'proof-ready') {
      throw new Error('expected proof-ready t-quadratic certificate');
    }
    expect(result.variable).toBe('t');
    expect(result.fieldDescriptor.selectedVariable).toBe('t');
    expect(result.requiredFacts.map((fact) => `${fact.expressionLatex}${fact.relation}`)).toContain('a\\ne0');
    expect(result.exponentLatex).toContain('t');
  });

  it('stops elementary-owned affine exponential cases before certificate proof', () => {
    expect(prove('e^{a*x+b}')).toMatchObject({
      kind: 'stop',
      reason: 'elementary-owned',
    });
  });

  it('preserves profile stop reasons for unsafe or future-scope towers', () => {
    expect(prove('e^{x^3}')).toMatchObject({
      kind: 'stop',
      reason: 'polynomial-degree-over-certificate-scope',
    });
    expect(prove('e^{\\sin(x)}')).toMatchObject({
      kind: 'stop',
      reason: 'nested-transcendental-tower',
    });
    expect(prove('|x|e^{x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive',
    });
    expect(prove('e^{2.5*x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'inexact-coefficient',
    });
  });
});
