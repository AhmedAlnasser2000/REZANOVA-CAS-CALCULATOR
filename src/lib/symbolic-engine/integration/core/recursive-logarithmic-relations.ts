import { demand, type ExecutionContext } from './execution';
import { rationalField as Q } from './field';
import type { Rational } from './rational';
import type { DifferentialElement as E, DifferentialField, DifferentialBounds } from './differential-field';
import { verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { produceLogarithmicDescent, verifyLogarithmicDescent, type LogarithmicDescent } from './recursive-logarithmic-descent';
import { solveRationalLogarithmicDerivativeRelations, verifyRationalLogarithmicRelationsWithin, radicalValuations,
  type RationalLogarithmicRelations, type RadicalRelation } from './rational-logarithmic-relations';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution, type LinearSystem } from './linear-system';
import { matrixCapacity } from './recursive-coefficient-system';
import { recursiveConditions, verifyRecursiveConditions, certifiedTowerConditionSources, type RecursiveCondition } from './recursive-conditions';

export interface RecursiveLogarithmicFactor { readonly value: E; readonly derivative: DerivativeEvidence }
interface RelationBase {
  readonly rule: 'recursive-prime-divisor-logarithmic-relations-v1';
  readonly view: CertifiedTowerView;
  readonly inputs: readonly E[];
  readonly factors: readonly RecursiveLogarithmicFactor[];
  readonly basis: readonly RadicalRelation[];
  readonly independence: LinearSolution<Rational>;
  readonly conditions: readonly RecursiveCondition[];
}
export type RecursiveLogarithmicRelations = Readonly<RelationBase & (
  | {route: 'rational'; rational: RationalLogarithmicRelations}
  | {route: 'recursive'; descent: LogarithmicDescent; parent: RecursiveLogarithmicRelations}
)>;

function validate(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[], bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); demand(Array.isArray(inputs), 'invalid-input', 'recursive relation inputs');
  for (const input of inputs) view.owner.assert(ctx, input);
}
function scalar(ctx: ExecutionContext, owner: DifferentialField, c: Rational): E {
  let base = owner; while (base.parent) base = base.parent; return owner.embed(ctx, base.scalar(ctx, c));
}
function vectorCombination(ctx: ExecutionContext, vectors: readonly (readonly Rational[])[], cs: readonly Rational[], count: number): readonly Rational[] {
  demand(cs.length >= vectors.length, 'verification-failed', 'recursive relation parent coordinate count');
  ctx.allocate(count); const out = Array<Rational>(count).fill(Q.fromInteger(ctx, 0n));
  for (let j = 0; j < vectors.length; j++) {
    demand(vectors[j].length === count, 'verification-failed', 'recursive relation descent coordinate count');
    for (let i = 0; i < count; i++) out[i] = Q.add(ctx, out[i], Q.multiply(ctx, cs[j], vectors[j][i]));
  }
  return Object.freeze(out);
}
function projected(ctx: ExecutionContext, inputs: number, basis: readonly RadicalRelation[]): LinearSystem<Rational> {
  matrixCapacity(ctx, inputs, basis.length); const zero = Q.fromInteger(ctx, 0n), matrix: (readonly Rational[])[] = [], rhs: Rational[] = [];
  for (let i = 0; i < inputs; i++) { ctx.allocate(basis.length); matrix.push(Object.freeze(basis.map(b => b.coefficients[i]))); rhs.push(zero); }
  ctx.allocate(4); return Object.freeze({rows: inputs, columns: basis.length, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs)});
}
function conditionSources(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[]) {
  ctx.allocate(inputs.length + view.owner.height * 2);
  const sources = [...inputs.map((value, i) => ({path: `input.${i}`, value})), ...certifiedTowerConditionSources(ctx, view)];
  return sources;
}
function liftedFactor(ctx: ExecutionContext, owner: DifferentialField, factor: RecursiveLogarithmicFactor): RecursiveLogarithmicFactor {
  const value = owner.embed(ctx, factor.value), derivative = Object.freeze({input: value, derivative: owner.embed(ctx, factor.derivative.derivative)});
  ctx.allocate(3); return Object.freeze({value, derivative});
}
function recursiveFactors(ctx: ExecutionContext, view: CertifiedTowerView, d: LogarithmicDescent, parent: RecursiveLogarithmicRelations): readonly RecursiveLogarithmicFactor[] {
  const owner = view.owner; ctx.allocate(d.factors.length + parent.factors.length + 1);
  const factors: RecursiveLogarithmicFactor[] = d.factors.map(f => Object.freeze({value: f.value, derivative: f.derivative}));
  if (view.monomial === 'hyperexponential') {
    const value = owner.generator(ctx); ctx.allocate(3);
    factors.push(Object.freeze({value, derivative: Object.freeze({input: value, derivative: owner.multiply(ctx, owner.embed(ctx, view.rate!), value)})}));
  }
  for (const f of parent.factors) factors.push(liftedFactor(ctx, owner, f));
  return Object.freeze(factors);
}
function recursiveBasis(ctx: ExecutionContext, view: CertifiedTowerView, inputs: number, d: LogarithmicDescent, parent: RecursiveLogarithmicRelations): readonly RadicalRelation[] {
  demand(d.linear.kind === 'consistent', 'verification-failed', 'recursive relation descent nullspace'); const vectors = d.linear.nullspace;
  ctx.allocate(parent.basis.length); return Object.freeze(parent.basis.map(b => {
    const vector = vectorCombination(ctx, vectors, b.coefficients, inputs + d.factors.length), valuations = vector.slice(inputs);
    if (view.monomial === 'hyperexponential') valuations.push(Q.negate(ctx, b.coefficients[vectors.length]));
    ctx.allocate(b.valuations.length); valuations.push(...b.valuations);
    return radicalValuations(ctx, vector.slice(0, inputs), valuations);
  }));
}
function lowerInputs(ctx: ExecutionContext, view: CertifiedTowerView, d: LogarithmicDescent): readonly E[] {
  ctx.allocate(d.lower.length + 1); return view.monomial === 'hyperexponential' ? [...d.lower, view.rate!] : d.lower;
}
/** Every recursive call decreases native tower height. */
export function solveRecursiveLogarithmicDerivativeRelations(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[], bounds: DifferentialBounds): RecursiveLogarithmicRelations {
  return ctx.operation(() => solveRecursiveLogarithmicRelationsWithin(ctx, view, inputs, bounds));
}
export function solveRecursiveLogarithmicRelationsWithin(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[], bounds: DifferentialBounds): RecursiveLogarithmicRelations {
  validate(ctx, view, inputs, bounds); const owner = view.owner; let result: RecursiveLogarithmicRelations;
  const base = {rule: 'recursive-prime-divisor-logarithmic-relations-v1' as const, view, inputs: Object.freeze([...inputs]), conditions: recursiveConditions(ctx, owner, conditionSources(ctx, view, inputs))};
  if (view.monomial === 'variable') {
    const rational = solveRationalLogarithmicDerivativeRelations(ctx, owner, inputs, bounds); ctx.allocate(rational.factors.length);
    result = Object.freeze({...base, route: 'rational' as const, rational, factors: Object.freeze(rational.factors.map(f => Object.freeze({value: f.value, derivative: f.derivative}))),
      basis: rational.basis, independence: rational.independence});
  } else {
    const descent = produceLogarithmicDescent(ctx, owner, view.monomial, inputs, bounds);
    const parent = solveRecursiveLogarithmicRelationsWithin(ctx, view.parent!, lowerInputs(ctx, view, descent), bounds);
    const factors = recursiveFactors(ctx, view, descent, parent), basis = recursiveBasis(ctx, view, inputs.length, descent, parent);
    result = Object.freeze({...base, route: 'recursive' as const, descent, parent, factors, basis,
      independence: solveLinearSystem(ctx, Q, projected(ctx, inputs.length, basis))});
  }
  verifyRecursiveLogarithmicRelationsWithin(ctx, view, inputs, result, bounds); return result;
}
function sameRelation(ctx: ExecutionContext, a: RadicalRelation, b: RadicalRelation): void {
  demand(a.index === b.index && a.coefficients.length === b.coefficients.length && a.valuations.length === b.valuations.length
    && a.powers.length === b.powers.length, 'verification-failed', 'recursive radical relation coverage/index');
  for (let i = 0; i < b.coefficients.length; i++) demand(Q.equal(ctx, a.coefficients[i], b.coefficients[i]), 'verification-failed', 'recursive relation coefficient mapping');
  for (let i = 0; i < b.valuations.length; i++) demand(Q.equal(ctx, a.valuations[i], b.valuations[i]) && a.powers[i] === b.powers[i], 'verification-failed', 'recursive relation valuation mapping');
}
export function verifyRecursiveLogarithmicRelationsWithin(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[], e: RecursiveLogarithmicRelations, bounds: DifferentialBounds): void {
  validate(ctx, view, inputs, bounds); const owner = view.owner;
  demand(e.view === view && e.rule === 'recursive-prime-divisor-logarithmic-relations-v1' && e.inputs.length === inputs.length,
    'verification-failed', 'recursive logarithmic expected view/request');
  for (let i = 0; i < inputs.length; i++) demand(owner.equal(ctx, inputs[i], e.inputs[i]), 'verification-failed', 'recursive logarithmic input order');
  verifyRecursiveConditions(ctx, owner, conditionSources(ctx, view, inputs), e.conditions);
  let factors: readonly RecursiveLogarithmicFactor[], basis: readonly RadicalRelation[];
  if (view.monomial === 'variable') {
    demand(e.route === 'rational', 'verification-failed', 'recursive relation base route');
    verifyRationalLogarithmicRelationsWithin(ctx, owner, inputs, e.rational, bounds); factors = e.rational.factors; basis = e.rational.basis;
  } else {
    demand(e.route === 'recursive', 'verification-failed', 'recursive relation inductive route');
    verifyLogarithmicDescent(ctx, owner, view.monomial, inputs, e.descent, bounds);
    verifyRecursiveLogarithmicRelationsWithin(ctx, view.parent!, lowerInputs(ctx, view, e.descent), e.parent, bounds);
    factors = recursiveFactors(ctx, view, e.descent, e.parent); basis = recursiveBasis(ctx, view, inputs.length, e.descent, e.parent);
  }
  demand(e.factors.length === factors.length && e.basis.length === basis.length, 'verification-failed', 'recursive relation complete factor/basis coverage');
  for (let i = 0; i < factors.length; i++) {
    demand(owner.equal(ctx, e.factors[i].value, factors[i].value), 'verification-failed', 'recursive factored witness correspondence');
    demand(!owner.isZero(ctx, e.factors[i].value), 'verification-failed', 'zero multiplicative witness factor');
    verifyDerivative(ctx, owner, e.factors[i].value, e.factors[i].derivative);
  }
  for (let i = 0; i < basis.length; i++) {
    const b = e.basis[i]; sameRelation(ctx, b, basis[i]); let lhs = owner.fromInteger(ctx, 0n), rhs = lhs;
    for (let j = 0; j < inputs.length; j++) lhs = owner.add(ctx, lhs, owner.multiply(ctx, scalar(ctx, owner, b.coefficients[j]), inputs[j]));
    for (let j = 0; j < factors.length; j++) rhs = owner.add(ctx, rhs, owner.multiply(ctx, scalar(ctx, owner, b.valuations[j]),
      owner.exactDivide(ctx, e.factors[j].derivative.derivative, e.factors[j].value)));
    demand(owner.equal(ctx, lhs, rhs), 'verification-failed', 'recursive factored logarithmic derivative target');
  }
  verifyLinearSolution(ctx, Q, projected(ctx, inputs.length, e.basis), e.independence);
  demand(e.independence.kind === 'consistent' && e.independence.nullspace.length === 0, 'verification-failed', 'recursive projected relation independence');
}
export function verifyRecursiveLogarithmicDerivativeRelations(ctx: ExecutionContext, view: CertifiedTowerView, inputs: readonly E[], e: RecursiveLogarithmicRelations, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyRecursiveLogarithmicRelationsWithin(ctx, view, inputs, e, bounds));
}
