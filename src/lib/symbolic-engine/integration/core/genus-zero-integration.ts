/** Rational integration over actual constants, with exact relative-trace descent. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PolynomialRing, type Polynomial} from './polynomial';
import type {AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicCurveWithin} from './algebraic-curve';
import type {CurveConstant} from './algebraic-curve-coordinates';
import {AlgebraicEmbedding} from './algebraic-embedding';
import {constructAlgebraicExtensionWithin} from './algebraic-field';
import {factorAlgebraicPolynomialWithin} from './algebraic-factorization';
import {constructNumberFieldPresentationWithin, numberFieldPresentationValueWithin} from './number-field-presentation';
import {constructRelativeNumberFieldWithin} from './relative-number-field';
import {baseChangeAlgebraicCurveWithin, type ConstantBaseChangeValue} from './algebraic-curve-base-change';
import {reconstructAlgebraicConstantQuotientWithin, mapAlgebraicConstantBaseChangeValue, convertAlgebraicConstantValue, type AlgebraicConstantQuotient} from './algebraic-constant-quotient';
import {tryGenusZeroConstantParameterWithin} from './genus-zero-constant-extension';
import {genusZeroForwardWithin, genusZeroBackwardWithin, type GenusZeroParameter} from './genus-zero-parameter';
import {reduceConstantRationalHermite} from './constant-rational-hermite';
import {extendedGcd, exactDivide, polynomialDivide} from './polynomial-division';
import {quotientTrace} from './quotient-trace';
import {constructAlgebraicPrimitiveWithin, type AlgebraicPrimitive, type AlgebraicTraceLogInput} from './algebraic-primitive';
import {constructCompactAlgebraicCandidateWithin, type CompactAlgebraicElementaryCandidate} from './algebraic-elementary-evidence';
import type {AlgebraicCanonicalGeometry} from './algebraic-canonical-geometry';

function polynomialAtConstant(ctx: ExecutionContext, field: import('./algebraic-field').AlgebraicField<CurveConstant>, polynomial: Polynomial<CurveConstant>) {
  polynomial.ring.assert(ctx, polynomial); demand(polynomial.ring.domain === field.parent, 'domain-mismatch', 'rational residue coefficient field');
  let result = field.fromInteger(ctx, 0n); const at = field.generator(ctx);
  for (let i = polynomial.coefficients.length - 1; i >= 0; i--) result = field.add(ctx, field.multiply(ctx, result, at), field.embed(ctx, polynomial.coefficients[i])); return result;
}
function convertActiveValue<E, A>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, active: AlgebraicCurveView<A>, value: A,
  q: AlgebraicConstantQuotient<E>, embedding: AlgebraicEmbedding<CurveConstant, CurveConstant>): ConstantBaseChangeValue {
  const target = q.change.coordinates, coefficients = active.coordinates.coordinates(ctx, value);
  demand(active.coordinates.basis.length === source.coordinates.basis.length && coefficients.length === target.basis.length
    && embedding.source === active.coordinates.constantOwner && embedding.target === q.relative.target, 'domain-mismatch', 'genus-zero active-to-constant diagram');
  ctx.allocate(coefficients.length);
  const mapped = coefficients.map(v => {
    const polynomial = (p: Polynomial<CurveConstant>) => target.scalar.ring.make(ctx, p.coefficients.map(c => embedding.map(ctx, c)));
    return target.scalar.make(ctx, polynomial(v.numerator), polynomial(v.denominator));
  });
  return target.native(ctx, mapped);
}
function integrateActive<E, A>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, active: AlgebraicCurveView<A>, p: GenusZeroParameter<A>, input: A,
  sourceEmbedding: AlgebraicEmbedding<CurveConstant, CurveConstant>, initial: AlgebraicConstantQuotient<E> | null, bounds: DifferentialBounds): AlgebraicPrimitive<E> {
  const field = p.field, ring = field.ring, C = active.coordinates.constantOwner;
  const transformed = field.multiply(ctx, genusZeroForwardWithin(ctx, p, input), field.derivative(ctx, p.xImage));
  const reduced = reduceConstantRationalHermite(ctx, {x: ring, fractions: field}, transformed), residual = reduced.residual;
  const nativePart = genusZeroBackwardWithin(ctx, p, reduced.rationalPart); let fieldPart: E;
  if (initial) {
    const constantImage = AlgebraicEmbedding.ancestor(ctx, C, C, bounds), changed = convertActiveValue(ctx, source, active, nativePart, initial, constantImage), conversion = convertAlgebraicConstantValue(ctx, initial, changed);
    const trace = quotientTrace(ctx, initial.algebra, initial.algebra.make(ctx, conversion.polynomial));
    fieldPart = source.owner.exactDivide(ctx, trace.trace, source.owner.fromInteger(ctx, BigInt(initial.relative.degree)));
  } else {
    // Source and active are explicitly the same supplied presentation. Convert
    // through full coordinates to preserve ownership without a domain cast.
    demand(Object.is(active.owner, source.owner) && C === source.coordinates.constantOwner, 'domain-mismatch', 'genus-zero identity active owner');
    fieldPart = source.coordinates.native(ctx, active.coordinates.coordinates(ctx, nativePart));
  }
  const terms: AlgebraicTraceLogInput<E>[] = [];
  if (!field.isZero(ctx, residual)) {
    const factors = factorAlgebraicPolynomialWithin(ctx, ring, residual.denominator, bounds);
    demand(factors.kind === 'factorization', 'verification-failed', 'nonzero rational residue denominator'); let sum = field.fromInteger(ctx, 0n);
    ctx.allocate(factors.factors.length);
    for (const factor of factors.factors) {
      demand(factor.multiplicity === 1n, 'verification-failed', 'Hermite residual square-free coverage'); const modulus = factor.polynomial, degree = ring.degree(ctx, modulus);
      const complement = exactDivide(ctx, ring, residual.denominator, modulus), inverse = extendedGcd(ctx, ring, complement, modulus);
      demand(ring.equal(ctx, inverse.gcd, ring.one(ctx)), 'verification-failed', 'coprime rational simple factors');
      const numerator = polynomialDivide(ctx, ring, ring.multiply(ctx, residual.numerator, inverse.s), modulus).remainder;
      sum = field.add(ctx, sum, field.make(ctx, numerator, modulus));
      const rootRing = new PolynomialRing(C, 'residueRoot'), root = constructAlgebraicExtensionWithin(ctx, rootRing, rootRing.make(ctx, modulus.coefficients), bounds);
      const value = root.exactDivide(ctx, polynomialAtConstant(ctx, root, numerator), polynomialAtConstant(ctx, root, ring.derivative(ctx, modulus)));
      const presentation = constructNumberFieldPresentationWithin(ctx, root, bounds), L = presentation.field;
      const toAbsolute = (v: ReturnType<typeof root.generator>) => numberFieldPresentationValueWithin(ctx, root, presentation, v, bounds);
      const alpha = toAbsolute(root.generator(ctx)), activeImage = toAbsolute(root.embed(ctx, C.generator(ctx)));
      const embed = AlgebraicEmbedding.extension(ctx, C, L, AlgebraicEmbedding.rationals(ctx, L, bounds), activeImage, bounds);
      const sourceC = source.coordinates.constantOwner, sourceImage = embed.map(ctx, sourceEmbedding.map(ctx, sourceC.generator(ctx))), fromSource = AlgebraicEmbedding.extension(ctx, sourceC, L, AlgebraicEmbedding.rationals(ctx, L, bounds), sourceImage, bounds);
      const relative = constructRelativeNumberFieldWithin(ctx, sourceC, L, fromSource, bounds), change = baseChangeAlgebraicCurveWithin(ctx, source, L, fromSource, bounds), quotient = reconstructAlgebraicConstantQuotientWithin(ctx, source, change, relative, bounds);
      const parameter = convertActiveValue(ctx, source, active, p.parameter, quotient, embed), argument = change.field.subtract(ctx, parameter,
        change.coordinates.scalarNative(ctx, change.coordinates.scalar.fromCoefficient(ctx, alpha)));
      // Averaging the initial constant extension and summing every root over C
      // gives normalized relative trace over the original constants with weight d*rho.
      const weight = L.multiply(ctx, toAbsolute(value), L.fromInteger(ctx, BigInt(degree))); ctx.allocate(5);
      terms.push(Object.freeze({quotient, weight, unit: L.fromInteger(ctx, 1n), factors: Object.freeze([Object.freeze({value: argument, exponent: 1n})])}));
    }
    demand(field.equal(ctx, residual, sum), 'verification-failed', 'complete rational simple residue reconstruction');
  }
  return constructAlgebraicPrimitiveWithin(ctx, source, fieldPart, terms, bounds);
}
/** Every genus-zero differential is elementary after a finite constant extension.
 * Complete checked applicability precedes the algorithm; failure never falls back. */
export function tryProduceGenusZeroCandidateWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds, geometry?: AlgebraicCanonicalGeometry<E>): CompactAlgebraicElementaryCandidate<E> | null {
  verifyAlgebraicCurveWithin(ctx, source.owner, source, bounds); source.owner.assert(ctx, input);
  const view = tryGenusZeroConstantParameterWithin(ctx, source, bounds, geometry); if (!view) return null;
  let primitive: AlgebraicPrimitive<E>;
  if (view.kind === 'native') primitive = integrateActive(ctx, source, source, view.parameter, input, AlgebraicEmbedding.ancestor(ctx, source.coordinates.constantOwner, source.coordinates.constantOwner, bounds), null, bounds);
  else primitive = integrateActive(ctx, source, view.curve, view.parameter, mapAlgebraicConstantBaseChangeValue(ctx, view.quotient, input), view.quotient.relative.embedding, view.quotient, bounds);
  return constructCompactAlgebraicCandidateWithin(ctx, source, input, primitive, bounds);
}
export function tryProduceGenusZeroCandidate<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, input: E, bounds: DifferentialBounds) {
  return ctx.operation(() => tryProduceGenusZeroCandidateWithin(ctx, source, input, bounds));
}
