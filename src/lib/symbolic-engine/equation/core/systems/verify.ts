import { demand } from '../execution';
import { solveLinear } from '../algebra/linear';
import { rational, rNegate, type Rational } from '../algebra/rational';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId } from '../representation/expression';
import type { RelationProblem } from '../representation/relation';
import { assertOutcome, compareValues, finiteSet, normalizeSet, setKey, valueExpression, type EquationOutcome, type Point } from '../representation/solution-set';
import { verifyProofLog } from '../representation/transform';
import { fractionOf, toExpression } from '../parameters/mpoly';
import { parametricAtoms, type ParamAtom } from '../parameters/specialize';
import { verifyParametricOutcome } from '../parameters/verify';
import { isLinear } from './linear';
import { decideEquation } from '../decide';
import { decideSystem, targetsInKernel } from './solve';
import { holdsAt, verifyEliminationSamples, verifyInfiniteSamples, verifyPolynomialCertificate } from './verify-nonlinear';
import { verifyCertifiedSystem } from '../numeric/cover-box';

/**
 * Independent evidence for a system outcome:
 * - the proof is the problem itself;
 * - every claimed point satisfies every atom exactly (equations vanish,
 *   ≠ atoms and natural-domain bases do not);
 * - a parametric set satisfies every equation identically in its free targets;
 * - completeness of a linear system: an independent Bareiss solve over ℚ
 *   must agree (inconsistent ⇔ no point before ≠ atoms; full rank ⇔ the
 *   claimed point; rank r ⇔ n − r free targets);
 * - re-derivation gives the same set, unless the checks above already prove
 *   completeness (finite polynomial answers by the Hermite count; linear
 *   systems by the Bareiss rank, see EQUATION-PROOF-PERFORMANCE1).
 * With parameters, each case is specialized at samples and compared with the
 * parameter-free decision (the parameters gate's verifier).
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

export function verifySystemOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  if (problem.parameters.length) return verifyParametricOutcome(problem, outcome, decideSystem);
  const store = problem.store, ctx = store.ctx, n = problem.targets.length, domain = problem.domain;
  if (outcome.proof.root !== problem.hash) fail('proof does not start from the problem');
  const report = verifyProofLog(outcome.proof, new Map());
  if (report.leaves.length !== 1 || report.leaves[0] !== problem.hash) fail('a systems proof is the problem itself');
  if (targetsInKernel(problem)) {
    if (outcome.kind === 'solved') verifyEliminationSamples(problem, outcome.set);
    // Certified system solutions: certificates, and completeness by an independent cover where it applies.
    if (outcome.kind === 'solved' && verifyCertifiedSystem(problem, outcome.set)) return;
    return rederive(problem, outcome);
  }
  const atoms = parametricAtoms(problem);
  if ('owner' in atoms) return fail('the problem has no polynomial atoms');
  if (!atoms.atoms.filter(a => a.op === 'eq').every(a => isLinear(a, n))) {
    const s = outcome.kind === 'solved' ? outcome.set : finiteSet(problem.targets, []);
    if (s.kind === 'finite') {
      s.points.forEach((p, i) => { for (const q of s.points.slice(0, i)) if (p.every((v, j) => compareValues(store, v, q[j]) === 0)) fail('a point is claimed twice'); });
      // Complete without re-derivation: distinct claimed solutions, as many as the Hermite count of the
      // (certified) basis's solutions, are all of them. The points themselves are proven in one number field
      // when their coordinates are algebraic numbers, otherwise by exact substitution.
      if (verifyPolynomialCertificate(problem, atoms.atoms, s)) return;
      for (const p of s.points) if (!holdsAt(problem, p.map(v => valueExpression(store, v)))) fail('a point does not satisfy the system');
      return;
    }
    verifyInfiniteSamples(problem, s, p => (p.targets.length > 1 ? decideSystem(p) : decideEquation(p)));
    return rederive(problem, outcome);
  }
  const at = (atom: ParamAtom, point: Point): boolean => {
    const id = store.substitute(toExpression(store, atom.poly), new Map(problem.targets.map((t, i) => [t, valueExpression(store, point[i])] as const)));
    const v = evaluateExact(store, id, domain);
    if (v.kind !== 'exact') return fail('an atom is not exactly evaluable at a point');
    const zero = v.value.kind === 'rational' && v.value.value.numerator === 0n;
    return atom.op === 'eq' ? zero : !zero;
  };
  const set = outcome.kind === 'solved' ? outcome.set : undefined;
  if (set?.kind === 'finite') for (const p of set.points) if (!atoms.atoms.every(a => at(a, p))) fail('a point does not satisfy the system');
  if (set?.kind === 'parametric') {
    for (const a of atoms.atoms.filter(a => a.op === 'eq')) {
      const id = store.substitute(toExpression(store, a.poly), new Map(problem.targets.map((t, i) => [t, set.values[i]] as const)));
      const f = fractionOf(store, id, set.freeParameters);
      if (!f || f.num.terms.size) fail('a parametric set does not satisfy an equation identically');
    }
  }
  if (set && set.kind !== 'finite' && set.kind !== 'parametric') fail(`unexpected ${set.kind} set for a system`);

  const equations = atoms.atoms.filter(a => a.op === 'eq');
  if (equations.every(a => isLinear(a, n))) {
    // Independent Bareiss solve of A·x = b.
    const row = (a: ParamAtom) => {
      const coefficient = (i: number): Rational => a.poly.terms.get(problem.targets.map((_, j) => (j === i ? 1 : 0)).concat(a.poly.vars.slice(n).map(() => 0)).join(',')) ?? rational(ctx, 0n);
      const constantTerm = a.poly.terms.get(a.poly.vars.map(() => 0).join(',')) ?? rational(ctx, 0n);
      return { coefficients: problem.targets.map((_, i) => coefficient(i)), rhs: rNegate(ctx, constantTerm) };
    };
    const rows = equations.map(row);
    const solution = solveLinear(ctx, rows.map(r => r.coefficients), rows.map(r => r.rhs), n);
    // Each branch that returns has proven the answer complete; the rest fall through to re-derivation.
    if (solution.kind === 'inconsistent') {
      if (outcome.kind !== 'empty') fail('an inconsistent system was claimed solvable');
      return;
    } else if (solution.rank === n) {
      const point: Point = solution.particular.map(v => ({ kind: 'rational', value: v }));
      if (outcome.kind === 'empty') { if (atoms.atoms.every(a => at(a, point))) fail('claimed empty, but the unique point satisfies the system'); }
      else if (set?.kind !== 'finite' || set.points.length !== 1 || !set.points[0].every((v, i) => compareValues(store, v, point[i]) === 0)) fail('the claimed point differs from the unique solution');
      return;
    } else if (outcome.kind === 'solved' && (set?.kind !== 'parametric' || set.freeParameters.length !== n - solution.rank)) fail('the claimed free targets differ from the nullity');
    // Rank r < n without ≠ atoms: a parametric set inside the solution space, defined everywhere (polynomial
    // values) and with free targets mapping to themselves, projects onto all n − r of them, so it is the
    // whole (n − r)-dimensional space.
    const polynomial = (v: ExprId, free: readonly string[]) => {
      const f = fractionOf(store, v, free);
      return f !== undefined && [...f.den.terms.keys()].every(k => k.split(',').every(e => e === '0'));
    };
    if (set?.kind === 'parametric' && set.constraints.length === 0 && atoms.atoms.every(a => a.op === 'eq')
      && set.freeParameters.every(t => set.values[problem.targets.indexOf(t)] === store.symbol(t))
      && set.values.every(v => polynomial(v, set.freeParameters))) return;
  }
  rederive(problem, outcome);
}

function rederive(problem: RelationProblem, outcome: EquationOutcome): void {
  const store = problem.store, domain = problem.domain, again = decideSystem(problem);
  if (again.kind !== outcome.kind) fail('re-derivation gives a different outcome');
  if (again.kind === 'solved' && outcome.kind === 'solved' && setKey(store, normalizeSet(store, again.set, domain)) !== setKey(store, normalizeSet(store, outcome.set, domain))) fail('the set differs from the re-derived set');
}
