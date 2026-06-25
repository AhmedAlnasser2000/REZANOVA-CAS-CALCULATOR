import { ComputeEngine } from '@cortex-js/compute-engine';
import { afterEach, describe, expect, it } from 'vitest';
import { setNumericOutputSettings } from '../../display/numeric-output';
import {
  buildSharedCompositionBranchSet,
  compositionLatexForNode,
  countSelectedCompositionCarriers,
  generateCompositionBranchesForCarrier,
  generateNestedCompositionBranchesForChain,
  hasCompositionTarget,
  matchSelectedCompositionCarrierChain,
  matchSelectedCompositionCarrier,
  resolveCompositionRecursionDepth,
  type CompositionMathJson,
} from './core';

const ce = new ComputeEngine();

function parseExpression(latex: string) {
  return ce.parse(latex).json as CompositionMathJson;
}

afterEach(() => {
  setNumericOutputSettings({
    approxDigits: 6,
    numericNotationMode: 'decimal',
    scientificNotationStyle: 'times10',
  });
});

describe('composition-core', () => {
  it('detects selected-target carrier counts without assuming x', () => {
    const oneLayer = parseExpression('\\sqrt{z^2+a}');
    expect(hasCompositionTarget(oneLayer, 'z')).toBe(true);
    expect(countSelectedCompositionCarriers(oneLayer, 'z')).toBe(1);

    const nested = parseExpression('\\sqrt{\\left|z-a\\right|}');
    expect(countSelectedCompositionCarriers(nested, 'z')).toBe(2);

    const oddPower = parseExpression('\\left(z^3+z+1\\right)^3');
    expect(hasCompositionTarget(oddPower, 'z')).toBe(true);

    const evenPower = parseExpression('\\left(z^3+z+1\\right)^4');
    expect(hasCompositionTarget(evenPower, 'z')).toBe(true);

    const nthRoot = parseExpression('\\sqrt[3]{z^3+z+1}');
    expect(hasCompositionTarget(nthRoot, 'z')).toBe(true);
    expect(countSelectedCompositionCarriers(nthRoot, 'z')).toBe(1);
  });

  it('matches one selected-target carrier and generates branch equations', () => {
    const carrierSide = parseExpression('\\sin\\left(z^2+a\\right)');
    const match = matchSelectedCompositionCarrier(carrierSide, 'z');

    expect(match.kind).toBe('matched');
    if (match.kind !== 'matched') {
      return;
    }

    const generated = generateCompositionBranchesForCarrier(
      match.carrier,
      parseExpression('b'),
      'rad',
    );

    expect(generated.kind).toBe('ok');
    if (generated.kind !== 'ok') {
      return;
    }
    expect(generated.equations).toEqual([
      'z^2+a=\\arcsin(b)+2\\pi n',
      'z^2+a=\\pi-\\arcsin(b)+2\\pi n',
    ]);
    expect(generated.facts).toEqual(['-1\\le b\\le1', 'n\\in\\mathbb{Z}']);
  });

  it('matches odd-power selected-target carriers with real root branches', () => {
    const carrierSide = parseExpression('\\left(z^3+z+1\\right)^5');
    const match = matchSelectedCompositionCarrier(carrierSide, 'z');

    expect(match.kind).toBe('matched');
    if (match.kind !== 'matched') {
      return;
    }
    expect(match.carrier.kind).toBe('odd-power');
    expect(match.carrier.exponent).toBe(5);

    const generated = generateCompositionBranchesForCarrier(
      match.carrier,
      parseExpression('a+c'),
      'rad',
    );

    expect(generated.kind).toBe('ok');
    if (generated.kind !== 'ok') {
      return;
    }
    expect(generated.equations).toEqual(['z^3+z+1=\\sqrt[5]{a+c}']);
    expect(generated.facts).toEqual([]);

    const negative = generateCompositionBranchesForCarrier(
      match.carrier,
      parseExpression('-1'),
      'rad',
    );
    expect(negative).toMatchObject({
      kind: 'ok',
      equations: ['z^3+z+1=-1'],
      facts: [],
    });
  });

  it('matches higher even-power selected-target carriers with real even-root branches', () => {
    const carrierSide = parseExpression('\\left(z^3+z+1\\right)^6');
    const match = matchSelectedCompositionCarrier(carrierSide, 'z');

    expect(match.kind).toBe('matched');
    if (match.kind !== 'matched') {
      return;
    }
    expect(match.carrier.kind).toBe('even-power');
    expect(match.carrier.exponent).toBe(6);

    const generated = generateCompositionBranchesForCarrier(
      match.carrier,
      parseExpression('a+c'),
      'rad',
    );

    expect(generated.kind).toBe('ok');
    if (generated.kind !== 'ok') {
      return;
    }
    expect(generated.equations).toEqual([
      'z^3+z+1=\\sqrt[6]{a+c}',
      'z^3+z+1=-\\sqrt[6]{a+c}',
    ]);
    expect(generated.facts).toEqual(['a+c\\ge0']);

    const zero = generateCompositionBranchesForCarrier(
      match.carrier,
      parseExpression('0'),
      'rad',
    );
    expect(zero).toMatchObject({
      kind: 'ok',
      equations: ['z^3+z+1=0'],
      facts: [],
    });

    const negative = generateCompositionBranchesForCarrier(
      match.carrier,
      parseExpression('-1'),
      'rad',
    );
    expect(negative).toMatchObject({
      kind: 'unsupported',
      reason: 'domain-empty',
      message: 'No real selected-target solution remains because even powers are nonnegative.',
    });
  });

  it('matches nth-root selected-target carriers with real power branches', () => {
    const oddCarrierSide = parseExpression('\\sqrt[3]{z^3+z+1}');
    const oddMatch = matchSelectedCompositionCarrier(oddCarrierSide, 'z');

    expect(oddMatch.kind).toBe('matched');
    if (oddMatch.kind !== 'matched') {
      return;
    }
    expect(oddMatch.carrier.kind).toBe('nth-root');
    expect(oddMatch.carrier.exponent).toBe(3);

    const oddGenerated = generateCompositionBranchesForCarrier(
      oddMatch.carrier,
      parseExpression('a+c'),
      'rad',
    );

    expect(oddGenerated.kind).toBe('ok');
    if (oddGenerated.kind !== 'ok') {
      return;
    }
    expect(oddGenerated.equations).toEqual(['z^3+z+1=(a+c)^3']);
    expect(oddGenerated.facts).toEqual([]);

    const oddNegative = generateCompositionBranchesForCarrier(
      oddMatch.carrier,
      parseExpression('-1'),
      'rad',
    );
    expect(oddNegative).toMatchObject({
      kind: 'ok',
      equations: ['z^3+z+1=-1'],
      facts: [],
    });

    const evenCarrierSide = parseExpression('\\sqrt[4]{z^4+z+1}');
    const evenMatch = matchSelectedCompositionCarrier(evenCarrierSide, 'z');

    expect(evenMatch.kind).toBe('matched');
    if (evenMatch.kind !== 'matched') {
      return;
    }
    expect(evenMatch.carrier.kind).toBe('nth-root');
    expect(evenMatch.carrier.exponent).toBe(4);

    const evenGenerated = generateCompositionBranchesForCarrier(
      evenMatch.carrier,
      parseExpression('b'),
      'rad',
    );

    expect(evenGenerated.kind).toBe('ok');
    if (evenGenerated.kind !== 'ok') {
      return;
    }
    expect(evenGenerated.equations).toEqual(['z^4+z+1=b^4']);
    expect(evenGenerated.facts).toEqual(['b\\ge0']);

    const evenNegative = generateCompositionBranchesForCarrier(
      evenMatch.carrier,
      parseExpression('-1'),
      'rad',
    );
    expect(evenNegative).toMatchObject({
      kind: 'unsupported',
      reason: 'domain-empty',
      message: 'No real selected-target solution remains because even-index root outputs are nonnegative.',
    });
  });

  it('matches two-layer selected-target carrier chains and generates nested branches', () => {
    const carrierSide = parseExpression('\\sin\\left(\\tan\\left(z\\right)\\right)');
    const chain = matchSelectedCompositionCarrierChain(carrierSide, 'z');

    expect(chain.kind).toBe('matched');
    if (chain.kind !== 'matched') {
      return;
    }

    const generated = generateNestedCompositionBranchesForChain(
      chain.carriers,
      parseExpression('a'),
      'z',
      'rad',
    );

    expect(generated.kind).toBe('ok');
    if (generated.kind !== 'ok') {
      return;
    }
    expect(generated.equations).toEqual([
      'z=\\arctan(2\\pi n+\\arcsin(a))+\\pi m',
      'z=\\arctan(2\\pi n-\\arcsin(a)+\\pi)+\\pi m',
    ]);
    expect(generated.facts).toEqual([
      '-1\\le a\\le1',
      'n\\in\\mathbb{Z}',
      'm\\in\\mathbb{Z}',
    ]);
  });

  it('keeps common numeric inverse-trig branches exact in the active angle unit', () => {
    const carrierSide = parseExpression('\\sin\\left(\\cos\\left(z^2+x\\right)\\right)');
    const chain = matchSelectedCompositionCarrierChain(carrierSide, 'z');

    expect(chain.kind).toBe('matched');
    if (chain.kind !== 'matched') {
      return;
    }

    const generated = generateNestedCompositionBranchesForChain(
      chain.carriers,
      parseExpression('1'),
      'z',
      'grad',
    );

    expect(generated.kind).toBe('ok');
    if (generated.kind !== 'ok') {
      return;
    }
    expect(generated.layerEquationLatex.join(' ')).not.toMatch(/1\.570|314\.159/);
    expect(generated.layerEquationLatex).toContain('\\cos(z^2+x)=100+400n');
  });

  it('formats unavoidable long decimal literals through numeric output settings', () => {
    setNumericOutputSettings({
      approxDigits: 2,
      numericNotationMode: 'decimal',
      scientificNotationStyle: 'times10',
    });

    expect(compositionLatexForNode(['Divide', 314.1592653589793, 'Pi'])).toContain('314.16');
  });

  it('keeps depth-three and additive mixed carriers out of the nested-chain planner', () => {
    const depthThree = matchSelectedCompositionCarrierChain(
      parseExpression('\\sin\\left(\\sqrt{\\left|z-a\\right|}\\right)'),
      'z',
    );
    expect(depthThree.kind).toBe('blocked');
    if (depthThree.kind === 'blocked') {
      expect(depthThree.reason).toBe('nested-composition');
    }

    const mixed = matchSelectedCompositionCarrierChain(
      parseExpression('\\sin(z)+\\sqrt{z}'),
      'z',
    );
    expect(mixed.kind).toBe('none');
  });

  it('shares composition branch-set provenance and depth policy', () => {
    const branchSet = buildSharedCompositionBranchSet(['x=1', 'x=1']);
    expect(branchSet.equations).toEqual(['x=1']);

    expect(resolveCompositionRecursionDepth(2, {
      maxCompositionInversionDepth: 3,
      maxPeriodicReductionDepth: 3,
      maxRadicalTransformSteps: 2,
      maxRecursionDepth: 4,
      maxRepeatedClearingSteps: 1,
    })).toEqual({ kind: 'ok', nextDepth: 3 });

    expect(resolveCompositionRecursionDepth(3, {
      maxCompositionInversionDepth: 3,
      maxPeriodicReductionDepth: 3,
      maxRadicalTransformSteps: 2,
      maxRecursionDepth: 4,
      maxRepeatedClearingSteps: 1,
    })).toEqual({ kind: 'blocked', nextDepth: 4 });
  });
});
