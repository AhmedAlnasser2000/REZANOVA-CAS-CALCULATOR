import type {
  GeometryParseResult,
  GeometryReplaySeed,
  GeometryScreen,
} from '../../types/calculator';
import { runGeometryCoreDraft } from './core';
import { geometryRequestToScreen } from './parser';
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

  return {
    outcome,
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
