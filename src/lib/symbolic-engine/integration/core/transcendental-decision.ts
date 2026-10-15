import {demand,type ExecutionContext} from './execution';
import type {DifferentialElement as E,DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {TranscendentalDomain,requireArithmeticDomain} from './transcendental-domain';
import {FormalPrimitiveDomain} from './formal-primitive';
import {toRationalPrimitiveInput} from './exponential-sum-bridge';
import {integrateRationalWithin,verifyRationalDecisionWithin,type RationalDecision} from './rational-decision-internal';
import {firstLevelHermite,verifyFirstLevelHermite,type DifferentialHermite} from './first-level-rational-hermite';
import {transcendentalResiduesWithin,verifyTranscendentalResidues,type TranscendentalResidue} from './transcendental-residue';
import {transcendentalPrimitiveWithin,differentiateTranscendentalPrimitiveWithin,verifyTranscendentalPrimitiveWithin,type TranscendentalPrimitive,type TranscendentalPrimitiveDerivative,type TranscendentalLogTerm} from './transcendental-primitive';
import {embedTranscendentalPrimitiveWithin,verifyTranscendentalPrimitiveEmbedding,embedTranscendentalRationalPrimitiveWithin,verifyTranscendentalRationalEmbedding} from './transcendental-bridge';
import {reduceTranscendentalPolynomialWithin,verifyTranscendentalPolynomial,type TranscendentalPolynomialReduction} from './transcendental-polynomial';
import {reduceTranscendentalLaurentWithin,verifyTranscendentalLaurent,type TranscendentalLaurentReduction} from './transcendental-laurent';
import {transcendentalConditions,type TranscendentalCondition} from './transcendental-conditions';
import type {RecursiveCondition} from './recursive-conditions';
export const TRANSCENDENTAL_RULE='recursive-exp-log-liouville-v1' as const;
export interface TranscendentalRemainder { readonly logarithms: TranscendentalPrimitive;readonly derivative: TranscendentalPrimitiveDerivative;readonly value: E }
export interface TranscendentalObstruction {readonly kind:'normal-residue'|'logarithmic-coefficient'|'exponential-component'|'parent-decision';readonly index: number|null;readonly level: number}
export interface TranscendentalDecision {
  readonly rule: typeof TRANSCENDENTAL_RULE;readonly domain: TranscendentalDomain;readonly input: E;
  readonly kind:'elementary'|'non-elementary';readonly stage:'rational'|'logarithmic'|'exponential';
  readonly rational: RationalDecision|null;readonly hermite: DifferentialHermite|null;readonly residue: TranscendentalResidue|null;
  readonly remainder: TranscendentalRemainder|null;readonly polynomial: TranscendentalPolynomialReduction|null;readonly laurent: TranscendentalLaurentReduction|null;
  readonly parent: TranscendentalDecision|null;readonly embedding: TranscendentalPrimitive|null;
  readonly primitive: TranscendentalPrimitive|null;readonly derivative: TranscendentalPrimitiveDerivative|null;
  readonly obstruction: TranscendentalObstruction|null;readonly conditions: readonly TranscendentalCondition[];
}
function logs(ctx: ExecutionContext,e: TranscendentalResidue|null): readonly TranscendentalLogTerm[] {
  const out: TranscendentalLogTerm[]=[];if(e)for(const group of e.evidence.groups)for(const c of group.components){ctx.tick();ctx.allocate(1);out.push(c.term);}return Object.freeze(out);
}
function sameTerms(ctx: ExecutionContext,d: TranscendentalDomain,a: readonly TranscendentalLogTerm[],b: readonly TranscendentalLogTerm[]): void {
  demand(a.length===b.length,'verification-failed','complete root-log component coverage');
  for(let i=0;i<a.length;i++)demand(d.z.equal(ctx,a[i].modulus,b[i].modulus)&&d.z.equal(ctx,a[i].weight,b[i].weight)
    &&d.fz.equal(ctx,a[i].argument,b[i].argument)&&d.field.equal(ctx,a[i].norm,b[i].norm),'verification-failed','ordered root-log exact mapping');
}
export type TranscendentalCandidate = Readonly<Omit<TranscendentalDecision, 'derivative'>>;
interface TranscendentalConditionSource {
  readonly domain: TranscendentalDomain; readonly input: E; readonly primitive?: TranscendentalPrimitive|null;
  readonly hermite: DifferentialHermite|null; readonly remainder: TranscendentalRemainder|null;
  readonly polynomial: Readonly<{fieldPart: E; steps: readonly Readonly<{limited: Readonly<{conditions: readonly RecursiveCondition[]}>}>[]}>|null;
  readonly laurent: Readonly<{fieldPart: E; steps: readonly Readonly<{rde: Readonly<{conditions: readonly RecursiveCondition[]}>}>[]}>|null;
  readonly parent: Readonly<{conditions: readonly TranscendentalCondition[]}>|null;
}
export function transcendentalDecisionConditions(ctx: ExecutionContext,e: TranscendentalConditionSource): readonly TranscendentalCondition[] {
  const d=e.domain;let retained=e.primitive??undefined;
  if(!retained&&e.hermite){
    let part=e.hermite.fieldPart;if(e.polynomial)part=d.field.add(ctx,part,e.polynomial.fieldPart);if(e.laurent)part=d.field.add(ctx,part,e.laurent.fieldPart);
    retained=Object.freeze({domain:d,fieldPart:part,terms:e.remainder?.logarithms.terms??Object.freeze([])});
  }
  const own=transcendentalConditions(ctx,d,e.input,retained);ctx.allocate(own.length);const out=[...own];
  const add=(prefix: string,cs: readonly (TranscendentalCondition|RecursiveCondition)[])=>{
    ctx.allocate(cs.length);for(const c of cs){ctx.tick();const category='category' in c?c.category:c.path.startsWith('construction.')?'construction':'coefficient-denominator';
      const path=prefix+c.path;ctx.allocate(path.length+3);out.push(Object.freeze({category,path,value:d.field.embed(ctx,c.value)}));}
  };
  if(e.parent)add('parent.',e.parent.conditions);
  if(e.polynomial)for(let i=0;i<e.polynomial.steps.length;i++)add(`polynomial.${i}.`,e.polynomial.steps[i].limited.conditions);
  if(e.laurent)for(let i=0;i<e.laurent.steps.length;i++)add(`laurent.${i}.`,e.laurent.steps[i].rde.conditions);
  return Object.freeze(out);
}
function obstruction(d: TranscendentalDomain,kind: TranscendentalObstruction['kind'],index: number|null): TranscendentalObstruction {return Object.freeze({kind,index,level:d.field.height});}
function base(d: TranscendentalDomain,input: E): Omit<TranscendentalDecision,'kind'|'conditions'|'derivative'> {
  return {rule:TRANSCENDENTAL_RULE,domain:d,input,stage:d.view.monomial==='variable'?'rational':d.view.monomial==='primitive'?'logarithmic':'exponential',
    rational:null,hermite:null,residue:null,remainder:null,polynomial:null,laurent:null,parent:null,embedding:null,primitive:null,obstruction:null};
}
export function produceTranscendentalCandidateWithin(ctx: ExecutionContext,view: CertifiedTowerView,input: E,bounds: DifferentialBounds): TranscendentalCandidate {
  const d=new TranscendentalDomain(ctx,view,bounds),f=d.field;f.assert(ctx,input);ctx.allocate(17);let data: Omit<TranscendentalDecision,'conditions'|'derivative'>;
  if(view.monomial==='variable'){
    const owner=new FormalPrimitiveDomain(d.t.variable,d.z.variable),native=toRationalPrimitiveInput(ctx,f,owner,input);
    const rational=integrateRationalWithin(ctx,owner,native),primitive=embedTranscendentalRationalPrimitiveWithin(ctx,d,rational.primitive);
    data={...base(d,input),kind:'elementary',rational,primitive};
  }else{
    const hermite=firstLevelHermite(ctx,d,input),residue=f.isZero(ctx,hermite.residual)?null:transcendentalResiduesWithin(ctx,d,hermite.residual);
    const common={...base(d,input),hermite,residue};
    if(residue?.evidence.nonconstant!==null&&residue!==null)data={...common,kind:'non-elementary',obstruction:obstruction(d,'normal-residue',residue.evidence.nonconstant)};
    else{
      const logarithms=transcendentalPrimitiveWithin(ctx,d,f.fromInteger(ctx,0n),logs(ctx,residue)),derivative=differentiateTranscendentalPrimitiveWithin(ctx,logarithms,bounds);
      const value=f.subtract(ctx,f.add(ctx,hermite.laurent,hermite.residual),derivative.derivative),remainder=Object.freeze({logarithms,derivative,value});
      const polynomial=view.monomial==='primitive'?reduceTranscendentalPolynomialWithin(ctx,d,value,bounds):null;
      const laurent=view.monomial==='hyperexponential'?reduceTranscendentalLaurentWithin(ctx,d,value,bounds):null;
      const processed={...common,remainder,polynomial,laurent};
      if(polynomial?.failure!==null&&polynomial!==null)data={...processed,kind:'non-elementary',obstruction:obstruction(d,'logarithmic-coefficient',polynomial.failure)};
      else if(laurent?.failure!==null&&laurent!==null)data={...processed,kind:'non-elementary',obstruction:obstruction(d,'exponential-component',laurent.failure)};
      else{
        const parentInput=polynomial?polynomial.remainder!:laurent!.remainder,parent=integrateTranscendentalWithin(ctx,view.parent!,parentInput,bounds);
        if(parent.kind==='non-elementary')data={...processed,parent,kind:'non-elementary',obstruction:obstruction(d,'parent-decision',null)};
        else{
          const embedding=embedTranscendentalPrimitiveWithin(ctx,d,parent.primitive!,bounds),part=f.add(ctx,hermite.fieldPart,f.add(ctx,polynomial?polynomial.fieldPart:laurent!.fieldPart,embedding.fieldPart));
          ctx.allocate(logarithms.terms.length+embedding.terms.length);
          const primitive=transcendentalPrimitiveWithin(ctx,d,part,[...logarithms.terms,...embedding.terms]);
          data={...processed,parent,embedding,kind:'elementary',primitive};
        }
      }
    }
  }
  const temporary={...data,conditions:Object.freeze([])},conditions=transcendentalDecisionConditions(ctx,temporary);ctx.allocate(2);
  return Object.freeze({...data,conditions});
}
export function checkTranscendentalCandidateWithin(ctx: ExecutionContext,view: CertifiedTowerView,input: E,candidate: TranscendentalCandidate,bounds: DifferentialBounds): TranscendentalDecision {
  view.owner.assert(ctx,input);ctx.allocate(2);
  demand(candidate.kind !== 'elementary' || candidate.primitive !== null,'verification-failed','candidate primitive coverage');
  const derivative=candidate.kind === 'elementary'?differentiateTranscendentalPrimitiveWithin(ctx,candidate.primitive!,bounds):null;
  const decision=Object.freeze({...candidate,derivative});verifyTranscendentalDecisionWithin(ctx,view,input,decision,bounds);return decision;
}
export function integrateTranscendentalWithin(ctx: ExecutionContext,view: CertifiedTowerView,input: E,bounds: DifferentialBounds): TranscendentalDecision {
  return checkTranscendentalCandidateWithin(ctx,view,input,produceTranscendentalCandidateWithin(ctx,view,input,bounds),bounds);
}
export function produceTranscendentalCandidate(ctx: ExecutionContext,view: CertifiedTowerView,input: E,bounds: DifferentialBounds): TranscendentalCandidate {
  return ctx.operation(()=>produceTranscendentalCandidateWithin(ctx,view,input,bounds));
}
export function checkTranscendentalCandidate(ctx: ExecutionContext,view: CertifiedTowerView,input: E,candidate: TranscendentalCandidate,bounds: DifferentialBounds): TranscendentalDecision {
  return ctx.operation(()=>checkTranscendentalCandidateWithin(ctx,view,input,candidate,bounds));
}
function checkObstruction(e: TranscendentalDecision,kind: TranscendentalObstruction['kind'],index: number|null): void {
  demand(e.kind==='non-elementary'&&e.obstruction?.kind===kind&&e.obstruction.index===index&&e.obstruction.level===e.domain.field.height
    &&e.embedding===null&&e.primitive===null&&e.derivative===null,'verification-failed','checked Liouville obstruction authority');
}
/** Shared Hermite/residue identities; no family, outcome or negative authority. */
export function verifyTranscendentalResiduePrefixWithin(ctx: ExecutionContext,d: TranscendentalDomain,input: E,h: DifferentialHermite,residue: TranscendentalResidue|null,r: TranscendentalRemainder|null,bounds: DifferentialBounds): number|null {
  const f=d.field;verifyFirstLevelHermite(ctx,d,input,h);demand((residue===null)===f.isZero(ctx,h.residual),'verification-failed','normal residue coverage');
  if(residue)verifyTranscendentalResidues(ctx,d,h.residual,residue);
  if(residue!==null&&residue.evidence.nonconstant!==null){demand(r===null,'verification-failed','nonconstant residue subtraction unperformed');return residue.evidence.nonconstant;}
  demand(r!==null,'verification-failed','missing verified residue subtraction');sameTerms(ctx,d,logs(ctx,residue),r.logarithms.terms);
  demand(f.isZero(ctx,r.logarithms.fieldPart),'verification-failed','residue logarithm field part');verifyTranscendentalPrimitiveWithin(ctx,d,r.logarithms,r.derivative.derivative,r.derivative,bounds);
  demand(f.equal(ctx,r.value,f.subtract(ctx,f.add(ctx,h.laurent,h.residual),r.derivative.derivative)),'verification-failed','complete residue subtraction');return null;
}
export function verifyTranscendentalDecisionWithin(ctx: ExecutionContext,view: CertifiedTowerView,input: E,e: TranscendentalDecision,bounds: DifferentialBounds): void {
  demand(e!==null&&typeof e==='object','invalid-input','transcendental decision record');const d=e.domain;requireArithmeticDomain(ctx,d,bounds);const f=d.field;f.assert(ctx,input);
  demand(d.view===view&&e.rule===TRANSCENDENTAL_RULE&&f.equal(ctx,input,e.input),'verification-failed','complete transcendental expected owner/input/rule');
  if(view.monomial==='variable'){
    demand(e.stage==='rational'&&e.kind==='elementary'&&e.rational!==null&&e.hermite===null&&e.residue===null&&e.remainder===null&&e.polynomial===null&&e.laurent===null&&e.parent===null&&e.embedding===null&&e.obstruction===null&&e.primitive!==null&&e.derivative!==null,'verification-failed','rational base decision coverage');
    const owner=e.rational.primitive.owner,native=toRationalPrimitiveInput(ctx,f,owner,input);verifyRationalDecisionWithin(ctx,owner,native,e.rational);
    verifyTranscendentalRationalEmbedding(ctx,d,e.rational.primitive,e.primitive);verifyTranscendentalPrimitiveWithin(ctx,d,e.primitive,input,e.derivative,bounds);
  }else{
    demand(e.stage===(view.monomial==='primitive'?'logarithmic':'exponential')&&e.rational===null&&e.hermite!==null,'verification-failed','recursive decision stage/coverage');
    const h=e.hermite,nonconstant=verifyTranscendentalResiduePrefixWithin(ctx,d,input,h,e.residue,e.remainder,bounds);
    if(nonconstant!==null){
      checkObstruction(e,'normal-residue',nonconstant);demand(e.remainder===null&&e.polynomial===null&&e.laurent===null&&e.parent===null,'verification-failed','nonconstant residue terminal coverage');
    }else{
      const r=e.remainder;demand(r!==null,'verification-failed','missing verified residue subtraction');
      let failed: boolean,parentInput: E|null;
      if(view.monomial==='primitive'){
        demand(e.polynomial!==null&&e.laurent===null,'verification-failed','logarithmic polynomial coverage');verifyTranscendentalPolynomial(ctx,d,r.value,e.polynomial,bounds);
        failed=e.polynomial.failure!==null;parentInput=e.polynomial.remainder;if(failed)checkObstruction(e,'logarithmic-coefficient',e.polynomial.failure);
      }else{
        demand(e.polynomial===null&&e.laurent!==null,'verification-failed','exponential Laurent coverage');verifyTranscendentalLaurent(ctx,d,r.value,e.laurent,bounds);
        failed=e.laurent.failure!==null;parentInput=e.laurent.remainder;if(failed)checkObstruction(e,'exponential-component',e.laurent.failure);
      }
      if(failed)demand(e.parent===null,'verification-failed','subsequent parent work unsolved');
      else{
        demand(e.parent!==null&&parentInput!==null,'verification-failed','recursive parent decision coverage');verifyTranscendentalDecisionWithin(ctx,view.parent!,parentInput,e.parent,bounds);
        if(e.parent.kind==='non-elementary')checkObstruction(e,'parent-decision',null);
        else{
          demand(e.kind==='elementary'&&e.obstruction===null&&e.embedding!==null&&e.primitive!==null&&e.derivative!==null,'verification-failed','complete elementary assembly');
          verifyTranscendentalPrimitiveEmbedding(ctx,d,e.parent.primitive!,e.embedding,bounds);
          const part=f.add(ctx,h.fieldPart,f.add(ctx,e.polynomial?e.polynomial.fieldPart:e.laurent!.fieldPart,e.embedding.fieldPart));
          demand(f.equal(ctx,part,e.primitive.fieldPart),'verification-failed','exact field-part assembly');ctx.allocate(r.logarithms.terms.length+e.embedding.terms.length);
          sameTerms(ctx,d,[...r.logarithms.terms,...e.embedding.terms],e.primitive.terms);verifyTranscendentalPrimitiveWithin(ctx,d,e.primitive,input,e.derivative,bounds);
        }
      }
    }
  }
  const cs=transcendentalDecisionConditions(ctx,e);demand(cs.length===e.conditions.length,'verification-failed','complete retained decision conditions');
  for(let i=0;i<cs.length;i++)demand(cs[i].category===e.conditions[i].category&&cs[i].path===e.conditions[i].path&&f.equal(ctx,cs[i].value,e.conditions[i].value),'verification-failed','decision restriction value/provenance');
}
export function integrateTranscendental(ctx: ExecutionContext,view: CertifiedTowerView,input: E,bounds: DifferentialBounds): TranscendentalDecision {
  return ctx.operation(()=>integrateTranscendentalWithin(ctx,view,input,bounds));
}
export function verifyTranscendentalDecision(ctx: ExecutionContext,view: CertifiedTowerView,input: E,e: TranscendentalDecision,bounds: DifferentialBounds): void {
  ctx.operation(()=>verifyTranscendentalDecisionWithin(ctx,view,input,e,bounds));
}
