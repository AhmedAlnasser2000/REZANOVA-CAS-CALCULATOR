export const DEFAULT_OOE_EVENT_LIMIT = 300;

export type OoeEventSeverity = 'debug' | 'info' | 'warning' | 'error';

export type OoeEventType =
  | 'ooe.job.started'
  | 'ooe.host.selected'
  | 'ooe.preflight.completed'
  | 'ooe.preflight.failed'
  | 'ooe.result.committed'
  | 'ooe.result.staleDropped'
  | 'ooe.result.skipped'
  | 'ooe.job.cancelled'
  | 'ooe.job.failed'
  | 'ooe.job.completed';

export type OoeEventPayload = Record<string, unknown>;

export type OoeEventEnvelope = {
  eventId: string;
  sequence: number;
  type: OoeEventType;
  version: 1;
  timestamp: number;
  source: 'ooe';
  jobId?: string;
  registryId?: string;
  inputRevisionId?: string;
  planId?: string;
  capabilityId?: string;
  hostId?: string;
  nodeId?: string | null;
  phaseId?: string | null;
  workspaceId?: string;
  routeLabel?: string;
  severity: OoeEventSeverity;
  message?: string;
  payload?: OoeEventPayload;
};

type RecordOoeEventInput = Omit<
  OoeEventEnvelope,
  'eventId' | 'sequence' | 'version' | 'timestamp' | 'source'
> & {
  timestamp?: number;
};

type ClearOoeEventsOptions = {
  resetSequence?: boolean;
};

type OoeEventListener = (event: OoeEventEnvelope) => void;

const events: OoeEventEnvelope[] = [];
const listeners = new Set<OoeEventListener>();
let eventLimit = DEFAULT_OOE_EVENT_LIMIT;
let nextSequence = 1;

function clonePayload(payload: OoeEventPayload | undefined) {
  if (!payload) {
    return undefined;
  }

  const clone: OoeEventPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      clone[key] = value;
    }
  }
  return Object.keys(clone).length > 0 ? clone : undefined;
}

function cloneEvent(event: OoeEventEnvelope): OoeEventEnvelope {
  return {
    ...event,
    payload: clonePayload(event.payload),
  };
}

function assertPayloadIsShallowSerializable(payload: OoeEventPayload | undefined) {
  if (!payload) {
    return;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (
      typeof value === 'function'
      || typeof value === 'symbol'
      || typeof value === 'bigint'
    ) {
      throw new TypeError(`OOE event payload field "${key}" is not serializable`);
    }
  }

  JSON.stringify(payload);
}

function trimEventsToLimit() {
  if (events.length > eventLimit) {
    events.splice(0, events.length - eventLimit);
  }
}

export function recordOoeEvent(input: RecordOoeEventInput): OoeEventEnvelope {
  assertPayloadIsShallowSerializable(input.payload);
  const sequence = nextSequence;
  nextSequence += 1;
  const event: OoeEventEnvelope = {
    ...input,
    eventId: `ooe.event.${sequence}`,
    sequence,
    version: 1,
    timestamp: input.timestamp ?? Date.now(),
    source: 'ooe',
    payload: clonePayload(input.payload),
  };

  events.push(event);
  trimEventsToLimit();

  const snapshot = cloneEvent(event);
  for (const listener of listeners) {
    listener(cloneEvent(snapshot));
  }

  return snapshot;
}

export function subscribeToOoeEvents(listener: OoeEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function listOoeEvents(): OoeEventEnvelope[] {
  return events.map(cloneEvent);
}

export function getLatestOoeEvent(
  predicate?: (event: OoeEventEnvelope) => boolean,
): OoeEventEnvelope | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!predicate || predicate(cloneEvent(event))) {
      return cloneEvent(event);
    }
  }
  return undefined;
}

export function clearOoeEvents(options: ClearOoeEventsOptions = {}) {
  events.splice(0, events.length);
  if (options.resetSequence !== false) {
    nextSequence = 1;
  }
}

export function configureOoeEventLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('OOE event limit must be a positive integer');
  }
  eventLimit = limit;
  trimEventsToLimit();
}

export function resetOoeEventOutboxForTests() {
  clearOoeEvents();
  listeners.clear();
  eventLimit = DEFAULT_OOE_EVENT_LIMIT;
}
