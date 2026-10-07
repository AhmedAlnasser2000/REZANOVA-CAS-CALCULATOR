import { rational, rDivide, type Rational } from '../algebra/rational';
import { enclose } from '../representation/enclosure';
import { ISOLATED_VARIABLE, type ExprId, type ExpressionStore } from '../representation/expression';
import { replaceSubexpressions } from '../generators/lattice';

/**
 * Exact zero tests for values built from one certified isolated zero z (EQUATION-CERTIFIED-NUMERICS1), as a
 * system's coordinates are after exact elimination: x = 2 − e^z, y = z with z the root of y − sin(2 − eʸ).
 * Substituting such a point into an equation gives h(z); refinement can never prove h(z) = 0, so the zero is
 * proven by identity in z's own variable ξ instead: h(ξ) ≡ 0, or h(ξ) ≡ c·f(ξ) for a nonzero number c, where f is
 * z's defining expression (f(z) = 0 by z's certificate). Identities are checked on a form with numeric multiples
 * distributed over sums, so c·(a + b) and c·a + c·b intern alike.
 */

/** The expression rebuilt with numeric multiples distributed over sums (post-order over the shared graph). */
export function distribute(store: ExpressionStore, id: ExprId): ExprId {
  const out = new Map<ExprId, ExprId>();
  for (const n of store.postorder([id])) {
    store.ctx.tick();
    const node = store.node(n), m = (c: ExprId) => out.get(c) as ExprId;
    let r: ExprId;
    switch (node.kind) {
      case 'add': r = store.add(...node.args.map(m)); break;
      case 'mul': {
        r = store.mul(...node.args.map(m));
        const p = store.node(r);
        if (p.kind === 'mul' && p.args.length === 2 && store.numberValue(p.args[0])) {
          const sum = store.node(p.args[1]);
          if (sum.kind === 'add') r = store.add(...sum.args.map(a => store.mul(p.args[0], a)));
        }
        break;
      }
      case 'pow': r = store.pow(m(node.base), m(node.exponent)); break;
      case 'apply': r = store.apply(node.fn, m(node.arg)); break;
      default: r = n;
    }
    out.set(n, r);
  }
  return out.get(id) as ExprId;
}

/** The isolated zeros inside an expression. */
export function isolatedLeaves(store: ExpressionStore, id: ExprId): ExprId[] {
  return store.postorder([id]).filter(n => store.node(n).kind === 'isolated');
}

/** A sum's terms as (coefficient, rest) pairs. */
function terms(store: ExpressionStore, id: ExprId): { c: Rational; rest: ExprId }[] {
  const node = store.node(id), list = node.kind === 'add' ? node.args : [id];
  return list.filter(t => !store.numberValue(t)).map(t => {
    const n = store.node(t), c = n.kind === 'mul' ? store.numberValue(n.args[0]) : undefined;
    return c && n.kind === 'mul' ? { c, rest: store.mul(...n.args.slice(1)) } : { c: rational(store.ctx, 1n), rest: t };
  });
}

/** Whether a value containing exactly one isolated zero is exactly 0 by identity; undefined when no identity holds. */
export function vanishesByIdentity(store: ExpressionStore, id: ExprId): true | undefined {
  const leaves = isolatedLeaves(store, id);
  if (leaves.length !== 1) return undefined;
  const z = leaves[0], node = store.node(z) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated' }>;
  const h = distribute(store, replaceSubexpressions(store, id, new Map([[z, store.symbol(ISOLATED_VARIABLE)]])));
  if (store.numberValue(h)?.numerator === 0n) return true;
  const f = distribute(store, node.expr), hs = terms(store, h);
  for (const t of terms(store, f)) {
    const match = hs.find(u => u.rest === t.rest);
    if (!match) continue;
    const c = store.number(rDivide(store.ctx, match.c, t.c));
    return store.numberValue(distribute(store, store.sub(h, store.mul(c, f))))?.numerator === 0n ? true : undefined;
  }
  return undefined;
}

/** Whether a certified enclosure (at 64, then 256 bits) proves the value nonzero. */
export function quickNonzero(store: ExpressionStore, id: ExprId): boolean {
  for (const bits of [64, 256]) {
    const b = enclose(store, id, bits);
    if (b.kind === 'bounds' && (b.lo.numerator > 0n || b.hi.numerator < 0n)) return true;
  }
  return false;
}
