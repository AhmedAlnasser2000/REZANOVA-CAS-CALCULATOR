import { useState } from 'react';
import { runTableMode } from '../../lib/modes/table';
import type {
  DisplayOutcome,
  ModeId,
  StoredVariableValue,
  TableResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

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

  function clearTable() {
    setTablePrimaryLatex('');
    setTableSecondaryLatex('');
    setTableResponse(null);
  }

  function runTableAction() {
    const result = runTableMode({
      primaryLatex: tablePrimaryLatex,
      secondaryLatex: tableSecondaryLatex,
      secondaryEnabled: tableSecondaryEnabled,
      start: tableStart,
      end: tableEnd,
      step: tableStep,
      storedVariables: variableMemory,
      variableSubstitutionSnapshot:
        replayVariableSubstitutions?.mode === 'table'
        && replayVariableSubstitutions.inputLatex === tablePrimaryLatex
          ? replayVariableSubstitutions.substitutions
          : undefined,
    });

    setTableResponse(result.response);
    commitOutcome(result.outcome, tablePrimaryLatex, 'table');
    clearReplayVariableSubstitutions?.();
  }

  function toggleTableSecondary() {
    setTableSecondaryEnabled((enabled) => !enabled);
  }

  return {
    clearTable,
    runTableAction,
    setTableEnd,
    setTablePrimaryLatex,
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
