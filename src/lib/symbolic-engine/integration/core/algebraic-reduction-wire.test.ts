import {describe,it,expect,vi} from 'vitest';
import {quadratic,bounds,fresh} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {certifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {encodeAlgebraicGoodReduction,decodeAlgebraicGoodReduction} from './algebraic-good-reduction-wire';
import * as linear from './arithmetic-linear';
import * as modules from './arithmetic-polynomial-module';
import * as factors from './positive-factorization';
import * as hess from './positive-hess';
import * as normal from './reduced-normality';
import * as good from './algebraic-good-reduction';
import {packAlgebraicArtifactData,unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
function mutate(root:unknown,path:readonly(string|number)[],value:unknown){let current=root as Record<string|number,unknown>;for(const key of path.slice(0,-1))current=current[key]as Record<string|number,unknown>;current[path[path.length-1]]=value;}
describe('bounded independent good-reduction replay',()=>{
  it('reconstructs fresh fields without search or elimination producers',()=>{const b=quadratic(),constants=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),source=certifyAlgebraicCurve(b.ctx,b.owner,constants,bounds),proof=certifyAlgebraicGoodReduction(fresh(),source,bounds),data=encodeAlgebraicGoodReduction(fresh(),source,proof,bounds);
    const spies=[vi.spyOn(linear,'solveArithmeticLinearSystem'),vi.spyOn(modules,'arithmeticModuleHermite'),vi.spyOn(factors,'factorPositivePolynomial'),vi.spyOn(hess,'solvePositiveHessSpace'),vi.spyOn(normal,'certifyReducedOrderMaximality'),vi.spyOn(good,'findAlgebraicGoodReductionWithin')];for(const s of spies)s.mockImplementation(()=>{throw Error('producer disabled');});
    try{const decoded=decodeAlgebraicGoodReduction(fresh(),source,structuredClone(data),bounds);expect(decoded.number.prime).not.toBe(proof.number.prime);expect(decoded.curve.genus).toBe(0n);}finally{for(const s of spies)s.mockRestore();}
  });
  it.each(['characteristic','genus','global','maximality','gluing','relation','flag'])('rejects altered good-reduction %s',mutation=>{const b=quadratic(),constants=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),source=certifyAlgebraicCurve(b.ctx,b.owner,constants,bounds),proof=certifyAlgebraicGoodReduction(fresh(),source,bounds),data=encodeAlgebraicGoodReduction(fresh(),source,proof,bounds)as{tag:string;version:number;payload:unknown},body=structuredClone(unpackAlgebraicArtifactData(fresh(),data.payload,bounds));
    if(mutation==='characteristic')mutate(body,['evidence','number','characteristic'],'2');
    if(mutation==='genus')mutate(body,['evidence','model','genus'],'1');
    if(mutation==='global')mutate(body,['evidence','model','globalFunctions','indices'],[]);
    if(mutation==='maximality')mutate(body,['evidence','model','finiteMaximality','locals'],[]);
    if(mutation==='gluing')mutate(body,['evidence','model','toFinite'],[]);
    if(mutation==='relation')mutate(body,['evidence','relation','coefficients'],[]);
    if(mutation==='flag')mutate(body,['evidence','model','verified'],true);
    expect(()=>decodeAlgebraicGoodReduction(fresh(),source,{...data,payload:packAlgebraicArtifactData(fresh(),body,bounds)},bounds)).toThrow();
  });
});
