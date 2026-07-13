import { ComputeEngine } from '@cortex-js/compute-engine';
import { latexToApproxText } from '../../display/format';
import type { DisplayDetailSection } from '../../../types/calculator';
import { derivativeVariableLatex, derivativeVariableOrDefault } from '../derivative-target';
import { parseFiniteLimitTargetDraft } from '../engine/finite-limit-target';
import {
  evaluateFiniteLimitFromAst,
  evaluateInfiniteLimitFromAst,
} from '../engine/limits';
import { classifyNaturalLimitRoute } from '../limit-route-classifier';
import {
  limitRouteExplanationSection,
  planNaturalLimitRoute,
  type LimitRoutePlan,
} from '../limit-route-orchestrator';
import {
  parseNaturalLimitRequest,
  type NaturalLimitRequest,
} from '../limit-request';
import { parseLimitPiecewiseDraft } from '../limit-piecewise-row-editor';
import {
  analyzeNaturalLimitVariables,
  limitVariableMismatchDetails,
  limitVariableMismatchError,
} from '../limit-variable-analysis';
import { resolvePiecewiseLimit } from '../../symbolic-engine/limits';
import {
  limitValueToLatex,
  type CalculusCoreEvaluation,
  type CalculusOwnedMathJsonLeaf,
} from '../engine/shared';
import type {
  CalculusFiniteLimitState,
  CalculusInfiniteLimitState,
  CalculusLimitState,
  EquationDomainIntent,
  LimitDirection,
} from '../../../types/calculator';
import {
  calculusDetailSection,
  calculusMathPart,
  calculusTextPart,
  calculusTextRow,
  calculusTextRows,
} from '../detail-readback';
import { profileCalculusResult } from '../../display/printer';

const ce = new ComputeEngine();

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
};

export type AdvancedLimitEvaluation = CalculusCoreEvaluation;

type LimitRouteOptions = {
  routeKind?: string;
  allowNumericFallback?: boolean;
  equationDomainIntent?: EquationDomainIntent;
};

function limitValueMathJson(value: number | 'posInfinity' | 'negInfinity') {
  if (value === 'posInfinity') return 'PositiveInfinity';
  if (value === 'negInfinity') return ['Negate', 'PositiveInfinity'];
  return value;
}

function isReciprocalVariable(node: unknown, variable: string) {
  return Array.isArray(node)
    && ((node[0] === 'Divide' && node[1] === 1 && node[2] === variable)
      || (node[0] === 'Power' && node[1] === variable && node[2] === -1));
}

function sincInner(node: unknown, variable: string): unknown | undefined {
  if (!Array.isArray(node) || node[0] !== 'Divide' || node.length !== 3) return undefined;
  const numerator = node[1];
  if (!Array.isArray(numerator) || numerator[0] !== 'Sin') return undefined;
  return JSON.stringify(numerator[1]) === JSON.stringify(node[2]) && node[2] === variable
    ? node[2]
    : undefined;
}

function appendMathJsonLeaves(
  evaluation: AdvancedLimitEvaluation,
  leaves: readonly CalculusOwnedMathJsonLeaf[],
): AdvancedLimitEvaluation {
  return leaves.length === 0
    ? evaluation
    : {
        ...evaluation,
        mathJsonLeaves: [...(evaluation.mathJsonLeaves ?? []), ...leaves],
      };
}

function finiteLimitMathJsonEvidence(input: {
  evaluation: AdvancedLimitEvaluation;
  body: unknown;
  variable: string;
  target: number;
  direction: LimitDirection;
}) {
  if (input.evaluation.error || !input.evaluation.exactLatex) return input.evaluation;
  const leaves: CalculusOwnedMathJsonLeaf[] = [];
  const inner = sincInner(input.body, input.variable);
  if (inner !== undefined && input.target === 0) {
    const innerLatex = (ce.box(inner as Parameters<typeof ce.box>[0]) as BoxedLike).latex;
    leaves.push(
      {
        canonicalLatex: input.evaluation.exactLatex,
        mathJson: 1,
        source: 'calculus.limit:known-sinc-answer',
      },
      {
        canonicalLatex: `u=${innerLatex}`,
        mathJson: ['Equal', 'u', inner],
        source: 'calculus.limit:known-sinc-substitution',
      },
      {
        canonicalLatex: `\\lim_{${input.variable}\\to ${limitValueToLatex(input.target)}}u=0`,
        mathJson: ['Equal', ['Limit', ['Function', 'u', input.variable], input.target], 0],
        source: 'calculus.limit:known-sinc-inner-limit',
      },
      {
        canonicalLatex: '\\frac{\\sin(u)}{u}\\to 1',
        mathJson: ['To', ['Divide', ['Sin', 'u'], 'u'], 1],
        source: 'calculus.limit:known-sinc-equivalent',
      },
    );
  }

  if (isReciprocalVariable(input.body, input.variable) && input.target === 0) {
    const answer = input.direction === 'left' ? 'negInfinity' : 'posInfinity';
    const answerMathJson = limitValueMathJson(answer);
    const sideTarget = input.direction === 'left'
      ? ['Superminus', input.target]
      : ['PseudoInverse', input.target];
    const sideLatex = input.direction === 'left' ? '-' : '+';
    const approachLatex = `${input.variable}\\to ${limitValueToLatex(input.target)}^{${sideLatex}}`;
    leaves.push(
      {
        canonicalLatex: input.evaluation.exactLatex,
        mathJson: answerMathJson,
        source: `calculus.limit:reciprocal-${input.direction}-answer`,
      },
      {
        canonicalLatex: '1',
        mathJson: 1,
        source: 'calculus.limit:reciprocal-coefficient',
      },
      {
        canonicalLatex: '-1',
        mathJson: -1,
        source: 'calculus.limit:reciprocal-scale',
      },
      {
        canonicalLatex: approachLatex,
        mathJson: ['To', input.variable, sideTarget],
        source: `calculus.limit:reciprocal-${input.direction}-approach`,
      },
      {
        canonicalLatex: `\\lim_{${approachLatex}} f(${input.variable})=${input.evaluation.exactLatex}`,
        mathJson: [
          'Equal',
          ['Limit', ['Function', ['InvisibleOperator', 'f', ['Delimiter', input.variable]], input.variable], sideTarget],
          answerMathJson,
        ],
        source: `calculus.limit:reciprocal-${input.direction}-calculation`,
      },
    );
  }
  return appendMathJsonLeaves(input.evaluation, leaves);
}

function infiniteLimitMathJsonEvidence(input: {
  evaluation: AdvancedLimitEvaluation;
  body: unknown;
  variable: string;
}) {
  if (
    input.evaluation.error
    || !input.evaluation.exactLatex
    || !isReciprocalVariable(input.body, input.variable)
  ) return input.evaluation;
  const bodyLatex = (ce.box(input.body as Parameters<typeof ce.box>[0]) as BoxedLike).latex;
  return appendMathJsonLeaves(input.evaluation, [
    {
      canonicalLatex: input.evaluation.exactLatex,
      mathJson: 0,
      source: 'calculus.limit:infinite-reciprocal-answer',
    },
    {
      canonicalLatex: bodyLatex,
      mathJson: input.body,
      source: 'calculus.limit:infinite-reciprocal-scale',
    },
    {
      canonicalLatex: `${input.variable}^{-1}`,
      mathJson: input.body,
      source: 'calculus.limit:infinite-reciprocal-scale-readback',
    },
    {
      canonicalLatex: '1',
      mathJson: 1,
      source: 'calculus.limit:infinite-reciprocal-coefficient',
    },
  ]);
}

function formatBodyVariables(bodyVariables: readonly string[]) {
  return bodyVariables.length > 0
    ? bodyVariables.map(derivativeVariableLatex).join(', ')
    : 'none detected';
}

function appendUnstableLimitDiagnostic(input: {
  evaluation: AdvancedLimitEvaluation;
  request: NaturalLimitRequest;
  routeKind: string;
  bodyVariables: readonly string[];
}): AdvancedLimitEvaluation {
  if (
    !input.evaluation.error
    || !input.evaluation.error.includes('could not be stabilized')
  ) {
    return input.evaluation;
  }

  const expressionVariables = formatBodyVariables(input.bodyVariables);
  const diagnostic: DisplayDetailSection = calculusDetailSection('Limit Diagnostic', [
    [
      calculusTextPart('Parsed variable: '),
      calculusMathPart(input.request.variableLatex),
      calculusTextPart('.'),
    ],
    input.bodyVariables.length > 0
      ? [
          calculusTextPart('Expression variables: '),
          calculusMathPart(expressionVariables),
          calculusTextPart('.'),
        ]
      : calculusTextRow('Expression variables: none detected.'),
    ...calculusTextRows([
      `Route classification: ${input.routeKind}.`,
      'No supported symbolic route or stable numeric sample sequence resolved this expression.',
    ]),
  ]);

  return {
    ...input.evaluation,
    detailSections: [
      ...(input.evaluation.detailSections ?? []),
      diagnostic,
    ],
  };
}

function routeOutcome(evaluation: AdvancedLimitEvaluation) {
  if (evaluation.resultOrigin === 'numeric-fallback') {
    return 'numeric-fallback-used' as const;
  }
  if (evaluation.error) {
    return 'controlled-stop' as const;
  }
  return 'resolved' as const;
}

function appendRouteExplanation(
  evaluation: AdvancedLimitEvaluation,
  routePlan: Extract<LimitRoutePlan, { kind: 'ready' }>,
): AdvancedLimitEvaluation {
  return {
    ...evaluation,
    detailSections: [
      ...(evaluation.detailSections ?? []),
      limitRouteExplanationSection({
        classification: routePlan.classification,
        allowNumericFallback: routePlan.allowNumericFallback,
        outcome: routeOutcome(evaluation),
      }),
    ],
  };
}

function finiteTargetLabel(direction: LimitDirection) {
  return direction === 'left' ? 'Left-hand' : 'Right-hand';
}

function evaluatePiecewiseLimitRequest(
  request: NaturalLimitRequest,
): AdvancedLimitEvaluation | undefined {
  const piecewise = resolvePiecewiseLimit({
    bodyLatex: request.bodyLatex,
    variable: request.variable,
    target: request.target.kind === 'finite'
      ? {
          kind: 'finite',
          value: request.target.value,
          direction: request.target.direction,
        }
      : {
          kind: 'infinite',
          targetKind: request.target.targetKind,
        },
  });

  if (piecewise.kind === 'not-piecewise') {
    return undefined;
  }

  if (piecewise.kind === 'failure') {
    return {
      warnings: [],
      error: piecewise.error,
      detailSections: piecewise.detailSections,
    };
  }

  return {
    exactLatex: piecewise.exactLatex,
    approxText: piecewise.approxText,
    warnings: [],
    resultOrigin: piecewise.origin,
    detailSections: piecewise.detailSections,
  };
}

function piecewiseDraftValidationStop(
  requestLatex: string,
): AdvancedLimitEvaluation | undefined {
  const draft = parseLimitPiecewiseDraft(requestLatex);
  if (!draft || draft.issues.length === 0) {
    return undefined;
  }

  const firstIssue = draft.issues[0];
  const rowIndex = draft.rows.findIndex((row) => row.id === firstIssue.rowId);
  const rowNumber = rowIndex >= 0 ? rowIndex + 1 : 1;

  return {
    warnings: [],
    error: `Fix row ${rowNumber}: ${firstIssue.message}`,
    detailSections: [calculusDetailSection(
      'Piecewise Input',
      calculusTextRows(draft.issues.map((issue) => {
          const issueIndex = draft.rows.findIndex((row) => row.id === issue.rowId);
          const issueRowNumber = issueIndex >= 0 ? issueIndex + 1 : 1;
          return `Row ${issueRowNumber}: ${issue.message}`;
      })),
    )],
  };
}

export function evaluateCalculusFiniteLimit(
  state: CalculusFiniteLimitState & LimitRouteOptions,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const parsedTarget = parseFiniteLimitTargetDraft(state.target);
  const variable = derivativeVariableOrDefault(state.variable);
  const variableLatex = derivativeVariableLatex(variable);
  if (!bodyLatex || !parsedTarget) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }
  const target = parsedTarget.value;
  const direction = parsedTarget.directionOverride ?? state.direction;

  try {
    const parsed = ce.parse(`\\lim_{${variableLatex}\\to ${target}}\\left(${bodyLatex}\\right)`) as BoxedLike;
    const body = ce.parse(bodyLatex) as BoxedLike;
    const exact = parsed.evaluate();
    if (exact.latex !== parsed.latex && !exact.latex.includes('\\lim')) {
      return profileCalculusResult({
        exactLatex: exact.latex,
        approxText: latexToApproxText((exact.N?.() ?? exact).latex),
        warnings: [],
        resultOrigin: 'symbolic',
        mathJsonLeaves: [{
          canonicalLatex: exact.latex,
          mathJson: exact.json,
          source: 'calculus.limit:compute-engine-answer',
        }],
      });
    }

    return finiteLimitMathJsonEvidence({
      evaluation: evaluateFiniteLimitFromAst({
      body: body.json,
      variable,
      target,
      direction,
      routeKind: state.routeKind,
      allowNumericFallback: state.allowNumericFallback,
      equationDomainIntent: state.equationDomainIntent,
      messages: {
        mismatchError: 'Left and right behavior do not agree near the target.',
        unstableError: 'This limit could not be stabilized numerically in Calculus.',
        numericFallbackWarning: () =>
          'Symbolic limit unavailable; showing a numeric finite limit approximation.',
        oneSidedUnboundedError: (side) =>
          `${finiteTargetLabel(side)} limit appears unbounded near the target.`,
        oneSidedDomainError: (side) =>
          `${finiteTargetLabel(side)} behavior is outside the real domain near the target.`,
      },
      }),
      body: body.json,
      variable,
      target,
      direction,
    });
  } catch {
    return {
      warnings: [],
      error: 'This symbolic limit is outside the supported Calculus rules.',
    };
  }
}

export function evaluateCalculusInfiniteLimit(
  state: CalculusInfiniteLimitState & LimitRouteOptions,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const variable = derivativeVariableOrDefault(state.variable);
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }

  const body = ce.parse(bodyLatex).json;
  return infiniteLimitMathJsonEvidence({
    evaluation: evaluateInfiniteLimitFromAst({
      body,
    variable,
    targetKind: state.targetKind,
    routeKind: state.routeKind,
    allowNumericFallback: state.allowNumericFallback,
    equationDomainIntent: state.equationDomainIntent,
    messages: {
      targetLabel: (kind) => (kind === 'posInfinity' ? '+infinity' : '-infinity'),
      unstableError: 'This limit could not be stabilized numerically in Calculus.',
      numericFallbackWarning: 'Symbolic limit unavailable; showing a numeric infinite-target approximation.',
    },
    }),
    body,
    variable,
  });
}

export function evaluateCalculusLimit(
  state: CalculusLimitState & { equationDomainIntent?: EquationDomainIntent },
): AdvancedLimitEvaluation {
  const parsed = parseNaturalLimitRequest(state.requestLatex);
  if (!parsed.ok) {
    return {
      warnings: [],
      error: parsed.error,
    };
  }

  const { request } = parsed;
  const piecewiseValidation = piecewiseDraftValidationStop(state.requestLatex);
  if (piecewiseValidation) {
    return piecewiseValidation;
  }

  const variableAnalysis = analyzeNaturalLimitVariables(request);
  if (variableAnalysis.mismatch) {
    return {
      warnings: [],
      error: limitVariableMismatchError(variableAnalysis.mismatch),
      detailSections: limitVariableMismatchDetails(variableAnalysis.mismatch),
    };
  }

  const route = classifyNaturalLimitRoute(state.requestLatex);
  const routePlan = planNaturalLimitRoute(route);
  if (routePlan.kind === 'blocked') {
    return {
      warnings: [],
      error: routePlan.error,
      detailSections: routePlan.detailSections,
    };
  }

  const evaluate = (): AdvancedLimitEvaluation => {
    const piecewise = evaluatePiecewiseLimitRequest(request);
    if (piecewise) {
      return piecewise;
    }

    if (request.target.kind === 'finite') {
      return evaluateCalculusFiniteLimit({
        bodyLatex: request.bodyLatex,
        target: request.target.normalizedTargetLatex,
        direction: request.target.direction,
        variable: request.variable,
        routeKind: routePlan.routeKind,
        allowNumericFallback: routePlan.allowNumericFallback,
        equationDomainIntent: state.equationDomainIntent,
      });
    }

    return evaluateCalculusInfiniteLimit({
      bodyLatex: request.bodyLatex,
      targetKind: request.target.targetKind,
      variable: request.variable,
      routeKind: routePlan.routeKind,
      allowNumericFallback: routePlan.allowNumericFallback,
      equationDomainIntent: state.equationDomainIntent,
    });
  };

  const withRouteExplanation = appendRouteExplanation(evaluate(), routePlan);

  return appendUnstableLimitDiagnostic({
    evaluation: withRouteExplanation,
    request,
    routeKind: routePlan.routeKind,
    bodyVariables: variableAnalysis.bodyVariables,
  });
}
