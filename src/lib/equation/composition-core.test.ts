import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildSharedCompositionBranchSet,
  countSelectedCompositionCarriers,
  generateCompositionBranchesForCarrier,
  hasCompositionTarget,
  matchSelectedCompositionCarrier,
  resolveCompositionRecursionDepth,
  type CompositionMathJson,
} from './composition-core';

const ce = new ComputeEngine();

function parseExpression(latex: string) {
  return ce.parse(latex).json as CompositionMathJson;
}

describe('composition-core', () => {
  it('detects selected-target carrier counts without assuming x', () => {
    const oneLayer = parseExpression('\\sqrt{z^2+a}');
    expect(hasCompositionTarget(oneLayer, 'z')).toBe(true);
    expect(countSelectedCompositionCarriers(oneLayer, 'z')).toBe(1);

    const nested = parseExpression('\\sqrt{\\left|z-a\\right|}');
    expect(countSelectedCompositionCarriers(nested, 'z')).toBe(2);
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
