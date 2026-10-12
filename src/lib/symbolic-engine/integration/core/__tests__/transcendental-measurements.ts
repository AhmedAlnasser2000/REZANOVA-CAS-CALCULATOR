/** Serial opt-in measurements; file I/O and JSON transfer are outside timed operations. */
import {registerHooks} from 'node:module';
import {writeFileSync} from 'node:fs';
import {cpus} from 'node:os';
registerHooks({resolve(specifier,context,nextResolve){try{return nextResolve(specifier,context);}catch(error){if(specifier.startsWith('.')&&!specifier.endsWith('.ts'))return nextResolve(`${specifier}.ts`,context);throw error;}}});
const {setup,bounds,extend,fresh}=await import('./transcendental-support');
const {CertifiedTowerView}=await import('../recursive-certified-tower');
const {differentiate}=await import('../differential-derivative');
const {integrateTranscendental,verifyTranscendentalDecision}=await import('../transcendental-decision');
const {encodeTranscendentalDecision,decodeTranscendentalDecision}=await import('../transcendental-decision-wire');
type Ctx=ReturnType<typeof fresh>;
type Sample={ms:number;work:number;allocation:number;rss:number;heapUsed:number};
const output=process.argv[2];if(!output)throw Error('output path required');
const results:Record<string,Record<string,Sample[]>>={},bytes:Record<string,number>={};
function fixture(s:ReturnType<typeof setup>,name:string){
  let view=CertifiedTowerView.rationalFunctions(s.ctx,s.f,bounds);
  if(name==='heightEight')for(let k=1;k<bounds.towerHeight;k++){const cs=Array<bigint>(k+1).fill(0n);cs[k]=1n;view=extend(s.ctx,view,'exponential',view.owner.embed(s.ctx,s.p(cs)),`t${k}`);}
  else if(name!=='rational'){
    const log=name==='logarithmic'||name==='mixedLogFirst'||name==='nestedLogarithms';view=extend(s.ctx,view,log?'logarithm':'exponential',s.x,'s');
    if(name.startsWith('mixed'))view=extend(s.ctx,view,log?'exponential':'logarithm',view.owner.embed(s.ctx,s.x),'t');
    if(name==='nestedExponential'||name==='nestedLogarithms')view=extend(s.ctx,view,name==='nestedExponential'?'exponential':'logarithm',view.owner.generator(s.ctx),'t');
  }
  const f=view.owner,t=f.generator(s.ctx);let input=f.fromInteger(s.ctx,1n);
  if(name==='rational')input=s.p([1],[1,0,1]);
  if(name==='logarithmic')input=f.multiply(s.ctx,t,t);
  if(name==='exponential')input=t;
  if(name.startsWith('mixed'))input=differentiate(s.ctx,f,f.multiply(s.ctx,t,f.embed(s.ctx,view.parent!.owner.generator(s.ctx)))).derivative;
  if(name==='nestedExponential')input=f.multiply(s.ctx,f.embed(s.ctx,view.rate!),t);
  if(name==='nestedLogarithms')input=f.exactDivide(s.ctx,f.embed(s.ctx,view.rate!),t);
  return {view,input};
}
function run<T>(name:string,operation:string,i:number,ctx:Ctx,fn:()=>T):T{
  const before=ctx.usage,start=performance.now(),value=fn(),ms=performance.now()-start;
  if(i>=0){results[name]??={};results[name][operation]??=[];const {rss,heapUsed}=process.memoryUsage();results[name][operation].push({ms,work:ctx.usage.work-before.work,allocation:ctx.usage.allocation-before.allocation,rss,heapUsed});}
  return value;
}
function save(){writeFileSync(output,JSON.stringify({primary_agent:'codex',primary_agent_model:'gpt-6',primary_agent_family:'sol',recorded_by_agent:'codex',recorded_by_agent_model:'gpt-6',recorded_by_agent_family:'sol',verified_by_agent:'codex',verified_by_agent_model:'gpt-6',verified_by_agent_family:'sol',attribution_basis:'live',node:process.version,cpu:cpus()[0]?.model,warmups:2,runs:5,limits:fresh().limits,bounds,bytes,results},null,2)+'\n');}
for(const name of ['rational','logarithmic','exponential','mixedLogFirst','mixedExpFirst','nestedExponential','nestedLogarithms','heightEight']){
  for(let i=-2;i<5;i++){
    const s=setup(),{view,input}=run(name,'construction',i,s.ctx,()=>fixture(s,name));
    const solve=fresh(),e=run(name,'integration',i,solve,()=>integrateTranscendental(solve,view,input,bounds));
    const verify=fresh();run(name,'verification',i,verify,()=>verifyTranscendentalDecision(verify,view,input,e,bounds));
    const encode=fresh(),data=run(name,'encoding',i,encode,()=>encodeTranscendentalDecision(encode,view,input,e,bounds));
    const text=JSON.stringify(data);bytes[name]=Buffer.byteLength(text);const parsed=JSON.parse(text),decode=fresh();
    run(name,'decoding',i,decode,()=>decodeTranscendentalDecision(decode,view,input,parsed,bounds));
    if(i>=0)save();if(name==='heightEight')console.log(`Height-eight ${i<0?'warm-up':'sample'} ${i<0?i+3:i+1} complete`);
  }
  console.log(`Measured ${name}`);
}
save();
