import type { RefObject } from 'react';
import type { MathfieldElement } from 'mathlive';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type {
  CanonicalRuntimeOutcome,
  HistoryEntry,
  ModeId,
} from '../../types/calculator';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';

export type CommitStatisticsOutcome = (
  outcome: CanonicalRuntimeOutcome,
  inputLatex: string,
  mode: 'statistics',
  context?: Partial<Pick<HistoryEntry, 'statisticsScreen' | 'statisticsSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
    suppressWorkspaceDisplayCommit?: boolean;
  },
) => void;

export type UseStatisticsRuntimeOptions = {
  activeFieldRef: RefObject<MathfieldElement | null>;
  commitOutcome: CommitStatisticsOutcome;
  currentMode: ModeId;
  currentModeRef: RefObject<ModeId>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  openLauncher: () => void;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  setClipboardNotice: (notice: string | null) => void;
  setDisplayOutcome: (outcome: CanonicalRuntimeOutcome | null) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  startTransition: (callback: () => void) => void;
  updateWorkspaceInstanceSurfaceState?: (
    workspaceInstanceId: string,
    surfaceState: WorkspaceInstanceStateSlot,
  ) => void;
};
