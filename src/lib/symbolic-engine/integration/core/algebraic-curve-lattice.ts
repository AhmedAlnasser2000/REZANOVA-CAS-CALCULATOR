import { demand, type ExecutionContext } from './execution';
import { PolynomialRing, type Polynomial } from './polynomial';
import { RationalFunctionField } from './rational-function';
import { extendedGcd, exactDivide, verifyBezout, type Bezout } from './polynomial-division';
import { polynomialModuleHermite, verifyPolynomialModuleHermite, type PolynomialModuleEvidence } from './polynomial-module';
import { freezeExactMatrix, transposeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, equalExactMatrices,
  type ExactMatrix, type MatrixInverse } from './algebraic-matrix';
import type { CurveConstant, CurveScalar } from './algebraic-curve-coordinates';

export interface CurveDenominators {
  readonly input: readonly Polynomial<CurveConstant>[];
  readonly steps: readonly Readonly<{gcd: Bezout<CurveConstant>; left: Polynomial<CurveConstant>; right: Polynomial<CurveConstant>; next: Polynomial<CurveConstant>}>[];
  readonly common: Polynomial<CurveConstant>;
}
export function curveDenominators(ctx: ExecutionContext, r: PolynomialRing<CurveConstant>, input: readonly Polynomial<CurveConstant>[]): CurveDenominators {
  ctx.allocate(input.length * 2); let common = r.one(ctx); const steps: CurveDenominators['steps'][number][] = [];
  for (const d of input) {
    const gcd = extendedGcd(ctx, r, common, d), left = exactDivide(ctx, r, common, gcd.gcd), right = exactDivide(ctx, r, d, gcd.gcd);
    common = r.multiply(ctx, left, d); steps.push(Object.freeze({gcd, left, right, next: common}));
  }
  const proof = Object.freeze({input: Object.freeze([...input]), steps: Object.freeze(steps), common});
  verifyCurveDenominators(ctx, r, input, proof); return proof;
}
export function verifyCurveDenominators(ctx: ExecutionContext, r: PolynomialRing<CurveConstant>, input: readonly Polynomial<CurveConstant>[], proof: CurveDenominators): void {
  demand(proof.input.length === input.length && proof.steps.length === input.length, 'verification-failed', 'curve denominator coverage');
  let common = r.one(ctx);
  for (let i = 0; i < input.length; i++) {
    const d = input[i], s = proof.steps[i]; r.assert(ctx, d);
    demand(!r.isZero(ctx, d) && r.domain.equal(ctx, r.leading(ctx, d), r.domain.fromInteger(ctx, 1n)) && r.equal(ctx, d, proof.input[i]), 'verification-failed', 'curve monic denominator');
    verifyBezout(ctx, r, common, d, s.gcd);
    demand(r.equal(ctx, r.multiply(ctx, s.gcd.gcd, s.left), common) && r.equal(ctx, r.multiply(ctx, s.gcd.gcd, s.right), d)
      && r.equal(ctx, r.multiply(ctx, s.left, d), s.next), 'verification-failed', 'curve LCM identities');
    common = s.next;
  }
  demand(r.equal(ctx, common, proof.common), 'verification-failed', 'curve denominator reconstruction');
}

/** Row bases in a fixed C(x) coordinate system. Complete Hermite coverage
 * proves the entire polynomial span, including dependent supplied generators. */
export interface CurveLattice {
  readonly scalar: RationalFunctionField<CurveConstant>;
  readonly dimension: number;
  readonly input: ExactMatrix<CurveScalar>;
  readonly denominators: CurveDenominators;
  readonly hermite: PolynomialModuleEvidence<CurveConstant>;
  readonly basis: ExactMatrix<CurveScalar>;
  readonly inverse: MatrixInverse<CurveScalar>;
}
function latticeInput(ctx: ExecutionContext, f: RationalFunctionField<CurveConstant>, input: ExactMatrix<CurveScalar>, n: number, common: Polynomial<CurveConstant>) {
  demand(Number.isSafeInteger(n) && n > 0 && Number.isSafeInteger(input.length * n), 'invalid-input', 'curve lattice dimensions'); ctx.allocate(input.length * n);
  return Object.freeze(input.map(row => {
    demand(row.length === n, 'invalid-input', 'curve lattice row coverage');
    return Object.freeze(row.map(v => { f.assert(ctx, v); return f.ring.multiply(ctx, v.numerator, exactDivide(ctx, f.ring, common, v.denominator)); }));
  }));
}
export function constructCurveLattice(ctx: ExecutionContext, f: RationalFunctionField<CurveConstant>, input: ExactMatrix<CurveScalar>, n: number): CurveLattice {
  const denominators = curveDenominators(ctx, f.ring, input.flatMap(row => row.map(v => { f.assert(ctx, v); return v.denominator; })));
  const hermite = polynomialModuleHermite(ctx, f.ring, latticeInput(ctx, f, input, n, denominators.common), n);
  demand(hermite.pivots.length === n, 'invalid-input', 'full rank fractional lattice required');
  const basis = freezeExactMatrix(ctx, hermite.reduced.slice(0, n).map(row => row.map(p => f.make(ctx, p, denominators.common))));
  const inverse = invertExactMatrix(ctx, f, transposeExactMatrix(ctx, basis, n)); demand(inverse !== null, 'verification-failed', 'curve lattice independence');
  const proof = Object.freeze({scalar: f, dimension: n, input: freezeExactMatrix(ctx, input.map(row => [...row])), denominators, hermite, basis, inverse});
  verifyCurveLattice(ctx, f, input, n, proof); return proof;
}
export function verifyCurveLattice(ctx: ExecutionContext, f: RationalFunctionField<CurveConstant>, input: ExactMatrix<CurveScalar>, n: number, proof: CurveLattice): void {
  demand(proof.scalar === f && proof.dimension === n, 'domain-mismatch', 'curve lattice owner');
  demand(equalExactMatrices(ctx, f, input, proof.input), 'verification-failed', 'curve lattice exact input');
  verifyCurveDenominators(ctx, f.ring, input.flatMap(row => row.map(v => { f.assert(ctx, v); return v.denominator; })), proof.denominators);
  const matrix = latticeInput(ctx, f, input, n, proof.denominators.common);
  verifyPolynomialModuleHermite(ctx, f.ring, matrix, n, proof.hermite);
  demand(proof.hermite.pivots.length === n && proof.basis.length === n, 'verification-failed', 'curve lattice complete rank');
  const basis = proof.hermite.reduced.slice(0, n).map(row => row.map(p => f.make(ctx, p, proof.denominators.common)));
  demand(equalExactMatrices(ctx, f, basis, proof.basis), 'verification-failed', 'curve lattice basis reconstruction');
  verifyExactMatrixInverse(ctx, f, transposeExactMatrix(ctx, proof.basis, n), proof.inverse);
}
export function curveLatticeCoordinates(ctx: ExecutionContext, proof: CurveLattice, vector: readonly CurveScalar[]): readonly CurveScalar[] {
  const f = proof.scalar, n = proof.dimension;
  demand(vector.length === n, 'invalid-input', 'curve lattice coordinate size'); ctx.allocate(n);
  for (const v of vector) f.assert(ctx, v);
  return Object.freeze(proof.inverse.inverse.map(row => {
    let out = f.fromInteger(ctx, 0n); for (let j = 0; j < n; j++) out = f.add(ctx, out, f.multiply(ctx, row[j], vector[j])); return out;
  }));
}

export interface CurveLatticeIntersection {
  readonly kernel: PolynomialModuleEvidence<CurveConstant>;
  readonly denominators: CurveDenominators;
  readonly result: CurveLattice;
}
function intersectionInput(ctx: ExecutionContext, a: CurveLattice, b: CurveLattice, d: Polynomial<CurveConstant>) {
  demand(a.scalar === b.scalar && a.dimension === b.dimension, 'domain-mismatch', 'curve intersection chart');
  return latticeInput(ctx, a.scalar, [...a.basis, ...b.basis.map(row => row.map(v => a.scalar.negate(ctx, v)))], a.dimension, d);
}
function intersectionGenerators(ctx: ExecutionContext, a: CurveLattice, kernel: PolynomialModuleEvidence<CurveConstant>): ExactMatrix<CurveScalar> {
  const f = a.scalar, n = a.dimension; ctx.allocate(kernel.transformation.length * n);
  return freezeExactMatrix(ctx, kernel.transformation.slice(kernel.pivots.length).map(row => Array.from({length: n}, (_, j) => {
    let out = f.fromInteger(ctx, 0n);
    for (let i = 0; i < n; i++) out = f.add(ctx, out, f.multiply(ctx, f.make(ctx, row[i], f.ring.one(ctx)), a.basis[i][j])); return out;
  })));
}
export function intersectCurveLattices(ctx: ExecutionContext, a: CurveLattice, b: CurveLattice): CurveLatticeIntersection {
  const f = a.scalar, denominators = curveDenominators(ctx, f.ring, [...a.basis, ...b.basis].flatMap(row => row.map(v => v.denominator)));
  const kernel = polynomialModuleHermite(ctx, f.ring, intersectionInput(ctx, a, b, denominators.common), a.dimension);
  const result = constructCurveLattice(ctx, f, intersectionGenerators(ctx, a, kernel), a.dimension);
  const proof = Object.freeze({denominators, kernel, result}); verifyCurveLatticeIntersection(ctx, a, b, proof); return proof;
}
export function verifyCurveLatticeIntersection(ctx: ExecutionContext, a: CurveLattice, b: CurveLattice, proof: CurveLatticeIntersection): void {
  const f = a.scalar;
  verifyCurveDenominators(ctx, f.ring, [...a.basis, ...b.basis].flatMap(row => row.map(v => v.denominator)), proof.denominators);
  verifyPolynomialModuleHermite(ctx, f.ring, intersectionInput(ctx, a, b, proof.denominators.common), a.dimension, proof.kernel);
  // All zero rows of the unimodular transform span the full module kernel.
  // Their first blocks map onto exactly A intersect B in both directions.
  verifyCurveLattice(ctx, f, intersectionGenerators(ctx, a, proof.kernel), a.dimension, proof.result);
}

/** Complete inverse image of C[x]^r under a full-column-rank rational matrix.
 * HNF of the cleared row span proves T v polynomial iff H v / d polynomial. */
export interface CurveLatticePreimage {
  readonly rows: CurveLattice;
  readonly result: CurveLattice;
}
function preimageGenerators(ctx: ExecutionContext, rows: CurveLattice): ExactMatrix<CurveScalar> {
  // rows.inverse inverts the transpose; its rows are columns of H^{-1}d.
  return freezeExactMatrix(ctx, rows.inverse.inverse.map(row => [...row]));
}
export function preimageCurveLattice(ctx: ExecutionContext, f: RationalFunctionField<CurveConstant>, matrix: ExactMatrix<CurveScalar>, n: number): CurveLatticePreimage {
  const rows = constructCurveLattice(ctx, f, matrix, n), result = constructCurveLattice(ctx, f, preimageGenerators(ctx, rows), n);
  const proof = Object.freeze({rows, result}); verifyCurveLatticePreimage(ctx, f, matrix, n, proof); return proof;
}
export function verifyCurveLatticePreimage(ctx: ExecutionContext, f: RationalFunctionField<CurveConstant>, matrix: ExactMatrix<CurveScalar>, n: number, proof: CurveLatticePreimage): void {
  verifyCurveLattice(ctx, f, matrix, n, proof.rows);
  verifyCurveLattice(ctx, f, preimageGenerators(ctx, proof.rows), n, proof.result);
}
