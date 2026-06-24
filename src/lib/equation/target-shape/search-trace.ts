import type {
  EquationTargetShapeFlags,
  EquationTargetShapeProfile,
  EquationTargetShapeRouteHint,
  EquationTargetShapeStatus,
} from './profile';
import type {
  EquationSelectedTargetRouteFamily,
  EquationSelectedTargetRoutePhase,
  EquationSelectedTargetRoutePlan,
} from './route-plan';

export type EquationSelectedTargetSearchProfileSummary = {
  status: EquationTargetShapeStatus;
  target: string;
  targetSide?: string;
  targetOccurrenceCount?: number;
  topLevelTargetIslandCount?: number;
  routeHints?: EquationTargetShapeRouteHint[];
  flags?: EquationTargetShapeFlags;
};

export type EquationSelectedTargetFamilyStopDetails = Record<
  string,
  string | number | boolean | undefined
>;

export type EquationSelectedTargetSearchTraceEvent =
  | {
      kind: 'profile';
      phase: EquationSelectedTargetRoutePhase;
      profile: EquationSelectedTargetSearchProfileSummary;
    }
  | {
      kind: 'family-attempted';
      phase: EquationSelectedTargetRoutePhase;
      family: EquationSelectedTargetRouteFamily;
    }
  | {
      kind: 'family-skipped';
      phase: EquationSelectedTargetRoutePhase;
      family: EquationSelectedTargetRouteFamily;
    }
  | {
      kind: 'family-success';
      phase: EquationSelectedTargetRoutePhase;
      family: EquationSelectedTargetRouteFamily;
    }
  | {
      kind: 'family-stop';
      phase: EquationSelectedTargetRoutePhase;
      family: EquationSelectedTargetRouteFamily;
      reason: string;
      message?: string;
      details?: EquationSelectedTargetFamilyStopDetails;
    }
  | {
      kind: 'final-stop';
      phase: EquationSelectedTargetRoutePhase;
      reason: string;
      message?: string;
    };

export type EquationSelectedTargetSearchTraceRecorder = (
  event: EquationSelectedTargetSearchTraceEvent,
) => void;

export type EquationSelectedTargetSearchTrace = {
  events: EquationSelectedTargetSearchTraceEvent[];
  record: EquationSelectedTargetSearchTraceRecorder;
};

export function createEquationSelectedTargetSearchTrace(): EquationSelectedTargetSearchTrace {
  const events: EquationSelectedTargetSearchTraceEvent[] = [];
  return {
    events,
    record: (event) => {
      events.push(event);
    },
  };
}

function summarizeProfile(profile: EquationTargetShapeProfile): EquationSelectedTargetSearchProfileSummary {
  if (profile.status !== 'ok') {
    return {
      status: profile.status,
      target: profile.target,
    };
  }

  return {
    status: profile.status,
    target: profile.target,
    targetSide: profile.targetSide,
    targetOccurrenceCount: profile.targetOccurrenceCount,
    topLevelTargetIslandCount: profile.topLevelTargetIslandCount,
    routeHints: profile.routeHints,
    flags: profile.flags,
  };
}

export function recordSelectedTargetRoutePlan(
  record: EquationSelectedTargetSearchTraceRecorder | undefined,
  plan: EquationSelectedTargetRoutePlan,
) {
  if (!record) {
    return;
  }

  record({
    kind: 'profile',
    phase: plan.phase,
    profile: summarizeProfile(plan.profile),
  });
  for (const family of plan.skippedFamilies) {
    record({
      kind: 'family-skipped',
      phase: plan.phase,
      family,
    });
  }
}

export function recordSelectedTargetFamilyAttempt(
  record: EquationSelectedTargetSearchTraceRecorder | undefined,
  phase: EquationSelectedTargetRoutePhase,
  family: EquationSelectedTargetRouteFamily,
) {
  record?.({
    kind: 'family-attempted',
    phase,
    family,
  });
}

export function recordSelectedTargetFamilySuccess(
  record: EquationSelectedTargetSearchTraceRecorder | undefined,
  phase: EquationSelectedTargetRoutePhase,
  family: EquationSelectedTargetRouteFamily,
) {
  record?.({
    kind: 'family-success',
    phase,
    family,
  });
}

export function recordSelectedTargetFamilyStop(
  record: EquationSelectedTargetSearchTraceRecorder | undefined,
  phase: EquationSelectedTargetRoutePhase,
  family: EquationSelectedTargetRouteFamily,
  reason: string,
  message?: string,
  details?: EquationSelectedTargetFamilyStopDetails,
) {
  record?.({
    kind: 'family-stop',
    phase,
    family,
    reason,
    ...(message ? { message } : {}),
    ...(details ? { details } : {}),
  });
}

export function recordSelectedTargetFinalStop(
  record: EquationSelectedTargetSearchTraceRecorder | undefined,
  phase: EquationSelectedTargetRoutePhase,
  reason: string,
  message?: string,
) {
  record?.({
    kind: 'final-stop',
    phase,
    reason,
    message,
  });
}
