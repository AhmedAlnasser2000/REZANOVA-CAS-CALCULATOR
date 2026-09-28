import { demand, type ExecutionContext } from './execution';
import { rationalField } from './field';
import type { Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { PolynomialDomain } from './polynomial-domain';
import { polynomialDivide } from './polynomial-division';
import { RationalFunctionField, type RationalFunction } from './rational-function';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import { subresultants, verifySubresultants, type SubresultantCertificate } from './subresultant';

export type QPolynomial = Polynomial<Rational>;
export type BivariatePolynomial = Polynomial<QPolynomial, PolynomialDomain<Rational>>;
export type QRationalFunction = RationalFunction<Rational>;
export interface RootLogTerm {
  readonly owner: FormalPrimitiveDomain;
  readonly modulus: QPolynomial;
  readonly weight: QPolynomial;
  /** Outer integration variable, with residue-polynomial coefficients. */
  readonly argument: BivariatePolynomial;
  readonly norm: QPolynomial;
  readonly normEvidence: SubresultantCertificate<QPolynomial, PolynomialDomain<Rational>>;
}
export interface PrimitiveConditions {
  readonly rationalDenominator: QPolynomial;
  readonly logNorms: readonly QPolynomial[];
}
export interface FormalPrimitive {
  readonly owner: FormalPrimitiveDomain;
  readonly rationalPart: QRationalFunction;
  readonly terms: readonly RootLogTerm[];
  readonly conditions: PrimitiveConditions;
}

/** Local complex logarithms over every distinct root, once. No root ordering,
 * branch selection, real presentation or automatic integration is implied. */
export class FormalPrimitiveDomain {
  readonly x: PolynomialRing<Rational>;
  readonly z: PolynomialRing<Rational>;
  readonly arguments: PolynomialRing<QPolynomial, PolynomialDomain<Rational>>;
  readonly elimination: PolynomialRing<QPolynomial, PolynomialDomain<Rational>>;
  readonly fractions: RationalFunctionField<Rational>;
  readonly residues: PolynomialRing<QRationalFunction>;
  #terms = new WeakSet<object>();
  #primitives = new WeakSet<object>();
  constructor(variable: string, residueVariable: string) {
    demand(variable !== residueVariable, 'domain-mismatch', 'integration and residue variables must differ');
    this.x = new PolynomialRing(rationalField, variable); this.z = new PolynomialRing(rationalField, residueVariable);
    this.arguments = new PolynomialRing(new PolynomialDomain(this.z), variable);
    this.elimination = new PolynomialRing(new PolynomialDomain(this.x), residueVariable);
    this.fractions = new RationalFunctionField(this.x);
    this.residues = new PolynomialRing(this.fractions, residueVariable);
    Object.freeze(this);
  }
  transpose(ctx: ExecutionContext, argument: BivariatePolynomial): BivariatePolynomial {
    this.arguments.assert(ctx, argument);
    let length = 0;
    for (const c of argument.coefficients) { ctx.tick(); length = Math.max(length, c.coefficients.length); }
    ctx.allocate(length * argument.coefficients.length + length);
    const out: QPolynomial[] = [];
    for (let i = 0; i < length; i++) {
      ctx.tick(); out.push(this.x.make(ctx, argument.coefficients.map(c => c.coefficients[i] ?? rationalField.fromInteger(ctx, 0n))));
    }
    return this.elimination.make(ctx, out);
  }
  liftModulusForNorm(ctx: ExecutionContext, q: QPolynomial): BivariatePolynomial {
    this.z.assert(ctx, q); ctx.allocate(q.coefficients.length);
    return this.elimination.make(ctx, q.coefficients.map(c => this.x.constant(ctx, c)));
  }
  liftResidue(ctx: ExecutionContext, p: QPolynomial): Polynomial<QRationalFunction> {
    this.z.assert(ctx, p); ctx.allocate(p.coefficients.length);
    return this.residues.make(ctx, p.coefficients.map(c => this.fractions.fromCoefficient(ctx, c)));
  }
  liftArgument(ctx: ExecutionContext, p: BivariatePolynomial): Polynomial<QRationalFunction> {
    const transposed = this.transpose(ctx, p); ctx.allocate(transposed.coefficients.length);
    return this.residues.make(ctx, transposed.coefficients.map(c => this.fractions.make(ctx, c, this.x.one(ctx))));
  }
  term(ctx: ExecutionContext, modulus: QPolynomial, weight: QPolynomial, argument: BivariatePolynomial): RootLogTerm {
    this.z.assert(ctx, modulus); this.z.assert(ctx, weight); this.arguments.assert(ctx, argument);
    // This also validates square-freeness over Q. The algebra is not asserted to be a field.
    new SquareFreeQuotientAlgebra(ctx, this.z, modulus);
    const reducedWeight = polynomialDivide(ctx, this.z, weight, modulus).remainder;
    ctx.allocate(argument.coefficients.length + 6);
    const reducedArgument = this.arguments.make(ctx, argument.coefficients.map(c => polynomialDivide(ctx, this.z, c, modulus).remainder));
    const normEvidence = subresultants(ctx, this.elimination, this.liftModulusForNorm(ctx, modulus), this.transpose(ctx, reducedArgument));
    return this.termFromEvidence(ctx, modulus, reducedWeight, reducedArgument, normEvidence);
  }
  /** Restore an owned term by replaying supplied norm evidence, without generating a PRS. */
  termFromEvidence(ctx: ExecutionContext, modulus: QPolynomial, weight: QPolynomial, argument: BivariatePolynomial,
    normEvidence: RootLogTerm['normEvidence']): RootLogTerm {
    this.z.assert(ctx, modulus); this.z.assert(ctx, weight); this.arguments.assert(ctx, argument);
    new SquareFreeQuotientAlgebra(ctx, this.z, modulus);
    const norm = normEvidence.resultant;
    demand(!this.x.isZero(ctx, norm), 'invalid-input', 'log argument identically zero on a component');
    ctx.allocate(6);
    const term = Object.freeze({ owner: this, modulus, weight, argument, norm, normEvidence });
    // Registration is private and the candidate cannot escape before verification.
    this.#terms.add(term); this.verifyTerm(ctx, term); return term;
  }
  assertTerm(ctx: ExecutionContext, term: RootLogTerm) {
    ctx.tick(); demand(typeof term === 'object' && term !== null && this.#terms.has(term), 'domain-mismatch', 'root-log term ownership');
    this.z.assert(ctx, term.modulus); this.z.assert(ctx, term.weight); this.arguments.assert(ctx, term.argument);
  }
  verifyTerm(ctx: ExecutionContext, term: RootLogTerm) {
    this.assertTerm(ctx, term);
    demand(this.z.degree(ctx, term.weight) < this.z.degree(ctx, term.modulus), 'verification-failed', 'unreduced weight');
    for (const c of term.argument.coefficients) demand(this.z.degree(ctx, c) < this.z.degree(ctx, term.modulus), 'verification-failed', 'unreduced argument');
    verifySubresultants(ctx, this.elimination, this.liftModulusForNorm(ctx, term.modulus), this.transpose(ctx, term.argument), term.normEvidence);
    demand(!this.x.isZero(ctx, term.norm) && this.x.equal(ctx, term.norm, term.normEvidence.resultant), 'verification-failed', 'log nonvanishing norm');
  }
  make(ctx: ExecutionContext, rationalPart: QRationalFunction, terms: readonly RootLogTerm[]): FormalPrimitive {
    this.fractions.assert(ctx, rationalPart); demand(Array.isArray(terms), 'invalid-input', 'root-log list'); ctx.allocate(terms.length * 2 + 5);
    for (const term of terms) this.verifyTerm(ctx, term);
    const conditions = Object.freeze({ rationalDenominator: rationalPart.denominator, logNorms: Object.freeze(terms.map(term => term.norm)) });
    const result = Object.freeze({ owner: this, rationalPart, terms: Object.freeze([...terms]), conditions });
    this.#primitives.add(result); return result;
  }
  assert(ctx: ExecutionContext, candidate: FormalPrimitive) {
    ctx.tick(); demand(typeof candidate === 'object' && candidate !== null && this.#primitives.has(candidate), 'domain-mismatch', 'formal primitive ownership');
    this.fractions.assert(ctx, candidate.rationalPart);
    for (const term of candidate.terms) this.assertTerm(ctx, term);
  }
  verifyConditions(ctx: ExecutionContext, candidate: FormalPrimitive, conditions: PrimitiveConditions) {
    this.assert(ctx, candidate);
    demand(this.x.equal(ctx, conditions.rationalDenominator, candidate.rationalPart.denominator)
      && conditions.logNorms.length === candidate.terms.length, 'verification-failed', 'primitive conditions coverage');
    ctx.allocate(conditions.logNorms.length);
    for (let i = 0; i < candidate.terms.length; i++) {
      this.verifyTerm(ctx, candidate.terms[i]);
      demand(this.x.equal(ctx, conditions.logNorms[i], candidate.terms[i].norm), 'verification-failed', 'lost log nonvanishing condition');
    }
  }
}
