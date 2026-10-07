import { rational, rDivide, type Rational } from '../algebra/rational';
import { enclose } from '../representation/enclosure';
import { ISOLATED_VARIABLE, pointVariable, type ExprId, type ExpressionStore } from '../representation/expression';
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

/** The isolated zeros and isolated-point coordinates inside an expression. */
export function isolatedLeaves(store: ExpressionStore, id: ExprId): ExprId[] {
  return store.postorder([id]).filter(n => { const k = store.node(n).kind; return k === 'isolated' || k === 'isolated-point'; });
}

/** A sum's terms as (coefficient, rest) pairs. */
function terms(store: ExpressionStore, id: ExprId): { c: Rational; rest: ExprId }[] {
  const node = store.node(id), list = node.kind === 'add' ? node.args : [id];
  return list.filter(t => !store.numberValue(t)).map(t => {
    const n = store.node(t), c = n.kind === 'mul' ? store.numberValue(n.args[0]) : undefined;
    return c && n.kind === 'mul' ? { c, rest: store.mul(...n.args.slice(1)) } : { c: rational(store.ctx, 1n), rest: t };
  });
}

/** Whether h ≡ c·f for some nonzero number c (both already distributed). */
function multipleOf(store: ExpressionStore, h: ExprId, f: ExprId): boolean {
  const hs = terms(store, h);
  for (const t of terms(store, f)) {
    const match = hs.find(u => u.rest === t.rest);
    if (!match) continue;
    const c = store.number(rDivide(store.ctx, match.c, t.c));
    return store.numberValue(distribute(store, store.sub(h, store.mul(c, f))))?.numerator === 0n;
  }
  return false;
}

/**
 * Whether a value built from one isolated zero, or from the coordinates of one isolated point, is exactly 0 by
 * identity: with the leaves replaced by their bound variables, it is identically 0 or a nonzero numeric multiple
 * of the zero's expression (of one of the point's equations). Undefined when no identity holds.
 */
export function vanishesByIdentity(store: ExpressionStore, id: ExprId): true | undefined {
  const leaves = isolatedLeaves(store, id);
  if (leaves.length === 0) return undefined;
  const first = store.node(leaves[0]);
  let replaced: ExprId, defining: readonly ExprId[];
  if (first.kind === 'isolated') {
    if (leaves.length !== 1) return undefined;
    replaced = replaceSubexpressions(store, id, new Map([[leaves[0], store.symbol(ISOLATED_VARIABLE)]]));
    defining = [first.expr];
  } else if (first.kind === 'isolated-point') {
    // Every leaf a coordinate of the same point (same system and box).
    const key = (m: Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated-point' }>) => `${m.system.join(',')}|${m.box.map(b => `${b.lo.numerator}/${b.lo.denominator}:${b.hi.numerator}/${b.hi.denominator}`).join(',')}`;
    const same = (n: ExprId) => { const m = store.node(n); return m.kind === 'isolated-point' && key(m) === key(first); };
    if (!leaves.every(same)) return undefined;
    replaced = replaceSubexpressions(store, id, new Map(leaves.map(n => [n, store.symbol(pointVariable((store.node(n) as { index: number }).index))] as const)));
    defining = first.system;
  } else return undefined;
  const h = distribute(store, replaced);
  if (store.numberValue(h)?.numerator === 0n) return true;
  return defining.some(f => multipleOf(store, h, distribute(store, f))) ? true : undefined;
}

/** The sign of a value proven by a certified enclosure (at 64, then 256 bits); undefined when neither excludes 0. */
export function quickSign(store: ExpressionStore, id: ExprId): -1 | 1 | undefined {
  for (const bits of [64, 256]) {
    const b = enclose(store, id, bits);
    if (b.kind === 'bounds' && b.lo.numerator > 0n) return 1;
    if (b.kind === 'bounds' && b.hi.numerator < 0n) return -1;
  }
  return undefined;
}
