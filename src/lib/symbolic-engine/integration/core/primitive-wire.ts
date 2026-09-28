import { demand, type ExecutionContext } from './execution';
import { decodePolynomial, encodePolynomial, type ExactWire } from './exact-wire';
import { FormalPrimitiveDomain, type FormalPrimitive, type RootLogTerm } from './formal-primitive';

interface TermWire {
  readonly modulus: ExactWire;
  readonly weight: ExactWire;
  readonly argument: readonly ExactWire[];
}
/** Independent private tag. Existing exact scalar/polynomial version 1 is unchanged. */
export interface PrimitiveWire {
  readonly kind: 'formal-local-complex-primitive';
  readonly version: 1;
  readonly variable: string;
  readonly residueVariable: string;
  readonly rationalPart: { readonly numerator: ExactWire; readonly denominator: ExactWire };
  readonly terms: readonly TermWire[];
  readonly conditions: { readonly rationalDenominator: ExactWire; readonly logNorms: readonly ExactWire[] };
}
function record(ctx: ExecutionContext, input: unknown, keys: readonly string[]): Record<string, unknown> {
  ctx.allocate(keys.length);
  demand(typeof input === 'object' && input !== null && !Array.isArray(input)
    && (Object.getPrototypeOf(input) === Object.prototype || Object.getPrototypeOf(input) === null), 'invalid-input', 'representation record');
  demand(Reflect.ownKeys(input).length === keys.length, 'invalid-input', 'representation keys');
  for (const key of keys) {
    ctx.tick(); const descriptor = Object.getOwnPropertyDescriptor(input, key);
    demand(descriptor !== undefined && Object.hasOwn(descriptor, 'value') && descriptor.enumerable === true, 'invalid-input', 'representation accessor/key');
  }
  return input as Record<string, unknown>;
}
function array(ctx: ExecutionContext, input: unknown): readonly unknown[] {
  demand(Array.isArray(input), 'invalid-input', 'representation array'); ctx.allocate(input.length);
  demand(Reflect.ownKeys(input).length === input.length + 1, 'invalid-input', 'representation array keys');
  for (let i = 0; i < input.length; i++) {
    ctx.tick(); const descriptor = Object.getOwnPropertyDescriptor(input, i);
    demand(descriptor !== undefined && Object.hasOwn(descriptor, 'value') && descriptor.enumerable === true, 'invalid-input', 'representation sparse/accessor array');
  }
  return input;
}
function encodePrimitiveWithin(ctx: ExecutionContext, candidate: FormalPrimitive): PrimitiveWire {
  const owner = candidate.owner; owner.assert(ctx, candidate); owner.verifyConditions(ctx, candidate, candidate.conditions);
  ctx.allocate(candidate.terms.length * 4 + owner.x.variable.length + owner.z.variable.length + 10);
  const terms = candidate.terms.map(term => {
    ctx.allocate(term.argument.coefficients.length);
    return Object.freeze({ modulus: encodePolynomial(ctx, owner.z, term.modulus), weight: encodePolynomial(ctx, owner.z, term.weight),
      argument: Object.freeze(term.argument.coefficients.map(c => encodePolynomial(ctx, owner.z, c))) });
  });
  return Object.freeze({ kind: 'formal-local-complex-primitive', version: 1, variable: owner.x.variable, residueVariable: owner.z.variable,
    rationalPart: Object.freeze({ numerator: encodePolynomial(ctx, owner.x, candidate.rationalPart.numerator), denominator: encodePolynomial(ctx, owner.x, candidate.rationalPart.denominator) }),
    terms: Object.freeze(terms), conditions: Object.freeze({ rationalDenominator: encodePolynomial(ctx, owner.x, candidate.conditions.rationalDenominator),
      logNorms: Object.freeze(candidate.conditions.logNorms.map(p => encodePolynomial(ctx, owner.x, p))) }) });
}
/** Reconstruct fresh domain ownership; stored proof authority is never accepted. */
function decodePrimitiveWithin(ctx: ExecutionContext, input: unknown, expected: { readonly variable: string; readonly residueVariable: string }): FormalPrimitive {
  ctx.allocate(expected.variable.length + expected.residueVariable.length + 20);
  return decodePrimitiveInDomain(ctx, new FormalPrimitiveDomain(expected.variable, expected.residueVariable), input);
}
/** Bind existing wire structure to a caller-owned domain; optionally replay saved norm certificates. */
export function decodePrimitiveInDomain(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: unknown,
  normEvidence?: readonly RootLogTerm['normEvidence'][]): FormalPrimitive {
  const raw = record(ctx, input, ['kind', 'version', 'variable', 'residueVariable', 'rationalPart', 'terms', 'conditions']);
  demand(raw.kind === 'formal-local-complex-primitive' && raw.version === 1 && raw.variable === owner.x.variable
    && raw.residueVariable === owner.z.variable, 'domain-mismatch', 'representation version/variables');
  const fraction = record(ctx, raw.rationalPart, ['numerator', 'denominator']);
  const numerator = decodePolynomial(ctx, owner.x, fraction.numerator), denominator = decodePolynomial(ctx, owner.x, fraction.denominator);
  const rationalPart = owner.fractions.make(ctx, numerator, denominator);
  demand(owner.x.equal(ctx, numerator, rationalPart.numerator) && owner.x.equal(ctx, denominator, rationalPart.denominator),
    'invalid-input', 'noncanonical rational-function artifact');
  const rawTerms = array(ctx, raw.terms);
  demand(normEvidence === undefined || normEvidence.length === rawTerms.length, 'invalid-input', 'norm evidence coverage');
  const terms = rawTerms.map((inputTerm, i) => {
    const term = record(ctx, inputTerm, ['modulus', 'weight', 'argument']);
    const modulus = decodePolynomial(ctx, owner.z, term.modulus), weight = decodePolynomial(ctx, owner.z, term.weight);
    const coefficients = array(ctx, term.argument); ctx.degree(coefficients.length - 1);
    const argument = owner.arguments.make(ctx, coefficients.map(c => decodePolynomial(ctx, owner.z, c)));
    demand(argument.coefficients.length === coefficients.length, 'invalid-input', 'noncanonical argument trailing zero');
    const result = normEvidence === undefined ? owner.term(ctx, modulus, weight, argument)
      : owner.termFromEvidence(ctx, modulus, weight, argument, normEvidence[i]);
    demand(owner.z.equal(ctx, result.weight, weight) && owner.arguments.equal(ctx, result.argument, argument),
      'invalid-input', 'unreduced representation coefficients');
    return result;
  });
  const result = owner.make(ctx, rationalPart, terms);
  const conditions = record(ctx, raw.conditions, ['rationalDenominator', 'logNorms']);
  owner.verifyConditions(ctx, result, { rationalDenominator: decodePolynomial(ctx, owner.x, conditions.rationalDenominator),
    logNorms: array(ctx, conditions.logNorms).map(c => decodePolynomial(ctx, owner.x, c)) });
  return result;
}

export function encodePrimitive(ctx: ExecutionContext, candidate: FormalPrimitive): PrimitiveWire {
  return ctx.operation(() => encodePrimitiveWithin(ctx, candidate));
}
export function decodePrimitive(ctx: ExecutionContext, input: unknown, expected: { readonly variable: string; readonly residueVariable: string }): FormalPrimitive {
  return ctx.operation(() => decodePrimitiveWithin(ctx, input, expected));
}
