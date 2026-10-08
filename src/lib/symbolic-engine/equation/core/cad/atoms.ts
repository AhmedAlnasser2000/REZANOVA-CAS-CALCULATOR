import { domainBases } from '../decision/rules';
import type { ExprId } from '../representation/expression';
import { formulaRoots } from '../representation/formula';
import type { Condition, Formula, Relation, RelationProblem } from '../representation/relation';
import { fractionOf, multiply } from '../parameters/mpoly';
import type { CadAtom, CadFormula, CadProblem, Op } from './decompose';
import { fromMPoly, key } from './recursive';

/**
 * A relation problem as a formula over ℚ[x₁ … xₙ] (EQUATION-SEMIALGEBRAIC1): `variables[j − 1]` is xⱼ, so the first
 * variable is the base of the decomposition. Each relation e op 0 with e = n/d becomes n op 0 (= and ≠) or n·d op 0
 * (orders), and every base b of a non-positive power adds num(b) ≠ 0 as a conjunct (the natural domain). The plain
 * rows, conditions and domain conjuncts are equational-constraint candidates when they are equations.
 *
 * Quantified rows (PR B) are put in prenex form: each ∀ or ∃ is pulled out in order of appearance (outer before inner)
 * with its variable renamed apart, which is sound because a bound variable occurs nowhere else; the bound variables
 * become the last levels. A denominator in a bound variable is not decided here (its natural domain would sit under
 * the quantifier). Undefined when an expression is not a rational function of the variables.
 */
const CONDITION_OP: Readonly<Record<string, Op>> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };

/** The bound variables (renamed apart, outermost first) and the formulas' matrices. */
function prenex(problem: RelationProblem, variables: readonly string[]): { bound: { q: 'forall' | 'exists'; name: string }[]; matrices: Formula[] } {
  const s = problem.store, taken = new Set<string>([...variables, ...problem.parameters, ...problem.targets]);
  const bound: { q: 'forall' | 'exists'; name: string }[] = [];
  const fresh = (v: string): string => {
    let i = 1;
    while (taken.has(`${v}_${i}`)) i++;
    taken.add(`${v}_${i}`);
    return `${v}_${i}`;
  };
  const strip = (f: Formula, env: ReadonlyMap<string, ExprId>): Formula => {
    s.ctx.tick();
    switch (f.kind) {
      case 'rel': return env.size ? { kind: 'rel', rel: { ...f.rel, lhs: s.substitute(f.rel.lhs, env), rhs: s.substitute(f.rel.rhs, env) } } : f;
      case 'and': case 'or': return { kind: f.kind, args: f.args.map(a => strip(a, env)) };
      default: {
        const name = fresh(f.variable);
        bound.push({ q: f.kind, name });
        return strip(f.body, new Map([...env, [f.variable, s.symbol(name)]]));
      }
    }
  };
  return { bound, matrices: problem.formulas.map(f => strip(f, new Map())) };
}

export function cadProblem(problem: RelationProblem, variables: readonly string[]): CadProblem | undefined {
  const s = problem.store, ctx = s.ctx;
  const { bound, matrices } = prenex(problem, variables);
  const all = [...variables, ...bound.map(b => b.name)], n = all.length, levels = all.map((_, i) => i + 1);
  if (n === 0) return undefined;
  const boundNames = new Set(bound.map(b => b.name));
  const atoms: CadAtom[] = [], index = new Map<string, number>();
  const atom = (e: ExprId, op: Op): number | undefined => {
    const f = fractionOf(s, e, all);
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
    ...problem.relations.flatMap(r => [r.lhs, r.rhs]), ...matrices.flatMap(formulaRoots),
    ...problem.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr])),
  ];
  for (const b of domainBases(s, roots)) {
    // The natural domain of a bound variable would sit under its quantifier: not decided here.
    if (s.freeSymbols(b).some(v => boundNames.has(v))) return undefined;
    const i = atom(b, 'ne');
    if (i === undefined) return undefined;
    conjuncts.push({ kind: 'atom', atom: i });
  }
  const constraints = bound.length ? [] : conjuncts.flatMap(c => (c.kind === 'atom' && atoms[c.atom].op === 'eq' ? [c.atom] : []));
  for (const f of matrices) { const g = formula(f); if (!g) return undefined; conjuncts.push(g); }
  return Object.freeze({
    n, atoms: Object.freeze(atoms), formula: { kind: 'and' as const, args: conjuncts }, constraints,
    ...(bound.length ? { quantifiers: Object.freeze(bound.map(b => b.q)) } : {}),
  });
}
