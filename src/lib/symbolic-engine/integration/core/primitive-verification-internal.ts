import { SharedDenominator } from './shared-denominator';
import { verifyRationalUnit, verifyRationalTrace, verifyRationalLogIdentity } from './rational-proof-arithmetic';
import { rationalField } from './field';
import { ScopedProof } from './scoped-proof';
const rootLogProofs = new ScopedProof();
import { demand, type ExecutionContext } from './execution';
import { type FormalPrimitive, type FormalPrimitiveDomain, type PrimitiveConditions, type QRationalFunction, type RootLogTerm } from './formal-primitive';
import { SquareFreeQuotientAlgebra, type QuotientElement, type UnitAnalysis } from './quotient-algebra';
import { quotientTrace, type TraceCertificate } from './quotient-trace';

export interface LogDerivativeCertificate {
  readonly algebra: SquareFreeQuotientAlgebra<QRationalFunction>;
  readonly inverse: UnitAnalysis<QRationalFunction>;
  readonly logarithmicDerivative: QuotientElement<QRationalFunction>;
  readonly trace: TraceCertificate<QRationalFunction>;
}
export interface PrimitiveDerivativeCertificate {
  readonly terms: readonly LogDerivativeCertificate[];
  readonly derivative: QRationalFunction;
  readonly conditions: PrimitiveConditions;
}
export function differentiateRootLogWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, term: RootLogTerm): LogDerivativeCertificate {
  owner.verifyTerm(ctx, term);
  const algebra = new SquareFreeQuotientAlgebra(ctx, owner.residues, owner.liftResidue(ctx, term.modulus));
  const argument = algebra.make(ctx, owner.liftArgument(ctx, term.argument));
  const inverse = algebra.analyzeUnit(ctx, argument);
  demand(inverse.kind === 'unit', 'verification-failed', 'nonzero norm must give a generic unit');
  const weight = algebra.make(ctx, owner.liftResidue(ctx, term.weight));
  const derivative = algebra.make(ctx, owner.liftArgument(ctx, owner.arguments.derivative(ctx, term.argument)));
  const logarithmicDerivative = algebra.multiply(ctx, algebra.multiply(ctx, weight, derivative), inverse.inverse);
  ctx.allocate(4);
  const result = Object.freeze({ algebra, inverse, logarithmicDerivative, trace: quotientTrace(ctx, algebra, logarithmicDerivative) });
  verifyRootLogDerivativeWithin(ctx, owner, term, result); return result;
}
function checkRootLogDerivative(ctx: ExecutionContext, owner: FormalPrimitiveDomain, term: RootLogTerm, proof: LogDerivativeCertificate): void {
  owner.verifyTerm(ctx, term);
  const { algebra } = proof;
  demand(algebra.ring === owner.residues && owner.residues.equal(ctx, algebra.modulus, owner.liftResidue(ctx, term.modulus)),
    'verification-failed', 'derivative quotient modulus');
  const argument = algebra.make(ctx, owner.liftArgument(ctx, term.argument));
  const arithmetic = new SharedDenominator(ctx, owner.residues);
  verifyRationalUnit(ctx, arithmetic, algebra, argument, proof.inverse);
  demand(proof.inverse.kind === 'unit', 'verification-failed', 'log derivative requires unit argument');
  const weight = algebra.make(ctx, owner.liftResidue(ctx, term.weight));
  const derivative = algebra.make(ctx, owner.liftArgument(ctx, owner.arguments.derivative(ctx, term.argument)));
  verifyRationalLogIdentity(ctx, owner, arithmetic, algebra, proof.logarithmicDerivative, argument.representative, weight.representative, derivative.representative);
  verifyRationalTrace(ctx, arithmetic, algebra, proof.logarithmicDerivative, proof.trace);
}
export function differentiatePrimitiveWithin(ctx: ExecutionContext, candidate: FormalPrimitive): PrimitiveDerivativeCertificate {
  const owner = candidate.owner; owner.assert(ctx, candidate); ctx.allocate(candidate.terms.length + 3);
  const terms = candidate.terms.map(term => differentiateRootLogWithin(ctx, owner, term));
  let derivative = owner.fractions.derivative(ctx, candidate.rationalPart);
  for (const term of terms) derivative = owner.fractions.add(ctx, derivative, term.trace.trace);
  const result = Object.freeze({ terms: Object.freeze(terms), derivative, conditions: candidate.conditions });
  verifyPrimitiveDerivativeWithin(ctx, candidate, derivative, result); return result;
}
/** Proves a supplied candidate against a separately supplied target. Never generates an integral. */
export function verifyPrimitiveDerivativeWithin(ctx: ExecutionContext, candidate: FormalPrimitive,
  target: QRationalFunction, proof: PrimitiveDerivativeCertificate): void {
  const owner = candidate.owner; owner.assert(ctx, candidate); owner.fractions.assert(ctx, target);
  demand(proof.terms.length === candidate.terms.length, 'verification-failed', 'derivative term coverage');
  ctx.allocate(proof.terms.length); owner.verifyConditions(ctx, candidate, proof.conditions);
  let sum = owner.fractions.derivative(ctx, candidate.rationalPart);
  for (let i = 0; i < candidate.terms.length; i++) {
    verifyRootLogDerivativeWithin(ctx, owner, candidate.terms[i], proof.terms[i]);
    sum = owner.fractions.add(ctx, sum, proof.terms[i].trace.trace);
  }
  demand(owner.fractions.equal(ctx, sum, proof.derivative) && owner.fractions.equal(ctx, sum, target),
    'verification-failed', 'candidate derivative differs from target');
}
export function verifyPrimitiveWithin(ctx: ExecutionContext, candidate: FormalPrimitive, target: QRationalFunction): PrimitiveDerivativeCertificate {
  const proof = differentiatePrimitiveWithin(ctx, candidate);
  verifyPrimitiveDerivativeWithin(ctx, candidate, target, proof); return proof;
}


export function verifyRootLogDerivativeWithin(ctx: ExecutionContext, owner: FormalPrimitiveDomain, term: RootLogTerm, proof: LogDerivativeCertificate): void {
  ctx.allocate(11);
  const owners: object[] = [owner, owner.x, owner.z, owner.arguments, owner.arguments.domain, owner.elimination,
    owner.elimination.domain, owner.fractions, owner.residues, rationalField];
  // Only the kernel's concrete immutable quotient owner is opaque to traversal.
  if (Object.getPrototypeOf(proof.algebra) === SquareFreeQuotientAlgebra.prototype) owners.push(proof.algebra);
  rootLogProofs.check(ctx, [owner, term, proof], () => checkRootLogDerivative(ctx, owner, term, proof), owners);
}
