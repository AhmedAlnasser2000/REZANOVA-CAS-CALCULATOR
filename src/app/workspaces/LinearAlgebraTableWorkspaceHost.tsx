import type { RefObject } from 'react';
import { MatrixWorkspace } from './MatrixWorkspace';
import { TableWorkspace } from './TableWorkspace';
import { VectorWorkspace } from './VectorWorkspace';
import type { useLinearAlgebraRuntime } from '../runtime/useLinearAlgebraRuntime';
import type { useTableRuntime } from '../runtime/useTableRuntime';
import type { ModeId, StoredVariableValue } from '../../types/calculator';
import type { MathfieldElement, VirtualKeyboardLayout } from 'mathlive';

type LinearAlgebraRuntime = ReturnType<typeof useLinearAlgebraRuntime>;
type TableRuntime = ReturnType<typeof useTableRuntime>;

type LinearAlgebraTableWorkspaceHostProps = {
  activeFieldRef: RefObject<MathfieldElement | null>;
  currentMode: ModeId;
  isLauncherOpen: boolean;
  linearAlgebraRuntime: LinearAlgebraRuntime;
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: (mode: 'matrix' | 'vector' | 'table') => void;
  tableKeyboardLayouts: readonly VirtualKeyboardLayout[];
  tableRuntime: TableRuntime;
  variableMemory: StoredVariableValue[];
};

export function LinearAlgebraTableWorkspaceHost({
  activeFieldRef,
  currentMode,
  isLauncherOpen,
  linearAlgebraRuntime,
  onOpenGuideArticle,
  onOpenGuideMode,
  tableKeyboardLayouts,
  tableRuntime,
  variableMemory,
}: LinearAlgebraTableWorkspaceHostProps) {
  if (isLauncherOpen) {
    return null;
  }

  if (currentMode === 'matrix') {
    return (
      <MatrixWorkspace
        activeMatrixLeftId={linearAlgebraRuntime.activeMatrixLeftId}
        activeMatrixRightId={linearAlgebraRuntime.activeMatrixRightId}
        matrixValues={linearAlgebraRuntime.matrixValues}
        onOpenGuideMode={onOpenGuideMode}
        onOpenGuideArticle={onOpenGuideArticle}
        onAddMatrixValue={linearAlgebraRuntime.addMatrixValue}
        onDeleteMatrixValue={linearAlgebraRuntime.deleteMatrixValue}
        onDuplicateMatrixValue={linearAlgebraRuntime.duplicateMatrixValue}
        onInsertMatrixName={(name) => {
          linearAlgebraRuntime.setMatrixEditorLatex(`${linearAlgebraRuntime.matrixEditorLatex}${name}`);
        }}
        onRenameMatrixValue={linearAlgebraRuntime.renameMatrixValue}
        onResizeMatrixValue={linearAlgebraRuntime.resizeMatrixValueById}
        onSetActiveMatrixValueIds={linearAlgebraRuntime.setActiveMatrixValueIds}
        onSetMatrixCell={linearAlgebraRuntime.setMatrixValueCell}
      />
    );
  }

  if (currentMode === 'vector') {
    return (
      <VectorWorkspace
        activeVectorLeftId={linearAlgebraRuntime.activeVectorLeftId}
        activeVectorRightId={linearAlgebraRuntime.activeVectorRightId}
        vectorValues={linearAlgebraRuntime.vectorValues}
        onOpenGuideMode={onOpenGuideMode}
        onOpenGuideArticle={onOpenGuideArticle}
        onAddVectorValue={linearAlgebraRuntime.addVectorValue}
        onDeleteVectorValue={linearAlgebraRuntime.deleteVectorValue}
        onDuplicateVectorValue={linearAlgebraRuntime.duplicateVectorValue}
        onInsertVectorName={(name) => {
          linearAlgebraRuntime.setVectorEditorLatex(`${linearAlgebraRuntime.vectorEditorLatex}${name}`);
        }}
        onRenameVectorValue={linearAlgebraRuntime.renameVectorValue}
        onResizeVectorValue={linearAlgebraRuntime.resizeVectorValueById}
        onSetActiveVectorValueIds={linearAlgebraRuntime.setActiveVectorValueIds}
        onSetVectorCell={linearAlgebraRuntime.setVectorValueCell}
      />
    );
  }

  if (currentMode === 'table') {
    return (
      <TableWorkspace
        tablePrimaryLatex={tableRuntime.tablePrimaryLatex}
        tableSecondaryLatex={tableRuntime.tableSecondaryLatex}
        tableSecondaryEnabled={tableRuntime.tableSecondaryEnabled}
        tableStart={tableRuntime.tableStart}
        tableEnd={tableRuntime.tableEnd}
        tableStep={tableRuntime.tableStep}
        tableResponse={tableRuntime.tableResponse}
        tableKeyboardLayouts={tableKeyboardLayouts}
        activeFieldRef={activeFieldRef}
        onOpenGuideMode={onOpenGuideMode}
        onOpenGuideArticle={onOpenGuideArticle}
        onSetTablePrimaryLatex={tableRuntime.setTablePrimaryLatex}
        onSetTableSecondaryLatex={tableRuntime.setTableSecondaryLatex}
        onSetTableStart={tableRuntime.setTableStart}
        onSetTableEnd={tableRuntime.setTableEnd}
        onSetTableStep={tableRuntime.setTableStep}
        variableMemory={variableMemory}
      />
    );
  }

  return null;
}
