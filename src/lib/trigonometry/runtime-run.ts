import type {
  TrigParseResult,
  TrigReplaySeed,
  TrigScreen,
} from '../../types/calculator';
import { runTrigonometryCoreDraft } from './core';
import { requireCanonicalResultAuthority } from '../result-contract';
import { trigRequestToScreen } from './parser';
import { createTrigonometryResultOutcome } from './result-document';
import type { RunTrigonometryRuntimeRequest } from './runtime-input';
import {
  trigonometryMathJsonRouteForRequest,
  trigonometryMathValuesFromOwnedLeaves,
} from './math-values';

export type TrigonometryModeRunPayload = {
  outcome: ReturnType<typeof runTrigonometryCoreDraft>['outcome'];
  parsed: TrigParseResult;
  replayScreen: TrigScreen;
  replaySeed?: TrigReplaySeed;
};

export function buildTrigonometryModeRunPayload(
  request: RunTrigonometryRuntimeRequest,
): TrigonometryModeRunPayload {
  const { outcome, parsed, mathJsonLeaves } = runTrigonometryCoreDraft(request.inputLatex, {
    screenHint: request.screenHint,
    angleUnit: request.angleUnit,
    identityTargetForm: request.identityTargetForm,
  });
  const replayScreen = parsed.ok
    ? trigRequestToScreen(parsed.request, request.screenHint)
    : request.screenHint;

  const ownedOutcome = requireCanonicalResultAuthority(outcome.kind === 'prompt'
    ? outcome
    : createTrigonometryResultOutcome(outcome, parsed.ok
      ? {
          mathValues: trigonometryMathValuesFromOwnedLeaves({
            outcome,
            routeId: trigonometryMathJsonRouteForRequest(parsed.request),
            leaves: mathJsonLeaves,
          }),
        }
      : undefined), 'Trigonometry');

  return {
    outcome: ownedOutcome,
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
