import { demand, type ExecutionContext } from '../execution';
import { igcd, iquot, irem } from '../algebra/integer';
import { rAdd, rational, rDivide, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';

/**
 * Log-linear constants q₀ + Σ cᵢ·ln rᵢ with rational q₀, cᵢ and rational rᵢ > 0.
 *
 * Exactness: over a coprime base b₁ … bₘ of the integers involved (pairwise
 * coprime, hence multiplicatively independent), ln b₁ … ln bₘ are ℚ-linearly
 * independent, and by Baker's theorem so are 1, ln b₁ … ln bₘ (even over the
 * algebraic numbers). Coordinates in that basis therefore decide equality,
 * proportionality and zero exactly. The base is built by gcd splitting; no
 * integer is factored.
 */
export interface LogLinear {
  readonly constant: Rational;
  /** Logarithm terms keyed by the canonical text of rᵢ. */
  readonly logs: ReadonlyMap<string, { readonly base: Rational; readonly coefficient: Rational }>;
}

const key = (r: Rational) => `${r.numerator}/${r.denominator}`;

/** Read a number-only expression as a log-linear constant, or undefined when it is not one. */
export function parseLogLinear(store: ExpressionStore, id: ExprId): LogLinear | undefined {
  const ctx = store.ctx;
  let constant = rational(ctx, 0n);
  const logs = new Map<string, { base: Rational; coefficient: Rational }>();
  // Work list of (expression, rational multiplier); numeric factors distribute over sums.
  const work: { id: ExprId; scale: Rational }[] = [{ id, scale: rational(ctx, 1n) }];
  while (work.length) {
    ctx.tick();
    const { id: t, scale } = work.pop() as { id: ExprId; scale: Rational };
    const v = store.numberValue(t);
    if (v) { constant = rAdd(ctx, constant, rMultiply(ctx, scale, v)); continue; }
    const n = store.node(t);
    if (n.kind === 'add') { for (const a of n.args) work.push({ id: a, scale }); continue; }
    if (n.kind === 'mul' && n.args.length === 2 && store.numberValue(n.args[0])) {
      work.push({ id: n.args[1], scale: rMultiply(ctx, scale, store.numberValue(n.args[0]) as Rational) });
      continue;
    }
    if (n.kind !== 'apply' || n.fn !== 'log') return undefined;
    const base = store.numberValue(n.arg);
    if (!base || base.numerator <= 0n) return undefined;
    const prior = logs.get(key(base));
    logs.set(key(base), { base, coefficient: prior ? rAdd(ctx, prior.coefficient, scale) : scale });
  }
  return Object.freeze({ constant, logs });
}

export function logLinearExpression(store: ExpressionStore, v: LogLinear): ExprId {
  const terms = [...v.logs.values()].map(({ base, coefficient }) => store.mul(store.number(coefficient), store.log(store.number(base))));
  return store.add(store.number(v.constant), ...terms);
}

/** Pairwise coprime integers > 1 whose products give every input (gcd splitting). */
export function coprimeBase(ctx: ExecutionContext, values: readonly bigint[]): bigint[] {
  let list = [...new Set(values.filter(v => v > 1n))];
  for (;;) {
    ctx.tick();
    let split = false;
    search: for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const g = igcd(ctx, list[i], list[j]);
        if (g > 1n) {
          const next = list.filter((_, k) => k !== i && k !== j);
          next.push(iquot(ctx, list[i], g), iquot(ctx, list[j], g), g);
          list = [...new Set(next.filter(v => v > 1n))];
          split = true;
          break search;
        }
      }
    }
    if (!split) return list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }
}

/** Exponents of n over a coprime base that generates it (checked to divide out completely). */
function exponents(ctx: ExecutionContext, n: bigint, base: readonly bigint[]): bigint[] {
  let rest = n;
  const out = base.map(b => {
    let e = 0n;
    while (rest > 1n && irem(ctx, rest, b) === 0n) { rest = iquot(ctx, rest, b); e++; }
    return e;
  });
  demand(rest === 1n, 'verification-failed', 'coprime base does not generate an input');
  return out;
}

/** The coprime base and each value's coordinates in the basis (1, ln b₁, …, ln bₘ). */
export function coordinateSystem(ctx: ExecutionContext, values: readonly LogLinear[]): { base: bigint[]; vectors: Rational[][] } {
  const ints: bigint[] = [];
  for (const v of values) for (const { base } of v.logs.values()) ints.push(base.numerator, base.denominator);
  const base = coprimeBase(ctx, ints);
  const vectors = values.map(v => {
    const vec = [v.constant, ...base.map(() => rational(ctx, 0n))];
    for (const { base: r, coefficient } of v.logs.values()) {
      const up = exponents(ctx, r.numerator, base), down = exponents(ctx, r.denominator, base);
      base.forEach((_, j) => { vec[j + 1] = rAdd(ctx, vec[j + 1], rMultiply(ctx, coefficient, rational(ctx, up[j] - down[j]))); });
    }
    return vec;
  });
  return { base, vectors };
}

export function coordinates(ctx: ExecutionContext, values: readonly LogLinear[]): Rational[][] { return coordinateSystem(ctx, values).vectors; }

export function isZero(ctx: ExecutionContext, v: LogLinear): boolean {
  return coordinates(ctx, [v])[0].every(c => c.numerator === 0n);
}

/** λ with a = λ·b, when it exists (b ≠ 0). */
export function ratio(ctx: ExecutionContext, a: LogLinear, b: LogLinear): Rational | undefined {
  const [x, y] = coordinates(ctx, [a, b]);
  const pivot = y.findIndex(c => c.numerator !== 0n);
  if (pivot < 0) return undefined;
  const lambda = rDivide(ctx, x[pivot], y[pivot]);
  return x.every((c, i) => rSubtract(ctx, c, rMultiply(ctx, lambda, y[i])).numerator === 0n) ? lambda : undefined;
}

/** e^v is algebraic exactly when the rational part vanishes (Lindemann–Weierstrass); then e^v = ∏ rᵢ^cᵢ. */
export function hasAlgebraicExponential(v: LogLinear): boolean { return v.constant.numerator === 0n; }

/** v = c·ln b for a single coprime-base integer b > 1 (no rational part), when it has that form. */
export function singleLogTerm(ctx: ExecutionContext, v: LogLinear): { coefficient: Rational; base: Rational } | undefined {
  const { base, vectors: [vec] } = coordinateSystem(ctx, [v]);
  if (vec[0].numerator !== 0n) return undefined;
  const nonzero = base.map((b, j) => ({ b, c: vec[j + 1] })).filter(t => t.c.numerator !== 0n);
  return nonzero.length === 1 ? { coefficient: nonzero[0].c, base: rational(ctx, nonzero[0].b) } : undefined;
}
