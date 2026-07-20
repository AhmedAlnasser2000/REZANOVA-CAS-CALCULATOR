import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type { GraphDocumentV2 } from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV4 } from './graph-workspace-session';

export type GraphControllerStatus =
  | { kind: 'ready'; label: string }
  | { kind: 'editing'; label: string }
  | { kind: 'sampling'; label: string }
  | { kind: 'warning'; label: string }
  | { kind: 'error'; label: string };

export type GraphHistory = {
  undo: Array<{ document: GraphDocumentV2; appearance: GraphWorkspaceSessionStateV4['surface']['appearance'] }>;
  redo: Array<{ document: GraphDocumentV2; appearance: GraphWorkspaceSessionStateV4['surface']['appearance'] }>;
  typingItemId: string | null;
};

export type UseGraphWorkspaceControllerInput = {
  initialSession: GraphWorkspaceSessionStateV4;
  workspaceContext: WorkspaceInstanceRuntimeContext;
  cssSize: { width: number; height: number };
  onPersistSession: (session: GraphWorkspaceSessionStateV4) => void;
};
