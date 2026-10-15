import { demand, type ExecutionContext } from './execution';
import type { DifferentialBounds } from './differential-field';

interface ProofScope {
  readonly immutable: WeakMap<object, boolean>;
  readonly verified: WeakMap<object, Map<object, Set<string>>>;
}
const scopes = new WeakMap<object, ProofScope>();
function immutable(ctx: ExecutionContext, value: unknown, scope: ProofScope, active = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== 'object') return true;
  const previous = scope.immutable.get(value); if (previous !== undefined) { ctx.tick(); return previous; }
  if (!Object.isFrozen(value)) return false;
  demand(!active.has(value), 'invalid-input', 'cyclic immutable proof'); active.add(value);
  if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
    for (const name of Reflect.ownKeys(value)) {
      ctx.tick(); const d = Object.getOwnPropertyDescriptor(value, name)!;
      demand('value' in d, 'invalid-input', 'immutable proof accessor');
      if (!immutable(ctx, d.value, scope, active)) { active.delete(value); return false; }
    }
  }
  active.delete(value); ctx.allocate(2); scope.immutable.set(value, true); return true;
}
/** Reuse only a successful check of exactly this immutable evidence, expected
 * owner and bounds, in the enclosing fresh operation. Never serialized. */
export function reuseAlgebraicVerification(ctx: ExecutionContext, rule: 'construction-chain' | 'constant-field' | 'owned-place' | 'good-reduction' | 'curve-geometry' | 'reduced-model' | 'balanced-torsion' | 'genus-one-presentation' | 'genus-one-coordinates' | 'genus-one-class' | 'genus-one-torsion', owner: object, proof: object, bounds: DifferentialBounds | null, run: () => void): void {
  const token = ctx.operationToken;
  if (!token) { run(); return; }
  let scope = scopes.get(token);
  if (!scope) {
    ctx.allocate(6); scope = {immutable: new WeakMap(), verified: new WeakMap()}; scopes.set(token, scope);
    ctx.onOperationEnd(() => scopes.delete(token));
  }
  // Some existing positive-characteristic verifiers expose only the enclosing
  // arithmetic context. Null preserves that interface and adds no shape cap.
  const eligible = immutable(ctx, proof, scope), key = bounds === null ? rule : `${rule}:${bounds.towerHeight}:${bounds.artifactDepth}:${bounds.artifactNodes}:${bounds.artifactBytes}`;
  ctx.allocate(key.length + 1);
  if (eligible && scope.verified.get(owner)?.get(proof)?.has(key)) { ctx.tick(); return; }
  run();
  if (eligible) {
    let proofs = scope.verified.get(owner); if (!proofs) { ctx.allocate(3); proofs = new Map(); scope.verified.set(owner, proofs); }
    let keys = proofs.get(proof); if (!keys) { ctx.allocate(3); keys = new Set(); proofs.set(proof, keys); }
    ctx.allocate(key.length + 2); keys.add(key);
  }
}
