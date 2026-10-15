import {bounds, quadratic} from './algebraic-support';
import {certifyAlgebraicConstantField} from '../algebraic-constant-field';
import {certifyAlgebraicCurve} from '../algebraic-curve';
import {decomposeAlgebraicPlaces, evaluateAlgebraicPlaceIntegral} from '../algebraic-place';
import {tryRamifiedHyperellipticModel} from '../ramified-hyperelliptic-model';
import type {ExecutionContext} from '../execution';

export function preparedCantor(polynomial: readonly bigint[] = [1n, 0n, 0n, 1n], ctx?: ExecutionContext) {
  const b = quadratic(polynomial, ctx), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds), model = tryRamifiedHyperellipticModel(b.ctx, curve, bounds)!;
  const r = curve.coordinates.scalar.ring, c = r.domain, p = (v: readonly bigint[]) => r.make(b.ctx, v.map(n => c.fromInteger(b.ctx, n)));
  const infinity = decomposeAlgebraicPlaces(b.ctx, curve, curve.infinity.lattice.scalar.ring.make(b.ctx, [c.fromInteger(b.ctx, 0n), c.fromInteger(b.ctx, 1n)]), true, bounds).places[0];
  const above = (v: readonly bigint[]) => decomposeAlgebraicPlaces(b.ctx, curve, p(v), false, bounds).places;
  const choose = (v: readonly bigint[], y: bigint) => above(v).find(place => place.residue.equal(b.ctx, evaluateAlgebraicPlaceIntegral(b.ctx, curve, place, model.y), place.residue.fromInteger(b.ctx, y)))!;
  return {...b, constants, curve, model, r, c, p, infinity, above, choose};
}
