/** Full registered finite construction, independent of derivative constants. */
import {demand, type ExecutionContext} from './execution';
import {checkDifferentialBounds, type DifferentialBounds} from './differential-field';
import {PositivePrimeField, requirePositiveField, type FiniteField} from './positive-field';
import {isPositiveFiniteExtension, verifyFiniteExtensionIrreducibility} from './positive-extension';
import {verifyFactorPrime} from './factorization-modular';
import {ScopedProof} from './scoped-proof';
const constructions = new ScopedProof();

export function verifyFiniteFieldConstructionWithin<E>(ctx: ExecutionContext, field: FiniteField<E>, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds);
  if (!isPositiveFiniteExtension(field)) {demand(field instanceof PositivePrimeField, 'domain-mismatch', 'registered finite coefficient owner'); requirePositiveField(field);}
  constructions.check(ctx, [field, bounds], () => verifyConstruction<E>(ctx, field, bounds), [field]);
}
function verifyConstruction<E>(ctx: ExecutionContext, field: FiniteField<E>, bounds: DifferentialBounds): void {
  checkDifferentialBounds(ctx, bounds); let owner: unknown = field, height = 1;
  while (isPositiveFiniteExtension(owner)) {
    ctx.tick(); height++; if (height > bounds.towerHeight) ctx.exhaust('tower-height');
    verifyFiniteExtensionIrreducibility(ctx, owner.ring, owner.modulus, owner.parent.size, owner.irreducibility);
    let size = 1n; for (let i = 0; i < owner.ring.degree(ctx, owner.modulus); i++) size = ctx.multiply(size, owner.parent.size);
    demand(size === owner.size && owner.characteristic === owner.parent.characteristic && owner.ring.field === owner.parent, 'verification-failed', 'complete finite-field construction'); owner = owner.parent;
  }
  demand(owner instanceof PositivePrimeField, 'domain-mismatch', 'registered finite coefficient owner'); requirePositiveField(owner); verifyFactorPrime(ctx, owner.characteristic);
  demand(owner.size === owner.characteristic, 'verification-failed', 'finite prime cardinality');
}
