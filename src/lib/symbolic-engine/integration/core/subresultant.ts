import { demand, type ExecutionContext } from './execution';
import { requireIntegralDomain, ringPower, type ExactIntegralDomain } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';
import { pseudoDivide, verifyPseudoDivision, type PseudoDivision } from './pseudo-division';

export interface SubresultantStep<E, D extends ExactIntegralDomain<E>> {
  readonly pseudo: PseudoDivision<E, D>;
  readonly divisor: E;
  readonly next: Polynomial<E, D>;
  /** Brown's negative principal scalar for this next remainder; null at termination. */
  readonly negativePrincipal: E | null;
}
export interface IndexedSubresultant<E, D extends ExactIntegralDomain<E>> {
  readonly index: number;
  readonly kind: 'ordinary' | 'highest-boundary';
  readonly polynomial: Polynomial<E, D>;
  readonly degree: number;
  readonly principal: E;
}
export interface SubresultantCertificate<E, D extends ExactIntegralDomain<E>> {
  readonly inputDegrees: readonly [number, number];
  readonly swapped: boolean;
  readonly steps: readonly SubresultantStep<E, D>[];
  readonly indexed: readonly IndexedSubresultant<E, D>[];
  readonly resultant: E;
}
function coefficientDivide<E, D extends ExactIntegralDomain<E>>(ctx: ExecutionContext,
  ring: PolynomialRing<E, D>, a: Polynomial<E, D>, b: E) {
  ctx.allocate(a.coefficients.length);
  return ring.make(ctx, a.coefficients.map(c => ring.domain.exactDivide(ctx, c, b)));
}
function sign<E>(ctx: ExecutionContext, domain: ExactIntegralDomain<E>, exponent: number): E {
  return domain.fromInteger(ctx, exponent % 2 ? -1n : 1n);
}

/** Brown PRS with its actual scaling. Input order is restored on all indexed outputs.
 * Mathematical reference: Brown (1978), as documented by SymPy 1.14 euclidtools.
 * Determinants are deliberately confined to independent test oracles. */
export function subresultants<E, D extends ExactIntegralDomain<E>>(ctx: ExecutionContext,
  ring: PolynomialRing<E, D>, a: Polynomial<E, D>, b: Polynomial<E, D>): SubresultantCertificate<E, D> {
  const domain = ring.domain; requireIntegralDomain(domain);
  const da = ring.degree(ctx, a), db = ring.degree(ctx, b), swapped = da < db;
  let f = swapped ? b : a, g = swapped ? a : b;
  const m = Math.max(da, db), n = Math.min(da, db);
  ctx.allocate(Math.max(n + 1, 0) * 2 + 4);
  const steps: SubresultantStep<E, D>[] = [];
  const values = new Map<number, Polynomial<E, D>>();
  let resultant = domain.fromInteger(ctx, 0n);
  if (n >= 0) {
    let c = domain.negate(ctx, ringPower(ctx, domain, ring.leading(ctx, g), m - n));
    let divisor = sign(ctx, domain, m - n + 1);
    if (m > n) values.set(n, ring.scale(ctx, g, ringPower(ctx, domain, ring.leading(ctx, g), m - n - 1)));
    if (n === 0) resultant = ringPower(ctx, domain, ring.leading(ctx, g), m);
    else {
      while (true) {
        ctx.tick();
        const pseudo = pseudoDivide(ctx, ring, f, g);
        const next = coefficientDivide(ctx, ring, pseudo.remainder, divisor);
        const degree = ring.degree(ctx, next), previousDegree = ring.degree(ctx, g);
        if (degree < 0) {
          ctx.allocate(4); steps.push(Object.freeze({ pseudo, divisor, next, negativePrincipal: null })); break;
        }
        const drop = previousDegree - degree;
        const negativeLc = domain.negate(ctx, ring.leading(ctx, next));
        const nextC = drop === 1 ? negativeLc : domain.exactDivide(ctx,
          ringPower(ctx, domain, negativeLc, drop), ringPower(ctx, domain, c, drop - 1));
        ctx.allocate(4); steps.push(Object.freeze({ pseudo, divisor, next, negativePrincipal: nextC }));
        values.set(previousDegree - 1, next);
        values.set(degree, coefficientDivide(ctx, ring, ring.scale(ctx, next, domain.negate(ctx, nextC)), ring.leading(ctx, next)));
        if (degree === 0) resultant = domain.negate(ctx, nextC);
        divisor = domain.negate(ctx, domain.multiply(ctx, ring.leading(ctx, g), ringPower(ctx, domain, c, drop)));
        c = nextC; f = g; g = next;
      }
    }
  }
  const indexed: IndexedSubresultant<E, D>[] = [];
  const count = n < 0 ? 0 : n + (m > n ? 1 : 0);
  for (let j = 0; j < count; j++) {
    ctx.tick();
    const value = values.get(j) ?? ring.zero(ctx);
    const polynomial = swapped ? ring.scale(ctx, value, sign(ctx, domain, (da - j) * (db - j))) : value;
    ctx.allocate(5);
    indexed.push(Object.freeze({ index: j, kind: j === n ? 'highest-boundary' : 'ordinary', polynomial,
      degree: ring.degree(ctx, polynomial), principal: polynomial.coefficients[j] ?? domain.fromInteger(ctx, 0n) }));
  }
  if (swapped) resultant = domain.multiply(ctx, resultant, sign(ctx, domain, da * db));
  const proof = Object.freeze({ inputDegrees: Object.freeze([da, db] as const), swapped,
    steps: Object.freeze(steps), indexed: Object.freeze(indexed), resultant });
  verifySubresultants(ctx, ring, a, b, proof); return proof;
}

/** Checks the recurrence identities and index relations, without producing a PRS. */
export function verifySubresultants<E, D extends ExactIntegralDomain<E>>(ctx: ExecutionContext,
  ring: PolynomialRing<E, D>, a: Polynomial<E, D>, b: Polynomial<E, D>, proof: SubresultantCertificate<E, D>): void {
  const domain = ring.domain; requireIntegralDomain(domain);
  const da = ring.degree(ctx, a), db = ring.degree(ctx, b), m = Math.max(da, db), n = Math.min(da, db);
  const swapped = da < db;
  demand(proof.inputDegrees.length === 2 && proof.inputDegrees[0] === da && proof.inputDegrees[1] === db
    && proof.swapped === swapped, 'verification-failed', 'input order/degrees');
  ctx.allocate(proof.steps.length + proof.indexed.length);
  demand(proof.steps.length <= Math.max(n + 1, 0), 'verification-failed', 'PRS step count');
  let f = swapped ? b : a, g = swapped ? a : b;
  let expectedResultant = domain.fromInteger(ctx, 0n);
  const relations = new Map<number, { numerator: Polynomial<E, D>; denominator: E }>();
  const one = domain.fromInteger(ctx, 1n);
  if (n >= 0) {
    if (m > n) relations.set(n, { numerator: ring.scale(ctx, g, ringPower(ctx, domain, ring.leading(ctx, g), m - n - 1)), denominator: one });
    if (n === 0) expectedResultant = ringPower(ctx, domain, ring.leading(ctx, g), m);
    let c = domain.negate(ctx, ringPower(ctx, domain, ring.leading(ctx, g), m - n));
    let divisor = sign(ctx, domain, m - n + 1);
    for (let i = 0; i < proof.steps.length; i++) {
      ctx.tick(); const step = proof.steps[i];
      demand(n > 0 && !ring.isZero(ctx, g), 'verification-failed', 'unexpected PRS step');
      verifyPseudoDivision(ctx, ring, f, g, step.pseudo);
      demand(domain.equal(ctx, step.divisor, divisor) && !domain.isZero(ctx, divisor), 'verification-failed', 'Brown normalization factor');
      demand(ring.equal(ctx, ring.scale(ctx, step.next, divisor), step.pseudo.remainder), 'verification-failed', 'scaled PRS identity');
      const degree = ring.degree(ctx, step.next), previousDegree = ring.degree(ctx, g);
      demand(degree < previousDegree, 'verification-failed', 'PRS degree transition');
      if (degree < 0) {
        demand(step.negativePrincipal === null && i === proof.steps.length - 1, 'verification-failed', 'PRS termination');
        g = step.next; break;
      }
      const drop = previousDegree - degree, nextC = step.negativePrincipal;
      demand(nextC !== null, 'verification-failed', 'missing principal scalar');
      demand(domain.equal(ctx, domain.multiply(ctx, nextC, ringPower(ctx, domain, c, drop - 1)),
        ringPower(ctx, domain, domain.negate(ctx, ring.leading(ctx, step.next)), drop)), 'verification-failed', 'Brown principal recurrence');
      relations.set(previousDegree - 1, { numerator: step.next, denominator: one });
      const numerator = ring.scale(ctx, step.next, domain.negate(ctx, nextC)), denominator = ring.leading(ctx, step.next);
      if (drop === 1) demand(ring.equal(ctx, numerator, ring.scale(ctx, step.next, denominator)), 'verification-failed', 'coincident subresultant indices');
      relations.set(degree, { numerator, denominator });
      if (degree === 0) expectedResultant = domain.negate(ctx, nextC);
      divisor = domain.negate(ctx, domain.multiply(ctx, ring.leading(ctx, g), ringPower(ctx, domain, c, drop)));
      c = nextC; f = g; g = step.next;
    }
    demand(n === 0 ? proof.steps.length === 0 : ring.isZero(ctx, g), 'verification-failed', 'unterminated PRS');
  } else demand(proof.steps.length === 0, 'verification-failed', 'zero-input PRS');
  const count = n < 0 ? 0 : n + (m > n ? 1 : 0);
  demand(proof.indexed.length === count, 'verification-failed', 'indexed subresultant coverage');
  for (let j = 0; j < count; j++) {
    ctx.tick(); const entry = proof.indexed[j];
    demand(entry.index === j && entry.kind === (j === n ? 'highest-boundary' : 'ordinary')
      && entry.degree === ring.degree(ctx, entry.polynomial) && entry.degree <= j, 'verification-failed', 'subresultant index/degree');
    const relation = relations.get(j), signed = swapped
      ? ring.scale(ctx, entry.polynomial, sign(ctx, domain, (da - j) * (db - j))) : entry.polynomial;
    demand(relation ? ring.equal(ctx, ring.scale(ctx, signed, relation.denominator), relation.numerator) : ring.isZero(ctx, signed),
      'verification-failed', 'indexed subresultant scaling');
    demand(domain.equal(ctx, entry.principal, entry.polynomial.coefficients[j] ?? domain.fromInteger(ctx, 0n)),
      'verification-failed', 'principal coefficient');
  }
  if (swapped) expectedResultant = domain.multiply(ctx, expectedResultant, sign(ctx, domain, da * db));
  demand(domain.equal(ctx, proof.resultant, expectedResultant), 'verification-failed', 'scalar resultant');
  if (count > 0) demand(domain.equal(ctx, proof.resultant, proof.indexed[0].principal), 'verification-failed', 'resultant index zero');
}

export function scalarResultant<E, D extends ExactIntegralDomain<E>>(ctx: ExecutionContext,
  ring: PolynomialRing<E, D>, a: Polynomial<E, D>, b: Polynomial<E, D>): E {
  return subresultants(ctx, ring, a, b).resultant;
}
export function indexedSubresultant<E, D extends ExactIntegralDomain<E>>(ctx: ExecutionContext,
  ring: PolynomialRing<E, D>, a: Polynomial<E, D>, b: Polynomial<E, D>, index: number): IndexedSubresultant<E, D> {
  demand(Number.isSafeInteger(index) && index >= 0, 'invalid-input', 'subresultant index');
  const result = subresultants(ctx, ring, a, b).indexed[index];
  demand(result !== undefined, 'invalid-input', 'no indexed subresultant at this boundary'); return result;
}
