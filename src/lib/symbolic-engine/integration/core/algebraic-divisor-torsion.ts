import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { integerGcd } from './rational';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { assertAlgebraicDivisor, verifyAlgebraicDivisorWithin, scaleAlgebraicDivisorWithin, type AlgebraicDivisor } from './algebraic-divisor';
import {decideAlgebraicRrPrincipalityWithin,verifyAlgebraicRrPrincipalityWithin,type AlgebraicRrPrincipality} from './algebraic-rr-principality';
import { findAlgebraicGoodReductionWithin, verifyAlgebraicGoodReductionWithin, type AlgebraicGoodReduction } from './algebraic-good-reduction';
import { specializeAlgebraicDivisorWithin, verifyAlgebraicDivisorSpecialization, type AlgebraicDivisorSpecialization } from './algebraic-divisor-specialization';
import { decideReducedDivisorOrder, verifyReducedDivisorOrder, type ReducedDivisorOrder } from './reduced-divisor-order';
import type { ReductionConstant } from './algebraic-number-reduction';
import {verifyGoodReductionClaim} from './algebraic-reduction-errors';
import {recordRationalGcdEvidence,replayRationalGcdEvidence,type RationalGcdEvidence} from './rational-gcd-evidence';
export const algebraicDivisorTorsionRule='algebraic-divisor-two-reduction-v1' as const;
export interface AlgebraicReducedOrder<E>{readonly reduction:AlgebraicGoodReduction<E>;readonly specialization:AlgebraicDivisorSpecialization<E>;readonly order:ReducedDivisorOrder<ReductionConstant>}
export type AlgebraicDivisorTorsion<E>=Readonly<{rule:typeof algebraicDivisorTorsionRule;divisor:AlgebraicDivisor<E>;arithmetic?:RationalGcdEvidence}> & (
  Readonly<{kind:'non-torsion';reason:'nonzero-degree'}>|Readonly<{kind:'torsion';reason:'zero-divisor';order:1n;principal:AlgebraicRrPrincipality<E>}>|
  Readonly<{kind:'torsion'|'non-torsion';reason:'two-reduction';reductions:readonly[AlgebraicReducedOrder<E>,AlgebraicReducedOrder<E>];gcd:bigint;multiple:bigint;principal:AlgebraicRrPrincipality<E>;order:bigint|null}>);
function reducedOrder<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,divisor:AlgebraicDivisor<E>,excluded:bigint|null,bounds:DifferentialBounds):AlgebraicReducedOrder<E>{let specialization:AlgebraicDivisorSpecialization<E>|null=null;
  const reduction=findAlgebraicGoodReductionWithin(ctx,curve,bounds,excluded,proof=>{specialization=specializeAlgebraicDivisorWithin(ctx,proof,divisor);});
  demand(specialization!==null,'verification-failed','complete good divisor specialization');const bound=specialization as AlgebraicDivisorSpecialization<E>,order=decideReducedDivisorOrder(ctx,reduction.curve,bound.divisor);return Object.freeze({reduction,specialization:bound,order});}
export function decideAlgebraicDivisorTorsionWithin<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,divisor:AlgebraicDivisor<E>,bounds:DifferentialBounds):AlgebraicDivisorTorsion<E>{assertAlgebraicDivisor(ctx,curve,divisor);let result:AlgebraicDivisorTorsion<E>;
  if(divisor.degree!==0n)result=Object.freeze({rule:algebraicDivisorTorsionRule,divisor,kind:'non-torsion',reason:'nonzero-degree'});
  else if(!divisor.entries.length){const principal=decideAlgebraicRrPrincipalityWithin(ctx,curve,divisor,bounds);result=Object.freeze({rule:algebraicDivisorTorsionRule,divisor,kind:'torsion',reason:'zero-divisor',order:1n,principal});}
  else{const first=reducedOrder(ctx,curve,divisor,null,bounds),second=reducedOrder(ctx,curve,divisor,first.reduction.number.prime.characteristic,bounds),gcd=integerGcd(ctx,first.order.order,second.order.order),multiple=ctx.multiply(ctx.quotient(first.order.order,gcd),second.order.order),target=scaleAlgebraicDivisorWithin(ctx,curve,divisor,multiple),principal=decideAlgebraicRrPrincipalityWithin(ctx,curve,target,bounds),kind=principal.kind==='principal'?'torsion':'non-torsion';
    result=Object.freeze({rule:algebraicDivisorTorsionRule,divisor,kind,reason:'two-reduction',reductions:Object.freeze([first,second] as const),gcd,multiple,principal,order:kind==='torsion'?multiple:null});}
  verifyAlgebraicDivisorTorsionWithin(ctx,curve,divisor,result,bounds);return result;}
export function verifyAlgebraicDivisorTorsionWithin<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,divisor:AlgebraicDivisor<E>,decision:AlgebraicDivisorTorsion<E>,bounds:DifferentialBounds):void{
  assertAlgebraicDivisor(ctx,curve,divisor);verifyAlgebraicDivisorWithin(ctx,curve,divisor.input,divisor);demand(decision.rule===algebraicDivisorTorsionRule&&decision.divisor===divisor,'verification-failed','torsion complete expected request/rule');
  if(decision.kind==='non-torsion'&&decision.reason==='nonzero-degree'){demand(divisor.degree!==0n,'verification-failed','torsion degree obstruction');return;}
  demand(divisor.degree===0n,'verification-failed','torsion degree-zero request');if(decision.reason==='zero-divisor'){demand(decision.kind==='torsion'&&decision.order===1n&&!divisor.entries.length,'verification-failed','zero divisor least order');verifyAlgebraicRrPrincipalityWithin(ctx,curve,divisor,decision.principal,bounds);demand(decision.principal.kind==='principal','verification-failed','zero principal witness');return;}
  demand(decision.reason==='two-reduction'&&decision.reductions.length===2,'verification-failed','torsion two reduction coverage');const [a,b]=decision.reductions;demand(a.reduction.number.prime.characteristic!==b.reduction.number.prime.characteristic,'verification-failed','different residue characteristics');
  for(const p of [a,b]){verifyAlgebraicGoodReductionWithin(ctx,curve,p.reduction,bounds);verifyAlgebraicDivisorSpecialization(ctx,p.reduction,divisor,p.specialization);verifyReducedDivisorOrder(ctx,p.reduction.curve,p.specialization.divisor,p.order);}
  const gcd=integerGcd(ctx,a.order.order,b.order.order),multiple=ctx.multiply(ctx.quotient(a.order.order,gcd),b.order.order);demand(decision.gcd===gcd&&decision.multiple===multiple&&multiple>0n,'verification-failed','exact two-reduction LCM');
  verifyAlgebraicDivisorWithin(ctx,curve,divisor.entries.map(e=>({place:e.place,coefficient:ctx.multiply(e.coefficient,multiple)})),decision.principal.divisor);verifyAlgebraicRrPrincipalityWithin(ctx,curve,decision.principal.divisor,decision.principal,bounds);
  demand((decision.kind==='torsion'&&decision.order===multiple&&decision.principal.kind==='principal')||(decision.kind==='non-torsion'&&decision.order===null&&decision.principal.kind==='not-principal'),'verification-failed','complete characteristic-zero torsion conclusion');
  // If an order N exists, specialization injects its prime-to-p part. The
  // reduced order divides N and contains the entire prime-to-p part. Two
  // different characteristics jointly retain every prime power of N, so
  // lcm(m1,m2)=N. Thus failure of principality of this multiple proves nontorsion.
}
export function decideAlgebraicDivisorTorsion<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,divisor:AlgebraicDivisor<E>,bounds:DifferentialBounds){return ctx.operation(()=>{const recorded=recordRationalGcdEvidence(ctx,()=>{verifyAlgebraicCurveWithin(ctx,curve.owner,curve,bounds);return decideAlgebraicDivisorTorsionWithin(ctx,curve,divisor,bounds);});return Object.freeze({...recorded.value,arithmetic:recorded.evidence});});}
export function verifyAlgebraicDivisorTorsion<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,divisor:AlgebraicDivisor<E>,decision:AlgebraicDivisorTorsion<E>,bounds:DifferentialBounds):void{ctx.operation(()=>verifyGoodReductionClaim(()=>{demand(decision.arithmetic!==undefined,'verification-failed','complete native arithmetic coverage');replayRationalGcdEvidence(ctx,decision.arithmetic,()=>{verifyAlgebraicCurveWithin(ctx,curve.owner,curve,bounds);verifyAlgebraicDivisorTorsionWithin(ctx,curve,divisor,decision,bounds);});}));}
