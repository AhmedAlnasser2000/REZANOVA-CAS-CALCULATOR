import {describe,it,expect} from 'vitest';
import {fresh} from './__tests__/algebraic-support';
import {PositivePrimeField} from './positive-field';
import {PositivePolynomialRing} from './positive-polynomial';
import {PositiveFractionField} from './positive-fraction';
import {normalizePositiveLocalModule,verifyPositiveLocalModule} from './positive-local-module';
describe('exact localization at the infinity point',()=>{
 it('removes unrelated chart factors with complete bidirectional local transformations',()=>{
  const c=fresh(),p=new PositivePrimeField(c,5n),r=new PositivePolynomialRing(p,'u'),f=new PositiveFractionField(r),poly=(cs:bigint[])=>r.make(c,cs.map(n=>p.fromInteger(c,n))),one=f.fromInteger(c,1n),u=f.make(c,r.x(c),r.one(c)),input=Object.freeze([Object.freeze([f.make(c,poly([-1n,1n]),r.one(c)),u]),Object.freeze([f.fromInteger(c,0n),f.make(c,poly([0n,0n,1n,1n]),r.one(c))])]);
  const proof=normalizePositiveLocalModule(c,f,input);verifyPositiveLocalModule(fresh(),f,input,proof);expect(f.equal(c,proof.basis[0][0],one)).toBe(true);expect(f.equal(c,proof.basis[1][1],f.multiply(c,u,u))).toBe(true);expect(r.degree(c,proof.basis[0][1].numerator)).toBeLessThan(2);expect(Object.isFrozen(proof.inverse)).toBe(true);
  expect(()=>verifyPositiveLocalModule(fresh(),f,input,{...proof,operations:[{kind:'scale',target:0,factor:u},...proof.operations]})).toThrow(/verification-failed.*local unimodular/);
  expect(()=>verifyPositiveLocalModule(fresh(),f,input,{...proof,basis:[[one,one],[one,one]]})).toThrow(/verification-failed/);
 });
 it('does not normalize a nonintegral request by silently clearing a local pole',()=>{const c=fresh(),p=new PositivePrimeField(c,7n),r=new PositivePolynomialRing(p,'u'),f=new PositiveFractionField(r),pole=f.make(c,r.one(c),r.x(c));expect(()=>normalizePositiveLocalModule(c,f,[[pole]])).toThrow(/verification-failed.*integral/);});
});
