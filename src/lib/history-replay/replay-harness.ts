import {
  historyReplayCardinalities,
  historyReplayIdentity,
  normalizedHistoryReplayLatex,
  type HistoryReplayFixture,
} from './fixture-contract';
import { HISTORY_REPLAY_FIXTURES } from './fixtures';
import { executeHistoryReplayRequest } from './native-execution';

export type HistoryReplayHardFailure = {
  fixtureId: string;
  field: 'identity' | 'cardinalities' | 'execution';
  expected?: unknown;
  actual?: unknown;
  message?: string;
};

export type HistoryReplayLatexDifference = {
  fixtureId: string;
  expected: string;
  actual: string;
};

export type HistoryReplayReport = {
  version: 1;
  fixtureCount: number;
  hardFailures: HistoryReplayHardFailure[];
  latexDifferences: HistoryReplayLatexDifference[];
};

function jsonEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function runFixture(
  fixture: HistoryReplayFixture,
  report: HistoryReplayReport,
) {
  try {
    const execution = await executeHistoryReplayRequest(fixture.workspace, fixture.request);
    const identity = historyReplayIdentity(execution.outcome);
    const cardinalities = historyReplayCardinalities(execution);
    const normalizedLatex = normalizedHistoryReplayLatex(execution);

    if (!jsonEqual(identity, fixture.expected.identity)) {
      report.hardFailures.push({
        fixtureId: fixture.id,
        field: 'identity',
        expected: fixture.expected.identity,
        actual: identity,
      });
    }
    if (!jsonEqual(cardinalities, fixture.expected.cardinalities)) {
      report.hardFailures.push({
        fixtureId: fixture.id,
        field: 'cardinalities',
        expected: fixture.expected.cardinalities,
        actual: cardinalities,
      });
    }
    if (normalizedLatex !== fixture.expected.normalizedLatex) {
      report.latexDifferences.push({
        fixtureId: fixture.id,
        expected: fixture.expected.normalizedLatex,
        actual: normalizedLatex,
      });
    }
  } catch (error) {
    report.hardFailures.push({
      fixtureId: fixture.id,
      field: 'execution',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function runHistoryReplayHarness(): Promise<HistoryReplayReport> {
  const report: HistoryReplayReport = {
    version: 1,
    fixtureCount: HISTORY_REPLAY_FIXTURES.length,
    hardFailures: [],
    latexDifferences: [],
  };
  for (const fixture of HISTORY_REPLAY_FIXTURES) {
    await runFixture(fixture, report);
  }
  return report;
}

export function formatHistoryReplayReport(report: HistoryReplayReport) {
  const lines = [
    'History Replay Ratchet',
    `Fixtures: ${report.fixtureCount}`,
    `Hard failures: ${report.hardFailures.length}`,
    `Normalized LaTeX differences (report-only): ${report.latexDifferences.length}`,
  ];
  for (const failure of report.hardFailures) {
    lines.push(`FAIL ${failure.fixtureId} [${failure.field}]${failure.message ? ` ${failure.message}` : ''}`);
  }
  for (const difference of report.latexDifferences) {
    lines.push(`LATEX ${difference.fixtureId}`);
  }
  return `${lines.join('\n')}\n`;
}
