import {it,expect,vi,afterEach} from 'vitest';
import {FormalPrimitiveDomain} from './formal-primitive';
import {ExecutionContext} from './execution';
import {poly} from './test-support';
import {produceRationalCandidate,checkRationalCandidate} from './rational-decision';
import * as hermite from './hermite-reduction';
import * as lrt from './lrt-reduction';
import {exponentialSetup} from './__tests__/exponential-rational-fixtures';
import {logarithmicSetup} from './__tests__/logarithmic-rational-fixtures';
import {bounds} from './differential-test-support';
import {produceExponentialRationalCandidate,checkExponentialRationalCandidate} from './exponential-rational-decision';
import {produceLogarithmicRationalCandidate,checkLogarithmicRationalCandidate} from './logarithmic-rational-decision';
import {setup,mixed,fresh} from './__tests__/transcendental-support';
import {CertifiedTowerView} from './recursive-certified-tower';
import {produceTranscendentalCandidate,checkTranscendentalCandidate} from './transcendental-decision';
import {quadratic,fresh as algebraFresh} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {produceAlgebraicCandidate,checkAlgebraicCandidate,verifyAlgebraicDecision} from './algebraic-decision';
afterEach(()=>vi.restoreAllMocks());
function candidate(c:object){expect(Object.isFrozen(c)).toBe(true);expect(Object.hasOwn(c,'derivative')).toBe(false);}
it('computes a rational primitive before final target evidence; checking needs no Hermite/LRT search',()=>{
  const s=setup(),ctx=new ExecutionContext(s.ctx.limits),owner=new FormalPrimitiveDomain('x','z'),input=owner.fractions.make(ctx,owner.x.one(ctx),poly(ctx,owner.x,[1,0,1]));
  const c=produceRationalCandidate(ctx,owner,input);candidate(c);expect(ctx.operationToken).toBeUndefined();const work=ctx.usage.work;
  vi.spyOn(hermite,'hermiteReduce').mockImplementation(()=>{throw Error('producer disabled');});
  vi.spyOn(lrt,'lrtReduce').mockImplementation(()=>{throw Error('producer disabled');});
  const e=checkRationalCandidate(ctx,owner,input,c);expect(e.derivative).toBeDefined();expect(ctx.usage.work).toBeGreaterThan(work);expect(ctx.operationToken).toBeUndefined();
  expect(()=>checkRationalCandidate(new ExecutionContext(ctx.limits),owner,owner.fractions.make(ctx,owner.x.one(ctx),owner.x.one(ctx)),c)).toThrow();
  expect(()=>checkRationalCandidate(new ExecutionContext({...ctx.limits,work:1}),owner,input,c)).toThrow('resource-limit');
});
it.each([false,true])('separates exponential positive/negative candidates (%s)',negative=>{
  const s=exponentialSetup(),input=negative?s.F.make(s.ctx,[s.c(1)],[s.x,s.c(1)]):s.t;
  const c=produceExponentialRationalCandidate(s.ctx,s.F,input,bounds);candidate(c);
  const e=checkExponentialRationalCandidate(new ExecutionContext(s.ctx.limits),s.F,input,c,bounds);
  expect(e.kind).toBe(negative?'non-elementary':'elementary');
  expect(()=>checkExponentialRationalCandidate(new ExecutionContext(s.ctx.limits),s.F,s.F.add(s.ctx,input,s.c(1)),c,bounds)).toThrow();
});
it.each([false,true])('separates logarithmic positive/negative candidates (%s)',negative=>{
  const s=logarithmicSetup(),input=negative?s.F.inverse(s.ctx,s.t):s.t;
  const c=produceLogarithmicRationalCandidate(s.ctx,s.F,input,bounds);candidate(c);
  const e=checkLogarithmicRationalCandidate(new ExecutionContext(s.ctx.limits),s.F,input,c,bounds);expect(e.kind).toBe(negative?'non-elementary':'elementary');
});
it('keeps recursive candidate ownership and final derivative evidence separate',()=>{
  const s=mixed(true),f=s.owner,input=f.generator(s.ctx);
  const c=produceTranscendentalCandidate(s.ctx,s.view,input,bounds);candidate(c);
  const e=checkTranscendentalCandidate(fresh(),s.view,input,c,bounds);expect(e.kind).toBe('elementary');expect(e.derivative).not.toBeNull();
  const q=setup(),foreign=CertifiedTowerView.rationalFunctions(q.ctx,q.f,bounds);
  expect(()=>checkTranscendentalCandidate(fresh(),foreign,q.x,c,bounds)).toThrow();
});
it('records complete algebraic arithmetic for a candidate and its subsequent checker',()=>{
  const b=quadratic(),curve=certifyAlgebraicCurve(b.ctx,b.owner,certifyAlgebraicConstantField(b.ctx,b.owner,bounds),bounds),input=b.owner.inverse(b.ctx,b.a);
  const c=produceAlgebraicCandidate(algebraFresh(),curve,input,bounds);candidate(c);
  const e=checkAlgebraicCandidate(algebraFresh(),curve,input,c,bounds);expect(e.kind).toBe('elementary');verifyAlgebraicDecision(algebraFresh(),curve,input,e,bounds);
  expect(()=>checkAlgebraicCandidate(algebraFresh(),curve,b.owner.fromInteger(b.ctx,0n),c,bounds)).toThrow();
});
