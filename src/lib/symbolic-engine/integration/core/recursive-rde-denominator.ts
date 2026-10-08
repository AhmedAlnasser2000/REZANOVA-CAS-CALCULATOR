/** Universal denominator bounds from exact valuations and complete resonances. */
import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { Polynomial as P } from './polynomial';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import { factorRecursivePolynomial, verifyRecursiveFactorizationInternal, type RecursivePolynomialFactorization } from './recursive-polynomial-factorization';
import { type CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { recursiveFraction, recursivePolynomialValue, checkedDerivativePolynomial, fractionValuation, verifyFractionValuation,
  normalPoleResonance, verifyNormalPoleResonance, type FractionValuation, type NormalPoleResonance } from './recursive-rde-poles';
import { solveHyperexponentialResonance, verifyHyperexponentialResonance, type HyperexponentialResonance } from './recursive-hyperexponential-resonance';
import { actualPolynomialPower } from './recursive-rde-normalization';

export interface RecursiveDenominatorPole {
  readonly factor: P<E>;
  readonly coefficient: FractionValuation;
  readonly forcing: readonly FractionValuation[];
  readonly kind: 'normal' | 'special';
  readonly derivative: DerivativeEvidence | null;
  readonly normal: Bezout<E> | null;
  readonly residue: NormalPoleResonance | null;
  readonly special: HyperexponentialResonance | null;
  readonly bound: bigint;
}
export interface RecursiveDenominatorBound {
  readonly factorizations: readonly RecursivePolynomialFactorization<E>[];
  readonly poles: readonly RecursiveDenominatorPole[];
  readonly denominator: P<E>;
}
function primeList(ctx: ExecutionContext, view: CertifiedTowerView, factorizations: readonly RecursivePolynomialFactorization<E>[]): readonly P<E>[] {
  const ring = view.owner.fractions!.ring, primes: P<E>[] = [];
  for (const f of factorizations) {
    demand(f.kind === 'factorization', 'verification-failed', 'nonzero RDE denominator factorization');
    for (const p of f.factors) if (!primes.some(q => ring.equal(ctx, p.polynomial, q))) { ctx.allocate(1); primes.push(p.polynomial); }
  }
  // Special homogeneous poles may occur even when no input has a denominator.
  if (view.monomial === 'hyperexponential') {
    const t = recursiveFraction(ctx, view.owner, view.owner.generator(ctx)).numerator;
    if (!primes.some(p => ring.equal(ctx, p, t))) { ctx.allocate(1); primes.push(t); }
  }
  return Object.freeze(primes);
}
function specialAlpha(ctx: ExecutionContext, view: CertifiedTowerView, valuation: FractionValuation): E {
  const parent = view.parent!.owner;
  demand(valuation.order === 0n, 'verification-failed', 'special coefficient constant term');
  const numerator = valuation.numerator.unit.coefficients[0], denominator = valuation.denominator.unit.coefficients[0];
  demand(numerator !== undefined && denominator !== undefined && !parent.isZero(ctx, denominator), 'verification-failed', 'special unit evaluation');
  return parent.negate(ctx, parent.exactDivide(ctx, numerator, denominator));
}
function poleBound(ctx: ExecutionContext, e: RecursiveDenominatorPole): bigint {
  let minimum: bigint | null = null;
  for (const f of e.forcing) if (f.order !== null && (minimum === null || f.order < minimum)) minimum = f.order;
  const va = e.coefficient.order; let bound = 0n;
  if (minimum !== null) {
    const shift = e.kind === 'normal' ? -1n : 0n;
    bound = ctx.add(-minimum, va !== null && va < shift ? va : shift);
    if (bound < 0n) bound = 0n;
  }
  if (e.kind === 'normal' && e.residue?.positive !== null && e.residue?.positive !== undefined && e.residue.positive > bound) bound = e.residue.positive;
  if (e.kind === 'special' && e.special?.actual && e.special.exponent?.denominator === 1n) {
    const resonance = ctx.add(0n, -e.special.exponent.numerator); if (resonance > bound) bound = resonance;
  }
  return bound;
}
function denominator(ctx: ExecutionContext, view: CertifiedTowerView, poles: readonly RecursiveDenominatorPole[]): P<E> {
  const ring = view.owner.fractions!.ring; let result = ring.one(ctx);
  for (const p of poles) if (p.bound) result = ring.multiply(ctx, result, actualPolynomialPower(ctx, view, p.factor, p.bound));
  return result;
}
export function boundRecursiveDenominator(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], bounds: DifferentialBounds): RecursiveDenominatorBound {
  verifyCertifiedTowerWithin(ctx, view, bounds); demand(view.parent !== null, 'domain-mismatch', 'recursive denominator level');
  const owner = view.owner, ring = owner.fractions!.ring, values = [a, ...forcing], t = recursiveFraction(ctx, owner, owner.generator(ctx)).numerator;
  ctx.allocate(values.length);
  const factorizations = Object.freeze(values.map(value => factorRecursivePolynomial(ctx, ring, recursiveFraction(ctx, owner, value).denominator, bounds)));
  const primes = primeList(ctx, view, factorizations); ctx.allocate(primes.length);
  const poles = Object.freeze(primes.map(factor => {
    const coefficient = fractionValuation(ctx, owner, a, factor), fs = Object.freeze(forcing.map(value => fractionValuation(ctx, owner, value, factor)));
    const special = view.monomial === 'hyperexponential' && ring.equal(ctx, factor, t), derivative = special ? null : differentiate(ctx, owner, recursivePolynomialValue(ctx, owner, factor));
    const e = {factor, coefficient, forcing: fs, kind: special ? 'special' as const : 'normal' as const, derivative,
      normal: derivative ? extendedGcd(ctx, ring, factor, checkedDerivativePolynomial(ctx, owner, derivative)) : null,
      residue: !special && coefficient.order === -1n ? normalPoleResonance(ctx, owner, a, factor, bounds) : null,
      special: special && coefficient.order === 0n ? solveHyperexponentialResonance(ctx, view, specialAlpha(ctx, view, coefficient), bounds) : null,
      bound: 0n};
    ctx.allocate(forcing.length + 9); return Object.freeze({...e, bound: poleBound(ctx, e)});
  }));
  ctx.allocate(3); const e = Object.freeze({factorizations, poles, denominator: denominator(ctx, view, poles)});
  verifyRecursiveDenominatorBound(ctx, view, a, forcing, e, bounds); return e;
}
export function verifyRecursiveDenominatorBound(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], e: RecursiveDenominatorBound, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); demand(view.parent !== null, 'domain-mismatch', 'recursive denominator level');
  const owner = view.owner, ring = owner.fractions!.ring, values = [a, ...forcing], t = recursiveFraction(ctx, owner, owner.generator(ctx)).numerator;
  demand(e.factorizations.length === values.length, 'verification-failed', 'complete denominator factorization coverage');
  for (let i = 0; i < values.length; i++) verifyRecursiveFactorizationInternal(ctx, ring, recursiveFraction(ctx, owner, values[i]).denominator, e.factorizations[i], bounds);
  const primes = primeList(ctx, view, e.factorizations); demand(primes.length === e.poles.length, 'verification-failed', 'complete denominator prime coverage');
  for (let i = 0; i < primes.length; i++) {
    const p = e.poles[i], special = view.monomial === 'hyperexponential' && ring.equal(ctx, primes[i], t);
    demand(ring.equal(ctx, p.factor, primes[i]) && p.forcing.length === forcing.length && p.kind === (special ? 'special' : 'normal'), 'verification-failed', 'denominator factor classification');
    verifyFractionValuation(ctx, owner, a, p.factor, p.coefficient);
    for (let j = 0; j < forcing.length; j++) verifyFractionValuation(ctx, owner, forcing[j], p.factor, p.forcing[j]);
    if (special) {
      demand(p.derivative === null && p.normal === null && p.residue === null, 'verification-failed', 'special generator coverage');
      if (p.coefficient.order === 0n) {
        demand(p.special !== null, 'verification-failed', 'missing special pole resonance');
        verifyHyperexponentialResonance(ctx, view, specialAlpha(ctx, view, p.coefficient), p.special, bounds);
      } else demand(p.special === null, 'verification-failed', 'extraneous special pole resonance');
    } else {
      demand(p.derivative !== null && p.normal !== null && p.special === null, 'verification-failed', 'normal pole evidence');
      verifyDerivative(ctx, owner, recursivePolynomialValue(ctx, owner, p.factor), p.derivative);
      verifyBezout(ctx, ring, p.factor, checkedDerivativePolynomial(ctx, owner, p.derivative), p.normal);
      demand(ring.equal(ctx, p.normal.gcd, ring.one(ctx)), 'verification-failed', 'complete normal factor classification');
      if (p.coefficient.order === -1n) {
        demand(p.residue !== null, 'verification-failed', 'missing normal pole resonance'); verifyNormalPoleResonance(ctx, owner, a, p.factor, p.residue, bounds);
      } else demand(p.residue === null, 'verification-failed', 'extraneous normal pole resonance');
    }
    ctx.integer(p.bound); demand(p.bound === poleBound(ctx, p), 'verification-failed', 'universal pole bound');
  }
  demand(ring.equal(ctx, e.denominator, denominator(ctx, view, e.poles)), 'verification-failed', 'complete universal denominator');
}
