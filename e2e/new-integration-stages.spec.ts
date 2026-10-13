import {test,expect} from '@playwright/test';
import {openLauncherApp,setMathFieldLatex} from './helpers';
import {installClipboardCapture} from './calculus-integral-evidence';

// Real native computation; only delivery of the final checked message and the
// subsequent export command is held. Service tests cover the computation order.
test('Integration shows unchecked output, Verified before export, and honest stopped/failed states',async({page},info)=>{
  await page.addInitScript(()=>{
    const state={mode:'hold',checked:undefined as undefined|(()=>void),export:undefined as undefined|(()=>void),release:undefined as unknown as (kind:'checked'|'export')=>void,failed:false,exhausted:false};
    (window as unknown as {integrationStageTest:typeof state}).integrationStageTest=state;
    state.release=kind=>{const run=state[kind];state[kind]=undefined;run?.();};
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker{
      private callback: Worker['onmessage']=null;
      private integration:boolean;
      constructor(url:string|URL,options?:WorkerOptions){super(url,options);this.integration=String(url).includes('integration.worker');
        super.addEventListener('message',event=>{
          const send=()=>this.callback?.call(this,event);
          if(this.integration && event.data.phase==='verified' && state.mode==='hold'){
            state.checked=()=>{
              if(state.failed||state.exhausted){const response={...event.data.response,failedStage:'verify',checks:[],
                document:{version:7,outcomeKind:'error',title:state.failed?'Verification failed':'Execution limit reached',error:'Controlled checking interruption',warnings:[]},
                ...(state.exhausted?{stop:'work'}:{})};this.callback?.call(this,new MessageEvent('message',{data:{phase:'failure',id:event.data.id,response}}));}
              else send();
            };
          }else send();
        });
      }
      override get onmessage(){return this.callback;}
      override set onmessage(value:Worker['onmessage']){this.callback=value;}
      override postMessage(message:unknown,transfer:Transferable[]|StructuredSerializeOptions={}){
        const options=Array.isArray(transfer)?{transfer}:transfer;
        if(this.integration && (message as {phase?:string}).phase==='export' && state.mode==='hold')state.export=()=>super.postMessage(message,options);
        else super.postMessage(message,options);
      }
    };
  });
  await installClipboardCapture(page);await page.goto('/');await openLauncherApp(page,'Calculus','New Integration');
  const workspace=page.getByTestId('new-integration-page'),result=workspace.getByTestId('integration-result');
  const begin=async(input:string)=>{await setMathFieldLatex(page,input,'new-integration-editor');await workspace.getByRole('button',{name:'Integrate',exact:true}).click();await expect(result).toHaveAttribute('data-checked','no',{timeout:30000});};
  const release=async(kind:'checked'|'export')=>page.evaluate(k=>(window as unknown as {integrationStageTest:{release:(k:'checked'|'export')=>void}}).integrationStageTest.release(k),kind);
  await begin('\\int \\frac{1}{x^2+1}\\,dx');
  await expect(workspace.getByTestId('integration-unchecked')).toHaveText('Not checked yet');
  await expect(workspace.getByRole('button',{name:'Export derivation'})).toBeDisabled();
  await workspace.getByText('Conditions',{exact:true}).click();await workspace.getByText('Original condition entries',{exact:true}).click();
  await page.screenshot({path:info.outputPath('candidate-conditions.png'),fullPage:true});
  await workspace.getByRole('button',{name:'Copy LaTeX'}).click();await expect(workspace.getByRole('status').filter({hasText:'Copied'})).toContainText('not checked');
  const copied=await page.evaluate(()=>window.__calcwizClipboardText);expect(copied).toContain('\\sum_');expect(copied).toContain('C');expect(copied).not.toContain('checked');
  await workspace.getByRole('button',{name:'Show full formula'}).click();expect(await workspace.evaluate(e=>e.scrollWidth<=e.clientWidth+2)).toBe(true);
  await page.screenshot({path:info.outputPath('candidate-full.png'),fullPage:true});
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {integrationStageTest:{checked:unknown}}).integrationStageTest.checked!==undefined)).toBe(true);
  await release('checked');await expect(result).toHaveAttribute('data-checked','yes');
  await expect(workspace.getByText('Preparing the downloadable saved-problem file…')).toBeVisible();
  await expect(workspace.getByRole('button',{name:'Export derivation'})).toBeDisabled();
  await page.screenshot({path:info.outputPath('verified-before-export.png'),fullPage:true});
  await release('export');await expect(workspace.getByRole('button',{name:'Export derivation'})).toBeEnabled({timeout:30000});
  await workspace.getByRole('button',{name:'Copy LaTeX'}).click();await expect.poll(()=>page.evaluate(()=>window.__calcwizClipboardText)).toBe(copied);

  await begin('\\int e^x\\,dx');await workspace.getByRole('button',{name:'Stop',exact:true}).click();
  await expect(workspace.getByTestId('integration-unchecked')).toHaveText('Not checked');await expect(result).toHaveAttribute('data-checked','no');
  await page.screenshot({path:info.outputPath('verification-stopped.png'),fullPage:true});
  await release('checked');await expect(result).toHaveAttribute('data-checked','no');

  await begin('\\int x\\,dx');await page.evaluate(()=>(window as unknown as {integrationStageTest:{exhausted:boolean}}).integrationStageTest.exhausted=true);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {integrationStageTest:{checked:unknown}}).integrationStageTest.checked!==undefined)).toBe(true);
  await release('checked');await expect(workspace.getByText('Not checked: verification stopped (work).')).toBeVisible();
  await page.screenshot({path:info.outputPath('verification-exhausted.png'),fullPage:true});

  await page.evaluate(()=>{const s=(window as unknown as {integrationStageTest:{exhausted:boolean;failed:boolean}}).integrationStageTest;s.exhausted=false;s.failed=true;});
  await begin('\\int x^2\\,dx');await expect.poll(()=>page.evaluate(()=>(window as unknown as {integrationStageTest:{checked:unknown}}).integrationStageTest.checked!==undefined)).toBe(true);
  await release('checked');await expect(result).toHaveAttribute('data-checked','failed');await expect(workspace.getByText('Verification failed — the computed answer was withdrawn.')).toBeVisible();
  await page.screenshot({path:info.outputPath('verification-failed.png'),fullPage:true});

  await page.evaluate(()=>(window as unknown as {integrationStageTest:{failed:boolean}}).integrationStageTest.failed=false);
  await begin('\\int \\frac{e^x}{x}\\,dx');await expect(workspace.getByRole('heading',{name:'Proposed non-elementarity'})).toBeVisible();
  await page.screenshot({path:info.outputPath('negative-candidate.png'),fullPage:true});
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {integrationStageTest:{checked:unknown}}).integrationStageTest.checked!==undefined)).toBe(true);
  await release('checked');await expect(result).toHaveAttribute('data-checked','yes');
  await workspace.getByRole('button',{name:'Stop',exact:true}).click();await expect(workspace.getByRole('heading',{name:'Verified non-elementary'})).toBeVisible();
  await expect(workspace.getByText('Saved-file preparation was stopped.')).toBeVisible();
  await page.screenshot({path:info.outputPath('verified-export-stopped.png'),fullPage:true});
});
