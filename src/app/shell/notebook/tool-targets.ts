import type { NotebookWorkspaceTarget } from '../../../lib/notebook';

export type NotebookToolTarget = {
  id: NotebookWorkspaceTarget;
  label: string;
  live: boolean;
};

export const NOTEBOOK_TOOL_TARGETS: readonly NotebookToolTarget[] = [
  { id: 'calculate', label: 'Calculate', live: true },
  { id: 'equation', label: 'Equation', live: true },
  { id: 'calculus', label: 'Calculus', live: false },
  { id: 'trigonometry', label: 'Trigonometry', live: false },
  { id: 'statistics', label: 'Statistics', live: false },
  { id: 'geometry', label: 'Geometry', live: false },
  { id: 'matrix', label: 'Matrix', live: false },
  { id: 'vector', label: 'Vector', live: false },
  { id: 'table', label: 'Table', live: false },
];

export function canOpenNotebookToolTarget(target: NotebookWorkspaceTarget) {
  return NOTEBOOK_TOOL_TARGETS.some((item) => item.id === target && item.live);
}

export function notebookToolTargetLabel(target: NotebookWorkspaceTarget) {
  return NOTEBOOK_TOOL_TARGETS.find((item) => item.id === target)?.label ?? target;
}
