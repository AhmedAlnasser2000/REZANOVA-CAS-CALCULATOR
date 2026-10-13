import {demand,type ExecutionContext} from './execution';
import type {ReducedCurveView,ReducedCurveValue} from './reduced-curve';
import {invertReducedIdeal,verifyReducedIdealInverse,multiplyReducedIdeals,verifyReducedIdealProduct,reducedIdealPowerBasis,type ReducedIdeal,type ReducedIdealInverse,type ReducedIdealProduct} from './reduced-ideal';
import {positiveLattice,verifyPositiveLattice,type PositiveLattice} from './positive-lattice';
import {solvePositiveHessSpace,verifyPositiveHessSpace,type PositiveHessSpace} from './positive-hess';
export interface ReducedClassIdealPair<E>{readonly finite:ReducedIdeal<E>;readonly infinity:ReducedIdeal<E>;readonly degree:bigint}
export interface ReducedClassEquality<E>{readonly kind:'equivalent'|'distinct';readonly finiteInverse:ReducedIdealInverse<E>;readonly infinityInverse:ReducedIdealInverse<E>;readonly finiteProduct:ReducedIdealProduct<E>;readonly infinityProduct:ReducedIdealProduct<E>;readonly finite:PositiveLattice<E>;readonly infinity:PositiveLattice<E>;readonly space:PositiveHessSpace<E>;readonly witness:ReducedCurveValue<E>|null}
/** Complete L(-(E_left-E_right)) on the bounded effective ideal pairs. This
 * avoids expanding their original divisor multiples or factoring functions. */
export function decideReducedClassEquality<E>(ctx:ExecutionContext,curve:ReducedCurveView<E>,left:ReducedClassIdealPair<E>,right:ReducedClassIdealPair<E>):ReducedClassEquality<E>{
 demand(left.degree===right.degree,'invalid-input','degree-zero class comparison');const a=curve.algebra,finiteInverse=invertReducedIdeal(ctx,a,right.finite),infinityInverse=invertReducedIdeal(ctx,a,right.infinity),finiteProduct=multiplyReducedIdeals(ctx,a,left.finite,finiteInverse.result),infinityProduct=multiplyReducedIdeals(ctx,a,left.infinity,infinityInverse.result),finite=positiveLattice(ctx,curve.finite.lattice.field,reducedIdealPowerBasis(ctx,finiteProduct.result),a.dimension),infinity=positiveLattice(ctx,curve.infinity.lattice.field,reducedIdealPowerBasis(ctx,infinityProduct.result),a.dimension),space=solvePositiveHessSpace(ctx,finite,infinity),witness=space.basis.length?a.make(ctx,space.basis[0]):null,proof=Object.freeze({kind:witness===null?'distinct' as const:'equivalent' as const,finiteInverse,infinityInverse,finiteProduct,infinityProduct,finite,infinity,space,witness});
 verifyReducedClassEquality(ctx,curve,left,right,proof);return proof;
}
export function verifyReducedClassEquality<E>(ctx:ExecutionContext,curve:ReducedCurveView<E>,left:ReducedClassIdealPair<E>,right:ReducedClassIdealPair<E>,proof:ReducedClassEquality<E>):void{
 const a=curve.algebra;demand(left.degree===right.degree,'verification-failed','class comparison degree coverage');verifyReducedIdealInverse(ctx,a,right.finite,proof.finiteInverse);verifyReducedIdealInverse(ctx,a,right.infinity,proof.infinityInverse);verifyReducedIdealProduct(ctx,a,left.finite,proof.finiteInverse.result,proof.finiteProduct);verifyReducedIdealProduct(ctx,a,left.infinity,proof.infinityInverse.result,proof.infinityProduct);
 verifyPositiveLattice(ctx,curve.finite.lattice.field,reducedIdealPowerBasis(ctx,proof.finiteProduct.result),a.dimension,proof.finite);verifyPositiveLattice(ctx,curve.infinity.lattice.field,reducedIdealPowerBasis(ctx,proof.infinityProduct.result),a.dimension,proof.infinity);verifyPositiveHessSpace(ctx,proof.finite,proof.infinity,proof.space);
 if(proof.kind==='distinct')demand(proof.space.basis.length===0&&proof.witness===null,'verification-failed','complete distinct class zero space');else demand(proof.kind==='equivalent'&&proof.space.basis.length>0&&proof.witness!==null&&curve.field.equal(ctx,proof.witness,a.make(ctx,proof.space.basis[0]))&&!curve.field.isZero(ctx,proof.witness),'verification-failed','exact bounded class equality witness');
 // Equal degrees make the effective difference div(h)-(E_left-E_right)
 // have degree zero. Full Hess membership therefore proves exact equality.
}
