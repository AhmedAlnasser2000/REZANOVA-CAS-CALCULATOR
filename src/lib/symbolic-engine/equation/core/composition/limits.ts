import type { ExprId, ExpressionStore } from '../representation/expression';
import { expandConstant } from '../representation/angles';
import { realSign } from '../representation/real-order';

/**
 * Exact limits of a real expression in x at ±∞, or its value at a finite
 * point (by substitution), as a closed form or ±∞; undefined when not decided
 * here (∞ − ∞, 0·∞, oscillation). Vanishing parts take their sign from a
 * sample inside the piece where they are continuous and nonzero (domain
 * conditions guarantee it).
 */
export type Lim = { readonly inf: 1 | -1 } | { readonly v: ExprId };

export /** φ(x) at a finite end (by substitution) or its limit at ±∞, exactly; `sample` fixes signs of vanishing parts on J. */
function limit(store: ExpressionStore, phi: ExprId, x: string, end: { inf: 1 | -1 } | { at: ExprId }, sample: ExprId): Lim | undefined {
  const at = new Map<ExprId, Lim | undefined>(), zero = store.integer(0);
  const sign = (id: ExprId) => realSign(store, store.substitute(id, new Map([[x, sample]])));
  for (const n of store.postorder([phi])) {
    store.ctx.tick();
    if (!store.freeSymbols(n).includes(x)) { at.set(n, { v: n }); continue; }
    const node = store.node(n), get = (c: ExprId) => at.get(c);
    let out: Lim | undefined;
    switch (node.kind) {
      case 'symbol': out = 'inf' in end ? { inf: end.inf } : { v: end.at }; break;
      case 'add': {
        const parts = node.args.map(get);
        if (parts.some(p => p === undefined)) break;
        const infs = (parts as Lim[]).filter(p => 'inf' in p) as { inf: 1 | -1 }[];
        if (infs.length) { out = infs.every(p => p.inf === infs[0].inf) ? infs[0] : undefined; break; }
        out = { v: expandConstant(store, store.add(...(parts as { v: ExprId }[]).map(p => p.v))) };
        break;
      }
      case 'mul': {
        const parts = node.args.map(get);
        if (parts.some(p => p === undefined)) break;
        const list = parts as Lim[];
        if (list.some(p => 'inf' in p)) {
          let s = 1;
          for (const p of list) {
            if ('inf' in p) { s *= p.inf; continue; }
            const sv = realSign(store, p.v);
            if (sv === 0) { s = 0; break; }
            s *= sv;
          }
          out = s === 0 ? undefined : { inf: s as 1 | -1 };
          break;
        }
        out = { v: expandConstant(store, store.mul(...(list as { v: ExprId }[]).map(p => p.v))) };
        break;
      }
      case 'pow': {
        const b = get(node.base), r = store.numberValue(node.exponent);
        if (b === undefined || !r) break;
        if ('inf' in b) {
          if (r.numerator < 0n) out = { v: zero };
          else if (b.inf > 0) out = { inf: 1 };
          else out = r.denominator === 1n ? { inf: (r.numerator % 2n === 0n ? 1 : -1) } : undefined;
          break;
        }
        const s = realSign(store, b.v);
        if (s !== 0) { out = { v: store.pow(b.v, node.exponent) }; break; }
        out = r.numerator > 0n ? { v: zero } : { inf: (r.numerator % 2n === 0n ? 1 : sign(node.base)) as 1 | -1 };
        break;
      }
      case 'apply': {
        const a = get(node.arg);
        if (a === undefined) break;
        if (node.fn === 'exp') out = 'inf' in a ? (a.inf > 0 ? a : { v: zero }) : { v: store.exp(a.v) };
        else if (node.fn === 'log') out = 'inf' in a ? (a.inf > 0 ? a : undefined) : realSign(store, a.v) > 0 ? { v: store.log(a.v) } : realSign(store, a.v) === 0 ? { inf: -1 } : undefined;
        else if (node.fn === 'atan') out = 'inf' in a ? { v: store.mul(store.fraction(a.inf, 2), store.constant('pi')) } : { v: store.atan(a.v) };
        break;
      }
      default: break;
    }
    at.set(n, out);
  }
  return at.get(phi);
}
