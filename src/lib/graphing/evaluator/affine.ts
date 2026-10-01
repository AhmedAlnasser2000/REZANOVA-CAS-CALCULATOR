import * as I from './interval-math';
import type { GraphInterval, GraphIntervalValue } from './interval-math';
import { createGraphIntervalEvaluator } from './interval';
import type { CompiledGraphExpressionPlan } from './types';

// Tighter ranges (PTX-ENGINE1, gate E3). Plain intervals forget that the same
// variable appears twice (x − x over [0, 1] gives [−1, 1]); affine arithmetic
// keeps each input's share as a separate term, so it cancels. Sums, products
// and integer powers stay affine here; any other operation is enclosed by
// intervals and enters as a fresh term. The mean-value form
// f(c) + f′(X)·(X − c) shrinks like the square of the box. Every form is a
// true enclosure, so their intersection is too.

type Affine = { centre: number; terms: Map<number, number>; error: number; flags: GraphIntervalValue };

const EPS = Number.EPSILON;

function spread(form: Affine) {
  let total = form.error;
  for (const coefficient of form.terms.values()) total += Math.abs(coefficient);
  return I.nextUp(total * (1 + 4 * EPS));
}

function rangeOf(form: Affine): GraphIntervalValue {
  // An exact constant stays a point, so x¹ keeps an integer exponent.
  if (form.terms.size === 0 && form.error === 0) return { ...form.flags, lo: form.centre, hi: form.centre };
  const r = spread(form);
  return { ...form.flags, lo: I.nextDown(form.centre - r), hi: I.nextUp(form.centre + r) };
}

/** Rounding of a computed number: a bound on its error, to add to the error term. */
const roundOff = (value: number) => Math.abs(value) * EPS + Number.MIN_VALUE;

function constant(value: number): Affine { return { centre: value, terms: new Map(), error: 0, flags: I.point(value) }; }

function sum(a: Affine, b: Affine, sign = 1): Affine {
  const terms = new Map(a.terms);
  let error = a.error + b.error;
  for (const [id, coefficient] of b.terms) {
    const next = (terms.get(id) ?? 0) + sign * coefficient;
    error += roundOff(next); terms.set(id, next);
  }
  const centre = a.centre + sign * b.centre;
  error += roundOff(centre);
  return { centre, terms, error, flags: I.add(a.flags, b.flags) };
}

function times(a: Affine, b: Affine, fresh: () => number): Affine {
  const terms = new Map<number, number>();
  let error = 0;
  for (const [id, coefficient] of a.terms) { const v = coefficient * b.centre; terms.set(id, v); error += roundOff(v); }
  for (const [id, coefficient] of b.terms) { const v = (terms.get(id) ?? 0) + coefficient * a.centre; terms.set(id, v); error += roundOff(v); }
  const centre = a.centre * b.centre;
  error += roundOff(centre) + Math.abs(a.centre) * b.error + Math.abs(b.centre) * a.error;
  // The product of the two deviations is not affine: bounded by the product of their spreads, as a fresh term.
  const quadratic = spread(a) * spread(b);
  if (quadratic > 0) terms.set(fresh(), quadratic * (1 + 4 * EPS));
  return { centre, terms, error, flags: I.multiply(a.flags, b.flags) };
}

function scale(a: Affine, factor: number): Affine {
  const terms = new Map<number, number>();
  let error = Math.abs(factor) * a.error;
  for (const [id, coefficient] of a.terms) { const v = coefficient * factor; terms.set(id, v); error += roundOff(v); }
  const centre = a.centre * factor;
  return { centre, terms, error: error + roundOff(centre), flags: I.multiply(a.flags, I.point(factor)) };
}

/** An operation affine arithmetic does not model: its interval enclosure as a fresh term. */
function fromInterval(value: GraphIntervalValue, fresh: () => number): Affine {
  if (value.defined === 0 || !Number.isFinite(value.lo) || !Number.isFinite(value.hi)) {
    return { centre: 0, terms: new Map(), error: Infinity, flags: value };
  }
  const centre = (value.lo + value.hi) / 2;
  const radius = I.nextUp(Math.max(centre - value.lo, value.hi - centre));
  return { centre, terms: new Map([[fresh(), radius]]), error: roundOff(centre), flags: value };
}

// One-operator interval evaluators, built once per operator and arity.
const operatorEvaluators = new Map<string, ReturnType<typeof createGraphIntervalEvaluator>>();
function operatorEvaluator(operator: string, arity: number) {
  const key = `${operator}/${arity}`;
  let evaluator = operatorEvaluators.get(key);
  if (!evaluator) {
    const symbols = Array.from({ length: arity }, (_, index) => `a${index}`);
    evaluator = createGraphIntervalEvaluator({ planId: `affine.${key}`, sourceRevision: 0, requiredSymbols: symbols, samplingHints: { periodic: [] },
      instructions: [...symbols.map((symbol) => ({ kind: 'symbol' as const, symbol })), { kind: 'operator' as const, operator, arity }] });
    operatorEvaluators.set(key, evaluator);
  }
  return evaluator;
}

/**
 * Affine evaluation of a plan over a box. Operations other than + − × and
 * integer powers go through their interval enclosure (from `interval-math`).
 */
export function graphAffineRange(plan: CompiledGraphExpressionPlan, box: Readonly<Record<string, number | GraphInterval>>): GraphIntervalValue {
  let nextId = 0; const fresh = () => (nextId += 1);
  const inputs = new Map<string, number>();
  const stack: Affine[] = [];
  const nowhere: GraphIntervalValue = { lo: Number.NaN, hi: Number.NaN, defined: 0, continuous: false, smooth: false };
  // Interval enclosures for the non-affine operators: reuse the interval evaluator one operator at a time.
  const unaryInterval = (operator: string, args: GraphIntervalValue[]) => {
    const single = operatorEvaluator(operator, args.length);
    const result = single.evaluate(Object.fromEntries(args.map((arg, index) => [`a${index}`, { lo: arg.lo, hi: arg.hi }])));
    let defined = result.defined; let continuous = result.continuous; let smooth = result.smooth;
    for (const arg of args) { defined = Math.min(defined, arg.defined) as typeof defined; continuous &&= arg.continuous; smooth &&= arg.smooth; }
    return { ...result, defined, continuous, smooth };
  };
  for (const instruction of plan.instructions) {
    if (instruction.kind === 'literal') { stack.push(constant(instruction.value)); continue; }
    if (instruction.kind === 'symbol') {
      const value = box[instruction.symbol];
      if (value === undefined) return nowhere;
      if (typeof value === 'number') { stack.push(constant(value)); continue; }
      const id = inputs.get(instruction.symbol) ?? fresh(); inputs.set(instruction.symbol, id);
      const centre = (value.lo + value.hi) / 2;
      const radius = I.nextUp(Math.max(centre - value.lo, value.hi - centre));
      stack.push({ centre, terms: new Map([[id, radius]]), error: roundOff(centre), flags: I.interval(value.lo, value.hi) });
      continue;
    }
    const args = stack.splice(stack.length - instruction.arity, instruction.arity);
    if (args.length !== instruction.arity) return nowhere;
    let result: Affine;
    switch (instruction.operator) {
      case 'Add': result = args.slice(1).reduce((total, term) => sum(total, term), args[0]!); break;
      case 'Negate': result = scale(args[0]!, -1); break;
      case 'Multiply': result = args.slice(1).reduce((total, term) => times(total, term, fresh), args[0]!); break;
      case 'Power': {
        const exponent = args[1]!;
        const n = exponent.terms.size === 0 && exponent.error === 0 ? exponent.centre : Number.NaN;
        if (Number.isInteger(n) && n >= 1 && n <= 8) {
          result = args[0]!;
          for (let index = 1; index < n; index += 1) result = times(result, args[0]!, fresh);
          // Even powers are never negative: keep that from the interval enclosure.
          result = { ...result, flags: unaryInterval('Power', args.map(rangeOf)) };
          break;
        }
        result = fromInterval(unaryInterval('Power', args.map(rangeOf)), fresh);
        break;
      }
      case 'Divide': {
        const divisor = args[1]!;
        if (divisor.terms.size === 0 && divisor.error === 0 && divisor.centre !== 0) { result = scale(args[0]!, 1 / divisor.centre); result.error += roundOff(1 / divisor.centre) * spread(args[0]!); break; }
        result = fromInterval(unaryInterval('Divide', args.map(rangeOf)), fresh);
        break;
      }
      default: result = fromInterval(unaryInterval(instruction.operator, args.map(rangeOf)), fresh);
    }
    if (result.flags.defined === 0) return nowhere;
    stack.push(result);
  }
  if (stack.length !== 1) return nowhere;
  const final = rangeOf(stack[0]!);
  // Keep the sign facts the interval flags know (x² ≥ 0) that the affine form may not.
  return I.intersect(final, stack[0]!.flags);
}

/**
 * The tightest enclosure available of a plan over a box: the plain interval,
 * the mean-value form (when the expression is smooth and defined throughout)
 * and the affine form, intersected.
 */
export function graphTightRange(plan: CompiledGraphExpressionPlan, box: Readonly<Record<string, GraphInterval>>,
  parameters: Readonly<Record<string, number>> = {}): GraphIntervalValue {
  const variables = Object.keys(box);
  const environment = { ...parameters, ...box };
  const plain = createGraphIntervalEvaluator(plan, variables).evaluate(environment);
  if (plain.defined === 0) return plain;
  let best: GraphIntervalValue = plain;
  if (plain.defined === 2 && plain.smooth && plain.gradient.every((slope) => Number.isFinite(slope.lo) && Number.isFinite(slope.hi))) {
    const centre = Object.fromEntries(variables.map((variable) => [variable, (box[variable]!.lo + box[variable]!.hi) / 2]));
    const atCentre = createGraphIntervalEvaluator(plan).evaluate({ ...parameters, ...centre });
    if (atCentre.defined === 2) {
      let meanValue: GraphIntervalValue = atCentre;
      variables.forEach((variable, index) => {
        const offset = I.interval(I.nextDown(box[variable]!.lo - centre[variable]!), I.nextUp(box[variable]!.hi - centre[variable]!));
        meanValue = I.add(meanValue, I.multiply(plain.gradient[index]!, offset));
      });
      best = I.intersect(best, meanValue);
    }
  }
  const affine = graphAffineRange(plan, environment);
  if (affine.defined !== 0 && affine.lo <= affine.hi) best = I.intersect(best, affine);
  return best;
}
