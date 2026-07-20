import {
  useMemo,
  type RefObject,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import { createKeyboardContext } from '../../lib/virtual-keyboard/capabilities';
import { buildVirtualKeyboardLayouts } from '../../lib/virtual-keyboard/layouts';
import type {
  AngleUnit,
  CanonicalRuntimeOutcome,
  ComplexExactForm,
  HistoryEntry,
  ModeId,
  SettingsPatch,
  StoredVariableValue,
  TableResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type { WorkspaceInstance } from './workspace-instances';
import { useLinearAlgebraRuntime } from './useLinearAlgebraRuntime';
import { useTableRuntime } from './useTableRuntime';
import { readHistoryResult } from './historyDisplayEntry';
import {
  cloneMatrixNamedValues,
  cloneVectorNamedValues,
  numericMatrixFromNamedValue,
  numericVectorFromNamedValue,
} from '../../lib/linear-algebra/named-values';

type CommitLinearTableOutcome = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'matrix' | 'vector' | 'table',
  context?: Partial<Pick<HistoryEntry, 'matrixSeed' | 'vectorSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
    tableResponse?: TableResponse;
  },
) => void;

type ReplayVariableSubstitutions = {
  mode: ModeId;
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

type UseLinearAlgebraTableShellRuntimeOptions = {
  activeFieldRef: RefObject<MathfieldElement | null>;
  angleUnit: AngleUnit;
  approxDigits?: number;
  complexExactForm?: ComplexExactForm;
  commitOutcome: CommitLinearTableOutcome;
  currentMode: ModeId;
  currentModeRef: RefObject<ModeId>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  mainFieldRef?: RefObject<MathfieldElement | null>;
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

function cloneMatrixValues(values: NonNullable<HistoryEntry['matrixSeed']>['matrixValues']) {
  return values ? cloneMatrixNamedValues(values) : undefined;
}

function cloneVectorValues(values: NonNullable<HistoryEntry['vectorSeed']>['vectorValues']) {
  return values ? cloneVectorNamedValues(values) : undefined;
}

export function useLinearAlgebraTableShellRuntime({
  activeFieldRef,
  angleUnit,
  approxDigits,
  complexExactForm = 'rectangular',
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
  isLauncherOpen,
  mainFieldRef,
  patchSettings,
  replayVariableSubstitutions,
  reserveHistoryTicket,
  setRuntimeStatusOverride,
  storedVariables,
  clearReplayVariableSubstitutions,
}: UseLinearAlgebraTableShellRuntimeOptions) {
  const linearAlgebraRuntime = useLinearAlgebraRuntime({
    angleUnit,
    approxDigits,
    complexExactForm,
    commitOutcome,
    discardHistoryTicket,
    getCurrentMode: () => currentModeRef.current,
    reserveHistoryTicket,
    setRuntimeStatusOverride,
    storedVariables,
    syncEditorLatex: (mode, latex) => {
      if (currentModeRef.current !== mode) {
        return;
      }
      const field = activeFieldRef.current?.isConnected
        ? activeFieldRef.current
        : mainFieldRef?.current;
      if (!field?.isConnected || field.getValue?.('latex') === latex) {
        return;
      }
      field.setValue(latex);
    },
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
      tableRuntime.restoreHistoryTableResult(
        entry.inputLatex,
        readHistoryResult(entry).tableResponse,
      );
      return true;
    }

    if (entry.mode === 'matrix' && entry.matrixSeed) {
      if (entry.matrixSeed.matrixValues?.length) {
        const leftValue = entry.matrixSeed.matrixValues.find((value) => value.id === entry.matrixSeed?.activeMatrixLeftId)
          ?? entry.matrixSeed.matrixValues[0];
        const rightValue = entry.matrixSeed.matrixValues.find((value) => value.id === entry.matrixSeed?.activeMatrixRightId)
          ?? entry.matrixSeed.matrixValues[1]
          ?? leftValue;
        const matrixA = leftValue ? numericMatrixFromNamedValue(leftValue) ?? [[0]] : [[0]];
        const matrixB = rightValue ? numericMatrixFromNamedValue(rightValue) ?? [[0]] : matrixA;
        linearAlgebraRuntime.restoreMatrixSurfaceState({
          matrixA: cloneMatrix(matrixA),
          matrixB: cloneMatrix(matrixB),
          matrixValues: cloneMatrixValues(entry.matrixSeed.matrixValues),
          activeMatrixLeftId: entry.matrixSeed.activeMatrixLeftId,
          activeMatrixRightId: entry.matrixSeed.activeMatrixRightId,
          matrixEditorLatex: entry.matrixSeed.editorExpressionLatex ?? entry.inputLatex,
          matrixDomain: entry.matrixSeed.domain ?? 'real',
          matrixSubstitutionMode: entry.matrixSeed.substitutionMode ?? 'symbolic',
          matrixSubstitutionSnapshot: entry.matrixSeed.substitutionSnapshot,
        });
        if (entry.matrixSeed.complexExactForm && entry.matrixSeed.complexExactForm !== complexExactForm) {
          patchSettings({ complexExactForm: entry.matrixSeed.complexExactForm });
        }
        return true;
      }
      if (entry.matrixSeed.operandEncoding === 'scalar-v1') return false;
      linearAlgebraRuntime.resetMatrixValues();
      linearAlgebraRuntime.setMatrixA(cloneMatrix(entry.matrixSeed.matrixA));
      if (entry.matrixSeed.matrixB) {
        linearAlgebraRuntime.setMatrixB(cloneMatrix(entry.matrixSeed.matrixB));
      }
      linearAlgebraRuntime.setMatrixEditorLatex(entry.matrixSeed.editorExpressionLatex ?? entry.inputLatex);
      return true;
    }

    if (entry.mode === 'vector' && entry.vectorSeed) {
      if (entry.vectorSeed.vectorValues?.length) {
        const leftValue = entry.vectorSeed.vectorValues.find((value) => value.id === entry.vectorSeed?.activeVectorLeftId)
          ?? entry.vectorSeed.vectorValues[0];
        const rightValue = entry.vectorSeed.vectorValues.find((value) => value.id === entry.vectorSeed?.activeVectorRightId)
          ?? entry.vectorSeed.vectorValues[1]
          ?? leftValue;
        const vectorA = leftValue ? numericVectorFromNamedValue(leftValue) ?? [0] : [0];
        const vectorB = rightValue ? numericVectorFromNamedValue(rightValue) ?? [0] : vectorA;
        linearAlgebraRuntime.restoreVectorSurfaceState({
          vectorA: cloneVector(vectorA),
          vectorB: cloneVector(vectorB),
          vectorValues: cloneVectorValues(entry.vectorSeed.vectorValues),
          activeVectorLeftId: entry.vectorSeed.activeVectorLeftId,
          activeVectorRightId: entry.vectorSeed.activeVectorRightId,
          vectorEditorLatex: entry.vectorSeed.editorExpressionLatex ?? entry.inputLatex,
          vectorDomain: entry.vectorSeed.domain ?? 'real',
          vectorSubstitutionMode: entry.vectorSeed.substitutionMode ?? 'symbolic',
          vectorSubstitutionSnapshot: entry.vectorSeed.substitutionSnapshot,
        });
        if (entry.vectorSeed.angleUnit !== angleUnit) {
          patchSettings({ angleUnit: entry.vectorSeed.angleUnit });
        }
        if (entry.vectorSeed.complexExactForm && entry.vectorSeed.complexExactForm !== complexExactForm) {
          patchSettings({ complexExactForm: entry.vectorSeed.complexExactForm });
        }
        return true;
      }
      if (entry.vectorSeed.operandEncoding === 'scalar-v1') return false;
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
