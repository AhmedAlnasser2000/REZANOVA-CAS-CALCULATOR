import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { constructAlgebraicExtensionWithin, type AlgebraicElement, type AlgebraicField } from './algebraic-field';
import { verifyAlgebraicChainWithin } from './algebraic-derivative';
import { factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization } from './algebraic-factorization';
import { freezeExactMatrix, transposeExactMatrix, invertExactMatrix, verifyExactMatrixInverse, type ExactMatrix, type MatrixInverse } from './algebraic-matrix';
import type { AlgebraicCurveOrder } from './algebraic-curve';
import type { CurveConstant } from './algebraic-curve-coordinates';

export type CurveBaseResidue = AlgebraicElement<CurveConstant>;
export type CurvePlaceResidue = AlgebraicElement<CurveBaseResidue>;
export interface CurveResidueAlgebra {
  readonly base: AlgebraicField<CurveConstant>;
  readonly multiplication: readonly ExactMatrix<CurveBaseResidue>[];
  readonly seed: bigint;
  readonly primitive: readonly CurveBaseResidue[];
  readonly powers: readonly (readonly CurveBaseResidue[])[];
  readonly inverse: MatrixInverse<CurveBaseResidue>;
  readonly relation: Polynomial<CurveBaseResidue>;
  readonly factorization: AlgebraicFactorization<CurveBaseResidue>;
}

export function residueCurvePolynomial(ctx: ExecutionContext, base: AlgebraicField<CurveConstant>, p: Polynomial<CurveConstant>): CurveBaseResidue {
  p.ring.assert(ctx, p); demand(p.ring.domain === base.parent, 'domain-mismatch', 'curve residue constant map');
  return base.make(ctx, base.ring.make(ctx, p.coefficients));
}
function tables(ctx: ExecutionContext, order: AlgebraicCurveOrder, base: AlgebraicField<CurveConstant>) {
  const n = order.lattice.dimension; ctx.allocate(n * n * n);
  return Object.freeze(order.multiplication.map(matrix => freezeExactMatrix(ctx, matrix.map(row => row.map(p => residueCurvePolynomial(ctx, base, p))))));
}
function multiply(ctx: ExecutionContext, base: AlgebraicField<CurveConstant>, multiplication: readonly ExactMatrix<CurveBaseResidue>[],
  a: readonly CurveBaseResidue[], b: readonly CurveBaseResidue[]): readonly CurveBaseResidue[] {
  const n = multiplication.length;
  demand(a.length === n && b.length === n, 'verification-failed', 'residue algebra product coverage'); ctx.allocate(n);
  return Object.freeze(Array.from({length: n}, (_, k) => {
    let out = base.fromInteger(ctx, 0n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out = base.add(ctx, out, base.multiply(ctx, base.multiply(ctx, a[i], b[j]), multiplication[i][k][j]));
    return out;
  }));
}
function equality(ctx: ExecutionContext, base: AlgebraicField<CurveConstant>, a: readonly CurveBaseResidue[], b: readonly CurveBaseResidue[]): boolean {
  return a.length === b.length && a.every((v, i) => base.equal(ctx, v, b[i]));
}
export function curveResiduePowerCoordinates(ctx: ExecutionContext, proof: CurveResidueAlgebra, vector: readonly CurveBaseResidue[]): readonly CurveBaseResidue[] {
  const base = proof.base, n = proof.multiplication.length; demand(vector.length === n, 'invalid-input', 'residue vector coverage'); ctx.allocate(n);
  for (const v of vector) base.assert(ctx, v);
  return Object.freeze(proof.inverse.inverse.map(row => {
    let out = base.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) out = base.add(ctx, out, base.multiply(ctx, row[i], vector[i])); return out;
  }));
}
function oneVector(ctx: ExecutionContext, order: AlgebraicCurveOrder, base: AlgebraicField<CurveConstant>) {
  const f = order.lattice.scalar, n = order.lattice.dimension, one = Array(n).fill(f.fromInteger(ctx, 0n)); ctx.allocate(n);
  one[0] = f.fromInteger(ctx, 1n);
  // The curve power basis starts with one. Convert that to the integral basis.
  return Object.freeze(order.lattice.inverse.inverse.map(row => {
    let out = f.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) out = f.add(ctx, out, f.multiply(ctx, row[i], one[i]));
    demand(f.ring.degree(ctx, out.denominator) === 0, 'verification-failed', 'one integral residue coordinates');
    return residueCurvePolynomial(ctx, base, out.numerator);
  }));
}
function primitive(ctx: ExecutionContext, base: AlgebraicField<CurveConstant>, seed: bigint, n: number) {
  ctx.integer(seed); demand(seed > 0n, 'verification-failed', 'residue primitive seed'); ctx.allocate(n);
  let power = 1n;
  return Object.freeze(Array.from({length: n}, () => { const out = base.fromInteger(ctx, power); power = ctx.multiply(power, seed); return out; }));
}
export function constructCurveResidueAlgebra(ctx: ExecutionContext, order: AlgebraicCurveOrder, prime: Polynomial<CurveConstant>, bounds: DifferentialBounds): CurveResidueAlgebra {
  const r = order.lattice.scalar.ring; r.assert(ctx, prime);
  const residueRing = new PolynomialRing(r.domain, 'rho'), base = constructAlgebraicExtensionWithin(ctx, residueRing, residueRing.make(ctx, prime.coefficients), bounds);
  const multiplication = tables(ctx, order, base), n = order.lattice.dimension, one = oneVector(ctx, order, base), relationRing = new PolynomialRing(base, 'tau');
  let seed = 1n;
  for (;;) {
    const generator = primitive(ctx, base, seed, n), powers: (readonly CurveBaseResidue[])[] = []; let power = one;
    for (let i = 0; i < n; i++) { ctx.allocate(1); powers.push(power); power = multiply(ctx, base, multiplication, power, generator); }
    const matrix = transposeExactMatrix(ctx, powers, n), inverse = invertExactMatrix(ctx, base, matrix);
    if (inverse === null) { seed = ctx.add(seed, 1n); continue; }
    const coefficients = inverse.inverse.map(row => {
      let out = base.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) out = base.add(ctx, out, base.multiply(ctx, row[i], power[i])); return base.negate(ctx, out);
    });
    const relation = relationRing.make(ctx, [...coefficients, base.fromInteger(ctx, 1n)]), factorization = factorAlgebraicPolynomialWithin(ctx, relationRing, relation, bounds);
    const proof = Object.freeze({base, multiplication, seed, primitive: generator, powers: Object.freeze(powers), inverse, relation, factorization});
    verifyCurveResidueAlgebra(ctx, order, prime, proof, bounds); return proof;
  }
}
export function verifyCurveResidueAlgebra(ctx: ExecutionContext, order: AlgebraicCurveOrder, prime: Polynomial<CurveConstant>, proof: CurveResidueAlgebra, bounds: DifferentialBounds): void {
  const base = proof.base, r = order.lattice.scalar.ring, n = order.lattice.dimension; r.assert(ctx, prime);
  demand(base.parent === r.domain && base.ring.equal(ctx, base.modulus, base.ring.make(ctx, prime.coefficients)), 'domain-mismatch', 'residue base prime');
  verifyAlgebraicChainWithin(ctx, base, bounds);
  const expected = tables(ctx, order, base);
  demand(proof.multiplication.length === n && proof.powers.length === n, 'verification-failed', 'residue algebra table/power coverage');
  for (let i = 0; i < n; i++) {
    demand(proof.multiplication[i].length === n && proof.multiplication[i].every((row, j) => equality(ctx, base, row, expected[i][j])), 'verification-failed', 'residue multiplication identities');
  }
  const generator = primitive(ctx, base, proof.seed, n);
  demand(equality(ctx, base, generator, proof.primitive), 'verification-failed', 'residue primitive correspondence');
  let power = oneVector(ctx, order, base);
  for (let i = 0; i < n; i++) { demand(equality(ctx, base, power, proof.powers[i]), 'verification-failed', 'residue complete powers'); power = multiply(ctx, base, expected, power, generator); }
  verifyExactMatrixInverse(ctx, base, transposeExactMatrix(ctx, proof.powers, n), proof.inverse);
  const coefficients = curveResiduePowerCoordinates(ctx, proof, power), ring = proof.relation.ring;
  demand(ring.domain === base && ring.degree(ctx, proof.relation) === n && base.equal(ctx, ring.leading(ctx, proof.relation), base.fromInteger(ctx, 1n)),
    'verification-failed', 'residue algebra defining degree');
  for (let i = 0; i < n; i++) demand(base.equal(ctx, proof.relation.coefficients[i] ?? base.fromInteger(ctx, 0n), base.negate(ctx, coefficients[i])),
    'verification-failed', 'residue defining reconstruction');
  verifyAlgebraicFactorizationWithin(ctx, ring, proof.relation, proof.factorization, bounds);
  demand(proof.factorization.kind === 'factorization', 'verification-failed', 'nonzero residue algebra relation');
  let covered = 0n;
  for (const factor of proof.factorization.factors) covered = ctx.add(covered, ctx.multiply(factor.multiplicity, BigInt(ring.degree(ctx, factor.polynomial))));
  demand(covered === BigInt(n), 'verification-failed', 'residue ramification/degree coverage');
  // Complete power rank identifies O/pO with k[tau]/relation, as rings even
  // when ramified. Each irreducible factor gives a field; its multiplicity is e.
}
