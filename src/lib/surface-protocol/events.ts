import type { OoeEventEnvelope, OoeEventSeverity, OoeEventType } from '../ooe/events/event-outbox';
import {
  listOoeEvents,
  subscribeToOoeEvents,
} from '../ooe/events/event-outbox';
import {
  SURFACE_PROTOCOL_VERSION,
  type SurfaceProtocolVersion,
  type SurfaceWorkspaceKind,
} from './dto';

export type SurfaceLifecycleEventType =
  | 'surface.job.started'
  | 'surface.result.committed'
  | 'surface.result.staleDropped'
  | 'surface.job.cancelled'
  | 'surface.job.failed';

export type SurfaceLifecycleStatus =
  | 'started'
  | 'committed'
  | 'staleDropped'
  | 'cancelled'
  | 'failed';

export type SurfaceLifecycleEventDto = {
  protocolVersion: SurfaceProtocolVersion;
  eventId: string;
  sequence: number;
  timestamp: number;
  type: SurfaceLifecycleEventType;
  status: SurfaceLifecycleStatus;
  severity: OoeEventSeverity;
  workspaceKind: SurfaceWorkspaceKind;
  surfaceJobId?: string;
  summary: string;
};

const EVENT_TYPE_MAP: Partial<Record<OoeEventType, {
  type: SurfaceLifecycleEventType;
  status: SurfaceLifecycleStatus;
  summary: string;
}>> = {
  'ooe.job.started': {
    type: 'surface.job.started',
    status: 'started',
    summary: 'Compute started.',
  },
  'ooe.result.committed': {
    type: 'surface.result.committed',
    status: 'committed',
    summary: 'Result committed.',
  },
  'ooe.result.staleDropped': {
    type: 'surface.result.staleDropped',
    status: 'staleDropped',
    summary: 'Stale result dropped.',
  },
  'ooe.job.cancelled': {
    type: 'surface.job.cancelled',
    status: 'cancelled',
    summary: 'Compute cancelled.',
  },
  'ooe.job.failed': {
    type: 'surface.job.failed',
    status: 'failed',
    summary: 'Compute failed.',
  },
};

function workspaceKindFromOoeEvent(event: OoeEventEnvelope): SurfaceWorkspaceKind | null {
  if (event.workspaceId === 'calculate' || event.workspaceId === 'equation') {
    return event.workspaceId;
  }
  if (event.compartmentId === 'calculate' || event.compartmentId === 'equation') {
    return event.compartmentId;
  }
  if (
    event.capabilityId?.startsWith('expression.')
    || event.capabilityId?.startsWith('calculate.')
    || event.routeLabel?.startsWith('calculate')
  ) {
    return 'calculate';
  }
  if (
    event.capabilityId === 'equation.solve'
    || event.routeLabel?.startsWith('equation')
  ) {
    return 'equation';
  }
  return null;
}

export function mapOoeEventToSurfaceLifecycleEvent(
  event: OoeEventEnvelope,
): SurfaceLifecycleEventDto | null {
  const mapped = EVENT_TYPE_MAP[event.type];
  if (!mapped) {
    return null;
  }
  const workspaceKind = workspaceKindFromOoeEvent(event);
  if (!workspaceKind) {
    return null;
  }

  return {
    protocolVersion: SURFACE_PROTOCOL_VERSION,
    eventId: `surface.event.${event.sequence}`,
    sequence: event.sequence,
    timestamp: event.timestamp,
    type: mapped.type,
    status: mapped.status,
    severity: event.severity,
    workspaceKind,
    ...(event.jobId ? { surfaceJobId: event.jobId } : {}),
    summary: mapped.summary,
  };
}

export function listSurfaceLifecycleEvents(
  events: readonly OoeEventEnvelope[] = listOoeEvents(),
): SurfaceLifecycleEventDto[] {
  return events.flatMap((event) => {
    const mapped = mapOoeEventToSurfaceLifecycleEvent(event);
    return mapped ? [mapped] : [];
  });
}

export function subscribeToSurfaceLifecycleEvents(
  listener: (event: SurfaceLifecycleEventDto) => void,
): () => void {
  return subscribeToOoeEvents((event) => {
    const mapped = mapOoeEventToSurfaceLifecycleEvent(event);
    if (mapped) {
      listener(mapped);
    }
  });
}
