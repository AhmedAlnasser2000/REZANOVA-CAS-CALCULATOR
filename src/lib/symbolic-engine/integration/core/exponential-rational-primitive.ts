import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds, DifferentialElement as E } from './differential-field';
import { differentiate, verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { type ExactField } from './field';
import type { QPolynomial } from './formal-primitive';
import { polynomialDivide } from './polynomial-division';
import { SquareFreeQuotientAlgebra, type UnitAnalysis } from './quotient-algebra';
import { quotientTrace, verifyQuotientTrace, type TraceCertificate } from './quotient-trace';
import { subresultants, verifySubresultants, type SubresultantCertificate } from './subresultant';
import { ExponentialRationalDomain, assertExponentialRationalDomain, requireExponentialField, type EP } from './exponential-rational-domain';

export interface ExponentialLogTerm {
  readonly domain: ExponentialRationalDomain;
  readonly modulus: QPolynomial;
  readonly weight: QPolynomial;
  readonly argument: EP;
  readonly algebra: SquareFreeQuotientAlgebra<E>;
  readonly inverse: UnitAnalysis<E>;
  readonly norm: E;
  readonly normEvidence: SubresultantCertificate<E, ExactField<E>>;
}
export interface ExponentialPrimitive {
  readonly domain: ExponentialRationalDomain;
  readonly fieldPart: E;
  readonly terms: readonly ExponentialLogTerm[];
}
export interface ExponentialLogDerivative {
  readonly coefficients: readonly DerivativeEvidence[];
  readonly logarithmicDerivative: EP;
  readonly trace: TraceCertificate<E>;
}
export interface ExponentialPrimitiveDerivative {
  readonly field: DerivativeEvidence;
  readonly terms: readonly ExponentialLogDerivative[];
  readonly derivative: E;
}
export function verifyExponentialLogTerm(ctx: ExecutionContext, d: ExponentialRationalDomain, term: ExponentialLogTerm): void {
  assertExponentialRationalDomain(ctx, d);
  demand(term.domain === d, 'domain-mismatch', 'exponential logarithm owner');
  d.z.assert(ctx, term.modulus); d.z.assert(ctx, term.weight); d.fz.assert(ctx, term.argument);
  // Q square-freeness is independently checked; the lifted quotient is only a ring.
  new SquareFreeQuotientAlgebra(ctx, d.z, term.modulus);
  demand(d.z.degree(ctx, term.weight) < d.z.degree(ctx, term.modulus)
    && d.fz.degree(ctx, term.argument) < d.z.degree(ctx, term.modulus), 'verification-failed', 'unreduced root-log data');
  demand(term.algebra.ring === d.fz && d.fz.equal(ctx, term.algebra.modulus, d.lift(ctx, term.modulus)),
    'domain-mismatch', 'root-log quotient binding');
  demand(term.inverse.kind === 'unit', 'invalid-input', 'logarithm argument vanishes on a component');
  term.algebra.verifyUnit(ctx, term.algebra.make(ctx, term.argument), term.inverse);
  verifySubresultants(ctx, d.fz, term.algebra.modulus, term.argument, term.normEvidence);
  demand(d.field.equal(ctx, term.norm, term.normEvidence.resultant) && !d.field.isZero(ctx, term.norm),
    'verification-failed', 'logarithm norm');
}
function makeExponentialLogTerm(ctx: ExecutionContext, d: ExponentialRationalDomain,
  modulus: QPolynomial, weight: QPolynomial, argument: EP): ExponentialLogTerm {
  new SquareFreeQuotientAlgebra(ctx, d.z, modulus);
  const algebra = new SquareFreeQuotientAlgebra(ctx, d.fz, d.lift(ctx, modulus));
  const reduced = algebra.make(ctx, argument), inverse = algebra.analyzeUnit(ctx, reduced);
  const normEvidence = subresultants(ctx, d.fz, algebra.modulus, reduced.representative);
  ctx.allocate(9);
  const term = Object.freeze({ domain: d, modulus, weight: polynomialDivide(ctx, d.z, weight, modulus).remainder,
    argument: reduced.representative, algebra, inverse, norm: normEvidence.resultant, normEvidence });
  verifyExponentialLogTerm(ctx, d, term); return term;
}
function makeExponentialPrimitive(ctx: ExecutionContext, d: ExponentialRationalDomain,
  fieldPart: E, terms: readonly ExponentialLogTerm[]): ExponentialPrimitive {
  d.field.assert(ctx, fieldPart); ctx.allocate(terms.length + 3);
  for (const term of terms) verifyExponentialLogTerm(ctx, d, term);
  return Object.freeze({ domain: d, fieldPart, terms: Object.freeze([...terms]) });
}
export function differentiateExponentialPrimitive(ctx: ExecutionContext, p: ExponentialPrimitive,
  bounds: DifferentialBounds): ExponentialPrimitiveDerivative {
  return ctx.operation(() => {
    const d = p.domain; assertExponentialRationalDomain(ctx, d); requireExponentialField(ctx, d.field, bounds);
    const field = differentiate(ctx, d.field, p.fieldPart); let derivative = field.derivative;
    ctx.allocate(p.terms.length + 3);
    const terms = p.terms.map(term => {
      verifyExponentialLogTerm(ctx, d, term); const a = term.algebra;
      demand(term.inverse.kind === 'unit', 'verification-failed', 'logarithm inverse');
      ctx.allocate(term.argument.coefficients.length + 3);
      const coefficients = Object.freeze(term.argument.coefficients.map(c => differentiate(ctx, d.field, c)));
      const dg = a.make(ctx, d.fz.make(ctx, coefficients.map(c => c.derivative)));
      const value = a.multiply(ctx, a.multiply(ctx, a.make(ctx, d.lift(ctx, term.weight)), dg), term.inverse.inverse);
      const trace = quotientTrace(ctx, a, value); derivative = d.field.add(ctx, derivative, trace.trace);
      return Object.freeze({ coefficients, logarithmicDerivative: value.representative, trace });
    });
    const proof = Object.freeze({ field, terms: Object.freeze(terms), derivative });
    verifyExponentialPrimitive(ctx, p, derivative, proof, bounds); return proof;
  });
}
export function verifyExponentialPrimitive(ctx: ExecutionContext, p: ExponentialPrimitive, target: E,
  proof: ExponentialPrimitiveDerivative, bounds: DifferentialBounds): void {
  ctx.operation(() => {
    const d = p.domain, f = d.field; assertExponentialRationalDomain(ctx, d); requireExponentialField(ctx, f, bounds); f.assert(ctx, target);
    verifyDerivative(ctx, f, p.fieldPart, proof.field);
    demand(proof.terms.length === p.terms.length, 'verification-failed', 'root-log derivative coverage');
    let derivative = proof.field.derivative;
    for (let i = 0; i < p.terms.length; i++) {
      ctx.tick(); const term = p.terms[i], evidence = proof.terms[i]; verifyExponentialLogTerm(ctx, d, term);
      demand(evidence.coefficients.length === term.argument.coefficients.length, 'verification-failed', 'coefficient derivative coverage');
      for (let j = 0; j < evidence.coefficients.length; j++) verifyDerivative(ctx, f, term.argument.coefficients[j], evidence.coefficients[j]);
      const a = term.algebra; ctx.allocate(evidence.coefficients.length);
      const dg = a.make(ctx, d.fz.make(ctx, evidence.coefficients.map(c => c.derivative)));
      const logarithmic = a.make(ctx, evidence.logarithmicDerivative);
      demand(d.fz.equal(ctx, logarithmic.representative, evidence.logarithmicDerivative), 'verification-failed', 'unreduced logarithmic derivative');
      // Check the quotient identity directly, not by repeating inverse multiplication.
      demand(a.equal(ctx, a.multiply(ctx, logarithmic, a.make(ctx, term.argument)),
        a.multiply(ctx, a.make(ctx, d.lift(ctx, term.weight)), dg)), 'verification-failed', 'logarithmic derivative identity');
      verifyQuotientTrace(ctx, a, logarithmic, evidence.trace);
      derivative = f.add(ctx, derivative, evidence.trace.trace);
    }
    demand(f.equal(ctx, derivative, proof.derivative) && f.equal(ctx, derivative, target), 'verification-failed', 'complete exponential primitive derivative');
  });
}

/** External construction boundaries are cold even when callers reuse a context. */
export function exponentialLogTerm(ctx: ExecutionContext, d: ExponentialRationalDomain,
  modulus: QPolynomial, weight: QPolynomial, argument: EP): ExponentialLogTerm {
  return ctx.operation(() => { assertExponentialRationalDomain(ctx, d); return makeExponentialLogTerm(ctx, d, modulus, weight, argument); });
}
export function exponentialPrimitive(ctx: ExecutionContext, d: ExponentialRationalDomain,
  fieldPart: E, terms: readonly ExponentialLogTerm[]): ExponentialPrimitive {
  return ctx.operation(() => { assertExponentialRationalDomain(ctx, d); return makeExponentialPrimitive(ctx, d, fieldPart, terms); });
}
