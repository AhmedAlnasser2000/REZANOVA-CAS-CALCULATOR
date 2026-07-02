import type { MutableRefObject } from 'react';
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
  activeFieldRef: MutableRefObject<MathfieldElement | null>;
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
        matrixA={linearAlgebraRuntime.matrixA}
        matrixB={linearAlgebraRuntime.matrixB}
        onOpenGuideMode={onOpenGuideMode}
        onOpenGuideArticle={onOpenGuideArticle}
        onSetMatrixCell={linearAlgebraRuntime.setMatrixCell}
      />
    );
  }

  if (currentMode === 'vector') {
    return (
      <VectorWorkspace
        vectorA={linearAlgebraRuntime.vectorA}
        vectorB={linearAlgebraRuntime.vectorB}
        onOpenGuideMode={onOpenGuideMode}
        onOpenGuideArticle={onOpenGuideArticle}
        onSetVectorCell={linearAlgebraRuntime.setVectorCell}
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
