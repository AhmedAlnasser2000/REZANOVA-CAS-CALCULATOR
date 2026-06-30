import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { proveExpQuadraticNonElementary } from './integration/transcendental-certificate/proof';
import { buildExpQuadraticSpecialFunctionCertificateFromProof } from './integration/transcendental-certificate/special-functions';

const ce = new ComputeEngine();

function certificate(latex: string, variable = 'x') {
  const proof = proveExpQuadraticNonElementary(ce.parse(latex).json, variable);
  if (proof.kind !== 'proof-ready') {
    throw new Error(`expected proof-ready certificate for ${latex}`);
  }
  const result = buildExpQuadraticSpecialFunctionCertificateFromProof(proof);
  if (!result) {
    throw new Error(`expected special-function certificate for ${latex}`);
  }
  return result;
}

describe('transcendental special-function readback for quadratic exponentials', () => {
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

  it('returns casewise erf and erfi formulas for symbolic leading coefficients', () => {
    const symbolic = certificate('e^{a*x^2+b*x+c}');

    expect(symbolic.antiderivativeKind).toBe('special-function');
    expect(symbolic.exactLatex).toContain('\\begin{cases}');
    expect(symbolic.exactLatex).toContain('\\operatorname{erf}');
    expect(symbolic.exactLatex).toContain('\\operatorname{erfi}');
    expect(symbolic.exactLatex).toContain('a<0');
    expect(symbolic.exactLatex).toContain('a>0');
    expect(symbolic.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(symbolic.detailSections.map((section) => section.title)).toContain('Non-Elementary Certificate');
  });

  it('honors arbitrary selected variables in symbolic casewise formulas', () => {
    const symbolic = certificate('e^{a*t^2+x*t+b}', 't');

    expect(symbolic.exactLatex).toContain('\\begin{cases}');
    expect(symbolic.exactLatex).toContain('\\operatorname{erf}');
    expect(symbolic.exactLatex).toContain('\\operatorname{erfi}');
    expect(symbolic.exactLatex).toContain('t+\\frac{x}{2a}');
    expect(symbolic.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
  });
});
