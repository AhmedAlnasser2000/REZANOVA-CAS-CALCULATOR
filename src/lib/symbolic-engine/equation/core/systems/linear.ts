import { rational } from '../algebra/rational';
import type { ExprId } from '../representation/expression';
import type { Condition, RelationProblem } from '../representation/relation';
import { finiteSet, type SolutionSet } from '../representation/solution-set';
import type { ParamCase } from '../parameters/cells';
import { constant, fractionOf, isZero, multiply, subtract, toExpression, type MPoly } from '../parameters/mpoly';
import type { ParamAtom } from '../parameters/specialize';
import { constantSign, holds } from '../parameters/tree';

/**
 * Linear systems in the targets, with coefficients in ℚ or ℚ[p…].
 *
 * Gauss–Jordan elimination without division: a pivot row r on column c turns
 * every other row j into p·row_j − a_jc·row_r. A pivot candidate that is a
 * non-constant polynomial in the parameters splits the case (design rule 8):
 * pivot ≠ 0 continues with it, pivot = 0 sets it to zero and tries the next
 * row. After the last column, rows without a pivot carry consistency
 * conditions (their right-hand side must vanish). Each leaf is a point (every
 * column a pivot) or a parametric set in the free targets (x_c from its pivot
 * row), and ≠ atoms are checked on it: identically zero gives ∅, a condition
 * on the parameters splits, one involving free targets becomes a constraint.
 * Without parameters every pivot is a nonzero rational and nothing splits.
 */
export function isLinear(atom: ParamAtom, targets: number): boolean {
  for (const k of atom.poly.terms.keys()) {
    const e = k.split(',').map(Number);
    if (e.slice(0, targets).reduce((s, v) => s + v, 0) > 1) return false;
  }
  return true;
}

/** Coefficient of the target at position i (degree 1) and the constant part of a linear atom. */
function rowOf(atom: MPoly, n: number): MPoly[] {
  const coefficient = (i: number | undefined): MPoly => {
    const terms = new Map<string, (typeof atom.terms extends ReadonlyMap<string, infer R> ? R : never)>();
    for (const [k, v] of atom.terms) {
      const e = k.split(',').map(Number);
      const hit = i === undefined ? e.slice(0, n).every(x => x === 0) : e[i] === 1;
      if (!hit) continue;
      if (i !== undefined) e[i] = 0;
      terms.set(e.join(','), v);
    }
    return { vars: atom.vars, terms };
  };
  return [...Array.from({ length: n }, (_, i) => coefficient(i)), coefficient(undefined)];
}

export function decideLinear(problem: RelationProblem, vars: readonly string[], atoms: readonly ParamAtom[]): ParamCase[] {
  const store = problem.store, ctx = store.ctx, targets = problem.targets, n = targets.length;
  const equations = atoms.filter(a => a.op === 'eq').map(a => rowOf(a.poly, n));
  const nonzero = atoms.filter(a => a.op === 'ne').map(a => a.poly);
  const zero = (g: MPoly) => isZero(g);
  const none = finiteSet(targets, []);
  const cases: ParamCase[] = [];
  const emit = (conditions: readonly Condition[], set: SolutionSet) => { cases.push({ conditions, set }); };

  const leaf = (rows: MPoly[][], pivots: readonly number[], conds: readonly Condition[]) => {
    const free = targets.map((_, i) => i).filter(i => !pivots.includes(i));
    const values: ExprId[] = targets.map(t => store.symbol(t));
    pivots.forEach((c, r) => {
      const row = rows[r];
      const rest = free.map(f => store.mul(toExpression(store, row[f]), store.symbol(targets[f])));
      values[c] = store.div(store.sub(toExpression(store, row[n]), store.add(store.integer(0), ...rest)), toExpression(store, row[c]));
    });
    const sub = new Map(targets.map((t, i) => [t, values[i]] as const));
    const freeNames = free.map(f => targets[f]);
    // ≠ atoms on the solution: identically zero → ∅; in the parameters → a split; in free targets → a constraint.
    const check = (i: number, conds: readonly Condition[], constraints: readonly Condition[]): void => {
      if (i === nonzero.length) {
        if (free.length === 0) return emit(conds, finiteSet(targets, [values.map(id => ({ kind: 'expression' as const, id }))]));
        return emit(conds, { kind: 'parametric', variables: targets, values, freeParameters: freeNames, constraints });
      }
      const e = store.substitute(toExpression(store, nonzero[i]), sub);
      const f = fractionOf(store, e, [...freeNames, ...problem.parameters]);
      if (!f) return check(i + 1, conds, [...constraints, { kind: 'nonzero', expr: e }]);
      if (zero(f.num)) return emit(conds, none);
      const k = constantSign(f.num);
      if (k !== undefined) return check(i + 1, conds, constraints);
      const freeIn = freeNames.some((_, j) => [...f.num.terms.keys()].some(key => key.split(',')[j] !== '0'));
      if (freeIn) return check(i + 1, conds, [...constraints, { kind: 'nonzero', expr: toExpression(store, f.num) }]);
      check(i + 1, [...conds, holds(store, f.num, 'ne')], constraints);
      emit([...conds, holds(store, f.num, 'eq')], none);
    };
    check(0, conds, []);
  };

  const finish = (rows: MPoly[][], pivots: readonly number[], conds: readonly Condition[], j: number): void => {
    // Rows from `pivots.length` on have only zero coefficients: their right-hand sides must vanish.
    if (j === rows.length) return leaf(rows, pivots, conds);
    const g = rows[j][n], k = constantSign(g);
    if (k !== undefined) return k === 0 ? finish(rows, pivots, conds, j + 1) : emit(conds, none);
    finish(rows, pivots, [...conds, holds(store, g, 'eq')], j + 1);
    emit([...conds, holds(store, g, 'ne')], none);
  };

  const eliminate = (rows: MPoly[][], pivots: readonly number[], conds: readonly Condition[], col: number): void => {
    ctx.tick();
    if (col === n) return finish(rows, pivots, conds, pivots.length);
    const r = pivots.length;
    const tryRows = (rows: MPoly[][], conds: readonly Condition[], from: number): void => {
      // A nonzero rational pivot needs no case; otherwise the first nonzero candidate splits.
      let i = rows.findIndex((row, j) => j >= from && constantSign(row[col]) !== undefined && !zero(row[col]));
      if (i < 0) { i = from; while (i < rows.length && zero(rows[i][col])) i++; }
      if (i === rows.length) return eliminate(rows, pivots, conds, col + 1);
      const e = rows[i][col], k = constantSign(e);
      const pivotOn = (conds: readonly Condition[]) => {
        const next = rows.map(row => [...row]);
        [next[r], next[i]] = [next[i], next[r]];
        const p = next[r][col];
        for (let j = 0; j < next.length; j++) {
          if (j === r || zero(next[j][col])) continue;
          const a = next[j][col];
          next[j] = next[j].map((v, c) => subtract(ctx, multiply(ctx, v, p), multiply(ctx, a, next[r][c])));
        }
        eliminate(next, [...pivots, col], conds, col + 1);
      };
      if (k !== undefined) return pivotOn(conds);
      pivotOn([...conds, holds(store, e, 'ne')]);
      const zeroed = rows.map((row, j) => (j === i ? row.map((v, c) => (c === col ? constant(v.vars, rational(ctx, 0n)) : v)) : row));
      tryRows(zeroed, [...conds, holds(store, e, 'eq')], i + 1);
    };
    tryRows(rows, conds, r);
  };

  eliminate(equations.map(row => [...row.slice(0, n), subtract(ctx, constant(vars, rational(ctx, 0n)), row[n])]), [], [], 0);
  return cases;
}
