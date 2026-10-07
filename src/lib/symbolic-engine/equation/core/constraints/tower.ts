import type { ExecutionContext } from '../execution';
import { imul, igcd, iquot } from '../algebra/integer';
import { rAdd, rational, rMultiply, rNegate, type Rational } from '../algebra/rational';
import { OWNERS, type Refusal } from '../decision/rational-form';
import { safeCount, type ExprId, type ExpressionStore } from '../representation/expression';
import { CERTIFIED_NUMERICS } from '../generators/lattice';
import { dependsOn } from '../generators/normal-form';

/**
 * Radical towers.
 *
 * An expression in x built from rational operations, real radicals and real
 * algebraic constants becomes a fraction N/D of polynomials over ℚ in x and
 * generators w₁, …, wₖ with a triangular monic tower
 *   wᵢ^{dᵢ} = Rᵢ(x, w₁, …, wᵢ),  deg_{wᵢ} Rᵢ < dᵢ.
 * A base B = a/b of radicals B^{p/q} (L = lcm of the q over that base) gets
 * w^L = a·b^{L−1} and B^{1/L} = w/b: w is a real L-th root of a·b^{L−1},
 * so the real branch is one assignment of the tower. An algebraic constant
 * gets its (monic) minimal polynomial. Every polynomial in the ideal of the
 * tower vanishes at the real branch, so N ≡ 0 modulo the tower means the
 * expression is zero wherever it is defined, and D ≡ 0 means it is defined
 * nowhere.
 */
export interface Term { readonly mono: readonly number[]; readonly c: Rational }
/** Sparse polynomial: variable 0 is x, variable i ≥ 1 is wᵢ. */
export type SPoly = ReadonlyMap<string, Term>;
export interface TowerLevel { readonly degree: number; readonly relation: SPoly }

function trim(m: readonly number[]): number[] {
  let n = m.length;
  while (n > 0 && m[n - 1] === 0) n--;
  return m.slice(0, n);
}
const keyOf = (m: readonly number[]) => trim(m).join(',');

function addTerm(ctx: ExecutionContext, out: Map<string, Term>, mono: readonly number[], c: Rational): void {
  ctx.tick();
  const k = keyOf(mono), t = out.get(k);
  const v = t ? rAdd(ctx, t.c, c) : c;
  if (v.numerator === 0n) out.delete(k);
  else out.set(k, { mono: t ? t.mono : trim(mono), c: v });
}

/** Exponent sum; a degree beyond safe integers is charged to the allocation budget (dense matrices follow). */
function monoAdd(ctx: ExecutionContext, a: readonly number[], b: readonly number[]): number[] {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => {
    const e = (a[i] ?? 0) + (b[i] ?? 0);
    return Number.isSafeInteger(e) ? e : safeCount(ctx, BigInt(a[i] ?? 0) + BigInt(b[i] ?? 0));
  });
}

export function constant(ctx: ExecutionContext, c: Rational): SPoly {
  const out = new Map<string, Term>();
  addTerm(ctx, out, [], c);
  return out;
}
export function monomial(ctx: ExecutionContext, mono: readonly number[]): SPoly {
  const out = new Map<string, Term>();
  addTerm(ctx, out, mono, rational(ctx, 1n));
  return out;
}
export function variable(ctx: ExecutionContext, index: number): SPoly {
  const m = Array<number>(index + 1).fill(0);
  m[index] = 1;
  return monomial(ctx, m);
}
export function add(ctx: ExecutionContext, a: SPoly, b: SPoly, sign: 1 | -1 = 1): SPoly {
  const out = new Map(a);
  for (const t of b.values()) addTerm(ctx, out, t.mono, sign < 0 ? rNegate(ctx, t.c) : t.c);
  return out;
}
export function multiply(ctx: ExecutionContext, a: SPoly, b: SPoly): SPoly {
  ctx.allocate(a.size * b.size + 1);
  const out = new Map<string, Term>();
  for (const s of a.values()) for (const t of b.values()) addTerm(ctx, out, monoAdd(ctx, s.mono, t.mono), rMultiply(ctx, s.c, t.c));
  return out;
}

/** Normal form modulo the tower: every wᵢ-degree below dᵢ (highest generator first; lower relations never mention higher generators). */
export function reduce(ctx: ExecutionContext, p: SPoly, tower: readonly TowerLevel[]): SPoly {
  let current = p;
  for (let i = tower.length - 1; i >= 0; i--) {
    const v = i + 1, { degree, relation } = tower[i];
    for (let changed = true; changed;) {
      changed = false;
      const next = new Map<string, Term>();
      for (const t of current.values()) {
        if ((t.mono[v] ?? 0) < degree) { addTerm(ctx, next, t.mono, t.c); continue; }
        changed = true;
        const m = [...t.mono];
        m[v] -= degree;
        ctx.allocate(relation.size);
        for (const r of relation.values()) addTerm(ctx, next, monoAdd(ctx, m, r.mono), rMultiply(ctx, t.c, r.c));
      }
      current = next;
    }
  }
  return current;
}

export function power(ctx: ExecutionContext, a: SPoly, n: bigint, tower: readonly TowerLevel[]): SPoly {
  let result = constant(ctx, rational(ctx, 1n)), base = a, e = n;
  while (e > 0n) {
    ctx.tick();
    if (e & 1n) result = reduce(ctx, multiply(ctx, result, base), tower);
    e >>= 1n;
    if (e > 0n) base = reduce(ctx, multiply(ctx, base, base), tower);
  }
  return result;
}

export type TowerForm =
  | { readonly kind: 'form'; readonly num: SPoly; readonly den: SPoly; readonly tower: readonly TowerLevel[] }
  | { readonly kind: 'undefined-everywhere' }
  | { readonly kind: 'refused'; readonly refusal: Refusal };

class Refused { readonly refusal: Refusal; constructor(refusal: Refusal) { this.refusal = refusal; } }
class Nowhere {}
const refuse = (owner: string, detail: string): never => { throw new Refused({ owner, detail }); };

interface Frac { readonly num: SPoly; readonly den: SPoly }

/** The tower form of f in x (radicals of any base, nested at any depth; algebraic constants). */
export function towerForm(store: ExpressionStore, f: ExprId, x: string): TowerForm {
  const ctx = store.ctx;
  const tower: TowerLevel[] = [];
  const one = () => constant(ctx, rational(ctx, 1n));
  const isZero = (p: SPoly) => p.size === 0;
  // L per radical base: one generator serves every radical of that base.
  const order = new Map<ExprId, bigint>();
  for (const n of store.postorder([f])) {
    const node = store.node(n);
    if (node.kind !== 'pow') continue;
    const e = store.numberValue(node.exponent);
    if (!e || e.denominator === 1n) continue;
    const L = order.get(node.base) ?? 1n;
    order.set(node.base, iquot(ctx, imul(ctx, L, e.denominator), igcd(ctx, L, e.denominator)));
  }
  const rootOf = new Map<ExprId, Frac>(); // base → B^{1/L} = w/b
  const forms = new Map<ExprId, Frac>();
  const normalize = (num: SPoly, den: SPoly): Frac => {
    const d = reduce(ctx, den, tower);
    if (isZero(d)) throw new Nowhere();
    return { num: reduce(ctx, num, tower), den: d };
  };
  try {
    for (const n of store.postorder([f])) {
      ctx.tick();
      const node = store.node(n), get = (c: ExprId) => forms.get(c) as Frac;
      switch (node.kind) {
        case 'number': forms.set(n, { num: constant(ctx, node.value), den: one() }); break;
        case 'symbol':
          if (node.name !== x) refuse(OWNERS.parameters, `symbol ${node.name} is a parameter`);
          forms.set(n, { num: variable(ctx, 0), den: one() });
          break;
        case 'constant': refuse(CERTIFIED_NUMERICS, `radical elimination with the transcendental constant ${node.name}`); break;
        case 'isolated': case 'isolated-point': refuse(CERTIFIED_NUMERICS, 'radical elimination with a numeric root'); break;
        case 'algebraic': {
          if (node.root.kind !== 'real') refuse(OWNERS.constraints, 'a non-real algebraic constant');
          const c = node.poly.coefficients, d = c.length - 1, index = tower.length + 1, lead = c[d];
          const relation = new Map<string, Term>();
          for (let i = 0; i < d; i++) {
            const m = Array<number>(index + 1).fill(0);
            m[index] = i;
            addTerm(ctx, relation, m, rational(ctx, -c[i], lead));
          }
          tower.push({ degree: d, relation });
          forms.set(n, { num: variable(ctx, index), den: one() });
          break;
        }
        case 'add': {
          let acc = get(node.args[0]);
          for (const a of node.args.slice(1)) {
            const b = get(a);
            acc = normalize(add(ctx, multiply(ctx, acc.num, b.den), multiply(ctx, b.num, acc.den)), multiply(ctx, acc.den, b.den));
          }
          forms.set(n, acc);
          break;
        }
        case 'mul': {
          let acc = get(node.args[0]);
          for (const a of node.args.slice(1)) { const b = get(a); acc = normalize(multiply(ctx, acc.num, b.num), multiply(ctx, acc.den, b.den)); }
          forms.set(n, acc);
          break;
        }
        case 'pow': {
          const e = store.numberValue(node.exponent);
          if (!e) refuse(dependsOn(store, node.exponent, x) ? OWNERS.generators : CERTIFIED_NUMERICS, 'a power with a non-rational exponent');
          const { numerator: p, denominator: q } = e as Rational;
          let base = get(node.base), k = p;
          if (q > 1n) {
            let r = rootOf.get(node.base);
            if (!r) {
              const L = order.get(node.base) as bigint, index = tower.length + 1;
              tower.push({ degree: safeCount(ctx, L), relation: reduce(ctx, multiply(ctx, base.num, power(ctx, base.den, L - 1n, tower)), tower) });
              r = { num: variable(ctx, index), den: base.den };
              rootOf.set(node.base, r);
            }
            base = r;
            k = p * ((order.get(node.base) as bigint) / q);
          }
          if (k < 0n) {
            if (isZero(base.num)) throw new Nowhere();
            base = { num: base.den, den: base.num };
            k = -k;
          }
          forms.set(n, normalize(power(ctx, base.num, k, tower), power(ctx, base.den, k, tower)));
          break;
        }
        case 'apply': refuse(CERTIFIED_NUMERICS, `radical elimination with ${node.fn}`); break;
      }
    }
    const result = forms.get(f) as Frac;
    return { kind: 'form', num: result.num, den: result.den, tower };
  } catch (e) {
    if (e instanceof Refused) return { kind: 'refused', refusal: e.refusal };
    if (e instanceof Nowhere) return { kind: 'undefined-everywhere' };
    throw e;
  }
}
