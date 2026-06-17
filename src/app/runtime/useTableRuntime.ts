import { useRef, useState } from 'react';
import type {
  DisplayOutcome,
  ModeId,
  StoredVariableValue,
  TableResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import type { RunTableModeRequest } from '../../lib/modes/table';
import {
  ooeJobContextFromHistoryTicket,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import type { TableSurfaceState } from './workspace-surface-state';

type CommitTableOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'table',
  context?: {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
  },
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
  setRuntimeStatusOverride?: (message: string) => void;
  reserveHistoryTicket?: (input: {
    mode: 'table';
    inputLatex: string;
    capabilityId: string;
    inputRevisionId: string;
  }) => PendingHistoryTicketReservation | null;
  discardHistoryTicket?: (ticketId?: string | null) => void;
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

const DEFAULT_TABLE_PRIMARY_LATEX = 'x^2';
const DEFAULT_TABLE_SECONDARY_LATEX = 'x+1';
const DEFAULT_TABLE_START = -2;
const DEFAULT_TABLE_END = 2;
const DEFAULT_TABLE_STEP = 1;

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
  setRuntimeStatusOverride,
  reserveHistoryTicket,
  discardHistoryTicket,
}: UseTableRuntimeOptions) {
  const [tablePrimaryLatex, setTablePrimaryLatex] = useState(DEFAULT_TABLE_PRIMARY_LATEX);
  const [tableSecondaryLatex, setTableSecondaryLatex] = useState(DEFAULT_TABLE_SECONDARY_LATEX);
  const [tableSecondaryEnabled, setTableSecondaryEnabled] = useState(false);
  const [tableStart, setTableStart] = useState(DEFAULT_TABLE_START);
  const [tableEnd, setTableEnd] = useState(DEFAULT_TABLE_END);
  const [tableStep, setTableStep] = useState(DEFAULT_TABLE_STEP);
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
    let launchedHistoryTicket: PendingHistoryTicketReservation | null = null;
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

        const inputRevisionId = buildTableOoeInputRevisionId(request);
        const historyTicket = reserveHistoryTicket?.({
          mode: 'table',
          inputLatex: request.primaryLatex,
          capabilityId: 'table.build',
          inputRevisionId,
        }) ?? null;
        launchedHistoryTicket = historyTicket;

        const result = await runTableModeWithOoePilot(request, {
          activeInputRevisionId: () => {
            const activeState = activeTableRuntimeRef.current;
            return activeState
              ? buildTableOoeInputRevisionId(buildTableRequestFromState(activeState))
              : null;
          },
          ...ooeJobContextFromHistoryTicket(historyTicket),
        });

        if (result.ooe.completion?.kind === 'cancelled') {
          discardHistoryTicket?.(historyTicket?.id);
          setRuntimeStatusOverride?.('Table build stopped');
          return;
        }

        if (!isOoeCommitAllowed(result.ooe.commitAssessment)) {
          discardHistoryTicket?.(historyTicket?.id);
          return;
        }

        setTableResponse(result.payload.response);
        if (historyTicket) {
          commitOutcome(
            result.payload.outcome,
            request.primaryLatex,
            'table',
            {
              historyTicketId: historyTicket.id,
              historyLaunchOrder: historyTicket.historyLaunchOrder,
            },
          );
        } else {
          commitOutcome(result.payload.outcome, request.primaryLatex, 'table');
        }
        clearReplayVariableSubstitutions?.();
      })
      .catch((error: unknown) => {
        discardHistoryTicket?.(launchedHistoryTicket?.id);
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

  function captureTableSurfaceState(): TableSurfaceState {
    return {
      tablePrimaryLatex,
      tableSecondaryLatex,
      tableSecondaryEnabled,
      tableStart,
      tableEnd,
      tableStep,
      tableResponse: tableResponse
        ? {
          headers: [...tableResponse.headers],
          rows: tableResponse.rows.map((row) => ({ ...row })),
          warnings: [...tableResponse.warnings],
        }
        : null,
    };
  }

  function restoreTableSurfaceState(state: TableSurfaceState | null) {
    setTablePrimaryLatex(state?.tablePrimaryLatex ?? DEFAULT_TABLE_PRIMARY_LATEX);
    setTableSecondaryLatex(state?.tableSecondaryLatex ?? DEFAULT_TABLE_SECONDARY_LATEX);
    setTableSecondaryEnabled(state?.tableSecondaryEnabled ?? false);
    setTableStart(state?.tableStart ?? DEFAULT_TABLE_START);
    setTableEnd(state?.tableEnd ?? DEFAULT_TABLE_END);
    setTableStep(state?.tableStep ?? DEFAULT_TABLE_STEP);
    setTableResponse(state?.tableResponse
      ? {
        headers: [...state.tableResponse.headers],
        rows: state.tableResponse.rows.map((row) => ({ ...row })),
        warnings: [...state.tableResponse.warnings],
      }
      : null);
  }

  return {
    captureTableSurfaceState,
    clearTable,
    restoreTableSurfaceState,
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
