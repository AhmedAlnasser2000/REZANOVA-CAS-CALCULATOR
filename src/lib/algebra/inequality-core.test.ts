import { describe, expect, it } from 'vitest';
import {
  allRealInequalitySet,
  areInequalitySetsEqual,
  closedIntervalInequalitySet,
  containsInequalityValue,
  emptyInequalitySet,
  greaterThanInequalitySet,
  greaterThanOrEqualInequalitySet,
  inequalitySetToAssumptionFacts,
  inequalitySetToLatex,
  inequalitySetToText,
  intersectInequalitySets,
  isEmptyInequalitySet,
  lessThanInequalitySet,
  lessThanOrEqualInequalitySet,
  normalizeInequalitySet,
  openIntervalInequalitySet,
  pointInequalitySet,
  valueDomainMetadataFromInequalitySet,
} from './inequality-core';

describe('inequality-core', () => {
  it('builds interval constructors for common real inequality shapes', () => {
    expect(allRealInequalitySet('x')).toEqual({
      variable: 'x',
      intervals: [{ lowerInclusive: false, upperInclusive: false }],
    });
    expect(emptyInequalitySet('x')).toEqual({ variable: 'x', intervals: [] });
    expect(pointInequalitySet('x', 2)).toEqual({
      variable: 'x',
      intervals: [{ lower: 2, lowerInclusive: true, upper: 2, upperInclusive: true }],
    });
    expect(openIntervalInequalitySet('x', -1, 3).intervals).toEqual([
      { lower: -1, lowerInclusive: false, upper: 3, upperInclusive: false },
    ]);
    expect(closedIntervalInequalitySet('x', -1, 3).intervals).toEqual([
      { lower: -1, lowerInclusive: true, upper: 3, upperInclusive: true },
    ]);
    expect(lessThanInequalitySet('x', 5).intervals).toEqual([
      { lowerInclusive: false, upper: 5, upperInclusive: false },
    ]);
    expect(lessThanOrEqualInequalitySet('x', 5).intervals).toEqual([
      { lowerInclusive: false, upper: 5, upperInclusive: true },
    ]);
    expect(greaterThanInequalitySet('x', 5).intervals).toEqual([
      { lower: 5, lowerInclusive: false, upperInclusive: false },
    ]);
    expect(greaterThanOrEqualInequalitySet('x', 5).intervals).toEqual([
      { lower: 5, lowerInclusive: true, upperInclusive: false },
    ]);
  });

  it('normalizes order, duplicates, overlaps, and compatible touching intervals', () => {
    const set = normalizeInequalitySet('x', [
      { lower: 5, lowerInclusive: true, upper: 6, upperInclusive: true },
      { lower: 1, lowerInclusive: true, upper: 3, upperInclusive: false },
      { lower: 3, lowerInclusive: true, upper: 4, upperInclusive: false },
      { lower: 1, lowerInclusive: true, upper: 4, upperInclusive: false },
      { lower: 10, lowerInclusive: false, upper: 11, upperInclusive: false },
    ]);

    expect(set.intervals).toEqual([
      { lower: 1, lowerInclusive: true, upper: 4, upperInclusive: false },
      { lower: 5, lowerInclusive: true, upper: 6, upperInclusive: true },
      { lower: 10, lowerInclusive: false, upper: 11, upperInclusive: false },
    ]);
  });

  it('keeps incompatible touching intervals separate', () => {
    const set = normalizeInequalitySet('x', [
      { lower: 0, lowerInclusive: true, upper: 1, upperInclusive: false },
      { lower: 1, lowerInclusive: false, upper: 2, upperInclusive: true },
    ]);

    expect(set.intervals).toEqual([
      { lower: 0, lowerInclusive: true, upper: 1, upperInclusive: false },
      { lower: 1, lowerInclusive: false, upper: 2, upperInclusive: true },
    ]);
  });

  it('rejects malformed variables and interval bounds', () => {
    expect(() => emptyInequalitySet('   ')).toThrow(RangeError);
    expect(() => closedIntervalInequalitySet('x', 3, 1)).toThrow(RangeError);
    expect(() => greaterThanInequalitySet('x', Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(openIntervalInequalitySet('x', 1, 1)).toEqual({ variable: 'x', intervals: [] });
  });

  it('intersects bounded, unbounded, disjoint, touching, and finite-union sets', () => {
    const left = normalizeInequalitySet('x', [
      { lower: -3, lowerInclusive: true, upper: 0, upperInclusive: true },
      { lower: 2, lowerInclusive: true, upper: 6, upperInclusive: false },
    ]);
    const right = normalizeInequalitySet('x', [
      { lowerInclusive: false, upper: -1, upperInclusive: false },
      { lower: 0, lowerInclusive: true, upper: 3, upperInclusive: true },
    ]);

    expect(intersectInequalitySets(left, right).intervals).toEqual([
      { lower: -3, lowerInclusive: true, upper: -1, upperInclusive: false },
      { lower: 0, lowerInclusive: true, upper: 0, upperInclusive: true },
      { lower: 2, lowerInclusive: true, upper: 3, upperInclusive: true },
    ]);
    expect(intersectInequalitySets(
      openIntervalInequalitySet('x', 0, 1),
      openIntervalInequalitySet('x', 1, 2),
    )).toEqual({ variable: 'x', intervals: [] });
    expect(intersectInequalitySets(
      closedIntervalInequalitySet('x', 0, 1),
      closedIntervalInequalitySet('x', 1, 2),
    ).intervals).toEqual([
      { lower: 1, lowerInclusive: true, upper: 1, upperInclusive: true },
    ]);
    expect(() => intersectInequalitySets(allRealInequalitySet('x'), allRealInequalitySet('y'))).toThrow(RangeError);
  });

  it('checks containment, emptiness, and stable equality', () => {
    const set = normalizeInequalitySet('x', [
      { lower: 0, lowerInclusive: false, upper: 2, upperInclusive: true },
      { lower: 4, lowerInclusive: true, upper: 5, upperInclusive: false },
    ]);

    expect(isEmptyInequalitySet(set)).toBe(false);
    expect(isEmptyInequalitySet(emptyInequalitySet('x'))).toBe(true);
    expect(containsInequalityValue(set, 0)).toBe(false);
    expect(containsInequalityValue(set, 2)).toBe(true);
    expect(containsInequalityValue(set, 4)).toBe(true);
    expect(containsInequalityValue(set, 5)).toBe(false);
    expect(containsInequalityValue(set, Number.NaN)).toBe(false);
    expect(areInequalitySetsEqual(set, normalizeInequalitySet('x', [...set.intervals].reverse()))).toBe(true);
    expect(areInequalitySetsEqual(set, allRealInequalitySet('x'))).toBe(false);
  });

  it('reads back simple intervals and finite unions in text and latex', () => {
    const finiteUnion = normalizeInequalitySet('x', [
      { lowerInclusive: false, upper: -1, upperInclusive: false },
      { lower: 0, lowerInclusive: true, upper: 2, upperInclusive: false },
      { lower: 5, lowerInclusive: true, upperInclusive: false },
    ]);

    expect(inequalitySetToText(allRealInequalitySet('x'))).toBe('x is any real number');
    expect(inequalitySetToText(emptyInequalitySet('x'))).toBe('x has no real values');
    expect(inequalitySetToText(pointInequalitySet('x', 2))).toBe('x = 2');
    expect(inequalitySetToText(finiteUnion)).toBe('x < -1 or 0 <= x < 2 or x >= 5');
    expect(inequalitySetToLatex(finiteUnion)).toBe('x<-1\\;\\cup\\;0\\le x<2\\;\\cup\\;x\\ge5');
    expect(inequalitySetToLatex(emptyInequalitySet('x'))).toBe('x\\in\\varnothing');
  });

  it('converts inequality sets through the value-domain fact spine', () => {
    const set = normalizeInequalitySet('x', [
      { lower: -2, lowerInclusive: true, upper: 2, upperInclusive: true },
    ]);
    const facts = inequalitySetToAssumptionFacts(set, {
      details: ['from sign chart'],
    });
    const metadata = valueDomainMetadataFromInequalitySet(set);

    expect(facts).toMatchObject([
      {
        kind: 'inequality-constraint',
        source: 'inequality-core',
        trust: 'proved',
        scope: 'result',
        expressionLatex: '-2\\le x\\le 2',
        variable: 'x',
        message: '-2 <= x <= 2',
        details: ['from sign chart'],
      },
    ]);
    expect(metadata).toMatchObject({
      answerDomain: 'conditional-real',
      solutionKind: 'inequality-solution-set',
      summary: {
        hasInequalityFacts: true,
        hasComplexDomainFacts: false,
      },
    });
  });
});
