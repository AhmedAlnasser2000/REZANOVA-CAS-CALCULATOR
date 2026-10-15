/** Identical finite construction snapshot ritual, independent of algorithms. */
import {demand} from './execution';
import {PositivePrimeField, type FiniteField} from './positive-field';
import {isPositiveFiniteExtension} from './positive-extension';
import type {PositiveWireContext} from './positive-wire';
import * as w from './decision-wire-algebra';

export function encodeFiniteFieldSnapshot<E>(s: PositiveWireContext, field: FiniteField<E>): unknown {
  if (field instanceof PositivePrimeField) return Object.freeze({kind: 'prime', characteristic: s.integer().encode(field.characteristic)});
  demand(isPositiveFiniteExtension(field), 'domain-mismatch', 'finite snapshot extension');
  return Object.freeze({kind: 'extension', parent: encodeFiniteFieldSnapshot(s, field.parent), evidence: s.extension(field.parent).encode(field)});
}
export function verifyFiniteFieldSnapshot<E>(s: PositiveWireContext, field: FiniteField<E>, data: unknown): void {
  if (field instanceof PositivePrimeField) {
    const raw = w.record(s.ctx, data, ['kind', 'characteristic']); demand(raw.kind === 'prime' && s.integer().decode(raw.characteristic) === field.characteristic, 'domain-mismatch', 'finite expected prime'); return;
  }
  demand(isPositiveFiniteExtension(field), 'domain-mismatch', 'finite expected coefficient field');
  const raw = w.record(s.ctx, data, ['kind', 'parent', 'evidence']); demand(raw.kind === 'extension', 'domain-mismatch', 'finite expected extension'); verifyFiniteFieldSnapshot(s, field.parent, raw.parent);
  const fresh = s.extension(field.parent).decode(raw.evidence);
  demand(fresh.ring.variable === field.ring.variable && field.ring.equal(s.ctx, field.modulus, field.ring.make(s.ctx, fresh.modulus.coefficients)), 'domain-mismatch', 'complete finite coefficient construction');
}
