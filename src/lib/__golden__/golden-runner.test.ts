import { describe, expect, it } from 'vitest';
import { runCalculateMode } from '../modes/calculate';
import { runEquationMode } from '../modes/equation';
import type { DisplayOutcome } from '../../types/calculator';
import { goldenCases, type GoldenCase, type GoldenExpectation } from './golden-cases';

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

function runGoldenCase(goldenCase: GoldenCase): DisplayOutcome {
  if (goldenCase.mode === 'calculate') {
    return runCalculateMode({
      action: goldenCase.action,
      latex: goldenCase.latex,
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    });
  }

  return runEquationMode({
    equationScreen: goldenCase.equationScreen ?? 'symbolic',
    equationLatex: goldenCase.equationLatex,
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, -5, 0, 4],
    polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
    system2,
    system3,
    angleUnit: 'deg',
    outputStyle: 'both',
    ansLatex: '0',
  });
}

function assertIncludesAll(label: string, actual: string | undefined, expected: readonly string[] | undefined) {
  for (const expectedSubstring of expected ?? []) {
    expect(actual ?? '', label).toContain(expectedSubstring);
  }
}

function assertExpectation(outcome: DisplayOutcome, expected: GoldenExpectation) {
  const richOutcome = outcome.kind === 'prompt' ? undefined : outcome;
  expect(outcome.kind).toBe(expected.kind);
  expect(outcome.title).toBe(expected.title ?? outcome.title);

  if (expected.exactEquals !== undefined) {
    expect(richOutcome?.exactLatex).toBe(expected.exactEquals);
  }

  assertIncludesAll('exactLatex', richOutcome?.exactLatex, expected.exactIncludes);
  assertIncludesAll('approxText', richOutcome?.approxText, expected.approxIncludes);
  assertIncludesAll('warnings', outcome.warnings.join(' '), expected.warningIncludes);
  assertIncludesAll(
    'exactSupplementLatex',
    richOutcome?.exactSupplementLatex?.join(' '),
    expected.supplementIncludes,
  );

  if (expected.detailTitlesInclude) {
    const titles = richOutcome?.detailSections?.map((section) => section.title) ?? [];
    for (const expectedTitle of expected.detailTitlesInclude) {
      expect(titles).toContain(expectedTitle);
    }
  }

  if (expected.resultOrigin !== undefined) {
    expect(outcome.kind === 'success' ? outcome.resultOrigin : undefined).toBe(expected.resultOrigin);
  }

  if (expected.calculusStrategy !== undefined) {
    expect(outcome.kind === 'success' ? outcome.calculusStrategy : undefined).toBe(expected.calculusStrategy);
  }

  if (expected.derivativeStrategiesInclude) {
    const strategies = outcome.kind === 'success' ? outcome.calculusDerivativeStrategies ?? [] : [];
    for (const expectedStrategy of expected.derivativeStrategiesInclude) {
      expect(strategies).toContain(expectedStrategy);
    }
  }

  if (expected.errorIncludes !== undefined) {
    expect(outcome.kind === 'error' ? outcome.error : '').toContain(expected.errorIncludes);
  }

  if (expected.solveBadgesInclude) {
    const solveBadges = outcome.kind === 'success' ? outcome.solveBadges ?? [] : [];
    for (const expectedBadge of expected.solveBadgesInclude) {
      expect(solveBadges).toContain(expectedBadge);
    }
  }

  if (expected.plannerBadgesInclude) {
    const plannerBadges = richOutcome?.plannerBadges ?? [];
    for (const expectedBadge of expected.plannerBadgesInclude) {
      expect(plannerBadges).toContain(expectedBadge);
    }
  }

  if (expected.rejectedCandidateCount !== undefined) {
    expect(richOutcome?.rejectedCandidateCount).toBe(expected.rejectedCandidateCount);
  }

  if (expected.runtimeStopReasonKind !== undefined) {
    expect(outcome.runtimeAdvisories?.stopReason?.kind).toBe(expected.runtimeStopReasonKind);
  }
}

describe('MATH-GOLDEN0 shipped behavior corpus', () => {
  for (const goldenCase of goldenCases) {
    it(`${goldenCase.lane}: ${goldenCase.id}`, () => {
      const outcome = runGoldenCase(goldenCase);
      assertExpectation(outcome, goldenCase.expected);
    });
  }
});
