import type {
  AngleUnit,
  ResultProducerDraft,
  ResultProducerActionDraft,
  TrigIdentityState,
  TrigParseResult,
  TrigRequest,
  TrigScreen,
} from '../../types/calculator';
import { canonicalizeMathInput } from '../input/input-canonicalization';
import { planMathExecution } from '../engine/semantic-planner';
import { runSharedEquationSolve } from '../equation/shared-solve';
import { convertAngleState, type TrigEvaluation } from './angles';
import { evaluateTrigFunction } from './functions';
import { evaluateTrigIdentity } from './identities';
import { parseTrigDraft } from './parser';
import { analyzePeriodPhase } from './period-phase';
import { solveCosineRule, solveRightTriangle, solveSineRule } from './triangles';
import type { TrigonometryOwnedMathJsonLeaf } from './math-values';
import { parseSignedNumberInput } from '../numeric/signed-number';

const ownedMathJsonByOutcome = new WeakMap<object, readonly TrigonometryOwnedMathJsonLeaf[]>();

export type TrigonometryV2RequestEvidence =
  | {
      kind: 'angleConvert';
      value: TrigonometryOwnedMathJsonLeaf;
      from: AngleUnit;
      to: AngleUnit;
    }
  | {
      kind: 'rightTriangle';
      knownQuantities: Array<
        | {
            kind: 'side';
            name: 'a' | 'b' | 'c';
            value: TrigonometryOwnedMathJsonLeaf;
          }
        | {
            kind: 'angle';
            name: 'A' | 'B';
            value: TrigonometryOwnedMathJsonLeaf;
          }
      >;
    };

function rememberOwnedMathJson(
  outcome: ResultProducerDraft,
  leaves: readonly TrigonometryOwnedMathJsonLeaf[] | undefined,
) {
  if (leaves?.length) ownedMathJsonByOutcome.set(outcome, leaves);
  return outcome;
}

function canonicalLeavesFromSharedEquation(outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>) {
  const document = outcome.canonicalResult;
  if (!document) return [];
  const values = [
    document.primaryMath,
    document.branchReadback?.target,
    ...(document.branchReadback?.branches ?? []),
    ...(document.supplements ?? []),
  ];
  return values.flatMap((value): TrigonometryOwnedMathJsonLeaf[] =>
    value?.mathJson === undefined
      ? []
      : [{
          canonicalLatex: value.canonicalLatex,
          mathJson: value.mathJson,
          source: 'trigonometry.equation.shared-equation-canonical-result',
        }]);
}

function toOutcome(
  title: string,
  evaluation: TrigEvaluation,
): ResultProducerDraft {
  if (evaluation.error) {
    return rememberOwnedMathJson({
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      branchReadback: evaluation.branchReadback,
      exactSupplementLatex: evaluation.exactSupplementLatex,
      approxText: evaluation.approxText,
      detailSections: evaluation.detailSections,
    }, evaluation.mathJsonLeaves);
  }

  return rememberOwnedMathJson({
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    branchReadback: evaluation.branchReadback,
    exactSupplementLatex: evaluation.exactSupplementLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
    resultOrigin: evaluation.resultOrigin,
    detailSections: evaluation.detailSections,
  }, evaluation.mathJsonLeaves);
}

function withCanonicalMetadata(
  outcome: ResultProducerDraft,
  originalLatex: string,
  resolvedLatex: string,
): ResultProducerDraft {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const updated: ResultProducerDraft = {
    ...outcome,
    resolvedInputLatex: resolvedLatex !== originalLatex.trim() ? resolvedLatex : undefined,
    plannerBadges: resolvedLatex !== originalLatex.trim() ? ['Canonicalized'] : outcome.plannerBadges,
  };
  return rememberOwnedMathJson(updated, ownedMathJsonByOutcome.get(outcome));
}

function requestTitle(request: TrigRequest, screenHint?: TrigScreen) {
  switch (request.kind) {
    case 'function':
      return screenHint === 'specialAngles' ? 'Special Angles' : 'Trig Functions';
    case 'identitySimplify':
      return 'Identity Simplify';
    case 'identityConvert':
      return 'Identity Convert';
    case 'equationSolve':
      return 'Trig Equation';
    case 'rightTriangle':
      return 'Right Triangle';
    case 'sineRule':
      return 'Sine Rule';
    case 'cosineRule':
      return 'Cosine Rule';
    case 'angleConvert':
      return 'Angle Convert';
    case 'periodPhase':
      return 'Period & Phase';
  }
}

function rightTriangleRequestLeaves(
  request: Extract<TrigRequest, { kind: 'rightTriangle' }>,
): TrigonometryOwnedMathJsonLeaf[] {
  const quantities = [
    ['a', request.knownSideA],
    ['b', request.knownSideB],
    ['c', request.knownSideC],
    ['A', request.knownAngleA],
    ['B', request.knownAngleB],
  ] as const;
  return quantities.flatMap(([name, raw]) => {
    const canonicalLatex = raw?.trim() ?? '';
    const value = parseSignedNumberInput(canonicalLatex);
    return value === null
      ? []
      : [{
          canonicalLatex,
          mathJson: value,
          source: `trigonometry.right-triangle.request-${name}`,
        }];
  });
}

function v2RequestEvidenceFromOwnedLeaves(
  request: TrigRequest,
  leaves: readonly TrigonometryOwnedMathJsonLeaf[],
): TrigonometryV2RequestEvidence | undefined {
  if (request.kind === 'angleConvert') {
    const value = leaves.find((leaf) =>
      leaf.source === 'trigonometry.angle-conversion.request-value');
    return value
      ? { kind: 'angleConvert', value, from: request.from, to: request.to }
      : undefined;
  }
  if (request.kind !== 'rightTriangle') return undefined;

  const quantities = [
    { kind: 'side' as const, name: 'a' as const },
    { kind: 'side' as const, name: 'b' as const },
    { kind: 'side' as const, name: 'c' as const },
    { kind: 'angle' as const, name: 'A' as const },
    { kind: 'angle' as const, name: 'B' as const },
  ].flatMap((quantity) => {
    const value = leaves.find((leaf) =>
      leaf.source === `trigonometry.right-triangle.request-${quantity.name}`);
    return value ? [{ ...quantity, value }] : [];
  });
  return { kind: 'rightTriangle', knownQuantities: quantities };
}

function runTrigRequest(
  request: TrigRequest,
  angleUnit: AngleUnit,
  screenHint?: TrigScreen,
): ResultProducerDraft {
  const title = requestTitle(request, screenHint);

  switch (request.kind) {
    case 'function':
      return toOutcome(title, evaluateTrigFunction(request.expressionLatex, angleUnit));
    case 'identitySimplify':
      return toOutcome(title, evaluateTrigIdentity({
        expressionLatex: request.expressionLatex,
        targetForm: 'simplified',
      }));
    case 'identityConvert':
      return toOutcome(title, evaluateTrigIdentity({
        expressionLatex: request.expressionLatex,
        targetForm: request.targetForm,
      }));
    case 'equationSolve': {
      const planner = planMathExecution(request.equationLatex, {
        mode: 'trigonometry',
        intent: 'equation-solve',
        angleUnit,
        screenHint: 'equationSolve',
      });

      if (planner.kind === 'blocked') {
        return {
          kind: 'error',
          title,
          error: planner.error,
          warnings: [],
          resolvedInputLatex: planner.canonicalLatex,
          plannerBadges: planner.badges,
        };
      }

      const outcome = runSharedEquationSolve({
        originalLatex: request.equationLatex,
        resolvedLatex: planner.resolvedLatex,
        angleUnit,
        outputStyle: 'both',
        ansLatex: '',
      });

      if (outcome.kind === 'prompt') {
        return outcome;
      }

      const shouldOfferEquationHandoff =
        outcome.kind === 'error'
        && !(outcome.solveBadges ?? []).includes('Range Guard')
        && !outcome.exactLatex
        && (outcome.error.includes('outside the supported exact symbolic solve families')
          || outcome.error.includes('outside the supported symbolic solve families')
          || outcome.error.includes('outside the current exact bounded solve set')
          || outcome.error.includes('recognized mixed-base log family')
          || outcome.error.includes('recognized trig sum-to-product family')
          || outcome.error.includes('No symbolic solution')
          || outcome.error.includes('No bracketed real roots')
          || outcome.error.includes('No bracketed or near-zero real roots')
          || outcome.error.includes('Candidate roots were found but rejected'));
      const actions: ResultProducerActionDraft[] | undefined = shouldOfferEquationHandoff
        ? [{ kind: 'send', target: 'equation', latex: request.equationLatex }]
        : outcome.actions;

      const trigonometryOutcome = {
        ...outcome,
        title,
        actions,
        resolvedInputLatex: planner.resolvedLatex !== request.equationLatex.trim()
          ? planner.resolvedLatex
          : outcome.resolvedInputLatex,
        plannerBadges: [
          ...(planner.badges ?? []),
          ...((outcome.plannerBadges ?? []).filter((badge) => !(planner.badges ?? []).includes(badge))),
        ],
      };
      const equationLeaves = canonicalLeavesFromSharedEquation(outcome);
      delete trigonometryOutcome.canonicalResult;
      return rememberOwnedMathJson(trigonometryOutcome, equationLeaves);
    }
    case 'rightTriangle': {
      const evaluation = solveRightTriangle({
        knownSideA: request.knownSideA ?? '',
        knownSideB: request.knownSideB ?? '',
        knownSideC: request.knownSideC ?? '',
        knownAngleA: request.knownAngleA ?? '',
        knownAngleB: request.knownAngleB ?? '',
      });
      return toOutcome(title, {
        ...evaluation,
        mathJsonLeaves: [
          ...(evaluation.mathJsonLeaves ?? []),
          ...rightTriangleRequestLeaves(request),
        ],
      });
    }
    case 'sineRule':
      return toOutcome(title, solveSineRule({
        sideA: request.sideA ?? '',
        sideB: request.sideB ?? '',
        sideC: request.sideC ?? '',
        angleA: request.angleA ?? '',
        angleB: request.angleB ?? '',
        angleC: request.angleC ?? '',
      }));
    case 'cosineRule':
      return toOutcome(title, solveCosineRule({
        sideA: request.sideA ?? '',
        sideB: request.sideB ?? '',
        sideC: request.sideC ?? '',
        angleA: request.angleA ?? '',
        angleB: request.angleB ?? '',
        angleC: request.angleC ?? '',
      }));
    case 'angleConvert':
      return toOutcome(title, convertAngleState({
        value: request.valueLatex,
        from: request.from,
        to: request.to,
      }));
    case 'periodPhase':
      return toOutcome(title, analyzePeriodPhase(
        request.expressionLatex,
        request.angleUnit ?? angleUnit,
      ));
  }
}

function parseFailureToOutcome(parsed: Extract<TrigParseResult, { ok: false }>): ResultProducerDraft {
  return {
    kind: 'error',
    title: 'Trigonometry',
    error: parsed.error,
    warnings: [],
  };
}

export function runTrigonometryCoreDraft(
  rawLatex: string,
  options: {
    screenHint?: TrigScreen;
    angleUnit: AngleUnit;
    identityTargetForm?: TrigIdentityState['targetForm'];
  },
) {
  const canonicalized = canonicalizeMathInput(rawLatex, {
    mode: 'trigonometry',
    screenHint: options.screenHint,
  });
  const source = canonicalized.ok ? canonicalized.canonicalLatex : rawLatex;
  const parsed = parseTrigDraft(source, options);
  if (!parsed.ok) {
    const outcome = withCanonicalMetadata(parseFailureToOutcome(parsed), rawLatex, source);
    return {
      outcome,
      parsed,
      mathJsonLeaves: ownedMathJsonByOutcome.get(outcome) ?? [],
      requestEvidence: undefined,
    };
  }

  const outcome = withCanonicalMetadata(
    runTrigRequest(parsed.request, options.angleUnit, options.screenHint),
    rawLatex,
    source,
  );
  const mathJsonLeaves = ownedMathJsonByOutcome.get(outcome) ?? [];
  return {
    outcome,
    parsed,
    mathJsonLeaves,
    requestEvidence: v2RequestEvidenceFromOwnedLeaves(parsed.request, mathJsonLeaves),
  };
}
