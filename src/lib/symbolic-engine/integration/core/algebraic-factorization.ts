import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import { subresultants, verifySubresultants, type SubresultantCertificate } from './subresultant';
import { extendedGcd, verifyBezout, type Bezout } from './polynomial-division';
import { checkedFactorSquareFree, verifyFactorSquareFree, factorIndex, type FactorSquareFree } from './factorization-square-free';
import { factorRecursivePolynomial, verifyRecursiveFactorizationInternal, type RecursivePolynomialFactorization } from './recursive-polynomial-factorization';
import { algebraicHeight, isAlgebraicField, type AlgebraicElement, type AlgebraicField } from './algebraic-field';

export interface AlgebraicFactor<E> { readonly polynomial: Polynomial<E>; readonly multiplicity: bigint }
export interface AlgebraicNorm<E> {
  readonly outer: PolynomialRing<E>;
  readonly ring: PolynomialRing<Polynomial<E>, PolynomialDomain<E>>;
  readonly proof: SubresultantCertificate<Polynomial<E>, PolynomialDomain<E>>;
}
export interface AlgebraicFactorComponent<E> {
  readonly shift: bigint;
  readonly shifted: Polynomial<AlgebraicElement<E>>;
  readonly norm: AlgebraicNorm<E>;
  readonly squareFreeNorm: Bezout<E>;
  readonly parent: AlgebraicFactorization<E>;
  readonly gcds: readonly Bezout<AlgebraicElement<E>>[];
}
export type AlgebraicFactorization<E> =
  | Readonly<{kind: 'zero'; input: Polynomial<E>}>
  | Readonly<{kind: 'factorization'; input: Polynomial<E>; unit: E; factors: readonly AlgebraicFactor<E>[]} & (
    {route: 'linear'} | {route: 'base'; proof: RecursivePolynomialFactorization<E>} |
    {route: 'algebraic'; squareFree: FactorSquareFree<E>; components: readonly AlgebraicFactorComponent<unknown>[]})>;

/** Horner translation, charging only polynomials that are actually constructed. */
export function translatePolynomial<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, p: Polynomial<E>, shift: E): Polynomial<E> {
  ring.assert(ctx, p); ring.domain.assert(ctx, shift);
  const z = ring.make(ctx, [shift, ring.domain.fromInteger(ctx, 1n)]); let out = ring.zero(ctx);
  for (let i = p.coefficients.length - 1; i >= 0; i--) out = ring.add(ctx, ring.multiply(ctx, out, z), ring.constant(ctx, p.coefficients[i]));
  return out;
}
function normInputs<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, outer: PolynomialRing<E>,
  ring: PolynomialRing<Polynomial<E>, PolynomialDomain<E>>) {
  demand(outer.domain === owner.parent && outer.variable === input.ring.variable && ring.domain.ring === outer
    && ring.variable === owner.ring.variable, 'domain-mismatch', 'algebraic norm auxiliary owners');
  const n = owner.ring.degree(ctx, owner.modulus); ctx.allocate(n * input.coefficients.length);
  const coefficients = Array.from({length: n}, (_, j) => outer.make(ctx, input.coefficients.map(c => {
    owner.assert(ctx, c); return c.representative.coefficients[j] ?? owner.parent.fromInteger(ctx, 0n);
  })));
  return {a: ring.make(ctx, owner.modulus.coefficients.map(c => outer.constant(ctx, c))), b: ring.make(ctx, coefficients)};
}
export function algebraicNormPolynomial<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>): AlgebraicNorm<E> {
  const outer = new PolynomialRing(owner.parent, input.ring.variable), ring = new PolynomialRing(new PolynomialDomain(outer), owner.ring.variable);
  const {a, b} = normInputs(ctx, owner, input, outer, ring), proof = subresultants(ctx, ring, a, b);
  ctx.allocate(3); return Object.freeze({outer, ring, proof});
}
export function verifyAlgebraicNormPolynomial<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, input: Polynomial<AlgebraicElement<E>>, evidence: AlgebraicNorm<E>): void {
  const {a, b} = normInputs(ctx, owner, input, evidence.outer, evidence.ring);
  verifySubresultants(ctx, evidence.ring, a, b, evidence.proof);
}
export function factorAlgebraicPolynomialWithin<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, bounds: DifferentialBounds): AlgebraicFactorization<E> {
  algebraicHeight(ctx, ring.domain, bounds); ring.assert(ctx, input);
  if (ring.isZero(ctx, input)) return Object.freeze({kind: 'zero', input});
  if (ring.degree(ctx, input) <= 1) {
    const unit = ring.leading(ctx, input), factors = ring.degree(ctx, input) === 0 ? [] :
      [Object.freeze({polynomial: ring.scale(ctx, input, ring.domain.inverse(ctx, unit)), multiplicity: 1n})];
    ctx.allocate(6); return Object.freeze({kind: 'factorization', route: 'linear' as const, input, unit, factors: Object.freeze(factors)});
  }
  if (!isAlgebraicField(ring.domain)) {
    const proof = factorRecursivePolynomial(ctx, ring, input, bounds);
    demand(proof.kind === 'factorization', 'verification-failed', 'base factorization zero');
    ctx.allocate(5); return Object.freeze({kind: 'factorization', route: 'base' as const, input, unit: proof.unit, factors: proof.factors, proof});
  }
  const owner: AlgebraicField<unknown> = ring.domain, r = ring as unknown as PolynomialRing<AlgebraicElement<unknown>>;
  const value = input as unknown as Polynomial<AlgebraicElement<unknown>>, squareFree = checkedFactorSquareFree(ctx, r, value);
  const components: AlgebraicFactorComponent<unknown>[] = [], factors: AlgebraicFactor<AlgebraicElement<unknown>>[] = [];
  for (const c of squareFree.components) {
    let shift = 0n;
    while (true) {
      ctx.integer(shift);
      const shifted = translatePolynomial(ctx, r, c.polynomial, owner.multiply(ctx, owner.fromInteger(ctx, -shift), owner.generator(ctx)));
      const norm = algebraicNormPolynomial(ctx, owner, shifted), squareFreeNorm = extendedGcd(ctx, norm.outer, norm.proof.resultant, norm.outer.derivative(ctx, norm.proof.resultant));
      if (norm.outer.equal(ctx, squareFreeNorm.gcd, norm.outer.one(ctx))) {
        const parent = factorAlgebraicPolynomialWithin(ctx, norm.outer, norm.proof.resultant, bounds);
        demand(parent.kind === 'factorization', 'verification-failed', 'nonzero square-free norm');
        ctx.allocate(parent.factors.length * 4); const gcds = parent.factors.map(f => {
          const lifted = r.make(ctx, f.polynomial.coefficients.map(v => owner.embed(ctx, v)));
          const gcd = extendedGcd(ctx, r, shifted, lifted);
          const polynomial = translatePolynomial(ctx, r, gcd.gcd, owner.multiply(ctx, owner.fromInteger(ctx, shift), owner.generator(ctx)));
          factors.push(Object.freeze({polynomial, multiplicity: c.multiplicity})); return gcd;
        });
        components.push(Object.freeze({shift, shifted, norm, squareFreeNorm, parent, gcds: Object.freeze(gcds)})); break;
      }
      shift = ctx.add(shift, 1n);
    }
  }
  ctx.allocate(7); const result = Object.freeze({kind: 'factorization' as const, route: 'algebraic' as const, input: value,
    unit: squareFree.scalar, factors: Object.freeze(factors), squareFree, components: Object.freeze(components)}) as unknown as AlgebraicFactorization<E>;
  verifyAlgebraicFactorizationWithin(ctx, ring, input, result, bounds); return result;
}
export function verifyAlgebraicFactorizationWithin<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, decision: AlgebraicFactorization<E>, bounds: DifferentialBounds): void {
  algebraicHeight(ctx, ring.domain, bounds); demand(ring.equal(ctx, decision.input, input), 'verification-failed', 'algebraic factor input');
  if (decision.kind === 'zero') { demand(ring.isZero(ctx, input), 'verification-failed', 'false zero factorization'); return; }
  demand(decision.kind === 'factorization' && !ring.isZero(ctx, input), 'verification-failed', 'factorization kind');
  let index = 0;
  if (decision.route === 'linear') {
    const degree = ring.degree(ctx, input);
    demand(degree <= 1 && decision.factors.length === degree && ring.domain.equal(ctx, decision.unit, ring.leading(ctx, input)),
      'verification-failed', 'linear irreducibility coverage'); index = degree;
  } else if (!isAlgebraicField(ring.domain)) {
    demand(decision.route === 'base', 'verification-failed', 'base factorization route');
    verifyRecursiveFactorizationInternal(ctx, ring, input, decision.proof, bounds);
    demand(decision.proof.kind === 'factorization' && ring.domain.equal(ctx, decision.unit, decision.proof.unit)
      && decision.factors.length === decision.proof.factors.length, 'verification-failed', 'base factorization coverage');
    for (const f of decision.proof.factors) {
      demand(ring.equal(ctx, decision.factors[index].polynomial, f.polynomial) && decision.factors[index].multiplicity === f.multiplicity,
        'verification-failed', 'base factor mapping'); index++;
    }
  } else {
    demand(decision.route === 'algebraic', 'verification-failed', 'algebraic factorization route');
    const owner: AlgebraicField<unknown> = ring.domain, r = ring as unknown as PolynomialRing<AlgebraicElement<unknown>>,
      sq = decision.squareFree as unknown as FactorSquareFree<AlgebraicElement<unknown>>;
    verifyFactorSquareFree(ctx, r, input as unknown as Polynomial<AlgebraicElement<unknown>>, sq);
    demand(decision.components.length === sq.components.length && owner.equal(ctx, decision.unit as unknown as AlgebraicElement<unknown>, sq.scalar),
      'verification-failed', 'algebraic square-free coverage');
    for (let i = 0; i < sq.components.length; i++) {
      const c = decision.components[i]; ctx.integer(c.shift); demand(c.shift >= 0n, 'verification-failed', 'norm shift');
      demand(r.equal(ctx, c.shifted, translatePolynomial(ctx, r, sq.components[i].polynomial,
        owner.multiply(ctx, owner.fromInteger(ctx, -c.shift), owner.generator(ctx)))), 'verification-failed', 'norm shift identity');
      verifyAlgebraicNormPolynomial(ctx, owner, c.shifted, c.norm);
      verifyBezout(ctx, c.norm.outer, c.norm.proof.resultant, c.norm.outer.derivative(ctx, c.norm.proof.resultant), c.squareFreeNorm);
      demand(c.norm.outer.equal(ctx, c.squareFreeNorm.gcd, c.norm.outer.one(ctx)), 'verification-failed', 'square-free norm required');
      verifyAlgebraicFactorizationWithin(ctx, c.norm.outer, c.norm.proof.resultant, c.parent, bounds);
      demand(c.parent.kind === 'factorization' && c.gcds.length === c.parent.factors.length, 'verification-failed', 'norm factor coverage');
      for (let j = 0; j < c.parent.factors.length; j++) {
        const f = c.parent.factors[j], gcd = c.gcds[j]; demand(f.multiplicity === 1n, 'verification-failed', 'norm factor multiplicity');
        verifyBezout(ctx, r, c.shifted, r.make(ctx, f.polynomial.coefficients.map(v => owner.embed(ctx, v))), gcd);
        demand(r.degree(ctx, gcd.gcd) > 0 && index < decision.factors.length, 'verification-failed', 'irreducible norm component missing');
        const out = decision.factors[index++];
        demand(out.multiplicity === sq.components[i].multiplicity && r.equal(ctx, out.polynomial as unknown as Polynomial<AlgebraicElement<unknown>>,
          translatePolynomial(ctx, r, gcd.gcd, owner.multiply(ctx, owner.fromInteger(ctx, c.shift), owner.generator(ctx)))),
        'verification-failed', 'algebraic inverse factor mapping');
      }
    }
  }
  demand(index === decision.factors.length, 'verification-failed', 'extra algebraic factors');
  let product = ring.constant(ctx, decision.unit);
  for (let i = 0; i < decision.factors.length; i++) {
    const f = decision.factors[i];
    demand(f.multiplicity > 0n && ring.degree(ctx, f.polynomial) > 0 && ring.domain.equal(ctx, ring.leading(ctx, f.polynomial), ring.domain.fromInteger(ctx, 1n)),
      'verification-failed', 'algebraic factor normalization');
    for (let j = 0; j < i; j++) demand(!ring.equal(ctx, f.polynomial, decision.factors[j].polynomial), 'verification-failed', 'duplicate algebraic factor');
    product = ring.multiply(ctx, product, ring.power(ctx, f.polynomial, factorIndex(ctx, f.multiplicity)));
  }
  demand(ring.equal(ctx, product, input), 'verification-failed', 'complete algebraic reconstruction');
}
export function factorAlgebraicPolynomial<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => factorAlgebraicPolynomialWithin(ctx, ring, input, bounds));
}
export function verifyAlgebraicPolynomialFactorization<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, decision: AlgebraicFactorization<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyAlgebraicFactorizationWithin(ctx, ring, input, decision, bounds));
}
