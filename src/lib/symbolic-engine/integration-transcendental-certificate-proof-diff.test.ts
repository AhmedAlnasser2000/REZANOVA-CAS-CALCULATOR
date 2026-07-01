import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  certificateProofNodeLatex,
  differentiateForCertificateProof,
} from './integration/transcendental-certificate/proof-diff';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function diff(latex: string, variable = 'x') {
  return differentiateForCertificateProof(node(latex), variable);
}

function compact(latex: string) {
  return latex.replace(/\s+/g, '');
}

function structural(value: unknown) {
  return JSON.stringify(value);
}

describe('transcendental Risch certificate proof differentiation', () => {
  it('differentiates exponential quadratic closure without Compute Engine fallback', () => {
    const positive = diff('e^{x^2}');
    const negative = diff('e^{-x^2}');
    const symbolic = diff('e^{a*x^2+b*x+c}');

    for (const result of [positive, negative, symbolic]) {
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') {
        throw new Error('expected proof-safe derivative');
      }
      expect(result.proofSafe).toBe(true);
      expect(result.strategies).not.toContain('compute-engine');
      expect(result.closureHeads).toContain('Power');
    }

    if (positive.kind === 'success') {
      expect(structural(positive.derivativeNode)).toContain('"Power","ExponentialE",["Power","x",2]');
      expect(structural(positive.derivativeNode)).toContain('"x"');
      expect(compact(certificateProofNodeLatex(positive.derivativeNode))).toContain('2x');
    }
    if (negative.kind === 'success') {
      expect(structural(negative.derivativeNode)).toContain('"Power","ExponentialE",["Negate",["Power","x",2]]');
      expect(structural(negative.derivativeNode)).toContain('"Negate"');
    }
    if (symbolic.kind === 'success') {
      const latex = compact(certificateProofNodeLatex(symbolic.derivativeNode));
      expect(latex).toMatch(/(?:e\^\{ax\^2\+bx\+c\}|\\exp\(ax\^2\+bx\+c\))/);
      expect(latex).toContain('2ax');
      expect(latex).toContain('b');
    }
  });

  it('keeps nearby future certificate shapes proof-safe when directly differentiable', () => {
    const logLog = diff('\\ln(\\ln(x))');
    const sineRatio = diff('\\sin(x)/x');
    const erf = diff('\\operatorname{erf}(2x+1)');
    const erfi = diff('\\operatorname{erfi}(2x+1)');
    const si = diff('\\operatorname{Si}(2x+1)');
    const ci = diff('\\operatorname{Ci}(2x+1)');

    for (const result of [logLog, sineRatio, erf, erfi, si, ci]) {
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') {
        throw new Error('expected proof-safe derivative');
      }
      expect(result.strategies).not.toContain('compute-engine');
    }
  });

  it('normalizes Exp head to canonical exponential power before differentiating', () => {
    const result = differentiateForCertificateProof(['Exp', ['Power', 'x', 2]], 'x');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected proof-safe derivative');
    }
    expect(result.normalizedInput).toEqual(['Power', 'ExponentialE', ['Power', 'x', 2]]);
  });

  it('rejects unsafe proof inputs instead of falling back', () => {
    expect(diff('|x|e^{x^2}')).toMatchObject({
      kind: 'stop',
      proofSafe: false,
      reason: 'branch-sensitive',
    });
    expect(diff('2.5e^{x^2}')).toMatchObject({
      kind: 'stop',
      proofSafe: false,
      reason: 'inexact-number',
    });
    expect(differentiateForCertificateProof(['Ei', 'x'], 'x')).toMatchObject({
      kind: 'stop',
      proofSafe: false,
      reason: 'unsupported-head',
    });
    expect(differentiateForCertificateProof(['UnknownHead', 'x'], 'x')).toMatchObject({
      kind: 'stop',
      proofSafe: false,
      reason: 'compute-engine-fallback-required',
    });
  });
});
