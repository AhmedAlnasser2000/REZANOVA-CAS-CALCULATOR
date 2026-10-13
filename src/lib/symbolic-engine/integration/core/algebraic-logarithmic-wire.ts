import { demand } from './execution';
import type { AlgebraicCurveView } from './algebraic-curve';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { PositiveWireContext } from './positive-wire';
import { algebraicCoefficientCodec, algebraicConditionsCodec, algebraicDerivativeCodec } from './algebraic-wire';
import { algebraicDivisorTorsionCodec } from './algebraic-divisor-torsion-wire';
import { algebraicRrPrincipalityCodec } from './algebraic-rr-principality-wire';
import { verifyAlgebraicDivisorWithin } from './algebraic-divisor';
import { verifyAlgebraicRrPrincipalityWithin } from './algebraic-rr-principality';
import { algebraicConstantQuotientCodec, algebraicConstantValueConversionCodec, algebraicPrimitiveCodec, algebraicPrimitiveDerivativeCodec } from './algebraic-primitive-wire';
import { verifyAlgebraicLogarithmicConstructionWithin, type AlgebraicLogarithmicConstruction, type AlgebraicLogarithmicComponent } from './algebraic-logarithmic-construction';
import type { AlgebraicResidueRelations } from './algebraic-residue-relations';
import * as w from './decision-wire-algebra';

export function algebraicLogarithmicConstructionCodec<E>(s: AlgebraicDivisorWireContext, source: AlgebraicCurveView<E>, relations: AlgebraicResidueRelations<E>): w.EvidenceCodec<AlgebraicLogarithmicConstruction<E>> {
  const {ctx, bounds} = s, curve = relations.splitting.curve, constants = relations.splitting.splitting.target, native = algebraicCoefficientCodec(ctx, curve.owner, bounds), original = algebraicCoefficientCodec(ctx, source.owner, bounds), C = algebraicCoefficientCodec(ctx, constants, bounds), positive = new PositiveWireContext(ctx, bounds, s);
  const primitive = algebraicPrimitiveCodec(s, source, constants), quotient = algebraicConstantQuotientCodec(s, source, constants);
  const component = (index: number): w.EvidenceCodec<AlgebraicLogarithmicComponent> => {
    const expected = relations.divisors[index], torsion = algebraicDivisorTorsionCodec(positive, curve, expected), direct = w.structure(ctx, {kind: w.literal(ctx, 'torsion'), reason: w.literal(ctx, 'principal-divisor'), order: s.integer()}),
      common = w.structure(ctx, {index: w.integer(ctx), principalCheck: algebraicRrPrincipalityCodec(s, curve), argument: w.optional(native), weight: w.optional(C), derivative: w.optional(algebraicDerivativeCodec(ctx, curve.owner, bounds)), value: w.optional(native), conditions: algebraicConditionsCodec(ctx, curve.owner, bounds)});
    return {encode(p) { return Object.freeze({common: common.encode(p), torsion: p.torsion.reason === 'principal-divisor' ? direct.encode(p.torsion) : torsion.encode(p.torsion)}); }, decode(v) {
      const raw = w.record(ctx, v, ['common', 'torsion']), c = common.decode(raw.common);
      verifyAlgebraicDivisorWithin(ctx, curve, expected.input, c.principalCheck.divisor); const principalCheck = Object.freeze({...c.principalCheck, divisor: expected}); verifyAlgebraicRrPrincipalityWithin(ctx, curve, expected, principalCheck, bounds);
      demand(raw.torsion !== null && typeof raw.torsion === 'object', 'invalid-input', 'principal multiple discriminator'); const reason = Object.getOwnPropertyDescriptor(raw.torsion, 'reason'); demand(reason !== undefined && 'value' in reason, 'invalid-input', 'principal multiple reason');
      if (reason.value === 'principal-divisor') { const d = direct.decode(raw.torsion); demand(d.order === 1n && principalCheck.kind === 'principal', 'verification-failed', 'direct complete principality least order'); return Object.freeze({...c, principalCheck, torsion: Object.freeze({...d, order: 1n as const, divisor: expected, principal: principalCheck})}); }
      return Object.freeze({...c, principalCheck, torsion: torsion.decode(raw.torsion)});
    }};
  };
  const components: w.EvidenceCodec<readonly AlgebraicLogarithmicComponent[]> = {encode(values) {
    demand(values.length <= relations.basis.length, 'verification-failed', 'logarithm codec complete component bound'); return Object.freeze(values.map((p, i) => component(i).encode(p)));
  }, decode(v) { const values = w.array(ctx, v); demand(values.length <= relations.basis.length, 'verification-failed', 'logarithm codec complete component bound'); return Object.freeze(values.map((p, i) => component(i).decode(p))); }};
  return s.memo('algebraic-logarithmic-construction', relations, {encode(p) {
    const common = {components: components.encode(p.components), activeDerivative: native.encode(p.activeDerivative)};
    if (p.kind === 'non-torsion') return Object.freeze({...common, kind: p.kind, obstruction: p.obstruction, later: p.later});
    return Object.freeze({...common, kind: p.kind, quotient: p.quotient === null ? null : quotient.encode(p.quotient), descent: p.descent === null ? null : algebraicConstantValueConversionCodec(s, p.quotient!).encode(p.descent),
      nativeDerivative: original.encode(p.nativeDerivative), primitive: primitive.encode(p.primitive), derivative: algebraicPrimitiveDerivativeCodec(s, p.primitive).encode(p.derivative)});
  }, decode(v) {
    demand(v !== null && typeof v === 'object', 'invalid-input', 'logarithmic construction discriminator'); const kind = Object.getOwnPropertyDescriptor(v, 'kind'); demand(kind !== undefined && 'value' in kind, 'invalid-input', 'logarithmic construction kind'); let proof: AlgebraicLogarithmicConstruction<E>;
    if (kind.value === 'non-torsion') {
      const raw = w.record(ctx, v, ['kind', 'components', 'activeDerivative', 'obstruction', 'later']); proof = Object.freeze({relations, kind: 'non-torsion', components: components.decode(raw.components), activeDerivative: native.decode(raw.activeDerivative), obstruction: w.integer(ctx).decode(raw.obstruction), later: w.literal(ctx, 'unperformed').decode(raw.later)});
    } else {
      demand(kind.value === 'complete', 'invalid-input', 'logarithmic construction outcome'); const raw = w.record(ctx, v, ['kind', 'components', 'activeDerivative', 'quotient', 'descent', 'nativeDerivative', 'primitive', 'derivative']), q = raw.quotient === null ? null : quotient.decode(raw.quotient);
      demand(q !== null || raw.descent === null, 'invalid-input', 'empty logarithmic descent'); const descent = raw.descent === null ? null : algebraicConstantValueConversionCodec(s, q!).decode(raw.descent), p = primitive.decode(raw.primitive);
      proof = Object.freeze({relations, kind: 'complete', components: components.decode(raw.components), activeDerivative: native.decode(raw.activeDerivative), quotient: q, descent, nativeDerivative: original.decode(raw.nativeDerivative), primitive: p, derivative: algebraicPrimitiveDerivativeCodec(s, p).decode(raw.derivative)});
    }
    verifyAlgebraicLogarithmicConstructionWithin(ctx, source, relations, proof, bounds); return proof;
  }});
}
