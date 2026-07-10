import { DEFAULT_LAUNCHER_CATEGORIES } from '../../types/calculator';
import {
  collectDisplayOutcomeMathFragments,
  collectTableResponseMathFragments,
  findMalformedMathFragments,
  normalizePrintHygieneValue,
  type MathematicalFragment,
} from '../display/print-hygiene';
import { goldenCases } from './golden-cases';
import { runGoldenCase } from './golden-execution';

export type PrintHygieneBaselineEntry = {
  id: string;
  workspace: string;
  outcomeKind: string;
  title: string;
  fragments: MathematicalFragment[];
};

export type PrintHygieneBaselineManifest = {
  schemaVersion: 1;
  acceptedReason: string;
  caseCount: number;
  workspaceCounts: Record<string, number>;
  successfulWorkspaceCounts: Record<string, number>;
  entries: PrintHygieneBaselineEntry[];
};

function normalizedFragments(fragments: readonly MathematicalFragment[]) {
  return fragments.map((fragment) => ({
    ...fragment,
    value: normalizePrintHygieneValue(fragment.value),
  }));
}

export async function buildPrintHygieneBaseline(
  acceptedReason: string,
): Promise<PrintHygieneBaselineManifest> {
  const entries: PrintHygieneBaselineEntry[] = [];
  const workspaceCounts: Record<string, number> = {};
  const successfulWorkspaceCounts: Record<string, number> = {};

  for (const goldenCase of goldenCases) {
    const execution = await runGoldenCase(goldenCase);
    const fragments = [
      ...collectDisplayOutcomeMathFragments(execution.outcome),
      ...collectTableResponseMathFragments(execution.tableResponse),
    ];
    const malformed = findMalformedMathFragments(fragments);
    if (malformed.length > 0) {
      const summary = malformed.map((item) => `${goldenCase.id}:${item.path}:${item.marker}`).join(', ');
      throw new Error(`Malformed mathematical fragments: ${summary}`);
    }

    workspaceCounts[goldenCase.mode] = (workspaceCounts[goldenCase.mode] ?? 0) + 1;
    if (execution.outcome.kind === 'success') {
      successfulWorkspaceCounts[goldenCase.mode] = (successfulWorkspaceCounts[goldenCase.mode] ?? 0) + 1;
    }
    entries.push({
      id: goldenCase.id,
      workspace: goldenCase.mode,
      outcomeKind: execution.outcome.kind,
      title: execution.outcome.title,
      fragments: normalizedFragments(fragments),
    });
  }

  const launcherWorkspaces = DEFAULT_LAUNCHER_CATEGORIES
    .flatMap((category) => category.entries)
    .map((entry) => entry.id)
    .filter((workspace) => workspace !== 'labs');
  for (const workspace of launcherWorkspaces) {
    if ((successfulWorkspaceCounts[workspace] ?? 0) < 2) {
      throw new Error(`Print hygiene needs at least two successful ${workspace} cases.`);
    }
  }

  return {
    schemaVersion: 1,
    acceptedReason,
    caseCount: entries.length,
    workspaceCounts,
    successfulWorkspaceCounts,
    entries,
  };
}
