import {demand,type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {algebraicPrincipalityRule} from './algebraic-principality';
import {assertAlgebraicDivisor,verifyAlgebraicDivisorWithin,scaleAlgebraicDivisorWithin,type AlgebraicDivisor} from './algebraic-divisor';
import {solveAlgebraicRiemannRochWithin,verifyAlgebraicRiemannRochWithin,type AlgebraicRiemannRoch} from './algebraic-riemann-roch';
/** Composition evidence used only by the new torsion artifact. Existing Gate A
 * principality entry points and version-1 formats remain unchanged. */
export type AlgebraicRrPrincipality<E>=Readonly<{rule:typeof algebraicPrincipalityRule;divisor:AlgebraicDivisor<E>;negative:AlgebraicDivisor<E>;space:AlgebraicRiemannRoch<E>}> & (Readonly<{kind:'not-principal';reason:'zero-space'}>|Readonly<{kind:'principal';equality:'complete-space-degree-zero';witness:E}>);
export function decideAlgebraicRrPrincipalityWithin<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,divisor:AlgebraicDivisor<E>,bounds:DifferentialBounds):AlgebraicRrPrincipality<E>{assertAlgebraicDivisor(ctx,curve,divisor);demand(divisor.degree===0n,'invalid-input','degree-zero RR principality request');const negative=scaleAlgebraicDivisorWithin(ctx,curve,divisor,-1n),space=solveAlgebraicRiemannRochWithin(ctx,curve,negative,bounds),common={rule:algebraicPrincipalityRule,divisor,negative,space},proof:AlgebraicRrPrincipality<E>=space.dimension?Object.freeze({...common,kind:'principal',equality:'complete-space-degree-zero' as const,witness:space.basis[0]}):Object.freeze({...common,kind:'not-principal',reason:'zero-space'});verifyAlgebraicRrPrincipalityWithin(ctx,curve,divisor,proof,bounds);return proof;}
export function verifyAlgebraicRrPrincipalityWithin<E>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,divisor:AlgebraicDivisor<E>,proof:AlgebraicRrPrincipality<E>,bounds:DifferentialBounds):void{
 assertAlgebraicDivisor(ctx,curve,divisor);verifyAlgebraicDivisorWithin(ctx,curve,divisor.input,divisor);demand(proof.rule===algebraicPrincipalityRule&&proof.divisor===divisor&&divisor.degree===0n,'verification-failed','complete RR principality request/rule');verifyAlgebraicDivisorWithin(ctx,curve,divisor.entries.map(e=>({place:e.place,coefficient:-e.coefficient})),proof.negative);verifyAlgebraicRiemannRochWithin(ctx,curve,proof.negative,proof.space,bounds);
 if(proof.kind==='not-principal')demand(proof.reason==='zero-space'&&proof.space.dimension===0,'verification-failed','complete RR nonprincipality');else demand(proof.kind==='principal'&&proof.equality==='complete-space-degree-zero'&&proof.space.dimension>0&&curve.owner.equal(ctx,proof.witness,proof.space.basis[0])&&!curve.owner.isZero(ctx,proof.witness),'verification-failed','complete RR principal representative');
 // The full finite ideal and localized infinity lattice prove div(f)-D>=0
 // at EVERY place, including places outside the requested support. Proper
 // function-field geometry gives deg(div(f))=0. Since deg(D)=0, this entire
 // effective difference has degree zero and is zero. Thus div(f)=D, with
 // complete support coverage. No explicit valuation search is needed.
}
