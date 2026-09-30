import { demand, type ExecutionContext } from './execution';
import { DifferentialField, type DifferentialElement as E } from './differential-field';
import { PolynomialRing, type Polynomial as P } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import { extendedGcd, exactDivide, verifyBezout, type Bezout } from './polynomial-division';

export interface RdeDomain {
  readonly owner: DifferentialField;
  readonly ring: PolynomialRing<E>;
  readonly orders: PolynomialRing<E>;
  readonly resultantRing: PolynomialRing<P<E>, PolynomialDomain<E>>;
}
export function rdeDomain(ctx: ExecutionContext, owner: DifferentialField): RdeDomain {
  demand(owner instanceof DifferentialField && owner.kind === 'variable' && owner.parent?.kind === 'rational',
    'domain-mismatch', 'RDE requires Q(x) with D(x)=1');
  ctx.allocate(9); const orders = new PolynomialRing(owner.parent, 'm');
  return Object.freeze({ owner, ring: owner.fractions!.ring, orders,
    resultantRing: new PolynomialRing(new PolynomialDomain(orders), owner.fractions!.ring.variable) });
}
export function assertRdeDomain(ctx: ExecutionContext, owner: DifferentialField, d: RdeDomain): void {
  ctx.tick();
  demand(owner instanceof DifferentialField && owner.kind === 'variable' && owner.parent?.kind === 'rational'
    && d.owner === owner && d.ring === owner.fractions!.ring && d.orders.domain === owner.parent
    && d.orders.variable === 'm' && d.resultantRing.domain.ring === d.orders
    && d.resultantRing.variable === d.ring.variable, 'domain-mismatch', 'RDE domain ownership');
}
export function naturalDegree(ctx: ExecutionContext, n: bigint): number {
  ctx.integer(n);
  demand(n >= -1n, 'verification-failed', 'negative RDE degree');
  if (n > BigInt(ctx.limits.degree)) ctx.exhaust('RDE-degree');
  // A coefficient array has n+1 entries; reject beyond JS array capacity
  // before conversion/allocation even if a caller supplies a larger profile.
  if (n > 0xffff_fffen) ctx.exhaust('RDE-array-capacity');
  return Number(n);
}
export interface PrimitiveTriple {
  readonly pair: Bezout<E>;
  readonly common: Bezout<E>;
  readonly A: P<E>;
  readonly B: P<E>;
  readonly C: P<E>;
}
export function primitiveTriple(ctx: ExecutionContext, r: PolynomialRing<E>, A: P<E>, B: P<E>, C: P<E>): PrimitiveTriple {
  const pair = extendedGcd(ctx, r, A, B), common = extendedGcd(ctx, r, pair.gcd, C);
  ctx.allocate(5);
  const proof = Object.freeze({ pair, common, A: exactDivide(ctx, r, A, common.gcd),
    B: exactDivide(ctx, r, B, common.gcd), C: exactDivide(ctx, r, C, common.gcd) });
  verifyTriple(ctx, r, A, B, C, proof); return proof;
}
export function verifyTriple(ctx: ExecutionContext, r: PolynomialRing<E>, A: P<E>, B: P<E>, C: P<E>, proof: PrimitiveTriple): void {
  demand(!r.isZero(ctx, A), 'verification-failed', 'zero differential leading coefficient');
  verifyBezout(ctx, r, A, B, proof.pair); verifyBezout(ctx, r, proof.pair.gcd, C, proof.common);
  demand(r.equal(ctx, r.multiply(ctx, proof.A, proof.common.gcd), A)
    && r.equal(ctx, r.multiply(ctx, proof.B, proof.common.gcd), B)
    && r.equal(ctx, r.multiply(ctx, proof.C, proof.common.gcd), C), 'verification-failed', 'primitive differential equation');
}
export interface ClearingEvidence {
  readonly gcd: Bezout<E>;
  readonly lcm: P<E>;
  readonly quotientA: P<E>;
  readonly quotientB: P<E>;
  readonly primitive: PrimitiveTriple;
}
function fractions(ctx: ExecutionContext, owner: DifferentialField, a: E, b: E) {
  owner.assert(ctx, a); owner.assert(ctx, b);
  demand(a.kind === 'fraction' && b.kind === 'fraction', 'domain-mismatch', 'RDE coefficients');
  ctx.allocate(2); return [a.value, b.value] as const;
}
export function clearRde(ctx: ExecutionContext, d: RdeDomain, a: E, b: E): ClearingEvidence {
  const [av, bv] = fractions(ctx, d.owner, a, b), r = d.ring;
  const gcd = extendedGcd(ctx, r, av.denominator, bv.denominator);
  const lcm = r.multiply(ctx, exactDivide(ctx, r, av.denominator, gcd.gcd), bv.denominator);
  const quotientA = exactDivide(ctx, r, lcm, av.denominator), quotientB = exactDivide(ctx, r, lcm, bv.denominator);
  const primitive = primitiveTriple(ctx, r, lcm, r.multiply(ctx, quotientA, av.numerator), r.multiply(ctx, quotientB, bv.numerator));
  ctx.allocate(5); const proof = Object.freeze({ gcd, lcm, quotientA, quotientB, primitive });
  verifyClearing(ctx, d, a, b, proof); return proof;
}
export function verifyClearing(ctx: ExecutionContext, d: RdeDomain, a: E, b: E, proof: ClearingEvidence): void {
  const [av, bv] = fractions(ctx, d.owner, a, b), r = d.ring;
  verifyBezout(ctx, r, av.denominator, bv.denominator, proof.gcd);
  demand(r.equal(ctx, r.multiply(ctx, proof.lcm, proof.gcd.gcd), r.multiply(ctx, av.denominator, bv.denominator))
    && r.equal(ctx, r.multiply(ctx, proof.quotientA, av.denominator), proof.lcm)
    && r.equal(ctx, r.multiply(ctx, proof.quotientB, bv.denominator), proof.lcm), 'verification-failed', 'RDE denominator clearing');
  verifyTriple(ctx, r, proof.lcm, r.multiply(ctx, proof.quotientA, av.numerator), r.multiply(ctx, proof.quotientB, bv.numerator), proof.primitive);
}
export function hasse(ctx: ExecutionContext, r: PolynomialRing<E>, p: P<E>, count: number): readonly P<E>[] {
  ctx.allocate(count + 1); const out = [p];
  for (let i = 1; i <= count; i++) out.push(r.scale(ctx, r.derivative(ctx, out[i - 1]), r.domain.inverse(ctx, r.domain.fromInteger(ctx, BigInt(i)))));
  return Object.freeze(out);
}
export function verifyHasse(ctx: ExecutionContext, r: PolynomialRing<E>, p: P<E>, count: number, hs: readonly P<E>[]): void {
  demand(hs.length === count + 1 && r.equal(ctx, p, hs[0]), 'verification-failed', 'Hasse coverage');
  for (let i = 1; i <= count; i++) demand(r.equal(ctx, r.scale(ctx, hs[i], r.domain.fromInteger(ctx, BigInt(i))),
    r.derivative(ctx, hs[i - 1])), 'verification-failed', 'Hasse recurrence');
}
export function nestedInputs(ctx: ExecutionContext, d: RdeDomain, factor: P<E>, ah: P<E>, bh: P<E>) {
  const r = d.orders, q = r.domain, zero = q.fromInteger(ctx, 0n), count = Math.max(ah.coefficients.length, bh.coefficients.length);
  ctx.allocate(factor.coefficients.length + count + 2);
  const first = d.resultantRing.make(ctx, factor.coefficients.map(c => r.constant(ctx, c)));
  const coefficients: P<E>[] = [];
  for (let i = 0; i < count; i++) coefficients.push(r.make(ctx, [bh.coefficients[i] ?? zero, q.negate(ctx, ah.coefficients[i] ?? zero)]));
  return [first, d.resultantRing.make(ctx, coefficients)] as const;
}
