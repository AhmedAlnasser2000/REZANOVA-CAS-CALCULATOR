import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import {differentiate, verifyDerivative, type DerivativeEvidence} from './differential-derivative';
import type {TranscendentalDomain} from './transcendental-domain';
import {polynomialValue} from './first-level-rational-domain';
import {solveRecursiveLimitedIntegrationWithin, verifyRecursiveLimitedIntegrationWithin, type RecursiveLimitedIntegrationDecision} from './recursive-limited-integration';
import {rationalInOwner} from './recursive-rde-family';
type LimitedFamily = Pick<RecursiveLimitedIntegrationDecision, 'kind' | 'family'>;
export interface TranscendentalPolynomialStep<L extends LimitedFamily = RecursiveLimitedIntegrationDecision> {
  readonly degree: bigint; readonly input: E; readonly leading: E; readonly limited: L;
  readonly correction: E|null; readonly derivative: DerivativeEvidence|null; readonly next: E|null;
}
export interface TranscendentalPolynomialReduction<L extends LimitedFamily = RecursiveLimitedIntegrationDecision> {
  readonly input: E; readonly steps: readonly TranscendentalPolynomialStep<L>[]; readonly fieldPart: E;
  readonly remainder: E|null; readonly failure: number|null;
}
export function transcendentalParentValue(ctx: ExecutionContext,d: TranscendentalDomain,value: E): E {
  const p=polynomialValue(ctx,d.field,value); demand(d.t.degree(ctx,p)<=0,'verification-failed','parent polynomial remainder degree');
  const out=p.coefficients[0]??d.base.fromInteger(ctx,0n);
  demand(d.field.equal(ctx,value,d.field.embed(ctx,out)),'verification-failed','parent exact inverse conversion');return out;
}
function correction(ctx: ExecutionContext,d: TranscendentalDomain,degree: bigint,e: LimitedFamily): E {
  ctx.integer(degree);demand(degree>0n&&degree<BigInt(Number.MAX_SAFE_INTEGER),'verification-failed','checked polynomial coefficient position');
  demand(e.kind==='solutions'&&e.family!==null&&e.family.particular.coefficients.length===1&&e.family.directions.length===0,'verification-failed','admitted logarithm unique coefficient choice');
  const top=d.base.negate(ctx,d.base.exactDivide(ctx,rationalInOwner(ctx,d.base,e.family.particular.coefficients[0]),d.base.fromInteger(ctx,ctx.add(degree,1n))));
  const m=Number(degree),hasTop=!d.base.isZero(ctx,top),size=m+(hasTop?2:1);ctx.degree(size-1);ctx.allocate(size);
  const cs=Array<E>(size).fill(d.base.fromInteger(ctx,0n));cs[m]=e.family.particular.value;if(hasTop)cs[m+1]=top;
  return d.field.make(ctx,cs);
}
export function reduceTranscendentalPolynomialWithin(ctx: ExecutionContext,d: TranscendentalDomain,input: E,bounds: DifferentialBounds): TranscendentalPolynomialReduction {
  const steps: TranscendentalPolynomialStep[]=[];let current=input,fieldPart=d.field.fromInteger(ctx,0n),failure: number|null=null;
  for(;;){
    const p=polynomialValue(ctx,d.field,current),m=d.t.degree(ctx,p);if(m<=0)break;
    const leading=p.coefficients[m],degree=BigInt(m),limited=solveRecursiveLimitedIntegrationWithin(ctx,d.view.parent!,leading,[d.view.rate!],bounds);ctx.allocate(8);
    if(limited.kind==='no-field-solution'){failure=steps.length;steps.push(Object.freeze({degree,input:current,leading,limited,correction:null,derivative:null,next:null}));break;}
    const part=correction(ctx,d,degree,limited),derivative=differentiate(ctx,d.field,part),next=d.field.subtract(ctx,current,derivative.derivative);
    demand(d.t.degree(ctx,polynomialValue(ctx,d.field,next))<m,'verification-failed','strict logarithmic polynomial descent');
    steps.push(Object.freeze({degree,input:current,leading,limited,correction:part,derivative,next}));fieldPart=d.field.add(ctx,fieldPart,part);current=next;
  }
  ctx.allocate(5);const result=Object.freeze({input,steps:Object.freeze(steps),fieldPart,remainder:failure===null?transcendentalParentValue(ctx,d,current):null,failure});
  verifyTranscendentalPolynomial(ctx,d,input,result,bounds);return result;
}
export function verifyTranscendentalPolynomial(ctx: ExecutionContext,d: TranscendentalDomain,input: E,e: TranscendentalPolynomialReduction,bounds: DifferentialBounds): void {
  verifyTranscendentalPolynomialFamily(ctx,d,input,e,bounds,verifyRecursiveLimitedIntegrationWithin);
}
/** Only coefficient-family certificate mechanics vary; polynomial identities do not. */
export function verifyTranscendentalPolynomialFamily<L extends LimitedFamily>(ctx: ExecutionContext,d: TranscendentalDomain,input: E,e: TranscendentalPolynomialReduction<L>,bounds: DifferentialBounds,check: (ctx: ExecutionContext, view: TranscendentalDomain['view'], f: E, generators: readonly E[], proof: L, bounds: DifferentialBounds) => void): void {
  demand(d.field.equal(ctx,input,e.input),'verification-failed','polynomial expected input');let current=input,part=d.field.fromInteger(ctx,0n),failed=false;
  for(let i=0;i<e.steps.length;i++){
    ctx.tick();const step=e.steps[i],p=polynomialValue(ctx,d.field,current),m=d.t.degree(ctx,p);
    demand(!failed&&m>0&&step.degree===BigInt(m)&&d.field.equal(ctx,current,step.input)&&d.base.equal(ctx,p.coefficients[m],step.leading),'verification-failed','polynomial ordered degree coverage');
    check(ctx,d.view.parent!,step.leading,[d.view.rate!],step.limited,bounds);
    if(step.limited.kind==='no-field-solution'){
      demand(e.failure===i&&i===e.steps.length-1&&step.correction===null&&step.derivative===null&&step.next===null&&e.remainder===null,'verification-failed','polynomial checked obstruction prefix');failed=true;continue;
    }
    demand(step.correction!==null&&step.derivative!==null&&step.next!==null,'verification-failed','complete successful polynomial correction');
    demand(d.field.equal(ctx,step.correction,correction(ctx,d,step.degree,step.limited)),'verification-failed','polynomial coefficient/primitive mapping');verifyDerivative(ctx,d.field,step.correction,step.derivative);
    demand(d.field.equal(ctx,step.next,d.field.subtract(ctx,current,step.derivative.derivative))&&d.t.degree(ctx,polynomialValue(ctx,d.field,step.next))<m,'verification-failed','polynomial descent reconstruction');
    part=d.field.add(ctx,part,step.correction);current=step.next;
  }
  demand(d.field.equal(ctx,part,e.fieldPart),'verification-failed','polynomial prefix representative');
  if(!failed)demand(e.failure===null&&e.remainder!==null&&d.base.equal(ctx,e.remainder,transcendentalParentValue(ctx,d,current)),'verification-failed','polynomial terminal parent coverage');
}
