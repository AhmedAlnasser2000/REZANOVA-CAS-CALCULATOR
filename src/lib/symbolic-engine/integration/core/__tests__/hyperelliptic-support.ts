import {quadratic, bounds} from './algebraic-support';
import type {ExecutionContext} from '../execution';
import {certifyAlgebraicConstantField} from '../algebraic-constant-field';
import {certifyAlgebraicCurve} from '../algebraic-curve';
import {decomposeAlgebraicPlaces} from '../algebraic-place';
import {constructAlgebraicDivisor} from '../algebraic-divisor';

export function hyperellipticInfinityDivisor(polynomial: readonly bigint[] = [1n, 0n, 0n, 0n, 1n], coefficient = 1n, ctx?: ExecutionContext) {
  const b = quadratic(polynomial, ctx), constants = certifyAlgebraicConstantField(b.ctx, b.owner, bounds), curve = certifyAlgebraicCurve(b.ctx, b.owner, constants, bounds), r = curve.infinity.lattice.scalar.ring;
  const pair = decomposeAlgebraicPlaces(b.ctx, curve, r.make(b.ctx, [r.domain.fromInteger(b.ctx, 0n), r.domain.fromInteger(b.ctx, 1n)]), true, bounds);
  const divisor = constructAlgebraicDivisor(b.ctx, curve, [{place: pair.places[0], coefficient}, {place: pair.places[1], coefficient: -coefficient}], bounds);
  return {...b, constants, curve, divisor};
}
