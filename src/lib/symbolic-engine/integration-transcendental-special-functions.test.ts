import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { proveExpQuadraticNonElementary } from './integration/transcendental-certificate/proof';
import {
  buildDepth2ExpCompositionSpecialFunctionCertificate,
  buildEiLiAffineSpecialFunctionCertificate,
  buildExpQuadraticSpecialFunctionCertificateFromProof,
  buildSiCiAffineQuotientSpecialFunctionCertificate,
} from './integration/transcendental-certificate/special-functions';

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

function depth2Certificate(latex: string, variable = 'x') {
  const result = buildSiCiAffineQuotientSpecialFunctionCertificate(ce.parse(latex).json, variable);
  if (!result) {
    throw new Error(`expected depth-2 special-function certificate for ${latex}`);
  }
  return result;
}

function eiLiCertificate(latex: string, variable = 'x') {
  const result = buildEiLiAffineSpecialFunctionCertificate(ce.parse(latex).json, variable);
  if (!result) {
    throw new Error(`expected Ei/li special-function certificate for ${latex}`);
  }
  return result;
}

function compositionCertificate(latex: string, variable = 'x') {
  const result = buildDepth2ExpCompositionSpecialFunctionCertificate(ce.parse(latex).json, variable);
  if (!result) {
    throw new Error(`expected depth-2 composition special-function certificate for ${latex}`);
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
    expect(symbolic.detailSections.map((section) => section.title)).toContain('Input Facts');
    expect(symbolic.detailSections.map((section) => section.title)).toContain('Proof Obligations');
    expect(symbolic.detailSections.find((section) => section.title === 'Input Facts')?.lines.join(' '))
      .toContain('a\\ne0');
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

describe('transcendental special-function readback for Si/Ci quotient families', () => {
  it('returns sine-integral formulas for affine sine quotients', () => {
    const plain = depth2Certificate('\\sin(x)/x');
    const scaled = depth2Certificate('\\sin(2x+1)/(2x+1)');
    const derivativePresent = depth2Certificate('2\\sin(2x+1)/(2x+1)');

    expect(plain.antiderivativeKind).toBe('special-function');
    expect(plain.exactLatex).toContain(String.raw`\operatorname{Si}\left(x\right)`);
    expect(plain.exactSupplementLatex?.join(' ')).toContain('x\\ne0');
    expect(scaled.exactLatex).toContain(String.raw`\frac{1}{2}\cdot \operatorname{Si}\left(2x+1\right)`);
    expect(derivativePresent.exactLatex).toBe(String.raw`\operatorname{Si}\left(2x+1\right)`);
    expect(plain.detailSections.map((section) => section.title)).toContain('Non-Elementary Certificate');
    expect(plain.detailSections.map((section) => section.title)).toContain('Special-Function Readback');
    expect(plain.detailSections.map((section) => section.title)).toContain('Branch Facts');
    expect(plain.detailSections.map((section) => section.title)).toContain('Proof Obligations');
    expect(plain.detailSections.find((section) => section.title === 'Branch Facts')?.lines.join(' '))
      .toContain('x\\ne0');
  });

  it('returns real-branch cosine-integral formulas for affine cosine quotients', () => {
    const plain = depth2Certificate('\\cos(x)/x');
    const shifted = depth2Certificate('\\cos(2x+1)/(2x+1)');

    expect(plain.antiderivativeKind).toBe('special-function');
    expect(plain.exactLatex).toContain('\\begin{cases}');
    expect(plain.exactLatex).toContain(String.raw`\operatorname{Ci}\left(x\right)`);
    expect(plain.exactLatex).toContain(String.raw`\operatorname{Ci}\left(-x\right)`);
    expect(plain.exactLatex).toContain('x>0');
    expect(plain.exactLatex).toContain('x<0');
    expect(plain.exactSupplementLatex?.join(' ')).toContain('x\\ne0');
    expect(shifted.exactLatex).toContain(String.raw`\frac{1}{2}\cdot \operatorname{Ci}\left(2x+1\right)`);
    expect(shifted.exactLatex).toContain('2x+1>0');
    expect(shifted.exactLatex).toContain('2x+1<0');
  });
});

describe('transcendental special-function readback for Ei/li quotient families', () => {
  it('returns exponential-integral formulas for affine exponential quotients', () => {
    const plain = eiLiCertificate('e^x/x');
    const shifted = eiLiCertificate('e^{2x+1}/(2x+1)');
    const derivativePresent = eiLiCertificate('2e^{2x+1}/(2x+1)');

    expect(plain.antiderivativeKind).toBe('special-function');
    expect(plain.exactLatex).toContain('\\begin{cases}');
    expect(plain.exactLatex).toContain(String.raw`\operatorname{Ei}\left(x\right)`);
    expect(plain.exactLatex).toContain('x>0');
    expect(plain.exactLatex).toContain('x<0');
    expect(plain.exactSupplementLatex?.join(' ')).toContain('x\\ne0');
    expect(shifted.exactLatex).toContain(String.raw`\frac{1}{2}\cdot \operatorname{Ei}\left(2x+1\right)`);
    expect(derivativePresent.exactLatex).toContain(String.raw`\operatorname{Ei}\left(2x+1\right)`);
    expect(plain.detailSections.map((section) => section.title)).toContain('Non-Elementary Certificate');
    expect(plain.detailSections.map((section) => section.title)).toContain('Branch Facts');
    expect(plain.detailSections.map((section) => section.title)).toContain('Proof Obligations');
    expect(plain.detailSections.find((section) => section.title === 'Branch Facts')?.lines.join(' '))
      .toContain('x\\ne0');
  });

  it('returns logarithmic-integral formulas for affine logarithmic reciprocals', () => {
    const plain = eiLiCertificate('1/\\ln(x)');
    const shifted = eiLiCertificate('1/\\ln(2x+1)');

    expect(plain.antiderivativeKind).toBe('special-function');
    expect(plain.exactLatex).toContain('\\begin{cases}');
    expect(plain.exactLatex).toContain(String.raw`\operatorname{li}\left(x\right)`);
    expect(plain.exactLatex).toContain('x>1');
    expect(plain.exactLatex).toContain('0<x<1');
    expect(plain.exactSupplementLatex?.join(' ')).toContain('x>0');
    expect(plain.exactSupplementLatex?.join(' ')).toContain('\\ln\\left(x\\right)\\ne0');
    expect(shifted.exactLatex).toContain(String.raw`\frac{1}{2}\cdot \operatorname{li}\left(2x+1\right)`);
    expect(shifted.exactLatex).toContain('2x+1>1');
    expect(shifted.exactLatex).toContain('0<2x+1<1');
  });
});

describe('transcendental special-function readback for depth-2 exponential compositions', () => {
  it('returns Ei, Si, and Ci formulas after the exponential substitution', () => {
    const expExp = compositionCertificate('e^{e^x}');
    const sine = compositionCertificate('\\sin(e^x)');
    const cosine = compositionCertificate('\\cos(e^x)');

    expect(expExp.antiderivativeKind).toBe('special-function');
    expect(expExp.exactLatex).toBe(String.raw`\operatorname{Ei}\left(e^{x}\right)`);
    expect(sine.exactLatex).toBe(String.raw`\operatorname{Si}\left(e^{x}\right)`);
    expect(cosine.exactLatex).toBe(String.raw`\operatorname{Ci}\left(e^{x}\right)`);
    expect(expExp.exactSupplementLatex?.join(' ')).toContain('e^{x}>0');
    expect(expExp.detailSections.map((section) => section.title)).toContain('Branch Facts');
    expect(expExp.detailSections.map((section) => section.title)).toContain('Proof Obligations');
  });

  it('carries exact affine-slope prefactors and arbitrary selected variables', () => {
    const scaled = compositionCertificate('\\sin(e^{2x+1})');
    const derivativeScaled = compositionCertificate('2\\sin(e^{2x+1})');
    const symbolicSlope = compositionCertificate('\\cos(e^{a*t+x})', 't');

    expect(scaled.exactLatex).toBe(String.raw`\frac{1}{2}\cdot \operatorname{Si}\left(e^{2x+1}\right)`);
    expect(derivativeScaled.exactLatex).toBe(String.raw`\operatorname{Si}\left(e^{2x+1}\right)`);
    expect(symbolicSlope.exactLatex).toBe(String.raw`\frac{1}{a}\cdot \operatorname{Ci}\left(e^{at+x}\right)`);
    expect(symbolicSlope.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(symbolicSlope.exactSupplementLatex?.join(' ')).toContain('e^{at+x}>0');
  });
});

describe('transcendental Fresnel readiness boundary', () => {
  it('keeps quadratic sine/cosine Fresnel integrals deferred for now', () => {
    const sine = resolveSymbolicIntegralFromLatex('\\sin(x^2)');
    const cosine = resolveSymbolicIntegralFromLatex('\\cos(x^2)');

    expect(sine.kind).toBe('error');
    expect(cosine.kind).toBe('error');
  });
});
