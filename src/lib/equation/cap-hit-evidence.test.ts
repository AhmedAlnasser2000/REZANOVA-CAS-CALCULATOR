import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';

import {
  isolateSelectedTargetEquation,
  solveSelectedTargetIsolationEquation,
} from './equation-selected-target-isolation';
import { solveEquationAlgebraicIsolation } from './equation-algebraic-isolation';
import { createEquationSelectedTargetSearchTrace } from './equation-target-shape';
import {
  generateNestedCompositionBranchesForChain,
  matchSelectedCompositionCarrierChain,
} from './composition/core';
import { solveParameterizedCompositionEquation } from './parameterized/composition';
import { solveParameterizedFactorablePolynomialEquation } from './parameterized/factorable-polynomial';
import { solveParameterizedMixedAlgebraicEquation } from './parameterized/mixed-algebraic';
import { solveParameterizedPolynomialEquation } from './parameterized/polynomial';
import { solveParameterizedRationalEquation } from './parameterized/rational';
import {
  multiplySymbolicPolynomials,
  symbolicPolynomialFromDegree,
} from './parameterized/symbolic-polynomial';

type CapHitClassification =
  | 'recalibration-candidate'
  | 'algorithm-boundary'
  | 'readback-boundary'
  | 'semantic-boundary'
  | 'static-guard';

type CapHitEvidence = {
  cap: string;
  classification: CapHitClassification;
  observed: string;
  fixture: string;
  recommendation: string;
};

const CAP_HIT_EVIDENCE = [
  {
    cap: 'selected-target-peel-depth',
    classification: 'recalibration-candidate',
    observed: 'isolation-depth-limit',
    fixture: 'configured maxPeels=0 sentinel',
    recommendation: 'collect real default-depth hits before raising peel depth',
  },
  {
    cap: 'selected-target-compact-formula-length',
    classification: 'readback-boundary',
    observed: 'isolated equation fallback',
    fixture: 'configured compactTargetMaxLatexLength=1 sentinel',
    recommendation: 'treat as readback/display safety, not search power',
  },
  {
    cap: 'symbolic-polynomial-degree',
    classification: 'algorithm-boundary',
    observed: 'degree-limit / target-power',
    fixture: 'degree-3 symbolic target polynomial',
    recommendation: 'wait for higher-degree algorithms or factoring',
  },
  {
    cap: 'rational-cleared-degree',
    classification: 'algorithm-boundary',
    observed: 'cleared-degree-limit',
    fixture: 'three target denominators',
    recommendation: 'wait for higher-degree closure after LCD clearing',
  },
  {
    cap: 'factorable-polynomial-degree',
    classification: 'readback-boundary',
    observed: 'explicit/expanded target-degree-limit',
    fixture: 'thirteen explicit or expanded linear factors',
    recommendation: 'keep the 12-slot explicit-product cap until readback evidence supports widening',
  },
  {
    cap: 'algebraic-power-degree',
    classification: 'algorithm-boundary',
    observed: 'unsupported-power-degree',
    fixture: 'selected-target fifth power',
    recommendation: 'do not raise without new algebraic-power semantics',
  },
  {
    cap: 'formula-size-readback',
    classification: 'readback-boundary',
    observed: 'formula-size-limit',
    fixture: 'general symbolic cubic',
    recommendation: 'keep as truth/readability protection',
  },
  {
    cap: 'mixed-carrier-count',
    classification: 'semantic-boundary',
    observed: 'branch-limit',
    fixture: 'three independent square-root carriers',
    recommendation: 'requires mixed-carrier capability work',
  },
  {
    cap: 'mixed-generated-branch-count',
    classification: 'static-guard',
    observed: 'MAX_GENERATED_BRANCHES source guard',
    fixture: 'source guard; earlier carrier-count cap usually stops first',
    recommendation: 'do not force test-only production exports',
  },
  {
    cap: 'composition-depth',
    classification: 'semantic-boundary',
    observed: 'nested-composition',
    fixture: 'three selected-target composition layers',
    recommendation: 'requires composition capability work',
  },
  {
    cap: 'composition-generated-branch-count',
    classification: 'recalibration-candidate',
    observed: 'branch-limit',
    fixture: 'configured maxGeneratedBranches=1 sentinel',
    recommendation: 'collect real default branch-count hits before raising',
  },
  {
    cap: 'composition-periodic-parameter-count',
    classification: 'semantic-boundary',
    observed: 'branch-limit',
    fixture: 'configured maxPeriodicParameters=1 sentinel',
    recommendation: 'requires exact periodic-family semantics',
  },
] as const satisfies readonly CapHitEvidence[];

const symbolicMessages = {
  targetInDenominator: {
    reason: 'target-in-denominator' as const,
    message: 'target denominator',
  },
  degreeLimit: {
    reason: 'degree-limit' as const,
    message: 'degree limit',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation' as const,
    message: 'unsupported expression',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-power' as const,
    message: 'unsupported power',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-family' as const,
    message: 'unsupported family',
  },
};

const ce = new ComputeEngine();

function expectUnsupportedReason(
  result: { kind: 'success' } | { kind: 'unsupported'; reason: string; message: string },
  reason: string,
) {
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error('Expected unsupported result');
  }
  expect(result.reason).toBe(reason);
  return result;
}

function expectCompositionChain(latex: string) {
  const json = ce.parse(latex).json;
  const chain = matchSelectedCompositionCarrierChain(json, 'z');
  expect(chain.kind).toBe('matched');
  if (chain.kind !== 'matched') {
    throw new Error(`Expected composition chain, received ${chain.kind}`);
  }
  return chain;
}

describe('Equation cap-hit evidence', () => {
  it('keeps an explicit evidence matrix for every audited cap family', () => {
    expect(CAP_HIT_EVIDENCE.map((entry) => entry.cap)).toEqual([
      'selected-target-peel-depth',
      'selected-target-compact-formula-length',
      'symbolic-polynomial-degree',
      'rational-cleared-degree',
      'factorable-polynomial-degree',
      'algebraic-power-degree',
      'formula-size-readback',
      'mixed-carrier-count',
      'mixed-generated-branch-count',
      'composition-depth',
      'composition-generated-branch-count',
      'composition-periodic-parameter-count',
    ]);
    expect(new Set(CAP_HIT_EVIDENCE.map((entry) => entry.classification))).toEqual(new Set([
      'recalibration-candidate',
      'algorithm-boundary',
      'readback-boundary',
      'semantic-boundary',
      'static-guard',
    ]));
  });

  it('records selected-target peel depth as a configured cap-path sentinel', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = solveSelectedTargetIsolationEquation('z+a=b', 'z', 'rad', {
      allowGeneratedImplicitProducts: true,
      maxPeels: 0,
      searchTrace: trace.record,
    });

    expectUnsupportedReason(result, 'isolation-depth-limit');
    expect(trace.events).toContainEqual({
      kind: 'final-stop',
      phase: 'generated-handoff',
      reason: 'isolation-depth-limit',
    });
  });

  it('records compact formula length as readback fallback, not solver expansion', () => {
    const result = isolateSelectedTargetEquation('a(x+b)^4+c=d', 'x', 'rad', {
      allowGeneratedImplicitProducts: true,
      compactTargetMaxLatexLength: 1,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(`Expected isolation success, received ${result.reason}: ${result.message}`);
    }
    expect(result.exactLatex).toBe(result.generatedEquationLatex);
    expect(result.exactLatex).not.toContain('x=');
  });

  it('classifies symbolic polynomial degree as an algorithm boundary', () => {
    const quadratic = symbolicPolynomialFromDegree(2, 1);
    const linear = symbolicPolynomialFromDegree(1, 1);
    const seamResult = multiplySymbolicPolynomials(quadratic, linear, symbolicMessages.degreeLimit);
    const solverResult = solveParameterizedPolynomialEquation('z^3+a=0', 'z');

    expect(seamResult).toEqual({
      kind: 'unsupported',
      reason: 'degree-limit',
      message: 'degree limit',
    });
    expectUnsupportedReason(solverResult, 'target-power');
  });

  it('keeps rational, factorable, and algebraic degree boundaries explicit', () => {
    const rational = solveParameterizedRationalEquation(
      '\\frac{1}{z-a}+\\frac{1}{z-b}+\\frac{1}{z-c}=d',
      'z',
    );
    const factorableUnderCap = solveParameterizedFactorablePolynomialEquation(
      '(z-a)(z-b)(z-c)(z-d)(z-f)=0',
      'z',
    );
    const factorableOverCap = solveParameterizedFactorablePolynomialEquation(
      '(z-a)(z-b)(z-c)(z-d)(z-f)(z-g)(z-h)(z-j)(z-k)(z-l)(z-m)(z-n)(z-p)=0',
      'z',
    );
    const expandedFactorableUnderCap = solveParameterizedFactorablePolynomialEquation(
      'z^5-15z^4+85z^3-225z^2+274z-120=0',
      'z',
    );
    const expandedFactorableOverCap = solveParameterizedFactorablePolynomialEquation(
      'z^{13}-91z^{12}+3731z^{11}-91091z^{10}+1474473z^9-16669653z^8+'
      + '135036473z^7-790943153z^6+3336118786z^5-9957703756z^4+'
      + '20313753096z^3-26596717056z^2+19802759040z-6227020800=0',
      'z',
    );
    const algebraicPower = solveEquationAlgebraicIsolation('x^5=a', 'x', {
      allowGeneratedImplicitProducts: true,
    });

    expectUnsupportedReason(rational, 'cleared-degree-limit');
    expect(factorableUnderCap.kind).toBe('success');
    expectUnsupportedReason(factorableOverCap, 'degree-limit');
    expect(expandedFactorableUnderCap.kind).toBe('success');
    expectUnsupportedReason(expandedFactorableOverCap, 'degree-limit');
    expectUnsupportedReason(algebraicPower, 'unsupported-power-degree');
  });

  it('keeps formula-size caps as readback boundaries', () => {
    const result = solveEquationAlgebraicIsolation('a x^3+b x+c=0', 'x', {
      allowGeneratedImplicitProducts: true,
    });

    expectUnsupportedReason(result, 'formula-size-limit');
  });

  it('classifies mixed algebraic carrier breadth separately from branch-count source guards', () => {
    const result = solveParameterizedMixedAlgebraicEquation(
      '\\sqrt{z+a}+\\sqrt{z+b}+\\sqrt{z+c}=d',
      'z',
    );
    const branchGuard = CAP_HIT_EVIDENCE.find((entry) =>
      entry.cap === 'mixed-generated-branch-count');

    expectUnsupportedReason(result, 'branch-limit');
    expect(branchGuard).toMatchObject({
      classification: 'static-guard',
      observed: 'MAX_GENERATED_BRANCHES source guard',
    });
  });

  it('keeps composition depth and configured branch caps visible', () => {
    const depth = solveParameterizedCompositionEquation(
      '\\sin\\left(\\sqrt{\\left|z-a\\right|}\\right)=b',
      'z',
      'rad',
    );
    const chain = expectCompositionChain('\\sin\\left(\\tan\\left(z\\right)\\right)');
    const generatedBranchCap = generateNestedCompositionBranchesForChain(
      chain.carriers,
      'a',
      'z',
      'rad',
      { maxGeneratedBranches: 1 },
    );
    const periodicParameterCap = generateNestedCompositionBranchesForChain(
      chain.carriers,
      'a',
      'z',
      'rad',
      { maxPeriodicParameters: 1 },
    );

    expectUnsupportedReason(depth, 'nested-composition');
    expect(generatedBranchCap).toMatchObject({
      kind: 'unsupported',
      reason: 'branch-limit',
    });
    expect(periodicParameterCap).toMatchObject({
      kind: 'unsupported',
      reason: 'branch-limit',
    });
  });

  it('keeps the current two-periodic composition case under the default caps', () => {
    const result = solveParameterizedCompositionEquation(
      '\\sin\\left(\\tan\\left(z\\right)\\right)=a',
      'z',
      'rad',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(`Expected composition success, received ${result.reason}: ${result.message}`);
    }
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.exactSupplementLatex).toContain('m\\in\\mathbb{Z}');
  });
});
