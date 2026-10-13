import {describe,it,expect,vi} from 'vitest';
import {fresh,bounds} from './__tests__/algebraic-support';
import {rationalField as Q} from './field';
import {PolynomialRing} from './polynomial';
import {RationalFunctionField} from './rational-function';
import {polynomialGcd,extendedGcd} from './polynomial-division';
import {constructAlgebraicExtension} from './algebraic-field';
import {recordRationalGcdEvidence,replayRationalGcdEvidence} from './rational-gcd-evidence';
import * as primes from './factorization-modular';

describe('bounded native GCD arithmetic for divisor replay',()=>{
 it('checks modular recovery and replays only the stored prime coverage',()=>{
  const c=fresh(),r=new PolynomialRing(Q,'x'),p=(cs:bigint[])=>r.make(c,cs.map(n=>Q.fromInteger(c,n))),common=p([1234567890123456789n,-37n,2n]),a=r.multiply(c,common,p([1n,0n,1n])),b=r.multiply(c,common,p([-7n,1n]));
  const stored=c.operation(()=>recordRationalGcdEvidence(c,()=>polynomialGcd(c,r,a,b)));
  expect(r.equal(c,stored.value,r.scale(c,common,Q.inverse(c,r.leading(c,common))))).toBe(true);expect(stored.evidence.primes.length).toBeGreaterThan(1);
  const spy=vi.spyOn(primes,'isFactorPrime').mockImplementation(()=>{throw Error('prime search disabled');});
  try{const d=fresh(),gcd=d.operation(()=>replayRationalGcdEvidence(d,stored.evidence,()=>polynomialGcd(d,r,a,b)));expect(r.equal(d,gcd,stored.value)).toBe(true);
   const missing=fresh();expect(()=>missing.operation(()=>replayRationalGcdEvidence(missing,{primes:[]},()=>polynomialGcd(missing,r,a,b)))).toThrow(/verification-failed.*coverage/);
  }finally{spy.mockRestore();}
 });
 it('agrees with independent Bezout arithmetic on seeded exact products',()=>{
  const c=fresh(),r=new PolynomialRing(Q,'w');
  for(let seed=1n;seed<=9n;seed++){const h=r.make(c,[Q.fromInteger(c,seed),Q.fromInteger(c,1n)]),a=r.multiply(c,h,r.make(c,[Q.fromInteger(c,1n),Q.fromInteger(c,seed+1n),Q.fromInteger(c,1n)])),b=r.multiply(c,h,r.make(c,[Q.fromInteger(c,seed+3n),Q.fromInteger(c,1n)]));
   const target=extendedGcd(c,r,a,b).gcd,gcd=c.operation(()=>recordRationalGcdEvidence(c,()=>polynomialGcd(c,r,a,b)).value);expect(r.equal(c,gcd,target)).toBe(true);
  }
 });
 it('handles repeated linear poles and number-field content without changing owners',()=>{
  const c=fresh(),r=new PolynomialRing(Q,'a'),relation=r.make(c,[Q.fromInteger(c,-2n),Q.fromInteger(c,0n),Q.fromInteger(c,1n)]),field=constructAlgebraicExtension(c,r,relation,bounds),z=new PolynomialRing(field,'z'),alpha=field.generator(c),h=z.make(c,[alpha,field.fromInteger(c,1n)]),power=z.multiply(c,h,z.multiply(c,h,h)),a=z.multiply(c,power,z.make(c,[field.fromInteger(c,3n),alpha,field.fromInteger(c,1n)])),fractions=new RationalFunctionField(z);
  const proof=c.operation(()=>recordRationalGcdEvidence(c,()=>({gcd:polynomialGcd(c,z,a,power),value:fractions.make(c,a,power)})));
  expect(z.equal(c,proof.value.gcd,power)).toBe(true);expect(z.degree(c,proof.value.value.denominator)).toBe(0);expect(z.degree(c,proof.value.value.numerator)).toBe(2);expect(Object.isFrozen(proof.value.value)).toBe(true);
  const other=new PolynomialRing(field,'z');expect(()=>c.operation(()=>recordRationalGcdEvidence(c,()=>polynomialGcd(c,z,other.one(c),power)))).toThrow(/domain-mismatch/);
 });
 it('rejects incomplete or invalid arithmetic coverage and resets fresh scopes',()=>{
  const c=fresh(),r=new PolynomialRing(Q,'x'),a=r.make(c,[Q.fromInteger(c,2n),Q.fromInteger(c,0n),Q.fromInteger(c,1n)]),b=r.make(c,[Q.fromInteger(c,3n),Q.fromInteger(c,0n),Q.fromInteger(c,1n)]),stored=c.operation(()=>recordRationalGcdEvidence(c,()=>polynomialGcd(c,r,a,b)));
  const d=fresh(),run=()=>d.operation(()=>replayRationalGcdEvidence(d,stored.evidence,()=>polynomialGcd(d,r,a,b)));run();const work=d.usage.work;run();expect(d.usage.work).toBe(2*work);
  for(const values of [[],[4n],[3n,2n],[2n,2n]]){const ctx=fresh();expect(()=>ctx.operation(()=>replayRationalGcdEvidence(ctx,{primes:values},()=>polynomialGcd(ctx,r,a,b)))).toThrow();}
 });
});
