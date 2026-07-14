import {
  isOoeCommitAllowed,
  type OoeJobIdentity,
} from '../../lib/ooe/job-launch/job-contract';
import {
  ooeJobContextFromHistoryTicket,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import type { CanonicalRuntimeOutcome, ModeId } from '../../types/calculator';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';
import { resolveWorkspaceOriginInputRevision } from './workspace-origin-input-revision';
import { createCanonicalRuntimeError } from '../../lib/result-contract';

type OoeCommitAssessment = Parameters<typeof isOoeCommitAllowed>[0];

export type WorkspaceRuntimeRunResult<TPayload> = {
  payload: TPayload;
  ooe: {
    completion?: {
      kind: 'cancelled';
      reason?: string;
    };
    commitAssessment: OoeCommitAssessment;
  };
};

export type WorkspaceRuntimeRunner<TRequest, TPayload> = (
  request: TRequest,
  options: {
    activeInputRevisionId: (job: OoeJobIdentity) => string | null;
    launchTicket?: PendingHistoryTicketReservation;
  },
) => Promise<WorkspaceRuntimeRunResult<TPayload>>;

export type LaunchWorkspaceRuntimeJobOptions<TRequest, TPayload> = {
  mode: ModeId;
  modeLabel: string;
  capabilityId: string;
  request: TRequest;
  ticketInputLatex: string;
  buildInputRevisionId: (request: TRequest) => string;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  readLiveRequest: () => TRequest | null;
  readRequestFromSurfaceState?: (
    surfaceState: WorkspaceInstanceStateSlot,
    instance: WorkspaceInstance,
  ) => TRequest | null;
  isModeVisible: () => boolean;
  loadRunner: () => Promise<WorkspaceRuntimeRunner<TRequest, TPayload>>;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  discardHistoryTicket: (ticketId?: string | null) => void;
  setDisplayOutcome: (outcome: CanonicalRuntimeOutcome) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  commit: (
    payload: TPayload,
    ticket: PendingHistoryTicketReservation | null,
    visible: boolean,
  ) => void;
};

/**
 * Shared AppMain-side launch ritual for workspace OOE runtime shells.
 *
 * Each mode keeps its own worker host, capability ID, pilot, and commit
 * context; this helper only owns the repeated ticket/cancel/stale/commit
 * sequencing that was previously pasted inline per mode.
 */
export function launchWorkspaceRuntimeJob<TRequest, TPayload>(
  options: LaunchWorkspaceRuntimeJobOptions<TRequest, TPayload>,
): void {
  const {
    mode,
    modeLabel,
    capabilityId,
    request,
    ticketInputLatex,
    buildInputRevisionId,
    getActiveWorkspaceInstanceRuntimeContext,
    getWorkspaceInstances,
    readLiveRequest,
    readRequestFromSurfaceState,
    isModeVisible,
    loadRunner,
    reserveHistoryTicket,
    discardHistoryTicket,
    setDisplayOutcome,
    setRuntimeStatusOverride,
    commit,
  } = options;

  const inputRevisionId = buildInputRevisionId(request);
  const launchWorkspaceInstance = getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
  const historyTicket = reserveHistoryTicket({
    mode,
    inputLatex: ticketInputLatex,
    capabilityId,
    inputRevisionId,
    workspaceInstance: launchWorkspaceInstance,
  });

  void loadRunner().then(async (runRuntime) => {
    const result = await runRuntime(request, {
      activeInputRevisionId: (job) =>
        resolveWorkspaceOriginInputRevision(job, {
          buildInputRevisionId,
          getActiveWorkspaceInstanceRuntimeContext,
          getWorkspaceInstances,
          readLiveRequest,
          readRequestFromSurfaceState,
        }),
      ...ooeJobContextFromHistoryTicket(historyTicket),
    });

    if (result.ooe.completion?.kind === 'cancelled') {
      discardHistoryTicket(historyTicket?.id);
      setRuntimeStatusOverride(`${modeLabel} evaluation stopped`);
      return;
    }

    if (!isOoeCommitAllowed(result.ooe.commitAssessment)) {
      discardHistoryTicket(historyTicket?.id);
      return;
    }

    const activeRequest = readLiveRequest();
    const visible =
      isModeVisible()
      && activeRequest !== null
      && buildInputRevisionId(activeRequest) === inputRevisionId;

    commit(result.payload, historyTicket, visible);
  }).catch((error: unknown) => {
    discardHistoryTicket(historyTicket?.id);
    const loadError = createCanonicalRuntimeError(
      modeLabel,
      error instanceof Error
        ? `Could not load the ${modeLabel} runtime: ${error.message}`
        : `Could not load the ${modeLabel} runtime.`,
    );
    if (isModeVisible()) {
      setDisplayOutcome(loadError);
    }
    setRuntimeStatusOverride(`${modeLabel} runtime failed`);
  });
}
