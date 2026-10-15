import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { ExactField } from './field';
import type { Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import type { FormalPrimitive, QRationalFunction, RootLogTerm } from './formal-primitive';
import { differentiatePrimitiveWithin, verifyPrimitiveDerivativeWithin, type PrimitiveDerivativeCertificate } from './primitive-verification-internal';
import { factorAlgebraicPolynomialWithin, verifyAlgebraicFactorizationWithin, type AlgebraicFactorization } from './algebraic-factorization';
import { constructAlgebraicExtensionWithin, type AlgebraicField, type AlgebraicElement } from './algebraic-field';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { constructNumberFieldPresentationWithin, verifyNumberFieldPresentationWithin, numberFieldPresentationValueWithin, type NumberFieldPresentation } from './number-field-presentation';
import { constructRelativeNumberFieldWithin, type NumberValue } from './relative-number-field';
import { baseChangeAlgebraicCurveWithin } from './algebraic-curve-base-change';
import { reconstructAlgebraicConstantQuotientWithin, type AlgebraicConstantQuotient } from './algebraic-constant-quotient';
import { constructAlgebraicPrimitiveWithin, differentiateAlgebraicPrimitiveWithin, verifyAlgebraicPrimitiveWithin, withAlgebraicPrimitiveArithmeticWithin,
  type AlgebraicPrimitive, type AlgebraicPrimitiveDerivative } from './algebraic-primitive';
import { algebraicConditions, type AlgebraicCondition } from './algebraic-conditions';
import { recordRationalGcdEvidence, replayRationalGcdEvidence, type RationalGcdEvidence } from './rational-gcd-evidence';

export interface AlgebraicRationalRoot<E> {
  readonly extension: AlgebraicField<NumberValue> | null;
  readonly presentation: NumberFieldPresentation<AlgebraicElement<NumberValue>> | null;
  readonly root: NumberValue;
  readonly quotient: AlgebraicConstantQuotient<E>;
}
export interface AlgebraicRationalPrimitiveEmbedding<E> {
  readonly arithmetic?: RationalGcdEvidence;
  readonly source: FormalPrimitive;
  readonly sourceDerivative: PrimitiveDerivativeCertificate;
  readonly target: E;
  readonly components: readonly Readonly<{factorization: AlgebraicFactorization<NumberValue>; roots: readonly AlgebraicRationalRoot<E>[]} >[];
  readonly primitive: AlgebraicPrimitive<E>;
  readonly derivative: AlgebraicPrimitiveDerivative<E>;
  readonly conditions: readonly AlgebraicCondition<E>[];
}
function rationalValue<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, value: QRationalFunction): E {
  value.field.assert(ctx, value); demand(value.field.ring.variable === curve.coordinates.scalar.ring.variable, 'domain-mismatch', 'rational primitive integration variable');
  const f = curve.coordinates.scalar, c = curve.coordinates.constantOwner, p = (v: Polynomial<Rational>) => f.ring.make(ctx, v.coefficients.map(q => c.embed(ctx, q)));
  return curve.coordinates.scalarNative(ctx, f.make(ctx, p(value.numerator), p(value.denominator)));
}
function sourceConditions<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive, bounds: DifferentialBounds) {
  const f = source.owner.fractions, one = source.owner.x.one(ctx), value = (p: Polynomial<Rational>) => rationalValue(ctx, curve, f.make(ctx, p, one));
  return algebraicConditions(ctx, curve.owner, [{field: curve.owner as ExactField<unknown>, value: value(source.rationalPart.denominator), nonzero: true, path: 'embedding.rational.denominator'},
    ...source.terms.map((p, i) => ({field: curve.owner as ExactField<unknown>, value: value(p.norm), nonzero: true, path: `embedding.rational.log.${i}.norm`}))], bounds);
}
function evaluate(ctx: ExecutionContext, field: AlgebraicField<Rational>, polynomial: Polynomial<Rational>, root: NumberValue): NumberValue {
  polynomial.ring.assert(ctx, polynomial); field.assert(ctx, root); let out = field.fromInteger(ctx, 0n);
  for (let i = polynomial.coefficients.length - 1; i >= 0; i--) out = field.add(ctx, field.multiply(ctx, out, root), field.embed(ctx, polynomial.coefficients[i])); return out;
}
function argument<E>(ctx: ExecutionContext, source: RootLogTerm, root: AlgebraicRationalRoot<E>) {
  const q = root.quotient, f = q.change.coordinates.scalar, p = f.ring.make(ctx, source.argument.coefficients.map(c => evaluate(ctx, q.relative.target, c, root.root)));
  return q.change.coordinates.scalarNative(ctx, f.make(ctx, p, f.ring.one(ctx)));
}
function rootConstruction<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, factor: Polynomial<NumberValue>, bounds: DifferentialBounds): AlgebraicRationalRoot<E> {
  const c = curve.coordinates.constantOwner, degree = factor.ring.degree(ctx, factor); let constants = c, root: NumberValue, embedding = AlgebraicEmbedding.identity(ctx, c, bounds);
  let extension: AlgebraicField<NumberValue> | null = null, presentation: NumberFieldPresentation<AlgebraicElement<NumberValue>> | null = null;
  if (degree === 1) root = c.negate(ctx, factor.coefficients[0]);
  else {
    const r = new PolynomialRing(c, 'rationalRoot'); extension = constructAlgebraicExtensionWithin(ctx, r, r.make(ctx, factor.coefficients), bounds); presentation = constructNumberFieldPresentationWithin(ctx, extension, bounds); constants = presentation.field;
    root = numberFieldPresentationValueWithin(ctx, extension, presentation, extension.generator(ctx), bounds);
    const image = numberFieldPresentationValueWithin(ctx, extension, presentation, extension.embed(ctx, c.generator(ctx)), bounds);
    embedding = AlgebraicEmbedding.extension(ctx, c, constants, AlgebraicEmbedding.rationals(ctx, constants, bounds), image, bounds);
  }
  const relative = constructRelativeNumberFieldWithin(ctx, c, constants, embedding, bounds), change = baseChangeAlgebraicCurveWithin(ctx, curve, constants, embedding, bounds), quotient = reconstructAlgebraicConstantQuotientWithin(ctx, curve, change, relative, bounds);
  return Object.freeze({extension, presentation, root, quotient});
}
function verifyRoot<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, polynomial: Polynomial<NumberValue>, root: AlgebraicRationalRoot<E>, bounds: DifferentialBounds) {
  const c = curve.coordinates.constantOwner, q = root.quotient, degree = polynomial.ring.degree(ctx, polynomial); demand(q.curve === curve && q.relative.source === c && q.relative.degree === degree, 'verification-failed', 'rational logarithm complete relative root orbit');
  if (degree === 1) demand(root.extension === null && root.presentation === null && q.relative.target.equal(ctx, root.root, q.relative.embedding.map(ctx, c.negate(ctx, polynomial.coefficients[0]))), 'verification-failed', 'linear rational residue root binding');
  else {
    demand(root.extension !== null && root.presentation !== null && root.extension.parent === c && root.extension.ring.equal(ctx, root.extension.modulus, root.extension.ring.make(ctx, polynomial.coefficients)), 'verification-failed', 'rational residue irreducible root relation');
    verifyNumberFieldPresentationWithin(ctx, root.extension, root.presentation, bounds); demand(root.presentation.field === q.relative.target && root.extension.equal(ctx, root.presentation.embedding.map(ctx, root.root), root.extension.generator(ctx))
      && root.extension.equal(ctx, root.presentation.embedding.map(ctx, q.relative.embedding.map(ctx, c.generator(ctx))), root.extension.embed(ctx, c.generator(ctx))), 'verification-failed', 'rational residue original root/constant construction');
  }
  let sum = q.relative.target.fromInteger(ctx, 0n);
  for (let i = polynomial.coefficients.length - 1; i >= 0; i--) sum = q.relative.target.add(ctx, q.relative.target.multiply(ctx, sum, root.root), q.relative.embedding.map(ctx, polynomial.coefficients[i]));
  demand(q.relative.target.isZero(ctx, sum), 'verification-failed', 'rational residue exact defining relation');
}
export function verifyAlgebraicRationalPrimitiveEmbeddingWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive, proof: AlgebraicRationalPrimitiveEmbedding<E>, bounds: DifferentialBounds): void {
  source.owner.assert(ctx, source); demand(proof.source === source && proof.components.length === source.terms.length, 'domain-mismatch', 'rational primitive exact source/root coverage');
  verifyPrimitiveDerivativeWithin(ctx, source, proof.sourceDerivative.derivative, proof.sourceDerivative);
  const f = curve.owner, c = curve.coordinates.constantOwner; demand(f.equal(ctx, proof.target, rationalValue(ctx, curve, proof.sourceDerivative.derivative)) && f.equal(ctx, proof.primitive.fieldPart, rationalValue(ctx, curve, source.rationalPart)), 'verification-failed', 'rational primitive checked field/target embedding');
  let index = 0;
  for (let i = 0; i < source.terms.length; i++) {
    const original = source.terms[i], component = proof.components[i], ring = component.factorization.input.ring, input = ring.make(ctx, original.modulus.coefficients.map(q => c.embed(ctx, q)));
    demand(ring.domain === c, 'domain-mismatch', 'rational residue factor actual constants'); verifyAlgebraicFactorizationWithin(ctx, ring, input, component.factorization, bounds);
    demand(component.factorization.kind === 'factorization' && component.roots.length === component.factorization.factors.length && c.equal(ctx, component.factorization.unit, c.fromInteger(ctx, 1n)), 'verification-failed', 'rational residue complete monic factor coverage');
    for (let j = 0; j < component.roots.length; j++) {
      const root = component.roots[j], factor = component.factorization.factors[j]; demand(factor.multiplicity === 1n, 'verification-failed', 'rational residue distinct root coverage'); verifyRoot(ctx, curve, factor.polynomial, root, bounds);
      demand(index < proof.primitive.terms.length, 'verification-failed', 'rational primitive missing output orbit'); const term = proof.primitive.terms[index++], target = root.quotient.relative.target;
      const weight = target.multiply(ctx, evaluate(ctx, target, original.weight, root.root), target.fromInteger(ctx, BigInt(root.quotient.relative.degree)));
      demand(term.quotient === root.quotient && target.equal(ctx, term.weight, weight) && target.equal(ctx, term.unit, target.fromInteger(ctx, 1n)) && term.factors.length === 1
        && term.factors[0].exponent === 1n && root.quotient.change.field.equal(ctx, term.factors[0].value, argument(ctx, original, root)), 'verification-failed', 'rational unnormalized root sum to normalized relative trace');
    }
  }
  demand(index === proof.primitive.terms.length, 'verification-failed', 'rational primitive no omitted/extra root orbits'); verifyAlgebraicPrimitiveWithin(ctx, curve, proof.primitive, proof.target, proof.derivative, bounds);
  const expected = sourceConditions(ctx, curve, source, bounds);
  demand(expected.length === proof.conditions.length && expected.every((p, i) => p.kind === proof.conditions[i].kind && p.path === proof.conditions[i].path && f.equal(ctx, p.value, proof.conditions[i].value)), 'verification-failed', 'rational embedding retained norms/denominators');
}
export function embedRationalAlgebraicPrimitiveWithin<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive, bounds: DifferentialBounds): AlgebraicRationalPrimitiveEmbedding<E> {
  source.owner.assert(ctx, source); const c = curve.coordinates.constantOwner, sourceDerivative = differentiatePrimitiveWithin(ctx, source), components = Object.freeze(source.terms.map(term => {
    const ring = new PolynomialRing(c, term.modulus.ring.variable), input = ring.make(ctx, term.modulus.coefficients.map(q => c.embed(ctx, q))), factorization = factorAlgebraicPolynomialWithin(ctx, ring, input, bounds);
    demand(factorization.kind === 'factorization', 'verification-failed', 'nonzero rational residue modulus'); return Object.freeze({factorization, roots: Object.freeze(factorization.factors.map(f => rootConstruction(ctx, curve, f.polynomial, bounds)))});
  }));
  const terms = components.flatMap((component, i) => component.roots.map(root => { const target = root.quotient.relative.target; return {quotient: root.quotient, weight: target.multiply(ctx, evaluate(ctx, target, source.terms[i].weight, root.root), target.fromInteger(ctx, BigInt(root.quotient.relative.degree))),
    unit: target.fromInteger(ctx, 1n), factors: [{value: argument(ctx, source.terms[i], root), exponent: 1n}]}; }));
  const primitive = constructAlgebraicPrimitiveWithin(ctx, curve, rationalValue(ctx, curve, source.rationalPart), terms, bounds), derivative = differentiateAlgebraicPrimitiveWithin(ctx, curve, primitive, bounds), target = rationalValue(ctx, curve, sourceDerivative.derivative);
  const result = Object.freeze({source, sourceDerivative, target, components, primitive, derivative, conditions: sourceConditions(ctx, curve, source, bounds)}); verifyAlgebraicRationalPrimitiveEmbeddingWithin(ctx, curve, source, result, bounds); return result;
}
export function embedRationalAlgebraicPrimitive<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive, bounds: DifferentialBounds) {
  return ctx.operation(() => { const p = recordRationalGcdEvidence(ctx, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); return embedRationalAlgebraicPrimitiveWithin(ctx, curve, source, bounds); });
    return Object.freeze({...p.value, primitive: withAlgebraicPrimitiveArithmeticWithin(ctx, p.value.primitive, p.evidence), arithmetic: p.evidence}); });
}
export function verifyAlgebraicRationalPrimitiveEmbedding<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, source: FormalPrimitive, proof: AlgebraicRationalPrimitiveEmbedding<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => { demand(proof.arithmetic !== undefined, 'verification-failed', 'rational embedding arithmetic coverage'); replayRationalGcdEvidence(ctx, proof.arithmetic, () => { verifyAlgebraicCurveWithin(ctx, curve.owner, curve, bounds); verifyAlgebraicRationalPrimitiveEmbeddingWithin(ctx, curve, source, proof, bounds); }); });
}
