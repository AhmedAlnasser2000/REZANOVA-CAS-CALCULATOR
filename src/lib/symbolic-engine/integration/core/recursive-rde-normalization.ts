/** Checked invertible gauge removing every positive integral normal residue. */
import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { Polynomial as P } from './polynomial';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { factorRecursivePolynomial, verifyRecursiveFactorizationInternal, type RecursivePolynomialFactorization } from './recursive-polynomial-factorization';
import { type CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { fractionValuation, verifyFractionValuation, normalPoleResonance, verifyNormalPoleResonance,
  recursiveFraction, recursivePolynomialValue, type FractionValuation, type NormalPoleResonance } from './recursive-rde-poles';

export interface NormalizationPole {
  readonly factor: P<E>;
  readonly valuation: FractionValuation;
  readonly resonance: NormalPoleResonance | null;
}
export interface RecursiveWeakNormalization {
  readonly factorization: RecursivePolynomialFactorization<E>;
  readonly poles: readonly NormalizationPole[];
  readonly gauge: E;
  readonly derivative: DerivativeEvidence;
  readonly coefficient: E;
  readonly forcing: readonly E[];
}
export function actualPolynomialPower(ctx: ExecutionContext, view: CertifiedTowerView, value: P<E>, exponent: bigint): P<E> {
  const ring = view.owner.fractions!.ring, degree = ring.degree(ctx, value); ctx.integer(exponent);
  demand(degree > 0 && exponent >= 0n, 'invalid-input', 'normal polynomial power');
  const constructedDegree = ctx.multiply(BigInt(degree), exponent);
  if (constructedDegree > BigInt(ctx.limits.degree)) ctx.exhaust('degree');
  // Degree is positive, so the checked budget also bounds the exact exponent conversion.
  return ring.power(ctx, value, Number(exponent));
}
function primeList(ctx: ExecutionContext, view: CertifiedTowerView, f: RecursivePolynomialFactorization<E>): readonly P<E>[] {
  demand(f.kind === 'factorization', 'verification-failed', 'nonzero normalization denominator');
  const owner = view.owner, ring = owner.fractions!.ring, t = recursiveFraction(ctx, owner, owner.generator(ctx)).numerator;
  ctx.allocate(f.factors.length); return f.factors.filter(p => view.monomial !== 'hyperexponential' || !ring.equal(ctx, p.polynomial, t)).map(p => p.polynomial);
}
function gauge(ctx: ExecutionContext, view: CertifiedTowerView, poles: readonly NormalizationPole[]): E {
  const ring = view.owner.fractions!.ring; let out = ring.one(ctx);
  for (const p of poles) if (p.resonance?.positive !== null && p.resonance?.positive !== undefined)
    out = ring.multiply(ctx, out, actualPolynomialPower(ctx, view, p.factor, p.resonance.positive));
  return recursivePolynomialValue(ctx, view.owner, out);
}
export function normalizeRecursiveRde(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], bounds: DifferentialBounds): RecursiveWeakNormalization {
  verifyCertifiedTowerWithin(ctx, view, bounds); demand(view.parent !== null, 'domain-mismatch', 'recursive normalization level');
  const owner = view.owner, ring = owner.fractions!.ring;
  for (const value of [a, ...forcing]) owner.assert(ctx, value);
  const factorization = factorRecursivePolynomial(ctx, ring, recursiveFraction(ctx, owner, a).denominator, bounds), factors = primeList(ctx, view, factorization);
  ctx.allocate(factors.length); const poles = Object.freeze(factors.map(factor => {
    const valuation = fractionValuation(ctx, owner, a, factor);
    ctx.allocate(3); return Object.freeze({factor, valuation, resonance: valuation.order === -1n ? normalPoleResonance(ctx, owner, a, factor, bounds) : null});
  }));
  const g = gauge(ctx, view, poles), derivative = differentiate(ctx, owner, g); ctx.allocate(forcing.length + 6);
  const e = Object.freeze({factorization, poles, gauge: g, derivative,
    coefficient: owner.subtract(ctx, a, owner.exactDivide(ctx, derivative.derivative, g)),
    forcing: Object.freeze(forcing.map(value => owner.multiply(ctx, g, value)))});
  verifyRecursiveWeakNormalization(ctx, view, a, forcing, e, bounds); return e;
}
export function verifyRecursiveWeakNormalization(ctx: ExecutionContext, view: CertifiedTowerView, a: E, forcing: readonly E[], e: RecursiveWeakNormalization, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); demand(view.parent !== null, 'domain-mismatch', 'recursive normalization level');
  const owner = view.owner, ring = owner.fractions!.ring;
  verifyRecursiveFactorizationInternal(ctx, ring, recursiveFraction(ctx, owner, a).denominator, e.factorization, bounds);
  const primes = primeList(ctx, view, e.factorization);
  demand(primes.length === e.poles.length && forcing.length === e.forcing.length, 'verification-failed', 'normalization complete pole/forcing coverage');
  for (let i = 0; i < primes.length; i++) {
    const pole = e.poles[i]; demand(ring.equal(ctx, pole.factor, primes[i]), 'verification-failed', 'normalization prime correspondence');
    verifyFractionValuation(ctx, owner, a, pole.factor, pole.valuation);
    if (pole.valuation.order === -1n) {
      demand(pole.resonance !== null, 'verification-failed', 'missing simple-pole resonance');
      verifyNormalPoleResonance(ctx, owner, a, pole.factor, pole.resonance, bounds);
    } else demand(pole.resonance === null, 'verification-failed', 'extraneous normal residue certificate');
  }
  demand(!owner.isZero(ctx, e.gauge) && owner.equal(ctx, e.gauge, gauge(ctx, view, e.poles)), 'verification-failed', 'invertible normalization gauge');
  verifyDerivative(ctx, owner, e.gauge, e.derivative);
  demand(owner.equal(ctx, e.coefficient, owner.subtract(ctx, a, owner.exactDivide(ctx, e.derivative.derivative, e.gauge))), 'verification-failed', 'weak coefficient transformation');
  for (let i = 0; i < forcing.length; i++) demand(owner.equal(ctx, e.forcing[i], owner.multiply(ctx, e.gauge, forcing[i])), 'verification-failed', 'weak forcing transformation');
}
