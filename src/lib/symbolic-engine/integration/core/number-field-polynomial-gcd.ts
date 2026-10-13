import {demand,type ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {integerGcd,rational,type Rational} from './rational';
import {isAlgebraicField,type AlgebraicElement} from './algebraic-field';
import type {Polynomial,PolynomialRing} from './polynomial';
import {pseudoDivide,verifyPseudoDivision} from './pseudo-division';
import {polynomialDivide} from './polynomial-division';
import {rationalModularGcd} from './rational-modular-gcd';
import {hasRationalGcdEvidenceScope} from './rational-gcd-evidence';
/** Primitive rational-content PRS over Q and explicitly presented number
 * fields. GCD-only consumers need no exponentially growing Bezout pair.
 * Each pseudo-division and scalar-content reconstruction independently proves
 * preservation of the polynomial ideal over the coefficient field. */
export function numberFieldPolynomialGcd<E>(ctx:ExecutionContext,r:PolynomialRing<E>,a:Polynomial<E>,b:Polynomial<E>):Polynomial<E>|null{
  if(!hasRationalGcdEvidenceScope(ctx))return null;
  const modular=rationalModularGcd(ctx,r,a,b);if(modular!==null)return modular;
  const f=r.domain;if(f!==Q&&!(isAlgebraicField(f)&&f.parent===Q))return null;
  const coordinates=(value:E):readonly Rational[]=>{f.assert(ctx,value);return f===Q?[value as Rational]:(value as AlgebraicElement<Rational>).representative.coefficients;};
  const scalar=(q:Rational):E=>f===Q?q as E:f.exactDivide(ctx,f.fromInteger(ctx,q.numerator),f.fromInteger(ctx,q.denominator));
  const primitive=(p:Polynomial<E>)=>{r.assert(ctx,p);if(r.isZero(ctx,p))return p;let denominator=1n;
    for(const c of p.coefficients)for(const q of coordinates(c))denominator=ctx.multiply(ctx.quotient(denominator,integerGcd(ctx,denominator,q.denominator)),q.denominator);
    let content=0n;for(const c of p.coefficients)for(const q of coordinates(c))content=integerGcd(ctx,content,ctx.multiply(q.numerator,ctx.quotient(denominator,q.denominator)));
    demand(content!==0n,'verification-failed','nonzero number-field coefficient content');const scale=scalar(rational(ctx,denominator,content)),out=r.scale(ctx,p,scale);
    demand(r.equal(ctx,r.scale(ctx,out,f.inverse(ctx,scale)),p),'verification-failed','complete coefficient-content inverse reconstruction');return out;};
  let previous=primitive(a),current=primitive(b);
  while(!r.isZero(ctx,current)){const step=pseudoDivide(ctx,r,previous,current);verifyPseudoDivision(ctx,r,previous,current,step);demand(!f.isZero(ctx,step.multiplier)&&r.degree(ctx,step.remainder)<r.degree(ctx,current),'verification-failed','primitive number-field PRS progress/unit');previous=current;current=primitive(step.remainder);}
  if(r.isZero(ctx,previous)){demand(r.isZero(ctx,a)&&r.isZero(ctx,b),'verification-failed','number-field zero GCD');return previous;}
  const result=r.scale(ctx,previous,f.inverse(ctx,r.leading(ctx,previous)));for(const p of [a,b])demand(r.isZero(ctx,polynomialDivide(ctx,r,p,result).remainder),'verification-failed','primitive number-field GCD divides inputs');return result;
}
