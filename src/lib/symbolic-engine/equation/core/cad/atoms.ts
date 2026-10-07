import { domainBases } from '../decision/rules';
import type { ExprId } from '../representation/expression';
import { formulaRoots, hasQuantifier } from '../representation/formula';
import type { Condition, Formula, Relation, RelationProblem } from '../representation/relation';
import { fractionOf, multiply } from '../parameters/mpoly';
import type { CadAtom, CadFormula, CadProblem, Op } from './decompose';
import { fromMPoly, key } from './recursive';

/**
 * A relation problem as a quantifier-free formula over ℚ[x₁ … xₙ] (EQUATION-SEMIALGEBRAIC1): `variables[j − 1]` is
 * xⱼ, so the first variable is the base of the decomposition. Each relation e op 0 with e = n/d becomes n op 0
 * (= and ≠) or n·d op 0 (orders), and every base b of a non-positive power adds num(b) ≠ 0 as a conjunct (the
 * natural domain). The plain rows, conditions and domain conjuncts are equational-constraint candidates when they
 * are equations. Undefined when an expression is not a rational function of the variables.
 */
const CONDITION_OP: Readonly<Record<string, Op>> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };

export function cadProblem(problem: RelationProblem, variables: readonly string[]): CadProblem | undefined {
  if (problem.formulas.some(hasQuantifier)) return undefined;
  const s = problem.store, ctx = s.ctx, n = variables.length, levels = variables.map((_, i) => i + 1);
  const atoms: CadAtom[] = [], index = new Map<string, number>();
  const atom = (e: ExprId, op: Op): number | undefined => {
    const f = fractionOf(s, e, variables);
    if (!f) return undefined;
    const poly = fromMPoly(ctx, op === 'eq' || op === 'ne' ? f.num : multiply(ctx, f.num, f.den), levels, n);
    const k = `${op}:${key(poly)}`;
    if (!index.has(k)) { index.set(k, atoms.length); atoms.push(Object.freeze({ poly, op })); }
    return index.get(k);
  };
  const relation = (r: Relation): CadFormula | undefined => {
    const i = atom(s.sub(r.lhs, r.rhs), r.op);
    return i === undefined ? undefined : { kind: 'atom', atom: i };
  };
  const formula = (f: Formula): CadFormula | undefined => {
    if (f.kind === 'rel') return relation(f.rel);
    if (f.kind !== 'and' && f.kind !== 'or') return undefined;
    const args = f.args.map(formula);
    return args.every(a => a !== undefined) ? { kind: f.kind, args: args as CadFormula[] } : undefined;
  };
  const conjuncts: CadFormula[] = [];
  for (const r of problem.relations) { const a = relation(r); if (!a) return undefined; conjuncts.push(a); }
  for (const c of problem.conditions as readonly Condition[]) {
    if (c.kind === 'in-domain') continue;
    const i = atom('other' in c ? s.sub(c.expr, c.other) : c.expr, CONDITION_OP[c.kind]);
    if (i === undefined) return undefined;
    conjuncts.push({ kind: 'atom', atom: i });
  }
  const roots = [
    ...problem.relations.flatMap(r => [r.lhs, r.rhs]), ...problem.formulas.flatMap(formulaRoots),
    ...problem.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr])),
  ];
  for (const b of domainBases(s, roots)) { const i = atom(b, 'ne'); if (i === undefined) return undefined; conjuncts.push({ kind: 'atom', atom: i }); }
  const constraints = conjuncts.flatMap(c => (c.kind === 'atom' && atoms[c.atom].op === 'eq' ? [c.atom] : []));
  for (const f of problem.formulas) { const g = formula(f); if (!g) return undefined; conjuncts.push(g); }
  return Object.freeze({ n, atoms: Object.freeze(atoms), formula: { kind: 'and' as const, args: conjuncts }, constraints });
}
