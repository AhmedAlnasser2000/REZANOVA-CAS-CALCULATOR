export type WorkspaceInstanceId = string;

export type WorkspaceInstanceRuntimeContext = {
  workspaceInstanceId: WorkspaceInstanceId;
  workspaceInstanceLabel: string;
  workspaceKind?: string;
  compartmentId?: string;
  compartmentLabel?: string;
};
