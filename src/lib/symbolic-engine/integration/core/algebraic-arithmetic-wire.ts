import {demand,type ExecutionContext} from './execution';
import type {DifferentialBounds} from './differential-field';
import type {AlgebraicCurveView} from './algebraic-curve';
import {AlgebraicDivisorWireContext} from './algebraic-divisor-wire-context';
import {algebraicCurveEvidenceCodec} from './algebraic-curve-wire';
import {recordRationalGcdEvidence,replayRationalGcdEvidence,type RationalGcdEvidence} from './rational-gcd-evidence';
import {packAlgebraicArtifactData,unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
import {inspectExactArtifact} from './artifact-bounds';
import {normalizationInteger} from './exponential-normalization-wire-values';
import * as w from './decision-wire-algebra';
import type {RationalFunctionField} from './rational-function';
import type {CurveConstant} from './algebraic-curve-coordinates';
/** Successful exact-value reuse is local to this new artifact operation and
 * exact native owner. The first decode performs all canonical value checks;
 * every mathematical role still runs its explicit-request verifier. */
class ArithmeticWireContext extends AlgebraicDivisorWireContext{
 override coefficient(field:RationalFunctionField<CurveConstant>){return this.memo('arithmetic-coefficient',field.ring.domain,super.coefficient(field));}
 override scalar(field:RationalFunctionField<CurveConstant>){return this.memo('arithmetic-scalar',field,super.scalar(field));}
}
export function encodeAlgebraicArithmeticArtifact<E,T>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,proof:T,tag:string,bounds:DifferentialBounds,seed:RationalGcdEvidence,
  verify:()=>void,factory:(s:AlgebraicDivisorWireContext)=>w.EvidenceCodec<T>):unknown{
  const recorded=recordRationalGcdEvidence(ctx,()=>{
    verify();const state=new ArithmeticWireContext(ctx,bounds),body=Object.freeze({curve:algebraicCurveEvidenceCodec(state,curve).encode(curve),evidence:factory(state).encode(proof)});
    // Record any additional exact-arithmetic coverage needed by fresh decode.
    // All higher-level evidence is already replayed without its producers.
    const canonical=w.record(ctx,unpackAlgebraicArtifactData(ctx,packAlgebraicArtifactData(ctx,body,bounds),bounds),['curve','evidence']);
    const fresh=new ArithmeticWireContext(ctx,bounds);algebraicCurveEvidenceCodec(fresh,curve).decode(canonical.curve);factory(fresh).decode(canonical.evidence);return body;
  },seed);
  const arithmetic=w.structure(ctx,{primes:w.list(ctx,normalizationInteger(ctx))}).encode(recorded.evidence),payload=packAlgebraicArtifactData(ctx,Object.freeze({...recorded.value,arithmetic}),bounds),data=Object.freeze({tag,version:1,payload});inspectExactArtifact(ctx,bounds,data);return data;
}
export function decodeAlgebraicArithmeticArtifact<E,T>(ctx:ExecutionContext,curve:AlgebraicCurveView<E>,data:unknown,tag:string,bounds:DifferentialBounds,factory:(s:AlgebraicDivisorWireContext)=>w.EvidenceCodec<T>):Readonly<{value:T;arithmetic:RationalGcdEvidence}>{
  inspectExactArtifact(ctx,bounds,data);const raw=w.record(ctx,data,['tag','version','payload']);demand(raw.tag===tag&&raw.version===1,'invalid-input','arithmetic artifact tag/version');const body=w.record(ctx,unpackAlgebraicArtifactData(ctx,raw.payload,bounds),['curve','evidence','arithmetic']),arithmetic=w.structure(ctx,{primes:w.list(ctx,normalizationInteger(ctx))}).decode(body.arithmetic);
  const value=replayRationalGcdEvidence(ctx,arithmetic,()=>{const s=new ArithmeticWireContext(ctx,bounds);algebraicCurveEvidenceCodec(s,curve).decode(body.curve);return factory(s).decode(body.evidence);});return Object.freeze({value,arithmetic});
}
