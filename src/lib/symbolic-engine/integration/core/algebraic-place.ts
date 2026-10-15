import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { constructAlgebraicExtensionWithin, type AlgebraicField } from './algebraic-field';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { freezeExactMatrix } from './algebraic-matrix';
import { assertAlgebraicCurveOwner, verifyAlgebraicCurveWithin, curveOrderCoordinates, type AlgebraicCurveView, type AlgebraicCurveOrder } from './algebraic-curve';
import type { CurveConstant } from './algebraic-curve-coordinates';
import { constructCurveResidueAlgebra, verifyCurveResidueAlgebra, residueCurvePolynomial, curveResiduePowerCoordinates,
  type CurveResidueAlgebra, type CurveBaseResidue, type CurvePlaceResidue } from './algebraic-residue-algebra';
import { constructCurveIdeal, reconstructCurveIdeal, assertCurveIdeal, multiplyCurveIdeals, verifyCurveIdealProduct, unitCurveIdeal,
  equalCurveIdeals, type CurveFractionalIdeal, type CurveIdealProduct } from './algebraic-fractional-ideal';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';

export interface AlgebraicPlace<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly order: AlgebraicCurveOrder;
  readonly prime: Polynomial<CurveConstant>;
  readonly algebra: CurveResidueAlgebra;
  readonly index: number;
  readonly residue: AlgebraicField<CurveBaseResidue>;
  readonly kernel: LinearSolution<CurveBaseResidue>;
  readonly ideal: CurveFractionalIdeal<E>;
  readonly ramification: bigint;
  readonly residueDegree: bigint;
  readonly degree: bigint;
}
export interface AlgebraicPlaceDecomposition<E> {
  readonly curve: AlgebraicCurveView<E>;
  readonly infinity: boolean;
  readonly input: Polynomial<CurveConstant>;
  readonly normalization: CurveConstant;
  readonly prime: Polynomial<CurveConstant>;
  readonly algebra: CurveResidueAlgebra;
  readonly places: readonly AlgebraicPlace<E>[];
  readonly unit: CurveFractionalIdeal<E>;
  readonly products: readonly CurveIdealProduct<E>[];
  readonly principal: CurveFractionalIdeal<E>;
}
const places = new WeakSet<object>();
export function assertAlgebraicPlace<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>): void {
  assertAlgebraicCurveOwner(ctx, curve);
  demand(place !== null && typeof place === 'object' && places.has(place) && place.curve === curve, 'domain-mismatch', 'algebraic place owner');
}
export function equalAlgebraicPlaces<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, a: AlgebraicPlace<E>, b: AlgebraicPlace<E>): boolean {
  assertAlgebraicPlace(ctx, curve, a); assertAlgebraicPlace(ctx, curve, b);
  if (a.order !== b.order) return false;
  return equalCurveIdeals(ctx, curve, a.ideal, b.ideal);
}
/** Composition-only replay of one supplied owned place. No decomposition or
 * residue-field search is performed; all retained defining/map evidence checks. */
export function verifyAlgebraicPlaceWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, bounds: DifferentialBounds): void {
  assertAlgebraicPlace(ctx, curve, place);
  const order = place.order.infinity ? curve.infinity : curve.finite;
  demand(place.order === order, 'domain-mismatch', 'place expected curve chart');
  reuseAlgebraicVerification(ctx, 'owned-place', curve, place, bounds, () => {
    verifyCurveResidueAlgebra(ctx, order, place.prime, place.algebra, bounds);
    verifyPlace(ctx, curve, order, place.prime, place.algebra, place.index, place, bounds);
  });
}
function component(proof: CurveResidueAlgebra, index: number) {
  demand(proof.factorization.kind === 'factorization' && Number.isSafeInteger(index) && index >= 0 && index < proof.factorization.factors.length,
    'verification-failed', 'residue component index');
  return proof.factorization.factors[index];
}
function residueColumns(ctx: ExecutionContext, algebra: CurveResidueAlgebra, residue: AlgebraicField<CurveBaseResidue>) {
  const b = algebra.base, n = algebra.multiplication.length, d = residue.ring.degree(ctx, residue.modulus); ctx.allocate(n * d);
  return Array.from({length: n}, (_, i) => {
    const vector = Array.from({length: n}, (_, j) => b.fromInteger(ctx, i === j ? 1n : 0n));
    const value = residue.make(ctx, residue.ring.make(ctx, curveResiduePowerCoordinates(ctx, algebra, vector)));
    return Array.from({length: d}, (_, k) => value.representative.coefficients[k] ?? b.fromInteger(ctx, 0n));
  });
}
function residueRequest(ctx: ExecutionContext, algebra: CurveResidueAlgebra, residue: AlgebraicField<CurveBaseResidue>): LinearSystem<CurveBaseResidue> {
  const columns = residueColumns(ctx, algebra, residue), n = columns.length, d = residue.ring.degree(ctx, residue.modulus), b = algebra.base;
  return Object.freeze({rows: d, columns: n, matrix: freezeExactMatrix(ctx, Array.from({length: d}, (_, i) => columns.map(column => column[i]))),
    rhs: Object.freeze(Array<CurveBaseResidue>(d).fill(b.fromInteger(ctx, 0n)))});
}
function primeIdealGenerators(ctx: ExecutionContext, order: AlgebraicCurveOrder, prime: Polynomial<CurveConstant>, algebra: CurveResidueAlgebra,
  kernel: LinearSolution<CurveBaseResidue>) {
  const f = order.lattice.scalar, n = order.lattice.dimension;
  demand(kernel.kind === 'consistent', 'verification-failed', 'residue map homogeneous kernel');
  ctx.allocate((kernel.nullspace.length + n) * n);
  const vectors = kernel.nullspace.map(row => row.map(v => {
    algebra.base.assert(ctx, v); return f.make(ctx, f.ring.make(ctx, v.representative.coefficients), f.ring.one(ctx));
  }));
  const p = f.make(ctx, prime, f.ring.one(ctx));
  for (let i = 0; i < n; i++) vectors.push(Array.from({length: n}, (_, j) => i === j ? p : f.fromInteger(ctx, 0n)));
  return freezeExactMatrix(ctx, vectors);
}
function principalPrime<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, infinity: boolean, prime: Polynomial<CurveConstant>) {
  const order = infinity ? curve.infinity : curve.finite, f = order.lattice.scalar, n = order.lattice.dimension, p = f.make(ctx, prime, f.ring.one(ctx));
  return constructCurveIdeal(ctx, curve, infinity, freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? p : f.fromInteger(ctx, 0n)))));
}
function verifyPlace<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, order: AlgebraicCurveOrder, prime: Polynomial<CurveConstant>,
  algebra: CurveResidueAlgebra, index: number, proof: AlgebraicPlace<E>, bounds: DifferentialBounds): void {
  const factor = component(algebra, index), r = order.lattice.scalar.ring, residue = proof.residue, d = factor.polynomial.ring.degree(ctx, factor.polynomial);
  demand(proof.curve === curve && proof.order === order && proof.algebra === algebra && proof.index === index && r.equal(ctx, proof.prime, prime),
    'domain-mismatch', 'place construction coverage');
  verifyAlgebraicChainWithin(ctx, residue, bounds);
  demand(residue.parent === algebra.base && residue.ring.equal(ctx, residue.modulus, residue.ring.make(ctx, factor.polynomial.coefficients)),
    'verification-failed', 'place irreducible residue field');
  const request = residueRequest(ctx, algebra, residue); verifyLinearSolution(ctx, algebra.base, request, proof.kernel);
  demand(proof.kernel.kind === 'consistent' && proof.kernel.rank === d && proof.kernel.nullspace.length === request.columns - d,
    'verification-failed', 'place complete residue map/kernel');
  assertCurveIdeal(ctx, curve, proof.ideal);
  reconstructCurveIdeal(ctx, curve, order.infinity, primeIdealGenerators(ctx, order, prime, algebra, proof.kernel), proof.ideal.lattice);
  demand(proof.ramification === factor.multiplicity && proof.residueDegree === BigInt(d)
    && proof.degree === ctx.multiply(BigInt(r.degree(ctx, prime)), BigInt(d)), 'verification-failed', 'place ramification/residue/degree');
  // k[tau]/Q_i is a field and the complete surjective map has this kernel;
  // hence the lifted ideal is maximal. Multiplicity in O/pO is its ramification.
}
export function reconstructAlgebraicPlaceWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, order: AlgebraicCurveOrder,
  prime: Polynomial<CurveConstant>, algebra: CurveResidueAlgebra, index: number, proof: Omit<AlgebraicPlace<E>, 'curve' | 'order' | 'prime' | 'algebra' | 'index'>,
  bounds: DifferentialBounds): AlgebraicPlace<E> {
  const place = Object.freeze({curve, order, prime, algebra, index, ...proof}); verifyPlace(ctx, curve, order, prime, algebra, index, place, bounds);
  places.add(place); return place;
}
export function decomposeAlgebraicPlacesWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: Polynomial<CurveConstant>, infinity: boolean,
  bounds: DifferentialBounds): AlgebraicPlaceDecomposition<E> {
  assertAlgebraicCurveOwner(ctx, curve); const order = infinity ? curve.infinity : curve.finite, r = order.lattice.scalar.ring;
  r.assert(ctx, input); demand(r.degree(ctx, input) > 0, 'invalid-input', 'nonconstant base prime');
  const normalization = r.leading(ctx, input), prime = r.scale(ctx, input, r.domain.inverse(ctx, normalization));
  if (infinity) demand(r.equal(ctx, prime, r.make(ctx, [r.domain.fromInteger(ctx, 0n), r.domain.fromInteger(ctx, 1n)])), 'invalid-input', 'infinity localized at u=0');
  const algebra = constructCurveResidueAlgebra(ctx, order, prime, bounds);
  demand(algebra.factorization.kind === 'factorization', 'verification-failed', 'residue component coverage');
  const result = algebra.factorization.factors.map((factor, index) => {
    const residueRing = new PolynomialRing(algebra.base, 'sigma'), residue = constructAlgebraicExtensionWithin(ctx, residueRing, residueRing.make(ctx, factor.polynomial.coefficients), bounds);
    const kernel = solveLinearSystem(ctx, algebra.base, residueRequest(ctx, algebra, residue)), vectors = primeIdealGenerators(ctx, order, prime, algebra, kernel);
    const ideal = constructCurveIdeal(ctx, curve, infinity, vectors), residueDegree = BigInt(residue.ring.degree(ctx, residue.modulus));
    return reconstructAlgebraicPlaceWithin(ctx, curve, order, prime, algebra, index, {residue, kernel, ideal, ramification: factor.multiplicity,
      residueDegree, degree: ctx.multiply(BigInt(r.degree(ctx, prime)), residueDegree)}, bounds);
  });
  const unit = unitCurveIdeal(ctx, curve, infinity), products: CurveIdealProduct<E>[] = []; let product = unit;
  for (const place of result) for (let k = 0n; k < place.ramification; k = ctx.add(k, 1n)) {
    const proof = multiplyCurveIdeals(ctx, curve, product, place.ideal); ctx.allocate(1); products.push(proof); product = proof.result;
  }
  const principal = principalPrime(ctx, curve, infinity, prime);
  const proof = Object.freeze({curve, infinity, input, normalization, prime, algebra, places: Object.freeze(result), unit, products: Object.freeze(products), principal});
  verifyAlgebraicPlaceDecompositionWithin(ctx, curve, input, infinity, proof, bounds); return proof;
}
export function verifyAlgebraicPlaceDecompositionWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: Polynomial<CurveConstant>, infinity: boolean,
  proof: AlgebraicPlaceDecomposition<E>, bounds: DifferentialBounds): void {
  assertAlgebraicCurveOwner(ctx, curve); const order = infinity ? curve.infinity : curve.finite, r = order.lattice.scalar.ring;
  demand(proof.curve === curve && proof.infinity === infinity && r.equal(ctx, proof.input, input)
    && r.domain.equal(ctx, proof.normalization, r.leading(ctx, input)) && r.equal(ctx, r.scale(ctx, proof.prime, proof.normalization), input),
    'verification-failed', 'place decomposition exact request');
  if (infinity) demand(r.equal(ctx, proof.prime, r.make(ctx, [r.domain.fromInteger(ctx, 0n), r.domain.fromInteger(ctx, 1n)])), 'verification-failed', 'infinity point coverage');
  verifyCurveResidueAlgebra(ctx, order, proof.prime, proof.algebra, bounds);
  demand(proof.algebra.factorization.kind === 'factorization' && proof.places.length === proof.algebra.factorization.factors.length, 'verification-failed', 'all places covered');
  let covered = 0n;
  for (let i = 0; i < proof.places.length; i++) {
    assertAlgebraicPlace(ctx, curve, proof.places[i]); verifyPlace(ctx, curve, order, proof.prime, proof.algebra, i, proof.places[i], bounds);
    covered = ctx.add(covered, ctx.multiply(proof.places[i].ramification, proof.places[i].residueDegree));
  }
  demand(covered === BigInt(order.lattice.dimension), 'verification-failed', 'complete sum of ramification times residue degrees');
  let product = proof.unit, index = 0; assertCurveIdeal(ctx, curve, product);
  const f = order.lattice.scalar, n = order.lattice.dimension;
  const identity = freezeExactMatrix(ctx, Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => f.fromInteger(ctx, i === j ? 1n : 0n))));
  reconstructCurveIdeal(ctx, curve, infinity, identity, product.lattice);
  for (const place of proof.places) for (let k = 0n; k < place.ramification; k = ctx.add(k, 1n)) {
    demand(index < proof.products.length, 'verification-failed', 'missing prime product coverage');
    verifyCurveIdealProduct(ctx, curve, product, place.ideal, proof.products[index]); product = proof.products[index++].result;
  }
  demand(index === proof.products.length, 'verification-failed', 'excess prime product coverage');
  const p = f.make(ctx, proof.prime, f.ring.one(ctx)), principalInput = identity.map(row => row.map(v => f.multiply(ctx, p, v)));
  reconstructCurveIdeal(ctx, curve, infinity, principalInput, proof.principal.lattice);
  demand(equalCurveIdeals(ctx, curve, product, proof.principal), 'verification-failed', 'complete base prime ideal product');
}
export function evaluateAlgebraicPlaceIntegral<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, place: AlgebraicPlace<E>, value: E): CurvePlaceResidue {
  assertAlgebraicPlace(ctx, curve, place); const b = place.algebra.base;
  const coordinates = curveOrderCoordinates(ctx, curve.coordinates, place.order, value).map(v => {
    const numerator = residueCurvePolynomial(ctx, b, v.numerator), denominator = residueCurvePolynomial(ctx, b, v.denominator);
    return b.exactDivide(ctx, numerator, denominator);
  });
  return place.residue.make(ctx, place.residue.ring.make(ctx, curveResiduePowerCoordinates(ctx, place.algebra, coordinates)));
}
export function decomposeAlgebraicPlaces<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: Polynomial<CurveConstant>, infinity: boolean, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return decomposeAlgebraicPlacesWithin(ctx, curve, input, infinity, bounds); });
}
export function verifyAlgebraicPlaceDecomposition<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, input: Polynomial<CurveConstant>, infinity: boolean,
  proof: AlgebraicPlaceDecomposition<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicPlaceDecompositionWithin(ctx, curve, input, infinity, proof, bounds); });
}
