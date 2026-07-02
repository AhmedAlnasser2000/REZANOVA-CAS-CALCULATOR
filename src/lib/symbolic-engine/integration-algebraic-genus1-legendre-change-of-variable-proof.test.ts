import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildAlgebraicGenus1LegendreChangeOfVariableProof } from './integration/algebraic-genus1/legendre-change-of-variable-proof';
import { buildAlgebraicGenus1ComplexPairLegendreData } from './integration/algebraic-genus1/complex-pair-legendre-data';
import { buildAlgebraicGenus1RootLegendreData } from './integration/algebraic-genus1/root-legendre-data';

const ce = new ComputeEngine();

function proof(latex: string, variable = 'x') {
  const rootData = buildAlgebraicGenus1RootLegendreData(ce.parse(latex).json, variable);
  return buildAlgebraicGenus1LegendreChangeOfVariableProof(rootData);
}

function complexPairProof(latex: string, variable = 'x') {
  const rootData = buildAlgebraicGenus1ComplexPairLegendreData(ce.parse(latex).json, variable);
  return buildAlgebraicGenus1LegendreChangeOfVariableProof(rootData);
}

function success(latex: string, variable = 'x') {
  const result = proof(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected Legendre change-of-variable proof for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.substitutionLatex,
    result.inverseMapLatex,
    result.parameterLatex,
    result.multiplierLatex,
    result.radicandFactorizationLatex,
    result.differentialIdentityLatex,
    result.firstKindKernelLatex,
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? []).flat().map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 Legendre change-of-variable proof', () => {
  it('proves the three-real-root cubic first-kind kernel identity', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.dataKind).toBe('cubic-three-real-roots');
    expect(result.proofStatus).toBe('change-of-variable-proved');
    expect(result.substitutionLatex).toContain('\\sin^2\\phi');
    expect(result.substitutionLatex).toContain('x-\\alpha_{3}');
    expect(result.radicandFactorizationLatex).toContain('\\left(x-\\alpha_{1}\\right)');
    expect(result.differentialIdentityLatex).toContain('\\frac{dx}{\\sqrt{P\\left(x\\right)}}');
    expect(result.differentialIdentityLatex).toContain('\\frac{d\\phi}{\\sqrt{1-');
    expect(result.differentialIdentityLatex).toContain('\\cdot');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('proves the four-real-root quartic first-kind kernel identity', () => {
    const result = success('\\frac{1}{\\sqrt{(x-1)(x-2)(x-3)(x-4)}}');

    expect(result.dataKind).toBe('quartic-four-real-roots');
    expect(result.substitutionLatex).toContain('\\alpha_{3}-\\alpha_{1}');
    expect(result.substitutionLatex).toContain('x-\\alpha_{2}');
    expect(result.parameterLatex).toContain('\\alpha_{4}-\\alpha_{1}');
    expect(result.radicandFactorizationLatex).toContain('\\left(x-\\alpha_{4}\\right)');
    expect(result.differentialIdentityLatex).toContain('\\frac{dx}{\\sqrt{P\\left(x\\right)}}');
  });

  it('uses the selected variable in the proof identities', () => {
    const result = success('\\frac{1}{\\sqrt{t^3-t}}', 't');

    expect(result.variable).toBe('t');
    expect(result.substitutionLatex).toContain('t-\\alpha_{3}');
    expect(result.inverseMapLatex).toContain('t=');
    expect(result.differentialIdentityLatex).toContain('\\frac{dt}{\\sqrt{P\\left(t\\right)}}');
  });

  it('proves the one-real-root cubic complex-pair first-kind kernel identity', () => {
    const result = complexPairProof('\\frac{1}{\\sqrt{x^3+x+1}}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected complex-pair change-of-variable proof');
    }
    expect(result.dataKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.proofStatus).toBe('change-of-variable-proved');
    expect(result.substitutionLatex).toContain('\\tan^2\\left(\\frac{\\phi}{2}\\right)');
    expect(result.substitutionLatex).toContain('x-\\alpha_{1}');
    expect(result.radicandFactorizationLatex).toContain('Q_{\\alpha_{1}}\\left(x\\right)');
    expect(result.inverseMapLatex).toContain('\\tan^2\\left(\\frac{\\phi}{2}\\right)');
    expect(result.differentialIdentityLatex).toContain('\\frac{dx}{\\sqrt{P\\left(x\\right)}}');
    expect(result.differentialIdentityLatex).toContain('\\cdot');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('still stops root-only Legendre proof when the real-root chart is absent', () => {
    const result = proof('\\frac{1}{\\sqrt{x^3+x+1}}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'root-legendre-stop',
    });
  });
});
