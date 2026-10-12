import { demand } from './execution';
import { PolynomialRing } from './polynomial';
import type { AlgebraicCurveView } from './algebraic-curve';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { auxiliaryAlgebraicCodec, matrixInverseCodec } from './algebraic-module-wire';
import { algebraicCoefficientCodec, algebraicFactorizationCodec } from './algebraic-wire';
import { linearEvidenceCodec } from './linear-wire';
import { reconstructCurveIdeal, equalCurveIdeals, verifyCurveIdealProduct, verifyCurveIdealInverse, type CurveFractionalIdeal, type CurveIdealProduct, type CurveIdealInverse } from './algebraic-fractional-ideal';
import { reconstructAlgebraicPlaceWithin, verifyAlgebraicPlaceDecompositionWithin, type AlgebraicPlace, type AlgebraicPlaceDecomposition } from './algebraic-place';
import { verifyCurveResidueAlgebra, type CurveResidueAlgebra } from './algebraic-residue-algebra';
import { verifyAlgebraicValuationWithin, type AlgebraicValuation } from './algebraic-valuation';
import { verifyCurveIdealPower, type CurveIdealPower } from './algebraic-ideal-power';
import * as w from './decision-wire-algebra';

export function curveIdealCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<CurveFractionalIdeal<E>> {
  const {ctx} = state;
  return state.memo('fractional-ideal', curve, {
    encode(v) { demand(v.curve === curve, 'domain-mismatch', 'ideal codec curve'); return Object.freeze({infinity: v.order.infinity, lattice: state.lattice(v.order.lattice.scalar).encode(v.lattice)}); },
    decode(v) { const raw = w.record(ctx, v, ['infinity', 'lattice']), infinity = w.literal(ctx, true, false).decode(raw.infinity);
      const scalar = (infinity ? curve.infinity : curve.finite).lattice.scalar, lattice = state.lattice(scalar).decode(raw.lattice);
      return reconstructCurveIdeal(ctx, curve, infinity, lattice.input, lattice); },
  });
}
export function curveIdealProductCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<CurveIdealProduct<E>> {
  const ideal = curveIdealCodec(state, curve), parts = w.structure(state.ctx, {left: ideal, right: ideal, result: ideal});
  return state.memo('ideal-product', curve, {encode: parts.encode, decode(v) { const proof = parts.decode(v); verifyCurveIdealProduct(state.ctx, curve, proof.left, proof.right, proof); return proof; }});
}
export function curveIdealInverseCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<CurveIdealInverse<E>> {
  const {ctx} = state, ideal = curveIdealCodec(state, curve), product = curveIdealProductCodec(state, curve);
  return state.memo('ideal-inverse', curve, {
    encode(v) { return Object.freeze({input: ideal.encode(v.input), preimage: state.preimage(v.input.order.lattice.scalar).encode(v.preimage), result: ideal.encode(v.result), product: product.encode(v.product)}); },
    decode(v) { const raw = w.record(ctx, v, ['input', 'preimage', 'result', 'product']), input = ideal.decode(raw.input);
      const proof = Object.freeze({input, preimage: state.preimage(input.order.lattice.scalar).decode(raw.preimage), result: ideal.decode(raw.result), product: product.decode(raw.product)});
      verifyCurveIdealInverse(ctx, curve, input, proof); return proof; },
  });
}
export function curveIdealPowerCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<CurveIdealPower<E>> {
  const {ctx} = state, ideal = curveIdealCodec(state, curve), product = curveIdealProductCodec(state, curve);
  const parts = w.structure(ctx, {input: ideal, exponent: state.integer(), inverse: w.optional(curveIdealInverseCodec(state, curve)), unit: ideal,
    steps: w.list(ctx, w.structure(ctx, {multiply: w.optional(product), square: w.optional(product)})), result: ideal});
  return state.memo('ideal-power', curve, {encode: parts.encode, decode(v) { const proof = parts.decode(v); verifyCurveIdealPower(ctx, curve, proof.input, proof.exponent, proof); return proof; }});
}
function residueCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>, infinity: boolean): w.EvidenceCodec<CurveResidueAlgebra> {
  const {ctx, bounds} = state, order = infinity ? curve.infinity : curve.finite;
  const auxiliary = state.memo('base-residue-owner', order, auxiliaryAlgebraicCodec(ctx, curve.coordinates.constantOwner, bounds));
  return state.memo('residue-algebra', order, {
    encode(v) {
      const scalar = algebraicCoefficientCodec(ctx, v.base, bounds), matrix = w.list(ctx, w.list(ctx, scalar));
      const parts = w.structure(ctx, {multiplication: w.list(ctx, matrix), seed: state.integer(), primitive: w.list(ctx, scalar), powers: matrix,
        inverse: matrixInverseCodec(ctx, scalar), relation: w.polynomial(ctx, v.relation.ring, scalar), factorization: algebraicFactorizationCodec(ctx, v.relation.ring, bounds)});
      return Object.freeze({base: auxiliary.encode(v.base), evidence: parts.encode(v)});
    },
    decode(v) {
      const raw = w.record(ctx, v, ['base', 'evidence']), base = auxiliary.decode(raw.base), scalar = algebraicCoefficientCodec(ctx, base, bounds), matrix = w.list(ctx, w.list(ctx, scalar));
      const ring = new PolynomialRing(base, 'tau'), parts = w.structure(ctx, {multiplication: w.list(ctx, matrix), seed: state.integer(), primitive: w.list(ctx, scalar), powers: matrix,
        inverse: matrixInverseCodec(ctx, scalar), relation: w.polynomial(ctx, ring, scalar), factorization: algebraicFactorizationCodec(ctx, ring, bounds)}).decode(raw.evidence);
      const proof = Object.freeze({base, ...parts});
      verifyCurveResidueAlgebra(ctx, order, order.lattice.scalar.ring.make(ctx, base.modulus.coefficients), proof, bounds); return proof;
    },
  });
}
export function algebraicPlaceCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicPlace<E>> {
  const {ctx, bounds} = state, ideal = curveIdealCodec(state, curve);
  return state.memo('algebraic-place', curve, {
    encode(v) {
      const p = w.polynomial(ctx, v.order.lattice.scalar.ring, state.coefficient(v.order.lattice.scalar));
      const parts = w.structure(ctx, {prime: p, index: w.integer(ctx), kernel: linearEvidenceCodec(ctx, algebraicCoefficientCodec(ctx, v.algebra.base, bounds)), ideal,
        ramification: state.integer(), residueDegree: state.integer(), degree: state.integer()});
      return Object.freeze({infinity: v.order.infinity, algebra: residueCodec(state, curve, v.order.infinity).encode(v.algebra),
        residue: auxiliaryAlgebraicCodec(ctx, v.algebra.base, bounds).encode(v.residue), evidence: parts.encode(v)});
    },
    decode(v) {
      const raw = w.record(ctx, v, ['infinity', 'algebra', 'residue', 'evidence']), infinity = w.literal(ctx, true, false).decode(raw.infinity);
      const order = infinity ? curve.infinity : curve.finite, algebra = residueCodec(state, curve, infinity).decode(raw.algebra);
      const residue = auxiliaryAlgebraicCodec(ctx, algebra.base, bounds).decode(raw.residue), p = w.polynomial(ctx, order.lattice.scalar.ring, state.coefficient(order.lattice.scalar));
      const proof = w.structure(ctx, {prime: p, index: w.integer(ctx), kernel: linearEvidenceCodec(ctx, algebraicCoefficientCodec(ctx, algebra.base, bounds)), ideal,
        ramification: state.integer(), residueDegree: state.integer(), degree: state.integer()}).decode(raw.evidence);
      return reconstructAlgebraicPlaceWithin(ctx, curve, order, proof.prime, algebra, proof.index, {...proof, residue}, bounds);
    },
  });
}
export function algebraicPlaceDecompositionCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicPlaceDecomposition<E>> {
  const {ctx, bounds} = state, place = algebraicPlaceCodec(state, curve), ideal = curveIdealCodec(state, curve), product = curveIdealProductCodec(state, curve);
  const parts = (infinity: boolean) => { const scalar = (infinity ? curve.infinity : curve.finite).lattice.scalar;
    return w.structure(ctx, {infinity: w.literal<boolean>(ctx, infinity), input: w.polynomial(ctx, scalar.ring, state.coefficient(scalar)), normalization: state.coefficient(scalar),
      prime: w.polynomial(ctx, scalar.ring, state.coefficient(scalar)), algebra: residueCodec(state, curve, infinity), places: w.list(ctx, place), unit: ideal, products: w.list(ctx, product), principal: ideal}); };
  return state.memo('place-decomposition', curve, {
    encode(v) { return parts(v.infinity).encode(v); },
    decode(v) { const raw = w.record(ctx, v, ['infinity', 'input', 'normalization', 'prime', 'algebra', 'places', 'unit', 'products', 'principal']);
      const infinity = w.literal(ctx, true, false).decode(raw.infinity), proof = Object.freeze({...parts(infinity).decode(v), curve});
      verifyAlgebraicPlaceDecompositionWithin(ctx, curve, proof.input, infinity, proof, bounds); return proof; },
  });
}
export function algebraicValuationCodec<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>): w.EvidenceCodec<AlgebraicValuation<E>> {
  const {ctx, bounds} = state, place = algebraicPlaceCodec(state, curve), native = algebraicCoefficientCodec(ctx, curve.owner, bounds);
  const parts = (at: AlgebraicPlace<E>) => { const scalar = at.order.lattice.scalar, p = w.polynomial(ctx, scalar.ring, state.coefficient(scalar));
    const order = w.structure(ctx, {input: p, prime: p, quotients: w.list(ctx, p), final: p, coprime: w.bezout(ctx, p)});
    return w.structure(ctx, {input: native, coordinates: w.list(ctx, state.scalar(scalar)), denominators: state.denominators(scalar), integral: w.list(ctx, state.scalar(scalar)),
      norm: matrixInverseCodec(ctx, state.scalar(scalar)), normOrder: order, denominatorOrder: order, unit: curveIdealCodec(state, curve),
      powers: w.list(ctx, curveIdealProductCodec(state, curve)), integralOrder: state.integer(), value: state.integer()}); };
  return state.memo('valuation', curve, {
    encode(v) { return Object.freeze({place: place.encode(v.place), evidence: parts(v.place).encode(v)}); },
    decode(v) { const raw = w.record(ctx, v, ['place', 'evidence']), at = place.decode(raw.place), proof = Object.freeze({place: at, ...parts(at).decode(raw.evidence)});
      verifyAlgebraicValuationWithin(ctx, curve, at, proof.input, proof); return proof; },
  });
}
/** An explicitly expected residue construction is bound through its complete
 * quotient presentation and maps. Ideal equality alone would lose digit names. */
export function bindExpectedAlgebraicPlace<E>(state: AlgebraicDivisorWireContext, curve: AlgebraicCurveView<E>, expected: AlgebraicPlace<E>, decoded: AlgebraicPlace<E>): void {
  const {ctx} = state, a = expected.algebra, b = decoded.algebra, c = curve.coordinates.constantOwner;
  demand(expected.order === decoded.order && expected.index === decoded.index && a.seed === b.seed && equalCurveIdeals(ctx, curve, expected.ideal, decoded.ideal)
    && a.base.ring.equal(ctx, a.base.modulus, a.base.ring.make(ctx, b.base.modulus.coefficients)), 'domain-mismatch', 'expected complete place construction');
  const convert = (v: import('./algebraic-residue-algebra').CurveBaseResidue) => { b.base.assert(ctx, v); return a.base.make(ctx, a.base.ring.make(ctx, v.representative.coefficients)); };
  const vectors = (x: readonly import('./algebraic-residue-algebra').CurveBaseResidue[], y: readonly import('./algebraic-residue-algebra').CurveBaseResidue[]) =>
    x.length === y.length && x.every((v, i) => a.base.equal(ctx, v, convert(y[i])));
  demand(vectors(a.primitive, b.primitive) && a.powers.length === b.powers.length && a.powers.every((row, i) => vectors(row, b.powers[i]))
    && a.multiplication.length === b.multiplication.length && a.multiplication.every((matrix, i) => matrix.length === b.multiplication[i].length && matrix.every((row, j) => vectors(row, b.multiplication[i][j])))
    && a.relation.ring.equal(ctx, a.relation, a.relation.ring.make(ctx, b.relation.coefficients.map(convert)))
    && expected.residue.ring.equal(ctx, expected.residue.modulus, expected.residue.ring.make(ctx, decoded.residue.modulus.coefficients.map(convert))),
    'domain-mismatch', 'expected place residue correspondence');
  c.assert(ctx, a.base.modulus.coefficients[0]);
}
