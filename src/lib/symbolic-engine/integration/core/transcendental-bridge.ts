import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import type { FormalPrimitive } from './formal-primitive';
import { fromRationalPrimitiveInput } from './exponential-sum-bridge';
import { requireArithmeticDomain, type ArithmeticRationalDomain, type TranscendentalDomain } from './transcendental-domain';
import { verifyFirstLevelLogTerm, type FirstLevelPrimitive } from './first-level-rational-primitive';
import { transcendentalLogTermWithin, transcendentalPrimitiveWithin, type TranscendentalPrimitive } from './transcendental-primitive';
export function embedTranscendentalPrimitiveWithin(ctx: ExecutionContext, d: TranscendentalDomain, source: FirstLevelPrimitive<ArithmeticRationalDomain>, bounds: DifferentialBounds): TranscendentalPrimitive {
  requireArithmeticDomain(ctx, source.domain, bounds); ctx.allocate(source.terms.length);
  const terms = source.terms.map(t => { verifyFirstLevelLogTerm(ctx, source.domain, t); ctx.allocate(t.argument.coefficients.length);
    return transcendentalLogTermWithin(ctx, d, d.z.make(ctx, t.modulus.coefficients), d.z.make(ctx, t.weight.coefficients),
      d.fz.make(ctx, t.argument.coefficients.map(c => d.field.embed(ctx, c)))); });
  const result = transcendentalPrimitiveWithin(ctx, d, d.field.embed(ctx, source.fieldPart), terms);
  verifyTranscendentalPrimitiveEmbedding(ctx, d, source, result, bounds); return result;
}
export function verifyTranscendentalPrimitiveEmbedding(ctx: ExecutionContext, d: TranscendentalDomain, source: FirstLevelPrimitive<ArithmeticRationalDomain>, target: TranscendentalPrimitive, bounds: DifferentialBounds): void {
  requireArithmeticDomain(ctx, source.domain, bounds);
  demand(target.domain === d && target.terms.length === source.terms.length && d.field.equal(ctx, target.fieldPart, d.field.embed(ctx, source.fieldPart)), 'verification-failed', 'parent primitive mapping/coverage');
  for (let i = 0; i < source.terms.length; i++) {
    const a = source.terms[i], b = target.terms[i]; verifyFirstLevelLogTerm(ctx, source.domain, a); verifyFirstLevelLogTerm(ctx, d, b); ctx.allocate(a.argument.coefficients.length);
    demand(d.z.equal(ctx, b.modulus, d.z.make(ctx, a.modulus.coefficients)) && d.z.equal(ctx, b.weight, d.z.make(ctx, a.weight.coefficients))
      && d.fz.equal(ctx, b.argument, d.fz.make(ctx, a.argument.coefficients.map(c => d.field.embed(ctx, c))))
      && d.field.equal(ctx, b.norm, d.field.embed(ctx, a.norm)), 'verification-failed', 'parent root-log exact conversion');
  }
}
function rationalBase(ctx: ExecutionContext, d: TranscendentalDomain) { let v = d.view; while (v.parent) { ctx.tick(); v = v.parent; } return v.owner; }
export function embedTranscendentalRationalPrimitiveWithin(ctx: ExecutionContext, d: TranscendentalDomain, source: FormalPrimitive): TranscendentalPrimitive {
  source.owner.assert(ctx, source); const root = rationalBase(ctx, d), convert = (v: FormalPrimitive['rationalPart']) => d.field.embed(ctx, fromRationalPrimitiveInput(ctx, root, source.owner, v));
  ctx.allocate(source.terms.length); const terms = source.terms.map(t => { source.owner.verifyTerm(ctx, t);
    const cs = source.owner.liftArgument(ctx, t.argument).coefficients; ctx.allocate(cs.length);
    return transcendentalLogTermWithin(ctx, d, d.z.make(ctx, t.modulus.coefficients), d.z.make(ctx, t.weight.coefficients), d.fz.make(ctx, cs.map(convert))); });
  const result = transcendentalPrimitiveWithin(ctx, d, convert(source.rationalPart), terms); verifyTranscendentalRationalEmbedding(ctx, d, source, result); return result;
}
export function verifyTranscendentalRationalEmbedding(ctx: ExecutionContext, d: TranscendentalDomain, source: FormalPrimitive, target: TranscendentalPrimitive): void {
  source.owner.assert(ctx, source); const root = rationalBase(ctx, d), convert = (v: FormalPrimitive['rationalPart']) => d.field.embed(ctx, fromRationalPrimitiveInput(ctx, root, source.owner, v));
  demand(target.domain === d && target.terms.length === source.terms.length && d.field.equal(ctx, target.fieldPart, convert(source.rationalPart)), 'verification-failed', 'rational primitive exact coverage');
  demand(source.conditions.logNorms.length === source.terms.length && source.owner.x.equal(ctx, source.conditions.rationalDenominator, source.rationalPart.denominator), 'verification-failed', 'rational primitive conditions');
  for (let i = 0; i < source.terms.length; i++) {
    const a = source.terms[i], b = target.terms[i]; source.owner.verifyTerm(ctx, a); verifyFirstLevelLogTerm(ctx, d, b);
    const cs = source.owner.liftArgument(ctx, a.argument).coefficients; ctx.allocate(cs.length);
    demand(d.z.equal(ctx, b.modulus, d.z.make(ctx, a.modulus.coefficients)) && d.z.equal(ctx, b.weight, d.z.make(ctx, a.weight.coefficients))
      && d.fz.equal(ctx, b.argument, d.fz.make(ctx, cs.map(convert))) && d.field.equal(ctx, b.norm, convert(source.owner.fractions.make(ctx, a.norm, source.owner.x.one(ctx))))
      && source.owner.x.equal(ctx, source.conditions.logNorms[i], a.norm), 'verification-failed', 'rational root-log conversion/norm coverage');
  }
}
