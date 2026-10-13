import {writeFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import {startIntegration} from './service';
import {DEFAULT_INTEGRATION_LIMITS} from './types';

// Optional serial observations, separate from ordinary correctness assertions.
// These establish stage accounting; there is no Gate 1 speed target.
it.skipIf(!process.env.CALCWIZ_INTEGRATION_STAGE_MEASUREMENTS)('records answer/check/export observations separately',()=>{
  const samples=[];
  for(const source of ['\\int x\\,dx','\\int \\frac{1}{x^2+1}\\,dx','\\int e^x\\,dx','\\int \\frac{e^x}{x}\\,dx']){
    const records=[];
    for(let index=-2;index<5;index++){
      const started=performance.now();let candidateAt=0,candidateUsage={work:0,allocation:0};
      const p=startIntegration({request:{source,limits:DEFAULT_INTEGRATION_LIMITS}},preview=>{candidateAt=performance.now()-started;candidateUsage=preview.usage;});
      expect(p.response.document.outcomeKind).toBe('success');expect(p.exportArtifact).toBeDefined();
      const exportResult=p.exportArtifact!();expect(exportResult.artifact).toBeTypeOf('string');
      if(index>=0)records.push({candidateAt,timings:exportResult.timings,candidateUsage,verifiedUsage:p.response.usage,
        exportUsage:exportResult.usage,totalMs:performance.now()-started,artifactBytes:Buffer.byteLength(exportResult.artifact!),heap:process.memoryUsage()});
    }
    samples.push({source,records});
  }
  writeFileSync(process.env.CALCWIZ_INTEGRATION_STAGE_MEASUREMENTS!,JSON.stringify({gate:'INTEGRATION-SOLVER-VERIFIER-SEPARATION1',
    primary_agent:'codex',primary_agent_model:'gpt-6',primary_agent_family:'sol',recorded_by_agent:'codex',recorded_by_agent_model:'gpt-6',recorded_by_agent_family:'sol',
    verified_by_agent:'codex',verified_by_agent_model:'gpt-6',verified_by_agent_family:'sol',attribution_basis:'live',
    profile:DEFAULT_INTEGRATION_LIMITS,node:process.version,warmups:2,samples:5,serial:true,speedClaim:false,cases:samples},null,2)+'\n');
},60000);
