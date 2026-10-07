import { demand, type ExecutionContext } from './execution';

export interface ExactArtifactBounds {
  readonly artifactDepth: number;
  readonly artifactNodes: number;
  readonly artifactBytes: number;
}
export function checkArtifactBounds(ctx: ExecutionContext, bounds: ExactArtifactBounds): void {
  for (const key of ['artifactDepth', 'artifactNodes', 'artifactBytes'] as const) {
    ctx.tick(); demand(Number.isSafeInteger(bounds[key]) && bounds[key] > 0, 'invalid-input', `artifact bound ${key}`);
  }
}

/** Export size is optional transport availability, never arithmetic exhaustion. */
export class ArtifactExportTooLarge extends Error {}
const exportScopes = new WeakSet<ExecutionContext>();
export function optionalArtifactExport<T>(ctx: ExecutionContext, run: () => T): T {
  demand(!exportScopes.has(ctx), 'invalid-input', 'nested optional artifact export');
  ctx.allocate(2); exportScopes.add(ctx);
  try { return run(); } finally { exportScopes.delete(ctx); }
}

/** Strict, bounded data traversal before reading any untrusted properties. */
export function inspectExactArtifact(ctx: ExecutionContext, bounds: ExactArtifactBounds, value: unknown): number {
  let nodes = 0, bytes = 0;
  const active = new Set<object>();
  const charge = (n: number) => { bytes += n; if (bytes > bounds.artifactBytes) {
    if (exportScopes.has(ctx)) throw new ArtifactExportTooLarge('Derivation export exceeds 16 MiB. The verified answer remains available.');
    ctx.exhaust('differential-artifact-bytes');
  } };
  const string = (s: string) => {
    charge(2);
    for (let i = 0; i < s.length; i++) {
      ctx.tick(); const c = s.charCodeAt(i);
      if (c < 32 || (c >= 0xd800 && c <= 0xdfff && !(c <= 0xdbff && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xdc00 && s.charCodeAt(i + 1) <= 0xdfff))) charge(6);
      else if (c === 34 || c === 92) charge(2);
      else if (c < 128) charge(1);
      else if (c < 2048) charge(2);
      else if (c >= 0xd800 && c <= 0xdbff) { charge(4); i++; }
      else charge(3);
    }
  };
  const visit = (v: unknown, depth: number): void => {
    ctx.tick(); if (++nodes > bounds.artifactNodes) ctx.exhaust('differential-artifact-nodes');
    if (depth > bounds.artifactDepth) ctx.exhaust('differential-artifact-depth');
    if (typeof v === 'string') { string(v); return; }
    if (v === null) { charge(4); return; }
    if (typeof v === 'number') {
      demand(Number.isSafeInteger(v), 'invalid-input', 'artifact number'); charge(String(v).length); return;
    }
    if (typeof v === 'boolean') { charge(v ? 4 : 5); return; }
    demand(typeof v === 'object' && v !== null, 'invalid-input', 'artifact data');
    demand(!active.has(v), 'invalid-input', 'cyclic artifact');
    const array = Array.isArray(v);
    demand(Object.getPrototypeOf(v) === (array ? Array.prototype : Object.prototype) || (!array && Object.getPrototypeOf(v) === null),
      'invalid-input', 'artifact prototype');
    if (array && v.length > bounds.artifactNodes - nodes) ctx.exhaust('differential-artifact-nodes');
    ctx.allocate(2); active.add(v); charge(2);
    let count = 0;
    // Enumeration is incremental; descriptors prevent getters from running.
    for (const key in v) {
      ctx.tick(); demand(Object.hasOwn(v, key), 'invalid-input', 'inherited artifact property');
      const descriptor = Object.getOwnPropertyDescriptor(v, key)!;
      demand('value' in descriptor && descriptor.enumerable === true, 'invalid-input', 'artifact accessor');
      if (array) demand(key === String(count), 'invalid-input', 'noncanonical artifact array');
      else { string(key); charge(1); }
      if (count++) charge(1);
      visit(descriptor.value, depth + 1);
    }
    // Also reject non-enumerable and symbol baggage, after bounded enumeration.
    ctx.allocate(count + 1);
    demand(Reflect.ownKeys(v).length === count + (array ? 1 : 0), 'invalid-input', 'hidden artifact properties');
    if (array) demand(count === v.length, 'invalid-input', 'sparse artifact array');
    active.delete(v);
  };
  visit(value, 0); return bytes;
}
