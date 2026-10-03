import { rationalForm } from '../decision/rational-form';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';

/**
 * Injective cancellation (`EQUATION-COMPOSITION1`): a goal a·f(U) + b·f(V) = 0
 * with constants a, b and the same outer function f becomes a goal on U and V
 * alone, an equivalence on the natural domain (whose conditions the problem
 * already records):
 * - f(U) = f(V) for f injective on its domain — atan, log, asin, acos, W₀,
 *   W₋₁, and powers u^{p/q} with odd p and odd q, or with even q — gives U = V;
 * - u^{p/q} with even p and odd q gives |U| = |V|: U = V or U = −V;
 * - a·e^U + b·e^V = 0 gives U − V = ln(−b/a) when −b/a > 0, and no zero otherwise.
 * Chains cancel one level per goal, so any depth is handled by the worklist.
 * Returns the replacement goals (each "= 0"), or undefined when the shape does not apply.
 */
const INJECTIVE = new Set(['atan', 'log', 'asin', 'acos', 'lambertw', 'lambertwm1']);

interface Term { readonly constant: ExprId; readonly core: ExprId }

function split(store: ExpressionStore, t: ExprId, x: string): Term | undefined {
  const node = store.node(t), factors = node.kind === 'mul' ? node.args : [t];
  const dependent = factors.filter(f => store.freeSymbols(f).includes(x));
  if (dependent.length !== 1) return undefined;
  return { constant: store.mul(...factors.filter(f => !store.freeSymbols(f).includes(x))), core: dependent[0] };
}

export function cancelInjective(store: ExpressionStore, h: ExprId, x: string): ExprId[] | undefined {
  // A nonzero constant factor does not change the zeros: c·(a·f(U) + b·f(V)).
  const outer = store.node(h);
  if (outer.kind === 'mul') {
    const dependent = outer.args.filter(f => store.freeSymbols(f).includes(x));
    const constant = store.mul(...outer.args.filter(f => !store.freeSymbols(f).includes(x)));
    if (dependent.length === 1 && store.numberValue(constant)?.numerator !== 0n && store.numberValue(constant) !== undefined) return cancelInjective(store, dependent[0], x);
    return undefined;
  }
  const node = store.node(h);
  if (node.kind !== 'add' || node.args.length !== 2) return undefined;
  const a = split(store, node.args[0], x), b = split(store, node.args[1], x);
  if (!a || !b) return undefined;
  const A = store.node(a.core), B = store.node(b.core);
  const opposite = () => store.numberValue(store.add(a.constant, b.constant))?.numerator === 0n;
  if (A.kind === 'apply' && B.kind === 'apply' && A.fn === B.fn) {
    if (A.fn === 'exp') {
      const ratio = store.neg(store.div(b.constant, a.constant));
      if (realSign(store, ratio) <= 0) return [];
      return [store.sub(store.sub(A.arg, B.arg), store.log(ratio))];
    }
    if (INJECTIVE.has(A.fn) && opposite()) return [store.sub(A.arg, B.arg)];
    return undefined;
  }
  if (A.kind === 'pow' && B.kind === 'pow' && A.exponent === B.exponent && opposite()) {
    const r = store.numberValue(A.exponent);
    if (!r) return undefined;
    // Polynomial bases with an integer exponent stay with the polynomial algebra.
    const polynomial = (u: ExprId) => { const f = rationalForm(store, u, x); return f.ok; };
    if (r.denominator === 1n && polynomial(A.base) && polynomial(B.base)) return undefined;
    const evenP = r.numerator % 2n === 0n, evenQ = r.denominator % 2n === 0n;
    if (evenQ || !evenP) return [store.sub(A.base, B.base)];
    return [store.sub(A.base, B.base), store.add(A.base, B.base)];
  }
  return undefined;
}
