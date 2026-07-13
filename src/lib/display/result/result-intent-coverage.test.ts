import { describe, expect, it } from 'vitest';
import { goldenCases } from '../../__golden__/golden-cases';
import { runGoldenCase } from '../../__golden__/golden-execution';
import { HISTORY_REPLAY_FIXTURES } from '../../history-replay/fixtures';
import { executeHistoryReplayRequest } from '../../history-replay/native-execution';
import type { DisplayOutcome } from '../../../types/calculator';
import {
  detailLineIntentAt,
  solveSummaryPlainText,
} from './result-detail-lines';

function assertDeclaredResultIntent(outcome: DisplayOutcome, label: string) {
  if (outcome.kind === 'prompt') return;

  if (outcome.solveSummaryParts !== undefined) {
    expect(outcome.solveSummaryParts?.length, `${label} summary parts`).toBeGreaterThan(0);
    expect(solveSummaryPlainText(outcome), `${label} summary text`).toBeTruthy();
  }

  for (const [sectionIndex, section] of (outcome.detailSections ?? []).entries()) {
    for (const [lineIndex, line] of section.lines.entries()) {
      expect(
        detailLineIntentAt(section, lineIndex),
        `${label} detail ${sectionIndex}:${lineIndex} ${line}`,
      ).not.toBe('undeclared');
      expect(line, `${label} detail ${sectionIndex}:${lineIndex}`).not.toMatch(
        /\[undefined,\s*undefined\]|with undefined subdivisions/u,
      );
    }
  }
}

describe('live result intent coverage', () => {
  it('declares summaries and detail lines for all golden executions', async () => {
    expect(goldenCases).toHaveLength(43);
    for (const goldenCase of goldenCases) {
      const execution = await runGoldenCase(goldenCase);
      assertDeclaredResultIntent(execution.outcome, goldenCase.id);
    }
  }, 60_000);

  it('declares summaries and detail lines for all History replay executions', async () => {
    expect(HISTORY_REPLAY_FIXTURES).toHaveLength(100);
    for (const fixture of HISTORY_REPLAY_FIXTURES) {
      const execution = await executeHistoryReplayRequest(fixture.workspace, fixture.request);
      assertDeclaredResultIntent(execution.outcome, fixture.id);
    }
  }, 60_000);
});
