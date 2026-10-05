import { rational, rSubtract } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';

/**
 * The derivative d/dx of an expression over the core's vocabulary (explicit
 * stack, so depth costs only budget). It is used only where the expression is
 * defined and differentiable: the range engine cuts the line at domain
 * breakpoints and at the zeros of absolute-value and radical arguments first.
 *
 * Rules: sums, products (Leibniz), uⁿ and u^{p/q} (power rule), exp, log,
 * |u| = sgn(u)·u′ written as u·u′/|u|, sin, cos, tan, asin, acos, atan, and
 * W(u)′ = e^{−W}·u′/(1 + W) on both branches. A power with the variable in its
 * exponent is never present here (the real normal form rewrites it to exp).
 * Returns undefined for a construct outside the vocabulary.
 */
export function derivative(store: ExpressionStore, f: ExprId, x: string): ExprId | undefined {
  const d = new Map<ExprId, ExprId | undefined>(), zero = store.integer(0), one = store.integer(1);
  const depends = (id: ExprId) => store.freeSymbols(id).includes(x);
  for (const n of store.postorder([f])) {
    store.ctx.tick();
    if (!depends(n)) { d.set(n, zero); continue; }
    const node = store.node(n), get = (c: ExprId) => d.get(c);
    let out: ExprId | undefined;
    switch (node.kind) {
      case 'symbol': out = node.name === x ? one : zero; break;
      case 'add': {
        const parts = node.args.map(get);
        out = parts.every(p => p !== undefined) ? store.add(...(parts as ExprId[])) : undefined;
        break;
      }
      case 'mul': {
        const parts = node.args.map(get);
        if (parts.some(p => p === undefined)) break;
        out = store.add(...node.args.map((_, i) => store.mul(parts[i] as ExprId, ...node.args.filter((__, j) => j !== i))));
        break;
      }
      case 'pow': {
        const e = store.numberValue(node.exponent), du = get(node.base);
        if (!e || depends(node.exponent) || du === undefined) break;
        out = store.mul(node.exponent, store.pow(node.base, store.number(rSubtract(store.ctx, e, rational(store.ctx, 1n)))), du);
        break;
      }
      case 'apply': {
        const u = node.arg, du = get(u);
        if (du === undefined) break;
        const minusHalf = store.fraction(-1, 2);
        switch (node.fn) {
          case 'exp': out = store.mul(n, du); break;
          case 'log': out = store.div(du, u); break;
          case 'abs': out = store.div(store.mul(u, du), n); break;
          case 'sin': out = store.mul(store.cos(u), du); break;
          case 'cos': out = store.neg(store.mul(store.sin(u), du)); break;
          case 'tan': out = store.mul(store.add(one, store.pow(n, store.integer(2))), du); break;
          case 'asin': out = store.mul(du, store.pow(store.sub(one, store.pow(u, store.integer(2))), minusHalf)); break;
          case 'acos': out = store.neg(store.mul(du, store.pow(store.sub(one, store.pow(u, store.integer(2))), minusHalf))); break;
          case 'atan': out = store.div(du, store.add(one, store.pow(u, store.integer(2)))); break;
          case 'lambertw': case 'lambertwm1': out = store.div(store.mul(store.exp(store.neg(n)), du), store.add(one, n)); break;
          default: out = undefined;
        }
        break;
      }
      default: out = undefined;
    }
    d.set(n, out);
  }
  return d.get(f);
}
