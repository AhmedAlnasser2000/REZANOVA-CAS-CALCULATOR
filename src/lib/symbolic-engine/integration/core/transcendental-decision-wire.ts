import {demand,type ExecutionContext} from './execution';
import type {DifferentialElement as E,DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {TranscendentalDomain} from './transcendental-domain';
import {FormalPrimitiveDomain} from './formal-primitive';
import {toRationalPrimitiveInput} from './exponential-sum-bridge';
import {encodeRationalDecisionWithin,decodeRationalDecisionWithin} from './rational-decision-wire';
import {firstLevelReductionCodecs} from './first-level-rational-reduction-codecs';
import {constantExtractionCodec,recursiveLimitedIntegrationEvidenceCodec,recursiveParametricRdeEvidenceCodec} from './recursive-rde-wire';
import {transcendentalFamilyReductionCodecs} from './transcendental-reduction-codecs';
import {TRANSCENDENTAL_RULE,verifyTranscendentalDecisionWithin,type TranscendentalDecision} from './transcendental-decision';
import {transcendentalEnvelope,transcendentalArtifactBody} from './transcendental-artifact';
import * as w from './decision-wire-algebra';

/** Composition only: all values are rebound to the explicit native owner chain. */
function transcendentalDecisionEvidenceCodec(ctx: ExecutionContext,view: CertifiedTowerView,bounds: DifferentialBounds): w.EvidenceCodec<TranscendentalDecision> {
  const d=new TranscendentalDomain(ctx,view,bounds),c=firstLevelReductionCodecs(ctx,d);
  const common={rule:w.literal(ctx,TRANSCENDENTAL_RULE),input:c.e,kind:w.literal(ctx,'elementary','non-elementary'),
    stage:w.literal(ctx,'rational','logarithmic','exponential'),primitive:w.optional(c.primitive),derivative:w.optional(c.proof),conditions:c.conditions};
  if(view.monomial==='variable'){
    // A saved rational residue variable is a binder, never the mathematical owner.
    const body=w.structure(ctx,common);
    return {
      encode(e){return encodeEvidence(ctx,e,bounds);},
      decode(data){
        ctx.allocate(2*Object.keys(common).length+2);
        const raw=w.record(ctx,data,[...Object.keys(common),'rational']),e=body.decode(Object.fromEntries(Object.keys(common).map(key=>[key,raw[key]])));
        const r=w.record(ctx,raw.rational,['kind','version','variable','residueVariable','input','primitive','normEvidence','hermite','lrt','derivative','conditions']);
        demand(r.variable===d.t.variable&&typeof r.residueVariable==='string','domain-mismatch','rational base expected bindings');
        const owner=new FormalPrimitiveDomain(d.t.variable,r.residueVariable),input=toRationalPrimitiveInput(ctx,d.field,owner,e.input);
        const rational=decodeRationalDecisionWithin(ctx,owner,input,raw.rational);ctx.allocate(18);
        return Object.freeze({...e,domain:d,rational,hermite:null,residue:null,remainder:null,polynomial:null,laurent:null,parent:null,embedding:null,obstruction:null});
      },
    };
  }
  const residue=w.structure(ctx,{evidence:c.residue,descent:w.list(ctx,constantExtractionCodec(ctx,d.base,bounds))});
  const remainder=w.structure(ctx,{logarithms:c.primitive,derivative:c.proof,value:c.e});
  const parent=transcendentalDecisionEvidenceCodec(ctx,view.parent!,bounds);
  const {polynomial,laurent}=transcendentalFamilyReductionCodecs(ctx,d,recursiveLimitedIntegrationEvidenceCodec(ctx,view.parent!,bounds),recursiveParametricRdeEvidenceCodec(ctx,view.parent!,bounds));
  const body=w.structure(ctx,{...common,hermite:w.optional(c.hermite),residue:w.optional(residue),remainder:w.optional(remainder),
    polynomial:w.optional(polynomial),laurent:w.optional(laurent),parent:w.optional(parent),embedding:w.optional(c.primitive),
    obstruction:w.optional(w.structure(ctx,{kind:w.literal(ctx,'normal-residue','logarithmic-coefficient','exponential-component','parent-decision'),index:w.optional(w.integer(ctx)),level:w.integer(ctx,1)}))});
  return {encode(e){return encodeEvidence(ctx,e,bounds);},decode(data){const e=body.decode(data);ctx.allocate(2);return Object.freeze({...e,domain:d,rational:null});}};
}
export function encodeTranscendentalDecision(ctx: ExecutionContext,view: CertifiedTowerView,input: E,e: TranscendentalDecision,bounds: DifferentialBounds): unknown {
  return ctx.operation(()=>{
    verifyTranscendentalDecisionWithin(ctx,view,input,e,bounds);
    // Encode using the existing domains, since auxiliary owners are deliberately fresh.
    const encoded=encodeEvidence(ctx,e,bounds);
    return transcendentalEnvelope(ctx,view,'transcendental-decision',encoded,bounds);
  });
}
function encodeEvidence(ctx: ExecutionContext,e: TranscendentalDecision,bounds: DifferentialBounds): unknown {
  const d=e.domain,c=firstLevelReductionCodecs(ctx,d);
  ctx.allocate(17);const common={rule:e.rule,input:c.e.encode(e.input),kind:e.kind,stage:e.stage,
    primitive:w.optional(c.primitive).encode(e.primitive),derivative:w.optional(c.proof).encode(e.derivative),conditions:c.conditions.encode(e.conditions)};
  if(e.stage==='rational')return Object.freeze({...common,rational:encodeRationalDecisionWithin(ctx,e.rational!.primitive.owner,e.rational!)});
  const {polynomial,laurent}=transcendentalFamilyReductionCodecs(ctx,d,recursiveLimitedIntegrationEvidenceCodec(ctx,d.view.parent!,bounds),recursiveParametricRdeEvidenceCodec(ctx,d.view.parent!,bounds));
  const residue=w.structure(ctx,{evidence:c.residue,descent:w.list(ctx,constantExtractionCodec(ctx,d.base,bounds))});
  const rem=w.structure(ctx,{logarithms:c.primitive,derivative:c.proof,value:c.e});
  return Object.freeze({...common,hermite:w.optional(c.hermite).encode(e.hermite),residue:w.optional(residue).encode(e.residue),remainder:w.optional(rem).encode(e.remainder),
    polynomial:w.optional(polynomial).encode(e.polynomial),laurent:w.optional(laurent).encode(e.laurent),parent:e.parent?encodeEvidence(ctx,e.parent,bounds):null,
    embedding:w.optional(c.primitive).encode(e.embedding),obstruction:e.obstruction});
}
export function decodeTranscendentalDecision(ctx: ExecutionContext,view: CertifiedTowerView,input: E,data: unknown,bounds: DifferentialBounds): TranscendentalDecision {
  return ctx.operation(()=>{
    const body=transcendentalArtifactBody(ctx,view,'transcendental-decision',data,bounds),e=transcendentalDecisionEvidenceCodec(ctx,view,bounds).decode(body);
    verifyTranscendentalDecisionWithin(ctx,view,input,e,bounds);return e;
  });
}
