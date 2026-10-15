import { demand, type ExecutionContext } from './execution';
import type { ExactField } from './field';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import type { DifferentialBounds } from './differential-field';
import { inspectExactArtifact } from './artifact-bounds';
import { factorCoefficientDomain } from './factorization-domain';
import { recursiveFactorizationEvidenceCodec } from './recursive-polynomial-factorization-wire';
import { factorSquareFreeCodec } from './factorization-codecs';
import { normalizationInteger, normalizationKind, normalizationText } from './exponential-normalization-wire-values';
import { algebraicConstructionSources, algebraicConditions, verifyAlgebraicConditions, type AlgebraicConditionSource } from './algebraic-conditions';
import { AlgebraicField, algebraicHeight, isAlgebraicField, verifyAlgebraicConstructionWithin,
  type AlgebraicConstruction, type AlgebraicElement } from './algebraic-field';
import { verifyAlgebraicFactorizationWithin, type AlgebraicFactorization, type AlgebraicFactorComponent, type AlgebraicNorm, type AlgebraicFactorNorm } from './algebraic-factorization';
import { verifyAlgebraicChainWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative, type AlgebraicGeneratorDerivative } from './algebraic-derivative';
import {numberFieldPolynomialNormEvidenceCodec} from './number-field-polynomial-norm-wire';
import * as w from './decision-wire-algebra';

export function algebraicCoefficientCodec<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds): w.EvidenceCodec<E> {
  algebraicHeight(ctx, field, bounds);
  if (!isAlgebraicField(field)) return factorCoefficientDomain(ctx, field, bounds.towerHeight).codec(ctx);
  const owner: AlgebraicField<unknown> = field, p = w.polynomial(ctx, owner.ring, algebraicCoefficientCodec(ctx, owner.parent, bounds));
  return {encode(v) { owner.assert(ctx, v as unknown as AlgebraicElement<unknown>); return p.encode((v as unknown as AlgebraicElement<unknown>).representative); },
    decode(v) { const representative = p.decode(v), out = owner.make(ctx, representative);
      demand(owner.ring.equal(ctx, out.representative, representative), 'invalid-input', 'unreduced algebraic value'); return out as unknown as E; }};
}
export function algebraicNormCodec<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, variable: string,
  bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicNorm<E>> {
  const parts = (outer: PolynomialRing<E>, ring: PolynomialRing<Polynomial<E>, PolynomialDomain<E>>) =>
    w.prsEvidence(ctx, w.polynomial(ctx, ring, w.polynomial(ctx, outer, algebraicCoefficientCodec(ctx, owner.parent, bounds))),
      w.polynomial(ctx, outer, algebraicCoefficientCodec(ctx, owner.parent, bounds)));
  return {encode(v) { return parts(v.outer, v.ring).encode(v.proof); }, decode(v) {
    const outer = new PolynomialRing(owner.parent, variable), ring = new PolynomialRing(new PolynomialDomain(outer), owner.ring.variable);
    ctx.allocate(3); return Object.freeze({outer, ring, proof: parts(outer, ring).decode(v)});
  }};
}
/** Explicit nested v2 record; original Brown payloads still use their original verifier. */
export function algebraicFactorNormCodec<E>(ctx: ExecutionContext, owner: AlgebraicField<E>, inputRing: PolynomialRing<AlgebraicElement<E>>, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicFactorNorm<E>> {
  const original = algebraicNormCodec(ctx, owner, inputRing.variable, bounds);
  function compact(ring: AlgebraicNorm<E>['ring'], scalar: PolynomialRing<E>) {
    return w.structure(ctx, {format: w.literal(ctx, 'number-field-polynomial-norm-v2'), evidence: numberFieldPolynomialNormEvidenceCodec(ctx, owner, inputRing, ring, scalar, bounds)});
  }
  return {encode(value) {
    if (value.format !== 'number-field-polynomial-norm-v2') return original.encode(value);
    const scalar = value.evidence.resultant.method === 'complete-specialization' ? value.evidence.resultant.scalarRing : new PolynomialRing(owner.parent, owner.ring.variable);
    return compact(value.ring, scalar).encode(value);
  }, decode(data) {
    demand(data !== null && typeof data === 'object', 'invalid-input', 'factor norm record');
    if (!Object.hasOwn(data, 'format')) return original.decode(data);
    const outer = new PolynomialRing(owner.parent, inputRing.variable), ring = new PolynomialRing(new PolynomialDomain(outer), owner.ring.variable), scalar = new PolynomialRing(owner.parent, owner.ring.variable);
    const value = compact(ring, scalar).decode(data); ctx.allocate(4); return Object.freeze({...value, outer, ring});
  }};
}
export function algebraicFactorizationCodec<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicFactorization<E>> {
  const element = algebraicCoefficientCodec(ctx, ring.domain, bounds), p = w.polynomial(ctx, ring, element);
  const zero = w.structure(ctx, {kind: w.literal(ctx, 'zero'), input: p});
  const common = {kind: w.literal(ctx, 'factorization'), input: p, unit: element,
    factors: w.list(ctx, w.structure(ctx, {polynomial: p, multiplicity: normalizationInteger(ctx)}))};
  const linear = w.structure(ctx, {...common, route: w.literal(ctx, 'linear')});
  function route(v: unknown) { demand(v !== null && typeof v === 'object', 'invalid-input', 'factor codec record');
    const d = Object.getOwnPropertyDescriptor(v, 'route'); demand(d !== undefined && 'value' in d, 'invalid-input', 'factor codec route'); return d.value; }
  if (!isAlgebraicField(ring.domain)) {
    const base = w.structure(ctx, {...common, route: w.literal(ctx, 'base'), proof: recursiveFactorizationEvidenceCodec(ctx, ring, bounds)});
    return {encode(v) { if (v.kind === 'zero') return zero.encode(v); if (v.route === 'linear') return linear.encode(v);
      demand(v.route === 'base', 'verification-failed', 'base factor codec'); return base.encode(v); },
      decode(v) { return normalizationKind(v) === 'zero' ? zero.decode(v) : route(v) === 'linear' ? linear.decode(v) : base.decode(v); }};
  }
  const owner: AlgebraicField<unknown> = ring.domain, r = ring as unknown as PolynomialRing<AlgebraicElement<unknown>>;
  const c = algebraicCoefficientCodec(ctx, owner, bounds), poly = w.polynomial(ctx, r, c);
  const components: w.EvidenceCodec<AlgebraicFactorComponent<unknown>> = {
    encode(v) {
      const np = w.polynomial(ctx, v.norm.outer, algebraicCoefficientCodec(ctx, owner.parent, bounds));
      return w.structure(ctx, {shift: normalizationInteger(ctx), shifted: poly, norm: algebraicFactorNormCodec(ctx, owner, r, bounds),
        squareFreeNorm: w.bezout(ctx, np), parent: algebraicFactorizationCodec(ctx, v.norm.outer, bounds), gcds: w.list(ctx, w.bezout(ctx, poly))}).encode(v);
    }, decode(v) {
      const raw = w.record(ctx, v, ['shift', 'shifted', 'norm', 'squareFreeNorm', 'parent', 'gcds']);
      const norm = algebraicFactorNormCodec(ctx, owner, r, bounds).decode(raw.norm), np = w.polynomial(ctx, norm.outer, algebraicCoefficientCodec(ctx, owner.parent, bounds));
      return Object.freeze({shift: normalizationInteger(ctx).decode(raw.shift), shifted: poly.decode(raw.shifted), norm,
        squareFreeNorm: w.bezout(ctx, np).decode(raw.squareFreeNorm), parent: algebraicFactorizationCodec(ctx, norm.outer, bounds).decode(raw.parent),
        gcds: w.list(ctx, w.bezout(ctx, poly)).decode(raw.gcds)});
    },
  };
  const alg = w.structure(ctx, {...common, route: w.literal(ctx, 'algebraic'), squareFree: factorSquareFreeCodec(ctx, ring, element), components: w.list(ctx, components)});
  return {encode(v) { if (v.kind === 'zero') return zero.encode(v); if (v.route === 'linear') return linear.encode(v);
    demand(v.route === 'algebraic', 'verification-failed', 'algebraic factor codec'); return alg.encode(v); },
    decode(v) { return normalizationKind(v) === 'zero' ? zero.decode(v) : route(v) === 'linear' ? linear.decode(v) : alg.decode(v); }};
}
export function algebraicConstructionCodec<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, bounds: DifferentialBounds): w.EvidenceCodec<AlgebraicConstruction<E>> {
  const scalar = algebraicCoefficientCodec(ctx, ring.domain, bounds), p = w.polynomial(ctx, ring, scalar);
  return w.structure(ctx, {relation: p, monic: p, normalization: scalar, factorization: algebraicFactorizationCodec(ctx, ring, bounds), separable: w.bezout(ctx, p)});
}
/** Complete expected construction snapshots, bound to supplied owners. */
export function encodeAlgebraicSnapshot<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds): unknown {
  if (!isAlgebraicField(field)) {
    const base = factorCoefficientDomain(ctx, field, bounds.towerHeight);
    return Object.freeze({kind: base.height === 0 ? 'rational' : 'rational-function', variable: base.fraction?.ring.variable ?? null});
  }
  return Object.freeze({kind: 'algebraic', parent: encodeAlgebraicSnapshot(ctx, field.parent, bounds),
    construction: algebraicConstructionCodec(ctx, field.ring, bounds).encode(field.construction)});
}
export function verifyAlgebraicSnapshot<E>(ctx: ExecutionContext, field: ExactField<E>, data: unknown, bounds: DifferentialBounds): void {
  algebraicHeight(ctx, field, bounds);
  if (!isAlgebraicField(field)) {
    const raw = w.record(ctx, data, ['kind', 'variable']), expected = factorCoefficientDomain(ctx, field, bounds.towerHeight);
    demand(raw.kind === (expected.height === 0 ? 'rational' : 'rational-function') && raw.variable === (expected.fraction?.ring.variable ?? null),
      'domain-mismatch', 'expected algebraic base construction'); return;
  }
  const raw = w.record(ctx, data, ['kind', 'parent', 'construction']); demand(raw.kind === 'algebraic', 'domain-mismatch', 'algebraic snapshot kind');
  verifyAlgebraicSnapshot(ctx, field.parent, raw.parent, bounds);
  const proof = algebraicConstructionCodec(ctx, field.ring, bounds).decode(raw.construction);
  verifyAlgebraicConstructionWithin(ctx, field.ring, field.construction.relation, proof, bounds);
}
export type AlgebraicValueCodecFactory = <E>(field: ExactField<E>) => w.EvidenceCodec<E>;
export function algebraicDerivativeCodec<E>(ctx: ExecutionContext, field: ExactField<E>, bounds: DifferentialBounds, values: AlgebraicValueCodecFactory = owner => algebraicCoefficientCodec(ctx, owner, bounds)): w.EvidenceCodec<AlgebraicDerivative<E>> {
  const element = values(field);
  if (!isAlgebraicField(field)) return w.structure(ctx, {kind: w.literal(ctx, 'base'), input: element, derivative: element});
  const owner: AlgebraicField<unknown> = field, child = algebraicDerivativeCodec(ctx, owner.parent, bounds, values), c = values(owner);
  const rule: w.EvidenceCodec<AlgebraicGeneratorDerivative<unknown>> = w.structure(ctx, {coefficients: w.list(ctx, child), separant: c, inverse: c,
    bezout: w.bezout(ctx, w.polynomial(ctx, owner.ring, values(owner.parent))), derivative: c});
  const algebraic = w.structure(ctx, {kind: w.literal(ctx, 'algebraic'), input: element, derivative: element, rule, coefficients: w.list(ctx, child)});
  const embedded = w.structure(ctx, {kind: w.literal(ctx, 'embedded'), input: element, derivative: element, coefficient: w.optional(child)});
  return {encode(v) { demand(v.kind !== 'base', 'verification-failed', 'algebraic derivative codec'); return v.kind === 'embedded' ? embedded.encode(v) : algebraic.encode(v); },
    decode(v) { return normalizationKind(v) === 'embedded' ? embedded.decode(v) : algebraic.decode(v); }};
}
function artifact(ctx: ExecutionContext, bounds: DifferentialBounds, data: unknown, tag: string) {
  inspectExactArtifact(ctx, bounds, data); const raw = w.record(ctx, data, ['tag', 'version', 'construction', 'evidence', 'conditions']);
  demand(raw.tag === tag && raw.version === 1, 'invalid-input', 'algebraic artifact tag/version'); return raw;
}
export function algebraicConditionsCodec<E>(ctx: ExecutionContext, owner: ExactField<E>, bounds: DifferentialBounds, value = algebraicCoefficientCodec(ctx, owner, bounds)) {
  return w.list(ctx, w.structure(ctx, {kind: w.literal(ctx, 'denominator', 'nonzero'), path: normalizationText(ctx), value}));
}
function sources<E>(owner: ExactField<E>, values: readonly {value: E; path: string; nonzero?: boolean}[]): readonly AlgebraicConditionSource[] {
  return values.map(v => ({...v, field: owner as ExactField<unknown>}));
}
function requirements<E>(ctx: ExecutionContext, owner: ExactField<E>, values: readonly AlgebraicConditionSource[]) {
  return [...algebraicConstructionSources(ctx, owner), ...values];
}
function conditions<E>(ctx: ExecutionContext, owner: ExactField<E>, values: readonly AlgebraicConditionSource[], bounds: DifferentialBounds) {
  return algebraicConditionsCodec(ctx, owner, bounds).encode(algebraicConditions(ctx, owner, requirements(ctx, owner, values), bounds));
}
function checkConditions<E>(ctx: ExecutionContext, owner: ExactField<E>, values: readonly AlgebraicConditionSource[], data: unknown, bounds: DifferentialBounds) {
  verifyAlgebraicConditions(ctx, owner, requirements(ctx, owner, values), algebraicConditionsCodec(ctx, owner, bounds).decode(data), bounds);
}
function factorSources<E>(ring: PolynomialRing<E>, proof: AlgebraicFactorization<E>) {
  const out = sources(ring.domain, proof.input.coefficients.map((value, i) => ({value, path: `input.coefficient.${i}`})));
  return proof.kind === 'zero' ? out : [...out, ...proof.factors.flatMap((f, j) => sources(ring.domain,
    f.polynomial.coefficients.map((value, i) => ({value, path: `factor.${j}.coefficient.${i}`}))))];
}
function derivativeSources<E>(ctx: ExecutionContext, owner: ExactField<E>, input: E, target: E) {
  const out = [...sources(owner, [{value: input, path: 'input'}, {value: target, path: 'derivative'}])];
  for (let f: ExactField<unknown> = owner as ExactField<unknown>; isAlgebraicField(f); f = f.parent) {
    out.push({field: f, value: f.make(ctx, f.ring.derivative(ctx, f.modulus)), path: `derivation.${f.height}.separant`, nonzero: true});
  }
  return out;
}
function envelope(ctx: ExecutionContext, bounds: DifferentialBounds, tag: string, construction: unknown, evidence: unknown, conditions: unknown): unknown {
  ctx.allocate(5); const data = Object.freeze({tag, version: 1, construction, evidence, conditions}); inspectExactArtifact(ctx, bounds, data); return data;
}
export function encodeAlgebraicExtension<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, relation: Polynomial<E>, owner: AlgebraicField<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => {
    demand(owner.ring === ring, 'domain-mismatch', 'extension codec ring'); verifyAlgebraicChainWithin(ctx, owner, bounds);
    verifyAlgebraicConstructionWithin(ctx, ring, relation, owner.construction, bounds);
    const values = [...sources(ring.domain, relation.coefficients.map((value, i) => ({value, path: `relation.coefficient.${i}`}))),
      ...sources(ring.domain, [{value: owner.construction.normalization, path: 'relation.leading', nonzero: true}])];
    return envelope(ctx, bounds, 'algebraic-field-construction', encodeAlgebraicSnapshot(ctx, ring.domain, bounds), algebraicConstructionCodec(ctx, ring, bounds).encode(owner.construction), conditions(ctx, ring.domain, values, bounds));
  });
}
export function decodeAlgebraicExtension<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, relation: Polynomial<E>, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => {
    const raw = artifact(ctx, bounds, data, 'algebraic-field-construction'); verifyAlgebraicSnapshot(ctx, ring.domain, raw.construction, bounds);
    const proof = algebraicConstructionCodec(ctx, ring, bounds).decode(raw.evidence);
    checkConditions(ctx, ring.domain, [...sources(ring.domain, relation.coefficients.map((value, i) => ({value, path: `relation.coefficient.${i}`}))),
      ...sources(ring.domain, [{value: proof.normalization, path: 'relation.leading', nonzero: true}])], raw.conditions, bounds);
    return AlgebraicField.fromEvidence(ctx, ring, relation, proof, bounds);
  });
}
export function encodeAlgebraicValue<E>(ctx: ExecutionContext, owner: ExactField<E>, value: E, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicChainWithin(ctx, owner, bounds); return envelope(ctx, bounds, 'algebraic-field-value',
    encodeAlgebraicSnapshot(ctx, owner, bounds), algebraicCoefficientCodec(ctx, owner, bounds).encode(value), conditions(ctx, owner, sources(owner, [{value, path: 'value'}]), bounds)); });
}
export function decodeAlgebraicValue<E>(ctx: ExecutionContext, owner: ExactField<E>, data: unknown, bounds: DifferentialBounds): E {
  return ctx.operation(() => { const raw = artifact(ctx, bounds, data, 'algebraic-field-value'); verifyAlgebraicSnapshot(ctx, owner, raw.construction, bounds);
    const value = algebraicCoefficientCodec(ctx, owner, bounds).decode(raw.evidence);
    checkConditions(ctx, owner, sources(owner, [{value, path: 'value'}]), raw.conditions, bounds); return value; });
}
export function encodeAlgebraicPolynomialFactorization<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, proof: AlgebraicFactorization<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicChainWithin(ctx, ring.domain, bounds); verifyAlgebraicFactorizationWithin(ctx, ring, input, proof, bounds);
    return envelope(ctx, bounds, 'algebraic-polynomial-factorization', encodeAlgebraicSnapshot(ctx, ring.domain, bounds), algebraicFactorizationCodec(ctx, ring, bounds).encode(proof), conditions(ctx, ring.domain, factorSources(ring, proof), bounds)); });
}
export function decodeAlgebraicPolynomialFactorization<E>(ctx: ExecutionContext, ring: PolynomialRing<E>, input: Polynomial<E>, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { const raw = artifact(ctx, bounds, data, 'algebraic-polynomial-factorization'); verifyAlgebraicSnapshot(ctx, ring.domain, raw.construction, bounds);
    const proof = algebraicFactorizationCodec(ctx, ring, bounds).decode(raw.evidence); verifyAlgebraicFactorizationWithin(ctx, ring, input, proof, bounds);
    checkConditions(ctx, ring.domain, factorSources(ring, proof), raw.conditions, bounds); return proof; });
}
export function encodeAlgebraicDerivative<E>(ctx: ExecutionContext, field: ExactField<E>, input: E, target: E, proof: AlgebraicDerivative<E>, bounds: DifferentialBounds) {
  return ctx.operation(() => { verifyAlgebraicChainWithin(ctx, field, bounds); verifyAlgebraicDerivativeWithin(ctx, field, input, proof, bounds);
    demand(field.equal(ctx, target, proof.derivative), 'verification-failed', 'derivative codec target');
    return envelope(ctx, bounds, 'algebraic-derivative', encodeAlgebraicSnapshot(ctx, field, bounds), algebraicDerivativeCodec(ctx, field, bounds).encode(proof), conditions(ctx, field, derivativeSources(ctx, field, input, target), bounds)); });
}
export function decodeAlgebraicDerivative<E>(ctx: ExecutionContext, field: ExactField<E>, input: E, target: E, data: unknown, bounds: DifferentialBounds) {
  return ctx.operation(() => { const raw = artifact(ctx, bounds, data, 'algebraic-derivative'); verifyAlgebraicSnapshot(ctx, field, raw.construction, bounds);
    const proof = algebraicDerivativeCodec(ctx, field, bounds).decode(raw.evidence); verifyAlgebraicDerivativeWithin(ctx, field, input, proof, bounds);
    demand(field.equal(ctx, target, proof.derivative), 'verification-failed', 'derivative codec target');
    checkConditions(ctx, field, derivativeSources(ctx, field, input, target), raw.conditions, bounds); return proof; });
}
