import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { AlgebraicCurveView } from './algebraic-curve';
import { verifyAlgebraicResidueRelationsWithin, type AlgebraicResidueRelations } from './algebraic-residue-relations';
import { decideAlgebraicDivisorTorsionWithin, verifyAlgebraicDivisorTorsionWithin, type AlgebraicDivisorTorsion } from './algebraic-divisor-torsion';
import { decideAlgebraicRrPrincipalityWithin, verifyAlgebraicRrPrincipalityWithin, type AlgebraicRrPrincipality } from './algebraic-rr-principality';
import type { AlgebraicDivisor } from './algebraic-divisor';
import { differentiateAlgebraicWithin, verifyAlgebraicDerivativeWithin, type AlgebraicDerivative } from './algebraic-derivative';
import { algebraicConditions, verifyAlgebraicConditions, type AlgebraicCondition } from './algebraic-conditions';
import type { ExactField } from './field';
import { baseChangeAlgebraicCurveWithin, type ConstantBaseChangeValue } from './algebraic-curve-base-change';
import { AlgebraicEmbedding } from './algebraic-embedding';
import { constructRelativeNumberFieldWithin, type NumberValue } from './relative-number-field';
import { reconstructAlgebraicConstantQuotientWithin, mapAlgebraicConstantBaseChangeValue, convertAlgebraicConstantValue, verifyAlgebraicConstantValueConversion,
  type AlgebraicConstantQuotient, type AlgebraicConstantValueConversion } from './algebraic-constant-quotient';
import { constructAlgebraicPrimitiveWithin, differentiateAlgebraicPrimitiveWithin, verifyAlgebraicPrimitiveWithin, type AlgebraicPrimitive, type AlgebraicPrimitiveDerivative } from './algebraic-primitive';

/** Direct complete principality proves least order one without reductions.
 * This composition belongs to the new integration artifact; old torsion
 * interfaces and version-one formats remain unchanged. */
export type AlgebraicIntegrationPrincipalMultiple = AlgebraicDivisorTorsion<unknown> | Readonly<{
  kind: 'torsion'; reason: 'principal-divisor'; order: 1n; divisor: AlgebraicDivisor<unknown>; principal: AlgebraicRrPrincipality<unknown>;
}>;
export interface AlgebraicLogarithmicComponent {
  readonly index: number;
  readonly principalCheck: AlgebraicRrPrincipality<unknown>;
  readonly torsion: AlgebraicIntegrationPrincipalMultiple;
  readonly argument: unknown | null;
  readonly weight: NumberValue | null;
  readonly derivative: AlgebraicDerivative<unknown> | null;
  readonly value: unknown | null;
  readonly conditions: readonly AlgebraicCondition<unknown>[];
}
interface Common<E> {
  readonly relations: AlgebraicResidueRelations<E>;
  readonly components: readonly AlgebraicLogarithmicComponent[];
  readonly activeDerivative: unknown;
}
export type AlgebraicLogarithmicConstruction<E> = Readonly<Common<E> & (
  {kind: 'non-torsion'; obstruction: number; later: 'unperformed'} |
  {kind: 'complete'; quotient: AlgebraicConstantQuotient<E> | null; descent: AlgebraicConstantValueConversion<E> | null; nativeDerivative: E; primitive: AlgebraicPrimitive<E>; derivative: AlgebraicPrimitiveDerivative<E>}
)>;
function sources(curve: AlgebraicCurveView<unknown>, argument: unknown, index: number) {
  return [{field: curve.owner as ExactField<unknown>, value: argument, nonzero: true, path: `integration.log.${index}.argument`}];
}
function identityQuotient<E>(ctx: ExecutionContext, curve: AlgebraicCurveView<E>, bounds: DifferentialBounds) {
  const C = curve.coordinates.constantOwner, embedding = AlgebraicEmbedding.identity(ctx, C, bounds), relative = constructRelativeNumberFieldWithin(ctx, C, C, embedding, bounds), change = baseChangeAlgebraicCurveWithin(ctx, curve, C, embedding, bounds);
  return reconstructAlgebraicConstantQuotientWithin(ctx, curve, change, relative, bounds);
}
export function verifyAlgebraicLogarithmicConstructionWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, relations: AlgebraicResidueRelations<E>, proof: AlgebraicLogarithmicConstruction<E>, bounds: DifferentialBounds): void {
  demand(proof.relations === relations && relations.splitting.source === source, 'domain-mismatch', 'logarithmic construction complete residue request'); verifyAlgebraicResidueRelationsWithin(ctx, relations.splitting, relations, bounds);
  const split = relations.splitting, curve = split.curve, f = curve.owner, C = curve.coordinates.constantOwner; let sum = f.fromInteger(ctx, 0n);
  demand(proof.kind === 'complete' || proof.kind === 'non-torsion', 'verification-failed', 'logarithmic construction checked outcome');
  if (proof.kind === 'non-torsion') demand(Number.isSafeInteger(proof.obstruction) && proof.obstruction >= 0 && proof.obstruction < relations.basis.length
    && proof.components[proof.obstruction]?.torsion.kind === 'non-torsion', 'verification-failed', 'logarithmic negative requires an actual checked obstruction');
  const count = proof.kind === 'complete' ? relations.basis.length : proof.obstruction + 1;
  demand(Number.isSafeInteger(count) && count >= 0 && count <= relations.basis.length && proof.components.length === count, 'verification-failed', 'logarithmic ordered component coverage');
  for (let i = 0; i < count; i++) {
    const p = proof.components[i]; demand(p.index === i, 'verification-failed', 'logarithmic exact ordered component'); verifyAlgebraicRrPrincipalityWithin(ctx, curve, relations.divisors[i], p.principalCheck, bounds);
    if (p.torsion.reason === 'principal-divisor') demand(p.principalCheck.kind === 'principal' && p.torsion.kind === 'torsion' && p.torsion.order === 1n && p.torsion.divisor === relations.divisors[i] && p.torsion.principal === p.principalCheck, 'verification-failed', 'complete direct principality proves least positive order one');
    else { demand(p.principalCheck.kind === 'not-principal', 'verification-failed', 'complete nonprincipal prefix before torsion search'); verifyAlgebraicDivisorTorsionWithin(ctx, curve, relations.divisors[i], p.torsion, bounds); }
    if (p.torsion.kind === 'non-torsion') {
      demand(proof.kind === 'non-torsion' && proof.obstruction === i && i === count - 1 && proof.later === 'unperformed' && p.argument === null && p.weight === null && p.derivative === null && p.value === null && p.conditions.length === 0, 'verification-failed', 'first non-torsion obstruction/unperformed coverage'); continue;
    }
    demand(p.argument !== null && p.weight !== null && p.derivative !== null && p.value !== null && p.torsion.order !== null && p.torsion.order > 0n && p.torsion.principal.kind === 'principal' && f.equal(ctx, p.argument, p.torsion.principal.witness), 'verification-failed', 'checked principal-multiple argument');
    const weight = C.exactDivide(ctx, relations.basis[i], C.fromInteger(ctx, ctx.multiply(relations.denominator, p.torsion.order))); demand(C.equal(ctx, weight, p.weight), 'verification-failed', 'exact logarithmic residue/order scaling');
    verifyAlgebraicDerivativeWithin(ctx, f, p.argument, p.derivative, bounds);
    const value = f.multiply(ctx, curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, weight)), f.exactDivide(ctx, p.derivative.derivative, p.argument));
    demand(f.equal(ctx, value, p.value), 'verification-failed', 'independent logarithmic derivative'); sum = f.add(ctx, sum, value);
    verifyAlgebraicConditions(ctx, f, sources(curve, p.argument, i), p.conditions, bounds);
  }
  demand(f.equal(ctx, sum, proof.activeDerivative), 'verification-failed', 'complete successful logarithm prefix mapping');
  if (proof.kind === 'non-torsion') return;
  demand(proof.components.every(p => p.torsion.kind === 'torsion'), 'verification-failed', 'complete logarithmic success coverage');
  if (split.quotient !== null) {
    demand(proof.quotient === split.quotient && proof.descent !== null && f === proof.quotient.change.field, 'domain-mismatch', 'logarithmic full constant extension descent binding'); verifyAlgebraicConstantValueConversion(ctx, proof.quotient, sum as ConstantBaseChangeValue, proof.descent);
    const coefficients = proof.descent.polynomial.coefficients;
    demand(coefficients.slice(1).every(c => source.owner.isZero(ctx, c)) && source.owner.equal(ctx, proof.nativeDerivative, coefficients[0] ?? source.owner.fromInteger(ctx, 0n)), 'verification-failed', 'logarithmic exact forward/inverse native descent');
  } else demand(proof.descent === null && f === source.owner && source.owner.equal(ctx, proof.nativeDerivative, sum as E), 'verification-failed', 'logarithmic identity descent');
  demand(proof.primitive.terms.length === count, 'verification-failed', 'logarithmic complete normalized-trace term coverage');
  if (count === 0) demand(proof.quotient === null, 'verification-failed', 'empty logarithmic construction introduces no constants');
  for (let i = 0; i < count; i++) {
    const p = proof.components[i], term = proof.primitive.terms[i], q = proof.quotient; demand(q !== null && term.quotient === q && C.equal(ctx, term.weight, p.weight!) && C.equal(ctx, term.unit, C.fromInteger(ctx, 1n)) && term.factors.length === 1 && term.factors[0].exponent === 1n, 'verification-failed', 'logarithmic normalized relative trace mapping');
    const expected = split.quotient === null ? mapAlgebraicConstantBaseChangeValue(ctx, q, p.argument as E) : p.argument as ConstantBaseChangeValue;
    demand(q.change.field.equal(ctx, term.factors[0].value, expected), 'verification-failed', 'logarithmic checked argument embedding');
  }
  demand(source.owner.isZero(ctx, proof.primitive.fieldPart), 'verification-failed', 'logarithmic primitive omits unrelated field corrections'); verifyAlgebraicPrimitiveWithin(ctx, source, proof.primitive, proof.nativeDerivative, proof.derivative, bounds);
}
export function constructAlgebraicLogarithmsWithin<E>(ctx: ExecutionContext, source: AlgebraicCurveView<E>, relations: AlgebraicResidueRelations<E>, bounds: DifferentialBounds): AlgebraicLogarithmicConstruction<E> {
  demand(relations.splitting.source === source, 'domain-mismatch', 'logarithmic original curve ownership');
  verifyAlgebraicResidueRelationsWithin(ctx, relations.splitting, relations, bounds); const split = relations.splitting, curve = split.curve, f = curve.owner, C = curve.coordinates.constantOwner, components: AlgebraicLogarithmicComponent[] = []; let activeDerivative = f.fromInteger(ctx, 0n);
  for (let i = 0; i < relations.basis.length; i++) {
    const principalCheck = decideAlgebraicRrPrincipalityWithin(ctx, curve, relations.divisors[i], bounds), torsion: AlgebraicIntegrationPrincipalMultiple = principalCheck.kind === 'principal'
      ? Object.freeze({kind: 'torsion', reason: 'principal-divisor', order: 1n, divisor: relations.divisors[i], principal: principalCheck})
      : decideAlgebraicDivisorTorsionWithin(ctx, curve, relations.divisors[i], bounds); ctx.allocate(8);
    if (torsion.kind === 'non-torsion') {
      components.push(Object.freeze({index: i, principalCheck, torsion, argument: null, weight: null, derivative: null, value: null, conditions: Object.freeze([])}));
      const proof = Object.freeze({relations, components: Object.freeze(components), activeDerivative, kind: 'non-torsion' as const, obstruction: i, later: 'unperformed' as const}); verifyAlgebraicLogarithmicConstructionWithin(ctx, source, relations, proof, bounds); return proof;
    }
    demand(torsion.principal.kind === 'principal' && torsion.order !== null && torsion.order > 0n, 'verification-failed', 'torsion positive principal witness'); const argument = torsion.principal.witness, weight = C.exactDivide(ctx, relations.basis[i], C.fromInteger(ctx, ctx.multiply(relations.denominator, torsion.order))), derivative = differentiateAlgebraicWithin(ctx, f, argument, bounds);
    const value = f.multiply(ctx, curve.coordinates.scalarNative(ctx, curve.coordinates.scalar.fromCoefficient(ctx, weight)), f.exactDivide(ctx, derivative.derivative, argument)); activeDerivative = f.add(ctx, activeDerivative, value);
    components.push(Object.freeze({index: i, principalCheck, torsion, argument, weight, derivative, value, conditions: algebraicConditions(ctx, f, sources(curve, argument, i), bounds)}));
  }
  const quotient = components.length ? split.quotient ?? identityQuotient(ctx, source, bounds) : null, descent = split.quotient ? convertAlgebraicConstantValue(ctx, split.quotient, activeDerivative as ConstantBaseChangeValue) : null;
  const nativeDerivative = descent ? descent.polynomial.coefficients[0] ?? source.owner.fromInteger(ctx, 0n) : activeDerivative as E;
  const terms = components.map(p => ({quotient: quotient!, weight: p.weight!, unit: C.fromInteger(ctx, 1n), factors: [{value: split.quotient === null ? mapAlgebraicConstantBaseChangeValue(ctx, quotient!, p.argument as E) : p.argument as ConstantBaseChangeValue, exponent: 1n}]}));
  const primitive = constructAlgebraicPrimitiveWithin(ctx, source, source.owner.fromInteger(ctx, 0n), terms, bounds), derivative = differentiateAlgebraicPrimitiveWithin(ctx, source, primitive, bounds), proof = Object.freeze({relations, components: Object.freeze(components), activeDerivative, kind: 'complete' as const, quotient, descent, nativeDerivative, primitive, derivative});
  verifyAlgebraicLogarithmicConstructionWithin(ctx, source, relations, proof, bounds); return proof;
}
