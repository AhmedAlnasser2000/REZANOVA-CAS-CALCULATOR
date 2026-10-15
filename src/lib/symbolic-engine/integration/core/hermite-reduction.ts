/** Existing rational entry points and version-1 Hermite certificate representation. */
import type {ExecutionContext} from './execution';
import type {Rational} from './rational';
import type {FormalPrimitiveDomain, QRationalFunction} from './formal-primitive';
import {reduceConstantRationalHermite, verifyConstantRationalHermite,
  type ConstantHermiteStep, type ConstantHermiteBlock, type ConstantHermiteCertificate} from './constant-rational-hermite';

export type HermiteStep = ConstantHermiteStep<Rational>;
export type HermiteBlock = ConstantHermiteBlock<Rational>;
export type HermiteCertificate = ConstantHermiteCertificate<Rational>;
export function hermiteReduce(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction): HermiteCertificate {
  return reduceConstantRationalHermite(ctx, owner, input);
}
export function verifyHermite(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction, proof: HermiteCertificate): void {
  verifyConstantRationalHermite(ctx, owner, input, proof);
}
