import { demand, type ExecutionContext } from './execution';
import { PositivePolynomialRing, type PositivePolynomial } from './positive-polynomial';
import { PositiveFiniteExtension, finiteIrreducibility, type FiniteExtensionValue } from './positive-extension';
import { factorPositivePolynomial, verifyPositiveFactorization, type PositiveFactorization } from './positive-factorization';
import { solveArithmeticLinearSystem, verifyArithmeticLinearSolution, type LinearSolution } from './arithmetic-linear';
import { freezeExactMatrix, transposeExactMatrix, invertArithmeticMatrix, verifyArithmeticMatrixInverse, type ExactMatrix, type MatrixInverse } from './arithmetic-matrix';
import { reconstructReducedIdeal, constructReducedIdeal, equalReducedIdeals, multiplyReducedIdeals, verifyReducedIdealProduct, reducedUnitIdeal, verifyReducedUnitIdeal, type ReducedIdeal, type ReducedIdealProduct } from './reduced-ideal';
import type { ReducedCurveOrder, ReducedCurveView } from './reduced-curve';

export interface ReducedResidueAlgebra<E> { readonly base: PositiveFiniteExtension<E>; readonly tables: readonly ExactMatrix<FiniteExtensionValue<E>>[];
  readonly seed: bigint; readonly primitive: readonly FiniteExtensionValue<E>[]; readonly powers: ExactMatrix<FiniteExtensionValue<E>>; readonly inverse: MatrixInverse<FiniteExtensionValue<E>>;
  readonly relation: PositivePolynomial<FiniteExtensionValue<E>>; readonly factors: PositiveFactorization<FiniteExtensionValue<E>> }
export interface ReducedPlace<E> { readonly curve: ReducedCurveView<E>; readonly order: ReducedCurveOrder<E>; readonly prime: PositivePolynomial<E>; readonly algebra: ReducedResidueAlgebra<E>; readonly index: number;
  readonly residue: PositiveFiniteExtension<FiniteExtensionValue<E>>; readonly kernel: LinearSolution<FiniteExtensionValue<E>>; readonly ideal: ReducedIdeal<E>; readonly ramification: bigint; readonly residueDegree: bigint; readonly degree: bigint }
export interface ReducedPlaceDecomposition<E> { readonly curve: ReducedCurveView<E>; readonly infinity: boolean; readonly prime: PositivePolynomial<E>; readonly algebra: ReducedResidueAlgebra<E>; readonly places: readonly ReducedPlace<E>[];
  readonly unit: ReducedIdeal<E>; readonly products: readonly ReducedIdealProduct<E>[]; readonly principal: ReducedIdeal<E> }
const places = new WeakSet<object>();
export function assertReducedPlace<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, place: ReducedPlace<E>): void { ctx.tick(); demand(place !== null && typeof place === 'object' && places.has(place) && place.curve === curve, 'domain-mismatch', 'owned reduced place'); }
function residuePolynomial<E>(ctx: ExecutionContext, f: PositiveFiniteExtension<E>, p: PositivePolynomial<E>) { demand(p.ring.field === f.parent, 'domain-mismatch', 'finite residue coefficients'); return f.make(ctx, f.ring.make(ctx, p.coefficients)); }
function ringTables<E>(ctx: ExecutionContext, order: ReducedCurveOrder<E>, base: PositiveFiniteExtension<E>) { return Object.freeze(order.multiplication.map(matrix => freezeExactMatrix(ctx, matrix.map(row => row.map(p => residuePolynomial(ctx, base, p)))))); }
function vectorProduct<E>(ctx: ExecutionContext, base: PositiveFiniteExtension<E>, tables: readonly ExactMatrix<FiniteExtensionValue<E>>[], a: readonly FiniteExtensionValue<E>[], b: readonly FiniteExtensionValue<E>[]) {
  const n = tables.length; demand(a.length === n && b.length === n, 'verification-failed', 'reduced residue product coverage'); ctx.allocate(n);
  return Object.freeze(Array.from({length: n}, (_, k) => { let out = base.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out = base.add(ctx, out, base.multiply(ctx, base.multiply(ctx, a[i], b[j]), tables[i][k][j])); return out; }));
}
function one<E>(ctx: ExecutionContext, order: ReducedCurveOrder<E>, base: PositiveFiniteExtension<E>) { const f = order.lattice.field; return Object.freeze(order.lattice.inverse.inverse.map(row => { const v = row[0]; demand(f.ring.degree(ctx, v.denominator) === 0, 'verification-failed', 'reduced one residue coordinates'); return residuePolynomial(ctx, base, v.numerator); })); }
function seedVector<E>(ctx: ExecutionContext, base: PositiveFiniteExtension<E>, seed: bigint, n: number) { ctx.integer(seed);ctx.allocate(n);
  if(seed<0n){const index=ctx.add(-seed,-1n);demand(index<base.size,'verification-failed','finite moment generator index');const value=base.element(ctx,index);let power=base.fromInteger(ctx,1n);return Object.freeze(Array.from({length:n},()=>{const out=power;power=base.multiply(ctx,power,value);return out;}));}
  let remaining = seed;
  const result = Object.freeze(Array.from({length: n}, () => { const out = base.element(ctx, ctx.remainder(remaining, base.size)); remaining = ctx.quotient(remaining, base.size); return out; })); demand(remaining === 0n, 'verification-failed', 'finite complete generator enumeration index'); return result; }
export function reducedResidueCoordinates<E>(ctx: ExecutionContext, algebra: ReducedResidueAlgebra<E>, vector: readonly FiniteExtensionValue<E>[]) { const f = algebra.base, n = algebra.tables.length; demand(vector.length === n, 'verification-failed', 'finite residue coordinate dimensions'); return Object.freeze(algebra.inverse.inverse.map(row => { let value = f.fromInteger(ctx, 0n); for (let i = 0; i < n; i++) value = f.add(ctx, value, f.multiply(ctx, row[i], vector[i])); return value; })); }
function residueAlgebra<E>(ctx: ExecutionContext, order: ReducedCurveOrder<E>, prime: PositivePolynomial<E>, curve: ReducedCurveView<E>): ReducedResidueAlgebra<E> {
  const field = curve.algebra.constants, r = new PositivePolynomialRing(field, 'rho'), modulus = r.make(ctx, prime.coefficients), base = new PositiveFiniteExtension(ctx, field, r, modulus, finiteIrreducibility(ctx, r, modulus, field.size));
  const tables = ringTables(ctx, order, base), n = tables.length, ring = new PositivePolynomialRing(base, 'tau'); let limit = 1n; for (let i = 0; i < n; i++) limit = ctx.multiply(limit, base.size);
  // Deterministic moment combinations usually find a cyclic element directly,
  // even over a large nonrational residue field. If they do not, the subsequent
  // full finite coefficient enumeration supplies unconditional coverage.
  const total=ctx.add(base.size,limit);
  for(let attempt=0n;attempt<total;attempt=ctx.add(attempt,1n)){
    const seed=attempt<base.size?-ctx.add(attempt,1n):ctx.add(attempt,-base.size);
    const primitive = seedVector(ctx, base, seed, n), powers: (readonly FiniteExtensionValue<E>[])[] = []; let power = one(ctx, order, base); ctx.allocate(n);
    for (let i = 0; i < n; i++) { powers.push(power); power = vectorProduct(ctx, base, tables, power, primitive); }
    const inverse = invertArithmeticMatrix(ctx, base, transposeExactMatrix(ctx, powers, n)); if (inverse === null) continue;
    const partial = {base, tables, seed, primitive, powers: Object.freeze(powers), inverse} as ReducedResidueAlgebra<E>, cs = reducedResidueCoordinates(ctx, partial, power);
    const relation = ring.make(ctx, [...cs.map(c => base.negate(ctx, c)), base.fromInteger(ctx, 1n)]), factors = factorPositivePolynomial(ctx, base, ring, relation);
    const proof = Object.freeze({...partial, relation, factors}); verifyReducedResidueAlgebra(ctx, order, prime, curve, proof); return proof;
  }
  demand(false, 'verification-failed', 'complete tame residue generator enumeration');
}
export function verifyReducedResidueAlgebra<E>(ctx: ExecutionContext, order: ReducedCurveOrder<E>, prime: PositivePolynomial<E>, curve: ReducedCurveView<E>, proof: ReducedResidueAlgebra<E>): void {
  const base = proof.base, n = curve.algebra.dimension; demand(base.parent === curve.algebra.constants && base.ring.equal(ctx, base.modulus, base.ring.make(ctx, prime.coefficients)), 'domain-mismatch', 'complete finite residue base');
  const expected = ringTables(ctx, order, base), equal = (a: readonly FiniteExtensionValue<E>[], b: readonly FiniteExtensionValue<E>[]) => a.length === b.length && a.every((v, i) => base.equal(ctx, v, b[i]));
  demand(proof.tables.length === n && proof.tables.every((m, i) => m.length === n && m.every((row, j) => equal(row, expected[i][j]))), 'verification-failed', 'finite residue multiplication coverage');
  const primitive = seedVector(ctx, base, proof.seed, n); demand(equal(primitive, proof.primitive) && proof.powers.length === n, 'verification-failed', 'finite residue primitive/powers'); let power = one(ctx, order, base);
  for (let i = 0; i < n; i++) { demand(equal(power, proof.powers[i]), 'verification-failed', 'finite residue complete powers'); power = vectorProduct(ctx, base, expected, power, primitive); }
  verifyArithmeticMatrixInverse(ctx, base, transposeExactMatrix(ctx, proof.powers, n), proof.inverse);
  const r = proof.relation.ring, cs = reducedResidueCoordinates(ctx, proof, power); demand(r.field === base && r.equal(ctx, proof.relation, r.make(ctx, [...cs.map(v => base.negate(ctx, v)), base.fromInteger(ctx, 1n)])), 'verification-failed', 'finite residue relation');
  verifyPositiveFactorization(ctx, base, r, proof.relation, proof.factors); demand(proof.factors.kind === 'factorization', 'verification-failed', 'complete finite residue factors');
  // A product of tame local Artin algebras is monogenic when |k|>n. The finite
  // enumeration covers every coefficient vector; accepted full rank identifies
  // the entire ring, including nilpotents. No failed search proves a field fact.
}
function mapRequest<E>(ctx: ExecutionContext, algebra: ReducedResidueAlgebra<E>, field: PositiveFiniteExtension<FiniteExtensionValue<E>>) {
  const n = algebra.tables.length, d = field.ring.degree(ctx, field.modulus), b = algebra.base, columns = Array.from({length: n}, (_, j) => {
    const unit = Array<FiniteExtensionValue<E>>(n).fill(b.fromInteger(ctx, 0n)); unit[j] = b.fromInteger(ctx, 1n);
    const value = field.make(ctx, field.ring.make(ctx, reducedResidueCoordinates(ctx, algebra, unit))); return Array.from({length: d}, (_, i) => value.polynomial.coefficients[i] ?? b.fromInteger(ctx, 0n));
  }); return Object.freeze({rows: d, columns: n, matrix: transposeExactMatrix(ctx, columns, d), rhs: Object.freeze(Array<FiniteExtensionValue<E>>(d).fill(b.fromInteger(ctx, 0n)))});
}
function idealInput<E>(ctx: ExecutionContext, order: ReducedCurveOrder<E>, prime: PositivePolynomial<E>, kernel: LinearSolution<FiniteExtensionValue<E>>) {
  demand(kernel.kind === 'consistent', 'verification-failed', 'complete finite residue kernel'); const f = order.lattice.field, n = order.lattice.dimension, p = f.make(ctx, prime, f.ring.one(ctx)); ctx.allocate((n + kernel.nullspace.length) * n);
  return freezeExactMatrix(ctx, [...kernel.nullspace.map(row => row.map(v => f.make(ctx, f.ring.make(ctx, v.polynomial.coefficients), f.ring.one(ctx)))), ...Array.from({length: n}, (_, j) => Array.from({length: n}, (_, i) => i === j ? p : f.fromInteger(ctx, 0n)))]);
}
export function reconstructReducedPlace<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, order: ReducedCurveOrder<E>, prime: PositivePolynomial<E>, algebra: ReducedResidueAlgebra<E>, index: number,
  parts: Pick<ReducedPlace<E>, 'residue' | 'kernel' | 'ideal' | 'ramification' | 'residueDegree' | 'degree'>): ReducedPlace<E> {
  demand(algebra.factors.kind === 'factorization' && Number.isSafeInteger(index) && index >= 0 && index < algebra.factors.factors.length, 'verification-failed', 'finite place factor index'); const factor = algebra.factors.factors[index], field = parts.residue, n = curve.algebra.dimension;
  demand(field.parent === algebra.base && field.ring.equal(ctx, field.modulus, field.ring.make(ctx, factor.polynomial.coefficients)), 'domain-mismatch', 'finite place residue construction');
  verifyArithmeticLinearSolution(ctx, algebra.base, mapRequest(ctx, algebra, field), parts.kernel);
  demand(parts.kernel.kind === 'consistent' && parts.kernel.rank === field.ring.degree(ctx, field.modulus) && parts.kernel.nullspace.length === n - parts.kernel.rank, 'verification-failed', 'finite place surjective map/complete kernel');
  reconstructReducedIdeal(ctx, curve.algebra, order, idealInput(ctx, order, prime, parts.kernel), parts.ideal.lattice);
  const residueDegree = BigInt(field.ring.degree(ctx, field.modulus)); demand(parts.ramification === factor.multiplicity && parts.residueDegree === residueDegree && parts.degree === ctx.multiply(residueDegree, BigInt(prime.ring.degree(ctx, prime))), 'verification-failed', 'finite place e/f/degree');
  const place = Object.freeze({curve, order, prime, algebra, index, ...parts}); places.add(place); return place;
}
export function decomposeReducedPlaces<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, prime: PositivePolynomial<E>, infinity: boolean): ReducedPlaceDecomposition<E> {
  const order = infinity ? curve.infinity : curve.finite, r = order.lattice.field.ring; r.assert(ctx, prime);
  if (infinity) demand(r.equal(ctx, prime, r.x(ctx)), 'invalid-input', 'finite infinity chart localized at zero');
  const algebra = residueAlgebra(ctx, order, prime, curve); demand(algebra.factors.kind === 'factorization', 'verification-failed', 'finite place complete factors');
  const result = Object.freeze(algebra.factors.factors.map((factor, index) => {
    const ring = new PositivePolynomialRing(algebra.base, 'sigma'), modulus = ring.make(ctx, factor.polynomial.coefficients);
    const residue = new PositiveFiniteExtension(ctx, algebra.base, ring, modulus, Object.freeze({frobenius: Object.freeze(factor.irreducibility.frobenius.map(v => ring.make(ctx, v.coefficients))), exclusions: Object.freeze(factor.irreducibility.exclusions.map(e => Object.freeze({index:e.index, bezout:Object.freeze({gcd:ring.make(ctx,e.bezout.gcd.coefficients),s:ring.make(ctx,e.bezout.s.coefficients),t:ring.make(ctx,e.bezout.t.coefficients)})})))}));
    const kernel = solveArithmeticLinearSystem(ctx, algebra.base, mapRequest(ctx, algebra, residue)), ideal = constructReducedIdeal(ctx, curve.algebra, order, idealInput(ctx, order, prime, kernel)), residueDegree = BigInt(ring.degree(ctx, modulus));
    return reconstructReducedPlace(ctx, curve, order, prime, algebra, index, {residue, kernel, ideal, ramification:factor.multiplicity, residueDegree, degree:ctx.multiply(residueDegree, BigInt(r.degree(ctx,prime)))});
  }));
  const unit = reducedUnitIdeal(ctx, curve.algebra, order), products: ReducedIdealProduct<E>[] = []; let product = unit;
  for (const place of result) for (let i = 0n; i < place.ramification; i = ctx.add(i, 1n)) { const step = multiplyReducedIdeals(ctx, curve.algebra, product, place.ideal); ctx.allocate(1); products.push(step); product = step.result; }
  const f = order.lattice.field, p = f.make(ctx, prime, r.one(ctx)), principal = constructReducedIdeal(ctx, curve.algebra, order, freezeExactMatrix(ctx, unit.lattice.input.map(row => row.map(v => f.multiply(ctx,v,p)))));
  const proof = Object.freeze({curve,infinity,prime,algebra,places:result,unit,products:Object.freeze(products),principal}); verifyReducedPlaceDecomposition(ctx,curve,prime,infinity,proof); return proof;
}
export function verifyReducedPlaceDecomposition<E>(ctx: ExecutionContext, curve: ReducedCurveView<E>, prime: PositivePolynomial<E>, infinity: boolean, proof: ReducedPlaceDecomposition<E>): void {
  const order = infinity ? curve.infinity : curve.finite, r = order.lattice.field.ring;
  demand(proof.curve === curve && proof.infinity === infinity && r.equal(ctx, prime, proof.prime) && (!infinity || r.equal(ctx,prime,r.x(ctx))), 'domain-mismatch', 'finite place decomposition expected request');
  verifyReducedResidueAlgebra(ctx, order, prime, curve, proof.algebra); demand(proof.algebra.factors.kind === 'factorization' && proof.places.length === proof.algebra.factors.factors.length, 'verification-failed', 'finite place factor coverage');
  let degree = 0n, product = proof.unit, index = 0; verifyReducedUnitIdeal(ctx,curve.algebra,proof.unit);
  for (let i=0;i<proof.places.length;i++) {const place=proof.places[i]; assertReducedPlace(ctx,curve,place); demand(place.order===order && place.algebra===proof.algebra && place.index===i,'domain-mismatch','finite place ordered correspondence');
    reconstructReducedPlace(ctx,curve,order,prime,proof.algebra,i,place); degree=ctx.add(degree,ctx.multiply(place.ramification,place.residueDegree));
    for(let j=0n;j<place.ramification;j=ctx.add(j,1n)){demand(index<proof.products.length,'verification-failed','finite prime product coverage');verifyReducedIdealProduct(ctx,curve.algebra,product,place.ideal,proof.products[index]);product=proof.products[index++].result;}}
  demand(degree===BigInt(curve.algebra.dimension)&&index===proof.products.length,'verification-failed','finite complete sum e f/product');
  const f=order.lattice.field,p=f.make(ctx,prime,r.one(ctx));reconstructReducedIdeal(ctx,curve.algebra,order,freezeExactMatrix(ctx,proof.unit.lattice.input.map(row=>row.map(v=>f.multiply(ctx,v,p)))),proof.principal.lattice);
  demand(equalReducedIdeals(ctx,curve.algebra,product,proof.principal),'verification-failed','finite complete prime ideal product');
}
export function equalReducedPlaces<E>(ctx:ExecutionContext,curve:ReducedCurveView<E>,a:ReducedPlace<E>,b:ReducedPlace<E>){assertReducedPlace(ctx,curve,a);assertReducedPlace(ctx,curve,b);return a.order===b.order&&equalReducedIdeals(ctx,curve.algebra,a.ideal,b.ideal);}
