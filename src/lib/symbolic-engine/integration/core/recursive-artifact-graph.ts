/** Exact data sharing for the new recursive tags; references carry no proof authority. */
import { demand, type ExecutionContext } from './execution';
import { checkArtifactBounds, inspectExactArtifact, type ExactArtifactBounds } from './artifact-bounds';
import * as w from './decision-wire-algebra';

type Atom = null | string | number | boolean;
type Node = readonly ['atom', Atom] | readonly ['list', readonly number[]] | readonly ['record', readonly string[], readonly number[]];
export interface RecursiveArtifactGraph { readonly root: number; readonly nodes: readonly Node[] }
function signature(ctx: ExecutionContext, node: Node): string {
  let capacity = 32;
  if (node[0] === 'atom') capacity += typeof node[1] === 'string' ? node[1].length * 6 : 24;
  else if (node[0] === 'list') capacity += node[1].length * 20;
  else { capacity += node[2].length * 20; for (const key of node[1]) capacity += key.length * 6 + 4; }
  ctx.allocate(capacity); const key = JSON.stringify(node); ctx.allocate(key.length); return key;
}
export function packRecursiveArtifactGraph(ctx: ExecutionContext, input: unknown, bounds: ExactArtifactBounds): RecursiveArtifactGraph {
  checkArtifactBounds(ctx, bounds); const nodes: Node[] = [], ids = new Map<string, number>(), active = new Set<object>();
  function intern(node: Node): number {
    const key = signature(ctx, node), previous = ids.get(key); if (previous !== undefined) return previous;
    ctx.allocate(3 + key.length); const id = nodes.length; demand(Number.isSafeInteger(id), 'invalid-input', 'recursive graph index');
    nodes.push(Object.freeze(node)); ids.set(key, id); return id;
  }
  function visit(value: unknown): number {
    ctx.tick();
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
      demand(typeof value !== 'number' || Number.isSafeInteger(value), 'invalid-input', 'recursive graph atom'); ctx.allocate(2); return intern(['atom', value]);
    }
    demand(typeof value === 'object' && value !== null && !active.has(value), 'invalid-input', 'recursive graph data/cycle');
    ctx.allocate(2); active.add(value); let result: number;
    if (Array.isArray(value)) {
      const source = w.array(ctx, value); ctx.allocate(source.length + 2); result = intern(['list', Object.freeze(source.map(visit))]);
    } else {
      demand(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, 'invalid-input', 'recursive graph record prototype');
      const keys: string[] = [], refs: number[] = [];
      for (const key in value) {
        ctx.tick(); demand(Object.hasOwn(value, key), 'invalid-input', 'inherited recursive graph property'); ctx.allocate(key.length + 3);
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        demand('value' in descriptor && descriptor.enumerable === true, 'invalid-input', 'recursive graph accessor'); keys.push(key); refs.push(visit(descriptor.value));
      }
      ctx.allocate(keys.length); demand(Reflect.ownKeys(value).length === keys.length, 'invalid-input', 'hidden recursive graph property');
      result = intern(['record', Object.freeze(keys), Object.freeze(refs)]);
    }
    active.delete(value); return result;
  }
  const root = visit(input); ctx.allocate(2); const graph = Object.freeze({root, nodes: Object.freeze(nodes)});
  inspectExactArtifact(ctx, bounds, graph); return graph;
}
/** Topological order, exact shapes, uniqueness and reachability are all checked. */
export function unpackRecursiveArtifactGraph(ctx: ExecutionContext, data: unknown, bounds: ExactArtifactBounds): unknown {
  checkArtifactBounds(ctx, bounds); inspectExactArtifact(ctx, bounds, data);
  const raw = w.record(ctx, data, ['root', 'nodes']), nodes = w.array(ctx, raw.nodes), root = w.integer(ctx).decode(raw.root);
  demand(nodes.length > 0 && root === nodes.length - 1, 'invalid-input', 'recursive graph complete root');
  ctx.allocate(nodes.length * 3); const values: unknown[] = [], edges: (readonly number[])[] = [], signatures = new Set<string>();
  function references(value: unknown, index: number): readonly number[] {
    const source = w.array(ctx, value); ctx.allocate(source.length);
    return Object.freeze(source.map(ref => { const n = w.integer(ctx).decode(ref); demand(n < index, 'invalid-input', 'recursive graph forward/cyclic reference'); return n; }));
  }
  for (let i = 0; i < nodes.length; i++) {
    ctx.tick(); const n = w.array(ctx, nodes[i]); let node: Node, value: unknown, children: readonly number[];
    if (n[0] === 'atom') {
      demand(n.length === 2 && (n[1] === null || typeof n[1] === 'string' || typeof n[1] === 'boolean' || typeof n[1] === 'number' && Number.isSafeInteger(n[1])), 'invalid-input', 'recursive graph atom shape');
      node = ['atom', n[1] as Atom]; value = n[1]; children = Object.freeze([]);
    } else if (n[0] === 'list') {
      demand(n.length === 2, 'invalid-input', 'recursive graph list shape'); children = references(n[1], i); ctx.allocate(children.length);
      value = Object.freeze(children.map(ref => values[ref])); node = ['list', children];
    } else {
      demand(n[0] === 'record' && n.length === 3, 'invalid-input', 'recursive graph record shape');
      const keys = w.array(ctx, n[1]); children = references(n[2], i);
      demand(keys.length === children.length, 'invalid-input', 'recursive graph property coverage'); ctx.allocate(keys.length * 2);
      const names = new Set<string>(), record: Record<string, unknown> = Object.create(null);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j]; demand(typeof key === 'string' && !names.has(key), 'invalid-input', 'recursive graph record key'); ctx.allocate(key.length + 1);
        names.add(key); record[key] = values[children[j]];
      }
      value = Object.freeze(record); node = ['record', keys as readonly string[], children];
    }
    const key = signature(ctx, node); demand(!signatures.has(key), 'invalid-input', 'duplicate recursive graph node'); ctx.allocate(key.length + 2); signatures.add(key);
    values.push(value); edges.push(children);
  }
  ctx.allocate(nodes.length); const reached = new Set<number>(), pending = [root];
  while (pending.length) {
    ctx.tick(); const id = pending.pop()!; if (reached.has(id)) continue;
    ctx.allocate(edges[id].length + 1); reached.add(id); for (const child of edges[id]) pending.push(child);
  }
  demand(reached.size === nodes.length, 'invalid-input', 'unreachable recursive graph evidence'); return values[root];
}
