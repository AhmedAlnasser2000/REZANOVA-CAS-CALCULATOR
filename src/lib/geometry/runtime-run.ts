import type {
  GeometryParseResult,
  GeometryReplaySeed,
  GeometryScreen,
} from '../../types/calculator';
import { runGeometryCoreDraft } from './core';
import { requireCanonicalResultAuthority } from '../result-contract';
import { geometryRequestToScreen } from './parser';
import { createGeometryResultOutcome } from './result-document';
import type { RunGeometryRuntimeRequest } from './runtime-input';

export type GeometryModeRunPayload = {
  outcome: ReturnType<typeof runGeometryCoreDraft>['outcome'];
  parsed: GeometryParseResult;
  replayScreen: GeometryScreen;
  replaySeed?: GeometryReplaySeed;
};

export function buildGeometryModeRunPayload(
  request: RunGeometryRuntimeRequest,
): GeometryModeRunPayload {
  const { outcome, parsed } = runGeometryCoreDraft(request.inputLatex, request.screenHint);
  const replayScreen = parsed.ok
    ? geometryRequestToScreen(parsed.request)
    : request.screenHint;

  const ownedOutcome = requireCanonicalResultAuthority(outcome.kind === 'prompt'
    ? outcome
    : createGeometryResultOutcome(outcome), 'Geometry');

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
