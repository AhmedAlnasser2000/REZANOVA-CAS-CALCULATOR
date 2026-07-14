import type {
  CanonicalRuntimeOutcome,
  TrigParseResult,
  TrigReplaySeed,
  TrigScreen,
  VersionedResultProducerDraft,
} from '../../types/calculator';
import { runTrigonometryCoreDraft } from './core';
import {
  canonicalResultVersionForProducer,
  finalizeCanonicalRuntimeOutcomeFromProducer,
  requireCanonicalResultAuthority,
} from '../result-contract';
import { trigRequestToScreen } from './parser';
import {
  createTrigonometryRequestErrorOutcomeV2,
  createTrigonometryRequestResultOutcomeV2,
  createTrigonometryResultOutcome,
} from './result-document';
import type { RunTrigonometryRuntimeRequest } from './runtime-input';
import {
  trigonometryMathJsonRouteForRequest,
  trigonometryMathValuesFromOwnedLeaves,
  trigonometryV2MathResolverFromOwnedLeaves,
} from './math-values';

export type TrigonometryModeRunPayload = {
  outcome: VersionedResultProducerDraft;
  parsed: TrigParseResult;
  replayScreen: TrigScreen;
  replaySeed?: TrigReplaySeed;
};

export type CanonicalTrigonometryModeRunPayload = Omit<
  TrigonometryModeRunPayload,
  'outcome'
> & {
  outcome: CanonicalRuntimeOutcome;
};

export function buildTrigonometryModeRunPayload(
  request: RunTrigonometryRuntimeRequest,
): TrigonometryModeRunPayload {
  const {
    outcome,
    parsed,
    mathJsonLeaves,
    requestEvidence,
  } = runTrigonometryCoreDraft(request.inputLatex, {
    screenHint: request.screenHint,
    angleUnit: request.angleUnit,
    identityTargetForm: request.identityTargetForm,
  });
  const replayScreen = parsed.ok
    ? trigRequestToScreen(parsed.request, request.screenHint)
    : request.screenHint;

  const ownedOutcome = requireCanonicalResultAuthority(outcome.kind === 'prompt'
    ? outcome
    : parsed.ok
      ? (() => {
          const routeId = trigonometryMathJsonRouteForRequest(parsed.request);
          const version = canonicalResultVersionForProducer({
            routeId,
            selector: parsed.request.kind,
          });
          if (
            version === 2
            && (parsed.request.kind === 'angleConvert' || parsed.request.kind === 'rightTriangle')
          ) {
            const mathValue = trigonometryV2MathResolverFromOwnedLeaves({
              routeId,
              leaves: mathJsonLeaves,
            });
            if (outcome.kind === 'error' && !requestEvidence) {
              return createTrigonometryRequestErrorOutcomeV2(outcome, mathValue);
            }
            if (!requestEvidence || requestEvidence.kind !== parsed.request.kind) {
              throw new Error(
                'Trigonometry selected V2 without complete producer-owned request evidence.',
              );
            }
            return createTrigonometryRequestResultOutcomeV2(outcome, {
              requestEvidence,
              presentationLatex: outcome.resolvedInputLatex ?? request.inputLatex.trim(),
              mathValue,
            });
          }
          return createTrigonometryResultOutcome(outcome, {
            mathValues: trigonometryMathValuesFromOwnedLeaves({
              outcome,
              routeId,
              leaves: mathJsonLeaves,
            }),
          });
        })()
      : createTrigonometryResultOutcome(outcome), 'Trigonometry');

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

export function buildCanonicalTrigonometryModeRunPayload(
  request: RunTrigonometryRuntimeRequest,
): CanonicalTrigonometryModeRunPayload {
  const payload = buildTrigonometryModeRunPayload(request);
  return {
    ...payload,
    outcome: finalizeCanonicalRuntimeOutcomeFromProducer(payload.outcome, 'Trigonometry'),
  };
}
