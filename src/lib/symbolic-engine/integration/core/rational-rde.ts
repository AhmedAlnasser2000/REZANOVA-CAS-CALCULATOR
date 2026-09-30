import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import type { Polynomial as P } from './polynomial';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution, type LinearSystem } from './linear-system';
import { assertRdeDomain, clearRde, rdeDomain, verifyClearing, type ClearingEvidence, type PrimitiveTriple, type RdeDomain } from './rde-algebra';
import { boundDenominator, verifyDenominator, type DenominatorEvidence } from './rde-denominator';
import { degreeBound, polynomialEquation, rdeMatrix, verifyDegree, verifyPolynomialEquation, verifyRdeMatrix, type DegreeEvidence } from './rde-polynomial';

export interface RdeSolution {
  readonly particular: E;
  readonly homogeneous: readonly E[];
  readonly derivatives: readonly DerivativeEvidence[];
}
export interface RationalRdeDecision {
  readonly kind: 'solutions' | 'no-rational-solution';
  readonly domain: RdeDomain;
  readonly a: E;
  readonly b: E;
  readonly clearing: ClearingEvidence;
  readonly denominator: DenominatorEvidence;
  readonly polynomial: PrimitiveTriple;
  readonly degree: DegreeEvidence;
  readonly system: LinearSystem<E>;
  readonly linear: LinearSolution<E>;
  readonly solution: RdeSolution | null;
  readonly conditions: Readonly<{ coefficients: readonly P<E>[]; solutions: readonly P<E>[] }>;
}
function denominator(ctx: ExecutionContext, owner: DifferentialField, value: E): P<E> {
  owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'RDE fraction'); return value.value.denominator;
}
function conditions(ctx: ExecutionContext, owner: DifferentialField, actual: readonly P<E>[], values: readonly E[]): void {
  demand(actual.length === values.length, 'verification-failed', 'RDE condition coverage');
  for (let i = 0; i < values.length; i++) demand(owner.fractions!.ring.equal(ctx, actual[i], denominator(ctx, owner, values[i])),
    'verification-failed', 'RDE retained denominator');
}
function verify(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, e: RationalRdeDecision): void {
  assertRdeDomain(ctx, owner, e.domain); owner.assert(ctx, a); owner.assert(ctx, b);
  demand(owner.equal(ctx, a, e.a) && owner.equal(ctx, b, e.b), 'verification-failed', 'RDE expected coefficients');
  const d = e.domain;
  verifyClearing(ctx, d, a, b, e.clearing);
  verifyDenominator(ctx, d, e.clearing.primitive.A, e.clearing.primitive.B, e.denominator);
  verifyPolynomialEquation(ctx, d, e.clearing.primitive, e.denominator.denominator, e.polynomial);
  verifyDegree(ctx, d, e.polynomial, e.degree); verifyRdeMatrix(ctx, d, e.polynomial, e.degree.bound, e.system);
  verifyLinearSolution(ctx, d.ring.domain, e.system, e.linear);
  ctx.allocate(2); conditions(ctx, owner, e.conditions.coefficients, [a, b]);
  if (e.linear.kind === 'inconsistent') {
    demand(e.kind === 'no-rational-solution' && e.solution === null && e.conditions.solutions.length === 0,
      'verification-failed', 'RDE negative outcome'); return;
  }
  demand(e.kind === 'solutions' && e.solution !== null, 'verification-failed', 'RDE solution outcome');
  const s = e.solution;
  demand(s.homogeneous.length === e.linear.nullspace.length && s.homogeneous.length <= 1
    && s.derivatives.length === 1 + s.homogeneous.length, 'verification-failed', 'RDE complete solution basis');
  ctx.allocate(2 * (s.homogeneous.length + 1));
  const values = [s.particular, ...s.homogeneous], vectors = [e.linear.particular, ...e.linear.nullspace];
  for (let i = 0; i < values.length; i++) {
    const expected = owner.fraction(ctx, owner.fractions!.make(ctx, d.ring.make(ctx, vectors[i]), e.denominator.denominator));
    demand(owner.equal(ctx, values[i], expected), 'verification-failed', 'RDE nullspace mapping');
    verifyDerivative(ctx, owner, values[i], s.derivatives[i]);
    demand(owner.equal(ctx, owner.add(ctx, s.derivatives[i].derivative, owner.multiply(ctx, a, values[i])), i === 0 ? b : owner.fromInteger(ctx, 0n)),
      'verification-failed', 'RDE differential residual');
  }
  conditions(ctx, owner, e.conditions.solutions, values);
}
export function verifyRationalRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E, decision: RationalRdeDecision): void {
  ctx.operation(() => verify(ctx, owner, a, b, decision));
}
export function solveRationalRde(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E): RationalRdeDecision {
  return ctx.operation(() => {
    const d = rdeDomain(ctx, owner), clearing = clearRde(ctx, d, a, b);
    const denominatorProof = boundDenominator(ctx, d, clearing.primitive.A, clearing.primitive.B);
    const polynomial = polynomialEquation(ctx, d, clearing.primitive, denominatorProof.denominator);
    const degree = degreeBound(ctx, d, polynomial), system = rdeMatrix(ctx, d, polynomial, degree.bound);
    const linear = solveLinearSystem(ctx, d.ring.domain, system);
    let solution: RdeSolution | null = null;
    const solutionConditions: P<E>[] = [];
    if (linear.kind === 'consistent') {
      ctx.allocate(2 * (linear.nullspace.length + 1) + 3);
      const vectors = [linear.particular, ...linear.nullspace];
      const values = vectors.map(v => owner.fraction(ctx, owner.fractions!.make(ctx, d.ring.make(ctx, v), denominatorProof.denominator)));
      const derivatives = values.map(v => differentiate(ctx, owner, v));
      for (const value of values) { ctx.allocate(1); solutionConditions.push(denominator(ctx, owner, value)); }
      ctx.allocate(linear.nullspace.length); solution = Object.freeze({ particular: values[0], homogeneous: Object.freeze(values.slice(1)), derivatives: Object.freeze(derivatives) });
    }
    ctx.allocate(18);
    const decision: RationalRdeDecision = Object.freeze({ kind: solution ? 'solutions' : 'no-rational-solution', domain: d, a, b, clearing,
      denominator: denominatorProof, polynomial, degree, system, linear, solution,
      conditions: Object.freeze({ coefficients: Object.freeze([denominator(ctx, owner, a), denominator(ctx, owner, b)]), solutions: Object.freeze(solutionConditions) }) });
    verify(ctx, owner, a, b, decision); return decision;
  });
}
