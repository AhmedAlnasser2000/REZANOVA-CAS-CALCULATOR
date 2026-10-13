import { describe, it, expect, vi } from 'vitest';
import { fresh } from './__tests__/algebraic-support';
import { PositivePrimeField } from './positive-field';
import { PositivePolynomialRing } from './positive-polynomial';
import { PositiveFiniteExtension, finiteIrreducibility } from './positive-extension';
import { factorPositivePolynomial, verifyPositiveFactorization } from './positive-factorization';
import { PositiveFractionField } from './positive-fraction';
import { positiveLattice, verifyPositiveLattice } from './positive-lattice';
import { solveArithmeticLinearSystem, verifyArithmeticLinearSolution } from './arithmetic-linear';
import * as linear from './arithmetic-linear';
import * as factoring from './positive-factorization';

describe('separate positive-characteristic arithmetic', () => {
  it('rejects composite fields and foreign/forged values', () => {
    const c = fresh(), f = new PositivePrimeField(c, 5n), other = new PositivePrimeField(c, 5n);
    expect(() => new PositivePrimeField(c, 9n)).toThrow(/prime/); expect(() => f.add(c, f.fromInteger(c, 1n), other.fromInteger(c, 1n))).toThrow(/domain-mismatch/);
    expect(() => f.assert(c, {...f.fromInteger(c, 1n)})).toThrow(/domain-mismatch/); expect(f.characteristic).toBe(5n);
  });
  it('factors arbitrary finite-extension coefficients with independent Frobenius evidence', () => {
    const c = fresh(), p = new PositivePrimeField(c, 5n), r = new PositivePolynomialRing(p, 'a'), modulus = r.make(c, [p.fromInteger(c, 2n), p.fromInteger(c, 0n), p.fromInteger(c, 1n)]);
    const extension = new PositiveFiniteExtension(c, p, r, modulus, finiteIrreducibility(c, r, modulus, p.size)), s = new PositivePolynomialRing(extension, 'z'), a = extension.generator(c);
    const f = s.make(c, [extension.negate(c, a), extension.fromInteger(c, 1n)]), g = s.make(c, [extension.add(c, a, extension.fromInteger(c, 1n)), extension.fromInteger(c, 1n)]);
    const input = s.multiply(c, s.multiply(c, f, f), g), proof = factorPositivePolynomial(c, extension, s, input);
    expect(proof.kind).toBe('factorization'); if (proof.kind === 'factorization') expect(proof.factors.map(f => f.multiplicity).sort()).toEqual([1n, 2n]);
    const spy = vi.spyOn(factoring, 'factorPositivePolynomial').mockImplementation(() => { throw Error('producer disabled'); });
    try { verifyPositiveFactorization(fresh(), extension, s, input, proof); } finally { spy.mockRestore(); }
    for (let i = 0n; i < extension.size; i++) expect(extension.index(c, extension.element(c, i))).toBe(i);
  });
  it('handles inseparable powers and zero-row systems without a characteristic-zero cast', () => {
    const c = fresh(), f = new PositivePrimeField(c, 3n), r = new PositivePolynomialRing(f, 'z'), input = r.make(c, [f.fromInteger(c, 1n), f.fromInteger(c, 0n), f.fromInteger(c, 0n), f.fromInteger(c, 1n)]);
    const proof = factorPositivePolynomial(c, f, r, input); expect(proof.kind === 'factorization' && proof.factors[0].multiplicity).toBe(3n);
    const system = {rows: 0, columns: 3, matrix: [], rhs: []}, result = solveArithmeticLinearSystem(c, f, system);
    expect(result.kind === 'consistent' && result.nullspace.length).toBe(3); verifyArithmeticLinearSolution(fresh(), f, system, result);
  });
  it('replays polynomial lattices with elimination disabled', () => {
    const c = fresh(), f = new PositivePrimeField(c, 7n), r = new PositivePolynomialRing(f, 'x'), fractions = new PositiveFractionField(r), x = fractions.make(c, r.x(c), r.one(c));
    const lattice = positiveLattice(c, fractions, [[x]], 1), spy = vi.spyOn(linear, 'solveArithmeticLinearSystem').mockImplementation(() => { throw Error('producer disabled'); });
    try { verifyPositiveLattice(fresh(), fractions, [[x]], 1, lattice); } finally { spy.mockRestore(); }
  });
  it('retains complete multiplicities in seeded inseparable products',()=>{
    for(const prime of [2n,3n,5n]){const c=fresh(),f=new PositivePrimeField(c,prime),r=new PositivePolynomialRing(f,'z');let input=r.constant(c,f.fromInteger(c,prime-1n));const expected:bigint[]=[];
      for(let index=0n;index<prime;index++){const factor=r.make(c,[f.fromInteger(c,index),f.fromInteger(c,1n)]),multiplicity=index+1n;expected.push(multiplicity);for(let j=0n;j<multiplicity;j++)input=r.multiply(c,input,factor);}
      const proof=factorPositivePolynomial(c,f,r,input);expect(proof.kind).toBe('factorization');if(proof.kind==='factorization'){expect(proof.factors.map(v=>v.multiplicity).sort()).toEqual(expected.sort());expect(()=>verifyPositiveFactorization(fresh(),f,r,input,{...proof,factors:proof.factors.slice(1)})).toThrow(/verification-failed/);expect(()=>verifyPositiveFactorization(fresh(),f,r,input,{...proof,factors:[...proof.factors,proof.factors[0]]})).toThrow(/verification-failed/);}
    }
  });
  it('rejects reducible finite extensions and altered Frobenius coverage',()=>{
    const c=fresh(),p=new PositivePrimeField(c,5n),r=new PositivePolynomialRing(p,'a'),polynomial=r.make(c,[p.fromInteger(c,2n),p.fromInteger(c,0n),p.fromInteger(c,1n)]),proof=finiteIrreducibility(c,r,polynomial,p.size);
    expect(()=>new PositiveFiniteExtension(c,p,r,polynomial,Object.freeze({...proof,exclusions:Object.freeze([])}))).toThrow();
    const reducible=r.make(c,[p.fromInteger(c,-1n),p.fromInteger(c,0n),p.fromInteger(c,1n)]);expect(()=>finiteIrreducibility(c,r,reducible,p.size)).toThrow(/verification-failed/);
  });
});
