import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type { GraphDocumentV4 } from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';

export type GraphControllerStatus =
  | { kind: 'ready'; label: string }
  | { kind: 'editing'; label: string }
  | { kind: 'sampling'; label: string }
  | { kind: 'warning'; label: string }
  | { kind: 'error'; label: string };

export type GraphHistory = {
  undo: Array<{ document: GraphDocumentV4; appearance: GraphWorkspaceSessionStateV7['surface']['appearance'] }>;
  redo: Array<{ document: GraphDocumentV4; appearance: GraphWorkspaceSessionStateV7['surface']['appearance'] }>;
  typingItemId: string | null;
};

export type UseGraphWorkspaceControllerInput = {
  initialSession: GraphWorkspaceSessionStateV7;
  workspaceContext: WorkspaceInstanceRuntimeContext;
  cssSize: { width: number; height: number };
  onPersistSession: (session: GraphWorkspaceSessionStateV7) => void;
};
