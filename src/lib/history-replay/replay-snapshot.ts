import type {
  HistoryEntry,
  HistoryReplayClassification,
  HistoryReplaySnapshotV1,
  Settings,
} from '../../types/calculator';

export function buildHistoryReplaySnapshot(
  settings: Settings,
  ansLatex: string,
): HistoryReplaySnapshotV1 {
  return {
    version: 1,
    ansLatex,
    angleUnit: settings.angleUnit,
    outputStyle: settings.outputStyle,
    equationAnswerMode: settings.equationAnswerMode,
    equationDomainIntent: settings.equationDomainIntent,
    complexExactForm: settings.complexExactForm,
    mathNotationDisplay: settings.mathNotationDisplay,
    historyInspectorNotationMode: settings.historyInspectorNotationMode,
    historyPageNotationMode: settings.historyPageNotationMode,
    symbolicDisplayMode: settings.symbolicDisplayMode,
    flattenNestedRootsWhenSafe: settings.flattenNestedRootsWhenSafe,
    approxDigits: settings.approxDigits,
    numericNotationMode: settings.numericNotationMode,
    scientificNotationStyle: settings.scientificNotationStyle,
    detailedFactsEnabled: settings.detailedFactsEnabled,
  };
}

export function classifyHistoryReplayEntry(
  entry: Pick<HistoryEntry, 'replaySnapshot'>,
): HistoryReplayClassification {
  return entry.replaySnapshot?.version === 1
    ? 'versioned-deterministic'
    : 'legacy-nondeterministic';
}
