import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../types/calculator';
import {
  checkPointRealDomain,
  collectRealDomainConstraints,
  type DomainConstraintViolation,
} from './domain-range-core';
import {
  assumptionFactsFromDomainConstraints,
  buildAssumptionFact,
  mergeAssumptionFacts,
  type AssumptionFact,
} from './assumptions-core';

const ce = new ComputeEngine();

export type DomainSamplingStatus = 'safe' | 'hazard' | 'unknown';

export type DomainSamplingExpression = {
  latex: string;
  label?: string;
};

export type DomainSamplingPoint = {
  value: number;
  undefined?: boolean;
};

export type DomainSamplingPointResult = {
  value: number;
  status: 'safe' | 'hazard' | 'undefined';
  expressionLatex?: string;
  violation?: DomainConstraintViolation;
};

export type DomainSamplingReadiness = {
  status: DomainSamplingStatus;
  constraints: SolveDomainConstraint[];
  sampledPoints: DomainSamplingPointResult[];
  undefinedSampleCount: number;
  assumptionFacts: AssumptionFact[];
};

type ParsedExpression = {
  latex: string;
  node: unknown;
};

export type BuildDomainSamplingReadinessInput = {
  expressions: readonly DomainSamplingExpression[];
  variable?: string;
  sampledPoints?: readonly DomainSamplingPoint[];
  hasDomainWarning?: boolean;
};

function parseExpressions(expressions: readonly DomainSamplingExpression[]) {
  const parsed: ParsedExpression[] = [];
  let failedCount = 0;

  for (const expression of expressions) {
    const latex = expression.latex.trim();
    if (!latex) {
      continue;
    }

    try {
      const node = ce.parse(latex).json;
      if (containsErrorNode(node)) {
        failedCount += 1;
        continue;
      }
      parsed.push({ latex, node });
    } catch {
      failedCount += 1;
    }
  }

  return { parsed, failedCount };
}

function containsErrorNode(node: unknown): boolean {
  if (!Array.isArray(node)) {
    return false;
  }

  if (node[0] === 'Error') {
    return true;
  }

  return node.some(containsErrorNode);
}

function collectConstraints(parsed: readonly ParsedExpression[]) {
  return parsed.flatMap((expression) => collectRealDomainConstraints(expression.node));
}

function evaluateSamplePoint(
  parsed: readonly ParsedExpression[],
  point: DomainSamplingPoint,
  variable: string,
): DomainSamplingPointResult {
  if (point.undefined) {
    return { value: point.value, status: 'undefined' };
  }

  for (const expression of parsed) {
    const violation = checkPointRealDomain({
      node: expression.node,
      variable,
      value: point.value,
    });
    if (violation) {
      return {
        value: point.value,
        status: 'hazard',
        expressionLatex: expression.latex,
        violation,
      };
    }
  }

  return { value: point.value, status: 'safe' };
}

function intervalHazardFact(input: {
  undefinedSampleCount: number;
  hazardCount: number;
  hasDomainWarning: boolean;
  constraints: readonly SolveDomainConstraint[];
  sampledPoints: readonly DomainSamplingPointResult[];
}) {
  if (!input.hasDomainWarning && input.undefinedSampleCount === 0 && input.hazardCount === 0) {
    return [];
  }

  const count = input.undefinedSampleCount > 0 ? input.undefinedSampleCount : input.hazardCount;
  const noun = count === 1 ? 'sampled point' : 'sampled points';
  const message = input.undefinedSampleCount > 0
    ? `${input.undefinedSampleCount} sampled table row${input.undefinedSampleCount === 1 ? '' : 's'} left the real domain and stayed undefined.`
    : `${count} ${noun} left the real domain during sampling.`;

  return [buildAssumptionFact({
    kind: 'interval-hazard',
    source: 'domain-range-core',
    trust: input.constraints.length > 0 ? 'sampled' : 'blocked',
    scope: 'interval',
    message,
    details: input.sampledPoints
      .filter((point) => point.status !== 'safe')
      .map((point) => `x=${point.value}: ${point.status}`),
  })];
}

export function buildDomainSamplingReadiness(
  input: BuildDomainSamplingReadinessInput,
): DomainSamplingReadiness {
  const variable = input.variable ?? 'x';
  const { parsed, failedCount } = parseExpressions(input.expressions);
  const constraints = collectConstraints(parsed);
  const sampledPoints = (input.sampledPoints ?? []).map((point) =>
    evaluateSamplePoint(parsed, point, variable));
  const undefinedSampleCount = sampledPoints.filter((point) => point.status === 'undefined').length;
  const hazardCount = sampledPoints.filter((point) => point.status === 'hazard').length;
  const hasHazard = Boolean(input.hasDomainWarning) || undefinedSampleCount > 0 || hazardCount > 0;
  const status: DomainSamplingStatus = hasHazard
    ? 'hazard'
    : failedCount > 0
      ? 'unknown'
      : 'safe';

  const constraintFacts = assumptionFactsFromDomainConstraints(constraints, {
    source: 'domain-range-core',
    scope: 'request',
    trust: constraints.length > 0 ? 'proved' : 'sampled',
  });

  return {
    status,
    constraints,
    sampledPoints,
    undefinedSampleCount,
    assumptionFacts: mergeAssumptionFacts(
      constraintFacts,
      intervalHazardFact({
        undefinedSampleCount,
        hazardCount,
        hasDomainWarning: Boolean(input.hasDomainWarning),
        constraints,
        sampledPoints,
      }),
    ),
  };
}
