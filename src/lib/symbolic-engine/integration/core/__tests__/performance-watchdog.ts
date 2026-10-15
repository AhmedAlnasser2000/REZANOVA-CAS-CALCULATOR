import {fork,type ChildProcess} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';

export interface PerformanceEvent {
  event:'started'|'sample'|'finished'|'failure'|'cycle-started'|'cycle-finished'; fixture:string; stage?:string;
  sample?:number; milliseconds?:number; work?:number; allocation?:number;
  bytes?:number; heapUsed?:number; rss?:number; highWaterRss?:number; message?:string;
}
export interface WatchedOperation {
  status:'completed'|'failed'|'watchdog-stopped';elapsedMs:number;stage?:string;
  stageElapsedMs:number;stoppedAt:string;
  events:PerformanceEvent[];rss:number;highWaterRss:number;
  stoppedScope?:'operation'|'cycle';cycleElapsedMs?:number;
  developmentOnly:true;mathematicalDecision:false;
}
/** Development-only parent deadline. Synchronous mathematics cannot prevent its
 * parent from stopping it. No production/user timeout or budget is changed. */
export function watchPerformanceProcess(child:ChildProcess,onProgress:(e:PerformanceEvent)=>void,timeout=60000):Promise<WatchedOperation>{
  const started=performance.now(),events:PerformanceEvent[]=[];let stageStarted=started,stage:string|undefined,rss=0,highWaterRss=0,done=false;
  let cycle:{fixture:string;sample:number|undefined;started:number}|undefined,cycleDeadline:ReturnType<typeof setTimeout>|undefined;
  return new Promise(resolve=>{
    const finish=(status:WatchedOperation['status'],stoppedScope?:'operation'|'cycle')=>{
      if(done)return;done=true;clearTimeout(deadline);clearTimeout(cycleDeadline);clearInterval(memory);child.removeAllListeners();
      resolve({status,elapsedMs:performance.now()-started,stageElapsedMs:performance.now()-stageStarted,stoppedAt:new Date().toISOString(),stage,events,rss,highWaterRss,stoppedScope,
        cycleElapsedMs:cycle?performance.now()-cycle.started:undefined,developmentOnly:true,mathematicalDecision:false});
    };
    let deadline=setTimeout(()=>{child.kill('SIGKILL');finish('watchdog-stopped','operation');},timeout);
    const arm=()=>{clearTimeout(deadline);stageStarted=performance.now();deadline=setTimeout(()=>{child.kill('SIGKILL');finish('watchdog-stopped','operation');},timeout);};
    const memory=setInterval(()=>{
      if(!child.pid)return;
      try{const text=readFileSync(`/proc/${child.pid}/status`,'utf8');
        const current=/^VmRSS:\s+(\d+) kB/m.exec(text),peak=/^VmHWM:\s+(\d+) kB/m.exec(text);
        if(current)rss=Math.max(rss,Number(current[1])*1024);if(peak)highWaterRss=Math.max(highWaterRss,Number(peak[1])*1024);
      }catch{/* A completed/unsupported process has no live memory sample. */}
    },100);
    child.on('message',(data:PerformanceEvent)=>{
      events.push(data);if(data.stage)stage=data.stage;if(data.event==='started')arm();onProgress(data);
      if(data.event==='cycle-started'){
        if(cycle){child.kill('SIGKILL');finish('failed');return;}
        cycle={fixture:data.fixture,sample:data.sample,started:performance.now()};
        cycleDeadline=setTimeout(()=>{child.kill('SIGKILL');finish('watchdog-stopped','cycle');},timeout);
      }
      if(data.event==='cycle-finished'){
        if(!cycle||cycle.fixture!==data.fixture||cycle.sample!==data.sample){child.kill('SIGKILL');finish('failed');return;}
        clearTimeout(cycleDeadline);cycleDeadline=undefined;cycle=undefined;
      }
      if(data.event==='failure'){child.kill('SIGKILL');finish('failed');}
    });
    child.on('error',()=>finish('failed'));child.on('exit',code=>finish(code===0&&!cycle&&events.some(e=>e.event==='finished')?'completed':'failed'));
  });
}
export function startPerformanceProcess(fixture:string,core:string,output:(e:PerformanceEvent)=>void){
  return watchPerformanceProcess(fork(new URL('./performance-workload.ts',import.meta.url),[fixture,core],{stdio:['ignore','inherit','inherit','ipc'],execArgv:[]}),output);
}
