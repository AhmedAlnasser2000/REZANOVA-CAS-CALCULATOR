import { describe, expect, it } from 'vitest';
import { goldenCases } from '../../__golden__/golden-cases';
import { runGoldenCase } from '../../__golden__/golden-execution';
import { HISTORY_REPLAY_FIXTURES } from '../../history-replay/fixtures';
import { executeHistoryReplayRequest } from '../../history-replay/native-execution';
import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import {
  resolveCanonicalResultForConsumer,
  type CanonicalResultPresentationDetailPart,
} from '../../result-contract';

function canonicalLineText(line: readonly CanonicalResultPresentationDetailPart[]) {
  return line.map((part) => part.kind === 'math' ? part.latex : part.text).join('');
}

function assertDeclaredResultIntent(outcome: CanonicalRuntimeOutcome, label: string) {
  if (outcome.kind === 'prompt') return;
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) throw new Error(`${label}: canonical resolution failed.`);
  const { presentation } = resolution;

  if (presentation.summaries?.solve !== undefined) {
    expect(presentation.summaries.solve.length, `${label} summary parts`).toBeGreaterThan(0);
    expect(presentation.summaries.solve.map(canonicalLineText).join('; '), `${label} summary text`).toBeTruthy();
  }

  for (const [sectionIndex, section] of (presentation.details ?? []).entries()) {
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
    expect(goldenCases).toHaveLength(47);
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
