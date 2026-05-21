import type { MathfieldElement } from 'mathlive';
import type { VirtualKeyboardLayout } from 'mathlive';
import type { MutableRefObject, RefObject } from 'react';
import { MatrixWorkspace } from './MatrixWorkspace';
import { TableWorkspace } from './TableWorkspace';
import { VectorWorkspace } from './VectorWorkspace';
import type { useLinearAlgebraRuntime } from '../runtime/useLinearAlgebraRuntime';
import type { useTableRuntime } from '../runtime/useTableRuntime';
import type { ModeId } from '../../types/calculator';

type LinearAlgebraRuntime = ReturnType<typeof useLinearAlgebraRuntime>;
type TableRuntime = ReturnType<typeof useTableRuntime>;

type LinearAlgebraTableWorkspaceHostProps = {
  activeFieldRef: MutableRefObject<MathfieldElement | null>;
  currentMode: ModeId;
  isLauncherOpen: boolean;
  linearAlgebraRuntime: LinearAlgebraRuntime;
  matrixKeyboardLayouts: readonly VirtualKeyboardLayout[];
  matrixNotationFieldRef: RefObject<MathfieldElement | null>;
  onCopyText: (text: string, message: string) => Promise<void>;
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: (mode: 'matrix' | 'vector' | 'table') => void;
  tableKeyboardLayouts: readonly VirtualKeyboardLayout[];
  tableRuntime: TableRuntime;
  vectorKeyboardLayouts: readonly VirtualKeyboardLayout[];
  vectorNotationFieldRef: RefObject<MathfieldElement | null>;
};

export function LinearAlgebraTableWorkspaceHost({
  activeFieldRef,
  currentMode,
  isLauncherOpen,
  linearAlgebraRuntime,
  matrixKeyboardLayouts,
  matrixNotationFieldRef,
  onCopyText,
  onOpenGuideArticle,
  onOpenGuideMode,
  tableKeyboardLayouts,
  tableRuntime,
  vectorKeyboardLayouts,
  vectorNotationFieldRef,
}: LinearAlgebraTableWorkspaceHostProps) {
  if (isLauncherOpen) {
    return null;
  }

  if (currentMode === 'matrix') {
    return (
      <MatrixWorkspace
        matrixA={linearAlgebraRuntime.matrixA}
        matrixB={linearAlgebraRuntime.matrixB}
        matrixNotationLatex={linearAlgebraRuntime.matrixNotationLatex}
        matrixKeyboardLayouts={matrixKeyboardLayouts}
        matrixNotationFieldRef={matrixNotationFieldRef}
        activeFieldRef={activeFieldRef}
        onOpenGuideMode={onOpenGuideMode}
        onOpenGuideArticle={onOpenGuideArticle}
        onSetMatrixCell={linearAlgebraRuntime.setMatrixCell}
        onLoadMatrixNotationPreset={linearAlgebraRuntime.loadMatrixNotationPreset}
        onCopyText={onCopyText}
        onSetMatrixNotationLatex={linearAlgebraRuntime.setMatrixNotationLatex}
      />
    );
  }

  if (currentMode === 'vector') {
    return (
      <VectorWorkspace
        vectorA={linearAlgebraRuntime.vectorA}
        vectorB={linearAlgebraRuntime.vectorB}
        vectorNotationLatex={linearAlgebraRuntime.vectorNotationLatex}
        vectorKeyboardLayouts={vectorKeyboardLayouts}
        vectorNotationFieldRef={vectorNotationFieldRef}
        activeFieldRef={activeFieldRef}
        onOpenGuideMode={onOpenGuideMode}
        onOpenGuideArticle={onOpenGuideArticle}
        onSetVectorCell={linearAlgebraRuntime.setVectorCell}
        onLoadVectorNotationPreset={linearAlgebraRuntime.loadVectorNotationPreset}
        onCopyText={onCopyText}
        onSetVectorNotationLatex={linearAlgebraRuntime.setVectorNotationLatex}
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
      />
    );
  }

  return null;
}
