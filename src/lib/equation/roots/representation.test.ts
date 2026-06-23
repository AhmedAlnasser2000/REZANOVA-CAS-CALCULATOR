import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';

import { solveBoundedPolynomialEquationAst } from '../../algebra/polynomial-factor-solve';
import { factsFromLegacySupplementLatex } from '../facts/branch-domain-facts';
import {
  adaptBoundedPolynomialSolveResultToRootSet,
  createExactFiniteRoot,
  createFactorDerivedRoot,
  createImplicitAlgebraicRoot,
  createNumericValidatedRoot,
  createRootSet,
  createStructuredRootStop,
  exactRootsFromLatex,
  rootSetDetailLines,
  rootSetExactRootLatex,
  rootSetExactSupplementLatex,
  rootSetToBranchReadback,
  rootSetToExactLatex,
} from './representation';

const ce = new ComputeEngine();

describe('Equation root representation', () => {
  it('formats and dedupes exact finite roots', () => {
    const rootSet = createRootSet({
      target: 'z',
      source: 'test-source',
      entries: [
        createExactFiniteRoot('a'),
        createExactFiniteRoot('b'),
        createExactFiniteRoot('a'),
      ],
    });

    expect(rootSetExactRootLatex(rootSet)).toEqual(['a', 'b']);
    expect(rootSetToExactLatex(rootSet)).toBe('z\\in\\left\\{a,\\ b\\right\\}');
    expect(rootSetToBranchReadback(rootSet)).toMatchObject({
      targetLatex: 'z',
      relationLatex: '\\in',
      branchesLatex: ['a', 'b'],
      source: 'test-source',
    });
  });

  it('dedupes after safe root readback normalization', () => {
    const rootSet = createRootSet({
      target: 'z',
      source: 'normalization-test',
      entries: [
        createExactFiniteRoot(String.raw`0+\sqrt{a}`),
        createExactFiniteRoot(String.raw`\sqrt{a}`),
        createExactFiniteRoot(String.raw`\imaginaryI\imaginaryI`),
      ],
    });

    expect(rootSetExactRootLatex(rootSet)).toEqual([String.raw`\sqrt{a}`, '-1']);
    expect(rootSetToExactLatex(rootSet)).toBe(String.raw`z\in\left\{\sqrt{a},\ -1\right\}`);
  });

  it('parses exact assignment and finite-set result strings', () => {
    expect(exactRootsFromLatex('z=a', 'z')).toEqual(['a']);
    expect(exactRootsFromLatex('z\\in\\left\\{a,\\ b,c\\right\\}', 'z')).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(exactRootsFromLatex('a=z', 'z')).toBeNull();
  });

  it('retains factor-derived metadata while preserving visible root formatting', () => {
    const factorRoot = createFactorDerivedRoot({
      factorLatex: 'z-a',
      factorDegree: 1,
      multiplicity: 3,
      delegatedFamily: 'linear',
      source: 'factor-test',
      roots: ['a'],
      exactSupplementLatex: ['a\\ge0'],
      detailLines: ['Factor z-a=0 has multiplicity 3.'],
    });
    const rootSet = createRootSet({
      target: 'z',
      source: 'factor-test',
      entries: [factorRoot],
    });

    expect(factorRoot).toMatchObject({
      factorLatex: 'z-a',
      factorDegree: 1,
      multiplicity: 3,
      delegatedFamily: 'linear',
    });
    expect(rootSetToExactLatex(rootSet)).toBe('z=a');
    expect(rootSetToBranchReadback(rootSet)).toBeUndefined();
    expect(rootSetExactSupplementLatex(rootSet)).toEqual(['a\\ge0']);
    expect(rootSetDetailLines(rootSet)).toEqual(['Factor z-a=0 has multiplicity 3.']);
  });

  it('renders factor-derived root-group facts through legacy exact supplements', () => {
    const factorRoot = createFactorDerivedRoot({
      factorLatex: 'z^2-a',
      factorDegree: 2,
      multiplicity: 1,
      delegatedFamily: 'polynomial',
      source: 'factor-test',
      roots: ['-\\sqrt{a}', '\\sqrt{a}'],
      facts: factsFromLegacySupplementLatex(['a\\ge0'], {
        attachment: { scope: 'root-group', ownerId: 'z^2-a' },
      }),
    });
    const rootSet = createRootSet({
      target: 'z',
      source: 'factor-test',
      entries: [factorRoot],
    });

    expect(factorRoot.facts?.[0].attachment).toEqual({
      scope: 'root-group',
      ownerId: 'z^2-a',
    });
    expect(rootSetExactSupplementLatex(rootSet)).toEqual(['a\\ge0']);
  });

  it('adapts exact-rational factorization results without changing exact output', () => {
    const cubic = solveBoundedPolynomialEquationAst(
      ce.parse('z^3-6z^2+11z-6=0').json,
      'z',
    );

    expect(cubic).not.toBeNull();
    if (!cubic) {
      throw new Error('Expected exact-rational cubic factorization');
    }

    const rootSet = adaptBoundedPolynomialSolveResultToRootSet(cubic, {
      source: 'factorable-test',
    });

    expect(rootSetToExactLatex(rootSet)).toBe(cubic.exactLatex);
    expect(rootSetToBranchReadback(rootSet)).toMatchObject({
      targetLatex: 'z',
      branchesLatex: ['1', '2', '3'],
      source: 'factorable-test',
    });
    expect(rootSet.entries[0]).toMatchObject({
      kind: 'exact-rational-factor',
      strategy: 'rational-root',
      factorizedLatex: cubic.factorization.factorizedLatex,
    });
  });

  it('keeps repeated exact-rational roots internally deduped for visible output', () => {
    const repeated = solveBoundedPolynomialEquationAst(
      ce.parse('z^3-4z^2+5z-2=0').json,
      'z',
    );

    expect(repeated).not.toBeNull();
    if (!repeated) {
      throw new Error('Expected repeated-root factorization');
    }

    const rootSet = adaptBoundedPolynomialSolveResultToRootSet(repeated, {
      source: 'factorable-test',
    });

    expect(rootSetToExactLatex(rootSet)).toBe('z\\in\\left\\{1, 2\\right\\}');
    expect(rootSetExactRootLatex(rootSet)).toEqual(['1', '2']);
    expect(rootSet.entries[0]).toMatchObject({
      kind: 'exact-rational-factor',
      factors: expect.arrayContaining([
        expect.objectContaining({ latex: 'z-1', multiplicity: 2 }),
      ]),
    });
  });

  it('models numeric, implicit, and structured stop variants without visible exact roots', () => {
    const rootSet = createRootSet({
      target: 'z',
      source: 'future-root-model',
      entries: [
        createNumericValidatedRoot({
          value: 1.25,
          latex: '1.25',
          source: 'numeric-test',
          method: 'interval-check',
        }),
        createImplicitAlgebraicRoot({
          equationLatex: 'z^5+a=0',
          variable: 'z',
          source: 'implicit-test',
          reason: 'degree cap',
        }),
        createStructuredRootStop({
          reason: 'formula-size-limit',
          message: 'Formula is too large for compact readback.',
          source: 'stop-test',
        }),
      ],
    });

    expect(rootSetToExactLatex(rootSet)).toBeUndefined();
    expect(rootSetToBranchReadback(rootSet)).toBeUndefined();
    expect(rootSetExactRootLatex(rootSet)).toEqual([]);
  });
});
