/** Complete integer zeros via independent coefficient comparison over Q. */
import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import { DifferentialField, type DifferentialElement, type DifferentialBounds } from './differential-field';
import { PolynomialRing, assertPolynomialRingOwner, type Polynomial as P } from './polynomial';
import { extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import { positiveIntegerRoots, verifyIntegerRoots, type IntegerRootEvidence } from './rde-integer-roots';
import { descendCoefficientSystem, verifyCoefficientSystemWithin, type RationalCoefficientSystem } from './recursive-coefficient-system';

interface RootComparison<E> {
  readonly input: P<E>;
  readonly comparison: RationalCoefficientSystem;
  readonly ring: PolynomialRing<Rational>;
  readonly gcds: readonly Bezout<Rational>[];
  readonly polynomial: P<Rational>;
}
export type RecursiveIntegerRootEvidence<E> = Readonly<RootComparison<E> & (
  | {kind: 'all-integers'}
  | {kind: 'finite'; auxiliary: PolynomialRing<DifferentialElement>;
      positive: IntegerRootEvidence; negative: IntegerRootEvidence; zero: boolean; roots: readonly bigint[]}
)>;
function comparisonInput<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, p: P<E>) {
  ctx.allocate(p.coefficients.length + 1);
  return Object.freeze({rows: 1, columns: p.coefficients.length, matrix: Object.freeze([p.coefficients]), rhs: Object.freeze([ring.domain.fromInteger(ctx, 0n)])});
}
function reflected<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, p: P<E>): P<E> {
  ctx.allocate(p.coefficients.length); return ring.make(ctx, p.coefficients.map((c, i) => i % 2 ? ring.domain.negate(ctx, c) : c));
}
function polynomialIn(ctx: ExecutionContext, ring: PolynomialRing<DifferentialElement>, p: P<Rational>): P<DifferentialElement> {
  const q = ring.domain;
  demand(q instanceof DifferentialField && q.kind === 'rational', 'domain-mismatch', 'integer-root auxiliary rational owner');
  ctx.allocate(p.coefficients.length); return ring.make(ctx, p.coefficients.map(c => q.scalar(ctx, c)));
}
export function integerRootsRecursive<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: P<E>, bounds: DifferentialBounds): RecursiveIntegerRootEvidence<E> {
  return ctx.operation(() => {
    assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, input);
    const comparison = descendCoefficientSystem(ctx, ring.domain, comparisonInput(ctx, ring, input), bounds), qr = new PolynomialRing(Q, ring.variable);
    const gcds: Bezout<Rational>[] = []; let polynomial = qr.zero(ctx); ctx.allocate(comparison.system.rows);
    for (const row of comparison.system.matrix) {
      const gcd = extendedGcd(ctx, qr, polynomial, qr.make(ctx, row)); gcds.push(gcd); polynomial = gcd.gcd;
    }
    const base = {input, comparison, ring: qr, gcds: Object.freeze(gcds), polynomial}; let evidence: RecursiveIntegerRootEvidence<E>;
    if (qr.isZero(ctx, polynomial)) evidence = Object.freeze({...base, kind: 'all-integers' as const});
    else {
      const q = DifferentialField.rationals(ctx, bounds), auxiliary = new PolynomialRing(q, ring.variable), p = polynomialIn(ctx, auxiliary, polynomial);
      const positive = positiveIntegerRoots(ctx, auxiliary, p), negative = positiveIntegerRoots(ctx, auxiliary, reflected(ctx, auxiliary, p));
      const zero = Q.isZero(ctx, polynomial.coefficients[0]); ctx.allocate(positive.roots.length + negative.roots.length + (zero ? 1 : 0));
      const roots = Object.freeze([...negative.roots].reverse().map(n => ctx.add(0n, -n)).concat(zero ? [0n] : [], positive.roots));
      evidence = Object.freeze({...base, kind: 'finite' as const, auxiliary, positive, negative, zero, roots});
    }
    verifyRecursiveIntegerRootsWithin(ctx, ring, input, evidence, bounds); return evidence;
  });
}
export function verifyRecursiveIntegerRootsWithin<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: P<E>, e: RecursiveIntegerRootEvidence<E>, bounds: DifferentialBounds): void {
  assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, input);
  demand(ring.equal(ctx, input, e.input) && e.ring.domain === Q && e.ring.variable === ring.variable, 'verification-failed', 'integer roots expected polynomial');
  assertPolynomialRingOwner(ctx, e.ring);
  verifyCoefficientSystemWithin(ctx, ring.domain, comparisonInput(ctx, ring, input), e.comparison, bounds);
  demand(e.gcds.length === e.comparison.system.rows, 'verification-failed', 'integer roots coefficient GCD coverage');
  let previous = e.ring.zero(ctx);
  for (let i = 0; i < e.gcds.length; i++) {
    verifyBezout(ctx, e.ring, previous, e.ring.make(ctx, e.comparison.system.matrix[i]), e.gcds[i]); previous = e.gcds[i].gcd;
  }
  demand(e.ring.equal(ctx, e.polynomial, previous), 'verification-failed', 'integer roots rational polynomial');
  if (e.ring.isZero(ctx, previous)) {
    demand(e.kind === 'all-integers' && ring.isZero(ctx, input), 'verification-failed', 'zero indicial polynomial'); return;
  }
  demand(e.kind === 'finite' && e.auxiliary.domain instanceof DifferentialField && e.auxiliary.domain.kind === 'rational'
    && e.auxiliary.variable === ring.variable, 'verification-failed', 'integer roots finite auxiliary');
  assertPolynomialRingOwner(ctx, e.auxiliary);
  const p = polynomialIn(ctx, e.auxiliary, previous);
  verifyIntegerRoots(ctx, e.auxiliary, p, e.positive); verifyIntegerRoots(ctx, e.auxiliary, reflected(ctx, e.auxiliary, p), e.negative);
  const zero = Q.isZero(ctx, previous.coefficients[0]); demand(e.zero === zero, 'verification-failed', 'zero integer resonance');
  ctx.allocate(e.negative.roots.length + e.positive.roots.length + 1);
  const roots = [...e.negative.roots].reverse().map(n => ctx.add(0n, -n)).concat(zero ? [0n] : [], e.positive.roots);
  demand(e.roots.length === roots.length && e.roots.every((n, i) => n === roots[i]), 'verification-failed', 'integer roots complete signed coverage');
}
export function verifyRecursiveIntegerRoots<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: P<E>, e: RecursiveIntegerRootEvidence<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRecursiveIntegerRootsWithin(ctx, ring, input, e, bounds));
}
