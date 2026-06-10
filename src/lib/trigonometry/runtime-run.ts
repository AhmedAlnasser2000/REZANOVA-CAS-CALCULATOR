import type {
  TrigParseResult,
  TrigReplaySeed,
  TrigScreen,
} from '../../types/calculator';
import { runTrigonometryCoreDraft } from './core';
import { trigRequestToScreen } from './parser';
import type { RunTrigonometryRuntimeRequest } from './runtime-input';

export type TrigonometryModeRunPayload = {
  outcome: ReturnType<typeof runTrigonometryCoreDraft>['outcome'];
  parsed: TrigParseResult;
  replayScreen: TrigScreen;
  replaySeed?: TrigReplaySeed;
};

export function buildTrigonometryModeRunPayload(
  request: RunTrigonometryRuntimeRequest,
): TrigonometryModeRunPayload {
  const { outcome, parsed } = runTrigonometryCoreDraft(request.inputLatex, {
    screenHint: request.screenHint,
    angleUnit: request.angleUnit,
    identityTargetForm: request.identityTargetForm,
  });
  const replayScreen = parsed.ok
    ? trigRequestToScreen(parsed.request, request.screenHint)
    : request.screenHint;

  return {
    outcome,
    parsed,
    replayScreen,
    ...(parsed.ok
      ? {
          replaySeed: {
            screen: replayScreen,
            request: parsed.request.kind === 'periodPhase'
              ? {
                  ...parsed.request,
                  angleUnit: parsed.request.angleUnit ?? request.angleUnit,
                }
              : parsed.request,
          },
        }
      : {}),
  };
}
