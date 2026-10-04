import { demand, type ExecutionContext } from './execution';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import { exactDivide, polynomialGcd, verifyBezout, type Bezout } from './polynomial-division';
import { pseudoDivide } from './pseudo-division';
import type { FractionCoefficient } from './fraction-coefficient';

/** Fraction-free working polynomials in K[x][t]. Neither these records nor
 * their scaling are serialized. All results cross the existing checked boundary. */
function compute<E, C>(ctx: ExecutionContext, source: PolynomialRing<E>,
  adapter: FractionCoefficient<E, C>, a: Polynomial<E>, b: Polynomial<E>): Bezout<E> {
  const x = adapter.ring, domain = new PolynomialDomain(x), r = new PolynomialRing(domain, source.variable);
  type P = Polynomial<Polynomial<C>, PolynomialDomain<C>>;
  type Witness = { s: P; t: P; denominator: Polynomial<C> };
  ctx.allocate(8);
  const one = x.one(ctx), zero = r.zero(ctx);
  function primitive(p: P) {
    let content = x.zero(ctx);
    for (const c of p.coefficients) {
      ctx.tick(); content = polynomialGcd(ctx, x, content, c);
      if (x.equal(ctx, content, one)) break;
    }
    if (r.isZero(ctx, p)) { ctx.allocate(2); return { polynomial: p, content: one }; }
    ctx.allocate(p.coefficients.length + 2);
    const polynomial = r.make(ctx, p.coefficients.map(c => exactDivide(ctx, x, c, content)));
    demand(r.equal(ctx, r.scale(ctx, polynomial, content), p), 'verification-failed', 'primitive PRS reconstruction');
    return { polynomial, content };
  }
  function clear(p: Polynomial<E>) {
    source.assert(ctx, p); ctx.allocate(p.coefficients.length);
    const cs = p.coefficients.map(c => adapter.read(ctx, c)); let denominator = one;
    for (const c of cs) {
      ctx.tick();
      if (!x.equal(ctx, denominator, c.denominator)) denominator = x.multiply(ctx,
        exactDivide(ctx, x, denominator, polynomialGcd(ctx, x, denominator, c.denominator)), c.denominator);
    }
    ctx.allocate(cs.length);
    const raw = r.make(ctx, cs.map(c => x.multiply(ctx, c.numerator, exactDivide(ctx, x, denominator, c.denominator))));
    for (let i = 0; i < cs.length; i++) {
      ctx.tick(); demand(x.equal(ctx, x.multiply(ctx, raw.coefficients[i], cs[i].denominator),
        x.multiply(ctx, cs[i].numerator, denominator)), 'verification-failed', 'fraction coefficient conversion');
    }
    const result = primitive(raw); ctx.allocate(3); return { ...result, denominator };
  }
  function normalize(w: Witness): Witness {
    let g = w.denominator;
    ctx.allocate(2);
    for (const p of [w.s, w.t]) for (const c of p.coefficients) {
      ctx.tick(); if (x.equal(ctx, g, one)) break; g = polynomialGcd(ctx, x, g, c);
    }
    const d = exactDivide(ctx, x, w.denominator, g);
    const divide = (p: P) => { ctx.allocate(p.coefficients.length); return r.make(ctx, p.coefficients.map(c => exactDivide(ctx, x, c, g))); };
    const s = divide(w.s), t = divide(w.t); ctx.allocate(3);
    demand(r.equal(ctx, r.scale(ctx, s, g), w.s) && r.equal(ctx, r.scale(ctx, t, g), w.t)
      && x.equal(ctx, x.multiply(ctx, d, g), w.denominator), 'verification-failed', 'PRS witness cancellation');
    return { s, t, denominator: d };
  }
  const ac = clear(a), bc = clear(b);
  let old = ac.polynomial, current = bc.polynomial;
  ctx.allocate(6);
  let previous: Witness = { s: r.constant(ctx, ac.denominator), t: zero, denominator: ac.content };
  let witness: Witness = { s: zero, t: r.constant(ctx, bc.denominator), denominator: bc.content };
  while (!r.isZero(ctx, current)) {
    ctx.tick(); const step = pseudoDivide(ctx, r, old, current), next = primitive(step.remainder);
    if (r.isZero(ctx, next.polynomial)) { old = current; previous = witness; break; }
    const gcd = polynomialGcd(ctx, x, previous.denominator, witness.denominator);
    const pd = exactDivide(ctx, x, previous.denominator, gcd), wd = exactDivide(ctx, x, witness.denominator, gcd);
    const transition = (s: P, t: P) => r.subtract(ctx, r.scale(ctx, s, x.multiply(ctx, step.multiplier, wd)),
      r.scale(ctx, r.multiply(ctx, step.quotient, t), pd));
    ctx.allocate(3);
    const w = normalize({ s: transition(previous.s, witness.s), t: transition(previous.t, witness.t),
      denominator: x.multiply(ctx, x.multiply(ctx, pd, witness.denominator), next.content) });
    old = current; current = next.polynomial; previous = witness; witness = w;
  }
  if (r.isZero(ctx, old)) { ctx.allocate(3); return Object.freeze({ gcd: source.zero(ctx), s: source.zero(ctx), t: source.zero(ctx) }); }
  const lc = r.leading(ctx, old), denominator = x.multiply(ctx, previous.denominator, lc);
  const lift = (p: P, d: Polynomial<C>) => {
    ctx.allocate(p.coefficients.length); return source.make(ctx, p.coefficients.map(c => adapter.make(ctx, c, d)));
  };
  ctx.allocate(3);
  return Object.freeze({ gcd: lift(old, lc), s: lift(previous.s, denominator), t: lift(previous.t, denominator) });
}

export function primitiveExtendedGcd<E, C>(ctx: ExecutionContext, source: PolynomialRing<E>,
  adapter: FractionCoefficient<E, C>, a: Polynomial<E>, b: Polynomial<E>): Bezout<E> {
  const result = compute(ctx, source, adapter, a, b);
  verifyBezout(ctx, source, a, b, result); return result;
}
