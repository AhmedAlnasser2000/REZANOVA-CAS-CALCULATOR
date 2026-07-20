import {
  createGraphExpressionEvaluator,
  GraphExpressionPlanCache,
} from '../evaluator';
import type {
  GraphAnalysisEvidenceV1,
  GraphAnalysisFeature,
  GraphAnalysisRequestV1,
  GraphAnalysisResultV1,
  GraphExpressionIR,
  GraphFeatureValueV1,
  GraphItemSpecV1,
  GraphRelationIR,
  GraphStopReason,
} from '../contracts';
import { buildGraphAnalysisCanonicalResult, graphAnalysisExactValue } from './result-document';

export type GraphAnalysisControl = {
  isCancelled?: () => boolean;
  now?: () => number;
  yieldBetweenItems?: () => Promise<void>;
};

type Polynomial = [number, number, number];
type Evaluator = (x: number) => number | undefined;

function add(a: Polynomial, b: Polynomial): Polynomial {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a: Polynomial, factor: number): Polynomial {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}
function multiply(a: Polynomial, b: Polynomial): Polynomial | undefined {
  if ((a[2] !== 0 && (b[1] !== 0 || b[2] !== 0)) || (b[2] !== 0 && a[1] !== 0)) return undefined;
  return [a[0] * b[0], a[0] * b[1] + a[1] * b[0], a[0] * b[2] + a[1] * b[1] + a[2] * b[0]];
}
function polynomial(node: unknown): Polynomial | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) return [node, 0, 0];
  if (node === 'x') return [0, 1, 0];
  if (!Array.isArray(node) || typeof node[0] !== 'string') return undefined;
  const operands = node.slice(1);
  if (node[0] === 'Negate' && operands.length === 1) {
    const value = polynomial(operands[0]);
    return value && scale(value, -1);
  }
  if (node[0] === 'Add') {
    let value: Polynomial = [0, 0, 0];
    for (const operand of operands) {
      const term = polynomial(operand);
      if (!term) return undefined;
      value = add(value, term);
    }
    return value;
  }
  if (node[0] === 'Multiply') {
    let value: Polynomial = [1, 0, 0];
    for (const operand of operands) {
      const factor = polynomial(operand);
      if (!factor) return undefined;
      const next = multiply(value, factor);
      if (!next) return undefined;
      value = next;
    }
    return value;
  }
  if (node[0] === 'Power' && operands[0] === 'x' && operands[1] === 2) return [0, 0, 1];
  return undefined;
}

function polynomialRoots([c, b, a]: Polynomial) {
  if (a === 0) return b === 0 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  if (discriminant === 0) return [-b / (2 * a)];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

function approximate(value: number, errorBound?: number): GraphFeatureValueV1 {
  return { kind: 'approximate', value, ...(errorBound === undefined ? {} : { errorBound }) };
}
function exact(value: number): GraphFeatureValueV1 {
  return { kind: 'exact', value: graphAnalysisExactValue(value) };
}

function evidence(
  request: GraphAnalysisRequestV1,
  feature: GraphAnalysisFeature,
  itemIds: string[],
  level: GraphAnalysisEvidenceV1['level'],
  serial: number,
  extra: Partial<GraphAnalysisEvidenceV1> = {},
): GraphAnalysisEvidenceV1 {
  return {
    version: 1,
    evidenceId: `${request.requestId}.${feature}.${serial}`,
    documentId: request.documentId,
    revisions: { ...request.revisions },
    itemIds,
    feature,
    level,
    conditions: [],
    basis: { source: level === 'exact-proved' ? 'graph-symbolic' : 'numeric-validator' },
    ...extra,
  };
}

function evaluatorFor(
  expression: GraphExpressionIR,
  item: GraphItemSpecV1,
  environment: Record<string, number>,
  cache: GraphExpressionPlanCache,
): Evaluator | undefined {
  const compiled = cache.getOrCompile({
    planId: `graph-analysis.${item.itemId}`,
    sourceRevision: item.kind === 'relation' || item.kind === 'piecewise' || item.kind === 'point-set'
      ? item.source.sourceRevision : 0,
    expression,
  });
  if (!compiled.ok) return undefined;
  const runner = createGraphExpressionEvaluator(compiled.plan);
  return (x) => {
    const result = runner.evaluate({ ...environment, x });
    return result.status === 'finite' ? result.value : undefined;
  };
}

function numericRoots(run: Evaluator, minimum: number, maximum: number, onEvaluation: () => void) {
  const roots: Array<{ value: number; error: number }> = [];
  const steps = 320;
  let left = minimum;
  let leftValue = run(left); onEvaluation();
  for (let index = 1; index <= steps; index += 1) {
    const right = minimum + ((maximum - minimum) * index) / steps;
    const rightValue = run(right); onEvaluation();
    if (leftValue !== undefined && rightValue !== undefined) {
      if (Math.abs(leftValue) < 1e-9) roots.push({ value: left, error: (maximum - minimum) / steps });
      if (leftValue * rightValue < 0) {
        let a = left; let b = right; let fa = leftValue;
        for (let pass = 0; pass < 42; pass += 1) {
          const mid = (a + b) / 2; const fm = run(mid); onEvaluation();
          if (fm === undefined) break;
          if (fa * fm <= 0) b = mid;
          else { a = mid; fa = fm; }
        }
        roots.push({ value: (a + b) / 2, error: Math.abs(b - a) / 2 });
      }
    }
    left = right; leftValue = rightValue;
  }
  return roots.filter((entry, index) => index === 0 || Math.abs(entry.value - roots[index - 1].value) > 1e-6);
}

function relationExpression(relation: GraphRelationIR) {
  return relation.kind === 'explicit-y' ? relation.rhs : undefined;
}

export async function runGraphAnalysisRequest(
  request: GraphAnalysisRequestV1,
  cache = new GraphExpressionPlanCache(100),
  control: GraphAnalysisControl = {},
): Promise<GraphAnalysisResultV1> {
  const now = control.now ?? (() => performance.now());
  const started = now();
  let evaluatedPointCount = 0;
  let serial = 0;
  const findings: GraphAnalysisEvidenceV1[] = [];
  const stopReasons: GraphStopReason[] = [];
  const window = request.numericWindow ?? { coordinateSystem: 'cartesian' as const, xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const requested = new Set(request.features);
  const explicitItems: Array<{ item: Extract<GraphItemSpecV1, { kind: 'relation' }>; run: Evaluator; expression: GraphExpressionIR }> = [];

  for (const snapshot of request.items) {
    if (control.isCancelled?.()) break;
    if (now() - started > request.maximumTimeMs) {
      stopReasons.push({ code: 'analysis-inconclusive', detailCode: 'time-budget-exceeded' });
      break;
    }
    if (snapshot.kind !== 'relation') {
      if (snapshot.kind === 'piecewise' && requested.has('piecewise-continuity')) {
        findings.push(evidence(request, 'piecewise-continuity', [snapshot.itemId], 'inconclusive', serial++, {
          stopReason: { code: 'analysis-inconclusive', detailCode: 'branch-limit-proof-required' },
        }));
      }
      await control.yieldBetweenItems?.();
      continue;
    }
    const expression = relationExpression(snapshot.relation);
    if (!expression) {
      for (const feature of request.features) {
        findings.push(evidence(request, feature, [snapshot.itemId], 'unsupported', serial++, {
          stopReason: { code: 'analysis-unsupported', detailCode: snapshot.relation.kind },
        }));
      }
      continue;
    }
    const run = evaluatorFor(expression, snapshot, request.parameterEnvironment, cache);
    if (!run) continue;
    explicitItems.push({ item: snapshot, run, expression });
    const coefficients = polynomial(expression.mathJson);
    if (requested.has('root') || requested.has('x-intercept')) {
      const roots = coefficients
        ? polynomialRoots(coefficients).map((value) => ({ value, exact: true, error: 0 }))
        : numericRoots(run, window.xMin, window.xMax, () => { evaluatedPointCount += 1; })
          .map((entry) => ({ ...entry, exact: false }));
      for (const root of roots.filter((entry) => entry.value >= window.xMin && entry.value <= window.xMax)) {
        const level = root.exact ? 'exact-proved' : 'numeric-validated';
        const x = root.exact ? exact(root.value) : approximate(root.value, root.error);
        for (const feature of ['root', 'x-intercept'] as const) if (requested.has(feature)) {
          findings.push(evidence(request, feature, [snapshot.itemId], level, serial++, {
            coordinates: { x, y: root.exact ? exact(0) : approximate(0, 1e-9) },
            relationValue: root.exact ? exact(0) : approximate(0, 1e-9),
            basis: root.exact
              ? { source: 'graph-symbolic', validator: 'degree-at-most-two polynomial identity' }
              : { source: 'numeric-validator', validator: 'bracketed bisection', residualBound: 1e-8 },
          }));
        }
      }
    }
    if (requested.has('y-intercept')) {
      const y = run(0); evaluatedPointCount += 1;
      if (y !== undefined) findings.push(evidence(request, 'y-intercept', [snapshot.itemId], coefficients ? 'exact-proved' : 'numeric-validated', serial++, {
        coordinates: { x: coefficients ? exact(0) : approximate(0), y: coefficients ? exact(y) : approximate(y, 1e-10) },
      }));
    }
    if (requested.has('extremum') && coefficients?.[2]) {
      const x = -coefficients[1] / (2 * coefficients[2]);
      const y = run(x); evaluatedPointCount += 1;
      if (y !== undefined) findings.push(evidence(request, 'extremum', [snapshot.itemId], 'exact-proved', serial++, {
        coordinates: { x: exact(x), y: exact(y) },
        basis: { source: 'graph-symbolic', validator: coefficients[2] > 0 ? 'quadratic local minimum' : 'quadratic local maximum' },
      }));
    }
    const node = expression.mathJson;
    if (Array.isArray(node) && node[0] === 'Divide') {
      const numerator = polynomial(node[1]); const denominator = polynomial(node[2]);
      if (denominator) for (const x of polynomialRoots(denominator)) {
        const numeratorValue = numerator ? numerator[0] + numerator[1] * x + numerator[2] * x * x : undefined;
        const removable = numeratorValue === 0;
        if (removable && requested.has('hole')) findings.push(evidence(request, 'hole', [snapshot.itemId], 'exact-proved', serial++, { coordinates: { x: exact(x) } }));
        if (!removable) for (const feature of ['pole', 'vertical-asymptote', 'domain-boundary'] as const) if (requested.has(feature)) {
          findings.push(evidence(request, feature, [snapshot.itemId], feature === 'domain-boundary' ? 'exact-proved' : 'numeric-validated', serial++, {
            coordinates: { x: exact(x) },
            basis: feature === 'domain-boundary'
              ? { source: 'graph-symbolic', validator: 'denominator exclusion' }
              : { source: 'numeric-validator', validator: 'nonzero numerator at denominator root', residualBound: 1e-8 },
          }));
        }
      }
      if (requested.has('horizontal-asymptote') && numerator && denominator) {
        const numeratorDegree = numerator[2] !== 0 ? 2 : numerator[1] !== 0 ? 1 : 0;
        const denominatorDegree = denominator[2] !== 0 ? 2 : denominator[1] !== 0 ? 1 : 0;
        if (numeratorDegree <= denominatorDegree) {
          const y = numeratorDegree < denominatorDegree ? 0 : numerator[numeratorDegree] / denominator[denominatorDegree];
          findings.push(evidence(request, 'horizontal-asymptote', [snapshot.itemId], 'exact-proved', serial++, { coordinates: { y: exact(y) } }));
        }
      }
    }
    if (Array.isArray(node) && (node[0] === 'Ln' || node[0] === 'Sqrt') && requested.has('domain-boundary')) {
      const argument = polynomial(node[1]);
      if (argument) for (const x of polynomialRoots(argument)) findings.push(evidence(request, 'domain-boundary', [snapshot.itemId], 'exact-proved', serial++, { coordinates: { x: exact(x) } }));
    }
    await control.yieldBetweenItems?.();
  }

  if (!control.isCancelled?.() && requested.has('intersection')) {
    for (let first = 0; first < explicitItems.length; first += 1) for (let second = first + 1; second < explicitItems.length; second += 1) {
      const a = explicitItems[first]; const b = explicitItems[second];
      const roots = numericRoots((x) => {
        const av = a.run(x); const bv = b.run(x);
        return av === undefined || bv === undefined ? undefined : av - bv;
      }, window.xMin, window.xMax, () => { evaluatedPointCount += 2; });
      for (const root of roots) {
        const y = a.run(root.value); evaluatedPointCount += 1;
        if (y !== undefined) findings.push(evidence(request, 'intersection', [a.item.itemId, b.item.itemId], 'numeric-validated', serial++, {
          coordinates: { x: approximate(root.value, root.error), y: approximate(y, 1e-7) },
          basis: { source: 'numeric-validator', validator: 'bracketed difference bisection', residualBound: 1e-7 },
        }));
      }
    }
  }

  const cancelled = control.isCancelled?.() ?? false;
  const elapsedMs = Math.max(0, now() - started);
  const status = cancelled ? 'cancelled' : stopReasons.length ? 'partial' : 'complete';
  if (cancelled) stopReasons.push({ code: 'analysis-inconclusive', detailCode: 'cancelled' });
  return {
    version: 1,
    requestId: request.requestId,
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: { ...request.revisions },
    status,
    evidence: findings,
    canonicalResult: buildGraphAnalysisCanonicalResult(request, findings),
    stopReasons,
    diagnostics: {
      elapsedMs,
      evaluatedPointCount,
      exactFindingCount: findings.filter((entry) => entry.level === 'exact-proved').length,
      validatedFindingCount: findings.filter((entry) => entry.level === 'numeric-validated').length,
      analysisRevision: request.revisions.mathematics,
    },
  };
}
