import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber, latexToApproxText, numberToLatex } from '../../display/format';
import type {
  IntervalDomainCheck,
  OneSidedDomainCheck,
} from '../../algebra/domain-range-core';
import { assumptionFactsFromDomainCheck } from '../../algebra/assumption-adapters';
import { buildAssumptionFact, type AssumptionFact } from '../../algebra/assumptions-core';
import { mergeAssumptionDetailSections } from '../../algebra/assumption-readback';
import type {
  IntegrationCandidateMetadata,
  IntegralStrategy,
} from '../../symbolic-engine/integration';
import type {
  CalculusDerivativeStrategy,
  CanonicalSpecialFunctionExpressionV4,
  DisplayAnswerRowsReadback,
  DisplayDetailSection,
  ResultOrigin,
} from '../../../types/calculator';
import type { AntiderivativeBackcheck } from './verification';
import type {
  CalculusAntiderivativeExpression,
  CalculusIntegrationDetailNode,
  CalculusIntegrationFactNode,
} from './antiderivative-expression';
import {
  calculusDetailSection,
  calculusMathPart,
  calculusTextPart,
  calculusTextRows,
} from '../detail-readback';

export const ce = new ComputeEngine();

export type CalculusCoreEvaluation = {
  exactLatex?: string;
  antiderivativeExpression?: CalculusAntiderivativeExpression;
  answerRows?: DisplayAnswerRowsReadback;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: ResultOrigin;
  exactSupplementLatex?: string[];
  integrationStrategy?: IntegralStrategy;
  derivativeStrategies?: CalculusDerivativeStrategy[];
  integrationCandidate?: IntegrationCandidateMetadata;
  antiderivativeBackcheck?: AntiderivativeBackcheck;
  detailSections?: DisplayDetailSection[];
  mathJsonLeaves?: CalculusOwnedMathJsonLeaf[];
  integrationFactNodes?: CalculusIntegrationFactNode[];
  integrationDetailNodes?: CalculusIntegrationDetailNode[];
  indefiniteIntegralAuthority?: CalculusIndefiniteIntegralAuthority;
};

export type CalculusOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

export type CalculusIndefiniteIntegralAuthority = {
  selector: 'indefiniteIntegral:standard' | 'indefiniteIntegral:special-function' | 'indefiniteIntegral:error';
  request: CalculusOwnedMathJsonLeaf;
  primary?: CalculusOwnedMathJsonLeaf;
  specialExpression?: CanonicalSpecialFunctionExpressionV4;
};

export type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  simplify?: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

export type LimitValue = number | 'posInfinity' | 'negInfinity';

export function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();

  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof numeric.json.num === 'string'
  ) {
    const parsed = Number(numeric.json.num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const text = latexToApproxText(numeric.latex);
  if (!text) {
    return undefined;
  }

  const value = Number(text.replace(/\s+/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

export function boxNode(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

export function nodeToFiniteNumber(node: unknown) {
  return boxedToFiniteNumber(boxNode(node));
}

export function evaluateBodyAt(body: unknown, variable: string, value: number) {
  try {
    const numeric = boxNode(body).subs({ [variable]: value }).evaluate();
    return boxedToFiniteNumber(numeric);
  } catch {
    return undefined;
  }
}

export function limitValueToLatex(value: LimitValue) {
  if (value === 'posInfinity') {
    return '\\infty';
  }

  if (value === 'negInfinity') {
    return '-\\infty';
  }

  return numberToLatex(value);
}

export function limitValueToApproxText(value: LimitValue) {
  if (value === 'posInfinity') {
    return 'Infinity';
  }

  if (value === 'negInfinity') {
    return '-Infinity';
  }

  return formatApproxNumber(value);
}

export function numericFallbackDetail(...lines: string[]): DisplayDetailSection[] {
  return [calculusDetailSection('Limit Method', calculusTextRows(lines))];
}

export function integralMethodDetail(...lines: string[]): DisplayDetailSection {
  return calculusDetailSection('Integral Method', calculusTextRows(lines));
}

function formatIntervalBounds(lower: number, upper: number) {
  return `[${numberToLatex(Math.min(lower, upper))}, ${numberToLatex(Math.max(lower, upper))}]`;
}

function constraintLatex(check: IntervalDomainCheck) {
  if (check.kind === 'unsafe') {
    const { constraint } = check.violation;
    if (
      constraint.kind === 'nonzero'
      || constraint.kind === 'positive'
      || constraint.kind === 'nonnegative'
      || constraint.kind === 'expression-interval'
    ) {
      return constraint.expressionLatex;
    }
  }

  return undefined;
}

export function integralSafetyDetail(
  check: IntervalDomainCheck,
  lower: number,
  upper: number,
): DisplayDetailSection {
  const intervalLatex = formatIntervalBounds(lower, upper);
  if (check.kind === 'unsafe') {
    const constraint = constraintLatex(check);
    return calculusDetailSection('Interval Safety', [
      [
        calculusTextPart('Stopped before integration because '),
        calculusMathPart(`x=${numberToLatex(check.value)}`),
        calculusTextPart(` ${check.violation.message}.`),
      ],
      constraint
        ? [
            calculusMathPart(constraint),
            calculusTextPart(' failed a real-domain constraint on '),
            calculusMathPart(intervalLatex),
            calculusTextPart('.'),
          ]
        : [
            calculusTextPart('A real-domain constraint failed on '),
            calculusMathPart(intervalLatex),
            calculusTextPart('.'),
          ],
    ]);
  }

  if (check.constraints.length === 0) {
    return calculusDetailSection('Interval Safety', [[
      calculusTextPart('No explicit real-domain constraints were detected on '),
      calculusMathPart(intervalLatex),
      calculusTextPart('.'),
    ]]);
  }

  if (check.kind === 'unknown') {
    return calculusDetailSection('Interval Safety', [
      [
        calculusTextPart('No concrete domain violation was detected on '),
        calculusMathPart(intervalLatex),
        calculusTextPart('.'),
      ],
      ...calculusTextRows([
        'The interval proof is bounded, so the result keeps the existing fallback honesty policy.',
      ]),
    ]);
  }

  return calculusDetailSection('Interval Safety', [[
    calculusTextPart('Real-domain constraints were checked at the finite endpoints and bounded sample points on '),
    calculusMathPart(intervalLatex),
    calculusTextPart('.'),
  ]]);
}

export function antiderivativeTrustFacts(backcheck: AntiderivativeBackcheck | undefined) {
  if (!backcheck) {
    return [];
  }

  const trust = backcheck.status === 'verified-exact'
    ? 'proved'
    : backcheck.status === 'verified-numeric-confidence'
      ? 'sampled'
      : backcheck.status === 'not-verified'
        ? 'blocked'
        : 'display-only';

  return [buildAssumptionFact({
    kind: 'equivalence-trust',
    source: 'calculus-verification',
    trust,
    scope: 'result',
    message: `Antiderivative backcheck status: ${backcheck.status}.`,
  })];
}

export function mergeCalculusAssumptionDetails(
  existing: readonly DisplayDetailSection[] | undefined,
  ...factGroups: readonly AssumptionFact[][]
) {
  return mergeAssumptionDetailSections(existing, factGroups.flat());
}

export function domainCheckDetails(
  existing: readonly DisplayDetailSection[] | undefined,
  check: IntervalDomainCheck | OneSidedDomainCheck,
) {
  return mergeCalculusAssumptionDetails(
    existing,
    assumptionFactsFromDomainCheck(check),
  );
}
