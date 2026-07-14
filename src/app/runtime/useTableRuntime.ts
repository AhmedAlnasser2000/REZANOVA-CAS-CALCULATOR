import { useRef, useState } from 'react';
import type {
  CanonicalRuntimeOutcome,
  ModeId,
  StoredVariableValue,
  TableResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';
import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import type { RunTableModeRequest } from '../../lib/modes/table';
import {
  ooeJobContextFromHistoryTicket,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import type { TableSurfaceState } from './workspace-surface-state';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { normalizeWorkspaceDisplayState } from './workspace-display-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';
import { resolveWorkspaceOriginInputRevision } from './workspace-origin-input-revision';
import { createCanonicalRuntimeError } from '../../lib/result-contract';

type CommitTableOutcome = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'table',
  context?: {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    tableResponse?: TableResponse;
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
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  setRuntimeStatusOverride?: (message: string) => void;
  reserveHistoryTicket?: (input: {
    mode: 'table';
    inputLatex: string;
    capabilityId: string;
    inputRevisionId: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
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

function cloneTableResponse(response: TableResponse): TableResponse {
  return {
    headers: [...response.headers],
    rows: response.rows.map((row) => ({ ...row })),
    warnings: [...response.warnings],
    ...(response.error ? { error: response.error } : {}),
  };
}

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

function isTableSurfaceState(value: WorkspaceInstanceStateSlot): value is TableSurfaceState {
  return typeof value === 'object'
    && value !== null
    && typeof (value as TableSurfaceState).tablePrimaryLatex === 'string';
}

export function useTableRuntime({
  commitOutcome,
  variableMemory,
  replayVariableSubstitutions,
  clearReplayVariableSubstitutions,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
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

  function tableRequestFromSurfaceState(
    surfaceState: WorkspaceInstanceStateSlot,
    instance: WorkspaceInstance,
  ) {
    if (instance.workspaceKind !== 'table' || !isTableSurfaceState(surfaceState)) {
      return null;
    }

    const displayState = normalizeWorkspaceDisplayState(instance.displayState);
    return buildTableRequestFromState({
      primaryLatex: surfaceState.tablePrimaryLatex,
      secondaryLatex: surfaceState.tableSecondaryLatex,
      secondaryEnabled: surfaceState.tableSecondaryEnabled,
      start: surfaceState.tableStart,
      end: surfaceState.tableEnd,
      step: surfaceState.tableStep,
      variableMemory,
      replayVariableSubstitutions: displayState.replayVariableSubstitutions,
    });
  }

  function runTableAction() {
    const launchWorkspaceInstance = getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
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
          workspaceInstance: launchWorkspaceInstance,
        }) ?? null;
        launchedHistoryTicket = historyTicket;

        const result = await runTableModeWithOoePilot(request, {
          activeInputRevisionId: (job: OoeJobIdentity) => {
            const activeState = activeTableRuntimeRef.current;
            return resolveWorkspaceOriginInputRevision(job, {
              buildInputRevisionId: buildTableOoeInputRevisionId,
              getActiveWorkspaceInstanceRuntimeContext,
              getWorkspaceInstances,
              readLiveRequest: () => activeState ? buildTableRequestFromState(activeState) : null,
              readRequestFromSurfaceState: tableRequestFromSurfaceState,
            });
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
              tableResponse: result.payload.response,
            },
          );
        } else {
          commitOutcome(result.payload.outcome, request.primaryLatex, 'table', {
            tableResponse: result.payload.response,
          });
        }
        clearReplayVariableSubstitutions?.();
      })
      .catch((error: unknown) => {
        discardHistoryTicket?.(launchedHistoryTicket?.id);
        commitOutcome(
          createCanonicalRuntimeError(
            'Table',
            error instanceof Error
              ? `Could not load the Table runtime: ${error.message}`
              : 'Could not load the Table runtime.',
          ),
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
        ? cloneTableResponse(tableResponse)
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
    setTableResponse(state?.tableResponse ? cloneTableResponse(state.tableResponse) : null);
  }

  function restoreHistoryTableResult(inputLatex: string, response?: TableResponse) {
    setTablePrimaryLatex(inputLatex);
    setTableSecondaryEnabled(Boolean(response && response.headers.length > 2));
    setTableSecondaryLatex(response?.headers[2] ?? '');
    setTableResponse(response ? cloneTableResponse(response) : null);
  }

  return {
    captureTableSurfaceState,
    clearTable,
    restoreHistoryTableResult,
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
