import { describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCHER_CATEGORIES } from '../../types/calculator';
import { goldenCases, type GoldenExpectation } from './golden-cases';
import { runGoldenCase, type GoldenExecution } from './golden-execution';
import { resolveCanonicalResultForConsumer } from '../result-contract';

function assertIncludesAll(label: string, actual: string | undefined, expected: readonly string[] | undefined) {
  for (const expectedSubstring of expected ?? []) {
    expect(actual ?? '', label).toContain(expectedSubstring);
  }
}

function assertExpectation(execution: GoldenExecution, expected: GoldenExpectation) {
  const { outcome, tableResponse } = execution;
  const resolution = outcome.kind === 'prompt'
    ? undefined
    : resolveCanonicalResultForConsumer(outcome);
  const presentation = resolution?.ok ? resolution.presentation : undefined;
  const metadata = resolution?.ok ? resolution.semantics.metadata : undefined;
  expect(outcome.kind).toBe(expected.kind);
  expect(outcome.kind === 'prompt' ? outcome.title : presentation?.title)
    .toBe(expected.title ?? (outcome.kind === 'prompt' ? outcome.title : presentation?.title));

  if (expected.exactEquals !== undefined) {
    expect(presentation?.primaryLatex).toBe(expected.exactEquals);
  }

  assertIncludesAll('exactLatex', presentation?.primaryLatex, expected.exactIncludes);
  assertIncludesAll(
    'answerRows',
    outcome.kind === 'success'
      ? presentation?.answerRows?.rows.map((row) => row.latex).join(' ')
      : undefined,
    expected.answerRowsInclude,
  );
  assertIncludesAll(
    'branchReadback',
    presentation?.branchReadback?.branchesLatex.join(' '),
    expected.branchIncludes,
  );
  assertIncludesAll(
    'periodicFamily',
    presentation?.periodicFamily?.branchesLatex.join(' '),
    expected.periodicBranchesInclude,
  );
  assertIncludesAll('approxText', presentation?.approximations?.primary, expected.approxIncludes);
  assertIncludesAll(
    'warnings',
    (presentation?.warnings ?? (outcome.kind === 'prompt' ? outcome.warnings : [])).join(' '),
    expected.warningIncludes,
  );
  assertIncludesAll(
    'exactSupplementLatex',
    presentation?.supplements?.join(' '),
    expected.supplementIncludes,
  );

  if (expected.detailTitlesInclude) {
    const titles = presentation?.details?.map((section) => section.title) ?? [];
    for (const expectedTitle of expected.detailTitlesInclude) {
      expect(titles).toContain(expectedTitle);
    }
  }

  if (expected.detailLinesInclude) {
    const lines = presentation?.details?.flatMap((section) => section.lines.map((line) =>
      line.map((part) => part.kind === 'math' ? part.latex : part.text).join('')))
      .join(' ') ?? '';
    assertIncludesAll('detail lines', lines, expected.detailLinesInclude);
  }

  if (expected.resultOrigin !== undefined) {
    expect(outcome.kind === 'success' ? metadata?.resultOrigin : undefined).toBe(expected.resultOrigin);
  }

  if (expected.calculusStrategy !== undefined) {
    expect(outcome.kind === 'success' ? metadata?.calculusStrategy : undefined).toBe(expected.calculusStrategy);
  }

  if (expected.derivativeStrategiesInclude) {
    const strategies = outcome.kind === 'success' ? metadata?.calculusDerivativeStrategies ?? [] : [];
    for (const expectedStrategy of expected.derivativeStrategiesInclude) {
      expect(strategies).toContain(expectedStrategy);
    }
  }

  if (expected.errorIncludes !== undefined) {
    expect(outcome.kind === 'error' ? presentation?.error : '').toContain(expected.errorIncludes);
  }

  if (expected.solveBadgesInclude) {
    const solveBadges = outcome.kind === 'success' ? metadata?.solveBadges ?? [] : [];
    for (const expectedBadge of expected.solveBadgesInclude) {
      expect(solveBadges).toContain(expectedBadge);
    }
  }

  if (expected.plannerBadgesInclude) {
    const plannerBadges = metadata?.plannerBadges ?? [];
    for (const expectedBadge of expected.plannerBadgesInclude) {
      expect(plannerBadges).toContain(expectedBadge);
    }
  }

  if (expected.actionLatexIncludes) {
    const actionLatex = outcome.kind === 'prompt'
      ? ''
      : outcome.actions?.map((action) => action.math.canonicalLatex).join(' ') ?? '';
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
    expect(metadata?.rejectedCandidateCount).toBe(expected.rejectedCandidateCount);
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
    expect(goldenCases).toHaveLength(46);

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
