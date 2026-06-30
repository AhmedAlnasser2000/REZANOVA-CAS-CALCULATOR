import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { proveExpQuadraticNonElementary } from './integration/transcendental-certificate/proof';
import { buildExpQuadraticSpecialFunctionCertificateFromProof } from './integration/transcendental-certificate/special-functions';

const ce = new ComputeEngine();

function certificate(latex: string) {
  const proof = proveExpQuadraticNonElementary(ce.parse(latex).json, 'x');
  if (proof.kind !== 'proof-ready') {
    throw new Error(`expected proof-ready certificate for ${latex}`);
  }
  const result = buildExpQuadraticSpecialFunctionCertificateFromProof(proof);
  if (!result) {
    throw new Error(`expected special-function certificate for ${latex}`);
  }
  return result;
}

describe('transcendental special-function readback for exact quadratic exponentials', () => {
  it('returns erf and erfi formulas for exact-rational quadratic exponentials', () => {
    const positive = certificate('e^{x^2}');
    const negative = certificate('e^{-x^2}');
    const shifted = certificate('e^{-(2x+1)^2}');

    expect(positive.antiderivativeKind).toBe('special-function');
    expect(positive.exactLatex).toContain(String.raw`\frac{\sqrt{\pi}}{2}\cdot \operatorname{erfi}\left(x\right)`);
    expect(negative.exactLatex).toContain(String.raw`\frac{\sqrt{\pi}}{2}\cdot \operatorname{erf}\left(x\right)`);
    expect(shifted.exactLatex).toContain(String.raw`\frac{\sqrt{\pi}}{4}\cdot \operatorname{erf}\left(2x+1\right)`);
    expect(positive.detailSections.map((section) => section.title)).toContain('Non-Elementary Certificate');
    expect(positive.detailSections.map((section) => section.title)).toContain('Special-Function Readback');
  });

  it('keeps symbolic leading coefficients out of the exact-rational formula slice', () => {
    const proof = proveExpQuadraticNonElementary(ce.parse('e^{a*x^2+b*x+c}').json, 'x');
    expect(proof.kind).toBe('proof-ready');
    if (proof.kind !== 'proof-ready') {
      throw new Error('expected proof-ready symbolic certificate');
    }
    expect(buildExpQuadraticSpecialFunctionCertificateFromProof(proof)).toBeUndefined();
  });
});
