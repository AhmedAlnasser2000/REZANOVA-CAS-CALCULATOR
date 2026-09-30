import { demand, type ExecutionContext } from './execution';
import { DifferentialField, checkDifferentialBounds, type DifferentialBounds, type DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { integerGcd, rational, type Rational } from './rational';
import { squareFree, verifySquareFree, type SquareFreeDecomposition } from './polynomial-square-free';
import { exactDivide, polynomialGcd } from './polynomial-division';
import type { Polynomial } from './polynomial';

type Decomposition = SquareFreeDecomposition<E>;
export interface ExponentialAdmission {
  readonly kind: 'exponential';
  readonly argument: E;
  readonly derivative: DerivativeEvidence;
  readonly obstruction: 'polynomial-part' | 'finite-pole';
  readonly denominator: Decomposition;
  readonly conditions: readonly Polynomial<E>[];
  readonly arguments: readonly E[];
  readonly exponents: readonly bigint[];
}
export interface LogarithmicAdmission {
  readonly kind: 'logarithmic';
  readonly semantics: 'chosen-local-log';
  readonly argument: E;
  readonly derivative: DerivativeEvidence;
  readonly numerator: Decomposition;
  readonly denominator: Decomposition;
  readonly residueSide: 'numerator' | 'denominator';
  readonly residue: bigint;
  readonly conditions: readonly Polynomial<E>[];
}
export type FunctionAdmission = ExponentialAdmission | LogarithmicAdmission;
export type AdmissionResult = Readonly<{ status: 'supported'; field: DifferentialField; aliases: readonly E[] }>
  | Readonly<{ status: 'unsupported'; reason: 'constant-extension' | 'not-rational-multiples' | 'first-level-only' }>;

export function requireRationalVariable(ctx: ExecutionContext, owner: DifferentialField): void {
  ctx.tick();
  demand(owner instanceof DifferentialField && owner.kind === 'variable' && owner.parent?.kind === 'rational',
    'domain-mismatch', 'admission requires Q(x)');
}
export function scalarValue(ctx: ExecutionContext, owner: DifferentialField, a: E): Rational | undefined {
  owner.assert(ctx, a);
  if (a.kind === 'scalar') return a.value;
  if (a.value.numerator.coefficients.length > 1 || a.value.denominator.coefficients.length !== 1) return undefined;
  const n = a.value.numerator.coefficients[0];
  return n ? scalarValue(ctx, owner.parent!, n) : rational(ctx, 0n);
}
function parts(ctx: ExecutionContext, owner: DifferentialField, a: E) {
  requireRationalVariable(ctx, owner); owner.assert(ctx, a);
  demand(a.kind === 'fraction', 'domain-mismatch', 'rational argument'); return a.value;
}
function conditions(ctx: ExecutionContext, owner: DifferentialField, given: readonly Polynomial<E>[], expected: readonly Polynomial<E>[]): void {
  demand(Array.isArray(given) && given.length === expected.length, 'verification-failed', 'admission condition coverage');
  for (let i = 0; i < expected.length; i++)
    demand(owner.fractions!.ring.equal(ctx, given[i], expected[i]), 'verification-failed', 'admission condition');
}
/** Exact theorem hypotheses; does not invoke any admission producer. */
export function verifyAdmission(ctx: ExecutionContext, field: DifferentialField, evidence: FunctionAdmission): void {
  ctx.operation(() => {
    const owner = field.parent!;
    requireRationalVariable(ctx, owner);
    const f = parts(ctx, owner, evidence.argument), ring = owner.fractions!.ring;
    demand(scalarValue(ctx, owner, evidence.argument) === undefined, 'verification-failed', 'constant function admission');
    verifyDerivative(ctx, owner, evidence.argument, evidence.derivative);
    const d = evidence.derivative.derivative;
    verifySquareFree(ctx, ring, f.denominator, evidence.denominator);
    ctx.allocate(4);
    let expectedRule: readonly E[];
    if (evidence.kind === 'exponential') {
      conditions(ctx, owner, evidence.conditions, [f.denominator]);
      const rationalDerivative = parts(ctx, owner, d);
      if (ring.degree(ctx, f.denominator) === 0) {
        demand(evidence.obstruction === 'polynomial-part' && ring.degree(ctx, rationalDerivative.denominator) === 0
          && !owner.isZero(ctx, d), 'verification-failed', 'exponential polynomial obstruction');
      } else {
        demand(evidence.obstruction === 'finite-pole' && evidence.denominator.factors.length > 0,
          'verification-failed', 'exponential pole obstruction');
        const { factor, multiplicity } = evidence.denominator.factors[0];
        // At each root of this square-free factor, r' must have pole order m+1.
        const cofactor = exactDivide(ctx, ring, rationalDerivative.denominator, ring.power(ctx, factor, multiplicity + 1));
        demand(ring.equal(ctx, polynomialGcd(ctx, ring, cofactor, factor), ring.one(ctx)),
          'verification-failed', 'exponential pole order');
      }
      demand(Array.isArray(evidence.arguments) && Array.isArray(evidence.exponents)
        && evidence.arguments.length > 0 && evidence.arguments.length === evidence.exponents.length,
      'verification-failed', 'exponential alias coverage');
      let gcd = 0n;
      for (let i = 0; i < evidence.arguments.length; i++) {
        ctx.tick(); ctx.integer(evidence.exponents[i]);
        demand(owner.equal(ctx, evidence.arguments[i], owner.multiply(ctx, evidence.argument,
          owner.fromInteger(ctx, evidence.exponents[i]))), 'verification-failed', 'exponential alias reconstruction');
        gcd = integerGcd(ctx, gcd, evidence.exponents[i]);
      }
      demand(gcd === 1n, 'verification-failed', 'exponential exponents not primitive');
      const lead = scalarValue(ctx, owner.parent!, ring.leading(ctx, f.numerator))!;
      demand(lead.numerator > 0n, 'verification-failed', 'exponential basis orientation');
      expectedRule = [owner.fromInteger(ctx, 0n), d];
    } else {
      demand(evidence.kind === 'logarithmic' && evidence.semantics === 'chosen-local-log', 'verification-failed', 'local-log semantics');
      conditions(ctx, owner, evidence.conditions, [f.numerator, f.denominator]);
      verifySquareFree(ctx, ring, f.numerator, evidence.numerator);
      const side = evidence.numerator.factors.length ? 'numerator' : 'denominator';
      demand(evidence.residueSide === side, 'verification-failed', 'log residue side');
      const selected = evidence[side].factors[0];
      demand(selected !== undefined, 'verification-failed', 'missing nonzero residue');
      const residue = BigInt(selected.multiplicity) * (side === 'numerator' ? 1n : -1n);
      ctx.integer(evidence.residue);
      demand(evidence.residue === residue && residue !== 0n, 'verification-failed', 'log residue');
      // Reduced r has disjoint numerator/denominator divisors. A square-free
      // component of multiplicity m therefore gives residue +m or -m.
      demand(ring.equal(ctx, polynomialGcd(ctx, ring, f.numerator, f.denominator), ring.one(ctx)),
        'verification-failed', 'log divisors overlap');
      expectedRule = [owner.exactDivide(ctx, d, evidence.argument)];
    }
    demand(field.fractions !== undefined && field.rule !== undefined, 'domain-mismatch', 'admission extension');
    demand(field.fractions.ring.equal(ctx, field.rule, field.fractions.ring.make(ctx, expectedRule)),
      'verification-failed', 'admitted derivation rule');
  });
}
/** Copy certificate containers: caller-owned mutable records never become authority. */
export function copyAdmission(ctx: ExecutionContext, a: FunctionAdmission): FunctionAdmission {
  const decomposition = (d: Decomposition): Decomposition => {
    ctx.allocate(2 + 3 * d.factors.length);
    return Object.freeze({ scalar: d.scalar, factors: Object.freeze(d.factors.map(f => Object.freeze({ ...f }))) });
  };
  ctx.allocate(12 + a.conditions.length);
  const shared = { argument: a.argument, derivative: Object.freeze({ ...a.derivative }),
    denominator: decomposition(a.denominator), conditions: Object.freeze([...a.conditions]) };
  if (a.kind === 'exponential') {
    ctx.allocate(a.arguments.length + a.exponents.length);
    return Object.freeze({ ...shared, kind: a.kind, obstruction: a.obstruction,
      arguments: Object.freeze([...a.arguments]), exponents: Object.freeze([...a.exponents]) });
  }
  return Object.freeze({ ...shared, kind: a.kind, semantics: a.semantics, numerator: decomposition(a.numerator),
    residueSide: a.residueSide, residue: a.residue });
}
function unsupported(ctx: ExecutionContext, reason: Extract<AdmissionResult, { status: 'unsupported' }>['reason']): AdmissionResult {
  ctx.allocate(2); return Object.freeze({ status: 'unsupported', reason });
}
function power(ctx: ExecutionContext, field: DifferentialField, t: E, n: bigint): E {
  ctx.integer(n); let out = field.fromInteger(ctx, 1n), base = n < 0n ? field.inverse(ctx, t) : t;
  if (n < 0n) n = -n;
  while (n) {
    ctx.tick(); if (ctx.remainder(n, 2n)) out = field.multiply(ctx, out, base);
    n = ctx.quotient(n, 2n); if (n) base = field.multiply(ctx, base, base);
  }
  return out;
}
export function buildExponential(ctx: ExecutionContext, owner: DifferentialField, variable: string,
  arguments_: readonly E[], bounds: DifferentialBounds): AdmissionResult {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds);
    if (owner.kind !== 'variable') return unsupported(ctx, 'first-level-only');
    requireRationalVariable(ctx, owner);
    demand(Array.isArray(arguments_) && arguments_.length > 0, 'invalid-input', 'empty exponential batch');
    ctx.allocate(arguments_.length);
    let first: E | undefined;
    for (const a of arguments_) {
      owner.assert(ctx, a); const scalar = scalarValue(ctx, owner, a);
      if (scalar && scalar.numerator !== 0n) return unsupported(ctx, 'constant-extension');
      if (!scalar && !first) first = a;
    }
    if (!first) {
      ctx.allocate(arguments_.length + 3);
      return Object.freeze({ status: 'supported', field: owner,
        aliases: Object.freeze(arguments_.map(() => owner.fromInteger(ctx, 1n))) });
    }
    const ratios: Rational[] = []; let lcm = 1n;
    for (const a of arguments_) {
      const ratio = scalarValue(ctx, owner, owner.exactDivide(ctx, a, first));
      if (!ratio) return unsupported(ctx, 'not-rational-multiples');
      ratios.push(ratio); lcm = ctx.multiply(ctx.quotient(lcm, integerGcd(ctx, lcm, ratio.denominator)), ratio.denominator);
    }
    ctx.allocate(arguments_.length);
    let exponents = ratios.map(r => ctx.multiply(r.numerator, ctx.quotient(lcm, r.denominator)));
    let gcd = 0n; for (const n of exponents) gcd = integerGcd(ctx, gcd, n);
    const q = owner.parent!, scale = owner.embed(ctx, q.scalar(ctx, rational(ctx, gcd, lcm)));
    let argument = owner.multiply(ctx, first, scale);
    const lead = parts(ctx, owner, argument).numerator.coefficients.at(-1)!;
    const sign = scalarValue(ctx, q, lead)!.numerator < 0n ? -1n : 1n;
    if (sign < 0n) argument = owner.negate(ctx, argument);
    ctx.allocate(exponents.length); exponents = exponents.map(n => ctx.multiply(ctx.quotient(n, gcd), sign));
    const f = parts(ctx, owner, argument), derivative = differentiate(ctx, owner, argument);
    ctx.allocate(12);
    const evidence: ExponentialAdmission = { kind: 'exponential', argument, derivative,
      obstruction: f.denominator.coefficients.length === 1 ? 'polynomial-part' : 'finite-pole',
      denominator: squareFree(ctx, owner.fractions!.ring, f.denominator), conditions: [f.denominator],
      arguments: arguments_, exponents };
    const field = DifferentialField.certified(ctx, owner, variable, [owner.fromInteger(ctx, 0n), derivative.derivative], bounds, evidence);
    ctx.allocate(arguments_.length + 3);
    const aliases = Object.freeze(exponents.map(n => power(ctx, field, field.generator(ctx), n)));
    return Object.freeze({ status: 'supported', field, aliases });
  });
}
export function buildLogarithm(ctx: ExecutionContext, owner: DifferentialField, variable: string, argument: E,
  bounds: DifferentialBounds): AdmissionResult {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds);
    if (owner.kind !== 'variable') return unsupported(ctx, 'first-level-only');
    const f = parts(ctx, owner, argument);
    demand(!owner.isZero(ctx, argument), 'invalid-input', 'logarithm of zero');
    if (scalarValue(ctx, owner, argument)) return unsupported(ctx, 'constant-extension');
    const ring = owner.fractions!.ring, derivative = differentiate(ctx, owner, argument);
    const numerator = squareFree(ctx, ring, f.numerator), denominator = squareFree(ctx, ring, f.denominator);
    const residueSide = numerator.factors.length ? 'numerator' : 'denominator';
    const selected = (residueSide === 'numerator' ? numerator : denominator).factors[0];
    ctx.allocate(13);
    const evidence: LogarithmicAdmission = { kind: 'logarithmic', semantics: 'chosen-local-log', argument,
      derivative, numerator, denominator, residueSide,
      residue: BigInt(selected.multiplicity) * (residueSide === 'numerator' ? 1n : -1n), conditions: [f.numerator, f.denominator] };
    const field = DifferentialField.certified(ctx, owner, variable, [owner.exactDivide(ctx, derivative.derivative, argument)], bounds, evidence);
    ctx.allocate(4); return Object.freeze({ status: 'supported', field, aliases: Object.freeze([field.generator(ctx)]) });
  });
}
