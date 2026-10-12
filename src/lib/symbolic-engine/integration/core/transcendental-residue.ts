import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E} from './differential-field';
import type {TranscendentalDomain} from './transcendental-domain';
import {firstLevelResidues, verifyFirstLevelResidues, type FirstLevelResidue} from './first-level-rational-residue';
import {extractRecursiveConstant, verifyRecursiveConstantExtraction, type RecursiveConstantExtraction} from './recursive-constant-extraction';
import {rationalInOwner} from './recursive-rde-family';
export interface TranscendentalResidue {
  readonly evidence: FirstLevelResidue<TranscendentalDomain>;
  readonly descent: readonly RecursiveConstantExtraction[];
}
export function transcendentalResiduesWithin(ctx: ExecutionContext, d: TranscendentalDomain, input: E): TranscendentalResidue {
  const evidence = firstLevelResidues(ctx,d,input); ctx.allocate(evidence.monic.coefficients.length+2);
  const descent = evidence.nonconstant === null ? Object.freeze(evidence.monic.coefficients.map(c=>extractRecursiveConstant(ctx,d.base,c))) : Object.freeze([]);
  const result = Object.freeze({evidence,descent}); verifyTranscendentalResidues(ctx,d,input,result); return result;
}
export function verifyTranscendentalResidues(ctx: ExecutionContext, d: TranscendentalDomain, input: E, proof: TranscendentalResidue): void {
  const e = proof.evidence; verifyFirstLevelResidues(ctx,d,input,e);
  demand(proof.descent.length === (e.nonconstant === null ? e.monic.coefficients.length : 0),'verification-failed','complete rational residue descent coverage');
  for(let i=0;i<proof.descent.length;i++) {
    const c=e.monic.coefficients[i], p=proof.descent[i]; verifyRecursiveConstantExtraction(ctx,d.base,c,p);
    demand(d.base.equal(ctx,c,rationalInOwner(ctx,d.base,p.constant)),'verification-failed','inverse constant residue conversion');
  }
}
