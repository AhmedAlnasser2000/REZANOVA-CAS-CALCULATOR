import {
  useMemo,
  useRef,
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
  setClipboardNotice: (notice: string | null) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  storedVariables: StoredVariableValue[];
  clearReplayVariableSubstitutions: () => void;
};

type WorkspaceHostCallbacks = {
  onCopyText: (text: string, message: string) => Promise<void>;
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
  setClipboardNotice,
  setRuntimeStatusOverride,
  storedVariables,
  clearReplayVariableSubstitutions,
}: UseLinearAlgebraTableShellRuntimeOptions) {
  const matrixNotationFieldRef = useRef<MathfieldElement | null>(null);
  const vectorNotationFieldRef = useRef<MathfieldElement | null>(null);

  const linearAlgebraRuntime = useLinearAlgebraRuntime({
    angleUnit,
    commitOutcome,
    discardHistoryTicket,
    getCurrentMode: () => currentModeRef.current,
    onMatrixNotationLoaded: () => {
      setClipboardNotice('Matrix notation loaded');
      setTimeout(() => {
        matrixNotationFieldRef.current?.focus();
      }, 0);
    },
    onVectorNotationLoaded: () => {
      setClipboardNotice('Vector notation loaded');
      setTimeout(() => {
        vectorNotationFieldRef.current?.focus();
      }, 0);
    },
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
      matrixNotationLatex: linearAlgebraRuntime.matrixNotationLatex,
      vectorA: linearAlgebraRuntime.vectorA,
      vectorB: linearAlgebraRuntime.vectorB,
      vectorNotationLatex: linearAlgebraRuntime.vectorNotationLatex,
    }),
    [
      linearAlgebraRuntime.matrixA,
      linearAlgebraRuntime.matrixB,
      linearAlgebraRuntime.matrixNotationLatex,
      linearAlgebraRuntime.vectorA,
      linearAlgebraRuntime.vectorB,
      linearAlgebraRuntime.vectorNotationLatex,
      tableRuntime.tableEnd,
      tableRuntime.tablePrimaryLatex,
      tableRuntime.tableSecondaryEnabled,
      tableRuntime.tableSecondaryLatex,
      tableRuntime.tableStart,
      tableRuntime.tableStep,
    ],
  );

  const activeExpressionLatex =
    currentMode === 'table' ? tableRuntime.tablePrimaryLatex : '';
  const isLinearAlgebraTableMode =
    currentMode === 'matrix' || currentMode === 'vector' || currentMode === 'table';

  function resetLinearAlgebraRuntime() {
    linearAlgebraRuntime.setMatrixA([
      [1, 2],
      [3, 4],
    ]);
    linearAlgebraRuntime.setMatrixB([
      [5, 6],
      [7, 8],
    ]);
    linearAlgebraRuntime.setMatrixNotationLatex('');
    linearAlgebraRuntime.setVectorA([1, 2, 3]);
    linearAlgebraRuntime.setVectorB([4, 5, 6]);
    linearAlgebraRuntime.setVectorNotationLatex('');
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
      linearAlgebraRuntime.setMatrixNotationLatex('');
    } else if (currentMode === 'vector') {
      linearAlgebraRuntime.setVectorNotationLatex('');
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
      linearAlgebraRuntime.setMatrixA(cloneMatrix(entry.matrixSeed.matrixA));
      if (entry.matrixSeed.matrixB) {
        linearAlgebraRuntime.setMatrixB(cloneMatrix(entry.matrixSeed.matrixB));
      }
      return true;
    }

    if (entry.mode === 'vector' && entry.vectorSeed) {
      linearAlgebraRuntime.setVectorA(cloneVector(entry.vectorSeed.vectorA));
      if (entry.vectorSeed.vectorB) {
        linearAlgebraRuntime.setVectorB(cloneVector(entry.vectorSeed.vectorB));
      }
      if (entry.vectorSeed.angleUnit !== angleUnit) {
        patchSettings({ angleUnit: entry.vectorSeed.angleUnit });
      }
      return true;
    }

    return false;
  }

  function buildWorkspaceHostProps({
    onCopyText,
    onOpenGuideArticle,
    onOpenGuideMode,
  }: WorkspaceHostCallbacks) {
    return {
      activeFieldRef,
      currentMode,
      isLauncherOpen,
      linearAlgebraRuntime,
      matrixKeyboardLayouts: MATRIX_KEYBOARD_LAYOUTS,
      matrixNotationFieldRef,
      onCopyText,
      onOpenGuideArticle,
      onOpenGuideMode,
      tableKeyboardLayouts: TABLE_KEYBOARD_LAYOUTS,
      tableRuntime,
      variableMemory: storedVariables,
      vectorKeyboardLayouts: VECTOR_KEYBOARD_LAYOUTS,
      vectorNotationFieldRef,
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
    matrixNotationFieldRef,
    persistenceState,
    resetLinearAlgebraTableRuntime,
    restoreMatrixSurfaceState: linearAlgebraRuntime.restoreMatrixSurfaceState,
    restoreTableSurfaceState: tableRuntime.restoreTableSurfaceState,
    restoreVectorSurfaceState: linearAlgebraRuntime.restoreVectorSurfaceState,
    restoreLinearAlgebraTableHistoryEntry,
    runMatrixAction: linearAlgebraRuntime.runMatrixAction,
    runTableAction: tableRuntime.runTableAction,
    runVectorAction: linearAlgebraRuntime.runVectorAction,
    tableKeyboardLayouts: TABLE_KEYBOARD_LAYOUTS,
    tableRuntime,
    toggleTableSecondary: tableRuntime.toggleTableSecondary,
    vectorKeyboardLayouts: VECTOR_KEYBOARD_LAYOUTS,
    vectorNotationFieldRef,
  };
}
