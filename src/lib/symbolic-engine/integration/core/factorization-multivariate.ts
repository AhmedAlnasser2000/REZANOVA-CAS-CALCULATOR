import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { rational, type Rational } from './rational';
import { PolynomialRing } from './polynomial';
import { extendedGcd } from './polynomial-division';
import { MultivariateRing, type MultivariatePolynomial as P } from './multivariate-polynomial';
import { multivariateContent, verifyMultivariateContent, type MultivariateContent } from './multivariate-gcd';
import { primitiveInteger, integerPolynomial, integerPower, factorCoefficientBound, liftIntegerModularFactors, verifyIntegerModularLift,
  type FactorIntegerIrreducibility } from './factorization-integer';
import { FactorModularRing, FactorPrimeField, isFactorPrime, modularBezout } from './factorization-modular';
import { factorFinitePolynomial } from './factorization-finite';
import { integralSparse, verifyIntegralSparse } from './factorization-conversion';
import { FactorLocalRing, factorLocalIndices, type FactorLocalTerm } from './factorization-local';
import { shiftFactorPolynomial, specializeFactorPolynomial, factorSpecializationPoints, factorPartialDegrees,
  sparseFactorDivide, verifySparseFactorDivision, type FactorSparseDivision } from './factorization-sparse';

export interface FactorMultivariateRecovery {
  readonly raw: P<Rational>;
  readonly content: MultivariateContent<Rational> | null;
  readonly scale: Rational;
  readonly candidate: P<Rational>;
}
export type FactorMultivariateRejection = Readonly<{mask: bigint; recovery: FactorMultivariateRecovery} & (
  | {kind: 'degree'} | {kind: 'division'; division: FactorSparseDivision})>;
export interface FactorMultivariateProof {
  readonly points: readonly bigint[];
  readonly shifted: P<Rational>;
  readonly degrees: readonly number[];
  readonly bound: bigint;
  readonly modular: Omit<FactorIntegerIrreducibility, 'rejected'>;
  readonly inverses: readonly (readonly bigint[])[];
  readonly leadingInverse: readonly FactorLocalTerm[];
  readonly factors: readonly (readonly FactorLocalTerm[])[];
  readonly rejected: readonly FactorMultivariateRejection[];
}
export type FactorMultivariateTree = Readonly<{polynomial: P<Rational>; content: MultivariateContent<Rational>} & (
  | {kind: 'linear'} | {kind: 'split'; left: FactorMultivariateTree; right: FactorMultivariateTree;
      proof: FactorMultivariateProof; selected: {readonly mask: bigint; readonly recovery: FactorMultivariateRecovery; readonly division: FactorSparseDivision}}
  | {kind: 'irreducible'; proof: FactorMultivariateProof})>;
function normBound(ctx: ExecutionContext, p: P<Rational>, degrees: readonly number[]) {
  let norm = 0n; for (const t of p.terms) { demand(t.coefficient.denominator === 1n, 'verification-failed', 'factor integer bound');
    norm = ctx.add(norm, t.coefficient.numerator < 0n ? -t.coefficient.numerator : t.coefficient.numerator); }
  return factorCoefficientBound(ctx, norm, degrees);
}
function choose(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>) {
  const q = new PolynomialRing(Q, 'z');
  for (const points of factorSpecializationPoints(ctx, ring.arity - 1)) {
    const shifted = shiftFactorPolynomial(ctx, ring, input, points), raw = specializeFactorPolynomial(ctx, shifted), cs = primitiveInteger(ctx, raw);
    if (cs.length !== ring.outerDegree(ctx, input) + 1) continue;
    const native = integerPolynomial(ctx, q, cs);
    if (extendedGcd(ctx, q, native, q.derivative(ctx, native)).gcd.coefficients.length !== 1) continue;
    for (let prime = 2n; ; prime = ctx.add(prime, 1n)) {
      if (!isFactorPrime(ctx, prime)) continue;
      const field = new FactorPrimeField(ctx, prime), p = field.make(ctx, cs);
      if (p.coefficients.length !== cs.length || modularBezout(ctx, field, p, field.derivative(ctx, p)).gcd.length !== 1) continue;
      // LC(input)(point) itself, not only its primitive specialization, must be a unit.
      if (field.residue(ctx, raw[raw.length - 1]) === 0n) continue;
      return {points, shifted, cs, finite: factorFinitePolynomial(ctx, field, p)};
    }
  }
  throw Error('unreachable specialization enumeration');
}
function localInput(ctx: ExecutionContext, local: FactorLocalRing, input: P<Rational>) {
  return local.make(ctx, input.terms.map(t => { demand(t.coefficient.denominator === 1n, 'verification-failed', 'local integer input'); return {powers: t.powers, coefficient: t.coefficient.numerator}; }));
}
function leading(ctx: ExecutionContext, local: FactorLocalRing, input: P<Rational>) {
  const degree = input.ring.outerDegree(ctx, input); ctx.allocate(input.terms.length * 2);
  return local.make(ctx, input.terms.filter(t => t.powers[0] === degree).map(t => ({powers: [0, ...t.powers.slice(1)], coefficient: t.coefficient.numerator})));
}
function localProduct(ctx: ExecutionContext, local: FactorLocalRing, factors: readonly (readonly FactorLocalTerm[])[]) {
  let out = local.one(ctx); for (const ts of factors) out = local.multiply(ctx, out, local.bind(ctx, ts)); return out;
}
function seedInverses(ctx: ExecutionContext, modular: Omit<FactorIntegerIrreducibility, 'rejected'>) {
  const last = modular.lifts[modular.lifts.length - 1], r = new FactorModularRing(ctx, last.modulus); ctx.allocate(last.factors.length);
  return Object.freeze(last.factors.map((f, i) => {
    const divisor = r.bind(ctx, f); let other = r.one(ctx);
    for (let j = 0; j < last.factors.length; j++) if (j !== i) other = r.multiply(ctx, other, r.bind(ctx, last.factors[j]));
    let inverse = r.make(ctx, modular.inverses[i].s), power = r.one(ctx), sum = power;
    const error = r.subtract(ctx, r.one(ctx), r.multiplyMod(ctx, other, inverse, divisor));
    for (let k = 1; k < modular.lifts.length; k++) { power = r.multiplyMod(ctx, power, error, divisor); sum = r.add(ctx, sum, power); }
    inverse = r.multiplyMod(ctx, inverse, sum, divisor);
    demand(r.equal(ctx, r.multiplyMod(ctx, other, inverse, divisor), r.one(ctx)), 'verification-failed', 'local seed inverse'); return inverse.coefficients;
  }));
}
function liftMultivariate(ctx: ExecutionContext, shifted: P<Rational>, degrees: readonly number[], modular: Omit<FactorIntegerIrreducibility, 'rejected'>) {
  const last = modular.lifts[modular.lifts.length - 1], local = new FactorLocalRing(ctx, last.modulus, degrees.slice(1)), r = local.scalars;
  const lc = leading(ctx, local, shifted), leadingInverse = local.inverseCoefficient(ctx, lc);
  const target = local.multiply(ctx, localInput(ctx, local, shifted), leadingInverse), inverses = seedInverses(ctx, modular);
  const zero = Array(degrees.length - 1).fill(0); ctx.allocate(zero.length + last.factors.length);
  let factors = last.factors.map(f => local.univariate(ctx, f, zero));
  for (const powers of factorLocalIndices(ctx, degrees.slice(1))) {
    const error = local.subtract(ctx, target, localProduct(ctx, local, factors.map(f => f.terms))), e = r.make(ctx, local.coefficient(ctx, error, powers));
    if (!e.coefficients.length) continue;
    ctx.allocate(factors.length); factors = factors.map((f, i) => {
      const c = r.multiplyMod(ctx, e, r.bind(ctx, inverses[i]), r.bind(ctx, last.factors[i]));
      return local.add(ctx, f, local.univariate(ctx, c.coefficients, powers));
    });
  }
  demand(local.equal(ctx, localProduct(ctx, local, factors.map(f => f.terms)), target), 'verification-failed', 'multivariable Hensel product');
  return {inverses, leadingInverse: leadingInverse.terms, factors: Object.freeze(factors.map(f => f.terms))};
}
function recoveredRaw(ctx: ExecutionContext, ring: MultivariateRing<Rational>, proof: FactorMultivariateProof, mask: bigint): P<Rational> {
  const modulus = proof.modular.lifts[proof.modular.lifts.length - 1].modulus, local = new FactorLocalRing(ctx, modulus, proof.degrees.slice(1));
  let product = local.one(ctx), bits = mask;
  for (const ts of proof.factors) { if (ctx.remainder(bits, 2n)) product = local.multiply(ctx, product, local.bind(ctx, ts)); bits = ctx.quotient(bits, 2n); }
  demand(bits === 0n, 'verification-failed', 'multivariate subset range'); product = local.multiply(ctx, product, leading(ctx, local, proof.shifted));
  ctx.allocate(product.terms.length * 2);
  return ring.make(ctx, product.terms.map(t => ({powers: t.powers, coefficient: rational(ctx,
    ctx.multiply(t.coefficient, 2n) > modulus ? ctx.add(t.coefficient, -modulus) : t.coefficient)})));
}
function recover(ctx: ExecutionContext, ring: MultivariateRing<Rational>, proof: FactorMultivariateProof, mask: bigint): FactorMultivariateRecovery {
  const raw = recoveredRaw(ctx, ring, proof, mask);
  if (!raw.terms.length) return Object.freeze({raw, content: null, scale: rational(ctx, 1n), candidate: raw});
  const content = multivariateContent(ctx, ring, raw), integral = integralSparse(ctx, ring, content.primitive);
  return Object.freeze({raw, content, scale: integral.scale, candidate: integral.polynomial});
}
function verifyRecovery(ctx: ExecutionContext, ring: MultivariateRing<Rational>, proof: FactorMultivariateProof, mask: bigint, recovery: FactorMultivariateRecovery): P<Rational> {
  demand(ring.equal(ctx, recoveredRaw(ctx, ring, proof, mask), recovery.raw), 'verification-failed', 'restored leading coefficient recovery');
  if (!recovery.raw.terms.length) {
    demand(recovery.content === null && !recovery.candidate.terms.length && Q.equal(ctx, recovery.scale, rational(ctx, 1n)), 'verification-failed', 'zero recovered factor');
    ring.assert(ctx, recovery.candidate); return recovery.candidate;
  }
  demand(recovery.content !== null, 'verification-failed', 'recovered content evidence');
  verifyMultivariateContent(ctx, ring, recovery.raw, recovery.content); Q.assert(ctx, recovery.scale);
  demand(!Q.isZero(ctx, recovery.scale) && ring.equal(ctx, recovery.candidate, ring.scale(ctx, recovery.content.primitive, recovery.scale)), 'verification-failed', 'recovered primitive content scaling');
  verifyIntegralSparse(ctx, recovery.candidate); return recovery.candidate;
}
function validatePrimitive(ctx: ExecutionContext, ring: MultivariateRing<Rational>, tree: FactorMultivariateTree) {
  verifyIntegralSparse(ctx, tree.polynomial); demand(ring.outerDegree(ctx, tree.polynomial) > 0, 'verification-failed', 'factor positive outer degree');
  verifyMultivariateContent(ctx, ring, tree.polynomial, tree.content);
  demand(tree.content.content.terms.length === 1 && tree.content.content.terms[0].powers.every(n => n === 0), 'verification-failed', 'factor Gauss primitive content');
}
function verifyLocal(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>, proof: FactorMultivariateProof) {
  demand(Array.isArray(proof.points) && proof.points.length === ring.arity - 1, 'verification-failed', 'specialization coverage');
  const shifted = shiftFactorPolynomial(ctx, ring, input, proof.points);
  demand(ring.equal(ctx, shifted, proof.shifted), 'verification-failed', 'shifted factor identity');
  const degrees = factorPartialDegrees(ctx, shifted);
  demand(Array.isArray(proof.degrees) && degrees.length === proof.degrees.length && degrees.every((d, i) => d === proof.degrees[i]), 'verification-failed', 'factor partial-degree bound');
  const bound = normBound(ctx, shifted, degrees); demand(proof.bound === bound, 'verification-failed', 'multivariate recovery bound');
  const raw = specializeFactorPolynomial(ctx, shifted), cs = primitiveInteger(ctx, raw);
  demand(cs.length === ring.outerDegree(ctx, input) + 1, 'verification-failed', 'specialization degree loss');
  const last = verifyIntegerModularLift(ctx, cs, proof.modular, bound), local = new FactorLocalRing(ctx, last.modulus, degrees.slice(1)), r = local.scalars;
  demand(r.residue(ctx, raw[raw.length - 1]) % proof.modular.finite.prime !== 0n, 'verification-failed', 'bad original leading coefficient prime');
  demand(Array.isArray(proof.inverses) && Array.isArray(proof.factors) && proof.inverses.length === last.factors.length && proof.factors.length === last.factors.length,
    'verification-failed', 'local factor coverage');
  const zero = Array(degrees.length - 1).fill(0); ctx.allocate(zero.length);
  for (let i = 0; i < last.factors.length; i++) {
    let other = r.one(ctx); for (let j = 0; j < last.factors.length; j++) if (i !== j) other = r.multiply(ctx, other, r.bind(ctx, last.factors[j]));
    demand(r.equal(ctx, r.multiplyMod(ctx, other, r.bind(ctx, proof.inverses[i]), r.bind(ctx, last.factors[i])), r.one(ctx)), 'verification-failed', 'stored local seed inverse');
    const f = local.bind(ctx, proof.factors[i]), degree = last.factors[i].length - 1;
    demand(f.terms.every(t => t.powers[0] <= degree) && f.terms.filter(t => t.powers[0] === degree).length === 1
      && f.terms[0].powers[0] === degree && f.terms[0].powers.slice(1).every(n => n === 0) && f.terms[0].coefficient === 1n,
    'verification-failed', 'local monic degree');
    demand(r.equal(ctx, r.make(ctx, local.coefficient(ctx, f, zero)), r.bind(ctx, last.factors[i])), 'verification-failed', 'specialized factor correspondence');
  }
  const lc = leading(ctx, local, shifted), inverse = local.bind(ctx, proof.leadingInverse);
  demand(local.equal(ctx, local.multiply(ctx, lc, inverse), local.one(ctx)), 'verification-failed', 'stored leading inverse');
  demand(local.equal(ctx, local.multiply(ctx, lc, localProduct(ctx, local, proof.factors)), localInput(ctx, local, shifted)), 'verification-failed', 'stored multivariate lift product');
  return integerPower(ctx, 2n, BigInt(proof.factors.length));
}
export function factorMultivariatePolynomial(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>): FactorMultivariateTree {
  const content = multivariateContent(ctx, ring, input), base = {polynomial: input, content}; validatePrimitive(ctx, ring, {...base, kind: 'linear'});
  if (ring.outerDegree(ctx, input) === 1) return Object.freeze({...base, kind: 'linear'});
  const good = choose(ctx, ring, input), degrees = factorPartialDegrees(ctx, good.shifted), bound = normBound(ctx, good.shifted, degrees);
  const modular = Object.freeze({bound, finite: good.finite, ...liftIntegerModularFactors(ctx, good.cs, good.finite, bound)});
  const lifted = liftMultivariate(ctx, good.shifted, degrees, modular), rejected: FactorMultivariateRejection[] = [];
  const proof: FactorMultivariateProof = {...good, degrees, bound, modular, ...lifted, rejected};
  const maximum = integerPower(ctx, 2n, BigInt(lifted.factors.length));
  for (let mask = 1n; mask < maximum - 1n; mask = ctx.add(mask, 1n)) {
    const recovery = recover(ctx, ring, proof, mask), candidate = recovery.candidate, degree = ring.outerDegree(ctx, candidate);
    if (degree <= 0 || degree >= ring.outerDegree(ctx, input)) { ctx.allocate(3); rejected.push(Object.freeze({kind: 'degree', mask, recovery})); continue; }
    const division = sparseFactorDivide(ctx, ring, good.shifted, candidate);
    if (!division.remainder.terms.length) {
      const left = shiftFactorPolynomial(ctx, ring, candidate, good.points.map(n => -n)), right = shiftFactorPolynomial(ctx, ring, division.quotient, good.points.map(n => -n));
      const evidence = Object.freeze({points: good.points, shifted: good.shifted, degrees, bound, modular, ...lifted, rejected: Object.freeze(rejected)});
      const result = Object.freeze({...base, kind: 'split' as const, proof: evidence, selected: Object.freeze({mask, recovery, division}),
        left: factorMultivariatePolynomial(ctx, ring, left), right: factorMultivariatePolynomial(ctx, ring, right)});
      verifyMultivariateFactorTree(ctx, ring, input, result); return result;
    }
    ctx.allocate(4); rejected.push(Object.freeze({kind: 'division', mask, recovery, division}));
  }
  // Only prescribed evidence is retained; temporary selection data has no authority.
  const terminal = Object.freeze({points: good.points, shifted: good.shifted, degrees, bound, modular, ...lifted, rejected: Object.freeze(rejected)});
  const result = Object.freeze({...base, kind: 'irreducible' as const, proof: terminal}); verifyMultivariateFactorTree(ctx, ring, input, result); return result;
}
export function verifyMultivariateFactorTree(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>, tree: FactorMultivariateTree): void {
  demand(ring.equal(ctx, input, tree.polynomial), 'verification-failed', 'multivariate factor tree target'); validatePrimitive(ctx, ring, tree);
  const degree = ring.outerDegree(ctx, input);
  if (tree.kind === 'linear') { demand(degree === 1, 'verification-failed', 'multivariate linear irreducibility'); return; }
  if (tree.kind === 'split') {
    verifyMultivariateCoverage(ctx, ring, input, tree.proof, tree.selected.mask);
    const candidate = verifyRecovery(ctx, ring, tree.proof, tree.selected.mask, tree.selected.recovery);
    verifySparseFactorDivision(ctx, ring, tree.proof.shifted, candidate, tree.selected.division);
    demand(!tree.selected.division.remainder.terms.length, 'verification-failed', 'selected multivariate factor division');
    const inversePoints = tree.proof.points.map(n => -n);
    demand(ring.equal(ctx, shiftFactorPolynomial(ctx, ring, candidate, inversePoints), tree.left.polynomial)
      && ring.equal(ctx, shiftFactorPolynomial(ctx, ring, tree.selected.division.quotient, inversePoints), tree.right.polynomial), 'verification-failed', 'selected multivariate factor correspondence');
    demand(ring.outerDegree(ctx, tree.left.polynomial) < degree && ring.outerDegree(ctx, tree.right.polynomial) < degree, 'verification-failed', 'factor degree descent');
    verifyMultivariateFactorTree(ctx, ring, tree.left.polynomial, tree.left); verifyMultivariateFactorTree(ctx, ring, tree.right.polynomial, tree.right);
    demand(ring.equal(ctx, ring.multiply(ctx, tree.left.polynomial, tree.right.polynomial), input), 'verification-failed', 'multivariate factor tree reconstruction'); return;
  }
  demand(tree.kind === 'irreducible', 'verification-failed', 'multivariate factor tree tag'); verifyMultivariateCoverage(ctx, ring, input, tree.proof);
}
function verifyMultivariateCoverage(ctx: ExecutionContext, ring: MultivariateRing<Rational>, input: P<Rational>, proof: FactorMultivariateProof, selected?: bigint): void {
  const maximum = verifyLocal(ctx, ring, input, proof), endpoint = selected ?? maximum - 1n, degree = ring.outerDegree(ctx, input); ctx.integer(endpoint);
  demand(endpoint > 0n && (selected === undefined || endpoint < maximum - 1n), 'verification-failed', 'selected multivariate subset range');
  demand(Array.isArray(proof.rejected), 'verification-failed', 'multivariate subset coverage'); let mask = 1n;
  for (const rejection of proof.rejected) {
    demand(mask < endpoint && rejection.mask === mask, 'verification-failed', 'multivariate subset order');
    const candidate = verifyRecovery(ctx, ring, proof, mask, rejection.recovery), d = ring.outerDegree(ctx, candidate);
    if (d <= 0 || d >= degree) demand(rejection.kind === 'degree', 'verification-failed', 'multivariate degree rejection');
    else { demand(rejection.kind === 'division', 'verification-failed', 'multivariate division rejection');
      verifySparseFactorDivision(ctx, ring, proof.shifted, candidate, rejection.division);
      demand(rejection.division.remainder.terms.length > 0, 'verification-failed', 'unrejected multivariate factor'); }
    mask = ctx.add(mask, 1n);
  }
  demand(mask === endpoint, 'verification-failed', 'incomplete multivariate irreducibility coverage');
}
export function multivariateFactorLeaves(ctx: ExecutionContext, tree: FactorMultivariateTree): readonly P<Rational>[] {
  ctx.tick(); if (tree.kind !== 'split') return Object.freeze([tree.polynomial]);
  const left = multivariateFactorLeaves(ctx, tree.left), right = multivariateFactorLeaves(ctx, tree.right); ctx.allocate(left.length + right.length); return Object.freeze([...left, ...right]);
}
