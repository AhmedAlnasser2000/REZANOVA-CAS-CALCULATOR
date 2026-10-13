import {base,bounds,fresh} from './algebraic-support';
import {ellipticDivisor,heightEightHiddenConstantCurve} from './algebraic-divisor-support';
import {measureOperation} from './algebraic-measurements';
import type {AlgebraicCurveView} from '../algebraic-curve';
import {certifyAlgebraicCurve} from '../algebraic-curve';
import {certifyAlgebraicConstantField} from '../algebraic-constant-field';
import {constructAlgebraicDivisor,principalAlgebraicDivisor,type AlgebraicDivisor} from '../algebraic-divisor';
import {certifyAlgebraicGoodReduction,verifyAlgebraicGoodReduction} from '../algebraic-good-reduction';
import {encodeAlgebraicGoodReduction,decodeAlgebraicGoodReduction} from '../algebraic-good-reduction-wire';
import {solveAlgebraicRiemannRoch} from '../algebraic-riemann-roch';
import {decideAlgebraicPrincipality} from '../algebraic-principality';
import {decideAlgebraicDivisorTorsion,verifyAlgebraicDivisorTorsion} from '../algebraic-divisor-torsion';
import {encodeAlgebraicDivisorTorsion,decodeAlgebraicDivisorTorsion} from '../algebraic-divisor-torsion-wire';
/** Construction of native fixtures and JSON/file I/O stay outside the serial
 * two-warm-up/five-sample observations. Every operation receives fresh state. */
export function algebraicDivisorGateBMeasurements(progress:(name:string,value:unknown)=>void=()=>{}){
 const q=base(),constant=certifyAlgebraicConstantField(q.ctx,q.field,bounds),rational=certifyAlgebraicCurve(q.ctx,q.field,constant,bounds),elliptic=ellipticDivisor(2n),deep=heightEightHiddenConstantCurve();
 const fixtures:Record<string,{curve:AlgebraicCurveView<unknown>;divisor:AlgebraicDivisor<unknown>}>=Object.freeze({rational:{curve:rational,divisor:principalAlgebraicDivisor(q.ctx,rational,q.x,bounds).divisor},ellipticOrderTwo:{curve:elliptic.curve,divisor:elliptic.divisor},heightEightHiddenConstants:{curve:deep.curve,divisor:constructAlgebraicDivisor(deep.ctx,deep.curve,[],bounds)}}),observations:Record<string,unknown>={};
 for(const [name,{curve,divisor}]of Object.entries(fixtures)){
  const reduction=certifyAlgebraicGoodReduction(fresh(),curve,bounds),proof=decideAlgebraicDivisorTorsion(fresh(),curve,divisor,bounds),wire=JSON.parse(JSON.stringify(encodeAlgebraicDivisorTorsion(fresh(),curve,divisor,proof,bounds))),reductionWire=JSON.parse(JSON.stringify(encodeAlgebraicGoodReduction(fresh(),curve,reduction,bounds))),operations={
   construction:()=>measureOperation(ctx=>certifyAlgebraicGoodReduction(ctx,curve,bounds)),
   constructionVerification:()=>measureOperation(ctx=>verifyAlgebraicGoodReduction(ctx,curve,reduction,bounds)),
   riemannRoch:()=>measureOperation(ctx=>solveAlgebraicRiemannRoch(ctx,curve,divisor,bounds)),
   principality:()=>measureOperation(ctx=>decideAlgebraicPrincipality(ctx,curve,divisor,bounds)),
   torsion:()=>measureOperation(ctx=>decideAlgebraicDivisorTorsion(ctx,curve,divisor,bounds)),
   verification:()=>measureOperation(ctx=>verifyAlgebraicDivisorTorsion(ctx,curve,divisor,proof,bounds)),
   encoding:()=>measureOperation(ctx=>encodeAlgebraicDivisorTorsion(ctx,curve,divisor,proof,bounds)),
   decoding:()=>measureOperation(ctx=>decodeAlgebraicDivisorTorsion(ctx,curve,divisor,wire,bounds)),
   reductionDecoding:()=>measureOperation(ctx=>decodeAlgebraicGoodReduction(ctx,curve,reductionWire,bounds)),
  },record:Record<string,unknown>={bytes:Buffer.byteLength(JSON.stringify(wire)),reductionBytes:Buffer.byteLength(JSON.stringify(reductionWire)),kind:proof.kind,order:'order'in proof?proof.order?.toString():null};
  observations[name]=record;for(const [stage,run]of Object.entries(operations)){record[stage]=run();progress(`${name}.${stage}`,record);}
 }
 return{warmups:2,samples:5,observations,processMemory:process.memoryUsage(),processMaximumRssKiB:process.resourceUsage().maxRSS};
}
