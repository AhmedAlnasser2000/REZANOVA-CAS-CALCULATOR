import { demand, type ExecutionContext } from './execution';
import type { FormalPrimitive } from './formal-primitive';
import { fromRationalPrimitiveInput } from './exponential-sum-bridge';
import type { ExponentialRationalDomain } from './exponential-rational-domain';
import { exponentialLogTerm, exponentialPrimitive, verifyExponentialLogTerm, type ExponentialPrimitive } from './exponential-rational-primitive';

export function embedRationalPrimitive(ctx: ExecutionContext, d: ExponentialRationalDomain, source: FormalPrimitive): ExponentialPrimitive {
  source.owner.assert(ctx, source);
  ctx.allocate(source.terms.length);
  const part = d.field.embed(ctx, fromRationalPrimitiveInput(ctx, d.base, source.owner, source.rationalPart));
  const terms = source.terms.map(term => {
    const q = d.z.make(ctx, term.modulus.coefficients), w = d.z.make(ctx, term.weight.coefficients);
    const coefficients = source.owner.liftArgument(ctx, term.argument).coefficients;
    ctx.allocate(coefficients.length);
    return exponentialLogTerm(ctx, d, q, w, d.fz.make(ctx, coefficients.map(c =>
      d.field.embed(ctx, fromRationalPrimitiveInput(ctx, d.base, source.owner, c)))));
  });
  const result = exponentialPrimitive(ctx, d, part, terms); verifyRationalPrimitiveEmbedding(ctx, d, source, result); return result;
}
export function verifyRationalPrimitiveEmbedding(ctx: ExecutionContext, d: ExponentialRationalDomain,
  source: FormalPrimitive, target: ExponentialPrimitive): void {
  source.owner.assert(ctx, source); demand(target.domain === d && target.terms.length === source.terms.length,
    'verification-failed', 'rational embedding coverage');
  const convert = (v: FormalPrimitive['rationalPart']) => d.field.embed(ctx, fromRationalPrimitiveInput(ctx, d.base, source.owner, v));
  demand(d.field.equal(ctx, target.fieldPart, convert(source.rationalPart)), 'verification-failed', 'rational embedding field part');
  for (let i = 0; i < source.terms.length; i++) {
    ctx.tick(); const a = source.terms[i], b = target.terms[i]; source.owner.verifyTerm(ctx, a); verifyExponentialLogTerm(ctx, d, b);
    demand(d.z.equal(ctx, b.modulus, d.z.make(ctx, a.modulus.coefficients)) && d.z.equal(ctx, b.weight, d.z.make(ctx, a.weight.coefficients)),
      'verification-failed', 'rational embedding root binding');
    const coefficients = source.owner.liftArgument(ctx, a.argument).coefficients; ctx.allocate(coefficients.length);
    demand(d.fz.equal(ctx, b.argument, d.fz.make(ctx, coefficients.map(convert))), 'verification-failed', 'rational embedding argument');
    demand(d.field.equal(ctx, b.norm, convert(source.owner.fractions.make(ctx, a.norm, source.owner.x.one(ctx)))),
      'verification-failed', 'rational embedding norm condition');
  }
  // Native denominator and every original norm survive this checked conversion.
  demand(source.owner.x.equal(ctx, source.conditions.rationalDenominator, source.rationalPart.denominator)
    && source.conditions.logNorms.length === source.terms.length, 'verification-failed', 'rational embedding conditions');
  for (let i = 0; i < source.terms.length; i++) demand(source.owner.x.equal(ctx, source.conditions.logNorms[i], source.terms[i].norm),
    'verification-failed', 'rational embedding norm coverage');
}
