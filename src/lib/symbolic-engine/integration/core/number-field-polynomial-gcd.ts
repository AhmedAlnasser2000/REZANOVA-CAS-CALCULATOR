import {demand,type ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {integerGcd,rational,type Rational} from './rational';
import {isAlgebraicField,type AlgebraicElement} from './algebraic-field';
import type {Polynomial,PolynomialRing} from './polynomial';
import {pseudoDivide,verifyPseudoDivision} from './pseudo-division';
import {polynomialDivide} from './polynomial-division';
import {rationalModularGcd} from './rational-modular-gcd';
import {hasRationalGcdEvidenceScope,isRationalGcdEvidenceRecording} from './rational-gcd-evidence';
import {produceNumberFieldModularGcdWithin,verifyNumberFieldModularGcdWithin} from './number-field-modular-gcd';
/** Checked primitive PRS for GCD-only consumers. Rational inputs retain the
 * modular/content path, including degree-one number-field wrappers. Genuine
 * number fields remove the entire coefficient-field unit
 * by monic normalization: rational content alone cannot remove an irrational
 * leading unit, whose pseudo-division powers can grow exponentially.
 * Each division and inverse normalization proves preservation of the ideal.
 * This does not change Brown subresultant or resultant scaling semantics. */
export function numberFieldPolynomialGcd<E>(ctx:ExecutionContext,r:PolynomialRing<E>,a:Polynomial<E>,b:Polynomial<E>):Polynomial<E>|null{
  if(!hasRationalGcdEvidenceScope(ctx))return null;
  const modular=rationalModularGcd(ctx,r,a,b);if(modular!==null)return modular;
  // Record operations use the complete modular method over the original
  // ordered number-field tower. Old version-1 replay retains its original
  // exact Euclidean path before any new modular computation begins.
  let base:unknown=r.domain;while(isAlgebraicField(base))base=base.parent;
  if(base===Q&&isRationalGcdEvidenceRecording(ctx)){
    const proof=produceNumberFieldModularGcdWithin(ctx,r,a,b);verifyNumberFieldModularGcdWithin(ctx,r,a,b,proof);return proof.gcd;
  }
  const f=r.domain;if(f!==Q&&!(isAlgebraicField(f)&&f.parent===Q))return null;
  if(isAlgebraicField(f)&&f.ring.degree(ctx,f.modulus)>1){
    const monic=(p:Polynomial<E>)=>{r.assert(ctx,p);if(r.isZero(ctx,p))return p;const leading=r.leading(ctx,p),inverse=f.inverse(ctx,leading),out=r.scale(ctx,p,inverse);
      demand(f.equal(ctx,f.multiply(ctx,leading,inverse),f.fromInteger(ctx,1n))&&r.equal(ctx,r.scale(ctx,out,leading),p),'verification-failed','complete number-field monic unit reconstruction');return out;};
    let previous=monic(a),current=monic(b);
    while(!r.isZero(ctx,current)){const division=polynomialDivide(ctx,r,previous,current);
      demand(r.degree(ctx,division.remainder)<r.degree(ctx,current)&&r.equal(ctx,previous,r.add(ctx,r.multiply(ctx,division.quotient,current),division.remainder)),'verification-failed','number-field Euclidean identity/progress');
      previous=current;current=monic(division.remainder);}
    if(r.isZero(ctx,previous)){demand(r.isZero(ctx,a)&&r.isZero(ctx,b),'verification-failed','number-field zero GCD');return previous;}
    for(const p of[a,b])demand(r.isZero(ctx,polynomialDivide(ctx,r,p,previous).remainder),'verification-failed','monic number-field GCD divides inputs');return previous;
  }
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
