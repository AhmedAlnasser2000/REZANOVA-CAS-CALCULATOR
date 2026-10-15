import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';
import { isFactorPrime } from './factorization-modular';
import { verifyAlgebraicCurveWithin, type AlgebraicCurveView } from './algebraic-curve';
import { certifyAlgebraicCurveGeometryWithin, verifyAlgebraicCurveGeometryWithin, type AlgebraicCurveGeometry } from './algebraic-curve-geometry';
import type { CurveScalar } from './algebraic-curve-coordinates';
import { constructAlgebraicNumberReductions, verifyAlgebraicNumberReduction, reduceAlgebraicConstant, type AlgebraicNumberReduction, type ReductionConstant } from './algebraic-number-reduction';
import { PositivePolynomialRing } from './positive-polynomial';
import { PositiveFractionField, type PositiveFraction } from './positive-fraction';
import { positiveLattice } from './positive-lattice';
import { freezeExactMatrix, transposeExactMatrix, invertArithmeticMatrix, equalExactMatrices } from './arithmetic-matrix';
import { ReducedCurveAlgebra, ReducedCurveField, constructReducedCurveOrder, type ReducedCurveView } from './reduced-curve';
import { certifyReducedOrderMaximality } from './reduced-normality';
import { constructReducedCurveModel, verifyReducedCurveModel, type ReducedCurveModel } from './reduced-model';
import { RejectedAlgebraicReduction, requireGoodReduction, verifyGoodReductionClaim } from './algebraic-reduction-errors';
import {recordRationalGcdEvidence,replayRationalGcdEvidence,currentRationalGcdEvidence,type RationalGcdEvidence} from './rational-gcd-evidence';
import {reuseAlgebraicVerification} from './algebraic-proof-reuse';

export interface AlgebraicGoodReduction<E> { readonly source: AlgebraicCurveView<E>; readonly geometry: AlgebraicCurveGeometry<E>; readonly number: AlgebraicNumberReduction;
  readonly curve: ReducedCurveView<ReductionConstant>; readonly model: ReducedCurveModel<ReductionConstant>;readonly arithmetic?:RationalGcdEvidence }
export function reduceCurveScalar(ctx: ExecutionContext, number: AlgebraicNumberReduction, target: PositiveFractionField<ReductionConstant>, value: CurveScalar): PositiveFraction<ReductionConstant> {
  value.field.assert(ctx,value); demand(value.field.ring.domain===number.source&&target.ring.field===number.residue,'domain-mismatch','complete curve reduction coefficient maps');
  const r=target.ring, convert=(p:typeof value.numerator)=>r.make(ctx,p.coefficients.map(c=>reduceAlgebraicConstant(ctx,number,c))), numerator=convert(value.numerator), denominator=convert(value.denominator);
  requireGoodReduction(!r.isZero(ctx,denominator),'curve coefficient denominator reduction');return target.make(ctx,numerator,denominator);
}
function reducedInput<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,number:AlgebraicNumberReduction,target:PositiveFractionField<ReductionConstant>,infinity:boolean){
  return freezeExactMatrix(ctx,(infinity?source.infinity:source.finite).lattice.input.map(row=>row.map(v=>reduceCurveScalar(ctx,number,target,v))));
}
export function constructAlgebraicGoodReductionWithin<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,geometry:AlgebraicCurveGeometry<E>,number:AlgebraicNumberReduction,bounds:DifferentialBounds):AlgebraicGoodReduction<E>{
  verifyAlgebraicNumberReduction(ctx,source.coordinates.constantOwner,number); requireGoodReduction(number.prime.characteristic>BigInt(source.coordinates.basis.length),'tame residue characteristic');
  const finite=new PositiveFractionField(new PositivePolynomialRing(number.residue,source.finite.lattice.scalar.ring.variable)),infinity=new PositiveFractionField(new PositivePolynomialRing(number.residue,source.infinity.lattice.scalar.ring.variable));
  const ring=new PositivePolynomialRing(finite,source.coordinates.relationRing.variable),relation=ring.make(ctx,source.coordinates.relation.coefficients.map(v=>reduceCurveScalar(ctx,number,finite,v))),algebra=new ReducedCurveAlgebra(ctx,number.residue,finite,relation);
  const finInput=reducedInput(ctx,source,number,finite,false),infInput=reducedInput(ctx,source,number,infinity,true),n=algebra.dimension;
  // All source lattices are square full bases after their checked Hermite map.
  // Their stored input can have additional generators; the basis image gives
  // the determinant exclusion before complete row-span construction.
  for(const [order,target]of [[source.finite,finite],[source.infinity,infinity]]as const){const basis=order.lattice.basis.map(row=>row.map(v=>reduceCurveScalar(ctx,number,target,v)));requireGoodReduction(invertArithmeticMatrix(ctx,target,transposeExactMatrix(ctx,basis,n))!==null,'reduced order basis rank');}
  const finiteOrder=constructReducedCurveOrder(ctx,algebra,false,positiveLattice(ctx,finite,finInput,n)),infinityOrder=constructReducedCurveOrder(ctx,algebra,true,positiveLattice(ctx,infinity,infInput,n));
  for(const [original,order]of [[source.finite,finiteOrder],[source.infinity,infinityOrder]]as const){const image=original.lattice.basis.map(row=>row.map(v=>reduceCurveScalar(ctx,number,order.lattice.field,v)));requireGoodReduction(equalExactMatrices(ctx,order.lattice.field,image,order.lattice.basis),'complete flat integral-order basis correspondence');}
  const finiteMaximality=certifyReducedOrderMaximality(ctx,algebra,finiteOrder),infinityMaximality=certifyReducedOrderMaximality(ctx,algebra,infinityOrder),model=constructReducedCurveModel(ctx,algebra,finiteOrder,infinityOrder,finiteMaximality,infinityMaximality);
  requireGoodReduction(model.genus===geometry.genus,'reduced genus correspondence');
  const field=ReducedCurveField.fromEvidence(ctx,algebra,model),curve=Object.freeze({algebra,field,finite:finiteOrder,infinity:infinityOrder,genus:model.genus});
  const proof=Object.freeze({source,geometry,number,curve,model});verifyAlgebraicGoodReductionWithin(ctx,source,proof,bounds);return Object.freeze({...proof,arithmetic:currentRationalGcdEvidence(ctx)});
}
export function verifyAlgebraicGoodReductionWithin<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,proof:AlgebraicGoodReduction<E>,bounds:DifferentialBounds):void{
  verifyAlgebraicCurveWithin(ctx,source.owner,source,bounds);demand(proof.source===source,'domain-mismatch','good reduction supplied source');
  reuseAlgebraicVerification(ctx,'good-reduction',source,proof,bounds,()=>verifyGoodReductionEvidence(ctx,source,proof,bounds));
}
function verifyGoodReductionEvidence<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,proof:AlgebraicGoodReduction<E>,bounds:DifferentialBounds):void{
  verifyAlgebraicCurveGeometryWithin(ctx,source,proof.geometry,bounds);verifyAlgebraicNumberReduction(ctx,source.coordinates.constantOwner,proof.number);
  const target=proof.curve,algebra=target.algebra,model=proof.model;demand(target.field.algebra===algebra&&algebra.constants===proof.number.residue&&algebra.dimension===source.coordinates.basis.length&&target.finite===model.finite&&target.infinity===model.infinity&&target.genus===model.genus&&model.genus===proof.geometry.genus,'verification-failed','complete reduction dimensions/genus/owners');
  const ring=algebra.relation.ring,expected=ring.make(ctx,source.coordinates.relation.coefficients.map(v=>reduceCurveScalar(ctx,proof.number,algebra.scalar,v)));demand(ring.equal(ctx,expected,algebra.relation),'verification-failed','full reduced defining relation');
  verifyReducedCurveModel(ctx,algebra,model);
  for(const infinity of [false,true]){const order=infinity?target.infinity:target.finite,input=reducedInput(ctx,source,proof.number,order.lattice.field,infinity);
    const original=infinity?source.infinity:source.finite,basis=original.lattice.basis.map(row=>row.map(v=>reduceCurveScalar(ctx,proof.number,order.lattice.field,v)));
    demand(equalExactMatrices(ctx,order.lattice.field,input,order.lattice.input)&&equalExactMatrices(ctx,order.lattice.field,basis,order.lattice.basis),'verification-failed','complete original order coefficient/basis specialization');
    const ring=order.lattice.field.ring;
    demand(original.multiplication.length===order.multiplication.length&&original.multiplication.every((matrix,i)=>matrix.length===order.multiplication[i].length&&matrix.every((row,j)=>row.length===order.multiplication[i][j].length&&row.every((p,k)=>ring.equal(ctx,ring.make(ctx,p.coefficients.map(c=>reduceAlgebraicConstant(ctx,proof.number,c))),order.multiplication[i][j][k])))),'verification-failed','complete native/reduced order multiplication correspondence');}
  // The full integral number-field model, coefficients and bases define a
  // finite flat cover of P1 over the localization at this prime. Both charts
  // are normal and glue; geometric connectedness and matching genus certify
  // smooth proper reduction. Divisor specialization is checked separately.
}
export function findAlgebraicGoodReductionWithin<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,bounds:DifferentialBounds,excludedCharacteristic:bigint|null=null,
  accept:(proof:AlgebraicGoodReduction<E>)=>void=()=>{}, additionalExcluded:readonly bigint[]=[]):AlgebraicGoodReduction<E>{
  for(const characteristic of additionalExcluded){ctx.integer(characteristic);demand(characteristic>1n,'invalid-input','excluded residue characteristic');}
  verifyAlgebraicCurveWithin(ctx,source.owner,source,bounds);const geometry=certifyAlgebraicCurveGeometryWithin(ctx,source,bounds);let prime=ctx.add(BigInt(source.coordinates.basis.length),1n);
  for(;;prime=ctx.add(prime,1n)){ctx.tick(additionalExcluded.length);if(prime===excludedCharacteristic||additionalExcluded.includes(prime)||!isFactorPrime(ctx,prime))continue;
    let reductions:readonly AlgebraicNumberReduction[];try{reductions=constructAlgebraicNumberReductions(ctx,source.coordinates.constantOwner,prime);}catch(e){if(e instanceof RejectedAlgebraicReduction)continue;throw e;}
    for(const number of reductions)try{const proof=constructAlgebraicGoodReductionWithin(ctx,source,geometry,number,bounds);accept(proof);return proof;}catch(e){if(e instanceof RejectedAlgebraicReduction)continue;throw e;}}
}
export function certifyAlgebraicGoodReduction<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,bounds:DifferentialBounds,excludedCharacteristic:bigint|null=null){return ctx.operation(()=>{const recorded=recordRationalGcdEvidence(ctx,()=>findAlgebraicGoodReductionWithin(ctx,source,bounds,excludedCharacteristic));return Object.freeze({...recorded.value,arithmetic:recorded.evidence});});}
export function verifyAlgebraicGoodReduction<E>(ctx:ExecutionContext,source:AlgebraicCurveView<E>,proof:AlgebraicGoodReduction<E>,bounds:DifferentialBounds):void{ctx.operation(()=>verifyGoodReductionClaim(()=>{demand(proof.arithmetic!==undefined,'verification-failed','complete native GCD coverage');replayRationalGcdEvidence(ctx,proof.arithmetic,()=>verifyAlgebraicGoodReductionWithin(ctx,source,proof,bounds));}));}
