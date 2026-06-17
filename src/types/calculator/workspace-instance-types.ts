export type WorkspaceInstanceId = string;

export type WorkspaceInstanceRuntimeContext = {
  workspaceInstanceId: WorkspaceInstanceId;
  workspaceInstanceLabel: string;
  workspaceInstanceRevision?: number;
  workspaceKind?: string;
  compartmentId?: string;
  compartmentLabel?: string;
};
