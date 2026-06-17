import type {
  DisplayOutcome,
  ModeId,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

export type WorkspaceDisplayReplayVariableSubstitutions = {
  mode: ModeId;
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

export type WorkspaceDisplayState = {
  displayOutcome: DisplayOutcome | null;
  ansLatex: string;
  replayVariableSubstitutions: WorkspaceDisplayReplayVariableSubstitutions;
};

export const EMPTY_WORKSPACE_DISPLAY_STATE: WorkspaceDisplayState = {
  displayOutcome: null,
  ansLatex: '0',
  replayVariableSubstitutions: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeWorkspaceDisplayState(value: unknown): WorkspaceDisplayState {
  if (!isRecord(value)) {
    return EMPTY_WORKSPACE_DISPLAY_STATE;
  }

  return {
    displayOutcome: isRecord(value.displayOutcome)
      ? value.displayOutcome as DisplayOutcome
      : null,
    ansLatex: typeof value.ansLatex === 'string' ? value.ansLatex : '0',
    replayVariableSubstitutions: isRecord(value.replayVariableSubstitutions)
      ? value.replayVariableSubstitutions as WorkspaceDisplayReplayVariableSubstitutions
      : null,
  };
}

export function applyWorkspaceDisplayOutcome(
  currentValue: unknown,
  outcome: DisplayOutcome,
): WorkspaceDisplayState {
  const current = normalizeWorkspaceDisplayState(currentValue);
  return {
    ...current,
    displayOutcome: outcome,
    ansLatex: outcome.kind === 'success' && outcome.exactLatex
      ? outcome.exactLatex
      : current.ansLatex,
  };
}
