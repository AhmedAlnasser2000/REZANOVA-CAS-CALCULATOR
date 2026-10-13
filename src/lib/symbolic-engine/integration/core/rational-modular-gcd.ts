import {demand,type ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {rational,integerGcd,type Rational} from './rational';
import {isAlgebraicField,type AlgebraicElement} from './algebraic-field';
import type {Polynomial,PolynomialRing} from './polynomial';
import {polynomialDivide} from './polynomial-division';
import {modularBezout,verifyModularBezout} from './factorization-modular';
import {rationalGcdPrimeFields} from './rational-gcd-evidence';

/** Complete modular GCD over Q, including explicit degree-one number-field
 * presentations. Modular degree preservation bounds the rational GCD degree;
 * exact divisibility plus matching degree proves completeness. */
export function rationalModularGcd<E>(ctx:ExecutionContext,r:PolynomialRing<E>,a:Polynomial<E>,b:Polynomial<E>):Polynomial<E>|null{
  const f=r.domain,linear=f!==Q&&isAlgebraicField(f)&&f.parent===Q&&f.modulus.coefficients.length===2;
  if(f!==Q&&!linear)return null;
  const rationalValue=(value:E):Rational=>{f.assert(ctx,value);if(f===Q)return value as Rational;const v=value as AlgebraicElement<Rational>;demand(v.representative.coefficients.length<=1,'verification-failed','linear constant inverse conversion');const q=v.representative.coefficients[0]??rational(ctx,0n);demand(f.equal(ctx,value,f.exactDivide(ctx,f.fromInteger(ctx,q.numerator),f.fromInteger(ctx,q.denominator))),'verification-failed','complete rational constant bridge');return q;};
  const integerPolynomial=(p:Polynomial<E>)=>{const cs=p.coefficients.map(rationalValue);let denominator=1n;for(const c of cs)denominator=ctx.multiply(ctx.quotient(denominator,integerGcd(ctx,denominator,c.denominator)),c.denominator);const raw=cs.map(c=>ctx.multiply(c.numerator,ctx.quotient(denominator,c.denominator)));let content=0n;for(const c of raw)content=integerGcd(ctx,content,c);if(!content)return raw;if(raw[raw.length-1]<0n)content=-content;return raw.map(c=>ctx.quotient(c,content));};
  r.assert(ctx,a);r.assert(ctx,b);if(r.isZero(ctx,a))return r.isZero(ctx,b)?r.zero(ctx):r.scale(ctx,b,f.inverse(ctx,r.leading(ctx,b)));if(r.isZero(ctx,b))return r.scale(ctx,a,f.inverse(ctx,r.leading(ctx,a)));
  if(r.degree(ctx,a)===0||r.degree(ctx,b)===0)return r.one(ctx);
  let ac=integerPolynomial(a),bc=integerPolynomial(b);const boundOf=(cs:readonly bigint[])=>{let norm=0n;for(const c of cs)norm=ctx.add(norm,c<0n?-c:c);let power=1n;for(let i=1;i<cs.length;i++)power=ctx.multiply(power,2n);return ctx.multiply(ctx.multiply(norm,power),cs[cs.length-1]);};
  // lc(A)*monic-gcd has integer coefficients. Mignotte's divisor bound
  // 2^deg(A)||A||_1 bounds its primitive integer factor; |lc(A)| supplies
  // the scaling. Select the smaller bound before CRT construction.
  let bound=boundOf(ac);const otherBound=boundOf(bc);if(otherBound<bound){[ac,bc]=[bc,ac];bound=otherBound;}const lc=ac[ac.length-1];
  let degree=Math.min(ac.length,bc.length)-1,modulus=1n,residues:bigint[]=[];
  for(const field of rationalGcdPrimeFields(ctx)){const prime=field.modulus;if(ctx.remainder(lc,prime)===0n||ctx.remainder(bc[bc.length-1],prime)===0n)continue;
    const aa=field.make(ctx,ac),bb=field.make(ctx,bc),bezout=modularBezout(ctx,field,aa,bb);verifyModularBezout(ctx,field,aa,bb,bezout);const gcd=field.bind(ctx,bezout.gcd),d=gcd.coefficients.length-1;
    demand(d>=0,'verification-failed','nonzero modular degree-preserving GCD');if(d>degree)continue;if(d<degree){degree=d;modulus=1n;residues=[];}
    if(degree===0)return r.one(ctx);
    const coefficients=field.scale(ctx,gcd,lc).coefficients;ctx.allocate(degree+1);const inverse=field.inverse(ctx,ctx.remainder(modulus,prime)),next=ctx.multiply(modulus,prime);
    residues=Array.from({length:degree+1},(_,i)=>{const old=residues[i]??0n,difference=field.plus(ctx,coefficients[i]??0n,-ctx.remainder(old,prime)),correction=field.times(ctx,difference,inverse);return ctx.add(old,ctx.multiply(modulus,correction));});modulus=next;
    if(modulus<=ctx.multiply(2n,bound))continue;const cs=residues.map(c=>c>ctx.quotient(modulus,2n)?ctx.add(c,-modulus):c),candidate=r.make(ctx,cs.map(c=>f.exactDivide(ctx,f.fromInteger(ctx,c),f.fromInteger(ctx,lc))));
    if(r.degree(ctx,candidate)!==degree||!f.equal(ctx,r.leading(ctx,candidate),f.fromInteger(ctx,1n)))continue;
    const ad=polynomialDivide(ctx,r,a,candidate),bd=polynomialDivide(ctx,r,b,candidate);if(!r.isZero(ctx,ad.remainder)||!r.isZero(ctx,bd.remainder))continue;
    demand(r.equal(ctx,r.multiply(ctx,ad.quotient,candidate),a)&&r.equal(ctx,r.multiply(ctx,bd.quotient,candidate),b),'verification-failed','modular GCD exact inverse reconstruction');return candidate;
  }
  demand(false,'verification-failed','complete modular GCD prime coverage');
}
