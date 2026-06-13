import { describe, expect, it } from 'vitest';
import {
  buildConditionSupplementLatex,
  buildEvenRootConditionConstraints,
  buildSquareRootConjugateProfile,
  matchSupportedRadical,
  matchSupportedRationalPower,
  radicalNodeKey,
  recognizePerfectSquareRadicand,
} from '../radical-core';

describe('radical-core direct contracts', () => {
  it('matches supported radicals and rational powers over the selected variable', () => {
    const squareRoot = matchSupportedRadical(['Sqrt', ['Add', 'x', 1]], 'x');
    const cubeRoot = matchSupportedRadical(['Root', ['Add', 'x', 1], 3], 'x');
    const rationalPower = matchSupportedRationalPower(
      ['Power', ['Add', 'x', 1], ['Rational', 2, 3]],
      'x',
    );
    const radicalPower = matchSupportedRationalPower(['Power', ['Sqrt', 'x'], 3], 'x');

    expect(squareRoot).toMatchObject({
      radicand: ['Add', 1, 'x'],
      index: 2,
    });
    expect(cubeRoot).toMatchObject({
      radicand: ['Add', 1, 'x'],
      index: 3,
    });
    expect(rationalPower).toMatchObject({
      base: ['Add', 1, 'x'],
      numerator: 2,
      denominator: 3,
    });
    expect(radicalPower).toMatchObject({
      base: 'x',
      numerator: 3,
      denominator: 2,
    });
    expect(matchSupportedRadical(['Sqrt', ['Add', 'x', 'y']], 'x')).toBeNull();
    expect(matchSupportedRationalPower(['Power', 16, ['Rational', 1, 2]], 'x')).toBeNull();
  });

  it('builds even-root constraints and condition supplements for variable radicands', () => {
    const constraints = buildEvenRootConditionConstraints(['Add', 'x', 1]);

    expect(constraints).toEqual([
      {
        kind: 'nonnegative',
        expressionLatex: 'x+1',
      },
    ]);
    expect(buildEvenRootConditionConstraints(['Power', 'x', 2])).toEqual([]);
    expect(buildConditionSupplementLatex([
      ...constraints,
      { kind: 'nonzero', expressionLatex: '\\sqrt{x+1}+1' },
      { kind: 'positive', expressionLatex: 'x' },
    ])).toEqual([
      '\\text{Conditions: } x+1\\ge0,\\;\\sqrt{x+1}+1\\ne0,\\;x>0',
    ]);
  });

  it('constructs square-root conjugate profiles for supported two-term and three-term denominators', () => {
    const twoTerm = buildSquareRootConjugateProfile(['Add', 'x', ['Sqrt', 2]], 'x');
    const twoRadical = buildSquareRootConjugateProfile(['Add', ['Sqrt', ['Add', 'x', 1]], ['Sqrt', 'x']], 'x');
    const threeTerm = buildSquareRootConjugateProfile(['Add', 1, ['Sqrt', 2], ['Sqrt', 3]]);

    expect(twoTerm).toMatchObject({
      familyId: 'two-term-other-radical',
      radicalCount: 1,
      residualCleanupEligible: false,
    });
    expect(twoTerm?.conditionConstraints).toEqual([]);
    expect(twoRadical).toMatchObject({
      familyId: 'two-term-double-radical',
      radicalCount: 2,
      residualCleanupEligible: false,
    });
    expect(twoRadical?.conditionConstraints).toEqual([
      { kind: 'nonnegative', expressionLatex: 'x' },
      { kind: 'nonnegative', expressionLatex: 'x+1' },
    ]);
    expect(threeTerm).toMatchObject({
      familyId: 'three-term-scalar-double-radical',
      radicalCount: 2,
      residualCleanupEligible: true,
    });
  });

  it('recognizes perfect-square radicands and produces stable radical node keys', () => {
    const repeatedLinear = recognizePerfectSquareRadicand(['Add', ['Power', 'x', 2], ['Multiply', 2, 'x'], 1]);
    const scaledLinear = recognizePerfectSquareRadicand(['Add', ['Multiply', 4, ['Power', 'x', 2]], ['Multiply', 4, 'x'], 1]);

    expect(repeatedLinear).toMatchObject({
      outsideScalar: { numerator: 1, denominator: 1 },
      normalizedNode: ['Abs', ['Add', 1, 'x']],
    });
    expect(scaledLinear).toMatchObject({
      outsideScalar: { numerator: 1, denominator: 1 },
      normalizedNode: ['Abs', ['Add', 1, ['Multiply', 2, 'x']]],
    });
    expect(recognizePerfectSquareRadicand(['Add', ['Power', 'x', 2], 1])).toBeNull();
    expect(radicalNodeKey(['Sqrt', ['Add', 'x', 1]])).toBe(radicalNodeKey(['Sqrt', ['Add', 1, 'x']]));
  });
});
