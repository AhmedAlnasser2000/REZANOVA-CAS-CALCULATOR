import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import { checkDifferentialBounds, type DifferentialBounds } from './differential-field';
import { PolynomialRing, assertPolynomialRingOwner, type Polynomial } from './polynomial';
import { MultivariateRing } from './multivariate-polynomial';
import { checkArtifactBounds, inspectExactArtifact } from './artifact-bounds';
import { factorCoefficientDomain } from './factorization-domain';
import { normalizationInteger, normalizationKind } from './exponential-normalization-wire-values';
import { rationalFactorizationCodec } from './factorization-codecs';
import { factorConversionCodec, factorMultivariateTreeCodec, factorSparsePrimitiveCodec, factorSparseSquareFreeCodec } from './factorization-recursive-codecs';
import { verifyRecursiveFactorizationInternal, type RecursivePolynomialFactorization } from './recursive-polynomial-factorization';
import * as w from './decision-wire-algebra';

function codec<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, bounds: DifferentialBounds): w.EvidenceCodec<RecursivePolynomialFactorization<E>> {
  const domain = factorCoefficientDomain(ctx, ring.domain, bounds.towerHeight), element = domain.codec(ctx), p = w.polynomial(ctx, ring, element);
  const zero = w.structure(ctx, {kind: w.literal(ctx, 'zero'), input: p});
  const base = {kind: w.literal(ctx, 'factorization'), input: p, unit: element,
    factors: w.list(ctx, w.structure(ctx, {polynomial: p, multiplicity: normalizationInteger(ctx)}))};
  if (domain.height === 0) {
    const rational = w.structure(ctx, {...base, route: w.literal(ctx, 'rational'), proof: rationalFactorizationCodec(ctx, new PolynomialRing(Q, ring.variable))});
    return {encode(v) { if (v.kind === 'zero') return zero.encode(v); demand(v.route === 'rational', 'verification-failed', 'factor wire route');
      // Encode the separately owned Q proof in its actual ring, without a printed-name ownership shortcut.
      return w.structure(ctx, {...base, route: w.literal(ctx, 'rational'), proof: rationalFactorizationCodec(ctx, v.proof.input.ring)}).encode(v); },
    decode(v) { if (normalizationKind(v) === 'zero') return zero.decode(v); return rational.decode(v); }};
  }
  function recursive(auxiliary: MultivariateRing<import('./rational').Rational>) {
    return w.structure(ctx, {...base, route: w.literal(ctx, 'recursive'), conversion: factorConversionCodec(ctx, auxiliary), squareFree: factorSparseSquareFreeCodec(ctx, auxiliary),
      components: w.list(ctx, w.structure(ctx, {primitive: factorSparsePrimitiveCodec(ctx, auxiliary), tree: factorMultivariateTreeCodec(ctx, auxiliary)}))});
  }
  return {encode(v) { if (v.kind === 'zero') return zero.encode(v); demand(v.route === 'recursive', 'verification-failed', 'factor wire route'); return recursive(v.auxiliary).encode(v); },
    decode(v) { if (normalizationKind(v) === 'zero') return zero.decode(v);
      const auxiliary = MultivariateRing.create(ctx, Q, domain.height + 1), decoded = recursive(auxiliary).decode(v); ctx.allocate(1);
      return Object.freeze({...decoded, auxiliary}); }};
}
export function encodeRecursivePolynomialFactorization<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, decision: RecursivePolynomialFactorization<E>, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => {
    checkArtifactBounds(ctx, bounds); verifyRecursiveFactorizationInternal(ctx, ring, input, decision, bounds); ctx.allocate(3);
    const data = Object.freeze({tag: 'recursive-polynomial-factorization', version: 1, decision: codec(ctx, ring, bounds).encode(decision)});
    inspectExactArtifact(ctx, bounds, data); return data;
  });
}
export function decodeRecursivePolynomialFactorization<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, data: unknown, bounds: DifferentialBounds): RecursivePolynomialFactorization<E> {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
    assertPolynomialRingOwner(ctx, ring); ring.assert(ctx, input);
    const raw = w.record(ctx, data, ['tag', 'version', 'decision']);
    demand(raw.tag === 'recursive-polynomial-factorization' && raw.version === 1, 'invalid-input', 'factorization artifact version');
    const decision = codec(ctx, ring, bounds).decode(raw.decision); verifyRecursiveFactorizationInternal(ctx, ring, input, decision, bounds); return decision;
  });
}
