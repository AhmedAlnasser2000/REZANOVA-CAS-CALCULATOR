import type { GraphConditionIR, GraphExpressionIR } from '../contracts';
import { defaultPtxSolverPort, ptxIsolateRealZeros, ptxRealRoots } from '../ptx';

// Where a piecewise condition holds along the independent variable, solved
// rather than probed: every comparison becomes g = left − right, its critical
// points are the roots of g (exact for polynomials, through PTX; otherwise
// isolated with interval arithmetic, so none is missed) and the points where g
// jumps or stops being defined, the sign of each piece between them comes from
// its midpoint, and whether a boundary belongs to the set comes from the
// operator (x² < 2 excludes ±√2, x² ≤ 2 includes them), never from testing a
// point beside it. A sampling scan is only the fallback where no interval
// enclosure exists, and anything the isolation leaves undecided is reported.

export type GraphConditionInterval = {
  minimum: number;
  maximum: number;
  minimumInclusive: boolean;
  maximumInclusive: boolean;
};

export type GraphSolvedCondition = {
  intervals: GraphConditionInterval[];
  /** Every boundary is an exact root (polynomial conditions) with no jumps or domain edges. */
  exact: boolean;
  /** Comparisons that could not be compiled or evaluated, or whose boundaries could not all be isolated. */
  unresolved: number;
  /** Boundaries known in closed form (√2, −1/2 + √13/2), by value. */
  exactValues?: Array<{ value: number; label: string }>;
};

type Predicate = (g: number) => boolean;
const PREDICATES: Record<string, Predicate> = {
  '<': (g) => g < 0, '<=': (g) => g <= 0, '=': (g) => g === 0, '>=': (g) => g >= 0, '>': (g) => g > 0, '!=': (g) => g !== 0,
};
const DEFAULT_STEPS = 400;

export function graphConditionIntervalContains(interval: GraphConditionInterval, value: number) {
  return (value > interval.minimum || (value === interval.minimum && interval.minimumInclusive))
    && (value < interval.maximum || (value === interval.maximum && interval.maximumInclusive));
}

function valid(interval: GraphConditionInterval) {
  return interval.minimum < interval.maximum
    || (interval.minimum === interval.maximum && interval.minimumInclusive && interval.maximumInclusive);
}

function intersectOne(left: GraphConditionInterval, right: GraphConditionInterval) {
  const minimum = Math.max(left.minimum, right.minimum);
  const maximum = Math.min(left.maximum, right.maximum);
  const result = {
    minimum, maximum,
    minimumInclusive: (minimum !== left.minimum || left.minimumInclusive) && (minimum !== right.minimum || right.minimumInclusive),
    maximumInclusive: (maximum !== left.maximum || left.maximumInclusive) && (maximum !== right.maximum || right.maximumInclusive),
  };
  return valid(result) ? result : null;
}

/** Sorted, disjoint intervals: overlapping or touching-and-joined pieces merge. */
export function normalizeGraphConditionIntervals(intervals: readonly GraphConditionInterval[]): GraphConditionInterval[] {
  const sorted = intervals.filter(valid).map((interval) => ({ ...interval }))
    .sort((a, b) => a.minimum - b.minimum || Number(b.minimumInclusive) - Number(a.minimumInclusive));
  const merged: GraphConditionInterval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    const joins = last && (interval.minimum < last.maximum
      || (interval.minimum === last.maximum && (interval.minimumInclusive || last.maximumInclusive)));
    if (!last || !joins) { merged.push(interval); continue; }
    if (interval.maximum > last.maximum) { last.maximum = interval.maximum; last.maximumInclusive = interval.maximumInclusive; }
    else if (interval.maximum === last.maximum) last.maximumInclusive ||= interval.maximumInclusive;
    if (interval.minimum === last.minimum) last.minimumInclusive ||= interval.minimumInclusive;
  }
  return merged;
}

export function intersectGraphConditionIntervals(left: readonly GraphConditionInterval[], right: readonly GraphConditionInterval[]) {
  return normalizeGraphConditionIntervals(left.flatMap((a) => right.flatMap((b) => { const both = intersectOne(a, b); return both ? [both] : []; })));
}

export function unionGraphConditionIntervals(left: readonly GraphConditionInterval[], right: readonly GraphConditionInterval[]) {
  return normalizeGraphConditionIntervals([...left, ...right]);
}

/** The part of [minimum, maximum] not covered by `intervals` (isolated uncovered points included). */
export function complementGraphConditionIntervals(intervals: readonly GraphConditionInterval[], minimum: number, maximum: number) {
  const covered = normalizeGraphConditionIntervals(intervals);
  const gaps: GraphConditionInterval[] = [];
  let cursor = minimum; let cursorInclusive = true;
  for (const interval of covered) {
    if (interval.maximum < minimum || interval.minimum > maximum) continue;
    const gap = { minimum: cursor, maximum: interval.minimum, minimumInclusive: cursorInclusive, maximumInclusive: !interval.minimumInclusive };
    if (valid(gap)) gaps.push(gap);
    cursor = interval.maximum; cursorInclusive = !interval.maximumInclusive;
  }
  const tail = { minimum: cursor, maximum, minimumInclusive: cursorInclusive, maximumInclusive: true };
  if (valid(tail) && cursor <= maximum) gaps.push(tail);
  return gaps.filter((gap) => gap.maximum >= minimum && gap.minimum <= maximum);
}

export function subtractGraphConditionIntervals(from: readonly GraphConditionInterval[], remove: readonly GraphConditionInterval[], minimum: number, maximum: number) {
  return intersectGraphConditionIntervals(from, complementGraphConditionIntervals(remove, minimum, maximum));
}

type Critical = { at: number; root: boolean };

/**
 * A jump or domain edge is only located to the last bit by bisection; its true
 * position is usually a short number (0 for 1/x, 0 for √x), so snap to 12
 * significant digits (or 0) when that stays inside the bracket.
 */
function snapEdge(at: number, span: number) {
  if (Math.abs(at) < 1e-12 * span) return 0;
  return Number(at.toPrecision(12));
}

function bisect(test: (value: number) => boolean, low: number, high: number) {
  const lowValue = test(low);
  for (let iteration = 0; iteration < 80 && high - low > 2 * Number.EPSILON * (1 + Math.abs(low)); iteration += 1) {
    const middle = (low + high) / 2;
    if (test(middle) === lowValue) low = middle; else high = middle;
  }
  return (low + high) / 2;
}

type Context = {
  symbol: string;
  environment: Readonly<Record<string, number>>;
  minimum: number;
  maximum: number;
  steps: number;
};

function difference(left: GraphExpressionIR, right: GraphExpressionIR): GraphExpressionIR {
  return { mathJson: ['Add', left.mathJson, ['Negate', right.mathJson]], freeSymbols: [...new Set([...left.freeSymbols, ...right.freeSymbols])] } as GraphExpressionIR;
}

/** Where `left operator right` holds in [minimum, maximum]. */
function solveComparison(left: GraphExpressionIR, operator: string, right: GraphExpressionIR, context: Context): GraphSolvedCondition {
  const port = defaultPtxSolverPort();
  const predicate = PREDICATES[operator]!;
  const expression = difference(left, right);
  const g = port.realFunction(expression, context.symbol, context.environment);
  if (!g) return { intervals: [], exact: false, unresolved: 1 };
  const all = [{ minimum: context.minimum, maximum: context.maximum, minimumInclusive: true, maximumInclusive: true }];
  if (!expression.freeSymbols.includes(context.symbol)) {
    const value = g(0);
    // A constant the evaluator cannot evaluate (log of a negative) leaves the condition unresolved, not false.
    if (value === undefined) return { intervals: [], exact: false, unresolved: 1 };
    return { intervals: predicate(value) ? all : [], exact: true, unresolved: 0 };
  }
  const polynomial = port.realPolynomialRoots(expression.mathJson, context.symbol, context.environment);
  const critical: Critical[] = [];
  const exactValues: Array<{ value: number; label: string }> = [];
  let nonRootCritical = false;
  let unresolved = 0;
  // Not a polynomial: interval isolation finds every zero, jump and domain edge (or says what it could not decide).
  const isolation = polynomial ? null : ptxIsolateRealZeros(g, context.minimum, context.maximum);
  if (isolation) {
    critical.push(...isolation.zeros.map((zero) => ({ at: zero.x, root: true })));
    critical.push(...isolation.discontinuities.map((at) => ({ at, root: false })));
    critical.push(...isolation.zeroRanges.flatMap((range) => [range.lo, range.hi].map((at) => ({ at: snapEdge(at, context.maximum - context.minimum), root: false }))));
    nonRootCritical = isolation.discontinuities.length > 0 || isolation.zeroRanges.length > 0;
    if (isolation.undecided > 0) unresolved = 1;
  }
  if (!isolation || isolation.undecided > 0) {
    const roots = ptxRealRoots(g, context.minimum, context.maximum, { steps: context.steps }, polynomial);
    for (const root of roots) {
      critical.push({ at: root.x, root: true });
      if (root.label && root.level === 'exact-proved') exactValues.push({ value: root.x, label: root.label });
    }
    // Domain edges (g stops being defined) and jumps (a sign change with no root: poles, steps).
    const step = (context.maximum - context.minimum) / context.steps;
    let previousX = context.minimum; let previous = g(previousX);
    for (let index = 1; index <= context.steps; index += 1) {
      const x = index === context.steps ? context.maximum : context.minimum + index * step;
      const value = g(x);
      if ((previous === undefined) !== (value === undefined)) {
        critical.push({ at: snapEdge(bisect((t) => g(t) === undefined, previousX, x), context.maximum - context.minimum), root: false }); nonRootCritical = true;
      } else if (previous !== undefined && value !== undefined && previous * value < 0
        && !roots.some((root) => root.x >= previousX && root.x <= x)) {
        critical.push({ at: snapEdge(bisect((t) => (g(t) ?? 0) < 0, previousX, x), context.maximum - context.minimum), root: false }); nonRootCritical = true;
      }
      previousX = x; previous = value;
    }
  }
  const points = critical.filter((point) => point.at > context.minimum && point.at < context.maximum)
    .sort((a, b) => a.at - b.at)
    .filter((point, index, list) => index === 0 || point.at - list[index - 1]!.at > 1e-12 * (1 + Math.abs(point.at)));
  // A root is where g = 0 by construction; anywhere else the boundary is judged by g's actual value there.
  const includes = (point: Critical) => {
    if (point.root) return predicate(0);
    const value = g(point.at);
    return value !== undefined && predicate(value);
  };
  const holds = (x: number) => { const value = g(x); return value !== undefined && predicate(value); };
  const edges: Array<{ at: number; inclusive: boolean }> = [
    { at: context.minimum, inclusive: true }, ...points.map((point) => ({ at: point.at, inclusive: includes(point) })),
    { at: context.maximum, inclusive: true },
  ];
  const intervals: GraphConditionInterval[] = [];
  for (let index = 0; index + 1 < edges.length; index += 1) {
    const low = edges[index]!; const high = edges[index + 1]!;
    if (holds((low.at + high.at) / 2)) {
      intervals.push({ minimum: low.at, maximum: high.at, minimumInclusive: low.inclusive, maximumInclusive: high.inclusive });
    }
  }
  for (const point of points) {
    if (includes(point)) intervals.push({ minimum: point.at, maximum: point.at, minimumInclusive: true, maximumInclusive: true });
  }
  return {
    intervals: normalizeGraphConditionIntervals(intervals), exact: polynomial !== null && !nonRootCritical, unresolved,
    ...(exactValues.length ? { exactValues } : {}),
  };
}

function combine(parts: GraphSolvedCondition[], join: 'and' | 'or', context: Context): GraphSolvedCondition {
  const all = [{ minimum: context.minimum, maximum: context.maximum, minimumInclusive: true, maximumInclusive: true }];
  let intervals: GraphConditionInterval[] = join === 'and' ? all : [];
  for (const part of parts) {
    intervals = join === 'and' ? intersectGraphConditionIntervals(intervals, part.intervals) : unionGraphConditionIntervals(intervals, part.intervals);
  }
  const exactValues = parts.flatMap((part) => part.exactValues ?? []);
  return {
    intervals, exact: parts.every((part) => part.exact), unresolved: parts.reduce((sum, part) => sum + part.unresolved, 0),
    ...(exactValues.length ? { exactValues } : {}),
  };
}

/**
 * The intervals of [minimum, maximum] where `condition` holds for the
 * independent `symbol`, with other symbols fixed by `environment`.
 */
export function solveGraphConditionIntervals(input: {
  condition: GraphConditionIR;
  symbol: string;
  environment: Readonly<Record<string, number>>;
  minimum: number;
  maximum: number;
  steps?: number;
}): GraphSolvedCondition {
  const context: Context = { symbol: input.symbol, environment: input.environment, minimum: input.minimum, maximum: input.maximum, steps: input.steps ?? DEFAULT_STEPS };
  const visit = (condition: GraphConditionIR): GraphSolvedCondition => {
    switch (condition.kind) {
      case 'constant':
        return { intervals: condition.value ? [{ minimum: context.minimum, maximum: context.maximum, minimumInclusive: true, maximumInclusive: true }] : [], exact: true, unresolved: 0 };
      case 'comparison': return solveComparison(condition.left, condition.operator, condition.right, context);
      case 'not-equal': return solveComparison(condition.left, '!=', condition.right, context);
      case 'chain':
        return combine(condition.operators.map((operator, index) => solveComparison(condition.operands[index]!, operator, condition.operands[index + 1]!, context)), 'and', context);
      case 'and': return combine(condition.clauses.map(visit), 'and', context);
      case 'or': return combine(condition.clauses.map(visit), 'or', context);
      case 'interval-membership': {
        const parts: GraphSolvedCondition[] = [];
        if (condition.minimum) parts.push(solveComparison(condition.minimum, condition.minimumInclusive ? '<=' : '<', condition.value, context));
        if (condition.maximum) parts.push(solveComparison(condition.value, condition.maximumInclusive ? '<=' : '<', condition.maximum, context));
        return combine(parts, 'and', context);
      }
    }
  };
  return visit(input.condition);
}

