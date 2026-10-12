import {afterEach,describe,expect,it,vi} from 'vitest';
import {setup,mixed,extend,bounds,fresh} from './__tests__/transcendental-support';
import {CertifiedTowerView} from './recursive-certified-tower';
import {integrateTranscendental,verifyTranscendentalDecision} from './transcendental-decision';
import {encodeTranscendentalDecision,decodeTranscendentalDecision} from './transcendental-decision-wire';
import {disableRecursiveProducers} from './__tests__/recursive-replay-support';
import * as decisions from './transcendental-decision';
import * as hermite from './first-level-rational-hermite';
import * as residues from './first-level-rational-residue';
import * as selection from './first-level-rational-selection';
import * as rational from './rational-decision-internal';
import * as rationalHermite from './hermite-reduction';
import * as primitive from './first-level-rational-primitive';
import {packRecursiveArtifactGraph,unpackRecursiveArtifactGraph} from './recursive-artifact-graph';
import {ExecutionContext} from './execution';

type Data={[key:string]:any}; // eslint-disable-line @typescript-eslint/no-explicit-any
const clone=(v:unknown):Data=>JSON.parse(JSON.stringify(v)) as Data;
afterEach(()=>vi.restoreAllMocks());
function fixture(route: string){
  const s=mixed(route==='exponential'),f=s.owner,t=f.generator(s.ctx),x=f.embed(s.ctx,s.x);
  const input=route==='residue'?f.inverse(s.ctx,f.add(s.ctx,t,x)):
    route==='polynomial'?f.exactDivide(s.ctx,t,f.add(s.ctx,x,f.fromInteger(s.ctx,1n))):
    route==='exponential'?t:f.exactDivide(s.ctx,f.embed(s.ctx,s.view.rate!),f.add(s.ctx,f.multiply(s.ctx,t,t),f.fromInteger(s.ctx,1n)));
  return {...s,input};
}
function disable(){
  disableRecursiveProducers();const fail=()=>{throw Error('integration producer during replay');};
  vi.spyOn(decisions,'integrateTranscendentalWithin').mockImplementation(fail);vi.spyOn(decisions,'integrateTranscendental').mockImplementation(fail);
  vi.spyOn(hermite,'firstLevelHermite').mockImplementation(fail);vi.spyOn(residues,'firstLevelResidues').mockImplementation(fail);
  vi.spyOn(selection,'selectFirstLevelResidues').mockImplementation(fail);vi.spyOn(rational,'integrateRationalWithin').mockImplementation(fail);
  vi.spyOn(rationalHermite,'hermiteReduce').mockImplementation(fail);vi.spyOn(primitive,'differentiateFirstLevelPrimitive').mockImplementation(fail);
  vi.spyOn(primitive,'differentiateFirstLevelPrimitiveWithin').mockImplementation(fail);
}
describe('bounded independent transcendental decision replay',()=>{
  it.each(['positive','residue','polynomial','exponential'])('replays %s in fresh owners with producers disabled',route=>{
    const s=fixture(route),e=integrateTranscendental(s.ctx,s.view,s.input,bounds),data=encodeTranscendentalDecision(fresh(),s.view,s.input,e,bounds),t=fixture(route);
    disable();const decoded=decodeTranscendentalDecision(fresh(),t.view,t.input,structuredClone(data),bounds);
    expect(decoded.kind).toBe(e.kind);expect(decoded.obstruction?.kind).toBe(e.obstruction?.kind);
    verifyTranscendentalDecision(fresh(),t.view,t.input,decoded,bounds);
    expect(encodeTranscendentalDecision(fresh(),t.view,t.input,decoded,bounds)).toEqual(data);
  });
  it('replays rational root-log addition without its producers',()=>{
    const s=setup(),view=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),input=s.p([1],[1,0,1]),e=integrateTranscendental(s.ctx,view,input,bounds),data=encodeTranscendentalDecision(fresh(),view,input,e,bounds);
    const t=setup(),expected=CertifiedTowerView.rationalFunctions(t.ctx,t.f,bounds);disable();
    expect(decodeTranscendentalDecision(fresh(),expected,t.p([1],[1,0,1]),data,bounds).primitive!.terms.length).toBeGreaterThan(0);
  });
  it('replays a successful polynomial prefix followed by a checked obstruction',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),view=extend(s.ctx,root,'logarithm',s.x,'t'),f=view.owner,t=f.generator(s.ctx);
    const input=f.add(s.ctx,f.multiply(s.ctx,t,t),f.exactDivide(s.ctx,t,f.embed(s.ctx,s.p([1,1]))));
    const e=integrateTranscendental(s.ctx,view,input,bounds),data=encodeTranscendentalDecision(fresh(),view,input,e,bounds);
    disable();const decoded=decodeTranscendentalDecision(fresh(),view,input,data,bounds);
    expect(decoded.polynomial!.failure).toBe(1);expect(decoded.polynomial!.steps[0].limited.kind).toBe('solutions');
  });
  it('rejects changed construction constants despite equal exponent derivatives',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),view=extend(s.ctx,root,'exponential',s.x,'t'),input=view.owner.generator(s.ctx);
    const e=integrateTranscendental(s.ctx,view,input,bounds),data=encodeTranscendentalDecision(fresh(),view,input,e,bounds);
    const t=setup(),parent=CertifiedTowerView.rationalFunctions(t.ctx,t.f,bounds),other=extend(t.ctx,parent,'exponential',t.p([1,1]),'t');
    expect(()=>decodeTranscendentalDecision(fresh(),other,other.owner.generator(t.ctx),data,bounds)).toThrow('verification-failed');
  });
  it('rejects changed logarithm arguments despite equal logarithmic derivatives',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),view=extend(s.ctx,root,'logarithm',s.x,'t'),input=view.owner.generator(s.ctx);
    const e=integrateTranscendental(s.ctx,view,input,bounds),data=encodeTranscendentalDecision(fresh(),view,input,e,bounds);
    const other=setup(),parent=CertifiedTowerView.rationalFunctions(other.ctx,other.f,bounds),expected=extend(other.ctx,parent,'logarithm',other.p([0,2]),'t');
    expect(()=>decodeTranscendentalDecision(fresh(),expected,expected.owner.generator(other.ctx),data,bounds)).toThrow('verification-failed');
  });
  it('rejects missing coverage, altered decisions, conditions and stored flags',()=>{
    const s=fixture('positive'),e=integrateTranscendental(s.ctx,s.view,s.input,bounds),data=encodeTranscendentalDecision(fresh(),s.view,s.input,e,bounds),outer=clone(data);
    const mutations=[
      (d:Data)=>{d.evidence.conditions=[];},(d:Data)=>{d.evidence.residue.descent=[];},
      (d:Data)=>{d.evidence.residue.evidence.groups=[];},(d:Data)=>{d.evidence.hermite.blocks=[];},
      (d:Data)=>{d.evidence.parent=null;},(d:Data)=>{d.evidence.primitive.terms=[];},
      (d:Data)=>{d.evidence.derivative.terms=[];},(d:Data)=>{d.evidence.kind='non-elementary';},
      (d:Data)=>{d.evidence.verified=true;},(d:Data)=>{d.evidence.rule='guessed';},
    ];
    for(const [i,mutate] of mutations.entries()){
      const expanded=clone(unpackRecursiveArtifactGraph(fresh(),outer.payload,bounds));mutate(expanded);
      const bad={...outer,payload:packRecursiveArtifactGraph(fresh(),expanded,bounds)};
      expect(()=>decodeTranscendentalDecision(fresh(),s.view,s.input,bad,bounds),`mutation ${i}`).toThrow();
    }
    expect(()=>decodeTranscendentalDecision(fresh(),s.view,s.owner.fromInteger(s.ctx,0n),data,bounds)).toThrow('verification-failed');
    expect(()=>decodeTranscendentalDecision(fresh(),s.view,s.input,{...outer,version:2},bounds)).toThrow('invalid-input');
  });
  it.each([{work:10},{allocation:20},{integerBits:1},{degree:0}])('preserves sticky execution exhaustion $0',limit=>{
    const s=fixture('positive'),e=integrateTranscendental(s.ctx,s.view,s.input,bounds),data=encodeTranscendentalDecision(fresh(),s.view,s.input,e,bounds);
    const ctx=new ExecutionContext({...s.ctx.limits,...limit});
    expect(()=>decodeTranscendentalDecision(ctx,s.view,s.input,data,bounds)).toThrow('resource-limit');
    expect(()=>verifyTranscendentalDecision(ctx,s.view,s.input,e,bounds)).toThrow('resource-limit');
  });
  it.each([{artifactDepth:1},{artifactNodes:4},{artifactBytes:10},{towerHeight:1}])('bounds complete evidence before nested replay $0',limit=>{
    const s=fixture('positive'),e=integrateTranscendental(s.ctx,s.view,s.input,bounds),data=encodeTranscendentalDecision(fresh(),s.view,s.input,e,bounds);
    expect(()=>decodeTranscendentalDecision(fresh(),s.view,s.input,data,{...bounds,...limit})).toThrow('resource-limit');
  });
});
