import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import GraphWorkspacePage from './GraphWorkspacePage';
import type { GraphWorkspaceSessionStateV3 } from './graph-workspace-session';
import { migrateGraphWorkspaceSessionState } from './graph-workspace-session-validation';

export default function GraphWorkspacePageHost({
  onUpdateSession,
  session: rawSession,
  workspaceContext,
}: {
  onUpdateSession: (session: GraphWorkspaceSessionStateV3) => void;
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
      onUpdateSession={onUpdateSession}
      session={session}
      workspaceContext={workspaceContext}
    />
  );
}
