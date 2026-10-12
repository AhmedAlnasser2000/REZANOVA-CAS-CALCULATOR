import {afterEach, describe, expect, it, vi} from 'vitest';
import {mixed, setup, extend, bounds, fresh} from './__tests__/transcendental-support';
import {TranscendentalDomain} from './transcendental-domain';
import {CertifiedTowerView} from './recursive-certified-tower';
import {DifferentialField} from './differential-field';
import {certifyRecursiveDifferentialExtension} from './recursive-differential-admission';
import {transcendentalLogTerm, transcendentalPrimitive, differentiateTranscendentalPrimitive, verifyTranscendentalPrimitive} from './transcendental-primitive';
import {transcendentalConditions, verifyTranscendentalConditions} from './transcendental-conditions';
import {encodeTranscendentalPrimitive, decodeTranscendentalPrimitive} from './transcendental-primitive-wire';
import {embedTranscendentalPrimitiveWithin, verifyTranscendentalPrimitiveEmbedding, embedTranscendentalRationalPrimitiveWithin, verifyTranscendentalRationalEmbedding} from './transcendental-bridge';
import {FormalPrimitiveDomain} from './formal-primitive';
import {toRationalPrimitiveInput} from './exponential-sum-bridge';
import {integrateRational} from './rational-decision';
import * as derivativeProducer from './differential-derivative';
import * as prs from './subresultant';
import {ExecutionContext} from './execution';
import {rational} from './rational';
import {logarithmicSetup} from './__tests__/logarithmic-rational-fixtures';
import {firstLevelPrimitive, firstLevelLogTerm} from './first-level-rational-primitive';
afterEach(() => vi.restoreAllMocks());
function saved(logFirst = true) {
  const s = mixed(logFirst), d = new TranscendentalDomain(s.ctx, s.view, bounds), f = d.field, t = f.generator(s.ctx), zero = f.fromInteger(s.ctx, 0n);
  const q = (cs: number[]) => d.z.make(s.ctx, cs.map(n => rational(s.ctx,n)));
  const term = transcendentalLogTerm(s.ctx, d, q([1,0,1]), q([1]), d.fz.make(s.ctx, [t, f.fromInteger(s.ctx, -1n)]), bounds);
  const primitive = transcendentalPrimitive(s.ctx, d, f.inverse(s.ctx, t), [term], bounds), derivative = differentiateTranscendentalPrimitive(s.ctx, primitive, bounds);
  return {...s, d, f, t, zero, q, primitive, derivative, target: derivative.derivative, conditions: transcendentalConditions(s.ctx, d, derivative.derivative, primitive)};
}
describe('recursive transcendental primitive checkpoint A', () => {
  it.each([true,false])('verifies root-log primitives in both mixed orders (%s)', logFirst => {
    const s = saved(logFirst); verifyTranscendentalPrimitive(fresh(), s.d, s.primitive, s.target, s.derivative, bounds);
    expect(Object.isFrozen(s.primitive) && Object.isFrozen(s.primitive.terms) && Object.isFrozen(s.primitive.terms[0])).toBe(true);
    expect(s.view.owner.constantField).toBe('unestablished');
  });
  it.each([[-1,0,1],[1,0,1],[-1,-1,0,0,0,1]].map(cs=>({cs})))('includes every root of $cs with independent derivative target', ({cs}) => {
    const s = saved(), q = s.q(cs), term = transcendentalLogTerm(s.ctx, s.d, q, s.q([1]), s.d.fz.make(s.ctx, [s.t, s.f.fromInteger(s.ctx,-1n)]), bounds);
    const p = transcendentalPrimitive(s.ctx, s.d, s.zero, [term], bounds);
    const at = (coeffs: number[]) => coeffs.reduceRight((a,c) => s.f.add(s.ctx,s.f.multiply(s.ctx,a,s.t),s.f.fromInteger(s.ctx,BigInt(c))),s.zero);
    const dt = derivativeProducer.differentiate(s.ctx,s.f,s.t).derivative;
    const target = s.f.exactDivide(s.ctx,s.f.multiply(s.ctx,dt,at(cs.slice(1).map((c,i)=>c*(i+1)))),at(cs));
    verifyTranscendentalPrimitive(fresh(),s.d,p,target,differentiateTranscendentalPrimitive(s.ctx,p,bounds),bounds);
  });
  it('keeps the existing first-level construction guard closed to recursive domains',()=>{
    const s=saved();expect(()=>firstLevelPrimitive(fresh(),s.d,s.zero,[])).toThrow('domain-mismatch');
  });
  it('embeds rational primitives into the rational base and a mixed tower', () => {
    const s = saved(), native = new FormalPrimitiveDomain('x','z'), input = s.p([1],[1,0,1]);
    const source = integrateRational(s.ctx,native,toRationalPrimitiveInput(s.ctx,s.root.owner,native,input));
    for (const view of [s.root,s.view]) {
      const d = new TranscendentalDomain(s.ctx,view,bounds), p = embedTranscendentalRationalPrimitiveWithin(s.ctx,d,source.primitive);
      verifyTranscendentalRationalEmbedding(fresh(),d,source.primitive,p);
      verifyTranscendentalPrimitive(fresh(),d,p,d.field.embed(s.ctx,input),differentiateTranscendentalPrimitive(s.ctx,p,bounds),bounds);
      expect(() => verifyTranscendentalRationalEmbedding(fresh(),d,source.primitive,{...p,terms:[]})).toThrow('verification-failed');
    }
  });
  it('checks parent embeddings with exact moduli, arguments and norms', () => {
    const s = saved(), view = extend(s.ctx,s.view,'exponential',s.t,'u'), d = new TranscendentalDomain(s.ctx,view,bounds);
    const p = embedTranscendentalPrimitiveWithin(s.ctx,d,s.primitive,bounds);
    verifyTranscendentalPrimitiveEmbedding(fresh(),d,s.primitive,p,bounds);
    verifyTranscendentalPrimitive(fresh(),d,p,d.field.embed(s.ctx,s.target),differentiateTranscendentalPrimitive(s.ctx,p,bounds),bounds);
    expect(() => verifyTranscendentalPrimitiveEmbedding(fresh(),d,s.primitive,{...p,fieldPart:d.field.fromInteger(s.ctx,0n)},bounds)).toThrow('verification-failed');
  });
  it('embeds an existing first-level primitive while retaining its native admission and owner', () => {
    const s = logarithmicSetup(), root = CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds);
    const parent = CertifiedTowerView.firstLevel(s.ctx,root,s.F,s.F.admission!,bounds);
    const term = firstLevelLogTerm(s.ctx,s.d,s.Q([1,0,1]),s.Q([1]),s.d.fz.make(s.ctx,[s.t,s.C(-1)]));
    const source = firstLevelPrimitive(s.ctx,s.d,s.t,[term]);
    const view = extend(s.ctx,parent,'exponential',s.F.multiply(s.ctx,s.t,s.t),'u'), d = new TranscendentalDomain(s.ctx,view,bounds);
    const target = embedTranscendentalPrimitiveWithin(s.ctx,d,source,bounds);
    verifyTranscendentalPrimitiveEmbedding(fresh(),d,source,target,bounds);
    expect(d.field.parent).toBe(s.F);
  });
  it.each([{work:10},{allocation:20},{integerBits:2},{degree:1}])('enforces every arithmetic category $0', limit => {
    const s = saved(), ctx = new ExecutionContext({...s.ctx.limits,...limit});
    expect(()=>verifyTranscendentalPrimitive(ctx,s.d,s.primitive,s.target,s.derivative,bounds)).toThrow('resource-limit');
    expect(()=>verifyTranscendentalPrimitive(ctx,s.d,s.primitive,s.target,s.derivative,bounds)).toThrow('resource-limit');
  });
  it('rejects general descriptors anywhere in a supplied tower', () => {
    const s = setup(), root = CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds), owner = DifferentialField.formal(s.ctx,s.f,'t',[s.p([0]),s.p([1])],bounds);
    const e = certifyRecursiveDifferentialExtension(s.ctx,root,owner,{kind:'hyperexponential',integrand:s.p([1])},bounds);
    if (e.kind !== 'admitted') throw Error('fixture');
    expect(() => new TranscendentalDomain(fresh(),e.view,bounds)).toThrow('unsupported general');
    const outer = extend(s.ctx,e.view,'exponential',owner.generator(s.ctx),'u');
    expect(() => new TranscendentalDomain(fresh(),outer,bounds)).toThrow('unsupported general');
  });
  it('retains every construction, coefficient, inverse-log and norm restriction', () => {
    const s = saved(false), conditions = s.conditions;
    expect(conditions.some(e=>e.path==='construction.3.argument.numerator')).toBe(true);
    expect(conditions.some(e=>e.path==='construction.3.argument.denominator')).toBe(true);
    expect(conditions.some(e=>e.path==='primitive.field' && s.f.equal(s.ctx,e.value,s.t))).toBe(true);
    expect(conditions.some(e=>e.category==='log-norm')).toBe(true);
    expect(() => verifyTranscendentalConditions(fresh(),s.d,s.target,s.primitive,conditions.slice(1))).toThrow('verification-failed');
  });
  it.each(['field','target','weight','argument','norm','inverse','modulus','trace','columns','coefficient','coverage'])('rejects mutated %s', mutation => {
    const s = saved(), term = {...s.primitive.terms[0]}, part = {...s.derivative.terms[0]}, proof = {...s.derivative,terms:[part]}, p = {...s.primitive,terms:[term]};let target=s.target;
    if(mutation==='field')p.fieldPart=s.zero;
    if(mutation==='target')target=s.f.add(s.ctx,target,s.f.fromInteger(s.ctx,1n));
    if(mutation==='weight')term.weight=s.q([2]);
    if(mutation==='argument')term.argument=s.d.fz.one(s.ctx);
    if(mutation==='norm')term.norm=s.f.fromInteger(s.ctx,1n);
    if(mutation==='inverse')term.inverse={...term.inverse,kind:'nonunit'} as typeof term.inverse;
    if(mutation==='modulus')term.modulus=s.q([-1,0,1]);
    if(mutation==='trace')part.trace={...part.trace,trace:s.zero};
    if(mutation==='columns')part.trace={...part.trace,columns:[]};
    if(mutation==='coefficient')part.coefficients=[{...part.coefficients[0],derivative:s.zero},...part.coefficients.slice(1)];
    if(mutation==='coverage')proof.terms=[];
    expect(()=>verifyTranscendentalPrimitive(fresh(),s.d,p,target,proof,bounds)).toThrow();
  });
  it('replays a cloned artifact with derivative and resultant producers disabled', () => {
    const s = saved(), data = encodeTranscendentalPrimitive(s.ctx,s.view,s.target,s,bounds);
    vi.spyOn(derivativeProducer,'differentiate').mockImplementation(()=>{throw Error('producer disabled');});
    vi.spyOn(prs,'subresultants').mockImplementation(()=>{throw Error('producer disabled');});
    const replay = decodeTranscendentalPrimitive(fresh(),s.view,s.target,structuredClone(data),bounds);
    expect(replay.primitive.domain.field).toBe(s.f);expect(replay.primitive.terms).toHaveLength(1);
    expect(()=>decodeTranscendentalPrimitive(fresh(),s.view,s.zero,data,bounds)).toThrow('verification-failed');
  });
  it('rejects foreign or forged domains, nonunits and repeated roots', () => {
    const s = saved(), other = saved();
    expect(()=>transcendentalPrimitive(fresh(),s.d,other.t,[],bounds)).toThrow('domain-mismatch');
    expect(()=>transcendentalPrimitive(fresh(),{...s.d,lift:s.d.lift},s.zero,[],bounds)).toThrow('domain-mismatch');
    expect(()=>transcendentalLogTerm(s.ctx,s.d,s.q([1,-2,1]),s.q([1]),s.d.fz.one(s.ctx),bounds)).toThrow();
    expect(()=>transcendentalLogTerm(s.ctx,s.d,s.q([-1,0,1]),s.q([1]),s.d.fz.make(s.ctx,[s.f.fromInteger(s.ctx,-1n),s.f.fromInteger(s.ctx,1n)]),bounds)).toThrow();
  });
  it('starts external operations fresh and enforces stricter replay budgets', () => {
    const s=saved(), ctx=fresh();verifyTranscendentalPrimitive(ctx,s.d,s.primitive,s.target,s.derivative,bounds);const before=ctx.usage.work;
    verifyTranscendentalPrimitive(ctx,s.d,s.primitive,s.target,s.derivative,bounds);expect(ctx.usage.work-before).toBeGreaterThan(100);
    const small=new ExecutionContext({...ctx.limits,work:10});expect(()=>verifyTranscendentalPrimitive(small,s.d,s.primitive,s.target,s.derivative,bounds)).toThrow('resource-limit');
    expect(()=>verifyTranscendentalPrimitive(small,s.d,s.primitive,s.target,s.derivative,bounds)).toThrow('resource-limit');
    const data=encodeTranscendentalPrimitive(s.ctx,s.view,s.target,s,bounds);
    expect(()=>decodeTranscendentalPrimitive(fresh(),s.view,s.target,data,{...bounds,artifactNodes:5})).toThrow('resource-limit');
    expect(()=>decodeTranscendentalPrimitive(fresh(),s.view,s.target,data,{...bounds,towerHeight:2})).toThrow('resource-limit');
  });
});
