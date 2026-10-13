import {demand,type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {algebraicCurveGeometryCodec} from './algebraic-geometry-wire';
import {PositiveWireContext} from './positive-wire';
import {PositivePrimeField,type PrimeValue} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {PositiveFractionField} from './positive-fraction';
import {ReducedCurveAlgebra,ReducedCurveField,type ReducedCurveOrder} from './reduced-curve';
import type {ReducedOrderMaximality} from './reduced-normality';
import {reducedIdealCodec} from './reduced-ideal-wire';
import {matrixInverseCodec} from './algebraic-module-wire';
import {verifyAlgebraicGoodReductionWithin,type AlgebraicGoodReduction} from './algebraic-good-reduction';
import {verifyAlgebraicNumberReduction,type AlgebraicNumberReduction,type ReductionConstant} from './algebraic-number-reduction';
import {encodeAlgebraicArithmeticArtifact,decodeAlgebraicArithmeticArtifact} from './algebraic-arithmetic-wire';
import {currentRationalGcdEvidence} from './rational-gcd-evidence';
import * as w from './decision-wire-algebra';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';

export function algebraicNumberReductionCodec(s:PositiveWireContext,source:AlgebraicCurveView<unknown>):w.EvidenceCodec<AlgebraicNumberReduction>{return s.memo('number-reduction',source.coordinates.constantOwner,{encode:v=>Object.freeze({scale:s.integer().encode(v.scale),integral:w.list(s.ctx,s.integer()).encode(v.integral),characteristic:s.integer().encode(v.prime.characteristic),residue:s.extension(v.prime).encode(v.residue),factors:s.factorization(v.prime,v.residue.ring).encode(v.factors),index:w.integer(s.ctx).encode(v.index)}),decode:v=>{
  const raw=w.record(s.ctx,v,['scale','integral','characteristic','residue','factors','index']),prime=new PositivePrimeField(s.ctx,s.integer().decode(raw.characteristic)),residue=s.extension(prime).decode(raw.residue),p=Object.freeze({source:source.coordinates.constantOwner,scale:s.integer().decode(raw.scale),integral:w.list(s.ctx,s.integer()).decode(raw.integral),prime,residue,factors:s.factorization(prime,residue.ring).decode(raw.factors),index:w.integer(s.ctx).decode(raw.index)});verifyAlgebraicNumberReduction(s.ctx,source.coordinates.constantOwner,p);return p;
}});}
function orderCodec<E>(s:PositiveWireContext,a:ReducedCurveAlgebra<E>,field:PositiveFractionField<E>,infinity:boolean):w.EvidenceCodec<ReducedCurveOrder<E>>{const c=s.coefficient(a.constants),p=s.polynomial(field.ring,c),f=s.fraction(field,c),parts=w.structure(s.ctx,{infinity:w.literal(s.ctx,infinity),lattice:s.lattice(field,c),multiplication:w.list(s.ctx,w.list(s.ctx,w.list(s.ctx,p))),traces:w.list(s.ctx,p),gram:w.list(s.ctx,w.list(s.ctx,f)),traceInverse:matrixInverseCodec(s.ctx,f),discriminant:p});return s.memo('reduced-order',field,parts);}
function maximalityCodec<E>(s:PositiveWireContext,a:ReducedCurveAlgebra<E>,finite:ReducedCurveOrder<E>,infinity:ReducedCurveOrder<E>,order:ReducedCurveOrder<E>):w.EvidenceCodec<ReducedOrderMaximality<E>>{
  const c=s.coefficient(a.constants),p=s.polynomial(order.lattice.field.ring,c),ideal=reducedIdealCodec(s,a,finite,infinity),extension=s.extension(a.constants);
  const parts=(residue:import('./positive-extension').PositiveFiniteExtension<E>)=>w.structure(s.ctx,{prime:p,traceKernel:s.linear(s.coefficient(residue)),radical:ideal,idealizer:s.preimage(order.lattice.field,c)});
  const local:w.EvidenceCodec<ReducedOrderMaximality<E>['locals'][number]>={encode:v=>Object.freeze({residue:extension.encode(v.residue),evidence:parts(v.residue).encode(v)}),decode:v=>{const raw=w.record(s.ctx,v,['residue','evidence']),residue=extension.decode(raw.residue);return Object.freeze({residue,...parts(residue).decode(raw.evidence)});}};
  return w.structure(s.ctx,{factors:s.factorization(a.constants,order.lattice.field.ring),locals:w.list(s.ctx,local)});
}
export function algebraicGoodReductionCodec<E>(s:PositiveWireContext,source:AlgebraicCurveView<E>):w.EvidenceCodec<AlgebraicGoodReduction<E>>{
  const number=algebraicNumberReductionCodec(s,source as AlgebraicCurveView<unknown>),geometry=algebraicCurveGeometryCodec(s.shared,source);
  return s.memo('good-reduction',source,{encode:v=>{
    const a=v.curve.algebra,c=s.coefficient(a.constants),f=s.fraction(a.scalar,c),r=s.polynomial(a.relation.ring,f),finite=orderCodec(s,a,v.curve.finite.lattice.field,false),infinity=orderCodec(s,a,v.curve.infinity.lattice.field,true);
    const model=w.structure(s.ctx,{finiteMaximality:maximalityCodec(s,a,v.curve.finite,v.curve.infinity,v.curve.finite),infinityMaximality:maximalityCodec(s,a,v.curve.finite,v.curve.infinity,v.curve.infinity),separability:s.bezout(r),toFinite:w.list(s.ctx,w.list(s.ctx,f)),toInfinity:w.list(s.ctx,w.list(s.ctx,s.fraction(v.curve.infinity.lattice.field,c))),globalFunctions:s.hess(a.scalar,c),genus:s.integer()});
    return Object.freeze({source:algebraicCurveEvidenceCodec(s.shared,source).encode(v.source),geometry:geometry.encode(v.geometry),number:number.encode(v.number),relation:r.encode(a.relation),finite:finite.encode(v.curve.finite),infinity:infinity.encode(v.curve.infinity),model:model.encode(v.model)});
  },decode:v=>{
    const raw=w.record(s.ctx,v,['source','geometry','number','relation','finite','infinity','model']);algebraicCurveEvidenceCodec(s.shared,source).decode(raw.source);const nr=number.decode(raw.number),geom=geometry.decode(raw.geometry),scalar=new PositiveFractionField(new PositivePolynomialRing(nr.residue,source.finite.lattice.scalar.ring.variable)),inf=new PositiveFractionField(new PositivePolynomialRing(nr.residue,source.infinity.lattice.scalar.ring.variable)),c=s.coefficient(nr.residue),f=s.fraction(scalar,c),ring=new PositivePolynomialRing(scalar,source.coordinates.relationRing.variable),r=s.polynomial(ring,f),relation=r.decode(raw.relation),a=new ReducedCurveAlgebra(s.ctx,nr.residue,scalar,relation),finite=orderCodec(s,a,scalar,false).decode(raw.finite),infinity=orderCodec(s,a,inf,true).decode(raw.infinity);
    const parts=w.structure(s.ctx,{finiteMaximality:maximalityCodec(s,a,finite,infinity,finite),infinityMaximality:maximalityCodec(s,a,finite,infinity,infinity),separability:s.bezout(r),toFinite:w.list(s.ctx,w.list(s.ctx,f)),toInfinity:w.list(s.ctx,w.list(s.ctx,s.fraction(inf,c))),globalFunctions:s.hess(scalar,c),genus:s.integer()}).decode(raw.model),model=Object.freeze({finite,infinity,...parts}),field=ReducedCurveField.fromEvidence(s.ctx,a,model),curve=Object.freeze({algebra:a,field,finite,infinity,genus:model.genus}),proof=Object.freeze({source,geometry:geom,number:nr,curve,model});verifyAlgebraicGoodReductionWithin(s.ctx,source,proof,s.bounds);return Object.freeze({...proof,arithmetic:currentRationalGcdEvidence(s.ctx)});
  }});
}
export function encodeAlgebraicGoodReduction<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,proof:AlgebraicGoodReduction<E>,bounds:DifferentialBounds){return ctx.operation(()=>{demand(proof.arithmetic!==undefined,'verification-failed','complete arithmetic prime coverage');return encodeAlgebraicArithmeticArtifact(ctx,source,proof,'algebraic-good-reduction',bounds,proof.arithmetic,()=>verifyAlgebraicGoodReductionWithin(ctx,source,proof,bounds),shared=>algebraicGoodReductionCodec(new PositiveWireContext(ctx,bounds,shared),source));});}
export function decodeAlgebraicGoodReduction<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,data:unknown,bounds:DifferentialBounds){return ctx.operation(()=>verifyGoodReductionClaim(()=>{const decoded=decodeAlgebraicArithmeticArtifact(ctx,source,data,'algebraic-good-reduction',bounds,shared=>algebraicGoodReductionCodec(new PositiveWireContext(ctx,bounds,shared),source));return Object.freeze({...decoded.value,arithmetic:decoded.arithmetic});}));}
export type ReductionPrime=PrimeValue;
export type GoodReductionConstant=ReductionConstant;
