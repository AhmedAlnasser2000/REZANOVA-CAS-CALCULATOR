/** One strictly height-decreasing logarithmic-relation step. No admission authority. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialField, DifferentialElement as E, DifferentialBounds } from './differential-field';
import type { Polynomial as P } from './polynomial';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { extendedGcd, exactDivide, polynomialDivide, verifyBezout, verifyDivision, type Bezout, type Division } from './polynomial-division';
import { factorRecursivePolynomial, verifyRecursiveFactorizationInternal, type RecursivePolynomialFactorization } from './recursive-polynomial-factorization';
import { solveLinearSystem, verifyLinearSolution, type LinearSystem, type LinearSolution } from './linear-system';
import { descendCoefficientSystem, verifyCoefficientSystemWithin, matrixCapacity, type RationalCoefficientSystem } from './recursive-coefficient-system';

export interface RecursiveNormalLogFactor {
  readonly polynomial: P<E>;
  readonly value: E;
  readonly derivative: DerivativeEvidence;
  readonly normal: Bezout<E>;
  readonly logarithmicDerivative: E;
}
export interface LogarithmicDescent {
  readonly factorizations: readonly RecursivePolynomialFactorization<E>[];
  readonly factors: readonly RecursiveNormalLogFactor[];
  readonly denominator: P<E>;
  readonly quotients: readonly P<E>[];
  readonly divisions: readonly Division<E>[];
  readonly comparison: RationalCoefficientSystem;
  readonly linear: LinearSolution<Rational>;
  readonly lower: readonly E[];
}
function fraction(ctx: ExecutionContext, owner: DifferentialField, value: E) {
  owner.assert(ctx, value); demand(value.kind === 'fraction', 'domain-mismatch', 'logarithmic descent fraction'); return value.value;
}
function nativePolynomial(ctx: ExecutionContext, owner: DifferentialField, p: P<E>): E {
  return owner.fraction(ctx, owner.fractions!.make(ctx, p, owner.fractions!.ring.one(ctx)));
}
function derivativePolynomial(ctx: ExecutionContext, owner: DifferentialField, derivative: DerivativeEvidence): P<E> {
  const f = fraction(ctx, owner, derivative.derivative);
  demand(owner.fractions!.ring.equal(ctx, f.denominator, owner.fractions!.ring.one(ctx)), 'verification-failed', 'normal-factor total derivative polynomial');
  return f.numerator;
}
function values(ctx: ExecutionContext, owner: DifferentialField, inputs: readonly E[], factors: readonly RecursiveNormalLogFactor[]): readonly E[] {
  ctx.allocate(inputs.length + factors.length); return [...inputs, ...factors.map(f => owner.negate(ctx, f.logarithmicDerivative))];
}
/** The residual coefficients and every positive polynomial power must vanish. */
function constraints(ctx: ExecutionContext, owner: DifferentialField, ds: readonly Division<E>[]): LinearSystem<E> {
  const parent = owner.parent!, zero = parent.fromInteger(ctx, 0n); let rsize = 0, qsize = 1;
  for (const d of ds) { rsize = Math.max(rsize, d.remainder.coefficients.length); qsize = Math.max(qsize, d.quotient.coefficients.length); }
  const rows = rsize + qsize - 1, columns = ds.length; matrixCapacity(ctx, rows, columns);
  const matrix: (readonly E[])[] = [], rhs: E[] = [];
  for (let i = 0; i < rows; i++) {
    ctx.allocate(columns); matrix.push(Object.freeze(ds.map(d => i < rsize ? d.remainder.coefficients[i] ?? zero : d.quotient.coefficients[i - rsize + 1] ?? zero)));
    rhs.push(zero);
  }
  ctx.allocate(4); return Object.freeze({rows, columns, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs)});
}
function constantCombination(ctx: ExecutionContext, owner: DifferentialField, ds: readonly Division<E>[], vector: readonly Rational[]): E {
  const parent = owner.parent!, zero = parent.fromInteger(ctx, 0n); let result = zero;
  demand(vector.length === ds.length, 'verification-failed', 'logarithmic descent vector coverage');
  let base = parent; while (base.parent) base = base.parent;
  for (let i = 0; i < ds.length; i++) result = parent.add(ctx, result,
    parent.multiply(ctx, parent.embed(ctx, base.scalar(ctx, vector[i])), ds[i].quotient.coefficients[0] ?? zero));
  return result;
}
export function produceLogarithmicDescent(ctx: ExecutionContext, owner: DifferentialField, kind: 'primitive' | 'hyperexponential', inputs: readonly E[], bounds: DifferentialBounds): LogarithmicDescent {
  const ring = owner.fractions!.ring, t = ring.make(ctx, [owner.parent!.fromInteger(ctx, 0n), owner.parent!.fromInteger(ctx, 1n)]);
  ctx.allocate(inputs.length);
  const factorizations = Object.freeze(inputs.map(f => factorRecursivePolynomial(ctx, ring, fraction(ctx, owner, f).denominator, bounds)));
  const factors: RecursiveNormalLogFactor[] = [];
  for (const f of factorizations) {
    demand(f.kind === 'factorization', 'verification-failed', 'logarithmic descent nonzero denominator');
    for (const part of f.factors) {
      if (kind === 'hyperexponential' && ring.equal(ctx, part.polynomial, t)) continue;
      if (factors.some(other => ring.equal(ctx, other.polynomial, part.polynomial))) continue;
      const value = nativePolynomial(ctx, owner, part.polynomial), derivative = differentiate(ctx, owner, value);
      const normal = extendedGcd(ctx, ring, part.polynomial, derivativePolynomial(ctx, owner, derivative));
      demand(ring.equal(ctx, normal.gcd, ring.one(ctx)), 'verification-failed', 'unexpected special factor in certified logarithmic descent');
      ctx.allocate(5); factors.push(Object.freeze({polynomial: part.polynomial, value, derivative, normal,
        logarithmicDerivative: owner.exactDivide(ctx, derivative.derivative, value)}));
    }
  }
  const hs = values(ctx, owner, inputs, factors); let denominator = ring.one(ctx);
  for (const h of hs) denominator = ring.multiply(ctx, denominator, fraction(ctx, owner, h).denominator);
  ctx.allocate(hs.length * 2);
  const quotients = Object.freeze(hs.map(h => exactDivide(ctx, ring, denominator, fraction(ctx, owner, h).denominator)));
  const divisions = Object.freeze(hs.map((h, i) => polynomialDivide(ctx, ring, ring.multiply(ctx, fraction(ctx, owner, h).numerator, quotients[i]), denominator)));
  const comparison = descendCoefficientSystem(ctx, owner.parent!, constraints(ctx, owner, divisions), bounds), linear = solveLinearSystem(ctx, Q, comparison.system);
  demand(linear.kind === 'consistent', 'verification-failed', 'homogeneous logarithmic descent'); ctx.allocate(linear.nullspace.length);
  const lower = Object.freeze(linear.nullspace.map(v => constantCombination(ctx, owner, divisions, v)));
  ctx.allocate(8); const e = Object.freeze({factorizations, factors: Object.freeze(factors), denominator, quotients, divisions, comparison, linear, lower});
  verifyLogarithmicDescent(ctx, owner, kind, inputs, e, bounds); return e;
}
export function verifyLogarithmicDescent(ctx: ExecutionContext, owner: DifferentialField, kind: 'primitive' | 'hyperexponential', inputs: readonly E[], e: LogarithmicDescent, bounds: DifferentialBounds): void {
  const ring = owner.fractions!.ring, t = ring.make(ctx, [owner.parent!.fromInteger(ctx, 0n), owner.parent!.fromInteger(ctx, 1n)]), distinct: P<E>[] = [];
  demand(e.factorizations.length === inputs.length, 'verification-failed', 'logarithmic descent factorization coverage');
  for (let i = 0; i < inputs.length; i++) {
    verifyRecursiveFactorizationInternal(ctx, ring, fraction(ctx, owner, inputs[i]).denominator, e.factorizations[i], bounds);
    const f = e.factorizations[i]; demand(f.kind === 'factorization', 'verification-failed', 'logarithmic descent denominator factorization');
    for (const part of f.factors) if (!(kind === 'hyperexponential' && ring.equal(ctx, part.polynomial, t))
      && !distinct.some(p => ring.equal(ctx, p, part.polynomial))) { ctx.allocate(1); distinct.push(part.polynomial); }
  }
  demand(e.factors.length === distinct.length, 'verification-failed', 'logarithmic descent normal-prime coverage');
  for (let i = 0; i < distinct.length; i++) {
    const f = e.factors[i]; demand(ring.equal(ctx, f.polynomial, distinct[i]) && owner.equal(ctx, f.value, nativePolynomial(ctx, owner, distinct[i])),
      'verification-failed', 'logarithmic descent factor correspondence');
    verifyDerivative(ctx, owner, f.value, f.derivative); verifyBezout(ctx, ring, f.polynomial, derivativePolynomial(ctx, owner, f.derivative), f.normal);
    demand(ring.equal(ctx, f.normal.gcd, ring.one(ctx)) && owner.equal(ctx, owner.multiply(ctx, f.logarithmicDerivative, f.value), f.derivative.derivative),
      'verification-failed', 'logarithmic descent normality/derivative');
  }
  const hs = values(ctx, owner, inputs, e.factors);
  demand(e.quotients.length === hs.length && e.divisions.length === hs.length && !ring.isZero(ctx, e.denominator), 'verification-failed', 'logarithmic descent clearing coverage');
  let denominator = ring.one(ctx);
  for (const h of hs) denominator = ring.multiply(ctx, denominator, fraction(ctx, owner, h).denominator);
  demand(ring.equal(ctx, e.denominator, denominator), 'verification-failed', 'logarithmic descent common denominator');
  for (let i = 0; i < hs.length; i++) {
    const f = fraction(ctx, owner, hs[i]); demand(ring.equal(ctx, ring.multiply(ctx, f.denominator, e.quotients[i]), e.denominator), 'verification-failed', 'logarithmic descent clearing quotient');
    verifyDivision(ctx, ring, ring.multiply(ctx, f.numerator, e.quotients[i]), e.denominator, e.divisions[i]);
  }
  verifyCoefficientSystemWithin(ctx, owner.parent!, constraints(ctx, owner, e.divisions), e.comparison, bounds); verifyLinearSolution(ctx, Q, e.comparison.system, e.linear);
  demand(e.linear.kind === 'consistent' && e.lower.length === e.linear.nullspace.length, 'verification-failed', 'logarithmic descent complete basis');
  for (let i = 0; i < e.lower.length; i++) demand(owner.parent!.equal(ctx, e.lower[i], constantCombination(ctx, owner, e.divisions, e.linear.nullspace[i])),
    'verification-failed', 'logarithmic descent parent mapping');
}
