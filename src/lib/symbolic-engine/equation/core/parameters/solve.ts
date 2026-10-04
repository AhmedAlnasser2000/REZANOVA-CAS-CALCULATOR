import { OWNERS } from '../decision/rational-form';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { conditionKey, type Condition, type RelationProblem } from '../representation/relation';
import { finiteSet, normalizeSet, resourceOutcome, setKey, type EquationOutcome, type SolutionSet } from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { decideCells, type ParamCase } from './cells';
import { decideKernels } from './kernels';
import { parametricAtoms, targetInKernel } from './specialize';
import { decideTree } from './tree';

/**
 * Decide a polynomial or rational problem whose coefficients carry free
 * parameters: a case tree whose conditions are exact conditions on the
 * parameters and whose sets may name the parameters (design rule 8: every
 * pivot on a parameter is a case). One parameter is decided by exact cells,
 * several by sign-condition trees. The proof log is the problem itself; the
 * evidence is the verifier's specialization at samples of every case.
 */
export function decideParametricProblem(problem: RelationProblem): EquationOutcome {
  try {
    if (problem.targets.length !== 1) return { kind: 'incomplete-implementation', reason: `${OWNERS.systems}: several target variables` };
    if (problem.parameters.length === 0) return { kind: 'unsupported', reason: 'no parameters' };
    if (problem.generators.length || problem.constraints.length) return { kind: 'incomplete-implementation', reason: 'generator and constraint tables belong to other slices' };
    if (targetInKernel(problem)) {
      const k = decideKernels(problem);
      return k.kind === 'refused' ? { kind: 'incomplete-implementation', reason: k.reason } : caseOutcome(problem, simplifyCases(problem.store, k.cases));
    }
    const atoms = parametricAtoms(problem);
    if ('owner' in atoms) return { kind: 'incomplete-implementation', reason: `${atoms.owner}: ${atoms.detail}` };
    if (problem.parameters.length === 1) {
      const cells = decideCells(problem, atoms.atoms);
      return cells.kind === 'refused' ? { kind: 'incomplete-implementation', reason: cells.reason } : caseOutcome(problem, cells.cases);
    }
    const tree = decideTree(problem, atoms.atoms);
    return tree.kind === 'refused' ? { kind: 'incomplete-implementation', reason: tree.reason } : caseOutcome(problem, simplifyCases(problem.store, tree.cases));
  } catch (e) {
    return resourceOutcome(e);
  }
}

const isEmpty = (s: SolutionSet) => s.kind === 'finite' && s.points.length === 0;

function caseOutcome(problem: RelationProblem, cases: readonly ParamCase[]): EquationOutcome {
  const proof = new ProofLogBuilder(problem).build(), store = problem.store;
  if (cases.every(c => isEmpty(c.set))) return { kind: 'empty', proof };
  if (cases.length === 1 && cases[0].conditions.length === 0) return { kind: 'solved', set: normalizeSet(store, cases[0].set, problem.domain), proof };
  const tree: SolutionSet = { kind: 'case-tree', cases: cases.map(c => ({ conditions: c.conditions, set: isEmpty(c.set) ? finiteSet(problem.targets, []) : c.set })) };
  return { kind: 'solved', set: normalizeSet(store, tree, problem.domain), proof };
}

// ---- merging sign splits ----

/** The signs of `base` a condition allows, or undefined when it does not constrain `base` alone. */
function signsOf(store: ExpressionStore, c: Condition, base: ExprId): readonly number[] | undefined {
  const same = (e: ExprId) => e === base, opposite = (e: ExprId) => store.numberValue(store.add(e, base))?.numerator === 0n;
  switch (c.kind) {
    case 'equal': return store.numberValue(c.other)?.numerator === 0n && (same(c.expr) || opposite(c.expr)) ? [0] : undefined;
    case 'nonzero': return same(c.expr) || opposite(c.expr) ? [-1, 1] : undefined;
    case 'positive': return same(c.expr) ? [1] : opposite(c.expr) ? [-1] : undefined;
    case 'nonnegative': return same(c.expr) ? [0, 1] : opposite(c.expr) ? [-1, 0] : undefined;
    default: return undefined;
  }
}

function conditionFor(store: ExpressionStore, base: ExprId, signs: readonly number[]): Condition | undefined {
  const key = [...signs].sort().join(','), neg = () => store.neg(base);
  switch (key) {
    case '0': return { kind: 'equal', expr: base, other: store.integer(0) };
    case '1': return { kind: 'positive', expr: base };
    case '-1': return { kind: 'positive', expr: neg() };
    case '0,1': return { kind: 'nonnegative', expr: base };
    case '-1,0': return { kind: 'nonnegative', expr: neg() };
    case '-1,1': return { kind: 'nonzero', expr: base };
    default: return undefined;
  }
}

/**
 * Sibling cases with the same set that differ only in the sign of one
 * expression merge (a = 0 and a > 0 become a ≥ 0); a condition implied by
 * another on the same expression (a ≠ 0 next to a > 0) is dropped.
 */
export function simplifyCases(store: ExpressionStore, input: readonly ParamCase[]): ParamCase[] {
  // Conditions on one expression intersect into one (a ≠ 0 with a ≤ 0 is a < 0); an empty intersection drops the case.
  const intersect = (c: ParamCase): ParamCase | undefined => {
    const out: Condition[] = [];
    for (const k of c.conditions) {
      const i = out.findIndex(o => signsOf(store, o, k.expr) !== undefined && signsOf(store, k, k.expr) !== undefined);
      if (i < 0) { out.push(k); continue; }
      const base = k.expr, both = (signsOf(store, out[i], base) as number[]).filter(v => (signsOf(store, k, base) as number[]).includes(v));
      if (both.length === 0) return undefined;
      const merged = conditionFor(store, base, both);
      if (merged) out[i] = merged; else out.splice(i, 1);
    }
    return { conditions: out, set: c.set };
  };
  let cases = input.map(intersect).filter((c): c is ParamCase => c !== undefined);
  const keyOf = (k: Condition) => conditionKey(store, k);
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < cases.length; i++) {
      for (let j = i + 1; j < cases.length; j++) {
        store.ctx.tick();
        const a = cases[i], b = cases[j];
        if (a.conditions.length !== b.conditions.length || setKey(store, a.set) !== setKey(store, b.set)) continue;
        const bKeys = new Set(b.conditions.map(keyOf)), aKeys = new Set(a.conditions.map(keyOf));
        const onlyA = a.conditions.filter(k => !bKeys.has(keyOf(k))), onlyB = b.conditions.filter(k => !aKeys.has(keyOf(k)));
        if (onlyA.length !== 1 || onlyB.length !== 1) continue;
        const base = onlyA[0].expr, sa = signsOf(store, onlyA[0], base), sb = signsOf(store, onlyB[0], base);
        if (!sa || !sb || sa.some(v => sb.includes(v))) continue;
        const union = conditionFor(store, base, [...sa, ...sb]);
        const rest = a.conditions.filter(k => k !== onlyA[0]);
        cases = [...cases.slice(0, i), { conditions: union ? [...rest, union] : rest, set: a.set }, ...cases.slice(i + 1, j), ...cases.slice(j + 1)];
        merged = true;
        break outer;
      }
    }
  }
  return cases;
}
