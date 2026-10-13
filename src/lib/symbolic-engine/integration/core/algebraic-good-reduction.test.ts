import {describe,it,expect,vi} from 'vitest';
import {quadratic,bounds,fresh} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {certifyAlgebraicGoodReduction,verifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {decomposeReducedPlaces} from './reduced-place';
import * as linear from './arithmetic-linear';
import * as factors from './positive-factorization';
import * as hess from './positive-hess';
describe('certified tame smooth proper reductions',()=>{
  it.each([[0n,1n],[0n,0n,0n,1n],[-2n,0n,0n,1n]].map(p=>({p})))('certifies full normal charts and geometric constants for $p',({p})=>{
    const b=quadratic(p),constants=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),source=certifyAlgebraicCurve(b.ctx,b.owner,constants,bounds),proof=certifyAlgebraicGoodReduction(fresh(),source,bounds);
    expect(proof.number.prime.characteristic>2n).toBe(true);expect(proof.model.globalFunctions.basis).toHaveLength(1);
    const spies=[vi.spyOn(linear,'solveArithmeticLinearSystem'),vi.spyOn(factors,'factorPositivePolynomial'),vi.spyOn(hess,'solvePositiveHessSpace')];for(const s of spies)s.mockImplementation(()=>{throw Error('producer disabled');});
    try{verifyAlgebraicGoodReduction(fresh(),source,proof,bounds);}finally{for(const s of spies)s.mockRestore();}
    const order=proof.curve.infinity,r=order.lattice.field.ring,places=decomposeReducedPlaces(fresh(),proof.curve,r.x(fresh()),true);
    expect(places.places.reduce((s,p)=>s+p.ramification*p.residueDegree,0n)).toBe(2n);
  });
});
