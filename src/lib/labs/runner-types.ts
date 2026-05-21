export type LabRunnerInputKind = 'equation' | 'expression' | 'corpus-case';
export type LabRunnerCategory =
  | 'local-stable-probe'
  | 'local-playground-experiment'
  | 'corpus-comparison';
export type LabRunnerExecutionScope = 'dev-only-local';
export type LabRunnerHistoryPolicy = 'no-history';
export type LabRunnerSourceMirrorPolicy = 'no-source-mirror-execution';
export type LabRunnerRemotePolicy = 'no-remote-execution';

export type LabRunnerCorpusCase = {
  id: string;
  label: string;
  latex: string;
};

export type LabRunnerSummary = {
  runnerId: string;
  experimentId: string;
  title: string;
  description: string;
  runnerCategory: LabRunnerCategory;
  executionScope: LabRunnerExecutionScope;
  historyPolicy: LabRunnerHistoryPolicy;
  sourceMirrorPolicy: LabRunnerSourceMirrorPolicy;
  remotePolicy: LabRunnerRemotePolicy;
  acceptedInputKinds: readonly LabRunnerInputKind[];
  defaultInputKind: LabRunnerInputKind;
  defaultLatex?: string;
  corpusCases?: LabRunnerCorpusCase[];
};

export type LabRunRequest = {
  runnerId: string;
  inputKind: LabRunnerInputKind;
  latex?: string;
  corpusCaseId?: string;
};

export type LabRunSummaryItem = {
  label: string;
  value: string;
};

export type LabRunComparisonRow = {
  label: string;
  inputLatex?: string;
  classification?: string;
  baselineWinningStage?: string | null;
  alternateWinningStage?: string | null;
  baselineAttemptCount?: number;
  alternateAttemptCount?: number;
};

export type LabRunResult = {
  runnerId: string;
  experimentId: string;
  title: string;
  inputKind: LabRunnerInputKind;
  status: 'success' | 'error';
  summary: LabRunSummaryItem[];
  comparisonRows: LabRunComparisonRow[];
  warnings: string[];
  logs: string[];
  outputLatex?: string;
  outputText?: string;
  raw: unknown;
};
