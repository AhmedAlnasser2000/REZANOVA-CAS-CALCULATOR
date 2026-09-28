import { describe, expect, it } from 'vitest';
import { validateGraphRendererFieldFrame, type GraphRendererFieldFrameV1 } from './gpu-types';

const frame = (): GraphRendererFieldFrameV1 => ({
  version: 1,
  parameters: { a: 1.5 },
  items: [
    { itemId: 'circle', route: 'real-implicit', program: {
      kind: 'real', key: 'circle@1', parameterNames: ['a'], glsl: 'float graphReal(vec2 p, out bool ok) { ok = true; return 0.0; }',
      ops: [{ kind: 'coordinate', axis: 'x' }, { kind: 'parameter', index: 0 }, { kind: 'operator', operator: 'Multiply', arity: 2 }],
    } },
    { itemId: 'log', route: 'complex-domain', program: {
      kind: 'complex', key: 'log@1', parameterNames: [], glsl: 'vec2 graphComplex(vec2 z, out bool ok) { ok = true; return z; }',
      ops: [{ kind: 'z' }, { kind: 'constant', value: { re: -1, im: 0 } }, { kind: 'operator', operator: 'Add', arity: 2 },
        { kind: 'power-integer', exponent: -2 }, { kind: 'root', degree: 3 }],
    } },
  ],
});

describe('Graph renderer field frame contract', () => {
  it('accepts well-formed real and complex field frames', () => {
    expect(validateGraphRendererFieldFrame(frame())).toMatchObject({ ok: true });
    expect(validateGraphRendererFieldFrame({ version: 1, items: [], parameters: {} })).toMatchObject({ ok: true });
  });

  it('rejects route/program mismatches, dangling parameters, and unsafe shapes', () => {
    const mismatch = frame();
    mismatch.items[0]!.route = 'complex-domain';
    expect(validateGraphRendererFieldFrame(mismatch)).toMatchObject({ ok: false, path: '$.items.0.program.kind' });

    const dangling = frame();
    dangling.items[0]!.program.ops.push({ kind: 'parameter', index: 3 });
    expect(validateGraphRendererFieldFrame(dangling)).toMatchObject({ ok: false, path: '$.items.0.program.ops.3' });

    const missing = frame();
    missing.parameters = {};
    expect(validateGraphRendererFieldFrame(missing)).toMatchObject({ ok: false, path: '$.parameters.a' });

    expect(validateGraphRendererFieldFrame({ ...frame(), extra: true }).ok).toBe(false);
    const nonFinite = frame();
    (nonFinite.items[1]!.program.ops[1] as { value: { re: number } }).value.re = Number.NaN;
    expect(validateGraphRendererFieldFrame(nonFinite).ok).toBe(false);
    const hugeShader = frame();
    hugeShader.items[0]!.program.glsl = 'x'.repeat(70_000);
    expect(validateGraphRendererFieldFrame(hugeShader).ok).toBe(false);
    const badIdentifier = frame();
    badIdentifier.items[0]!.program.parameterNames = ['a;b'];
    expect(validateGraphRendererFieldFrame(badIdentifier).ok).toBe(false);
  });

  it('requires a positive surface grid exactly on real-surface items', () => {
    const surface = (): GraphRendererFieldFrameV1 => ({
      version: 1, parameters: {},
      items: [{ itemId: 'bowl', route: 'real-surface', surface: { domain: { xMin: -2, xMax: 2, yMin: -1, yMax: 1 }, resolution: 128 },
        program: { kind: 'real', key: 'bowl@1', parameterNames: [], glsl: 'float graphReal(vec2 p, out bool ok) { ok = true; return 0.0; }',
          ops: [{ kind: 'coordinate', axis: 'x' }] } }],
    });
    expect(validateGraphRendererFieldFrame(surface())).toMatchObject({ ok: true });
    const missing = surface(); delete missing.items[0]!.surface;
    expect(validateGraphRendererFieldFrame(missing)).toMatchObject({ ok: false, path: '$.items.0.surface' });
    const stray = frame(); stray.items[0]!.surface = surface().items[0]!.surface;
    expect(validateGraphRendererFieldFrame(stray)).toMatchObject({ ok: false, path: '$.items.0.surface' });
    const flat = surface(); flat.items[0]!.surface!.domain.xMax = -2;
    expect(validateGraphRendererFieldFrame(flat)).toMatchObject({ ok: false, path: '$.items.0.surface.domain' });
    const dense = surface(); dense.items[0]!.surface!.resolution = 4096;
    expect(validateGraphRendererFieldFrame(dense).ok).toBe(false);
  });
});
