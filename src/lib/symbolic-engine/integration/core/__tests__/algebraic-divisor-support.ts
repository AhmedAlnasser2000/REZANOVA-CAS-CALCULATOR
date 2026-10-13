import {quadratic,bounds} from './algebraic-support';
import {PolynomialRing} from '../polynomial';
import {constructAlgebraicExtension,type AlgebraicField} from '../algebraic-field';
import {certifyAlgebraicConstantField} from '../algebraic-constant-field';
import {certifyAlgebraicCurve} from '../algebraic-curve';
import {decomposeAlgebraicPlaces,evaluateAlgebraicPlaceIntegral} from '../algebraic-place';
import {constructAlgebraicDivisor} from '../algebraic-divisor';
export function ellipticDivisor(order:bigint|null){const b=quadratic(order===2n?[0n,-1n,0n,1n]:order===3n?[1n,0n,0n,1n]:[-2n,0n,0n,1n]),constants=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),curve=certifyAlgebraicCurve(b.ctx,b.owner,constants,bounds),r=curve.finite.lattice.scalar.ring,u=curve.infinity.lattice.scalar.ring,x=order===null?3n:0n,y=order===2n?0n:order===3n?1n:5n;
  const decomposition=decomposeAlgebraicPlaces(b.ctx,curve,r.make(b.ctx,[r.domain.fromInteger(b.ctx,-x),r.domain.fromInteger(b.ctx,1n)]),false,bounds),place=decomposition.places.find(p=>p.residue.equal(b.ctx,evaluateAlgebraicPlaceIntegral(b.ctx,curve,p,b.a),p.residue.fromInteger(b.ctx,y)))!,infinity=decomposeAlgebraicPlaces(b.ctx,curve,u.make(b.ctx,[u.domain.fromInteger(b.ctx,0n),u.domain.fromInteger(b.ctx,1n)]),true,bounds).places[0],divisor=constructAlgebraicDivisor(b.ctx,curve,[{place,coefficient:1n},{place:infinity,coefficient:-1n}],bounds);return{...b,curve,divisor};}
export function orderTwentyNineDivisor(){
  const b=quadratic([0n,-16n,33n,-12n,6n,4n,1n]),constants=certifyAlgebraicConstantField(b.ctx,b.owner,bounds),curve=certifyAlgebraicCurve(b.ctx,b.owner,constants,bounds),r=curve.infinity.lattice.scalar.ring;
  const decomposition=decomposeAlgebraicPlaces(b.ctx,curve,r.make(b.ctx,[r.domain.fromInteger(b.ctx,0n),r.domain.fromInteger(b.ctx,1n)]),true,bounds),x=b.owner.embed(b.ctx,b.x),scaled=b.owner.exactDivide(b.ctx,b.a,b.owner.multiply(b.ctx,x,b.owner.multiply(b.ctx,x,x)));
  const positive=decomposition.places.find(p=>p.residue.equal(b.ctx,evaluateAlgebraicPlaceIntegral(b.ctx,curve,p,scaled),p.residue.fromInteger(b.ctx,1n)))!,negative=decomposition.places.find(p=>p.residue.equal(b.ctx,evaluateAlgebraicPlaceIntegral(b.ctx,curve,p,scaled),p.residue.fromInteger(b.ctx,-1n)))!;
  const divisor=constructAlgebraicDivisor(b.ctx,curve,[{place:positive,coefficient:1n},{place:negative,coefficient:-1n}],bounds);return{...b,curve,divisor};
}
export function nestedHiddenConstantCurve(height=3){
 const b=quadratic(),r=new PolynomialRing(b.owner,'b'),twox=b.owner.multiply(b.ctx,b.owner.fromInteger(b.ctx,2n),b.owner.embed(b.ctx,b.x));
 let owner=constructAlgebraicExtension(b.ctx,r,r.make(b.ctx,[b.owner.negate(b.ctx,twox),b.owner.fromInteger(b.ctx,0n),b.owner.fromInteger(b.ctx,1n)]),bounds)as unknown as AlgebraicField<unknown>;
 for(let level=owner.height+1;level<=height;level++){const ring=new PolynomialRing(owner,`a${level}`);owner=constructAlgebraicExtension(b.ctx,ring,ring.make(b.ctx,[owner.negate(b.ctx,owner.generator(b.ctx)),owner.fromInteger(b.ctx,1n)]),bounds)as unknown as AlgebraicField<unknown>;}
 const constants=certifyAlgebraicConstantField(b.ctx,owner,bounds),curve=certifyAlgebraicCurve(b.ctx,owner,constants,bounds);return{...b,owner,constants,curve};
}
export function heightEightHiddenConstantCurve(){
 const b=quadratic([0n,0n,2n]);let owner=b.owner as unknown as AlgebraicField<unknown>;
 for(let level=owner.height+1;level<=8;level++){const r=new PolynomialRing(owner,`a${level}`);owner=constructAlgebraicExtension(b.ctx,r,r.make(b.ctx,[owner.negate(b.ctx,owner.generator(b.ctx)),owner.fromInteger(b.ctx,1n)]),bounds)as unknown as AlgebraicField<unknown>;}
 const constants=certifyAlgebraicConstantField(b.ctx,owner,bounds),curve=certifyAlgebraicCurve(b.ctx,owner,constants,bounds);return{...b,owner,constants,curve};
}
