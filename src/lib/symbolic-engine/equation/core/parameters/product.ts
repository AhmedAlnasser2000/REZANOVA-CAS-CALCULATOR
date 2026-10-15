import type { ExprId, ExpressionStore } from '../representation/expression';
import { relationProblem, type Condition, type RelationProblem } from '../representation/relation';
import { finiteSet, type EquationOutcome, type Point } from '../representation/solution-set';
import type { ParamCase } from './cells';
import { fractionOf } from './mpoly';

/**
 * The zero-product split (factor first): P = ∏ Fᵢ = 0 with every Fᵢ a polynomial in the target and the parameters
 * (defined everywhere) holds exactly when some Fᵢ = 0, so each factor is decided on its own and the cases combine
 * as a product: conditions concatenated, finite sets united ((z − a)(z − b)⋯(z − p) = 0 → z ∈ {a, b, …, p}; a
 * quadratic factor brings its own cases on its parameters). Undefined when the equation is not such a product,
 * when a factor is free of the target (it vanishes for parameter values, making every x a solution), or when a
 * factor's outcome is not a finite set or a case tree of finite sets.
 */
export function productFactors(problem: RelationProblem): ExprId[] | undefined {
  const store = problem.store, x = problem.targets[0];
  if (problem.targets.length !== 1 || problem.relations.length !== 1 || problem.relations[0].op !== 'eq'
    || problem.conditions.length || problem.formulas.length || problem.generators.length || problem.constraints.length) return undefined;
  const { lhs, rhs } = problem.relations[0];
  const zero = (e: ExprId) => store.numberValue(e)?.numerator === 0n;
  const side = zero(rhs) ? lhs : zero(lhs) ? rhs : undefined;
  const node = side === undefined ? undefined : store.node(side);
  if (!node || node.kind !== 'mul') return undefined;
  const factors: ExprId[] = [];
  for (const raw of node.args) {
    const f = store.node(raw);
    // A power of a factor vanishes with the factor; a number factor never vanishes.
    const base = f.kind === 'pow' && (store.numberValue(f.exponent)?.numerator ?? 0n) > 0n && store.numberValue(f.exponent)?.denominator === 1n ? f.base : raw;
    if (store.numberValue(base)) continue;
    if (!store.freeSymbols(base).includes(x) || !polynomial(store, base, [x, ...problem.parameters])) return undefined;
    factors.push(base);
  }
  return factors.length >= 2 ? factors : undefined;
}

function polynomial(store: ExpressionStore, e: ExprId, vars: readonly string[]): boolean {
  const f = fractionOf(store, e, vars);
  return f !== undefined && [...f.den.terms.keys()].every(k => k.split(',').every(d => d === '0'));
}

export function decideProduct(problem: RelationProblem, decide: (p: RelationProblem) => EquationOutcome): readonly ParamCase[] | undefined {
  const factors = productFactors(problem);
  if (!factors) return undefined;
  let combined: { conditions: readonly Condition[]; points: readonly Point[] }[] = [{ conditions: [], points: [] }];
  for (const F of factors) {
    const out = decide(factorProblem(problem, F));
    const cases = casesOf(out);
    if (!cases) return undefined;
    combined = combined.flatMap(a => cases.map(b => ({ conditions: [...a.conditions, ...b.conditions], points: [...a.points, ...b.points] })));
    problem.store.ctx.allocate(combined.length);
  }
  return combined.map(c => ({ conditions: c.conditions, set: finiteSet(problem.targets, c.points) }));
}

/** The problem F = 0 for one factor, in the same domain and target. */
export function factorProblem(problem: RelationProblem, F: ExprId): RelationProblem {
  return relationProblem(problem.store, { domain: problem.domain, targets: problem.targets, relations: [{ op: 'eq', lhs: F, rhs: problem.store.integer(0) }] });
}

export function casesOf(out: EquationOutcome): { conditions: readonly Condition[]; points: readonly Point[] }[] | undefined {
  if (out.kind === 'empty') return [{ conditions: [], points: [] }];
  if (out.kind !== 'solved') return undefined;
  const set = out.set;
  if (set.kind === 'finite') return [{ conditions: [], points: set.points }];
  if (set.kind !== 'case-tree') return undefined;
  const cases = set.cases.map(c => (c.set.kind === 'finite' ? { conditions: c.conditions, points: c.set.points } : undefined));
  return cases.every(c => c !== undefined) ? cases as { conditions: readonly Condition[]; points: readonly Point[] }[] : undefined;
}
