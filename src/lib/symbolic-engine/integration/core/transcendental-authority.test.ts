import {describe,expect,it} from 'vitest';
import {setup,mixed,extend,bounds,fresh} from './__tests__/transcendental-support';
import {CertifiedTowerView} from './recursive-certified-tower';
import {integrateTranscendental,verifyTranscendentalDecision,type TranscendentalDecision} from './transcendental-decision';
import {differentiate} from './differential-derivative';
import {ExecutionContext} from './execution';
import {DifferentialField} from './differential-field';
function logarithmic(){const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),view=extend(s.ctx,root,'logarithm',s.x,'t');return {...s,view,owner:view.owner,t:view.owner.generator(s.ctx)};}
function exponential(){const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),view=extend(s.ctx,root,'exponential',s.x,'t');return {...s,view,owner:view.owner,t:view.owner.generator(s.ctx)};}
describe('recursive decision authority and complete reduction coverage',()=>{
  it.each([0n,1n,7n])('integrates constant %s in a mixed tower',n=>{
    const s=mixed(),f=s.owner,input=f.fromInteger(s.ctx,n),e=integrateTranscendental(s.ctx,s.view,input,bounds);
    expect(e.kind).toBe('elementary');expect(e.primitive!.terms).toHaveLength(0);
    expect(f.equal(s.ctx,e.primitive!.fieldPart,f.multiply(s.ctx,input,f.embed(s.ctx,s.x)))).toBe(true);
    verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);
  });
  it.each([true,false])('checks seeded native derivative identities and immutability in mixed order %s',order=>{
    const s=mixed(order),f=s.owner,t=f.generator(s.ctx),u=f.embed(s.ctx,s.first.owner.generator(s.ctx));
    for(let seed=1;seed<=3;seed++){
      const part=f.add(s.ctx,f.multiply(s.ctx,f.fromInteger(s.ctx,BigInt(seed)),f.multiply(s.ctx,t,u)),f.multiply(s.ctx,f.embed(s.ctx,s.p([0,0,seed+1])),t));
      const input=differentiate(s.ctx,f,part).derivative,before=JSON.stringify(input,(key,value)=>key==='owner'?undefined:typeof value==='bigint'?value.toString():value);
      const e=integrateTranscendental(s.ctx,s.view,input,bounds);expect(e.kind).toBe('elementary');
      verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);expect(Object.isFrozen(e)&&Object.isFrozen(e.conditions)).toBe(true);
      expect(JSON.stringify(input,(key,value)=>key==='owner'?undefined:typeof value==='bigint'?value.toString():value)).toBe(before);
    }
  });
  it('checks general logarithm arguments, complete evaluation conditions and inverse powers',()=>{
    const s=setup(),root=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds),view=extend(s.ctx,root,'logarithm',s.p([1,1],[0,1]),'t'),f=view.owner,t=f.generator(s.ctx);
    const input=f.exactDivide(s.ctx,f.embed(s.ctx,view.rate!),f.multiply(s.ctx,t,t)),e=integrateTranscendental(s.ctx,view,input,bounds);
    expect(e.kind).toBe('elementary');expect(f.equal(s.ctx,e.primitive!.fieldPart,f.negate(s.ctx,f.inverse(s.ctx,t)))).toBe(true);
    expect(e.conditions.some(c=>c.path.includes('.argument.numerator'))).toBe(true);expect(e.conditions.some(c=>c.path.includes('.argument.denominator'))).toBe(true);
    expect(e.conditions.some(c=>f.equal(s.ctx,c.value,f.multiply(s.ctx,t,t)))).toBe(true);
  });
  it.each(['laurent','residue'])('propagates established parent %s non-elementarity through an admitted log extension',kind=>{
    const s=mixed(false),f=s.owner,parent=s.first.owner,t=parent.generator(s.ctx),x=parent.embed(s.ctx,s.x);
    const input=f.embed(s.ctx,kind==='laurent'?parent.exactDivide(s.ctx,t,x):parent.inverse(s.ctx,parent.add(s.ctx,t,x)));
    const e=integrateTranscendental(s.ctx,s.view,input,bounds);verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);
    expect(e.obstruction!.kind).toBe('parent-decision');expect(e.parent!.obstruction!.kind).toBe(kind==='laurent'?'exponential-component':'normal-residue');
  });
  it('retains a successful logarithmic prefix before a checked obstruction',()=>{
    const s=logarithmic(),f=s.owner,x=f.embed(s.ctx,s.x),one=f.fromInteger(s.ctx,1n),t2=f.multiply(s.ctx,s.t,s.t);
    const input=f.add(s.ctx,t2,f.exactDivide(s.ctx,s.t,f.add(s.ctx,x,one))),e=integrateTranscendental(s.ctx,s.view,input,bounds);
    verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);expect(e.obstruction!.kind).toBe('logarithmic-coefficient');
    expect(e.polynomial!.steps[0].limited.kind).toBe('solutions');expect(e.polynomial!.failure).toBe(1);expect(e.parent).toBeNull();
  });
  it('retains constant residues before polynomial obstruction',()=>{
    const s=logarithmic(),f=s.owner,x=f.embed(s.ctx,s.x),one=f.fromInteger(s.ctx,1n);
    const input=f.add(s.ctx,f.inverse(s.ctx,f.multiply(s.ctx,x,s.t)),f.exactDivide(s.ctx,s.t,f.add(s.ctx,x,one))),e=integrateTranscendental(s.ctx,s.view,input,bounds);
    verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);expect(e.residue!.evidence.nonconstant).toBeNull();expect(e.remainder!.logarithms.terms.length).toBeGreaterThan(0);expect(e.obstruction!.kind).toBe('logarithmic-coefficient');
  });
  it('retains a successful inverse Laurent prefix and complete unperformed component coverage',()=>{
    const s=exponential(),f=s.owner,x=f.embed(s.ctx,s.x),input=f.add(s.ctx,f.inverse(s.ctx,s.t),f.exactDivide(s.ctx,s.t,x)),e=integrateTranscendental(s.ctx,s.view,input,bounds);
    verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);expect(e.laurent!.steps[0].rde.kind).toBe('solutions');expect(e.laurent!.failure).toBe(1);expect(e.obstruction!.kind).toBe('exponential-component');
  });
  it('uses the degree of actual nonzero corrections rather than m+1',()=>{
    const s=logarithmic(),f=s.owner,x=f.embed(s.ctx,s.x),t3=f.multiply(s.ctx,s.t,f.multiply(s.ctx,s.t,s.t));
    const input=f.add(s.ctx,t3,f.exactDivide(s.ctx,f.multiply(s.ctx,f.fromInteger(s.ctx,3n),f.multiply(s.ctx,s.t,s.t)),f.fromInteger(s.ctx,1n)));
    // D(x*t^3)=t^3+3*t^2. The top t^4 correction is zero.
    const e=integrateTranscendental(new ExecutionContext({...s.ctx.limits,degree:3}),s.view,input,bounds);
    expect(e.kind).toBe('elementary');expect(f.equal(s.ctx,e.primitive!.fieldPart,f.multiply(s.ctx,x,t3))).toBe(true);
  });
  it('checks large exact coefficients',()=>{
    const s=exponential(),f=s.owner,n=2n**100n+17n,input=f.multiply(s.ctx,f.fromInteger(s.ctx,n),s.t),e=integrateTranscendental(s.ctx,s.view,input,bounds);
    expect(f.equal(s.ctx,e.primitive!.fieldPart,input)).toBe(true);verifyTranscendentalDecision(fresh(),s.view,input,e,bounds);
  });
  it('preserves alternate native variable names and fresh root binders',()=>{
    const s=setup(),f=DifferentialField.rationalFunctions(s.ctx,s.q,'z',bounds),root=CertifiedTowerView.rationalFunctions(s.ctx,f,bounds);
    const view=extend(s.ctx,root,'exponential',f.generator(s.ctx),'alpha'),t=view.owner.generator(s.ctx),e=integrateTranscendental(s.ctx,view,t,bounds);
    expect(e.domain.z.variable).toBe('z1');expect(e.domain.t.variable).toBe('alpha');expect(view.owner.equal(s.ctx,e.primitive!.fieldPart,t)).toBe(true);
    verifyTranscendentalDecision(fresh(),view,t,e,bounds);
  });
  it.each(['degree','correction','target','steps','conditions','assembly','rule'])('rejects altered logarithmic %s evidence',mutation=>{
    const s=logarithmic(),f=s.owner,input=f.multiply(s.ctx,s.t,s.t),e=integrateTranscendental(s.ctx,s.view,input,bounds),p=e.polynomial!,step=p.steps[0],zero=f.fromInteger(s.ctx,0n);
    let bad:TranscendentalDecision=e;
    if(mutation==='degree')bad={...e,polynomial:{...p,steps:[{...step,degree:1n},...p.steps.slice(1)]}};
    if(mutation==='correction')bad={...e,polynomial:{...p,steps:[{...step,correction:zero},...p.steps.slice(1)]}};
    if(mutation==='target')bad={...e,polynomial:{...p,steps:[{...step,derivative:{input:step.correction!,derivative:zero}},...p.steps.slice(1)]}};
    if(mutation==='steps')bad={...e,polynomial:{...p,steps:[]}};
    if(mutation==='conditions')bad={...e,conditions:e.conditions.slice(1)};
    if(mutation==='assembly')bad={...e,primitive:{...e.primitive!,fieldPart:zero}};
    if(mutation==='rule')bad={...e,rule:'guessed' as typeof e.rule};
    expect(()=>verifyTranscendentalDecision(fresh(),s.view,input,bad,bounds)).toThrow('verification-failed');
  });
  it.each(['support','mapping','target','coverage','obstruction'])('rejects altered Laurent %s evidence',mutation=>{
    const s=exponential(),f=s.owner,input=s.t,e=integrateTranscendental(s.ctx,s.view,input,bounds),l=e.laurent!,step=l.steps[0],zero=f.fromInteger(s.ctx,0n);
    let bad:TranscendentalDecision=e;
    if(mutation==='support')bad={...e,laurent:{...l,powers:[2n]}};
    if(mutation==='mapping')bad={...e,laurent:{...l,steps:[{...step,correction:zero}]}};
    if(mutation==='target')bad={...e,laurent:{...l,steps:[{...step,derivative:{input:step.correction!,derivative:zero}}]}};
    if(mutation==='coverage')bad={...e,laurent:{...l,steps:[]}};
    if(mutation==='obstruction')bad={...e,kind:'non-elementary',obstruction:{kind:'exponential-component',index:0,level:f.height},primitive:null,derivative:null,embedding:null};
    expect(()=>verifyTranscendentalDecision(fresh(),s.view,input,bad,bounds)).toThrow('verification-failed');
  });
  it('rejects foreign values and structurally forged certified views',()=>{
    const s=exponential(),other=exponential();expect(()=>integrateTranscendental(fresh(),s.view,other.t,bounds)).toThrow('domain-mismatch');
    expect(()=>integrateTranscendental(fresh(),{...s.view} as CertifiedTowerView,s.t,bounds)).toThrow('domain-mismatch');
  });
  it.each([{work:10},{allocation:20},{integerBits:1},{degree:0}])('reports execution exhaustion rather than an obstruction $0',limit=>{
    const s=exponential(),input=s.owner.multiply(s.ctx,s.owner.fromInteger(s.ctx,7n),s.t),ctx=new ExecutionContext({...s.ctx.limits,...limit});expect(()=>integrateTranscendental(ctx,s.view,input,bounds)).toThrow('resource-limit');
  });
});
