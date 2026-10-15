import { rational, rDivide, rNegate } from '../algebra/rational';
import type { RelationProblem } from '../representation/relation';
import { finiteSet, normalizeSet } from '../representation/solution-set';
import type { CellsResult, ParamCase } from './cells';
import { add, coefficientsIn, constant, constantValue, degreeIn, isZero, multiply, scale, toExpression, variable, type MPoly } from './mpoly';
import type { ParamAtom } from './specialize';
import { holds, NEGATION } from './tree';

/**
 * Exclusion splitting: one equation E(x) = 0 of degree ≤ 2 in the target with several parameters, together with
 * exclusions αx + β ≠ 0 (α a nonzero rational, β a polynomial in the parameters; denominators of the input), is
 * decided completely (user decision, 2026-10-15: the full case list). For an exclusion x ≠ r (r = −β/α):
 * - E(r) ≠ 0: r is not a root, the exclusion is dropped;
 * - E(r) = 0: E = (x − r)·E′ exactly (synthetic division), and the roots other than r are those of E′, which
 *   keeps the exclusion (E′ may vanish at r too).
 * Each step lowers the number of exclusions or the degree, so the recursion ends; the leaves are decided by the
 * sign-condition tree, or (E′ constant) are "every x but the excluded values" when it vanishes, else ∅.
 * Undefined when the atoms are not of this shape.
 */
export function exclusionsApply(atoms: readonly ParamAtom[]): boolean {
  const inX = atoms.filter(a => degreeIn(a.poly, 0) > 0), eqs = inX.filter(a => a.op === 'eq'), rest = inX.filter(a => a.op !== 'eq');
  return eqs.length === 1 && rest.length >= 1 && degreeIn(eqs[0].poly, 0) <= 2 && rest.every(a => a.op === 'ne' && linear(a.poly) !== undefined);
}

/** α and β of αx + β with α a nonzero rational and β free of x. */
function linear(p: MPoly): { alpha: MPoly; beta: MPoly } | undefined {
  const c = coefficientsIn(p, 0);
  if (c.length !== 2 || isZero(c[1]) || degreeIn(c[1], 0) > 0 || ![...c[1].terms.keys()].every(k => k.split(',').every(e => e === '0'))) return undefined;
  return { alpha: c[1], beta: c[0] };
}

export function decideExclusions(problem: RelationProblem, atoms: readonly ParamAtom[], tree: (p: RelationProblem, a: readonly ParamAtom[]) => CellsResult): CellsResult | undefined {
  if (!exclusionsApply(atoms)) return undefined;
  const store = problem.store, ctx = store.ctx, x = problem.targets[0];
  const inX = atoms.filter(a => degreeIn(a.poly, 0) > 0), free = atoms.filter(a => degreeIn(a.poly, 0) <= 0);
  const E0 = (inX.find(a => a.op === 'eq') as ParamAtom).poly, vars = E0.vars;
  const X = variable(ctx, vars, x);
  // r = −β/α for each exclusion, as a polynomial in the parameters.
  const roots = inX.filter(a => a.op === 'ne').map(a => {
    const { alpha, beta } = linear(a.poly) as { alpha: MPoly; beta: MPoly };
    return scale(ctx, beta, rNegate(ctx, rDivide(ctx, rational(ctx, 1n), constantValue(ctx, alpha))));
  });
  const at = (c: readonly MPoly[], r: MPoly) => c.reduceRight((acc, ci) => add(ctx, multiply(ctx, acc, r), ci), constant(vars, rational(ctx, 0n)));
  const out: ParamCase[] = [];
  let refused: string | undefined;
  const split = (E: MPoly, rs: readonly MPoly[], conditions: readonly ParamAtom[]): void => {
    ctx.tick();
    const c = coefficientsIn(E, 0);
    while (c.length && isZero(c[c.length - 1])) c.pop();
    if (c.length <= 1) {
      // E is free of x: it vanishes (every x except the excluded values) or not (∅).
      const q = c[0] ?? constant(vars, rational(ctx, 0n));
      // The input's own parameter conditions as the tree takes them: each holds, or the answer is ∅ there.
      const branch = conditions.map(a => holds(store, a.poly, a.op));
      free.forEach((a, i) => out.push({ conditions: [...branch, ...free.slice(0, i).map(b => holds(store, b.poly, b.op)), holds(store, a.poly, NEGATION[a.op])], set: finiteSet([x], []) }));
      const base = [...branch, ...free.map(a => holds(store, a.poly, a.op))];
      out.push({ conditions: [...base, holds(store, q, 'eq')], set: normalizeSet(store, { kind: 'cofinite', variables: [x], except: rs.map(r => [{ kind: 'expression', id: toExpression(store, r) }]) }, problem.domain) });
      if (!isZero(q)) out.push({ conditions: [...base, holds(store, q, 'ne')], set: finiteSet([x], []) });
      return;
    }
    if (rs.length === 0) {
      // The branch conditions prefix the tree's own cases (as atoms the tree would also emit their negation as ∅).
      const leaf = tree(problem, [{ poly: E, op: 'eq' }, ...free]), base = conditions.map(a => holds(store, a.poly, a.op));
      if (leaf.kind === 'refused') refused ??= leaf.reason; else out.push(...leaf.cases.map(k => ({ conditions: [...base, ...k.conditions], set: k.set })));
      return;
    }
    const [r, ...others] = rs, value = at(c, r);
    // E(r) ≠ 0: the exclusion holds for every root.
    if (!isZero(value)) split(E, others, [...conditions, { poly: value, op: 'ne' }]);
    // E(r) = 0: E = (x − r)·E′ with E′ by synthetic division.
    const q: MPoly[] = Array.from({ length: c.length - 1 }, () => constant(vars, rational(ctx, 0n)));
    q[c.length - 2] = c[c.length - 1];
    for (let k = c.length - 2; k >= 1; k--) q[k - 1] = add(ctx, c[k], multiply(ctx, r, q[k]));
    const quotient = q.reduceRight((acc, qi) => add(ctx, multiply(ctx, acc, X), qi), constant(vars, rational(ctx, 0n)));
    split(quotient, rs, isZero(value) ? conditions : [...conditions, { poly: value, op: 'eq' }]);
  };
  split(E0, roots, []);
  return refused !== undefined ? { kind: 'refused', reason: refused } : { kind: 'cases', cases: out };
}
