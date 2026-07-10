import { describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCHER_CATEGORIES } from '../../types/calculator';
import { goldenCases, type GoldenExpectation } from './golden-cases';
import { runGoldenCase, type GoldenExecution } from './golden-execution';

function assertIncludesAll(label: string, actual: string | undefined, expected: readonly string[] | undefined) {
  for (const expectedSubstring of expected ?? []) {
    expect(actual ?? '', label).toContain(expectedSubstring);
  }
}

function assertExpectation(execution: GoldenExecution, expected: GoldenExpectation) {
  const { outcome, tableResponse } = execution;
  const richOutcome = outcome.kind === 'prompt' ? undefined : outcome;
  expect(outcome.kind).toBe(expected.kind);
  expect(outcome.title).toBe(expected.title ?? outcome.title);

  if (expected.exactEquals !== undefined) {
    expect(richOutcome?.exactLatex).toBe(expected.exactEquals);
  }

  assertIncludesAll('exactLatex', richOutcome?.exactLatex, expected.exactIncludes);
  assertIncludesAll(
    'answerRows',
    outcome.kind === 'success'
      ? outcome.answerRows?.rows.map((row) => row.latex).join(' ')
      : undefined,
    expected.answerRowsInclude,
  );
  assertIncludesAll(
    'branchReadback',
    richOutcome?.branchReadback?.branchesLatex.join(' '),
    expected.branchIncludes,
  );
  assertIncludesAll(
    'periodicFamily',
    richOutcome?.periodicFamily?.branchesLatex.join(' '),
    expected.periodicBranchesInclude,
  );
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

  if (expected.detailLinesInclude) {
    const lines = richOutcome?.detailSections?.flatMap((section) => section.lines).join(' ') ?? '';
    assertIncludesAll('detail lines', lines, expected.detailLinesInclude);
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

  if (expected.actionLatexIncludes) {
    const actionLatex = richOutcome?.actions?.map((action) => action.latex).join(' ') ?? '';
    assertIncludesAll('actions', actionLatex, expected.actionLatexIncludes);
  }

  for (const expectedRow of expected.tableRows ?? []) {
    expect(tableResponse?.rows[expectedRow.index]).toEqual({
      x: expectedRow.x,
      primary: expectedRow.primary,
      secondary: expectedRow.secondary,
    });
  }

  if (expected.rejectedCandidateCount !== undefined) {
    expect(richOutcome?.rejectedCandidateCount).toBe(expected.rejectedCandidateCount);
  }

  if (expected.runtimeStopReasonKind !== undefined) {
    expect(outcome.runtimeAdvisories?.stopReason?.kind).toBe(expected.runtimeStopReasonKind);
  }
}

describe('MATH-GOLDEN0 shipped behavior corpus', () => {
  it('ratchets unique ids, the 43-case floor, and launcher workspace coverage', () => {
    const ids = goldenCases.map((goldenCase) => goldenCase.id);
    const launcherWorkspaces = DEFAULT_LAUNCHER_CATEGORIES
      .flatMap((category) => category.entries)
      .map((entry) => entry.id)
      .filter((workspace) => workspace !== 'labs');

    expect(new Set(ids).size).toBe(ids.length);
    expect(goldenCases.length).toBeGreaterThanOrEqual(43);
    expect(goldenCases).toHaveLength(43);

    for (const workspace of launcherWorkspaces) {
      expect(
        goldenCases.filter((goldenCase) => goldenCase.mode === workspace).length,
        `${workspace} golden coverage`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  for (const goldenCase of goldenCases) {
    it(`${goldenCase.lane}: ${goldenCase.id}`, async () => {
      const execution = await runGoldenCase(goldenCase);
      assertExpectation(execution, goldenCase.expected);
    });
  }
});
