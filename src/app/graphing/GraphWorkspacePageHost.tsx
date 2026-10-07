import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import GraphWorkspacePage from './GraphWorkspacePage';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';
import { migrateGraphWorkspaceSessionState } from './graph-workspace-session-validation';

export default function GraphWorkspacePageHost({
  gpuRendering,
  onOpenGraphTab,
  onUpdateSession,
  session: rawSession,
  workspaceContext,
}: {
  gpuRendering: 'auto' | 'off';
  onOpenGraphTab?: (build: (instanceId: string, title: string) => GraphWorkspaceSessionStateV7) => void;
  onUpdateSession: (session: GraphWorkspaceSessionStateV7) => void;
  session: unknown;
  workspaceContext: WorkspaceInstanceRuntimeContext;
}) {
  const session = migrateGraphWorkspaceSessionState(rawSession);
  if (!session) {
    return (
      <div className="graph-page-load-failure" role="alert">
        Graphing could not validate this workspace session.
      </div>
    );
  }
  return (
    <GraphWorkspacePage
      gpuRendering={gpuRendering}
      {...(onOpenGraphTab ? { onOpenGraphTab } : {})}
      onUpdateSession={onUpdateSession}
      session={session}
      workspaceContext={workspaceContext}
    />
  );
}
