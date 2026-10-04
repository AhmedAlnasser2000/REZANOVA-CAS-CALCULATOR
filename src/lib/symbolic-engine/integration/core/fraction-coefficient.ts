import type { ExecutionContext } from './execution';
import { rationalField, type ExactField } from './field';
import type { Polynomial, PolynomialRing } from './polynomial';

/** Private native-owner bridge. There is no structural/printed-name discovery. */
export interface FractionCoefficient<E, C> {
  readonly ring: PolynomialRing<C>;
  read(ctx: ExecutionContext, value: E): { readonly numerator: Polynomial<C>; readonly denominator: Polynomial<C> };
  make(ctx: ExecutionContext, numerator: Polynomial<C>, denominator: Polynomial<C>): E;
}
const adapters = new WeakMap<object, FractionCoefficient<unknown, unknown>>();
const closed = new WeakSet<object>([rationalField]);
/** Only the native rational differential owner calls this scalar registration. */
export function registerRationalCoefficient(field: object): void { closed.add(field); }
export function registerFractionCoefficient<E, C>(field: ExactField<E>, adapter: FractionCoefficient<E, C>): void {
  if (!closed.has(adapter.ring.domain)) return;
  closed.add(field);
  adapters.set(field, adapter as unknown as FractionCoefficient<unknown, unknown>);
}
export function fractionCoefficient<E>(field: ExactField<E>): FractionCoefficient<E, unknown> | undefined {
  return adapters.get(field) as FractionCoefficient<E, unknown> | undefined;
}
