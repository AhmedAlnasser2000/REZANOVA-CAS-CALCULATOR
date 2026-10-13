import {demand} from './execution';
import type {AlgebraicCurveView} from './algebraic-curve';
import {AlgebraicDivisorWireContext} from './algebraic-divisor-wire-context';
import {algebraicDivisorCodec,algebraicRiemannRochCodec} from './algebraic-divisor-wire';
import {algebraicCoefficientCodec} from './algebraic-wire';
import {algebraicPrincipalityRule} from './algebraic-principality';
import {verifyAlgebraicRrPrincipalityWithin,type AlgebraicRrPrincipality} from './algebraic-rr-principality';
import * as w from './decision-wire-algebra';
export function algebraicRrPrincipalityCodec<E>(s:AlgebraicDivisorWireContext,curve:AlgebraicCurveView<E>):w.EvidenceCodec<AlgebraicRrPrincipality<E>>{const divisor=algebraicDivisorCodec(s,curve),common={rule:w.literal(s.ctx,algebraicPrincipalityRule),divisor,negative:divisor,space:algebraicRiemannRochCodec(s,curve)},positive=w.structure(s.ctx,{...common,kind:w.literal(s.ctx,'principal'),equality:w.literal(s.ctx,'complete-space-degree-zero'),witness:algebraicCoefficientCodec(s.ctx,curve.owner,s.bounds)}),negative=w.structure(s.ctx,{...common,kind:w.literal(s.ctx,'not-principal'),reason:w.literal(s.ctx,'zero-space')});return s.memo('rr-principality',curve,{encode:v=>v.kind==='principal'?positive.encode(v):negative.encode(v),decode:v=>{demand(v!==null&&typeof v==='object','invalid-input','RR principality record');const kind=Object.getOwnPropertyDescriptor(v,'kind');demand(kind!==undefined&&'value'in kind,'invalid-input','RR principality kind');const p=kind.value==='principal'?positive.decode(v):negative.decode(v);verifyAlgebraicRrPrincipalityWithin(s.ctx,curve,p.divisor,p,s.bounds);return p;}});}
