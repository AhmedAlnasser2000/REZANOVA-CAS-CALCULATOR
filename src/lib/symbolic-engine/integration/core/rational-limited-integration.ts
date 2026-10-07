import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { requireRationalVariable } from './differential-admission';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { FormalPrimitiveDomain, type QPolynomial, type QRationalFunction } from './formal-primitive';
import { toRationalPrimitiveInput, fromRationalPrimitiveInput } from './exponential-sum-bridge';
import { hermiteReduce, verifyHermite, type HermiteCertificate } from './hermite-reduction';
import { extendedGcd, exactDivide, polynomialDivide, verifyBezout, verifyDivision, type Bezout, type Division } from './polynomial-division';
import { solveLinearSystem, verifyLinearSolution, type LinearSolution, type LinearSystem } from './linear-system';
import { rationalField as Q } from './field';
import type { Rational } from './rational';

export const limitedIntegrationRule = 'rational-limited-integration-hermite-v1' as const;
export interface LimitedReduction {
  readonly index: number;
  readonly input: QRationalFunction;
  readonly hermite: HermiteCertificate;
  readonly primitive: E;
  readonly residual: E;
  readonly normalization: Division<Rational>;
  readonly derivative: DerivativeEvidence;
}
export interface LimitedLcmStep {
  readonly gcd: Bezout<Rational>;
  readonly previousQuotient: QPolynomial;
  readonly inputQuotient: QPolynomial;
  readonly lcm: QPolynomial;
}
export interface LimitedCommonDenominator {
  readonly steps: readonly LimitedLcmStep[];
  readonly denominator: QPolynomial;
  readonly squareFree: Bezout<Rational>;
  readonly quotients: readonly QPolynomial[];
  readonly numerators: readonly QPolynomial[];
}
export interface LimitedFamilyPair {
  readonly coefficients: readonly Rational[];
  readonly primitive: E;
  readonly normalization: Division<Rational>;
  readonly derivative: DerivativeEvidence;
}
export interface LimitedFamily {
  readonly particular: LimitedFamilyPair;
  readonly directions: readonly LimitedFamilyPair[];
  /** Independent of the coefficient parameters, even when a direction has primitive zero. */
  readonly additiveConstant: 'arbitrary-rational';
}
interface LimitedEvidence {
  readonly domain: FormalPrimitiveDomain;
  readonly rule: typeof limitedIntegrationRule;
  readonly f: E;
  readonly generators: readonly E[];
  readonly reductions: readonly LimitedReduction[];
  readonly common: LimitedCommonDenominator;
  readonly system: LinearSystem<Rational>;
  readonly linear: LinearSolution<Rational>;
  readonly conditions: { readonly inputs: readonly QPolynomial[]; readonly primitives: readonly QPolynomial[] };
}
export type RationalLimitedIntegrationDecision = LimitedEvidence & (
  { readonly kind: 'solutions'; readonly family: LimitedFamily }
  | { readonly kind: 'no-rational-solution'; readonly family: null }
);

function check(ok: boolean, message: string): asserts ok { demand(ok, 'verification-failed', `limited integration: ${message}`); }
function inputs(ctx: ExecutionContext, owner: DifferentialField, f: E, generators: readonly E[]): readonly E[] {
  assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner); owner.assert(ctx, f);
  demand(Array.isArray(generators), 'invalid-input', 'limited integration generators');
  ctx.allocate(generators.length + 1);
  for (const g of generators) { ctx.tick(); owner.assert(ctx, g); }
  return [f, ...generators];
}
export function limitedIntegrationDomain(ctx: ExecutionContext, owner: DifferentialField): FormalPrimitiveDomain {
  assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner);
  const variable = owner.fractions!.ring.variable; ctx.allocate(variable.length + 8);
  return new FormalPrimitiveDomain(variable, variable === 'z' ? 'z0' : 'z');
}
function native(ctx: ExecutionContext, owner: DifferentialField, domain: FormalPrimitiveDomain, v: E): QRationalFunction {
  return toRationalPrimitiveInput(ctx, owner, domain, v);
}
function normalization(ctx: ExecutionContext, domain: FormalPrimitiveDomain, v: QRationalFunction): Division<Rational> {
  return polynomialDivide(ctx, domain.x, v.numerator, v.denominator);
}
function verifyNormalization(ctx: ExecutionContext, domain: FormalPrimitiveDomain, v: QRationalFunction, proof: Division<Rational>): void {
  verifyDivision(ctx, domain.x, v.numerator, v.denominator, proof);
  check(proof.quotient.coefficients.length === 0 || Q.isZero(ctx, proof.quotient.coefficients[0]), 'polynomial-part constant');
}
function reduce(ctx: ExecutionContext, owner: DifferentialField, domain: FormalPrimitiveDomain, h: E, index: number): LimitedReduction {
  const input = native(ctx, owner, domain, h), hermite = hermiteReduce(ctx, domain, input);
  const primitive = fromRationalPrimitiveInput(ctx, owner, domain, hermite.rationalPart);
  const residual = fromRationalPrimitiveInput(ctx, owner, domain, hermite.residual);
  ctx.allocate(7);
  return Object.freeze({ index, input, hermite, primitive, residual, normalization: normalization(ctx, domain, hermite.rationalPart),
    derivative: differentiate(ctx, owner, primitive) });
}
function commonDenominator(ctx: ExecutionContext, domain: FormalPrimitiveDomain, reductions: readonly LimitedReduction[]): LimitedCommonDenominator {
  const ring = domain.x; let denominator = ring.one(ctx); ctx.allocate(reductions.length * 3 + 5);
  const steps: LimitedLcmStep[] = [];
  for (const r of reductions) {
    ctx.tick(); const d = r.hermite.residual.denominator, gcd = extendedGcd(ctx, ring, denominator, d);
    const previousQuotient = exactDivide(ctx, ring, denominator, gcd.gcd), inputQuotient = exactDivide(ctx, ring, d, gcd.gcd);
    denominator = ring.multiply(ctx, previousQuotient, d); ctx.allocate(4);
    steps.push(Object.freeze({ gcd, previousQuotient, inputQuotient, lcm: denominator }));
  }
  const quotients = reductions.map(r => exactDivide(ctx, ring, denominator, r.hermite.residual.denominator));
  const numerators = reductions.map((r, i) => ring.multiply(ctx, r.hermite.residual.numerator, quotients[i]));
  return Object.freeze({ steps: Object.freeze(steps), denominator, squareFree: extendedGcd(ctx, ring, denominator, ring.derivative(ctx, denominator)),
    quotients: Object.freeze(quotients), numerators: Object.freeze(numerators) });
}
function matrixStorage(ctx: ExecutionContext, rows: number, columns: number): void {
  // Preflight both the coefficient matrix and the largest possible complete nullspace.
  // The linear solver charges its actual augmented matrix and nullspace allocations.
  const r = BigInt(rows), c = BigInt(columns), size = r * (c + 1n) + r;
  if (size > BigInt(Number.MAX_SAFE_INTEGER) || c * (c + 1n) + c > BigInt(Number.MAX_SAFE_INTEGER)) {
    ctx.exhaust('limited integration matrix dimensions');
  }
  ctx.allocate(Number(size));
}
function coefficientSystem(ctx: ExecutionContext, domain: FormalPrimitiveDomain, common: LimitedCommonDenominator, columns: number): LinearSystem<Rational> {
  const rows = domain.x.degree(ctx, common.denominator); check(rows >= 0, 'zero common denominator'); matrixStorage(ctx, rows, columns);
  const zero = Q.fromInteger(ctx, 0n), matrix: (readonly Rational[])[] = [], rhs: Rational[] = [];
  for (let i = 0; i < rows; i++) {
    ctx.tick(); const row: Rational[] = [];
    for (let j = 0; j < columns; j++) { ctx.tick(); row.push(common.numerators[j + 1].coefficients[i] ?? zero); }
    matrix.push(Object.freeze(row)); rhs.push(Q.negate(ctx, common.numerators[0].coefficients[i] ?? zero));
  }
  ctx.allocate(4); return Object.freeze({ rows, columns, matrix: Object.freeze(matrix), rhs: Object.freeze(rhs) });
}
function combination(ctx: ExecutionContext, owner: DifferentialField, initial: E, values: readonly E[], coefficients: readonly Rational[]): E {
  check(values.length === coefficients.length, 'combination coverage'); let result = initial;
  for (let i = 0; i < values.length; i++) {
    ctx.tick(); const scalar = owner.embed(ctx, owner.parent!.scalar(ctx, coefficients[i]));
    result = owner.add(ctx, result, owner.multiply(ctx, scalar, values[i]));
  }
  return result;
}
function familyPair(ctx: ExecutionContext, owner: DifferentialField, domain: FormalPrimitiveDomain, initial: E,
  primitives: readonly E[], coefficients: readonly Rational[]): LimitedFamilyPair {
  const primitive = combination(ctx, owner, initial, primitives, coefficients); ctx.allocate(4 + coefficients.length);
  return Object.freeze({ coefficients: Object.freeze([...coefficients]), primitive,
    normalization: normalization(ctx, domain, native(ctx, owner, domain, primitive)), derivative: differentiate(ctx, owner, primitive) });
}

/** All simple-pole residues must vanish. This is limited rational integration, not an elementary-integrability test. */
export function solveRationalLimitedIntegration(ctx: ExecutionContext, owner: DifferentialField, f: E, generators: readonly E[]): RationalLimitedIntegrationDecision {
  return ctx.operation(() => {
    const hs = inputs(ctx, owner, f, generators), domain = limitedIntegrationDomain(ctx, owner);
    ctx.allocate(hs.length * 3 + generators.length + 12);
    const reductions = Object.freeze(hs.map((h, i) => reduce(ctx, owner, domain, h, i)));
    const common = commonDenominator(ctx, domain, reductions), system = coefficientSystem(ctx, domain, common, generators.length);
    const linear = solveLinearSystem(ctx, Q, system); let family: LimitedFamily | null = null;
    if (linear.kind === 'consistent') {
      ctx.allocate(2 * generators.length + linear.nullspace.length + 3);
      const ps = reductions.slice(1).map(r => r.primitive), zero = owner.fromInteger(ctx, 0n);
      family = Object.freeze({ particular: familyPair(ctx, owner, domain, reductions[0].primitive, ps, linear.particular),
        directions: Object.freeze(linear.nullspace.map(d => familyPair(ctx, owner, domain, zero, ps, d))), additiveConstant: 'arbitrary-rational' });
    }
    ctx.allocate(family ? family.directions.length + 1 : 0);
    const representatives = family ? [family.particular, ...family.directions] : []; ctx.allocate(representatives.length * 2 + 2);
    const conditions = Object.freeze({ inputs: Object.freeze(reductions.map(r => r.input.denominator)),
      primitives: Object.freeze(representatives.map(p => native(ctx, owner, domain, p.primitive).denominator)) });
    const evidence = { domain, rule: limitedIntegrationRule, f, generators: Object.freeze([...generators]), reductions, common, system, linear, conditions };
    const decision: RationalLimitedIntegrationDecision = family ? Object.freeze({ ...evidence, kind: 'solutions', family })
      : Object.freeze({ ...evidence, kind: 'no-rational-solution', family: null });
    verifyWithin(ctx, owner, f, generators, decision); return decision;
  });
}

function verifyCommon(ctx: ExecutionContext, d: FormalPrimitiveDomain, reductions: readonly LimitedReduction[], p: LimitedCommonDenominator): void {
  const ring = d.x, one = ring.one(ctx); let previous = one;
  check(p.steps.length === reductions.length && p.quotients.length === reductions.length && p.numerators.length === reductions.length, 'LCM coverage');
  for (let i = 0; i < reductions.length; i++) {
    ctx.tick(); const step = p.steps[i], denominator = reductions[i].hermite.residual.denominator;
    verifyBezout(ctx, ring, previous, denominator, step.gcd);
    check(ring.equal(ctx, previous, ring.multiply(ctx, step.gcd.gcd, step.previousQuotient)), 'LCM previous quotient');
    check(ring.equal(ctx, denominator, ring.multiply(ctx, step.gcd.gcd, step.inputQuotient)), 'LCM input quotient');
    check(ring.equal(ctx, step.lcm, ring.multiply(ctx, step.previousQuotient, denominator)), 'LCM reconstruction');
    previous = step.lcm;
  }
  check(ring.equal(ctx, previous, p.denominator) && !ring.isZero(ctx, p.denominator)
    && Q.equal(ctx, ring.leading(ctx, p.denominator), Q.fromInteger(ctx, 1n)), 'monic common denominator');
  verifyBezout(ctx, ring, p.denominator, ring.derivative(ctx, p.denominator), p.squareFree);
  check(ring.equal(ctx, p.squareFree.gcd, one), 'square-free common denominator');
  for (let i = 0; i < reductions.length; i++) {
    ctx.tick(); const residual = reductions[i].hermite.residual;
    check(ring.equal(ctx, p.denominator, ring.multiply(ctx, residual.denominator, p.quotients[i])), 'residual quotient');
    check(ring.equal(ctx, p.numerators[i], ring.multiply(ctx, residual.numerator, p.quotients[i])), 'residual numerator');
    check(ring.degree(ctx, p.numerators[i]) < ring.degree(ctx, p.denominator), 'proper common residual');
  }
}
function sameVector(ctx: ExecutionContext, a: readonly Rational[], b: readonly Rational[]): void {
  check(a.length === b.length, 'coefficient vector coverage');
  for (let i = 0; i < a.length; i++) { ctx.tick(); check(Q.equal(ctx, a[i], b[i]), 'coefficient vector'); }
}
function verifyWithin(ctx: ExecutionContext, owner: DifferentialField, f: E, generators: readonly E[], decision: RationalLimitedIntegrationDecision): void {
  const hs = inputs(ctx, owner, f, generators), d = decision.domain;
  check(d instanceof FormalPrimitiveDomain && decision.rule === limitedIntegrationRule, 'domain or reduction rule');
  check(owner.equal(ctx, f, decision.f) && decision.generators.length === generators.length, 'expected inputs');
  for (let i = 0; i < generators.length; i++) { ctx.tick(); check(owner.equal(ctx, generators[i], decision.generators[i]), 'ordered generator'); }
  check(decision.reductions.length === hs.length && decision.conditions.inputs.length === hs.length, 'reduction/input-condition coverage');
  for (let i = 0; i < hs.length; i++) {
    ctx.tick(); const r = decision.reductions[i], input = native(ctx, owner, d, hs[i]);
    check(r.index === i && d.fractions.equal(ctx, input, r.input), 'indexed reduction input');
    verifyHermite(ctx, d, input, r.hermite);
    check(d.fractions.equal(ctx, native(ctx, owner, d, r.primitive), r.hermite.rationalPart), 'primitive bridge');
    check(d.fractions.equal(ctx, native(ctx, owner, d, r.residual), r.hermite.residual), 'residual bridge');
    verifyNormalization(ctx, d, r.hermite.rationalPart, r.normalization);
    verifyDerivative(ctx, owner, r.primitive, r.derivative);
    check(owner.equal(ctx, r.derivative.derivative, owner.subtract(ctx, hs[i], r.residual)), 'Hermite derivative target');
    check(d.x.equal(ctx, input.denominator, decision.conditions.inputs[i]), 'input denominator condition');
  }
  verifyCommon(ctx, d, decision.reductions, decision.common);
  const expected = coefficientSystem(ctx, d, decision.common, generators.length), system = decision.system;
  check(system.rows === expected.rows && system.columns === expected.columns && system.matrix.length === expected.rows, 'matrix dimensions');
  sameVector(ctx, system.rhs, expected.rhs);
  for (let i = 0; i < expected.rows; i++) { ctx.tick(); sameVector(ctx, system.matrix[i], expected.matrix[i]); }
  verifyLinearSolution(ctx, Q, system, decision.linear);
  if (decision.linear.kind === 'inconsistent') {
    check(decision.kind === 'no-rational-solution' && decision.family === null && decision.conditions.primitives.length === 0, 'negative outcome'); return;
  }
  check(decision.kind === 'solutions' && decision.family !== null, 'positive outcome');
  const family = decision.family;
  check(family.additiveConstant === 'arbitrary-rational' && family.directions.length === decision.linear.nullspace.length, 'complete family');
  const count = family.directions.length + 1;
  check(decision.conditions.primitives.length === count, 'primitive conditions coverage');
  ctx.allocate(2 * generators.length + count);
  const ps = decision.reductions.slice(1).map(r => r.primitive), zero = owner.fromInteger(ctx, 0n);
  for (let i = 0; i < count; i++) {
    ctx.tick(); const pair = i === 0 ? family.particular : family.directions[i - 1];
    sameVector(ctx, pair.coefficients, i === 0 ? decision.linear.particular : decision.linear.nullspace[i - 1]);
    const mapped = combination(ctx, owner, i === 0 ? decision.reductions[0].primitive : zero, ps, pair.coefficients);
    check(owner.equal(ctx, mapped, pair.primitive), 'family primitive mapping');
    const value = native(ctx, owner, d, pair.primitive); verifyNormalization(ctx, d, value, pair.normalization);
    verifyDerivative(ctx, owner, pair.primitive, pair.derivative);
    check(owner.equal(ctx, pair.derivative.derivative, combination(ctx, owner, i === 0 ? f : zero, generators, pair.coefficients)), 'family derivative target');
    check(d.x.equal(ctx, value.denominator, decision.conditions.primitives[i]), 'primitive denominator condition');
  }
}
export function verifyRationalLimitedIntegration(ctx: ExecutionContext, owner: DifferentialField, f: E, generators: readonly E[], decision: RationalLimitedIntegrationDecision): void {
  ctx.operation(() => verifyWithin(ctx, owner, f, generators, decision));
}
