import { describe, expect, it } from 'vitest';
import { HISTORY_REPLAY_WORKSPACES } from './fixture-contract';
import { HISTORY_REPLAY_FIXTURE_FILES, HISTORY_REPLAY_FIXTURES } from './fixtures';
import { runHistoryReplayHarness } from './replay-harness';

const expectedCounts = {
  calculate: 20,
  equation: 25,
  calculus: 25,
  matrix: 5,
  vector: 5,
  table: 5,
  trigonometry: 5,
  statistics: 5,
  geometry: 5,
} as const;

describe('History replay ratchet', () => {
  it('keeps 100 unique versioned sanitized fixtures at the approved distribution', () => {
    expect(HISTORY_REPLAY_FIXTURE_FILES).toHaveLength(9);
    expect(HISTORY_REPLAY_FIXTURES).toHaveLength(100);
    expect(new Set(HISTORY_REPLAY_FIXTURES.map((fixture) => fixture.id)).size).toBe(100);

    for (const workspace of HISTORY_REPLAY_WORKSPACES) {
      const fixtures = HISTORY_REPLAY_FIXTURES.filter((fixture) => fixture.workspace === workspace);
      expect(fixtures).toHaveLength(expectedCounts[workspace]);
      expect(fixtures.every((fixture) => fixture.snapshot.version === 1)).toBe(true);
      if (workspace !== 'calculate' && workspace !== 'equation' && workspace !== 'calculus') {
        expect(new Set(fixtures.map((fixture) => fixture.family)).size).toBe(5);
      }
    }
  });

  it('hard-compares migrated workspace LaTeX while retaining report-only families', async () => {
    const report = await runHistoryReplayHarness();
    expect(report.fixtureCount).toBe(100);
    expect(report.hardLatexFixtureCount).toBe(45);
    expect(report.reportOnlyLatexFixtureCount).toBe(55);
    expect(report.hardFailures).toEqual([]);
    expect(Array.isArray(report.latexDifferences)).toBe(true);
  }, 60_000);
});
