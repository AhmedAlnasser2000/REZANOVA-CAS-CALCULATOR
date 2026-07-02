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
import { limitMethodSection } from '../../symbolic-engine/limits/detail-readback';
import type {
  CalculusDerivativeStrategy,
  DisplayDetailSection,
  ResultOrigin,
} from '../../../types/calculator';
import type { AntiderivativeBackcheck } from './verification';

export const ce = new ComputeEngine();

export type CalculusCoreEvaluation = {
  exactLatex?: string;
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
  return limitMethodSection(...lines);
}

export function integralMethodDetail(...lines: string[]): DisplayDetailSection {
  return {
    title: 'Integral Method',
    lines,
  };
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
    return {
      title: 'Interval Safety',
      lines: [
        `Stopped before integration because x=${numberToLatex(check.value)} ${check.violation.message}.`,
        constraintLatex(check)
          ? `${constraintLatex(check)} failed a real-domain constraint on ${intervalLatex}.`
          : `A real-domain constraint failed on ${intervalLatex}.`,
      ],
    };
  }

  if (check.constraints.length === 0) {
    return {
      title: 'Interval Safety',
      lines: [`No explicit real-domain constraints were detected on ${intervalLatex}.`],
    };
  }

  if (check.kind === 'unknown') {
    return {
      title: 'Interval Safety',
      lines: [
        `No concrete domain violation was detected on ${intervalLatex}.`,
        'The interval proof is bounded, so the result keeps the existing fallback honesty policy.',
      ],
    };
  }

  return {
    title: 'Interval Safety',
    lines: [
      `Real-domain constraints were checked at the finite endpoints and bounded sample points on ${intervalLatex}.`,
    ],
  };
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
