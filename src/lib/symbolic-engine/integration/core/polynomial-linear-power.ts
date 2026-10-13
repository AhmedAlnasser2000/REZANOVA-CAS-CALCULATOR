import {demand,type ExecutionContext} from './execution';
import type {Polynomial,PolynomialRing} from './polynomial';
import {polynomialDivide,verifyDivision} from './polynomial-division';
import {rationalField as Q} from './field';
import {isAlgebraicField} from './algebraic-field';
import {hasRationalGcdEvidenceScope} from './rational-gcd-evidence';
/** Checked arithmetic fast path for repeated linear poles. This is independent
 * of the function-field curve/genus and grants no integration authority. */
export function checkedLinearPower<E>(ctx:ExecutionContext,r:PolynomialRing<E>,input:Polynomial<E>):Readonly<{factor:Polynomial<E>;power:number}>|null{
  if(!hasRationalGcdEvidenceScope(ctx))return null;
  // This coefficient-native optimization is for Q and its explicit primitive
  // number fields. Recursive function coefficients retain their checked PRS.
  if(r.domain!==Q&&!(isAlgebraicField(r.domain)&&r.domain.parent===Q))return null;
  const n=r.degree(ctx,input);if(n<1)return null;const f=r.domain,lc=r.leading(ctx,input),coefficient=input.coefficients[n-1]??f.fromInteger(ctx,0n);
  const constant=f.exactDivide(ctx,coefficient,f.multiply(ctx,lc,f.fromInteger(ctx,BigInt(n)))),factor=r.make(ctx,[constant,f.fromInteger(ctx,1n)]);
  // (x+c) P'=nP gives every coefficient recurrence and uniquely forces
  // P=lc(P)(x+c)^n in characteristic zero. No trial power is constructed.
  if(!r.equal(ctx,r.scale(ctx,input,f.fromInteger(ctx,BigInt(n))),r.multiply(ctx,factor,r.derivative(ctx,input))))return null;
  return Object.freeze({factor,power:n});
}
export function checkedLinearPowerGcd<E>(ctx:ExecutionContext,r:PolynomialRing<E>,a:Polynomial<E>,b:Polynomial<E>):Polynomial<E>|null{
  const shape=checkedLinearPower(ctx,r,b);if(shape===null)return null;let current=a,gcd=r.one(ctx);
  if(r.isZero(ctx,a))return r.scale(ctx,b,r.domain.inverse(ctx,r.leading(ctx,b)));
  for(let i=0;i<shape.power;i++){const d=polynomialDivide(ctx,r,current,shape.factor);verifyDivision(ctx,r,current,shape.factor,d);if(!r.isZero(ctx,d.remainder))break;current=d.quotient;gcd=r.multiply(ctx,gcd,shape.factor);}
  const quotient=polynomialDivide(ctx,r,b,gcd);demand(r.isZero(ctx,quotient.remainder),'verification-failed','linear-power GCD denominator coverage');
  if(r.degree(ctx,quotient.quotient)>0)demand(!r.isZero(ctx,polynomialDivide(ctx,r,current,shape.factor).remainder),'verification-failed','linear-power GCD terminal residue');
  return gcd;
}
