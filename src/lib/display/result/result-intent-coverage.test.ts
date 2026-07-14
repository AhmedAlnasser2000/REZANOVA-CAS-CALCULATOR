import { describe, expect, it } from 'vitest';
import { goldenCases } from '../../__golden__/golden-cases';
import { runGoldenCase } from '../../__golden__/golden-execution';
import { HISTORY_REPLAY_FIXTURES } from '../../history-replay/fixtures';
import { executeHistoryReplayRequest } from '../../history-replay/native-execution';
import type {
  CanonicalResultDetailPartV1,
  CanonicalRuntimeOutcome,
} from '../../../types/calculator';

function canonicalLineText(line: readonly CanonicalResultDetailPartV1[]) {
  return line.map((part) => part.kind === 'math' ? part.math.canonicalLatex : part.text).join('');
}

function assertDeclaredResultIntent(outcome: CanonicalRuntimeOutcome, label: string) {
  if (outcome.kind === 'prompt') return;
  const document = outcome.canonicalResult;

  if (document.summaries?.solve !== undefined) {
    expect(document.summaries.solve.length, `${label} summary parts`).toBeGreaterThan(0);
    expect(document.summaries.solve.map(canonicalLineText).join('; '), `${label} summary text`).toBeTruthy();
  }

  for (const [sectionIndex, section] of (document.details ?? []).entries()) {
    for (const [lineIndex, parts] of section.lines.entries()) {
      expect(parts.length, `${label} detail ${sectionIndex}:${lineIndex}`).toBeGreaterThan(0);
      expect(canonicalLineText(parts), `${label} detail ${sectionIndex}:${lineIndex}`).not.toMatch(
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
