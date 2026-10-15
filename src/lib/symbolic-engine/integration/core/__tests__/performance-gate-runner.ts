import {registerHooks} from 'node:module';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
import {cpus,totalmem} from 'node:os';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(`${specifier}.ts`,context);throw error;}}});
const {startPerformanceProcess}=await import('./performance-watchdog');
const {summarizePerformance,performanceStages}=await import('./performance-acceptance');
const [output,core=resolve('src/lib/symbolic-engine/integration/core'),...fixtures]=process.argv.slice(2);
if(!output||!fixtures.length)throw Error('output path, explicit core path and named fixtures required');
const inside=relative(resolve('.task_tmp'),resolve(output));
if(!inside||inside.startsWith('..')||isAbsolute(inside))throw Error('Serial measurement output belongs in ignored .task_tmp storage; committing it requires explicit user approval.');
if(existsSync(output))throw Error('Preserve prior complete/interrupted records: choose a new output filename.');
mkdirSync(dirname(output),{recursive:true});
const results:Record<string,Awaited<ReturnType<typeof startPerformanceProcess>>>={},progress:unknown[]=[];
const acceptance:Record<string,ReturnType<typeof summarizePerformance>>={};
const save=()=>writeFileSync(output,JSON.stringify({gate:'INTEGRATION-PERFORMANCE1',primary_agent:'codex',primary_agent_model:'gpt-6',primary_agent_family:'sol',
  recorded_by_agent:'codex',recorded_by_agent_model:'gpt-6',recorded_by_agent_family:'sol',verified_by_agent:'codex',verified_by_agent_model:'gpt-6',verified_by_agent_family:'sol',attribution_basis:'live',
  node:process.version,cpu:cpus()[0]?.model,memory:totalmem(),core,warmups:2,samples:5,watchdogMs:60000,serial:true,results,acceptance,progress},null,2)+'\n');
for(const fixture of fixtures)performanceStages(fixture);
for(const fixture of fixtures){
  results[fixture]=await startPerformanceProcess(fixture,core,event=>{progress.push(event);save();});
  acceptance[fixture]=summarizePerformance(fixture,results[fixture]);save();
  console.log(`${fixture}: ${results[fixture].status}, acceptance ${acceptance[fixture].passed?'passed':'incomplete/failed'}`);
  if(!acceptance[fixture].passed)process.exitCode=1;
  if(results[fixture].status!=='completed'){process.exitCode=1;break;}
}
