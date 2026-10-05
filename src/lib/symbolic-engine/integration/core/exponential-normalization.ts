import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds, DifferentialField, DifferentialElement as E } from './differential-field';
import { assertMultivariateRing, MultivariateRing, type MultivariatePolynomial as P } from './multivariate-polynomial';
import { multivariateGcd, verifyMultivariateGcd } from './multivariate-gcd';
import { constructExponentialBasis, verifyExponentialBasis } from './exponential-normalization-basis';
import { normalizationNodes, type NormalizationNode } from './exponential-normalization-expression';
import { classifyExponentialFraction, verifyExponentialClassification } from './exponential-normalization-classification';
import type { ExponentialNormalization, ExponentialNormalizationInput, ExponentialNormalizationStep,
  ExponentialFraction, ExponentialRestriction } from './exponential-normalization-types';

function fraction(ctx: ExecutionContext, numerator: P<E>, denominator: P<E>): ExponentialFraction {
  ctx.allocate(2); return Object.freeze({numerator, denominator});
}
function polynomialPower(ctx: ExecutionContext, ring: MultivariateRing<E>, a: P<E>, n: bigint): P<E> {
  let out = ring.one(ctx), base = a;
  while (n > 0n) {
    ctx.tick(); if (ctx.remainder(n, 2n)) out = ring.multiply(ctx, out, base);
    n = ctx.quotient(n, 2n); if (n) base = ring.multiply(ctx, base, base);
  }
  return out;
}
function raw(ctx: ExecutionContext, ring: MultivariateRing<E>, node: NormalizationNode,
  coordinates: readonly (readonly bigint[])[], steps: readonly ExponentialNormalizationStep[]): ExponentialFraction {
  const owner = ring.field;
  if (node.kind === 'rational') return fraction(ctx, ring.constant(ctx, node.value), ring.one(ctx));
  if (node.kind === 'exponential') {
    const cs = coordinates[node.argumentIndex]; demand(cs?.length === ring.arity, 'verification-failed', 'exponential coordinates');
    ctx.allocate(ring.arity * 2 + 4);
    const positive: number[] = [], negative: number[] = [];
    for (const n of cs) {
      ctx.integer(n); const size = n < 0n ? -n : n;
      if (size > BigInt(ctx.limits.degree)) ctx.exhaust('degree');
      positive.push(n >= 0n ? Number(size) : 0); negative.push(n < 0n ? Number(size) : 0);
    }
    return fraction(ctx, ring.make(ctx, [{powers: positive, coefficient: owner.fromInteger(ctx, 1n)}]),
      ring.make(ctx, [{powers: negative, coefficient: owner.fromInteger(ctx, 1n)}]));
  }
  if (node.kind === 'negate' || node.kind === 'power') {
    const a = steps[node.value].value;
    if (node.kind === 'negate') return fraction(ctx, ring.negate(ctx, a.numerator), a.denominator);
    if (node.exponent <= 0n) demand(!ring.isZero(ctx, a.numerator), node.exponent === 0n ? 'invalid-input' : 'division-by-zero', 'zero base with nonpositive power');
    const n = node.exponent < 0n ? -node.exponent : node.exponent;
    return node.exponent < 0n
      ? fraction(ctx, polynomialPower(ctx, ring, a.denominator, n), polynomialPower(ctx, ring, a.numerator, n))
      : fraction(ctx, polynomialPower(ctx, ring, a.numerator, n), polynomialPower(ctx, ring, a.denominator, n));
  }
  demand('left' in node && 'right' in node, 'invalid-input', 'binary normalization node');
  const a = steps[node.left].value, b = steps[node.right].value;
  if (node.kind === 'multiply') return fraction(ctx, ring.multiply(ctx, a.numerator, b.numerator), ring.multiply(ctx, a.denominator, b.denominator));
  if (node.kind === 'divide') {
    demand(!ring.isZero(ctx, b.numerator), 'division-by-zero', 'identically zero exponential divisor');
    return fraction(ctx, ring.multiply(ctx, a.numerator, b.denominator), ring.multiply(ctx, a.denominator, b.numerator));
  }
  const left = ring.multiply(ctx, a.numerator, b.denominator), right = ring.multiply(ctx, b.numerator, a.denominator);
  return fraction(ctx, node.kind === 'add' ? ring.add(ctx, left, right) : ring.subtract(ctx, left, right), ring.multiply(ctx, a.denominator, b.denominator));
}
function restrictions(ctx: ExecutionContext, owner: DifferentialField, ring: MultivariateRing<E>,
  flat: ReturnType<typeof normalizationNodes>, steps: readonly ExponentialNormalizationStep[]): readonly ExponentialRestriction[] {
  const out: ExponentialRestriction[] = [];
  function put(node: number, kind: ExponentialRestriction['kind'], provenance: string, value: ExponentialFraction) {
    demand(!ring.isZero(ctx, value.numerator), 'division-by-zero', 'identically zero retained restriction');
    ctx.allocate(5); out.push(Object.freeze({node, kind, provenance, value}));
  }
  for (let i = 0; i < flat.nodes.length; i++) {
    ctx.tick(); const node = flat.nodes[i];
    if (node.kind === 'rational' || node.kind === 'exponential') {
      demand(node.value.kind === 'fraction', 'domain-mismatch', 'normalization rational atom');
      const denominator = owner.fraction(ctx, owner.fractions!.make(ctx, node.value.value.denominator, owner.fractions!.ring.one(ctx)));
      put(i, node.kind === 'rational' ? 'rational-denominator' : 'argument-denominator', `atom:${i}`,
        fraction(ctx, ring.constant(ctx, denominator), ring.one(ctx)));
    } else if (node.kind === 'divide') put(i, 'division', `division:${i}`, steps[node.right].value);
    else if (node.kind === 'power' && node.exponent <= 0n) put(i, 'nonpositive-power', `power:${i}`, steps[node.value].value);
  }
  for (const r of flat.restrictions) put(r.node, 'supplied', r.provenance, steps[r.node].value);
  return Object.freeze(out);
}
function verify(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialNormalizationInput, proof: ExponentialNormalization, bounds: DifferentialBounds): void {
  const flat = normalizationNodes(ctx, owner, input, bounds);
  verifyExponentialBasis(ctx, owner, flat.arguments, proof.basis);
  const ring = proof.ring;
  assertMultivariateRing(ctx, ring);
  demand(ring instanceof MultivariateRing && ring.field === owner && ring.arity === proof.basis.basis.length,
    'domain-mismatch', 'normalization polynomial owner');
  demand(Array.isArray(proof.steps) && proof.steps.length === flat.nodes.length, 'verification-failed', 'normalization node coverage');
  for (let i = 0; i < flat.nodes.length; i++) {
    ctx.tick(); const a = raw(ctx, ring, flat.nodes[i], proof.basis.coordinates, proof.steps), step = proof.steps[i];
    verifyMultivariateGcd(ctx, ring, a.numerator, a.denominator, step.cancellation);
    const d = step.cancellation.right; demand(!ring.isZero(ctx, d), 'verification-failed', 'normalization denominator');
    const inverse = owner.inverse(ctx, d.terms[0].coefficient);
    demand(ring.equal(ctx, step.value.numerator, ring.scale(ctx, step.cancellation.left, inverse))
      && ring.equal(ctx, step.value.denominator, ring.scale(ctx, d, inverse)), 'verification-failed', 'cancellation normalized fraction');
    demand(ring.equal(ctx, ring.multiply(ctx, a.numerator, step.value.denominator), ring.multiply(ctx, a.denominator, step.value.numerator)),
      'verification-failed', 'normalization fraction identity');
  }
  const expected = restrictions(ctx, owner, ring, flat, proof.steps);
  demand(Array.isArray(proof.restrictions) && expected.length === proof.restrictions.length, 'verification-failed', 'restriction coverage');
  for (let i = 0; i < expected.length; i++) {
    const a = expected[i], b = proof.restrictions[i];
    demand(a.node === b.node && a.kind === b.kind && a.provenance === b.provenance
      && ring.equal(ctx, a.value.numerator, b.value.numerator) && ring.equal(ctx, a.value.denominator, b.value.denominator),
      'verification-failed', 'retained restriction');
  }
  verifyExponentialClassification(ctx, owner, classifyExponentialFraction(ctx, owner, proof.basis.basis, proof.steps[flat.root].value), proof.classification);
}

export function normalizeExponentialExpression(ctx: ExecutionContext, owner: DifferentialField,
  input: ExponentialNormalizationInput, bounds: DifferentialBounds): ExponentialNormalization {
  return ctx.operation(() => {
    const flat = normalizationNodes(ctx, owner, input, bounds), basis = constructExponentialBasis(ctx, owner, flat.arguments);
    const ring = MultivariateRing.create(ctx, owner, basis.basis.length), steps: ExponentialNormalizationStep[] = [];
    ctx.allocate(flat.nodes.length + 5);
    for (const node of flat.nodes) {
      ctx.tick(); const a = raw(ctx, ring, node, basis.coordinates, steps);
      const cancellation = multivariateGcd(ctx, ring, a.numerator, a.denominator);
      const inverse = owner.inverse(ctx, cancellation.right.terms[0].coefficient);
      ctx.allocate(2); steps.push(Object.freeze({cancellation, value: fraction(ctx, ring.scale(ctx, cancellation.left, inverse), ring.scale(ctx, cancellation.right, inverse))}));
    }
    const result = Object.freeze({ring, basis, steps: Object.freeze(steps), restrictions: restrictions(ctx, owner, ring, flat, steps),
      classification: classifyExponentialFraction(ctx, owner, basis.basis, steps[flat.root].value)});
    verify(ctx, owner, input, result, bounds); return result;
  });
}
export function verifyExponentialNormalization(ctx: ExecutionContext, owner: DifferentialField,
  input: ExponentialNormalizationInput, proof: ExponentialNormalization, bounds: DifferentialBounds): void {
  ctx.operation(() => verify(ctx, owner, input, proof, bounds));
}
