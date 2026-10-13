import {describe,it,expect,vi,afterEach} from 'vitest';
import {startIntegration} from './service';
import {DEFAULT_INTEGRATION_LIMITS as limits,validIntegrationPreview,type IntegrationPreview} from './types';
import * as rational from '../../symbolic-engine/integration/core/rational-decision';
import * as exponential from '../../symbolic-engine/integration/core/exponential-rational-decision';
import {AlgebraError} from '../../symbolic-engine/integration/core/execution';
import {readIntegrationPresentation} from '../../result-contract/integration-presentation';
afterEach(()=>vi.restoreAllMocks());
const job=(body:string)=>({request:{source:`\\int ${body}\\,dx`,limits}});
describe('Integration candidate/check/export boundaries',()=>{
  it.each(['x','\\frac{1}{x^2+1}','e^x','\\frac{e^x}{x}'])('publishes actual %s before checking and before export',body=>{
    const check=body.includes('e^')?vi.spyOn(exponential,'checkExponentialRationalCandidate'):vi.spyOn(rational,'checkRationalCandidate');
    let preview:IntegrationPreview|undefined;
    const pending=startIntegration(job(body),p=>{expect(check).not.toHaveBeenCalled();expect(validIntegrationPreview(p,job(body).request)).toBe(true);preview=p;});
    expect(preview).toBeDefined();expect(check).toHaveBeenCalledOnce();expect(pending.response.document.outcomeKind).toBe('success');
    expect(pending.response.artifact).toBeUndefined();expect(pending.exportArtifact).toBeTypeOf('function');
    const shown=readIntegrationPresentation(pending.response.document)!;
    expect(preview!.presentation.copy).toBe(shown.copy());expect(preview!.presentation.full).toBe(shown.expanded());
    const before=pending.response.usage,exported=pending.exportArtifact!();
    expect(exported.artifact).toBeTypeOf('string');expect(exported.usage!.work).toBeGreaterThan(before.work);
    expect(pending.response.usage).toEqual(before); // Published snapshot is stable.
  });
  it('keeps a verification failure distinct from a computed candidate',()=>{
    vi.spyOn(rational,'checkRationalCandidate').mockImplementation(()=>{throw new AlgebraError('verification-failed','test target mismatch');});
    let shown=false;const p=startIntegration(job('x'),()=>{shown=true;});
    expect(shown).toBe(true);expect(p.response.document.title).toBe('Verification failed');expect(p.response.failedStage).toBe('verify');
    expect(p.exportArtifact).toBeUndefined();expect(p.response.stop).toBeUndefined();
  });
  it('keeps verification exhaustion distinct from a negative decision',()=>{
    vi.spyOn(rational,'checkRationalCandidate').mockImplementation(ctx=>ctx.exhaust('work'));
    let shown=false;const p=startIntegration(job('x'),()=>{shown=true;});
    expect(shown).toBe(true);expect(p.response.stop).toBe('work');expect(p.response.failedStage).toBe('verify');expect(p.response.document.outcomeKind).toBe('error');
  });
  it('keeps source restrictions and freezes preview snapshots',()=>{
    let preview:IntegrationPreview|undefined;const p=startIntegration(job('x/x'),v=>{preview=v;expect(Object.isFrozen(v.request)).toBe(true);expect(Object.isFrozen(v.presentation.conditions)).toBe(true);});
    expect(preview!.presentation.conditions.some(c=>c.latex.includes('x'))).toBe(true);expect(p.response.document.outcomeKind).toBe('success');
    const forged={...preview!,presentation:{...preview!.presentation, trusted:{deep:{payload:'unexpected'}}}};
    expect(validIntegrationPreview(forged,job('x/x').request)).toBe(false);
    expect(validIntegrationPreview({...preview!,request:job('x').request},job('x/x').request)).toBe(false);
  });
});
