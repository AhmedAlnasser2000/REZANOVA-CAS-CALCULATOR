import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import {differentiate,verifyDerivative,type DerivativeEvidence} from './differential-derivative';
import type {TranscendentalDomain} from './transcendental-domain';
import {solveRecursiveParametricRdeWithin,verifyRecursiveParametricRdeWithin} from './recursive-rde';
import type {RecursiveParametricRdeDecision} from './recursive-rde-types';
type RdeFamily = Pick<RecursiveParametricRdeDecision, 'kind' | 'family'>;
export interface TranscendentalLaurentStep<R extends RdeFamily = RecursiveParametricRdeDecision> {
  readonly power: bigint;readonly coefficient: E;readonly rde: R;readonly correction: E|null;readonly derivative: DerivativeEvidence|null;
}
export interface TranscendentalLaurentReduction<R extends RdeFamily = RecursiveParametricRdeDecision> {
  readonly input: E;readonly powers: readonly bigint[];readonly steps: readonly TranscendentalLaurentStep<R>[];readonly fieldPart: E;readonly remainder: E;readonly failure: number|null;
}
export function extractTranscendentalLaurent(ctx: ExecutionContext,d: TranscendentalDomain,input: E) {
  d.field.assert(ctx,input);demand(input.kind==='fraction','domain-mismatch','Laurent native value');const den=input.value.denominator,degree=d.t.degree(ctx,den);
  demand(degree>=0&&d.base.equal(ctx,den.coefficients[degree],d.base.fromInteger(ctx,1n)),'verification-failed','monic special denominator');
  for(let i=0;i<degree;i++){ctx.tick();demand(d.base.isZero(ctx,den.coefficients[i]),'verification-failed','Laurent special denominator support');}
  const powers: bigint[]=[],coefficients: E[]=[];let remainder=d.base.fromInteger(ctx,0n);
  for(let i=0;i<input.value.numerator.coefficients.length;i++){
    ctx.tick();const c=input.value.numerator.coefficients[i];if(d.base.isZero(ctx,c))continue;
    const power=ctx.add(BigInt(i),-BigInt(degree));if(power===0n)remainder=c;else {ctx.allocate(2);powers.push(power);coefficients.push(c);}
  }
  return {powers:Object.freeze(powers),coefficients:Object.freeze(coefficients),remainder};
}
export function transcendentalMonomial(ctx: ExecutionContext,d: TranscendentalDomain,power: bigint,value: E): E {
  d.base.assert(ctx,value);ctx.integer(power);if(d.base.isZero(ctx,value))return d.field.fromInteger(ctx,0n);
  const abs=power<0n?ctx.multiply(-1n,power):power;demand(abs<=BigInt(Number.MAX_SAFE_INTEGER-1),'verification-failed','monomial exact index conversion');
  const degree=Number(abs);ctx.degree(degree);ctx.allocate(degree+1);const cs=Array<E>(degree+1).fill(d.base.fromInteger(ctx,0n));
  cs[degree]=power<0n?d.base.fromInteger(ctx,1n):value;
  return power<0n?d.field.make(ctx,[value],cs):d.field.make(ctx,cs);
}
export function reduceTranscendentalLaurentWithin(ctx: ExecutionContext,d: TranscendentalDomain,input: E,bounds: DifferentialBounds): TranscendentalLaurentReduction {
  const coverage=extractTranscendentalLaurent(ctx,d,input),steps: TranscendentalLaurentStep[]=[];let fieldPart=d.field.fromInteger(ctx,0n),failure: number|null=null;
  for(let i=0;i<coverage.powers.length;i++){
    const power=coverage.powers[i],coefficient=coverage.coefficients[i],a=d.base.multiply(ctx,d.base.fromInteger(ctx,power),d.view.rate!);
    const rde=solveRecursiveParametricRdeWithin(ctx,d.view.parent!,a,coefficient,[],bounds);ctx.allocate(5);
    if(rde.kind==='no-field-solution'){failure=i;steps.push(Object.freeze({power,coefficient,rde,correction:null,derivative:null}));break;}
    demand(rde.family!==null&&rde.family.directions.length===0,'verification-failed','admission excludes homogeneous Laurent freedom');
    const correction=transcendentalMonomial(ctx,d,power,rde.family.particular.value),derivative=differentiate(ctx,d.field,correction);
    steps.push(Object.freeze({power,coefficient,rde,correction,derivative}));fieldPart=d.field.add(ctx,fieldPart,correction);
  }
  ctx.allocate(6);const result=Object.freeze({input,powers:coverage.powers,steps:Object.freeze(steps),fieldPart,remainder:coverage.remainder,failure});
  verifyTranscendentalLaurent(ctx,d,input,result,bounds);return result;
}
export function verifyTranscendentalLaurent(ctx: ExecutionContext,d: TranscendentalDomain,input: E,e: TranscendentalLaurentReduction,bounds: DifferentialBounds): void {
  verifyTranscendentalLaurentFamily(ctx,d,input,e,bounds,verifyRecursiveParametricRdeWithin);
}
/** The full exponent support/mapping checks are identical for both family formats. */
export function verifyTranscendentalLaurentFamily<R extends RdeFamily>(ctx: ExecutionContext,d: TranscendentalDomain,input: E,e: TranscendentalLaurentReduction<R>,bounds: DifferentialBounds,check: (ctx: ExecutionContext, view: TranscendentalDomain['view'], a: E, b: E, forcing: readonly E[], proof: R, bounds: DifferentialBounds) => void): void {
  demand(d.field.equal(ctx,input,e.input),'verification-failed','Laurent expected input');const coverage=extractTranscendentalLaurent(ctx,d,input);
  demand(e.powers.length===coverage.powers.length&&d.base.equal(ctx,e.remainder,coverage.remainder),'verification-failed','complete Laurent support/parent component');
  for(let i=0;i<e.powers.length;i++)demand(e.powers[i]===coverage.powers[i],'verification-failed','exact Laurent exponent order');
  let part=d.field.fromInteger(ctx,0n),failed=false;
  for(let i=0;i<e.steps.length;i++){
    const step=e.steps[i];demand(!failed&&i<coverage.powers.length&&step.power===coverage.powers[i]&&d.base.equal(ctx,step.coefficient,coverage.coefficients[i]),'verification-failed','ordered Laurent component coverage');
    const a=d.base.multiply(ctx,d.base.fromInteger(ctx,step.power),d.view.rate!);check(ctx,d.view.parent!,a,step.coefficient,[],step.rde,bounds);
    if(step.rde.kind==='no-field-solution'){demand(e.failure===i&&i===e.steps.length-1&&step.correction===null&&step.derivative===null,'verification-failed','Laurent checked obstruction prefix');failed=true;continue;}
    demand(step.rde.family!==null&&step.rde.family.directions.length===0&&step.correction!==null&&step.derivative!==null,'verification-failed','complete unique Laurent solution');
    demand(d.field.equal(ctx,step.correction,transcendentalMonomial(ctx,d,step.power,step.rde.family.particular.value)),'verification-failed','Laurent solution mapping');
    verifyDerivative(ctx,d.field,step.correction,step.derivative);
    demand(d.field.equal(ctx,step.derivative.derivative,transcendentalMonomial(ctx,d,step.power,step.coefficient)),'verification-failed','independent Laurent derivative target');part=d.field.add(ctx,part,step.correction);
  }
  demand(d.field.equal(ctx,part,e.fieldPart),'verification-failed','Laurent prefix representative');
  if(!failed)demand(e.failure===null&&e.steps.length===coverage.powers.length,'verification-failed','unsolved Laurent component');
}
