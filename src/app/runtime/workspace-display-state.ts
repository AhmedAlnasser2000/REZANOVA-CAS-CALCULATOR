import type {
  DisplayOutcome,
  ModeId,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { resolveCanonicalResultForConsumer } from '../../lib/result-contract';

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
  if (outcome.kind === 'prompt') {
    return { ...current, displayOutcome: outcome };
  }
  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(
      `Workspace display state requires canonical result authority: ${resolution.failure.reason}.`,
    );
  }
  const primaryLatex = resolution.document.primaryMath?.canonicalLatex;
  return {
    ...current,
    displayOutcome: outcome,
    ansLatex: outcome.kind === 'success' && primaryLatex
      ? primaryLatex
      : current.ansLatex,
  };
}
