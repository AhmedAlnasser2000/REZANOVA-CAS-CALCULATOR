import type {
  GraphConditionIR,
  GraphExpressionIR,
  GraphItemPresentationV1,
  GraphRelationIR,
  GraphSamplingLimitsV2,
  GraphSamplingQualityV3,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import {
  createGraphExpressionEvaluator,
  GraphExpressionPlanCache,
  type GraphExpressionEvaluator,
} from '../evaluator';
import type { GraphSampledPathSceneInput } from '../scene';
import { compileGraphCondition } from './condition';
import type { GraphAdaptiveQualityPolicyV1 } from './adaptive-policy';

type ParametricRelation = Extract<GraphRelationIR, {
  kind: 'polar-radius' | 'parametric-curve';
}>;

type Point = {
  parameter: number;
  x: number;
  y: number;
  finite: boolean;
};

type Domain = { minimum: number; maximum: number };

type ParametricInterval = {
  left: Point;
  right: Point;
};

function evaluateConstant(
  expression: GraphExpressionIR,
  cache: GraphExpressionPlanCache,
  planId: string,
  sourceRevision: number,
  environment: Readonly<Record<string, number>>,
) {
  if (expression.freeSymbols.length > 0) return null;
  const compiled = cache.getOrCompile({ planId, sourceRevision, expression });
  if (!compiled.ok) return null;
  const result = createGraphExpressionEvaluator(compiled.plan).evaluate(environment);
  return result.status === 'finite' ? result.value : null;
}

function domainFromCondition(input: {
  condition: GraphConditionIR | undefined;
  symbol: string;
  fallback: Domain;
  cache: GraphExpressionPlanCache;
  itemId: string;
  sourceRevision: number;
  environment: Readonly<Record<string, number>>;
}): Domain {
  let minimum = input.fallback.minimum;
  let maximum = input.fallback.maximum;
  const constant = (expression: GraphExpressionIR, suffix: string) => evaluateConstant(
    expression,
    input.cache,
    input.itemId + ':domain:' + suffix,
    input.sourceRevision,
    input.environment,
  );
  const applyComparison = (
    left: GraphExpressionIR,
    operator: string,
    right: GraphExpressionIR,
    suffix: string,
  ) => {
    const leftIsSymbol = left.mathJson === input.symbol;
    const rightIsSymbol = right.mathJson === input.symbol;
    const bound = leftIsSymbol
      ? constant(right, suffix + ':right')
      : rightIsSymbol
        ? constant(left, suffix + ':left')
        : null;
    if (bound === null) return;
    if (leftIsSymbol) {
      if (operator === '<' || operator === '<=') maximum = bound;
      if (operator === '>' || operator === '>=') minimum = bound;
    } else if (rightIsSymbol) {
      if (operator === '<' || operator === '<=') minimum = bound;
      if (operator === '>' || operator === '>=') maximum = bound;
    }
  };
  const visit = (condition: GraphConditionIR, suffix: string) => {
    if (condition.kind === 'comparison') {
      applyComparison(condition.left, condition.operator, condition.right, suffix);
    } else if (condition.kind === 'chain') {
      condition.operators.forEach((operator, index) => {
        applyComparison(condition.operands[index]!, operator, condition.operands[index + 1]!, suffix + ':' + index);
      });
    } else if (condition.kind === 'and') {
      condition.clauses.forEach((clause, index) => visit(clause, suffix + ':' + index));
    } else if (condition.kind === 'interval-membership' && condition.value.mathJson === input.symbol) {
      const lower = condition.minimum && constant(condition.minimum, suffix + ':minimum');
      const upper = condition.maximum && constant(condition.maximum, suffix + ':maximum');
      if (lower !== undefined && lower !== null) minimum = lower;
      if (upper !== undefined && upper !== null) maximum = upper;
    }
  };
  if (input.condition) visit(input.condition, 'root');
  return Number.isFinite(minimum) && Number.isFinite(maximum) && minimum < maximum
    ? { minimum, maximum }
    : input.fallback;
}

function screen(point: Point, viewport: GraphViewportV1, size: { width: number; height: number }) {
  return {
    x: (point.x - viewport.xMin) / (viewport.xMax - viewport.xMin) * size.width,
    y: (viewport.yMax - point.y) / (viewport.yMax - viewport.yMin) * size.height,
  };
}

function outsideViewport(point: Point, viewport: GraphViewportV1) {
  return point.x < viewport.xMin
    || point.x > viewport.xMax
    || point.y < viewport.yMin
    || point.y > viewport.yMax;
}

function sharedOutsideSide(points: Point[], viewport: GraphViewportV1) {
  return points.every((point) => point.x < viewport.xMin)
    || points.every((point) => point.x > viewport.xMax)
    || points.every((point) => point.y < viewport.yMin)
    || points.every((point) => point.y > viewport.yMax);
}

function compileEvaluators(input: {
  itemId: string;
  sourceRevision: number;
  relation: ParametricRelation;
  cache: GraphExpressionPlanCache;
}): { x: GraphExpressionEvaluator; y: GraphExpressionEvaluator } | GraphStopReason {
  const expressions = input.relation.kind === 'polar-radius'
    ? [input.relation.radius]
    : [input.relation.x, input.relation.y];
  const compiled = expressions.map((expression, index) => input.cache.getOrCompile({
    planId: input.itemId + ':parametric:' + index,
    sourceRevision: input.sourceRevision,
    expression,
  }));
  const failure = compiled.find((entry) => !entry.ok);
  if (failure && !failure.ok) return failure.stopReason;
  const evaluators = compiled.map((entry) => (
    entry.ok ? createGraphExpressionEvaluator(entry.plan) : null
  ));
  if (input.relation.kind === 'polar-radius') {
    const radius = evaluators[0]!;
    return {
      x: { evaluate: (environment) => {
        const value = radius.evaluate(environment);
        return value.status === 'finite'
          ? { status: 'finite' as const, value: value.value * Math.cos(environment.theta ?? 0) }
          : value;
      } },
      y: { evaluate: (environment) => {
        const value = radius.evaluate(environment);
        return value.status === 'finite'
          ? { status: 'finite' as const, value: value.value * Math.sin(environment.theta ?? 0) }
          : value;
      } },
    };
  }
  return { x: evaluators[0]!, y: evaluators[1]! };
}

export function sampleParametricGraphRelation(input: {
  itemId: string;
  sourceRevision: number;
  relation: ParametricRelation;
  presentation: GraphItemPresentationV1;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  parameterEnvironment: Readonly<Record<string, number>>;
  quality: GraphSamplingQualityV3;
  limits: GraphSamplingLimitsV2;
  policy?: GraphAdaptiveQualityPolicyV1;
  cache: GraphExpressionPlanCache;
  control: { now: () => number; isCancelled: () => boolean };
}): {
  path?: GraphSampledPathSceneInput;
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  stopReason?: GraphStopReason;
  sampleCount: number;
  vertexCount: number;
} {
  const qualityPolicy = input.policy ?? {
    seedSpacingPixels: input.quality === 'preview' ? 32 : input.quality === 'settled' ? 16 : 12,
    midpointTolerancePixels: input.quality === 'preview' ? 1.5 : input.quality === 'settled' ? 0.35 : 0.2,
    turnToleranceRadians: input.quality === 'preview' ? Math.PI / 12 : input.quality === 'settled' ? Math.PI / 30 : Math.PI / 60,
  };
  const compiled = compileEvaluators(input);
  if ('code' in compiled) {
    return { status: 'budget-exhausted', stopReason: compiled, sampleCount: 0, vertexCount: 0 };
  }
  const symbol = input.relation.kind === 'polar-radius' ? 'theta' : input.relation.parameterSymbol;
  const condition = input.relation.domain
    ? compileGraphCondition({
        condition: input.relation.domain,
        itemId: input.itemId,
        branchId: 'domain',
        sourceRevision: input.sourceRevision,
        cache: input.cache,
      })
    : null;
  if (condition && !condition.ok) {
    return { status: 'budget-exhausted', stopReason: condition.stopReason, sampleCount: 0, vertexCount: 0 };
  }
  const domain = domainFromCondition({
    condition: input.relation.domain,
    symbol,
    fallback: input.relation.kind === 'polar-radius'
      ? { minimum: 0, maximum: Math.PI * 2 }
      : { minimum: -10, maximum: 10 },
    cache: input.cache,
    itemId: input.itemId,
    sourceRevision: input.sourceRevision,
    environment: input.parameterEnvironment,
  });
  const startedAt = input.control.now();
  const points = new Map<number, Point>();
  const environment: Record<string, number> = { ...input.parameterEnvironment };
  let stopped: 'budget-exhausted' | 'cancelled' | null = null;
  const evaluate = (parameter: number) => {
    const existing = points.get(parameter);
    if (existing) return existing;
    if (input.control.isCancelled()) {
      stopped = 'cancelled';
      return null;
    }
    if (points.size >= input.limits.maximumSamples
      || input.control.now() - startedAt >= input.limits.maximumTimeMs) {
      stopped = 'budget-exhausted';
      return null;
    }
    environment[symbol] = parameter;
    const allowed = condition?.ok
      ? condition.condition.test(environment)
      : true;
    const x = compiled.x.evaluate(environment);
    const y = compiled.y.evaluate(environment);
    const point: Point = {
      parameter,
      x: x.status === 'finite' ? x.value : Number.NaN,
      y: y.status === 'finite' ? y.value : Number.NaN,
      finite: allowed === true && x.status === 'finite' && y.status === 'finite',
    };
    points.set(parameter, point);
    return point;
  };
  const initialIntervals = Math.max(24, Math.ceil(
    Math.hypot(input.cssSize.width, input.cssSize.height) / qualityPolicy.seedSpacingPixels,
  ));
  const pending: ParametricInterval[] = [];
  const convergeFiniteBoundary = (finiteEndpoint: Point, nonFiniteEndpoint: Point) => {
    let finite = finiteEndpoint;
    let nonFinite = nonFiniteEndpoint;
    while (!stopped && !outsideViewport(finite, input.viewport)) {
      const parameter = finite.parameter + (nonFinite.parameter - finite.parameter) / 2;
      if (parameter === finite.parameter || parameter === nonFinite.parameter) return finite;
      const point = evaluate(parameter);
      if (!point) return finite;
      if (point.finite) finite = point;
      else nonFinite = point;
    }
    return finite;
  };
  const queueFiniteRemainder = (left: Point, right: Point) => {
    if (!left.finite || !right.finite || left.parameter === right.parameter) return;
    pending.push({ left, right });
  };
  const refineToScreenConvergence = () => {
    while (pending.length > 0 && !stopped) {
      const interval = pending.pop()!;
      if (interval.left.finite !== interval.right.finite) {
        const boundary = convergeFiniteBoundary(
          interval.left.finite ? interval.left : interval.right,
          interval.left.finite ? interval.right : interval.left,
        );
        if (boundary) {
          if (interval.left.finite) queueFiniteRemainder(interval.left, boundary);
          else queueFiniteRemainder(boundary, interval.right);
        }
        continue;
      }
      const parameter = interval.left.parameter
        + (interval.right.parameter - interval.left.parameter) / 2;
      if (parameter === interval.left.parameter || parameter === interval.right.parameter) continue;
      const middle = evaluate(parameter);
      if (!middle) return;
      if (!interval.left.finite && !middle.finite && !interval.right.finite) continue;
      if (interval.left.finite !== middle.finite) {
        const boundary = convergeFiniteBoundary(
          interval.left.finite ? interval.left : middle,
          interval.left.finite ? middle : interval.left,
        );
        if (boundary) {
          if (interval.left.finite) queueFiniteRemainder(interval.left, boundary);
          else queueFiniteRemainder(boundary, middle);
        }
      }
      if (middle.finite !== interval.right.finite) {
        const boundary = convergeFiniteBoundary(
          middle.finite ? middle : interval.right,
          middle.finite ? interval.right : middle,
        );
        if (boundary) {
          if (middle.finite) queueFiniteRemainder(middle, boundary);
          else queueFiniteRemainder(boundary, interval.right);
        }
      }
      if (!interval.left.finite || !middle.finite || !interval.right.finite) continue;
      if (sharedOutsideSide([interval.left, middle, interval.right], input.viewport)) continue;
      const a = screen(interval.left, input.viewport, input.cssSize);
      const b = screen(middle, input.viewport, input.cssSize);
      const c = screen(interval.right, input.viewport, input.cssSize);
      const chord = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
      const deviation = Math.hypot(b.x - chord.x, b.y - chord.y);
      const firstAngle = Math.atan2(b.y - a.y, b.x - a.x);
      const secondAngle = Math.atan2(c.y - b.y, c.x - b.x);
      const turn = Math.abs(Math.atan2(
        Math.sin(secondAngle - firstAngle),
        Math.cos(secondAngle - firstAngle),
      ));
      if (deviation > qualityPolicy.midpointTolerancePixels
        || turn > qualityPolicy.turnToleranceRadians) {
        pending.push(
          { left: middle, right: interval.right },
          { left: interval.left, right: middle },
        );
      }
    }
  };
  for (let index = 0; index <= initialIntervals; index += 1) {
    evaluate(domain.minimum + index / initialIntervals * (domain.maximum - domain.minimum));
  }
  if (!stopped) {
    const coarse = [...points.values()].sort((left, right) => left.parameter - right.parameter);
    for (let index = 1; index < coarse.length && !stopped; index += 1) {
      pending.push({ left: coarse[index - 1]!, right: coarse[index]! });
    }
    refineToScreenConvergence();
  }
  const ordered = [...points.values()].sort((left, right) => left.parameter - right.parameter);
  const coordinates: number[] = [];
  const parameters: number[] = [];
  const segments: number[] = [];
  let previousFinite = false;
  ordered.forEach((point) => {
    if (!point.finite) {
      previousFinite = false;
      return;
    }
    if (!previousFinite) segments.push(parameters.length);
    coordinates.push(point.x, point.y);
    parameters.push(point.parameter);
    previousFinite = true;
  });
  const status: 'complete' | 'budget-exhausted' | 'cancelled' = stopped ?? 'complete';
  const stopReason = stopped
    ? {
        code: stopped === 'cancelled' ? 'sampling-cancelled' : 'sampling-budget-exceeded',
        detailCode: stopped === 'cancelled' ? 'cooperative-parametric-cancellation' : 'parametric-refinement-budget',
      } as GraphStopReason
    : undefined;
  const sample: GraphSampledPathSceneInput['sample'] = {
    itemId: input.itemId,
    status,
    coordinates: new Float64Array(coordinates),
    independentValues: new Float64Array(parameters),
    segmentOffsets: new Uint32Array(segments),
    ...(stopReason ? { stopReason } : {}),
    stats: {
      evaluatedSamples: points.size,
      emittedVertices: parameters.length,
      elapsedMs: Math.max(0, input.control.now() - startedAt),
    },
  };
  return {
    ...(coordinates.length >= 4 && segments.length > 0
      ? { path: { pathId: input.itemId + ':path:0', sample, style: input.presentation } }
      : {}),
    status,
    ...(stopReason ? { stopReason } : {}),
    sampleCount: points.size,
    vertexCount: parameters.length,
  };
}
