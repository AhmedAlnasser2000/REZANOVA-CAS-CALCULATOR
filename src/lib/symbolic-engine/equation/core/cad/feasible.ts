import type { ExpressionStore } from '../representation/expression';
import type { Condition } from '../representation/relation';
import { fractionOf, multiply } from '../parameters/mpoly';
import { decompose, type CadAtom, type CadCell, type Op } from './decompose';
import { fromMPoly } from './recursive';

/**
 * Whether polynomial conditions on several parameters can hold together over ℝ (EQUATION-SEMIALGEBRAIC1 PR B), by a
 * partial cylindrical decomposition: true exactly when some cell satisfies them all. This decides the assumption
 * pruning that sign reasoning alone cannot (conditions coupling several parameters). Undefined when a condition is
 * not a rational function of the parameters.
 */
const OP: Readonly<Record<Condition['kind'], Op | undefined>> = { positive: 'gt', nonnegative: 'ge', nonzero: 'ne', 'not-equal': 'ne', equal: 'eq', 'in-domain': undefined };

function anyTrue(c: CadCell): boolean { return c.truth === true || (c.children ?? []).some(anyTrue); }

export function conditionsSatisfiable(store: ExpressionStore, conditions: readonly Condition[]): boolean | undefined {
  const ctx = store.ctx, exprs = conditions.map(c => ('other' in c ? store.sub(c.expr, c.other) : c.expr));
  const names = store.freeSymbols(...exprs).sort(), n = names.length, levels = names.map((_, i) => i + 1);
  if (n === 0) return undefined;
  const atoms: CadAtom[] = [];
  for (let i = 0; i < conditions.length; i++) {
    const op = OP[conditions[i].kind], f = fractionOf(store, exprs[i], names);
    if (!op || !f) return undefined;
    atoms.push({ poly: fromMPoly(ctx, op === 'eq' || op === 'ne' ? f.num : multiply(ctx, f.num, f.den), levels, n), op });
    // A condition holds only where it is defined: its denominator is not zero.
    atoms.push({ poly: fromMPoly(ctx, f.den, levels, n), op: 'ne' });
  }
  const formula = { kind: 'and' as const, args: atoms.map((_, atom) => ({ kind: 'atom' as const, atom })) };
  const constraints = atoms.flatMap((a, i) => (a.op === 'eq' ? [i] : []));
  return anyTrue(decompose(store, { n, atoms, formula, constraints }).root);
}
