import {beforeAll,describe,it,expect,vi} from 'vitest';
import {base,quadratic,bounds,fresh} from './__tests__/algebraic-support';
import {ellipticDivisor} from './__tests__/algebraic-divisor-support';
import {ExecutionContext} from './execution';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {decomposeAlgebraicPlaces} from './algebraic-place';
import {constructAlgebraicDivisor,scaleAlgebraicDivisorWithin} from './algebraic-divisor';
import {decideAlgebraicDivisorTorsion,verifyAlgebraicDivisorTorsion,type AlgebraicDivisorTorsion} from './algebraic-divisor-torsion';
import {encodeAlgebraicDivisorTorsion,decodeAlgebraicDivisorTorsion} from './algebraic-divisor-torsion-wire';
import {certifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {packAlgebraicArtifactData,unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import * as linear from './arithmetic-linear';
import * as modules from './arithmetic-polynomial-module';
import * as factor from './positive-factorization';
import * as place from './reduced-place';
import * as order from './reduced-divisor-order';
import * as good from './algebraic-good-reduction';
import * as rr from './reduced-riemann-roch';
import * as nativeRr from './algebraic-riemann-roch';
import * as nativePrincipality from './algebraic-rr-principality';
import * as integralModel from './algebraic-place-integral-model';
import * as primes from './factorization-modular';
function change(root:unknown,path:readonly(string|number)[],value:unknown){let current=root as Record<string|number,unknown>;for(const key of path.slice(0,-1))current=current[key]as Record<string|number,unknown>;current[path[path.length-1]]=value;}
describe('independent torsion authority and resources',()=>{
  const holder:{fixture?:ReturnType<typeof ellipticDivisor>;decision?:AlgebraicDivisorTorsion<ReturnType<typeof quadratic>['a']>;wire?:{tag:string;version:number;payload:unknown}}={};
  beforeAll(()=>{const b=ellipticDivisor(2n),decision=decideAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,bounds);holder.fixture=b;holder.decision=decision;holder.wire=encodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,decision,bounds)as typeof holder.wire;},250000);
  it.each(['order','characteristic','exclusions','factors','valuation','genus','mapping','multiple','arithmetic','composite','flag','rr-equality','rr-coverage','rr-witness','integral-indices','integral-inverse'])('rejects altered complete torsion %s',mutation=>{
    const b=holder.fixture!,data=holder.wire!,body=structuredClone(unpackAlgebraicArtifactData(fresh(),data.payload,bounds));
    if(mutation==='order')change(body,['evidence','reductions',0,'order','order'],'1');
    if(mutation==='characteristic')change(body,['evidence','reductions',1,'reduction','number','characteristic'],'2');
    if(mutation==='exclusions')change(body,['evidence','reductions',0,'order','exclusions'],[]);
    if(mutation==='factors')change(body,['evidence','reductions',0,'order','factors'],[]);
    if(mutation==='valuation')change(body,['evidence','reductions',0,'specialization','places',0,'evidence','valuations',0,0,'evidence','value'],'999');
    if(mutation==='genus')change(body,['evidence','reductions',0,'reduction','model','genus'],'0');
    if(mutation==='mapping')change(body,['evidence','reductions',0,'specialization','places'],[]);
    if(mutation==='multiple')change(body,['evidence','multiple'],'1');
    if(mutation==='arithmetic')change(body,['arithmetic','primes'],[]);
    if(mutation==='composite')change(body,['arithmetic','primes'],['4']);
    if(mutation==='flag')change(body,['evidence','verified'],true);
    if(mutation==='rr-equality')change(body,['evidence','principal','equality'],'trusted');
    if(mutation==='rr-coverage')change(body,['evidence','principal','space','basis'],[]);
    if(mutation==='rr-witness')change(body,['evidence','principal','witness'],null);
    if(mutation==='integral-indices')change(body,['evidence','reductions',0,'specialization','places',0,'evidence','model','indices'],[]);
    if(mutation==='integral-inverse')change(body,['evidence','reductions',0,'specialization','places',0,'evidence','model','correspondence','inverse'],[]);
    expect(()=>decodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,{...data,payload:packAlgebraicArtifactData(fresh(),body,bounds)},bounds)).toThrow();
  });
  it('replays with all higher-level producers disabled and rejects a changed request',()=>{
    const b=holder.fixture!,data=holder.wire!,spies=[vi.spyOn(primes,'isFactorPrime'),vi.spyOn(linear,'solveArithmeticLinearSystem'),vi.spyOn(modules,'arithmeticModuleHermite'),vi.spyOn(factor,'factorPositivePolynomial'),vi.spyOn(place,'decomposeReducedPlaces'),vi.spyOn(order,'decideReducedDivisorOrder'),vi.spyOn(good,'findAlgebraicGoodReductionWithin'),vi.spyOn(rr,'solveReducedRiemannRoch'),vi.spyOn(rr,'decideReducedPrincipality'),vi.spyOn(nativeRr,'solveAlgebraicRiemannRochWithin'),vi.spyOn(nativePrincipality,'decideAlgebraicRrPrincipalityWithin'),vi.spyOn(integralModel,'constructAlgebraicPlaceIntegralModel')];for(const s of spies)s.mockImplementation(()=>{throw Error('producer disabled');});
    try{expect(decodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,data,bounds).kind).toBe('torsion');const changed=scaleAlgebraicDivisorWithin(b.ctx,b.curve,b.divisor,2n);expect(()=>decodeAlgebraicDivisorTorsion(fresh(),b.curve,changed,data,bounds)).toThrow(/verification-failed/);const reordered=constructAlgebraicDivisor(b.ctx,b.curve,[...b.divisor.input].reverse(),bounds);expect(()=>decodeAlgebraicDivisorTorsion(fresh(),b.curve,reordered,data,bounds)).toThrow(/verification-failed/);}finally{for(const s of spies)s.mockRestore();}
  },250000);
  it('keeps mathematical failures distinct from exhaustion and resets proof scopes',()=>{
    const b=holder.fixture!,p=holder.decision!,data=holder.wire!,ctx=fresh();verifyAlgebraicDivisorTorsion(ctx,b.curve,b.divisor,p,bounds);const first=ctx.usage.work;verifyAlgebraicDivisorTorsion(ctx,b.curve,b.divisor,p,bounds);expect(ctx.usage.work).toBe(2*first);
    for(const patch of [{work:1},{allocation:1}]){const limited=new ExecutionContext({...fresh().limits,...patch});expect(()=>decideAlgebraicDivisorTorsion(limited,b.curve,b.divisor,bounds)).toThrow(/resource-limit/);expect(()=>limited.tick()).toThrow(/resource-limit/);}
    for(const patch of [{artifactDepth:1},{artifactNodes:1},{artifactBytes:1}])expect(()=>decodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,data,{...bounds,...patch})).toThrow(/resource-limit/);
    expect(()=>decodeAlgebraicDivisorTorsion(fresh(),b.curve,b.divisor,{...data,version:2},bounds)).toThrow(/invalid-input/);
    expect(Object.isFrozen(p)).toBe(true);
  },250000);
});
describe('actual constants and complete specialization',()=>{
  it('uses an extension residue field of the actual hidden constants',()=>{const b=quadratic([0n,0n,2n]),c=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),curve=certifyAlgebraicCurve(b.ctx,b.owner,c,bounds),reduction=certifyAlgebraicGoodReduction(fresh(),curve,bounds);expect(curve.coordinates.basis).toHaveLength(1);expect(reduction.number.residue.ring.degree(b.ctx,reduction.number.residue.modulus)).toBe(2);
    const zero=constructAlgebraicDivisor(b.ctx,curve,[],bounds),result=decideAlgebraicDivisorTorsion(fresh(),curve,zero,bounds);expect('order'in result&&result.order).toBe(1n);const wire=encodeAlgebraicDivisorTorsion(fresh(),curve,zero,result,bounds);expect(decodeAlgebraicDivisorTorsion(fresh(),curve,zero,wire,bounds).kind).toBe('torsion');
  });
  it('specializes a nonrational place completely, allowing different residue degrees',()=>{const b=base(),c=certifyAlgebraicConstantField(b.ctx,b.field,bounds),curve=certifyAlgebraicCurve(b.ctx,b.field,c,bounds),r=curve.finite.lattice.scalar.ring,u=curve.infinity.lattice.scalar.ring,prime=r.make(b.ctx,[r.domain.fromInteger(b.ctx,1n),r.domain.fromInteger(b.ctx,0n),r.domain.fromInteger(b.ctx,1n)]),p=decomposeAlgebraicPlaces(b.ctx,curve,prime,false,bounds).places[0],infinity=decomposeAlgebraicPlaces(b.ctx,curve,u.make(b.ctx,[u.domain.fromInteger(b.ctx,0n),u.domain.fromInteger(b.ctx,1n)]),true,bounds).places[0];const divisor=constructAlgebraicDivisor(b.ctx,curve,[{place:p,coefficient:1n},{place:infinity,coefficient:-2n}],bounds),decision=decideAlgebraicDivisorTorsion(fresh(),curve,divisor,bounds);expect('order'in decision&&decision.order).toBe(1n);if(decision.reason==='two-reduction'){expect(decision.reductions[0].reduction.number.prime.characteristic).not.toBe(2n);expect(decision.reductions[0].specialization.places[0].divisor.degree).toBe(2n);expect(decision.reductions[1].specialization.places[0].divisor.degree).toBe(2n);}
    const nonzero=constructAlgebraicDivisor(b.ctx,curve,[{place:p,coefficient:-1n}],bounds);expect(decideAlgebraicDivisorTorsion(fresh(),curve,nonzero,bounds)).toMatchObject({kind:'non-torsion',reason:'nonzero-degree'});
  },250000);
});
