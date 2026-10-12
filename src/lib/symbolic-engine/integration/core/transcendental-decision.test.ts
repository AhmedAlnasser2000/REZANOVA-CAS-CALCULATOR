import {describe,expect,it} from 'vitest';
import {setup,mixed,extend,bounds,fresh} from './__tests__/transcendental-support';
import {CertifiedTowerView} from './recursive-certified-tower';
import {differentiate} from './differential-derivative';
import {integrateTranscendental,verifyTranscendentalDecision} from './transcendental-decision';
import type {DifferentialElement as E} from './differential-field';
function check(s: ReturnType<typeof setup>,view: CertifiedTowerView,input: E,expected?: E){
  const e=integrateTranscendental(s.ctx,view,input,bounds);verifyTranscendentalDecision(fresh(),view,input,e,bounds);
  expect(e.kind).toBe('elementary');if(expected){expect(e.primitive!.terms).toHaveLength(0);expect(view.owner.equal(s.ctx,e.primitive!.fieldPart,expected)).toBe(true);}
  return e;
}
describe('complete recursive exp/log decisions checkpoint B',()=>{
  it.each([[0],[1],[0,1],[1,0,1]].map(ns=>({ns})))('integrates the rational base $ns',({ns})=>{
    const s=setup(),view=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds);check(s,view,s.p(ns,[1,0,1]));
  });
  it('integrates independent exponential families',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),first=extend(s.ctx,root,'exponential',s.x,'t');
    const view=extend(s.ctx,first,'exponential',first.owner.embed(s.ctx,s.p([0,0,1])),'u'),f=view.owner,t=f.embed(s.ctx,first.owner.generator(s.ctx)),u=f.generator(s.ctx);
    const input=f.add(s.ctx,t,f.multiply(s.ctx,f.embed(s.ctx,s.p([0,2])),u));check(s,view,input,f.add(s.ctx,t,u));
  });
  it.each([true,false])('integrates mixed towers in either order (%s)',logFirst=>{
    const s=mixed(logFirst),f=s.owner,a=f.embed(s.ctx,s.first.owner.generator(s.ctx)),b=f.generator(s.ctx),expected=f.multiply(s.ctx,a,b);
    const exponential=logFirst?b:a,logarithm=logFirst?a:b,input=f.multiply(s.ctx,exponential,f.add(s.ctx,logarithm,f.embed(s.ctx,s.p([1],[0,1]))));
    check(s,s.view,input,expected);
  });
  it('integrates nested exponentials and inverse powers',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),first=extend(s.ctx,root,'exponential',s.x,'s');
    const view=extend(s.ctx,first,'exponential',first.owner.generator(s.ctx),'t'),f=view.owner,t=f.generator(s.ctx),a=f.embed(s.ctx,view.rate!);
    check(s,view,f.multiply(s.ctx,a,t),t);const inverse=f.inverse(s.ctx,t);
    check(s,view,f.negate(s.ctx,f.multiply(s.ctx,a,inverse)),inverse);
  });
  it('integrates nested logarithms, retaining the actual inverse-log exclusion',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),first=extend(s.ctx,root,'logarithm',s.x,'s');
    const view=extend(s.ctx,first,'logarithm',first.owner.generator(s.ctx),'t'),f=view.owner,t=f.generator(s.ctx),eta=f.embed(s.ctx,view.rate!);
    const input=f.exactDivide(s.ctx,eta,t),e=check(s,view,input);expect(e.primitive!.terms).toHaveLength(1);
    expect(e.conditions.some(c=>c.category==='log-norm'&&f.equal(s.ctx,c.value,t))).toBe(true);
    const square=f.multiply(s.ctx,t,t);check(s,view,f.exactDivide(s.ctx,eta,square),f.negate(s.ctx,f.inverse(s.ctx,t)));
  });
  it('constructs algebraic all-root residues over a mixed parent',()=>{
    const s=mixed(false),f=s.owner,t=f.generator(s.ctx),eta=f.embed(s.ctx,s.view.rate!),input=f.exactDivide(s.ctx,eta,f.add(s.ctx,f.multiply(s.ctx,t,t),f.fromInteger(s.ctx,1n)));
    const e=check(s,s.view,input);expect(e.primitive!.terms[0].modulus.coefficients).toHaveLength(3);expect(e.residue!.descent.length).toBeGreaterThan(0);
  });
  it('reduces repeated normal poles with rational and root-log additions',()=>{
    const s=mixed(),f=s.owner,t=f.generator(s.ctx),x=f.embed(s.ctx,s.x),g=f.add(s.ctx,t,x),den=f.multiply(s.ctx,f.add(s.ctx,x,f.fromInteger(s.ctx,1n)),f.multiply(s.ctx,g,g));
    const v=f.inverse(s.ctx,den),input=f.add(s.ctx,differentiate(s.ctx,f,v).derivative,f.exactDivide(s.ctx,differentiate(s.ctx,f,g).derivative,g));
    const e=check(s,s.view,input);expect(e.hermite!.blocks.some(b=>b.steps.length>0)).toBe(true);expect(e.primitive!.terms.length).toBeGreaterThan(0);
  });
  it('certifies a nonconstant normal residue at a nested exponential level',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),first=extend(s.ctx,root,'exponential',s.x,'s');
    const view=extend(s.ctx,first,'exponential',first.owner.generator(s.ctx),'t'),f=view.owner,input=f.inverse(s.ctx,f.add(s.ctx,f.generator(s.ctx),f.embed(s.ctx,s.x)));
    const e=integrateTranscendental(s.ctx,view,input,bounds);verifyTranscendentalDecision(fresh(),view,input,e,bounds);
    expect(e.kind).toBe('non-elementary');expect(e.obstruction!.kind).toBe('normal-residue');expect(e.parent).toBeNull();
  });
  it('certifies a mixed logarithmic polynomial obstruction',()=>{
    const s=mixed(false),f=s.owner,input=f.exactDivide(s.ctx,f.generator(s.ctx),f.embed(s.ctx,s.p([1,1])));
    const e=integrateTranscendental(s.ctx,s.view,input,bounds);verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);
    expect(e.obstruction!.kind).toBe('logarithmic-coefficient');expect(e.polynomial!.steps[0].limited.kind).toBe('no-field-solution');
  });
  it('certifies a nested exponential component obstruction',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),first=extend(s.ctx,root,'exponential',s.x,'s');
    const view=extend(s.ctx,first,'exponential',first.owner.generator(s.ctx),'t'),input=view.owner.generator(s.ctx);
    const e=integrateTranscendental(s.ctx,view,input,bounds);verifyTranscendentalDecision(fresh(),view,input,e,bounds);
    expect(e.obstruction!.kind).toBe('exponential-component');expect(e.laurent!.steps[0].rde.kind).toBe('no-field-solution');
  });
  it('propagates a parent non-elementary decision through an admitted elementary extension',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),first=extend(s.ctx,root,'exponential',s.p([0,0,1]),'s');
    const view=extend(s.ctx,first,'exponential',first.owner.embed(s.ctx,s.x),'t'),input=view.owner.embed(s.ctx,first.owner.generator(s.ctx));
    const e=integrateTranscendental(s.ctx,view,input,bounds);verifyTranscendentalDecision(fresh(),view,input,e,bounds);
    expect(e.obstruction!.kind).toBe('parent-decision');expect(e.parent!.obstruction!.kind).toBe('exponential-component');
  });
});
