import {demand,type ExecutionContext} from './execution';
import type {AlgebraicPlace} from './algebraic-place';
import {curveLatticeCoordinates} from './algebraic-curve-lattice';
import type {CurveScalar} from './algebraic-curve-coordinates';
import type {AlgebraicGoodReduction} from './algebraic-good-reduction';
import {reduceCurveScalar} from './algebraic-good-reduction';
import type {ReductionConstant} from './algebraic-number-reduction';
import {constructReducedIdeal,reconstructReducedIdeal,equalReducedIdeals,type ReducedIdeal} from './reduced-ideal';
import {freezeExactMatrix,invertArithmeticMatrix,verifyArithmeticMatrixInverse,type MatrixInverse} from './arithmetic-matrix';
import {RejectedAlgebraicReduction,requireGoodReduction} from './algebraic-reduction-errors';
export interface AlgebraicPlaceIntegralModel{readonly indices:readonly number[]|null;readonly correspondence:MatrixInverse<CurveScalar>;readonly ideal:ReducedIdeal<ReductionConstant>}
function selected<E>(ctx:ExecutionContext,place:AlgebraicPlace<E>,indices:readonly number[]|null){if(indices===null)return place.ideal.lattice.basis;const n=place.ideal.lattice.dimension;demand(indices.length===n&&indices.every((i,k)=>Number.isSafeInteger(i)&&i>=0&&i<place.ideal.lattice.input.length&&(k===0||i>indices[k-1])),'verification-failed','complete source integral basis indices');ctx.allocate(n*n+n);return indices.map(i=>place.ideal.lattice.input[i]);}
function polynomial(ctx:ExecutionContext,matrix:readonly(readonly CurveScalar[])[]){return matrix.every(row=>row.every(v=>v.field.ring.degree(ctx,v.denominator)===0));}
function mapped<E>(ctx:ExecutionContext,reduction:AlgebraicGoodReduction<E>,place:AlgebraicPlace<E>,rows:readonly(readonly CurveScalar[])[]){const field=(place.order.infinity?reduction.curve.infinity:reduction.curve.finite).lattice.field;return freezeExactMatrix(ctx,rows.map(row=>row.map(v=>reduceCurveScalar(ctx,reduction.number,field,v))));}
export function constructAlgebraicPlaceIntegralModel<E>(ctx:ExecutionContext,reduction:AlgebraicGoodReduction<E>,place:AlgebraicPlace<E>,expected:ReducedIdeal<ReductionConstant>):AlgebraicPlaceIntegralModel{
 const n=place.ideal.lattice.dimension,tryBasis=(indices:readonly number[]|null)=>{const rows=selected(ctx,place,indices),matrix=freezeExactMatrix(ctx,rows.map(row=>[...curveLatticeCoordinates(ctx,place.ideal.lattice,row)])),correspondence=invertArithmeticMatrix(ctx,place.ideal.lattice.scalar,matrix);if(correspondence===null||!polynomial(ctx,matrix)||!polynomial(ctx,correspondence.inverse))return null;
  try{const ideal=constructReducedIdeal(ctx,reduction.curve.algebra,expected.order,mapped(ctx,reduction,place,rows));if(!equalReducedIdeals(ctx,reduction.curve.algebra,ideal,expected))return null;const proof=Object.freeze({indices:indices===null?null:Object.freeze([...indices]),correspondence,ideal});verifyAlgebraicPlaceIntegralModel(ctx,reduction,place,expected,proof);return proof;}catch(e){if(e instanceof RejectedAlgebraicReduction)return null;throw e;}
 };
 const canonical=tryBasis(null);if(canonical)return canonical;const count=place.ideal.lattice.input.length;ctx.allocate(n);const indices=Array.from({length:n},(_,i)=>i);
 while(n<=count){const result=tryBasis(indices);if(result)return result;let k=n-1;while(k>=0&&indices[k]===count-n+k){ctx.tick();k--;}if(k<0)break;indices[k]++;for(let j=k+1;j<n;j++)indices[j]=indices[j-1]+1;}
 requireGoodReduction(false,'no integral complete source-place basis at this reduction');
}
export function verifyAlgebraicPlaceIntegralModel<E>(ctx:ExecutionContext,reduction:AlgebraicGoodReduction<E>,place:AlgebraicPlace<E>,expected:ReducedIdeal<ReductionConstant>,proof:AlgebraicPlaceIntegralModel):void{
 const rows=selected(ctx,place,proof.indices),matrix=freezeExactMatrix(ctx,rows.map(row=>[...curveLatticeCoordinates(ctx,place.ideal.lattice,row)]));verifyArithmeticMatrixInverse(ctx,place.ideal.lattice.scalar,matrix,proof.correspondence);demand(polynomial(ctx,matrix)&&polynomial(ctx,proof.correspondence.inverse),'verification-failed','complete polynomial integral-model basis correspondence');
 reconstructReducedIdeal(ctx,reduction.curve.algebra,expected.order,mapped(ctx,reduction,place,rows),proof.ideal.lattice);demand(equalReducedIdeals(ctx,reduction.curve.algebra,proof.ideal,expected),'verification-failed','full generic/special source ideal basis correspondence');
 // Exact polynomial transformations in both directions prove the generic
 // place ideal. The integral chosen basis and its complete reduced ideal give
 // the flat model even when a normalized generic basis has a removable p-pole.
}
