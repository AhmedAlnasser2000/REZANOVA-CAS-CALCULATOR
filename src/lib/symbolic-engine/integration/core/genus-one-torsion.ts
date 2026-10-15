/** Complete rational-constant torsion through general RR/Miller transport. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {rationalField as Q, type ExactField} from './field';
import {assertAlgebraicDivisor, type AlgebraicDivisor} from './algebraic-divisor';
import {reduceGenusOneDivisorWithin, verifyGenusOneDivisorClassWithin, type GenusOneDivisorClass} from './genus-one-divisor-class';
import {assertGenusOneCoordinates, type GenusOneCoordinates} from './genus-one-coordinates';
import {multiplyEllipticPoint, verifyEllipticMultiple, type EllipticMultiple} from './elliptic-group';
import {ellipticMultipleFactors} from './elliptic-miller';
import {rationalEllipticOrders} from './elliptic-rational-orders';
import type {AlgebraicFunctionFactor} from './algebraic-factored-function';
import {algebraicConditions, verifyAlgebraicConditions, algebraicConstructionSources, type AlgebraicCondition} from './algebraic-conditions';
import {requireImmutableExactEvidence} from './owned-validation';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';
import {produceRationalEllipticFiltersWithin, verifyRationalEllipticFiltersWithin, type RationalEllipticOrderFilter} from './elliptic-rational-order-filter';

export const genusOneTorsionRule = 'genus-one-rational-riemann-roch-miller-v1' as const;
interface Common<E> {
  readonly rule: typeof genusOneTorsionRule; readonly model: GenusOneCoordinates<E>; readonly divisor: AlgebraicDivisor<E>;
  readonly reduction: GenusOneDivisorClass<E>; readonly tests: readonly EllipticMultiple<E, GenusOneCoordinates<E>>[];
  readonly kind: 'torsion'|'non-torsion'; readonly order: bigint|null; readonly factors: readonly AlgebraicFunctionFactor<E>[];
  readonly conditions: readonly AlgebraicCondition<E>[];
}
export type GenusOneRationalTorsion<E> = Readonly<Common<E> & (
  {format?: never; filters?: never} | {format: 'rational-order-filter-v2'; filters: readonly RationalEllipticOrderFilter[]}
)>;
function rationalConstants<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>): void {
  ctx.tick();
  const c = model.curve.coordinates.constantOwner;
  demand(c.parent === Q && c.modulus.coefficients.length === 2, 'domain-mismatch', 'Mazur requires certified full constants Q');
}
function factors<E>(ctx: ExecutionContext, reduction: GenusOneDivisorClass<E>, multiple: EllipticMultiple<E, GenusOneCoordinates<E>>): readonly AlgebraicFunctionFactor<E>[] {
  const correction = ellipticMultipleFactors(ctx, multiple); ctx.allocate(correction.length + 3);
  return Object.freeze([Object.freeze({value: reduction.space.basis[0], exponent: -multiple.coefficient}), ...correction]);
}
function sources<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, terms: readonly AlgebraicFunctionFactor<E>[]) {
  const original = algebraicConstructionSources(ctx, model.curve.owner); ctx.allocate(original.length + terms.length);
  return [...original, ...terms.map((f, i) => ({field: model.curve.owner as ExactField<unknown>, value: f.value, nonzero: f.exponent < 0n, path: `genus-one.torsion.factor.${i}`}))];
}
function verifyTorsion<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, proof: GenusOneRationalTorsion<E>, bounds: DifferentialBounds): void {
  assertGenusOneCoordinates(ctx, model.presentation, model); assertAlgebraicDivisor(ctx, model.curve, divisor); rationalConstants(ctx, model);
  demand(proof.model === model && proof.divisor === divisor && proof.rule === genusOneTorsionRule, 'domain-mismatch', 'genus-one torsion complete request');
  verifyGenusOneDivisorClassWithin(ctx, model, divisor, proof.reduction, bounds);
  if (proof.format === undefined) demand(proof.filters === undefined, 'verification-failed', 'original rational-order evidence has no unchecked filters');
  const orders = proof.format === undefined ? rationalEllipticOrders : (demand(proof.format === 'rational-order-filter-v2' && proof.filters !== undefined, 'verification-failed', 'rational-order filter format'), verifyRationalEllipticFiltersWithin(ctx, model, proof.reduction.point, proof.filters));
  demand(proof.tests.length <= orders.length, 'verification-failed', 'complete rational-order test prefix'); let order: bigint|null = null;
  for (let i = 0; i < proof.tests.length; i++) {
    verifyEllipticMultiple(ctx, model, proof.reduction.point, orders[i], proof.tests[i]);
    if (proof.tests[i].point.kind === 'infinity') {demand(i === proof.tests.length - 1, 'verification-failed', 'first rational annihilator'); order = orders[i];}
  }
  if (proof.kind === 'torsion') demand(proof.order === order && order !== null, 'verification-failed', 'least genus-one class order');
  else demand(proof.kind === 'non-torsion' && proof.order === null && order === null && proof.tests.length === orders.length, 'verification-failed', 'complete rational non-torsion classification');
  const expected = order === null ? Object.freeze([]) : factors(ctx, proof.reduction, proof.tests.at(-1)!);
  demand(proof.factors.length === expected.length, 'verification-failed', 'complete RR/Miller function factors');
  for (let i = 0; i < expected.length; i++) demand(proof.factors[i].exponent === expected[i].exponent && model.curve.owner.equal(ctx, proof.factors[i].value, expected[i].value), 'verification-failed', 'RR/Miller native factor/sign correspondence');
  verifyAlgebraicConditions(ctx, model.curve.owner, sources(ctx, model, expected), proof.conditions, bounds);
  requireImmutableExactEvidence(ctx, proof, [model.curve]);
}
export function verifyGenusOneRationalTorsionWithin<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, proof: GenusOneRationalTorsion<E>, bounds: DifferentialBounds): void {
  assertGenusOneCoordinates(ctx, model.presentation, model); demand(proof.model === model && proof.divisor === divisor, 'domain-mismatch', 'genus-one exact immutable request binding');
  reuseAlgebraicVerification(ctx, 'genus-one-torsion', model, proof, bounds, () => verifyTorsion(ctx, model, divisor, proof, bounds));
}
export function decideGenusOneRationalTorsionWithin<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): GenusOneRationalTorsion<E> {
  assertGenusOneCoordinates(ctx, model.presentation, model); assertAlgebraicDivisor(ctx, model.curve, divisor); rationalConstants(ctx, model);
  demand(divisor.degree === 0n, 'invalid-input', 'degree-zero genus-one torsion request'); const reduction = reduceGenusOneDivisorWithin(ctx, model, divisor, bounds), filters = produceRationalEllipticFiltersWithin(ctx, model, reduction.point), orders = verifyRationalEllipticFiltersWithin(ctx, model, reduction.point, filters), tests: EllipticMultiple<E, GenusOneCoordinates<E>>[] = []; let order: bigint|null = null;
  for (const n of orders) {
    const multiple = multiplyEllipticPoint(ctx, model, reduction.point, n); ctx.allocate(1); tests.push(multiple);
    if (multiple.point.kind === 'infinity') {order = n; break;}
  }
  const terms = order === null ? Object.freeze([]) : factors(ctx, reduction, tests.at(-1)!), conditions = algebraicConditions(ctx, model.curve.owner, sources(ctx, model, terms), bounds); ctx.allocate(11);
  const proof = Object.freeze({rule: genusOneTorsionRule, format: 'rational-order-filter-v2' as const, filters, model, divisor, reduction, tests: Object.freeze(tests), kind: order === null ? 'non-torsion' as const : 'torsion' as const, order, factors: terms, conditions});
  verifyGenusOneRationalTorsionWithin(ctx, model, divisor, proof, bounds); return proof;
}
export function decideGenusOneRationalTorsion<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, bounds: DifferentialBounds): GenusOneRationalTorsion<E> {
  return ctx.operation(() => decideGenusOneRationalTorsionWithin(ctx, model, divisor, bounds));
}
export function verifyGenusOneRationalTorsion<E>(ctx: ExecutionContext, model: GenusOneCoordinates<E>, divisor: AlgebraicDivisor<E>, proof: GenusOneRationalTorsion<E>, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyGenusOneRationalTorsionWithin(ctx, model, divisor, proof, bounds));
}
