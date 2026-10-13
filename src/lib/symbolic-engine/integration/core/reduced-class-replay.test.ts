import {it,expect} from 'vitest';
import {base,fresh,bounds} from './__tests__/algebraic-support';
import {certifyAlgebraicConstantField} from './algebraic-constant-field';
import {certifyAlgebraicCurve} from './algebraic-curve';
import {certifyAlgebraicGoodReduction} from './algebraic-good-reduction';
import {decomposeReducedPlaces} from './reduced-place';
import {constructReducedDivisor} from './reduced-divisor';
import {reduceFiniteDivisorClass,addFiniteDivisorClasses,decideFiniteClassPrincipality,verifyFiniteClassPrincipality} from './reduced-class';
import {PositiveWireContext} from './positive-wire';
import {reducedClassPrincipalityCodec} from './reduced-class-wire';
import {packAlgebraicArtifactData,unpackAlgebraicArtifactData} from './algebraic-artifact-keys';
it('preserves factored witnesses when structurally equal class proofs share data',()=>{const b=base(),constants=certifyAlgebraicConstantField(b.ctx,b.field,bounds),source=certifyAlgebraicCurve(b.ctx,b.field,constants,bounds),curve=certifyAlgebraicGoodReduction(fresh(),source,bounds).curve,c=fresh();c.operation(()=>{
 const infinity=decomposeReducedPlaces(c,curve,curve.infinity.lattice.field.ring.x(c),true),anchor=constructReducedDivisor(c,curve,infinity.places.map(place=>({place,coefficient:place.ramification}))),zero=constructReducedDivisor(c,curve,[]),left=reduceFiniteDivisorClass(c,curve,anchor,zero),right=reduceFiniteDivisorClass(c,curve,anchor,zero);expect(left).not.toBe(right);expect(curve.field.equal(c,left.witness,right.witness)).toBe(true);
 const sum=addFiniteDivisorClasses(c,curve,left,right),proof=decideFiniteClassPrincipality(c,curve,sum,left),wire=reducedClassPrincipalityCodec(new PositiveWireContext(c,bounds),curve).encode(proof),packed=packAlgebraicArtifactData(c,wire,bounds),decoded=reducedClassPrincipalityCodec(new PositiveWireContext(c,bounds),curve).decode(unpackAlgebraicArtifactData(c,packed,bounds));verifyFiniteClassPrincipality(c,curve,zero,decoded);expect(decoded.kind).toBe('principal');expect(decoded.representative.kind==='sum'&&decoded.representative.left===decoded.representative.right).toBe(true);
 });});
