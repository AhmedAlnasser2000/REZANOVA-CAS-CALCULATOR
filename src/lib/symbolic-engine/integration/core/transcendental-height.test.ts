import {expect,it,vi} from 'vitest';
import {setup,bounds,extend,fresh} from './__tests__/transcendental-support';
import {CertifiedTowerView} from './recursive-certified-tower';
import {integrateTranscendental,verifyTranscendentalDecision} from './transcendental-decision';
import {encodeTranscendentalDecision,decodeTranscendentalDecision} from './transcendental-decision-wire';
import {disableRecursiveProducers} from './__tests__/recursive-replay-support';
it('integrates and independently replays a fully tagged height-eight tower under unchanged limits',()=>{
  const s=setup();let view=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds);
  for(let k=1;k<bounds.towerHeight;k++){
    const cs=Array<bigint>(k+1).fill(0n);cs[k]=1n;view=extend(s.ctx,view,'exponential',view.owner.embed(s.ctx,s.p(cs)),`t${k}`);
  }
  expect(view.owner.height).toBe(8);const input=view.owner.fromInteger(s.ctx,1n),e=integrateTranscendental(s.ctx,view,input,bounds);
  expect(e.kind).toBe('elementary');expect(view.owner.equal(s.ctx,e.primitive!.fieldPart,view.owner.embed(s.ctx,s.x))).toBe(true);
  verifyTranscendentalDecision(fresh(),view,input,e,bounds);const data=encodeTranscendentalDecision(s.ctx,view,input,e,bounds);
  disableRecursiveProducers();try{
    const decoded=decodeTranscendentalDecision(s.ctx,view,input,structuredClone(data),bounds);
    expect(decoded.kind).toBe('elementary');expect(s.ctx.usage.work).toBeLessThan(s.ctx.limits.work);
    expect(s.ctx.usage.allocation).toBeLessThan(s.ctx.limits.allocation);
  }finally{vi.restoreAllMocks();}
},300_000);
