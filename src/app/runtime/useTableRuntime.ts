import { useRef, useState } from 'react';
import type {
  DisplayOutcome,
  ModeId,
  StoredVariableValue,
  TableResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { isOoeCommitAllowed } from '../../lib/ooe/job-contract';
import type { RunTableModeRequest } from '../../lib/modes/table';

type CommitTableOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'table',
) => void;

type UseTableRuntimeOptions = {
  commitOutcome: CommitTableOutcome;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions?: {
    mode: ModeId;
    inputLatex: string;
    substitutions: VariableSubstitutionSnapshot[];
  } | null;
  clearReplayVariableSubstitutions?: () => void;
};

type ActiveTableRuntimeState = {
  primaryLatex: string;
  secondaryLatex: string;
  secondaryEnabled: boolean;
  start: number;
  end: number;
  step: number;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions?: {
    mode: ModeId;
    inputLatex: string;
    substitutions: VariableSubstitutionSnapshot[];
  } | null;
};

function buildTableRequestFromState(state: ActiveTableRuntimeState): RunTableModeRequest {
  return {
    primaryLatex: state.primaryLatex,
    secondaryLatex: state.secondaryLatex,
    secondaryEnabled: state.secondaryEnabled,
    start: state.start,
    end: state.end,
    step: state.step,
    storedVariables: state.variableMemory,
    variableSubstitutionSnapshot:
      state.replayVariableSubstitutions?.mode === 'table'
      && state.replayVariableSubstitutions.inputLatex === state.primaryLatex
        ? state.replayVariableSubstitutions.substitutions
        : undefined,
  };
}

export function useTableRuntime({
  commitOutcome,
  variableMemory,
  replayVariableSubstitutions,
  clearReplayVariableSubstitutions,
}: UseTableRuntimeOptions) {
  const [tablePrimaryLatex, setTablePrimaryLatex] = useState('x^2');
  const [tableSecondaryLatex, setTableSecondaryLatex] = useState('x+1');
  const [tableSecondaryEnabled, setTableSecondaryEnabled] = useState(false);
  const [tableStart, setTableStart] = useState(-2);
  const [tableEnd, setTableEnd] = useState(2);
  const [tableStep, setTableStep] = useState(1);
  const [tableResponse, setTableResponse] = useState<TableResponse | null>(null);
  const activeTableRuntimeRef = useRef<ActiveTableRuntimeState | null>(null);

  activeTableRuntimeRef.current = {
    primaryLatex: tablePrimaryLatex,
    secondaryLatex: tableSecondaryLatex,
    secondaryEnabled: tableSecondaryEnabled,
    start: tableStart,
    end: tableEnd,
    step: tableStep,
    variableMemory,
    replayVariableSubstitutions,
  };

  function clearTable() {
    setTablePrimaryLatex('');
    setTableSecondaryLatex('');
    setTableResponse(null);
  }

  function runTableAction() {
    void import('../../lib/modes/table')
      .then(async ({ buildTableOoeInputRevisionId, runTableModeWithOoePilot }) => {
        const startedState = activeTableRuntimeRef.current;
        const request = startedState
          ? buildTableRequestFromState(startedState)
          : buildTableRequestFromState({
              primaryLatex: tablePrimaryLatex,
              secondaryLatex: tableSecondaryLatex,
              secondaryEnabled: tableSecondaryEnabled,
              start: tableStart,
              end: tableEnd,
              step: tableStep,
              variableMemory,
              replayVariableSubstitutions,
            });

        const result = await runTableModeWithOoePilot(request, {
          activeInputRevisionId: () => {
            const activeState = activeTableRuntimeRef.current;
            return activeState
              ? buildTableOoeInputRevisionId(buildTableRequestFromState(activeState))
              : null;
          },
        });

        if (!isOoeCommitAllowed(result.ooe.commitAssessment)) {
          return;
        }

        setTableResponse(result.payload.response);
        commitOutcome(result.payload.outcome, request.primaryLatex, 'table');
        clearReplayVariableSubstitutions?.();
      })
      .catch((error: unknown) => {
        commitOutcome(
          {
            kind: 'error',
            title: 'Table',
            error: error instanceof Error
              ? `Could not load the Table runtime: ${error.message}`
              : 'Could not load the Table runtime.',
            warnings: [],
          },
          tablePrimaryLatex,
          'table',
        );
      });
  }

  function toggleTableSecondary() {
    setTableSecondaryEnabled((enabled) => !enabled);
  }

  return {
    clearTable,
    runTableAction,
    setTableEnd,
    setTablePrimaryLatex,
    setTableSecondaryEnabled,
    setTableSecondaryLatex,
    setTableStart,
    setTableStep,
    tableEnd,
    tablePrimaryLatex,
    tableResponse,
    tableSecondaryEnabled,
    tableSecondaryLatex,
    tableStart,
    tableStep,
    toggleTableSecondary,
  };
}
