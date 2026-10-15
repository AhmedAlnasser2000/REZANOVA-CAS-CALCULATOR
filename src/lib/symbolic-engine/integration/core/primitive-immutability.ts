import {demand, type ExecutionContext} from './execution';
import type {DifferentialField} from './differential-field';
import type {FirstLevelPrimitive} from './first-level-rational-primitive';

/** The derivative verifier already checked these exact owners/quotient rings.
 * A mutable caller primitive must not become a retained immutable result. */
export function requireImmutableFirstLevelPrimitive(ctx: ExecutionContext, p: FirstLevelPrimitive): void {
  const d = p.domain; ctx.allocate(10 + p.terms.length);
  const owners = new Set<object>([d, d.z, d.t, d.kz, d.fz, d.elimination, ...p.terms.map(t => t.algebra)]);
  for (let f: DifferentialField | undefined = d.field; f; f = f.parent) {ctx.tick(); ctx.allocate(1); owners.add(f);}
  const pending: unknown[] = [p], seen = new Set<object>();
  while (pending.length) {
    ctx.tick(); const v = pending.pop();
    demand(typeof v !== 'function', 'invalid-input', 'primitive callback');
    if (v === null || typeof v !== 'object' || owners.has(v) || seen.has(v)) continue;
    demand(Object.isFrozen(v), 'invalid-input', 'mutable primitive candidate'); ctx.allocate(1); seen.add(v);
    const keys = Reflect.ownKeys(v); ctx.allocate(keys.length);
    for (const key of keys) {
      ctx.tick(); const property = Object.getOwnPropertyDescriptor(v, key)!;
      demand('value' in property, 'invalid-input', 'primitive accessor'); ctx.allocate(1); pending.push(property.value);
    }
  }
}
