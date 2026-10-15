import { rational, rMultiply, type Rational } from '../algebra/rational';
import { signAtReal } from '../algebraic/root-of';
import { QX } from '../decision/rational-form';
import { zerosOf } from '../decision/univariate';
import { coefficientsIn, constantValue, degreeIn, fractionOf, toExpression, type MPoly } from '../parameters/mpoly';
import type { Polynomial } from '../algebra/polynomial';
import type { ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { valueExpression } from '../representation/solution-set';

/**
 * Real zeros of a radical chain by isolating and squaring (no algebraic arithmetic on nested radicals). With r = √A the
 * outermost square root and f = Q·r + P, Q a nonzero rational and P free of radicals (each radical sits alone inside
 * the next: √(x + √(x + √x)) − 1), f = 0 ⇔ Q²·A − P² = 0 ∧ −P·Q ≥ 0 (A = P²/Q² ≥ 0 follows). Repeating to a
 * polynomial F leaves sign conditions that are polynomials in x, so a candidate root of F is a zero exactly when
 * every condition holds there (`signAtReal`, exact). Undefined when f is not such a chain (the tower elimination
 * takes it then).
 */
export interface RadicalChain {
  /** The polynomial left when every radical is squared away. */
  readonly F: Polynomial<Rational>;
  /** Sign conditions (each ≥ 0) collected on the way, polynomials in x. */
  readonly conditions: readonly Polynomial<Rational>[];
}

/** f = 0 ⇔ F = 0 ∧ every condition ≥ 0 (over ℝ), when f is a chain of square roots; undefined otherwise. */
export function radicalChain(store: ExpressionStore, f: ExprId, x: string): RadicalChain | undefined {
  const ctx = store.ctx, RHO = x === 'ρ' ? 'ρ1' : 'ρ', vars = [RHO, x];
  const conditions: MPoly[] = [];
  let e = f;
  for (;;) {
    ctx.tick();
    // Fractional powers of the target: square roots only.
    const fractional = store.postorder([e]).filter(n => {
      const k = store.node(n), q = k.kind === 'pow' ? store.numberValue(k.exponent) : undefined;
      return k.kind === 'pow' && q !== undefined && q.denominator !== 1n && store.freeSymbols(k.base).includes(x);
    });
    const radicals = fractional.filter(n => { const q = store.numberValue((store.node(n) as { exponent: ExprId }).exponent) as Rational; return q.numerator === 1n && q.denominator === 2n; });
    if (radicals.length !== fractional.length) return undefined;
    if (radicals.length === 0) break;
    // The outermost radical: one inside no other radical's radicand.
    const inside = new Set(radicals.flatMap(n => store.postorder([(store.node(n) as { base: ExprId }).base]).filter(m => m !== n)));
    const top = radicals.filter(n => !inside.has(n));
    if (top.length !== 1) return undefined;
    const r = top[0], A = (store.node(r) as { base: ExprId }).base;
    const form = fractionOf(store, replace(store, e, r, RHO), vars);
    if (!form || !constantPoly(form.den) || degreeIn(form.num, 0) !== 1) return undefined;
    const [P, Q] = coefficientsIn(form.num, 0);
    if (!constantPoly(Q)) return undefined;
    const q = constantValue(ctx, Q);
    conditions.push(scaleBy(P, rational(ctx, -q.numerator * q.denominator, 1n), ctx));
    // Next equation: Q²·A − P² (P free of radicals, so the radicals left are those inside A).
    e = store.sub(store.mul(store.number(rMultiply(ctx, q, q)), A), store.pow(toExpression(store, P), store.integer(2)));
  }
  if (conditions.length === 0) return undefined;
  const Fx = fractionOf(store, e, [x]);
  if (!Fx || !constantPoly(Fx.den)) return undefined;
  const F = QX.make(ctx, coefficientsIn(Fx.num, 0).map(c => constantValue(ctx, c)));
  if (QX.degree(ctx, F) <= 0) return undefined;
  return { F, conditions: conditions.map(m => QX.make(ctx, coefficientsIn(m, 1).map(c => constantValue(ctx, c)))) };
}

/** Whether a real value x₀ is a zero of the chain: F(x₀) = 0 and every condition ≥ 0, exactly. */
export function chainZeroAt(store: ExpressionStore, chain: RadicalChain, z: ExactValue): boolean {
  const ctx = store.ctx;
  const sign = (g: Polynomial<Rational>) => (z.kind === 'rational' ? rSign(QX.evaluate(ctx, g, z.value)) : z.root.kind === 'real' ? signAtReal(ctx, g, z.root) : Number.NaN);
  return sign(chain.F) === 0 && chain.conditions.every(g => sign(g) >= 0);
}

/** Real zeros of a radical chain (undefined when f is not one: the tower elimination takes it then). */
export function radicalChainZeros(store: ExpressionStore, f: ExprId, x: string): ExprId[] | undefined {
  const chain = radicalChain(store, f, x);
  if (!chain) return undefined;
  return zerosOf(store, { kind: 'rational', poly: chain.F }, 'real').filter(z => chainZeroAt(store, chain, z)).map(z => valueExpression(store, z));
}

const rSign = (q: Rational) => (q.numerator === 0n ? 0 : q.numerator < 0n ? -1 : 1);

const constantPoly = (m: MPoly) => [...m.terms.keys()].every(k => k.split(',').every(e => e === '0'));

function scaleBy(m: MPoly, c: Rational, ctx: ExpressionStore['ctx']): MPoly {
  return { vars: m.vars, terms: new Map([...m.terms].map(([k, v]) => [k, rMultiply(ctx, v, c)])) };
}

/** e with the node r replaced by the symbol `name`. */
function replace(store: ExpressionStore, e: ExprId, r: ExprId, name: string): ExprId {
  const done = new Map<ExprId, ExprId>();
  for (const n of store.postorder([e])) {
    const node = store.node(n), get = (c: ExprId) => done.get(c) as ExprId;
    let out: ExprId;
    if (n === r) out = store.symbol(name);
    else if (node.kind === 'add') out = store.add(...node.args.map(get));
    else if (node.kind === 'mul') out = store.mul(...node.args.map(get));
    else if (node.kind === 'pow') out = store.pow(get(node.base), get(node.exponent));
    else if (node.kind === 'apply') out = store.apply(node.fn, get(node.arg));
    else out = n;
    done.set(n, out);
  }
  return done.get(e) as ExprId;
}
