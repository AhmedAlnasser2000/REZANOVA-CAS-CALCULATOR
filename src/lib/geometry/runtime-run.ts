import type {
  CanonicalRuntimeOutcome,
  GeometryParseResult,
  GeometryReplaySeed,
  GeometryScreen,
} from '../../types/calculator';
import { runGeometryCoreDraft } from './core';
import {
  finalizeCanonicalRuntimeOutcomeFromProducer,
  requireCanonicalResultAuthority,
} from '../result-contract';
import { geometryRequestToScreen } from './parser';
import { createGeometryResultOutcome } from './result-document';
import type { RunGeometryRuntimeRequest } from './runtime-input';
import { geometryMathJsonRouteForRequest, geometryMathValuesFromOwnedLeaves } from './math-values';

export type GeometryModeRunPayload = {
  outcome: ReturnType<typeof runGeometryCoreDraft>['outcome'];
  parsed: GeometryParseResult;
  replayScreen: GeometryScreen;
  replaySeed?: GeometryReplaySeed;
};

export type CanonicalGeometryModeRunPayload = Omit<GeometryModeRunPayload, 'outcome'> & {
  outcome: CanonicalRuntimeOutcome;
};

export function buildGeometryModeRunPayload(
  request: RunGeometryRuntimeRequest,
): GeometryModeRunPayload {
  const { outcome, parsed, mathJsonLeaves } = runGeometryCoreDraft(
    request.inputLatex,
    request.screenHint,
  );
  const replayScreen = parsed.ok
    ? geometryRequestToScreen(parsed.request)
    : request.screenHint;

  const ownedOutcome = requireCanonicalResultAuthority(outcome.kind === 'prompt'
    ? outcome
    : createGeometryResultOutcome(outcome, parsed.ok
      ? {
          mathValues: geometryMathValuesFromOwnedLeaves({
            outcome,
            routeId: geometryMathJsonRouteForRequest(parsed.request),
            leaves: mathJsonLeaves,
          }),
        }
      : undefined), 'Geometry');

  return {
    outcome: ownedOutcome,
    parsed,
    replayScreen,
    ...(parsed.ok
      ? {
          replaySeed: {
            screen: replayScreen,
            request: parsed.request,
          },
        }
      : {}),
  };
}

export function buildCanonicalGeometryModeRunPayload(
  request: RunGeometryRuntimeRequest,
): CanonicalGeometryModeRunPayload {
  const payload = buildGeometryModeRunPayload(request);
  return {
    ...payload,
    outcome: finalizeCanonicalRuntimeOutcomeFromProducer(payload.outcome, 'Geometry'),
  };
}
