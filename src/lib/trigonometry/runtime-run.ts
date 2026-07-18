import type {
  CanonicalRuntimeOutcome,
  ResultProducerDraft,
  TrigParseResult,
  TrigReplaySeed,
  TrigScreen,
  VersionedResultProducerDraft,
} from '../../types/calculator';
import { runTrigonometryCoreDraft } from './core';
import {
  attachCanonicalResultV2ToProducerDraft,
  buildCanonicalResultDocumentV2FromProducerDraft,
  canonicalResultVersionForProducer,
  finalizeCanonicalRuntimeOutcomeFromProducer,
  requireCanonicalResultAuthority,
} from '../result-contract';
import { trigRequestToScreen } from './parser';
import {
  createTrigonometryRequestErrorOutcomeV2,
  createTrigonometryRequestResultOutcomeV2,
  createTrigonometryPeriodPhaseOutcomeV2,
  createTrigonometryResultOutcome,
} from './result-document';
import type { RunTrigonometryRuntimeRequest } from './runtime-input';
import {
  trigonometryMathJsonRouteForRequest,
  trigonometryMathValuesFromOwnedLeaves,
  trigonometryV2MathResolverFromOwnedLeaves,
  type TrigonometryOwnedMathJsonLeaf,
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

function compactLatex(latex: string) {
  return latex.replace(/\s+/gu, '');
}

function sharedEquationAnswerRowLeaves(
  outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>,
  leaves: readonly TrigonometryOwnedMathJsonLeaf[],
): TrigonometryOwnedMathJsonLeaf[] {
  if (outcome.kind !== 'success' || !outcome.answerRows?.rows.length || !outcome.branchReadback) {
    return [];
  }
  const targetLatex = outcome.branchReadback.targetLatex;
  const targetLeaf = leaves.find((leaf) =>
    compactLatex(leaf.canonicalLatex) === compactLatex(targetLatex));
  if (!targetLeaf) return [];

  return outcome.answerRows.rows.flatMap((row): TrigonometryOwnedMathJsonLeaf[] => {
    const branchLeaf = leaves.find((leaf) =>
      compactLatex(row.latex) === compactLatex(`${targetLatex}=${leaf.canonicalLatex}`));
    return branchLeaf
      ? [{
          canonicalLatex: row.latex,
          mathJson: ['Equal', targetLeaf.mathJson, branchLeaf.mathJson],
          source: 'trigonometry.equation.shared-equation-answer-row',
        }]
      : [];
  });
}

export function buildTrigonometryModeRunPayload(
  request: RunTrigonometryRuntimeRequest,
): TrigonometryModeRunPayload {
  const {
    outcome,
    parsed,
    mathJsonLeaves,
    requestEvidence,
    periodPhaseEvidence,
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
          const routeLeaves = parsed.request.kind === 'equationSolve'
            ? [
                ...mathJsonLeaves,
                ...sharedEquationAnswerRowLeaves(outcome, mathJsonLeaves),
              ]
            : mathJsonLeaves;
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
              leaves: routeLeaves,
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
          if (version === 2 && parsed.request.kind === 'equationSolve') {
            const canonicalResult = buildCanonicalResultDocumentV2FromProducerDraft({
              draft: outcome,
              mathValue: trigonometryV2MathResolverFromOwnedLeaves({
                routeId,
                leaves: routeLeaves,
              }),
            });
            return attachCanonicalResultV2ToProducerDraft(canonicalResult, outcome);
          }
          if (version === 2 && parsed.request.kind === 'periodPhase') {
            if (!periodPhaseEvidence) {
              throw new Error(
                'Trigonometry selected Period & Phase V2 without complete producer-owned semantics.',
              );
            }
            return createTrigonometryPeriodPhaseOutcomeV2(outcome, {
              periodPhase: periodPhaseEvidence,
              mathValue: trigonometryV2MathResolverFromOwnedLeaves({
                routeId,
                leaves: routeLeaves,
              }),
            });
          }
          return createTrigonometryResultOutcome(outcome, {
            mathValues: trigonometryMathValuesFromOwnedLeaves({
              outcome,
              routeId,
              leaves: routeLeaves,
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
