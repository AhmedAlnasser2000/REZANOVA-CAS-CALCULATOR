import type { OoeJobIdentity } from '../../lib/ooe/job-launch/job-contract';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';

type WorkspaceOriginInputRevisionOptions<TRequest> = {
  buildInputRevisionId: (request: TRequest) => string;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  readLiveRequest: () => TRequest | null;
  readRequestFromSurfaceState?: (
    surfaceState: WorkspaceInstanceStateSlot,
    instance: WorkspaceInstance,
  ) => TRequest | null;
};

function liveInputRevision<TRequest>({
  buildInputRevisionId,
  readLiveRequest,
}: Pick<WorkspaceOriginInputRevisionOptions<TRequest>, 'buildInputRevisionId' | 'readLiveRequest'>) {
  const activeRequest = readLiveRequest();
  return activeRequest ? buildInputRevisionId(activeRequest) : null;
}

export function resolveWorkspaceOriginInputRevision<TRequest>(
  job: OoeJobIdentity,
  options: WorkspaceOriginInputRevisionOptions<TRequest>,
) {
  const workspaceInstanceId = job.workspaceInstanceId;
  if (!workspaceInstanceId) {
    return liveInputRevision(options);
  }

  const activeWorkspaceInstance = options.getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
  if (activeWorkspaceInstance?.workspaceInstanceId === workspaceInstanceId) {
    return liveInputRevision(options);
  }

  const workspaceInstances = options.getWorkspaceInstances?.();
  const readRequestFromSurfaceState = options.readRequestFromSurfaceState;
  if (!workspaceInstances || !readRequestFromSurfaceState) {
    return null;
  }

  const originInstance =
    workspaceInstances.find((instance) => instance.id === workspaceInstanceId) ?? null;
  if (!originInstance) {
    return null;
  }

  if (
    job.workspaceInstanceRevision != null
    && originInstance.navigationRevision !== job.workspaceInstanceRevision
  ) {
    return null;
  }

  const originRequest = readRequestFromSurfaceState(
    originInstance.surfaceState,
    originInstance,
  );
  return originRequest ? options.buildInputRevisionId(originRequest) : null;
}
