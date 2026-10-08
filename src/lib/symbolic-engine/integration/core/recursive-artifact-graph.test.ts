import { describe, expect, it } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { ExecutionContext } from './execution';
import { packRecursiveArtifactGraph as pack, unpackRecursiveArtifactGraph as unpack } from './recursive-artifact-graph';

type Graph = {root: number; nodes: unknown[][]};
const copy = (v: unknown) => JSON.parse(JSON.stringify(v)) as Graph;
describe('bounded exact recursive artifact data sharing', () => {
  it('stores repeated exact data once and preserves array order and every value', () => {
    const s = setup(), shared = {numerator: '123456789012345678901234567890', denominator: '7'}, source = {a: [shared, shared], b: [shared, {numerator: '-2', denominator: '3'}]};
    const data = pack(s.ctx, source, bounds), restored = unpack(s.ctx, JSON.parse(JSON.stringify(data)), bounds) as typeof source;
    expect(restored).toEqual(source); expect(restored.a[0]).toBe(restored.a[1]); expect(restored.a[0]).toBe(restored.b[0]);
    expect(pack(s.ctx, restored, bounds)).toEqual(data); expect(Object.isFrozen(restored)).toBe(true); expect(Object.isFrozen(restored.a)).toBe(true);
  });
  it('rejects forward, cyclic, missing, duplicate and unreachable references', () => {
    const s = setup(), data = pack(s.ctx, {a: ['0', '1']}, bounds);
    const mutations = [
      (d: Graph) => { d.root = 0; },
      (d: Graph) => { d.nodes[d.root][2] = [d.root]; },
      (d: Graph) => { d.nodes[d.root][2] = [9999]; },
      (d: Graph) => { d.nodes[0] = ['atom', 'changed']; d.nodes[1] = ['atom', 'changed']; },
      (d: Graph) => { d.nodes[d.root][1] = ['a', 'a']; },
      (d: Graph) => { d.nodes[d.root][2] = [0]; },
    ];
    for (const [i, mutate] of mutations.entries()) { const d = copy(data); mutate(d); expect(() => unpack(s.ctx, d, bounds), `mutation ${i}`).toThrow('invalid-input'); }
  });
  it('rejects accessor, hidden and prototype data without evaluating it', () => {
    const s = setup(); let evaluated = false;
    const getter = Object.defineProperty({}, 'x', {enumerable: true, get() { evaluated = true; return 0; }});
    expect(() => pack(s.ctx, getter, bounds)).toThrow('invalid-input'); expect(evaluated).toBe(false);
    const hidden = Object.defineProperty({a: 1}, 'secret', {value: 1}); expect(() => pack(s.ctx, hidden, bounds)).toThrow('invalid-input');
    expect(() => pack(s.ctx, Object.create({a: 1}), bounds)).toThrow('invalid-input');
  });
  it('bounds the stored graph before expanding any untrusted reference', () => {
    const s = setup(), data = pack(s.ctx, {a: ['0', '1']}, bounds);
    for (const b of [{...bounds, artifactBytes: 1}, {...bounds, artifactNodes: 1}, {...bounds, artifactDepth: 1}])
      expect(() => unpack(new ExecutionContext(s.ctx.limits), data, b)).toThrow('resource-limit');
    for (const limits of [{...s.ctx.limits, work: 1}, {...s.ctx.limits, allocation: 1}])
      expect(() => unpack(new ExecutionContext(limits), data, bounds)).toThrow('resource-limit');
  });
});
