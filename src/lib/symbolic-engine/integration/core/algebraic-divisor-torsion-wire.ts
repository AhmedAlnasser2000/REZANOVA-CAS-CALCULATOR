import {demand,type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {verifyAlgebraicCurveWithin,type AlgebraicCurveView} from './algebraic-curve';
import {verifyAlgebraicDivisorWithin,type AlgebraicDivisor} from './algebraic-divisor';
import {PositiveWireContext} from './positive-wire';
import {algebraicGoodReductionCodec} from './algebraic-good-reduction-wire';
import {algebraicPlaceCodec,bindExpectedAlgebraicPlace} from './algebraic-place-wire';
import {algebraicDivisorCodec} from './algebraic-divisor-wire';
import {encodeAlgebraicArithmeticArtifact,decodeAlgebraicArithmeticArtifact} from './algebraic-arithmetic-wire';
import {reducedIdealCodec,reducedIdealPowerCodec,reducedIdealProductCodec} from './reduced-ideal-wire';
import {reducedPlaceDecompositionCodec,reducedValuationCodec} from './reduced-place-wire';
import {reducedDivisorCodec,reducedDivisorOrderCodec} from './reduced-divisor-wire';
import {verifyAlgebraicPlaceSpecialization,verifyAlgebraicDivisorSpecialization,type AlgebraicPlaceSpecialization,type AlgebraicDivisorSpecialization} from './algebraic-divisor-specialization';
import {algebraicDivisorTorsionRule,verifyAlgebraicDivisorTorsionWithin,type AlgebraicDivisorTorsion,type AlgebraicReducedOrder} from './algebraic-divisor-torsion';
import type {AlgebraicGoodReduction} from './algebraic-good-reduction';
import type {AlgebraicPlace} from './algebraic-place';
import {currentRationalGcdEvidence} from './rational-gcd-evidence';
import {matrixInverseCodec} from './algebraic-module-wire';
import {algebraicRrPrincipalityCodec} from './algebraic-rr-principality-wire';
import * as w from './decision-wire-algebra';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
function placeSpecializationCodec<E>(s:PositiveWireContext,reduction:AlgebraicGoodReduction<E>,expected:AlgebraicPlace<E>):w.EvidenceCodec<AlgebraicPlaceSpecialization<E>>{const curve=reduction.curve,a=curve.algebra,order=expected.order.infinity?curve.infinity:curve.finite,source=algebraicPlaceCodec(s.shared,reduction.source),parts=w.structure(s.ctx,{ideal:reducedIdealCodec(s,a,curve.finite,curve.infinity),model:w.structure(s.ctx,{indices:w.optional(w.list(s.ctx,w.integer(s.ctx))),correspondence:matrixInverseCodec(s.ctx,s.shared.scalar(expected.ideal.lattice.scalar)),ideal:reducedIdealCodec(s,a,curve.finite,curve.infinity)}),baseFactors:s.factorization(a.constants,order.lattice.field.ring),decompositions:w.list(s.ctx,reducedPlaceDecompositionCodec(s,curve)),valuations:w.list(s.ctx,w.list(s.ctx,reducedValuationCodec(s,curve))),unit:reducedIdealCodec(s,a,curve.finite,curve.infinity),powers:w.list(s.ctx,reducedIdealPowerCodec(s,a,curve.finite,curve.infinity)),products:w.list(s.ctx,reducedIdealProductCodec(s,a,curve.finite,curve.infinity)),divisor:reducedDivisorCodec(s,curve)});
  return {encode:v=>Object.freeze({source:source.encode(v.source),evidence:parts.encode(v)}),decode:v=>{const raw=w.record(s.ctx,v,['source','evidence']),decoded=source.decode(raw.source);bindExpectedAlgebraicPlace(s.shared,reduction.source,expected,decoded);const p=Object.freeze({source:expected,...parts.decode(raw.evidence)});verifyAlgebraicPlaceSpecialization(s.ctx,reduction,expected,p);return p;}};
}
export function algebraicDivisorSpecializationCodec<E>(s:PositiveWireContext,reduction:AlgebraicGoodReduction<E>,expected:AlgebraicDivisor<E>):w.EvidenceCodec<AlgebraicDivisorSpecialization<E>>{
  const native=algebraicDivisorCodec(s.shared,reduction.source),d=reducedDivisorCodec(s,reduction.curve);
  return {encode:v=>Object.freeze({source:native.encode(v.source),places:Object.freeze(v.places.map((p,i)=>placeSpecializationCodec(s,reduction,expected.input[i].place).encode(p))),divisor:d.encode(v.divisor)}),decode:v=>{const raw=w.record(s.ctx,v,['source','places','divisor']),source=native.decode(raw.source);verifyAlgebraicDivisorWithin(s.ctx,reduction.source,expected.input,source);const values=w.array(s.ctx,raw.places);demand(values.length===expected.input.length,'verification-failed','complete ordered specialization artifact coverage');const places=Object.freeze(values.map((p,i)=>placeSpecializationCodec(s,reduction,expected.input[i].place).decode(p))),proof=Object.freeze({source:expected,reduction,places,divisor:d.decode(raw.divisor),arithmetic:currentRationalGcdEvidence(s.ctx)});verifyAlgebraicDivisorSpecialization(s.ctx,reduction,expected,proof);return proof;}};
}
export function algebraicReducedOrderCodec<E>(s:PositiveWireContext,curve:AlgebraicCurveView<E>,expected:AlgebraicDivisor<E>):w.EvidenceCodec<AlgebraicReducedOrder<E>>{
  const reduction=algebraicGoodReductionCodec(s,curve);return {encode:v=>Object.freeze({reduction:reduction.encode(v.reduction),specialization:algebraicDivisorSpecializationCodec(s,v.reduction,expected).encode(v.specialization),order:reducedDivisorOrderCodec(s,v.reduction.curve).encode(v.order)}),decode:v=>{const raw=w.record(s.ctx,v,['reduction','specialization','order']),proof=reduction.decode(raw.reduction),specialization=algebraicDivisorSpecializationCodec(s,proof,expected).decode(raw.specialization),decoded=reducedDivisorOrderCodec(s,proof.curve).decode(raw.order);
    // Exact ordered request equality precedes binding the retained order to
    // the specialization's fresh divisor object. References alone do not bind it.
    const order=decoded;demand(order.divisor===specialization.divisor,'verification-failed','exact shared specialized order request');return Object.freeze({reduction:proof,specialization,order});}};
}
export function algebraicDivisorTorsionCodec<E>(s:PositiveWireContext,curve:AlgebraicCurveView<E>,expected:AlgebraicDivisor<E>):w.EvidenceCodec<AlgebraicDivisorTorsion<E>>{
  const divisor=algebraicDivisorCodec(s.shared,curve),principality=algebraicRrPrincipalityCodec(s.shared,curve),rule=w.literal(s.ctx,algebraicDivisorTorsionRule),common={rule,divisor};
  const degree=w.structure(s.ctx,{...common,kind:w.literal(s.ctx,'non-torsion'),reason:w.literal(s.ctx,'nonzero-degree')}),zero=w.structure(s.ctx,{...common,kind:w.literal(s.ctx,'torsion'),reason:w.literal(s.ctx,'zero-divisor'),order:s.integer(),principal:principality}),two=w.structure(s.ctx,{...common,kind:w.literal(s.ctx,'torsion','non-torsion'),reason:w.literal(s.ctx,'two-reduction'),reductions:w.list(s.ctx,algebraicReducedOrderCodec(s,curve,expected)),gcd:s.integer(),multiple:s.integer(),principal:principality,order:w.optional(s.integer())});
  return {encode:v=>v.reason==='nonzero-degree'?degree.encode(v):v.reason==='zero-divisor'?zero.encode(v):two.encode(v),decode:v=>{demand(v!==null&&typeof v==='object','invalid-input','torsion decision record');const reason=Object.getOwnPropertyDescriptor(v,'reason');demand(reason!==undefined&&'value'in reason,'invalid-input','torsion reason');let proof:AlgebraicDivisorTorsion<E>;
    if(reason.value==='nonzero-degree'){const decoded=degree.decode(v);verifyAlgebraicDivisorWithin(s.ctx,curve,expected.input,decoded.divisor);proof=Object.freeze({...decoded,divisor:expected});}
    else if(reason.value==='zero-divisor'){const decoded=zero.decode(v);demand(decoded.order===1n,'verification-failed','zero torsion order');verifyAlgebraicDivisorWithin(s.ctx,curve,expected.input,decoded.divisor);proof=Object.freeze({...decoded,divisor:expected,order:1n,principal:Object.freeze({...decoded.principal,divisor:expected})});}
    else{const decoded=two.decode(v);verifyAlgebraicDivisorWithin(s.ctx,curve,expected.input,decoded.divisor);demand(decoded.reductions.length===2,'verification-failed','two reduction artifact coverage');proof=Object.freeze({...decoded,divisor:expected,reductions:Object.freeze([decoded.reductions[0],decoded.reductions[1]]as const)});}
    verifyAlgebraicDivisorTorsionWithin(s.ctx,curve,expected,proof,s.bounds);return proof;}};
}
export function encodeAlgebraicDivisorTorsion<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,expected:AlgebraicDivisor<E>,proof:AlgebraicDivisorTorsion<E>,bounds:DifferentialBounds){return ctx.operation(()=>{demand(proof.arithmetic!==undefined,'verification-failed','complete arithmetic prime coverage');return encodeAlgebraicArithmeticArtifact(ctx,curve,proof,'algebraic-divisor-torsion',bounds,proof.arithmetic,()=>{verifyAlgebraicCurveWithin(ctx,curve.owner,curve,bounds);verifyAlgebraicDivisorTorsionWithin(ctx,curve,expected,proof,bounds);},shared=>algebraicDivisorTorsionCodec(new PositiveWireContext(ctx,bounds,shared),curve,expected));});}
export function decodeAlgebraicDivisorTorsion<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,expected:AlgebraicDivisor<E>,data:unknown,bounds:DifferentialBounds){return ctx.operation(()=>verifyGoodReductionClaim(()=>{const decoded=decodeAlgebraicArithmeticArtifact(ctx,curve,data,'algebraic-divisor-torsion',bounds,shared=>algebraicDivisorTorsionCodec(new PositiveWireContext(ctx,bounds,shared),curve,expected));return Object.freeze({...decoded.value,arithmetic:decoded.arithmetic});}));}
