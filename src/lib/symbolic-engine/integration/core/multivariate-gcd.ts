import { demand, type ExecutionContext } from './execution';
import { assertMultivariateRing, MultivariateRing, type MultivariatePolynomial as P } from './multivariate-polynomial';

export interface MultivariateContent<E> {
  readonly content: P<E>;
  readonly primitive: P<E>;
  readonly chain: readonly MultivariateGcd<E>[];
}
export interface MultivariatePseudoDivision<E> {
  readonly quotient: P<E>;
  readonly remainder: P<E>;
  readonly multiplier: P<E>;
}
interface GcdResult<E> { readonly gcd: P<E>; readonly left: P<E>; readonly right: P<E> }
export type MultivariateGcd<E> = GcdResult<E> & (
  | { readonly kind: 'zero' | 'scalar' }
  | { readonly kind: 'recursive'; readonly a: MultivariateContent<E>; readonly b: MultivariateContent<E>;
      readonly content: MultivariateGcd<E>;
      readonly steps: readonly { readonly division: MultivariatePseudoDivision<E>; readonly content: MultivariateContent<E> }[];
      /** s*A+t*B=lift(denominator)*terminal; a Bezout identity in the coefficient fraction field. */
      readonly s: P<E>; readonly t: P<E>; readonly denominator: P<E> }
);

function lower<E>(ring: MultivariateRing<E>): MultivariateRing<E> {
  demand(ring.lower !== undefined, 'domain-mismatch', 'multivariate recursion'); return ring.lower;
}
function power<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, n: number): P<E> {
  let out = ring.one(ctx), base = a;
  while (n) { ctx.tick(); if (n % 2) out = ring.multiply(ctx, out, base); n = Math.floor(n / 2); if (n) base = ring.multiply(ctx, base, base); }
  return out;
}
function content<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>): MultivariateContent<E> {
  const r = lower(ring), cs = ring.coefficients(ctx, a), chain: MultivariateGcd<E>[] = [];
  let c = r.zero(ctx); ctx.allocate(cs.length + 3);
  for (const value of cs) { ctx.tick(); const step = compute(ctx, r, c, value); chain.push(step); c = step.gcd; }
  const primitive = ring.isZero(ctx, a) ? a : ring.exactDivide(ctx, a, ring.lift(ctx, c));
  return Object.freeze({content: c, primitive, chain: Object.freeze(chain)});
}
function checkContent<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, proof: MultivariateContent<E>): void {
  const r = lower(ring), cs = ring.coefficients(ctx, a);
  demand(Array.isArray(proof.chain) && proof.chain.length === cs.length, 'verification-failed', 'content coefficient coverage');
  let c = r.zero(ctx);
  for (let i = 0; i < cs.length; i++) { ctx.tick(); check(ctx, r, c, cs[i], proof.chain[i]); c = proof.chain[i].gcd; }
  demand(r.equal(ctx, c, proof.content), 'verification-failed', 'coefficient content');
  ring.assert(ctx, proof.primitive);
  demand(ring.equal(ctx, ring.multiply(ctx, ring.lift(ctx, c), proof.primitive), a), 'verification-failed', 'primitive reconstruction');
  if (ring.isZero(ctx, a)) demand(ring.isZero(ctx, proof.primitive), 'verification-failed', 'zero primitive');
}
function pseudo<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, b: P<E>): MultivariatePseudoDivision<E> {
  const r = lower(ring), degree = ring.outerDegree(ctx, b);
  demand(degree >= 0, 'division-by-zero', 'multivariate pseudo divisor');
  const lc = ring.outerLeading(ctx, b), exponent = Math.max(ring.outerDegree(ctx, a) - degree + 1, 0);
  let remainder = a, quotient = ring.zero(ctx), remaining = exponent;
  while (!ring.isZero(ctx, remainder) && ring.outerDegree(ctx, remainder) >= degree) {
    ctx.tick();
    const term = ring.lift(ctx, ring.outerLeading(ctx, remainder), ring.outerDegree(ctx, remainder) - degree);
    quotient = ring.add(ctx, ring.multiply(ctx, ring.lift(ctx, lc), quotient), term);
    remainder = ring.subtract(ctx, ring.multiply(ctx, ring.lift(ctx, lc), remainder), ring.multiply(ctx, term, b));
    remaining--;
  }
  const tail = ring.lift(ctx, power(ctx, r, lc, remaining)); ctx.allocate(3);
  return Object.freeze({ quotient: ring.multiply(ctx, tail, quotient), remainder: ring.multiply(ctx, tail, remainder),
    multiplier: power(ctx, r, lc, exponent) });
}
function checkPseudo<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, b: P<E>, proof: MultivariatePseudoDivision<E>): void {
  const r = lower(ring), degree = ring.outerDegree(ctx, b);
  demand(degree >= 0, 'verification-failed', 'zero pseudo divisor');
  const multiplier = power(ctx, r, ring.outerLeading(ctx, b), Math.max(ring.outerDegree(ctx, a) - degree + 1, 0));
  demand(r.equal(ctx, multiplier, proof.multiplier), 'verification-failed', 'pseudo multiplier');
  demand(ring.outerDegree(ctx, proof.remainder) < degree, 'verification-failed', 'pseudo degree');
  demand(ring.equal(ctx, ring.multiply(ctx, ring.lift(ctx, multiplier), a),
    ring.add(ctx, ring.multiply(ctx, proof.quotient, b), proof.remainder)), 'verification-failed', 'pseudo identity');
}
function compute<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, b: P<E>): MultivariateGcd<E> {
  ring.assert(ctx, a); ring.assert(ctx, b); ctx.allocate(5);
  if (ring.isZero(ctx, a) || ring.isZero(ctx, b)) {
    const g = ring.monic(ctx, ring.isZero(ctx, a) ? b : a);
    return Object.freeze({kind: 'zero', gcd: g,
      left: ring.isZero(ctx, g) ? ring.zero(ctx) : ring.exactDivide(ctx, a, g),
      right: ring.isZero(ctx, g) ? ring.zero(ctx) : ring.exactDivide(ctx, b, g)});
  }
  if (ring.arity === 0) return Object.freeze({kind: 'scalar', gcd: ring.one(ctx), left: a, right: b});
  const r = lower(ring), ac = content(ctx, ring, a), bc = content(ctx, ring, b);
  const cg = compute(ctx, r, ac.content, bc.content);
  let previous = ac.primitive, current = bc.primitive;
  let ps = ring.one(ctx), pt = ring.zero(ctx), pd = ac.content;
  let s = ring.zero(ctx), t = ring.one(ctx), d = bc.content;
  const steps: {division: MultivariatePseudoDivision<E>; content: MultivariateContent<E>}[] = [];
  while (!ring.isZero(ctx, current)) {
    ctx.tick(); const division = pseudo(ctx, ring, previous, current), pc = content(ctx, ring, division.remainder);
    ctx.allocate(3); steps.push(Object.freeze({division, content: pc}));
    if (ring.isZero(ctx, pc.primitive)) { previous = current; ps = s; pt = t; pd = d; break; }
    const transition = (u: P<E>, v: P<E>) => ring.subtract(ctx,
      ring.multiply(ctx, ring.lift(ctx, r.multiply(ctx, division.multiplier, d)), u),
      ring.multiply(ctx, ring.multiply(ctx, division.quotient, v), ring.lift(ctx, pd)));
    const ns = transition(ps, s), nt = transition(pt, t), nd = r.multiply(ctx, r.multiply(ctx, pd, d), pc.content);
    previous = current; current = pc.primitive;
    ps = s; pt = t; pd = d; s = ns; t = nt; d = nd;
  }
  const g = ring.monic(ctx, ring.multiply(ctx, ring.lift(ctx, cg.gcd), previous));
  return Object.freeze({kind: 'recursive', gcd: g, left: ring.exactDivide(ctx, a, g), right: ring.exactDivide(ctx, b, g),
    a: ac, b: bc, content: cg, steps: Object.freeze(steps), s: ps, t: pt, denominator: pd});
}
function check<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, b: P<E>, proof: MultivariateGcd<E>): void {
  ring.assert(ctx, a); ring.assert(ctx, b); ring.assert(ctx, proof.gcd);
  demand(ring.equal(ctx, ring.multiply(ctx, proof.gcd, proof.left), a)
    && ring.equal(ctx, ring.multiply(ctx, proof.gcd, proof.right), b), 'verification-failed', 'GCD divisibility');
  demand(ring.equal(ctx, proof.gcd, ring.monic(ctx, proof.gcd)), 'verification-failed', 'GCD normalization');
  const az = ring.isZero(ctx, a), bz = ring.isZero(ctx, b);
  if (az || bz) {
    demand(proof.kind === 'zero' && ring.equal(ctx, proof.gcd, ring.monic(ctx, az ? b : a)), 'verification-failed', 'zero GCD');
    if (az && bz) demand(ring.isZero(ctx, proof.left) && ring.isZero(ctx, proof.right), 'verification-failed', 'zero GCD cofactors');
    return;
  }
  if (ring.arity === 0) {
    demand(proof.kind === 'scalar' && ring.equal(ctx, proof.gcd, ring.one(ctx)), 'verification-failed', 'scalar GCD'); return;
  }
  demand(proof.kind === 'recursive', 'verification-failed', 'GCD recursive evidence');
  const r = lower(ring); checkContent(ctx, ring, a, proof.a); checkContent(ctx, ring, b, proof.b);
  check(ctx, r, proof.a.content, proof.b.content, proof.content);
  demand(Array.isArray(proof.steps) && proof.steps.length > 0, 'verification-failed', 'missing primitive PRS');
  let previous = proof.a.primitive, current = proof.b.primitive;
  for (const step of proof.steps) {
    ctx.tick(); demand(!ring.isZero(ctx, current), 'verification-failed', 'extra PRS step');
    checkPseudo(ctx, ring, previous, current, step.division); checkContent(ctx, ring, step.division.remainder, step.content);
    previous = current; current = step.content.primitive;
  }
  demand(ring.isZero(ctx, current), 'verification-failed', 'incomplete primitive PRS');
  demand(ring.equal(ctx, proof.gcd, ring.monic(ctx, ring.multiply(ctx, ring.lift(ctx, proof.content.gcd), previous))),
    'verification-failed', 'GCD content and primitive');
  demand(!r.isZero(ctx, proof.denominator), 'verification-failed', 'zero Bezout denominator');
  demand(ring.equal(ctx, ring.add(ctx, ring.multiply(ctx, proof.s, a), ring.multiply(ctx, proof.t, b)),
    ring.multiply(ctx, ring.lift(ctx, proof.denominator), previous)), 'verification-failed', 'coefficient field Bezout');
}

export function multivariateGcd<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, b: P<E>): MultivariateGcd<E> {
  return ctx.operation(() => { assertMultivariateRing(ctx, ring); const proof = compute(ctx, ring, a, b); check(ctx, ring, a, b, proof); return proof; });
}
export function verifyMultivariateGcd<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, b: P<E>, proof: MultivariateGcd<E>): void {
  ctx.operation(() => { assertMultivariateRing(ctx, ring); check(ctx, ring, a, b, proof); });
}
/** Checked coefficient content, shared by normalization and Gauss conversion. */
export function multivariateContent<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>): MultivariateContent<E> {
  const proof = content(ctx, ring, a); checkContent(ctx, ring, a, proof); return proof;
}
export function verifyMultivariateContent<E>(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, proof: MultivariateContent<E>): void {
  checkContent(ctx, ring, a, proof);
}
