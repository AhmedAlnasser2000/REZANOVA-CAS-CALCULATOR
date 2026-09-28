import type { ExecutionContext } from './execution';

/** Private successful-obligation table. Each verifier owns a distinct instance.
 * Accessors, functions and mutable evidence reject reuse.
 * Owners and values are included in each exact identity key. */
export class ScopedProof {
  #scopes = new WeakMap<object, readonly object[][]>();
  check(ctx: ExecutionContext, keys: readonly object[], verify: () => void, owners: readonly object[] = []): void {
    ctx.tick(); const token = ctx.operationToken;
    if (!token) { verify(); return; }
    ctx.allocate(keys.length + 2);
    const seen = new Set<object>(), pending: unknown[] = [...keys];
    let eligible = true;
    while (pending.length && eligible) {
      ctx.tick(); const value = pending.pop();
      if (typeof value === 'function') { eligible = false; break; }
      if (value === null || typeof value !== 'object') continue;
      if (!Object.isFrozen(value)) { eligible = false; break; }
      if (owners.includes(value) || seen.has(value)) continue;
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) { eligible = false; break; }
      ctx.allocate(1); seen.add(value);
      // No getters are called. Only enumerable plain records/arrays qualify;
      // hidden keys, symbol keys and custom prototypes conservatively disable reuse.
      let count = Array.isArray(value) ? 1 : 0;
      for (const key in value) {
        ctx.tick(); if (!Object.hasOwn(value, key)) { eligible = false; break; }
        ctx.allocate(3); const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!('value' in descriptor)) { eligible = false; break; }
        pending.push(descriptor.value); count++;
      }
      ctx.allocate(count);
      if (Reflect.ownKeys(value).length !== count) eligible = false;
    }
    if (!eligible) { verify(); return; }
    const existing = this.#scopes.get(token), entries = existing ?? [];
    for (const entry of entries) {
      ctx.tick(); if (entry.length === keys.length && entry.every((value, i) => value === keys[i])) return;
    }
    verify(); // Failed or exhausted obligations never enter the table.
    ctx.allocate(keys.length + entries.length + 2);
    if (!existing) ctx.onOperationEnd(() => this.#scopes.delete(token));
    this.#scopes.set(token, [...(entries.length < 128 ? entries : []), [...keys]]);
  }
}
