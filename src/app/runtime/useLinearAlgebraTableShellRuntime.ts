import {
  useMemo,
  type MutableRefObject,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import { createKeyboardContext } from '../../lib/virtual-keyboard/capabilities';
import { buildVirtualKeyboardLayouts } from '../../lib/virtual-keyboard/layouts';
import type {
  AngleUnit,
  DisplayOutcome,
  HistoryEntry,
  ModeId,
  SettingsPatch,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type { WorkspaceInstance } from './workspace-instances';
import { useLinearAlgebraRuntime } from './useLinearAlgebraRuntime';
import { useTableRuntime } from './useTableRuntime';

type CommitLinearTableOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'matrix' | 'vector' | 'table',
  context?: Partial<Pick<HistoryEntry, 'matrixSeed' | 'vectorSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

type ReplayVariableSubstitutions = {
  mode: ModeId;
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

type UseLinearAlgebraTableShellRuntimeOptions = {
  activeFieldRef: MutableRefObject<MathfieldElement | null>;
  angleUnit: AngleUnit;
  commitOutcome: CommitLinearTableOutcome;
  currentMode: ModeId;
  currentModeRef: MutableRefObject<ModeId>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  patchSettings: (patch: SettingsPatch) => void;
  replayVariableSubstitutions: ReplayVariableSubstitutions;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  setRuntimeStatusOverride: (status: string | null) => void;
  storedVariables: StoredVariableValue[];
  clearReplayVariableSubstitutions: () => void;
};

type WorkspaceHostCallbacks = {
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: (mode: 'matrix' | 'vector' | 'table') => void;
};

const MATRIX_KEYBOARD_LAYOUTS = buildVirtualKeyboardLayouts(createKeyboardContext('matrix'));
const TABLE_KEYBOARD_LAYOUTS = buildVirtualKeyboardLayouts(createKeyboardContext('table'));
const VECTOR_KEYBOARD_LAYOUTS = buildVirtualKeyboardLayouts(createKeyboardContext('vector'));

function cloneMatrix(matrix: readonly number[][]) {
  return matrix.map((row) => [...row]);
}

function cloneVector(vector: readonly number[]) {
  return [...vector];
}

export function useLinearAlgebraTableShellRuntime({
  activeFieldRef,
  angleUnit,
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
  isLauncherOpen,
  patchSettings,
  replayVariableSubstitutions,
  reserveHistoryTicket,
  setRuntimeStatusOverride,
  storedVariables,
  clearReplayVariableSubstitutions,
}: UseLinearAlgebraTableShellRuntimeOptions) {
  const linearAlgebraRuntime = useLinearAlgebraRuntime({
    angleUnit,
    commitOutcome,
    discardHistoryTicket,
    getCurrentMode: () => currentModeRef.current,
    reserveHistoryTicket,
    setRuntimeStatusOverride,
  });

  const tableRuntime = useTableRuntime({
    commitOutcome,
    variableMemory: storedVariables,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions,
    getActiveWorkspaceInstanceRuntimeContext,
    getWorkspaceInstances,
    setRuntimeStatusOverride,
    reserveHistoryTicket,
    discardHistoryTicket,
  });

  const persistenceState = useMemo(
    () => ({
      tablePrimaryLatex: tableRuntime.tablePrimaryLatex,
      tableSecondaryLatex: tableRuntime.tableSecondaryLatex,
      tableSecondaryEnabled: tableRuntime.tableSecondaryEnabled,
      tableStart: tableRuntime.tableStart,
      tableEnd: tableRuntime.tableEnd,
      tableStep: tableRuntime.tableStep,
      matrixA: linearAlgebraRuntime.matrixA,
      matrixB: linearAlgebraRuntime.matrixB,
      matrixValues: linearAlgebraRuntime.matrixValues,
      activeMatrixLeftId: linearAlgebraRuntime.activeMatrixLeftId,
      activeMatrixRightId: linearAlgebraRuntime.activeMatrixRightId,
      matrixEditorLatex: linearAlgebraRuntime.matrixEditorLatex,
      vectorA: linearAlgebraRuntime.vectorA,
      vectorB: linearAlgebraRuntime.vectorB,
      vectorValues: linearAlgebraRuntime.vectorValues,
      activeVectorLeftId: linearAlgebraRuntime.activeVectorLeftId,
      activeVectorRightId: linearAlgebraRuntime.activeVectorRightId,
      vectorEditorLatex: linearAlgebraRuntime.vectorEditorLatex,
    }),
    [
      linearAlgebraRuntime.activeMatrixLeftId,
      linearAlgebraRuntime.activeMatrixRightId,
      linearAlgebraRuntime.activeVectorLeftId,
      linearAlgebraRuntime.activeVectorRightId,
      linearAlgebraRuntime.matrixA,
      linearAlgebraRuntime.matrixB,
      linearAlgebraRuntime.matrixEditorLatex,
      linearAlgebraRuntime.matrixValues,
      linearAlgebraRuntime.vectorA,
      linearAlgebraRuntime.vectorB,
      linearAlgebraRuntime.vectorEditorLatex,
      linearAlgebraRuntime.vectorValues,
      tableRuntime.tableEnd,
      tableRuntime.tablePrimaryLatex,
      tableRuntime.tableSecondaryEnabled,
      tableRuntime.tableSecondaryLatex,
      tableRuntime.tableStart,
      tableRuntime.tableStep,
    ],
  );

  const activeExpressionLatex =
    currentMode === 'matrix'
      ? linearAlgebraRuntime.matrixEditorLatex
      : currentMode === 'vector'
        ? linearAlgebraRuntime.vectorEditorLatex
        : currentMode === 'table'
          ? tableRuntime.tablePrimaryLatex
          : '';
  const isLinearAlgebraTableMode =
    currentMode === 'matrix' || currentMode === 'vector' || currentMode === 'table';

  function resetLinearAlgebraRuntime() {
    linearAlgebraRuntime.resetMatrixValues();
    linearAlgebraRuntime.setMatrixEditorLatex('');
    linearAlgebraRuntime.resetVectorValues();
    linearAlgebraRuntime.setVectorEditorLatex('');
  }

  function resetTableRuntime() {
    tableRuntime.setTablePrimaryLatex('');
    tableRuntime.setTableSecondaryLatex('');
    tableRuntime.setTableSecondaryEnabled(false);
    tableRuntime.setTableStart(-2);
    tableRuntime.setTableEnd(2);
    tableRuntime.setTableStep(1);
  }

  function resetLinearAlgebraTableRuntime() {
    resetTableRuntime();
    resetLinearAlgebraRuntime();
  }

  function clearActiveLinearAlgebraTableDraft() {
    if (currentMode === 'table') {
      tableRuntime.clearTable();
    } else if (currentMode === 'matrix') {
      linearAlgebraRuntime.setMatrixEditorLatex('');
    } else if (currentMode === 'vector') {
      linearAlgebraRuntime.setVectorEditorLatex('');
    }
  }

  function loadTablePrimaryLatex(latex: string) {
    tableRuntime.setTablePrimaryLatex(latex);
  }

  function restoreLinearAlgebraTableHistoryEntry(entry: HistoryEntry) {
    if (entry.mode === 'table') {
      tableRuntime.clearTable();
      tableRuntime.setTablePrimaryLatex(entry.inputLatex);
      return true;
    }

    if (entry.mode === 'matrix' && entry.matrixSeed) {
      linearAlgebraRuntime.resetMatrixValues();
      linearAlgebraRuntime.setMatrixA(cloneMatrix(entry.matrixSeed.matrixA));
      if (entry.matrixSeed.matrixB) {
        linearAlgebraRuntime.setMatrixB(cloneMatrix(entry.matrixSeed.matrixB));
      }
      linearAlgebraRuntime.setMatrixEditorLatex(entry.matrixSeed.editorExpressionLatex ?? entry.inputLatex);
      return true;
    }

    if (entry.mode === 'vector' && entry.vectorSeed) {
      linearAlgebraRuntime.resetVectorValues();
      linearAlgebraRuntime.setVectorA(cloneVector(entry.vectorSeed.vectorA));
      if (entry.vectorSeed.vectorB) {
        linearAlgebraRuntime.setVectorB(cloneVector(entry.vectorSeed.vectorB));
      }
      if (entry.vectorSeed.angleUnit !== angleUnit) {
        patchSettings({ angleUnit: entry.vectorSeed.angleUnit });
      }
      linearAlgebraRuntime.setVectorEditorLatex(entry.vectorSeed.editorExpressionLatex ?? entry.inputLatex);
      return true;
    }

    return false;
  }

  function buildWorkspaceHostProps({
    onOpenGuideArticle,
    onOpenGuideMode,
  }: WorkspaceHostCallbacks) {
    return {
      activeFieldRef,
      currentMode,
      isLauncherOpen,
      linearAlgebraRuntime,
      onOpenGuideArticle,
      onOpenGuideMode,
      tableKeyboardLayouts: TABLE_KEYBOARD_LAYOUTS,
      tableRuntime,
      variableMemory: storedVariables,
    };
  }

  return {
    activeExpressionLatex,
    buildWorkspaceHostProps,
    captureMatrixSurfaceState: linearAlgebraRuntime.captureMatrixSurfaceState,
    captureTableSurfaceState: tableRuntime.captureTableSurfaceState,
    captureVectorSurfaceState: linearAlgebraRuntime.captureVectorSurfaceState,
    clearActiveLinearAlgebraTableDraft,
    isLinearAlgebraTableMode,
    linearAlgebraRuntime,
    loadTablePrimaryLatex,
    matrixKeyboardLayouts: MATRIX_KEYBOARD_LAYOUTS,
    persistenceState,
    resetLinearAlgebraTableRuntime,
    restoreMatrixSurfaceState: linearAlgebraRuntime.restoreMatrixSurfaceState,
    restoreTableSurfaceState: tableRuntime.restoreTableSurfaceState,
    restoreVectorSurfaceState: linearAlgebraRuntime.restoreVectorSurfaceState,
    restoreLinearAlgebraTableHistoryEntry,
    runMatrixEditorAction: linearAlgebraRuntime.runMatrixEditorAction,
    runMatrixAction: linearAlgebraRuntime.runMatrixAction,
    runTableAction: tableRuntime.runTableAction,
    runVectorEditorAction: linearAlgebraRuntime.runVectorEditorAction,
    runVectorAction: linearAlgebraRuntime.runVectorAction,
    tableKeyboardLayouts: TABLE_KEYBOARD_LAYOUTS,
    tableRuntime,
    toggleTableSecondary: tableRuntime.toggleTableSecondary,
    vectorKeyboardLayouts: VECTOR_KEYBOARD_LAYOUTS,
  };
}
