import { isOoeCommitAllowed } from '../../lib/ooe/job-contract';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/launch-tickets';
import type { DisplayOutcome, ModeId } from '../../types/calculator';

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
    activeInputRevisionId: () => string | null;
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
  readLiveRequest: () => TRequest | null;
  isModeVisible: () => boolean;
  loadRunner: () => Promise<WorkspaceRuntimeRunner<TRequest, TPayload>>;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
  }) => PendingHistoryTicketReservation | null;
  discardHistoryTicket: (ticketId?: string | null) => void;
  setDisplayOutcome: (outcome: DisplayOutcome) => void;
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
    readLiveRequest,
    isModeVisible,
    loadRunner,
    reserveHistoryTicket,
    discardHistoryTicket,
    setDisplayOutcome,
    setRuntimeStatusOverride,
    commit,
  } = options;

  const inputRevisionId = buildInputRevisionId(request);
  let launchedHistoryTicket: PendingHistoryTicketReservation | null = null;

  void loadRunner().then(async (runRuntime) => {
    const historyTicket = reserveHistoryTicket({
      mode,
      inputLatex: ticketInputLatex,
      capabilityId,
      inputRevisionId,
    });
    launchedHistoryTicket = historyTicket;

    const result = await runRuntime(request, {
      activeInputRevisionId: () => {
        const activeRequest = readLiveRequest();
        return activeRequest ? buildInputRevisionId(activeRequest) : null;
      },
      ...(historyTicket ? { launchTicket: historyTicket } : {}),
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
    discardHistoryTicket(launchedHistoryTicket?.id);
    const loadError: DisplayOutcome = {
      kind: 'error',
      title: modeLabel,
      error: error instanceof Error
        ? `Could not load the ${modeLabel} runtime: ${error.message}`
        : `Could not load the ${modeLabel} runtime.`,
      warnings: [],
    };
    if (isModeVisible()) {
      setDisplayOutcome(loadError);
    }
    setRuntimeStatusOverride(`${modeLabel} runtime failed`);
  });
}
