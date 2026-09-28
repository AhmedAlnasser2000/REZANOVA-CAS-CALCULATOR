import type { ExecutionContext } from './execution';

/** Each owner keeps this instance private and checks ownership before calling it.
 * Only immutable owned mathematical values qualify, never caller certificates.
 * Weak operation keys discard validation state when the operation ends. */
export class OwnedValidation {
  #operations = new WeakMap<object, { values: WeakSet<object>; count: number }>();
  check(ctx: ExecutionContext, value: object, validate: () => void): void {
    ctx.tick(); const token = ctx.operationToken;
    if (!token || !Object.isFrozen(value)) { validate(); return; }
    let entry = this.#operations.get(token);
    if (entry?.values.has(value)) return;
    validate(); // Failure cannot populate the cache.
    if (!entry || entry.count === 4096) {
      if (!entry) ctx.onOperationEnd(() => this.#operations.delete(token));
      ctx.allocate(3); entry = { values: new WeakSet(), count: 0 }; this.#operations.set(token, entry);
    }
    ctx.allocate(1); entry.values.add(value); entry.count++;
  }
}
