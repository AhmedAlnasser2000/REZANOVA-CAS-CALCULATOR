import { demand, type ExecutionContext } from './execution';
import { verifyReducedCurveOrder, type ReducedCurveAlgebra, type ReducedCurveOrder } from './reduced-curve';
import { verifyReducedOrderMaximality, type ReducedOrderMaximality } from './reduced-normality';
import { solvePositiveHessSpace, verifyPositiveHessSpace, type PositiveHessSpace } from './positive-hess';
import { positiveBezout, verifyPositiveBezout, type PositiveBezout } from './positive-polynomial';
import { reciprocalPositiveFraction } from './positive-fraction';
import { positiveLatticeCoordinates } from './positive-lattice';
import { freezeExactMatrix, type ExactMatrix } from './arithmetic-matrix';
import type { PositiveFraction } from './positive-fraction';
import { requireGoodReduction } from './algebraic-reduction-errors';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';

export interface ReducedCurveModel<E> {
  readonly finite: ReducedCurveOrder<E>; readonly infinity: ReducedCurveOrder<E>;
  readonly finiteMaximality: ReducedOrderMaximality<E>; readonly infinityMaximality: ReducedOrderMaximality<E>;
  readonly separability: PositiveBezout<PositiveFraction<E>>;
  readonly toFinite: ExactMatrix<PositiveFraction<E>>; readonly toInfinity: ExactMatrix<PositiveFraction<E>>;
  readonly globalFunctions: PositiveHessSpace<E>; readonly genus: bigint;
}
function atZero<E>(ctx: ExecutionContext, p: import('./positive-polynomial').PositivePolynomial<E>) { p.ring.assert(ctx, p); demand(!p.ring.isZero(ctx, p), 'verification-failed', 'nonzero reduced discriminant'); let i = 0; while (p.ring.field.isZero(ctx, p.coefficients[i])) { ctx.tick(); i++; } return i; }
function laurent<E>(ctx: ExecutionContext, v: PositiveFraction<E>): boolean { const r = v.owner.ring; let nonzero = 0; for (const c of v.denominator.coefficients) if (!r.field.isZero(ctx, c)) nonzero++; return nonzero === 1; }
export function reducedChartTransitions<E>(ctx: ExecutionContext, finite: ReducedCurveOrder<E>, infinity: ReducedCurveOrder<E>) {
  const ff = finite.lattice.field, inf = infinity.lattice.field;
  const toFinite = freezeExactMatrix(ctx, infinity.lattice.basis.map(row => [...positiveLatticeCoordinates(ctx, finite.lattice, row.map(v => reciprocalPositiveFraction(ctx, ff, v)))]));
  const toInfinity = freezeExactMatrix(ctx, finite.lattice.basis.map(row => [...positiveLatticeCoordinates(ctx, infinity.lattice, row.map(v => reciprocalPositiveFraction(ctx, inf, v)))]));
  return {toFinite, toInfinity};
}
export function constructReducedCurveModel<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, finite: ReducedCurveOrder<E>, infinity: ReducedCurveOrder<E>, finiteMaximality: ReducedOrderMaximality<E>, infinityMaximality: ReducedOrderMaximality<E>): ReducedCurveModel<E> {
  const separability = positiveBezout(ctx, algebra.relation.ring, algebra.relation, algebra.relation.ring.derivative(ctx, algebra.relation)), transitions = reducedChartTransitions(ctx, finite, infinity);
  const globalFunctions = solvePositiveHessSpace(ctx, finite.lattice, infinity.lattice), ramification = BigInt(finite.discriminant.ring.degree(ctx, finite.discriminant) + atZero(ctx, infinity.discriminant));
  const twice = ctx.add(ramification, ctx.add(2n, -ctx.multiply(2n, BigInt(algebra.dimension)))); requireGoodReduction(twice >= 0n && twice % 2n === 0n, 'reduced genus parity');
  requireGoodReduction(globalFunctions.basis.length === 1, 'reduced geometric connectedness');
  const proof = Object.freeze({finite, infinity, finiteMaximality, infinityMaximality, separability, ...transitions, globalFunctions, genus: ctx.quotient(twice, 2n)});
  verifyReducedCurveModel(ctx, algebra, proof); return proof;
}
export function verifyReducedCurveModel<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, proof: ReducedCurveModel<E>): void {
  demand(algebra.characteristic > BigInt(algebra.dimension), 'verification-failed', 'tame curve characteristic');
  reuseAlgebraicVerification(ctx, 'reduced-model', algebra, proof, null, () => verifyReducedModelEvidence(ctx, algebra, proof));
}
function verifyReducedModelEvidence<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, proof: ReducedCurveModel<E>): void {
  verifyReducedCurveOrder(ctx, algebra, false, proof.finite.lattice.input, proof.finite); verifyReducedCurveOrder(ctx, algebra, true, proof.infinity.lattice.input, proof.infinity);
  verifyPositiveBezout(ctx, algebra.relation.ring, algebra.relation, algebra.relation.ring.derivative(ctx, algebra.relation), proof.separability);
  demand(algebra.relation.ring.equal(ctx, proof.separability.gcd, algebra.relation.ring.one(ctx)), 'verification-failed', 'reduced curve separability');
  verifyReducedOrderMaximality(ctx, algebra, proof.finite, proof.finiteMaximality); verifyReducedOrderMaximality(ctx, algebra, proof.infinity, proof.infinityMaximality);
  const transitions = reducedChartTransitions(ctx, proof.finite, proof.infinity);
  for (const [actual, expected] of [[proof.toFinite, transitions.toFinite], [proof.toInfinity, transitions.toInfinity]] as const) {
    demand(actual.length === expected.length && actual.every((row, i) => row.length === expected[i].length && row.every((v, j) => v.owner.equal(ctx, v, expected[i][j]) && laurent(ctx, v))), 'verification-failed', 'reduced complete Laurent chart gluing');
  }
  verifyPositiveHessSpace(ctx, proof.finite.lattice, proof.infinity.lattice, proof.globalFunctions);
  demand(proof.globalFunctions.basis.length === 1, 'verification-failed', 'complete reduced global functions equal geometric constants');
  const degree = BigInt(proof.finite.discriminant.ring.degree(ctx, proof.finite.discriminant) + atZero(ctx, proof.infinity.discriminant)); ctx.integer(proof.genus);
  demand(proof.genus >= 0n && ctx.add(ctx.multiply(2n, proof.genus), -2n) === ctx.add(degree, -2n * BigInt(algebra.dimension)), 'verification-failed', 'reduced tame canonical genus');
  // Finite normal orders glued over Laurent polynomial bases are a proper
  // normal finite cover of P1. Generic separability and perfect finite constants
  // give a smooth curve. Complete H0=constants establishes geometric connectedness;
  // hence the generic ring is a geometrically integral field. This is unrelated
  // to zero-derivative tests, which would fail in positive characteristic.
}
