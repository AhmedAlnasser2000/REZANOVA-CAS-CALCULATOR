import {describe,it,expect,vi} from 'vitest';
import {base,quadratic,bounds,fresh} from './__tests__/algebraic-support';
import {heightEightHiddenConstantCurve,nestedHiddenConstantCurve} from './__tests__/algebraic-divisor-support';
import {rationalField as Q} from './field';
import {PolynomialRing} from './polynomial';
import {constructAlgebraicExtension} from './algebraic-field';
import {AlgebraicEmbedding} from './algebraic-embedding';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {baseChangeAlgebraicCurve} from './algebraic-curve-base-change';
import {certifyAlgebraicGoodReduction,verifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {encodeAlgebraicGoodReduction,decodeAlgebraicGoodReduction} from './algebraic-good-reduction-wire';
import {constructAlgebraicDivisor} from './algebraic-divisor';
import {decideAlgebraicDivisorTorsion} from './algebraic-divisor-torsion';
import * as constants from './algebraic-constant-field';
import * as factor from './positive-factorization';
import * as primes from './factorization-modular';

describe('complete reduced geometry over full constants',()=>{
 it('replays a manageable height-eight tower with hidden constants',()=>{
  const b=heightEightHiddenConstantCurve();expect(b.owner.height).toBe(8);expect(b.constants.basis.length).toBe(2);const proof=certifyAlgebraicGoodReduction(fresh(),b.curve,bounds),wire=encodeAlgebraicGoodReduction(fresh(),b.curve,proof,bounds);
  const spies=[vi.spyOn(constants,'certifyAlgebraicConstantFieldWithin'),vi.spyOn(factor,'factorPositivePolynomial'),vi.spyOn(primes,'isFactorPrime')];for(const s of spies)s.mockImplementation(()=>{throw Error('producer disabled');});
  try{const decoded=decodeAlgebraicGoodReduction(fresh(),b.curve,structuredClone(wire),bounds);verifyAlgebraicGoodReduction(fresh(),b.curve,decoded,bounds);expect(decoded.curve.algebra.dimension).toBe(1);expect(decoded.model.globalFunctions.basis.length).toBe(1);}finally{for(const s of spies)s.mockRestore();}
 });
 it('replays nested hidden constants over the actual degree-two constant field',()=>{const b=nestedHiddenConstantCurve(),proof=certifyAlgebraicGoodReduction(fresh(),b.curve,bounds),wire=encodeAlgebraicGoodReduction(fresh(),b.curve,proof,bounds);expect(proof.curve.algebra.dimension).toBe(2);expect(b.constants.basis.length).toBe(2);expect(decodeAlgebraicGoodReduction(fresh(),b.curve,wire,bounds).source).toBe(b.curve);});
 it('replays the full nested height-eight tower within the compact artifact budget',()=>{const b=nestedHiddenConstantCurve(8),proof=certifyAlgebraicGoodReduction(fresh(),b.curve,bounds),wire=encodeAlgebraicGoodReduction(fresh(),b.curve,proof,bounds),decoded=decodeAlgebraicGoodReduction(fresh(),b.curve,wire,bounds);expect(decoded.source).toBe(b.curve);expect(decoded.curve.algebra.dimension).toBe(2);expect(decoded.source.owner).toBe(b.owner);expect(b.owner.height).toBe(8);});
 it('rejects oversized full-tower imports before processing their evidence',()=>{const b=heightEightHiddenConstantCurve(),proof=certifyAlgebraicGoodReduction(fresh(),b.curve,bounds),wire=encodeAlgebraicGoodReduction(fresh(),b.curve,proof,bounds)as object,ctx=fresh(),oversized={...wire,padding:Array(bounds.artifactNodes+1).fill(null)};expect(()=>decodeAlgebraicGoodReduction(ctx,b.curve,oversized,bounds)).toThrow(/resource-limit.*artifact-nodes/);expect(()=>ctx.tick()).toThrow(/resource-limit/);});
 it('preserves explicit constant base changes through good reduction',()=>{
  const b=quadratic(),c=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),source=certifyAlgebraicCurve(b.ctx,b.owner,c,bounds),r=new PolynomialRing(Q,'lambda'),L=constructAlgebraicExtension(b.ctx,r,r.make(b.ctx,[Q.fromInteger(b.ctx,-2n),Q.fromInteger(b.ctx,0n),Q.fromInteger(b.ctx,1n)]),bounds),C=source.coordinates.constantOwner,embedding=AlgebraicEmbedding.extension(b.ctx,C,L,AlgebraicEmbedding.rationals(b.ctx,L,bounds),L.fromInteger(b.ctx,1n),bounds),changed=baseChangeAlgebraicCurve(b.ctx,source,L,embedding,bounds).curve;
  const proof=certifyAlgebraicGoodReduction(fresh(),changed,bounds);expect(proof.source.owner).toBe(changed.owner);expect(proof.number.source).toBe(L);const data=encodeAlgebraicGoodReduction(fresh(),changed,proof,bounds);expect(decodeAlgebraicGoodReduction(fresh(),changed,data,bounds).source).toBe(changed);
  expect(()=>verifyAlgebraicGoodReduction<unknown>(fresh(),source,proof,bounds)).toThrow(/domain-mismatch|verification-failed/);
 });
 it.each([{p:[1n,-1n,0n,0n,0n,1n],genus:2n},{p:[1n,-1n,0n,0n,0n,0n,0n,1n],genus:3n}])('supports genus $genus without a low-genus template',({p,genus})=>{
  const b=quadratic(p),c=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),curve=certifyAlgebraicCurve(b.ctx,b.owner,c,bounds),proof=certifyAlgebraicGoodReduction(fresh(),curve,bounds);expect(proof.curve.genus).toBe(genus);expect(proof.model.globalFunctions.basis).toHaveLength(1);verifyAlgebraicGoodReduction(fresh(),curve,proof,bounds);
  const zero=constructAlgebraicDivisor(b.ctx,curve,[],bounds),decision=decideAlgebraicDivisorTorsion(fresh(),curve,zero,bounds);expect('order'in decision&&decision.order).toBe(1n);
 });
 it('reduces a nonradical cubic relation with its complete ramification geometry',()=>{const b=base(),r=new PolynomialRing(b.field,'a'),owner=constructAlgebraicExtension(b.ctx,r,r.make(b.ctx,[b.field.negate(b.ctx,b.x),b.field.fromInteger(b.ctx,-1n),b.field.fromInteger(b.ctx,0n),b.field.fromInteger(b.ctx,1n)]),bounds),c=certifyAlgebraicConstantField(b.ctx,owner,bounds),curve=certifyAlgebraicCurve(b.ctx,owner,c,bounds),proof=certifyAlgebraicGoodReduction(fresh(),curve,bounds);expect(proof.curve.algebra.dimension).toBe(3);expect(proof.curve.genus).toBe(0n);expect(proof.number.prime.characteristic>3n).toBe(true);verifyAlgebraicGoodReduction(fresh(),curve,proof,bounds);});
});
