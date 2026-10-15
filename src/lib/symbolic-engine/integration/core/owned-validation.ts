import {demand, type ExecutionContext} from './execution';

/** Retention only, after mathematical owner/identity verification. Native
 * classes keep their own registries; their accounting internals are not proof. */
export function requireImmutableExactEvidence(ctx: ExecutionContext, proof: unknown, checkedOwners: readonly object[] = []): void {
  let owned: Set<object>|null = null; if (checkedOwners.length) {ctx.allocate(checkedOwners.length + 1); owned = new Set(checkedOwners);}
  ctx.allocate(3); const pending: unknown[] = [proof], seen = new Set<object>();
  while (pending.length) {
    ctx.tick(); const value = pending.pop(); demand(typeof value !== 'function', 'invalid-input', 'exact evidence callback');
    if (value === null || typeof value !== 'object' || owned?.has(value) || seen.has(value)) continue;
    demand(Object.isFrozen(value), 'invalid-input', 'mutable exact evidence'); ctx.allocate(1); seen.add(value);
    const proto = Object.getPrototypeOf(value); if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) continue;
    const keys = Reflect.ownKeys(value); ctx.allocate(keys.length);
    for (const key of keys) {ctx.tick(); const entry = Object.getOwnPropertyDescriptor(value, key)!;
      demand('value' in entry, 'invalid-input', 'exact evidence accessor'); ctx.allocate(1); pending.push(entry.value);}
  }
}

/** Each owner keeps this instance private and checks ownership before calling it.
 * Only immutable owned mathematical values qualify, never caller certificates.
 * Weak operation keys discard validation state when the operation ends. */
export class OwnedValidation {
  #operations = new WeakMap<object, { values: WeakSet<object>; previous:WeakSet<object>;count:number }>();
  check(ctx: ExecutionContext, value: object, validate: () => void): void {
    ctx.tick(); const token = ctx.operationToken;
    if (!token || !Object.isFrozen(value)) { validate(); return; }
    let entry = this.#operations.get(token);
    if (entry && (entry.values.has(value) || entry.previous.has(value))) return;
    validate(); // Failure cannot populate the cache.
    if (!entry) {
      ctx.allocate(4); entry = { values: new WeakSet(),previous:new WeakSet(),count:0 };
      ctx.onOperationEnd(() => this.#operations.delete(token));
      this.#operations.set(token, entry);
    }
    // Keep a preceding weak generation while incrementally retiring the older
    // half. A strong FIFO would retain otherwise dead arithmetic temporaries.
    if(entry.count===4096){ctx.allocate(2);entry.previous=entry.values;entry.values=new WeakSet();entry.count=0;}
    ctx.allocate(1);entry.values.add(value);entry.count++;
  }
}
