import { demand, type ExecutionContext } from './execution';
import { PositivePolynomialRing, type PositivePolynomial } from './positive-polynomial';
import { PositiveFiniteExtension, type FiniteExtensionValue } from './positive-extension';
import { factorPositivePolynomial, verifyPositiveFactorization, type PositiveFactorization } from './positive-factorization';
import { solveArithmeticLinearSystem, verifyArithmeticLinearSolution, type LinearSolution } from './arithmetic-linear';
import { positivePreimage, verifyPositivePreimage, positiveLatticeCoordinates, type PositivePreimage } from './positive-lattice';
import { freezeExactMatrix } from './arithmetic-matrix';
import { constructReducedIdeal, reducedOrderVectorProduct, reducedUnitVector, reducedIdealContains, type ReducedIdeal } from './reduced-ideal';
import type { ReducedCurveAlgebra, ReducedCurveOrder } from './reduced-curve';
import { requireGoodReduction } from './algebraic-reduction-errors';

export interface ReducedLocalMaximality<E> { readonly prime: PositivePolynomial<E>; readonly residue: PositiveFiniteExtension<E>; readonly traceKernel: LinearSolution<FiniteExtensionValue<E>>;
  readonly radical: ReducedIdeal<E>; readonly idealizer: PositivePreimage<E> }
export interface ReducedOrderMaximality<E> { readonly factors: PositiveFactorization<E>; readonly locals: readonly ReducedLocalMaximality<E>[] }
function residue<E>(ctx: ExecutionContext, field: PositiveFiniteExtension<E>, p: PositivePolynomial<E>) { return field.make(ctx, field.ring.make(ctx, p.coefficients)); }
function traceRequest<E>(ctx: ExecutionContext, order: ReducedCurveOrder<E>, field: PositiveFiniteExtension<E>) {
  const n = order.lattice.dimension; ctx.allocate(n * n);
  const matrix = freezeExactMatrix(ctx, order.gram.map(row => row.map(v => { demand(v.owner.ring.degree(ctx, v.denominator) === 0, 'verification-failed', 'integral reduced trace'); return residue(ctx, field, v.numerator); })));
  return Object.freeze({rows: n, columns: n, matrix, rhs: Object.freeze(Array<FiniteExtensionValue<E>>(n).fill(field.fromInteger(ctx, 0n)))});
}
function radicalInput<E>(ctx: ExecutionContext, order: ReducedCurveOrder<E>, prime: PositivePolynomial<E>, kernel: LinearSolution<FiniteExtensionValue<E>>) {
  demand(kernel.kind === 'consistent', 'verification-failed', 'reduced trace radical kernel'); const f = order.lattice.field, n = order.lattice.dimension, p = f.make(ctx, prime, f.ring.one(ctx));
  ctx.allocate((kernel.nullspace.length + n) * n); return freezeExactMatrix(ctx, [...kernel.nullspace.map(row => row.map(v => f.make(ctx, f.ring.make(ctx, v.polynomial.coefficients), f.ring.one(ctx)))),
    ...Array.from({length: n}, (_, j) => Array.from({length: n}, (_, i) => i === j ? p : f.fromInteger(ctx, 0n)))]);
}
function idealizerConstraints<E>(ctx: ExecutionContext, radical: ReducedIdeal<E>) {
  const n = radical.lattice.dimension; ctx.allocate(n * n * n);
  return freezeExactMatrix(ctx, radical.lattice.basis.flatMap(row => {
    const columns = Array.from({length: n}, (_, j) => positiveLatticeCoordinates(ctx, radical.lattice, reducedOrderVectorProduct(ctx, radical.order, row, reducedUnitVector(ctx, radical.order, j))));
    return Array.from({length: n}, (_, i) => columns.map(column => column[i]));
  }));
}
export function certifyReducedOrderMaximality<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, order: ReducedCurveOrder<E>): ReducedOrderMaximality<E> {
  demand(algebra.characteristic > BigInt(algebra.dimension), 'invalid-input', 'tame reduced characteristic');
  const field = algebra.constants, r = order.lattice.field.ring, factors = factorPositivePolynomial(ctx, field, r, order.discriminant);
  demand(factors.kind === 'factorization', 'verification-failed', 'nonzero reduced discriminant');
  const locals = Object.freeze(factors.factors.map(factor => {
    const ring = new PositivePolynomialRing(field, 'rho'), prime = factor.polynomial;
    const residueField = new PositiveFiniteExtension(ctx, field, ring, ring.make(ctx, prime.coefficients), Object.freeze({
      frobenius: Object.freeze(factor.irreducibility.frobenius.map(p => ring.make(ctx, p.coefficients))), exclusions: Object.freeze(factor.irreducibility.exclusions.map(e => Object.freeze({index: e.index, bezout: Object.freeze({gcd: ring.make(ctx, e.bezout.gcd.coefficients), s: ring.make(ctx, e.bezout.s.coefficients), t: ring.make(ctx, e.bezout.t.coefficients)})})))}));
    const traceKernel = solveArithmeticLinearSystem(ctx, residueField, traceRequest(ctx, order, residueField)), radical = constructReducedIdeal(ctx, algebra, order, radicalInput(ctx, order, prime, traceKernel));
    const idealizer = positivePreimage(ctx, order.lattice.field, idealizerConstraints(ctx, radical), algebra.dimension);
    requireGoodReduction(idealizer.result.basis.every(row => row.every(v => order.lattice.field.ring.degree(ctx, v.denominator) === 0)), 'reduced order not locally maximal');
    return Object.freeze({prime, residue: residueField, traceKernel, radical, idealizer});
  }));
  const proof = Object.freeze({factors, locals}); verifyReducedOrderMaximality(ctx, algebra, order, proof); return proof;
}
export function verifyReducedOrderMaximality<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, order: ReducedCurveOrder<E>, proof: ReducedOrderMaximality<E>): void {
  demand(algebra.characteristic > BigInt(algebra.dimension), 'verification-failed', 'tame maximality hypotheses');
  const r = order.lattice.field.ring, f = order.lattice.field; verifyPositiveFactorization(ctx, algebra.constants, r, order.discriminant, proof.factors);
  demand(proof.factors.kind === 'factorization' && proof.locals.length === proof.factors.factors.length, 'verification-failed', 'reduced complete discriminant prime coverage');
  for (let i = 0; i < proof.locals.length; i++) {
    const local = proof.locals[i]; demand(r.equal(ctx, local.prime, proof.factors.factors[i].polynomial) && local.residue.parent === algebra.constants && local.residue.ring.equal(ctx, local.residue.modulus, local.residue.ring.make(ctx, local.prime.coefficients)), 'domain-mismatch', 'reduced local prime/residue');
    verifyArithmeticLinearSolution(ctx, local.residue, traceRequest(ctx, order, local.residue), local.traceKernel);
    const expected = radicalInput(ctx, order, local.prime, local.traceKernel);
    demand(local.radical.order === order, 'domain-mismatch', 'reduced radical chart');
    // Complete trace kernel is the nilradical in residue characteristic > n:
    // every local length is a unit and finite residue extensions are separable.
    const rebuilt = constructRadicalEvidence(ctx, algebra, order, expected, local.radical);
    verifyPositivePreimage(ctx, f, idealizerConstraints(ctx, rebuilt), algebra.dimension, local.idealizer);
    demand(local.idealizer.result.basis.every(row => row.every(v => r.degree(ctx, v.denominator) === 0)), 'verification-failed', 'reduced order not locally maximal');
    for (let j = 0; j < algebra.dimension; j++) demand(reducedIdealContains(ctx, {lattice: local.idealizer.result}, reducedUnitVector(ctx, order, j)), 'verification-failed', 'reduced idealizer complete unit containment');
  }
}
import { reconstructReducedIdeal } from './reduced-ideal';
function constructRadicalEvidence<E>(ctx: ExecutionContext, algebra: ReducedCurveAlgebra<E>, order: ReducedCurveOrder<E>, input: ReturnType<typeof radicalInput<E>>, expected: ReducedIdeal<E>) {
  return reconstructReducedIdeal(ctx, algebra, order, input, expected.lattice);
}
