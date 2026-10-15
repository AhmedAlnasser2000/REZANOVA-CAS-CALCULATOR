import {demand,type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import {PositivePrimeField,type PrimeValue,type FiniteField} from './positive-field';
import {PositiveFiniteExtension,type FiniteExtensionValue,type FiniteIrreducibility} from './positive-extension';
import {PositivePolynomialRing,type PositivePolynomial,type PositiveBezout} from './positive-polynomial';
import {PositiveFractionField,type PositiveFraction} from './positive-fraction';
import type {PositiveFactorization} from './positive-factorization';
import {matrixInverseCodec} from './algebraic-module-wire';
import {linearEvidenceCodec} from './linear-wire';
import {AlgebraicDivisorWireContext} from './algebraic-divisor-wire-context';
import type {PositiveModule} from './positive-module';
import type {PositiveDenominators,PositiveLattice,PositivePreimage} from './positive-lattice';
import type {PositiveHessSpace} from './positive-hess';
import {normalizationInteger} from './exponential-normalization-wire-values';
import * as w from './decision-wire-algebra';
export class PositiveWireContext{
  readonly ctx:ExecutionContext;readonly bounds:DifferentialBounds;readonly shared:AlgebraicDivisorWireContext;
  constructor(ctx:ExecutionContext,bounds:DifferentialBounds,shared=new AlgebraicDivisorWireContext(ctx,bounds)){this.ctx=ctx;this.bounds=bounds;this.shared=shared;ctx.allocate(3);}
  memo<T>(name:string,owner:object,codec:w.EvidenceCodec<T>){return this.shared.memo(`positive-${name}`,owner,codec);}
  integer(){return normalizationInteger(this.ctx);}
  prime(field:PositivePrimeField):w.EvidenceCodec<PrimeValue>{return {encode:v=>{field.assert(this.ctx,v);return this.integer().encode(v.value);},decode:v=>{const n=this.integer().decode(v);demand(n>=0n&&n<field.size,'invalid-input','canonical prime residue');return field.element(this.ctx,n);}};}
  coefficient<E>(field:FiniteField<E>):w.EvidenceCodec<E>{
    if(field instanceof PositivePrimeField)return this.prime(field) as unknown as w.EvidenceCodec<E>;
    demand(field instanceof PositiveFiniteExtension,'domain-mismatch','registered finite coefficient codec');const owner=field as PositiveFiniteExtension<unknown>,p=this.polynomial(owner.ring,this.coefficient(owner.parent));
    return this.memo('coefficient-value',field,{encode:v=>{owner.assert(this.ctx,v as FiniteExtensionValue<unknown>);return p.encode((v as FiniteExtensionValue<unknown>).polynomial);},decode:v=>{const polynomial=p.decode(v),out=owner.make(this.ctx,polynomial);demand(owner.ring.equal(this.ctx,polynomial,out.polynomial),'invalid-input','unreduced finite value');return out as E;}});
  }
  polynomial<E>(r:PositivePolynomialRing<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<PositivePolynomial<E>>{const list=w.list(this.ctx,c);return {encode:v=>{r.assert(this.ctx,v);return Object.freeze({variable:r.variable,coefficients:list.encode(v.coefficients)});},decode:v=>{const raw=w.record(this.ctx,v,['variable','coefficients']);demand(raw.variable===r.variable,'domain-mismatch','finite polynomial indeterminate');demand(Array.isArray(raw.coefficients),'invalid-input','finite polynomial coefficients');this.ctx.degree(raw.coefficients.length-1);const cs=list.decode(raw.coefficients),out=r.make(this.ctx,cs);demand(out.coefficients.length===cs.length,'invalid-input','finite canonical polynomial');return out;}};}
  bezout<E>(p:w.EvidenceCodec<PositivePolynomial<E>>):w.EvidenceCodec<PositiveBezout<E>>{return w.structure(this.ctx,{gcd:p,s:p,t:p});}
  irreducibility<E>(r:PositivePolynomialRing<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<FiniteIrreducibility<E>>{const p=this.polynomial(r,c);return w.structure(this.ctx,{frobenius:w.list(this.ctx,p),exclusions:w.list(this.ctx,w.structure(this.ctx,{index:w.integer(this.ctx),bezout:this.bezout(p)}))});}
  extension<E>(parent:FiniteField<E>):w.EvidenceCodec<PositiveFiniteExtension<E>>{
    return this.memo('finite-extension',parent,{encode:v=>{demand(v.parent===parent,'domain-mismatch','finite auxiliary parent');const c=this.coefficient(parent);return Object.freeze({variable:v.ring.variable,modulus:this.polynomial(v.ring,c).encode(v.modulus),irreducibility:this.irreducibility(v.ring,c).encode(v.irreducibility)});},decode:v=>{
      const raw=w.record(this.ctx,v,['variable','modulus','irreducibility']);demand(typeof raw.variable==='string','invalid-input','finite auxiliary variable');const r=new PositivePolynomialRing(parent,raw.variable),c=this.coefficient(parent),modulus=this.polynomial(r,c).decode(raw.modulus),proof=this.irreducibility(r,c).decode(raw.irreducibility);return new PositiveFiniteExtension(this.ctx,parent,r,modulus,proof);
    }});
  }
  factorization<E>(field:FiniteField<E>,r:PositivePolynomialRing<E>):w.EvidenceCodec<PositiveFactorization<E>>{const c=this.coefficient(field),p=this.polynomial(r,c),zero=w.structure(this.ctx,{kind:w.literal(this.ctx,'zero'),input:p}),factor=w.structure(this.ctx,{kind:w.literal(this.ctx,'factorization'),input:p,unit:c,factors:w.list(this.ctx,w.structure(this.ctx,{polynomial:p,multiplicity:this.integer(),irreducibility:this.irreducibility(r,c)}))});
    return {encode:v=>v.kind==='zero'?zero.encode(v):factor.encode(v),decode:v=>{demand(v!==null&&typeof v==='object','invalid-input','finite factor record');const kind=Object.getOwnPropertyDescriptor(v,'kind');demand(kind!==undefined&&'value'in kind,'invalid-input','finite factor tag');return kind.value==='zero'?zero.decode(v):factor.decode(v);}};}
  fraction<E>(f:PositiveFractionField<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<PositiveFraction<E>>{const p=this.polynomial(f.ring,c),parts=w.structure(this.ctx,{numerator:p,denominator:p});return this.memo('fraction-value',f,{encode:v=>{f.assert(this.ctx,v);return parts.encode(v);},decode:v=>{const partsValue=parts.decode(v),out=f.make(this.ctx,partsValue.numerator,partsValue.denominator);demand(f.ring.equal(this.ctx,out.numerator,partsValue.numerator)&&f.ring.equal(this.ctx,out.denominator,partsValue.denominator),'invalid-input','noncanonical finite fraction');return out;}});}
  module<E>(r:PositivePolynomialRing<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<PositiveModule<E>>{const p=this.polynomial(r,c),matrix=w.list(this.ctx,w.list(this.ctx,p)),swap=w.structure(this.ctx,{kind:w.literal(this.ctx,'swap'),target:w.integer(this.ctx),source:w.integer(this.ctx)}),add=w.structure(this.ctx,{kind:w.literal(this.ctx,'add'),target:w.integer(this.ctx),source:w.integer(this.ctx),factor:p}),scale=w.structure(this.ctx,{kind:w.literal(this.ctx,'scale'),target:w.integer(this.ctx),factor:c});const op:w.EvidenceCodec<PositiveModule<E>['operations'][number]>={encode:v=>v.kind==='swap'?swap.encode(v):v.kind==='add'?add.encode(v):scale.encode(v),decode:v=>{demand(v!==null&&typeof v==='object','invalid-input','finite module operation');const kind=Object.getOwnPropertyDescriptor(v,'kind');demand(kind!==undefined&&'value'in kind,'invalid-input','finite operation tag');return kind.value==='swap'?swap.decode(v):kind.value==='add'?add.decode(v):scale.decode(v);}};
    return w.structure(this.ctx,{input:matrix,columns:w.integer(this.ctx),operations:w.list(this.ctx,op),reduced:matrix,transformation:matrix,pivots:w.list(this.ctx,w.integer(this.ctx))});}
  denominators<E>(f:PositiveFractionField<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<PositiveDenominators<E>>{const p=this.polynomial(f.ring,c);return this.memo('denominators',f,w.structure(this.ctx,{input:w.list(this.ctx,p),steps:w.list(this.ctx,w.structure(this.ctx,{gcd:this.bezout(p),left:p,right:p,next:p})),common:p}));}
  lattice<E>(f:PositiveFractionField<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<PositiveLattice<E>>{const s=this.fraction(f,c),matrix=w.list(this.ctx,w.list(this.ctx,s)),parts=w.structure(this.ctx,{dimension:w.integer(this.ctx,1),input:matrix,denominators:this.denominators(f,c),hermite:this.module(f.ring,c),basis:matrix,inverse:matrixInverseCodec(this.ctx,s)});return this.memo<PositiveLattice<E>>('lattice',f,{encode:parts.encode,decode:v=>Object.freeze({field:f,...parts.decode(v)})});}
  preimage<E>(f:PositiveFractionField<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<PositivePreimage<E>>{const lattice=this.lattice(f,c);return w.structure(this.ctx,{rows:lattice,result:lattice});}
  hess<E>(f:PositiveFractionField<E>,c:w.EvidenceCodec<E>):w.EvidenceCodec<PositiveHessSpace<E>>{const s=this.fraction(f,c),p=this.polynomial(f.ring,c);return w.structure(this.ctx,{steps:w.list(this.ctx,w.structure(this.ctx,{target:w.integer(this.ctx),relation:w.list(this.ctx,c),factors:w.list(this.ctx,p)})),reduced:w.list(this.ctx,w.list(this.ctx,s)),transformation:w.list(this.ctx,w.list(this.ctx,p)),weights:w.list(this.ctx,w.integer(this.ctx,-Number.MAX_SAFE_INTEGER)),leadingInverse:matrixInverseCodec(this.ctx,c),indices:w.list(this.ctx,w.structure(this.ctx,{row:w.integer(this.ctx),power:w.integer(this.ctx)})),basis:w.list(this.ctx,w.list(this.ctx,s))});}
  linear<E>(c:w.EvidenceCodec<E>){return linearEvidenceCodec(this.ctx,c);}
}
