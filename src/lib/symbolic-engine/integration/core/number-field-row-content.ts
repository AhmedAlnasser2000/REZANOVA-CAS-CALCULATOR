import {demand,type ExecutionContext} from './execution';
import {rationalField as Q} from './field';
import {integerGcd,rational,type Rational} from './rational';
import {isAlgebraicField,type AlgebraicElement} from './algebraic-field';
import type {Polynomial,PolynomialRing} from './polynomial';
import {hasRationalGcdEvidenceScope} from './rational-gcd-evidence';
/** A constant unit clears rational coordinate denominators and primitive
 * content of the entire module row before its next Euclidean division. */
export function numberFieldRowUnit<E>(ctx:ExecutionContext,r:PolynomialRing<E>,row:readonly Polynomial<E>[]):E|null{
 if(!hasRationalGcdEvidenceScope(ctx))return null;const f=r.domain;if(f!==Q&&!(isAlgebraicField(f)&&f.parent===Q))return null;
 const coordinates:Rational[]=[];for(const p of row){r.assert(ctx,p);for(const c of p.coefficients){f.assert(ctx,c);const values=f===Q?[c as Rational]:(c as AlgebraicElement<Rational>).representative.coefficients;ctx.allocate(values.length);coordinates.push(...values);}}
 let denominator=1n;for(const c of coordinates)denominator=ctx.multiply(ctx.quotient(denominator,integerGcd(ctx,denominator,c.denominator)),c.denominator);let content=0n;for(const c of coordinates)content=integerGcd(ctx,content,ctx.multiply(c.numerator,ctx.quotient(denominator,c.denominator)));
 if(content===0n)return f.fromInteger(ctx,1n);const q=rational(ctx,denominator,content),unit=f.exactDivide(ctx,f.fromInteger(ctx,q.numerator),f.fromInteger(ctx,q.denominator));demand(!f.isZero(ctx,unit),'verification-failed','nonzero row content unit');return unit;
}
