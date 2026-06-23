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
} from './representation';
import { buildCompactRootReadback } from './readback';

const ce = new ComputeEngine();

describe('Equation compact root readback', () => {
  it('renders exact finite roots through current exact and branch surfaces', () => {
    const readback = buildCompactRootReadback(createRootSet({
      target: 'z',
      source: 'test-source',
      entries: [
        createExactFiniteRoot('a'),
        createExactFiniteRoot('b'),
      ],
    }));

    expect(readback).toMatchObject({
      kind: 'visible-exact',
      exactLatex: 'z\\in\\left\\{a,\\ b\\right\\}',
      branchReadback: {
        targetLatex: 'z',
        branchesLatex: ['a', 'b'],
        source: 'test-source',
      },
    });
  });

  it('normalizes validated root expressions before exact and branch readback', () => {
    const readback = buildCompactRootReadback(createRootSet({
      target: 'x',
      source: 'normalization-test',
      entries: [
        createExactFiniteRoot(String.raw`0+\sqrt{a}`),
        createExactFiniteRoot(String.raw`\frac{-1+1}{2}\sqrt{b}`),
        createExactFiniteRoot(String.raw`\sqrt{v+b}c`),
      ],
    }));

    expect(readback).toMatchObject({
      kind: 'visible-exact',
      exactLatex: String.raw`x\in\left\{\sqrt{a},\ 0,\ c\sqrt{v+b}\right\}`,
      branchReadback: {
        branchesLatex: [
          String.raw`\sqrt{a}`,
          '0',
          String.raw`c\sqrt{v+b}`,
        ],
      },
    });
  });

  it('normalizes decomposable exact overrides and branch roots', () => {
    const rootSet = createRootSet({
      target: 'x',
      source: 'override-test',
      exactLatexOverride: String.raw`x\in\left\{0+\sqrt{a},\ \sqrt{b}c\right\}`,
      entries: [
        createExactFiniteRoot(String.raw`0+\sqrt{a}`),
        createExactFiniteRoot(String.raw`\sqrt{b}c`),
      ],
    });

    const readback = buildCompactRootReadback(rootSet);

    expect(readback).toMatchObject({
      kind: 'visible-exact',
      exactLatex: String.raw`x\in\left\{\sqrt{a},\ c\sqrt{b}\right\}`,
      branchReadback: {
        branchesLatex: [
          String.raw`\sqrt{a}`,
          String.raw`c\sqrt{b}`,
        ],
      },
    });
  });

  it('preserves unsafe exact overrides unchanged', () => {
    const rootSet = createRootSet({
      target: 'x',
      source: 'override-test',
      exactLatexOverride: String.raw`x=2\pi k`,
      entries: [createExactFiniteRoot('0')],
    });

    expect(buildCompactRootReadback(rootSet)).toMatchObject({
      kind: 'visible-exact',
      exactLatex: String.raw`x=2\pi k`,
    });
  });

  it('preserves factor-derived facts, supplements, and detail lines', () => {
    const readback = buildCompactRootReadback(createRootSet({
      target: 'z',
      source: 'factor-test',
      entries: [
        createFactorDerivedRoot({
          factorLatex: 'z^2-a',
          factorDegree: 2,
          multiplicity: 1,
          delegatedFamily: 'polynomial',
          source: 'factor-test',
          roots: ['-\\sqrt{a}', '\\sqrt{a}'],
          facts: factsFromLegacySupplementLatex(['a\\ge0'], {
            attachment: { scope: 'root-group', ownerId: 'z^2-a' },
          }),
          detailLines: ['Solved factor z^2-a=0.'],
        }),
      ],
    }));

    expect(readback).toMatchObject({
      kind: 'visible-exact',
      exactSupplementLatex: ['a\\ge0'],
      detailLines: ['Solved factor z^2-a=0.'],
    });
  });

  it('preserves exact-rational factorization exact override and branch readback', () => {
    const solved = solveBoundedPolynomialEquationAst(
      ce.parse('z^3-6z^2+11z-6=0').json,
      'z',
    );
    expect(solved).not.toBeNull();
    if (!solved) {
      throw new Error('Expected exact-rational cubic factorization');
    }

    const readback = buildCompactRootReadback(adaptBoundedPolynomialSolveResultToRootSet(solved, {
      source: 'factorable-test',
    }));

    expect(readback).toMatchObject({
      kind: 'visible-exact',
      exactLatex: String.raw`z\in\left\{1,\ 2,\ 3\right\}`,
      branchReadback: {
        targetLatex: 'z',
        branchesLatex: ['1', '2', '3'],
        source: 'factorable-test',
      },
    });
  });

  it('keeps implicit algebraic roots internal and non-visible', () => {
    const readback = buildCompactRootReadback(createRootSet({
      target: 'z',
      source: 'implicit-test',
      entries: [
        createImplicitAlgebraicRoot({
          equationLatex: 'z^5+a=0',
          variable: 'z',
          source: 'implicit-test',
        }),
      ],
    }));

    expect(readback).toEqual({
      kind: 'no-visible-exact',
      reason: 'implicit-root',
      source: 'implicit-test',
    });
  });

  it('does not promote numeric validated roots to exact readback', () => {
    const readback = buildCompactRootReadback(createRootSet({
      target: 'z',
      source: 'numeric-test',
      entries: [
        createNumericValidatedRoot({
          value: 1.25,
          latex: '1.25',
          source: 'numeric-test',
        }),
      ],
    }));

    expect(readback).toEqual({
      kind: 'no-visible-exact',
      reason: 'numeric-only',
      source: 'numeric-test',
    });
  });

  it('returns structured stop metadata without visible RootOf output', () => {
    const readback = buildCompactRootReadback(createRootSet({
      target: 'z',
      source: 'stop-test',
      entries: [
        createStructuredRootStop({
          reason: 'formula-size-limit',
          message: 'Formula is too large for compact readback.',
          source: 'stop-test',
        }),
      ],
    }));

    expect(readback).toEqual({
      kind: 'structured-stop',
      source: 'stop-test',
      reason: 'formula-size-limit',
      message: 'Formula is too large for compact readback.',
    });
  });
});
