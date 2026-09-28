import { z } from 'zod';

// Renderer-neutral contracts for Graph GPU visual evaluation. A field frame
// tells a GPU renderer *what to evaluate*; viewport and camera still arrive
// through the existing view frames. Programs are derived on the main thread
// from structured Graph relations and are display-only: nothing produced
// from them may reach trace, Analyze, export, cache keys, or evidence.

export type GraphGpuComplexValueV1 = { re: number; im: number };

export type GraphGpuRealOpV1 =
  | { kind: 'literal'; value: number }
  | { kind: 'coordinate'; axis: 'x' | 'y' }
  | { kind: 'parameter'; index: number }
  | { kind: 'operator'; operator: string; arity: number };

export type GraphGpuComplexOpV1 =
  | { kind: 'z' }
  | { kind: 'constant'; value: GraphGpuComplexValueV1 }
  | { kind: 'parameter'; index: number }
  | { kind: 'power-integer'; exponent: number }
  | { kind: 'root'; degree: number }
  | { kind: 'operator'; operator: string; arity: number };

export type GraphGpuRealProgramV1 = {
  kind: 'real';
  key: string;
  ops: GraphGpuRealOpV1[];
  parameterNames: string[];
  /** GLSL defining `float graphReal(vec2 p, out bool ok)`. */
  glsl: string;
};

export type GraphGpuComplexProgramV1 = {
  kind: 'complex';
  key: string;
  ops: GraphGpuComplexOpV1[];
  parameterNames: string[];
  /** GLSL defining `vec2 graphComplex(vec2 z, out bool ok)`. */
  glsl: string;
};

export type GraphGpuProgramV1 = GraphGpuRealProgramV1 | GraphGpuComplexProgramV1;

export type GraphGpuFieldRouteV1 = 'complex-domain' | 'real-implicit' | 'real-inequality' | 'real-surface';

/** Grid a vertex-shader surface is evaluated on; required for `real-surface`. */
export type GraphGpuSurfaceGridV1 = {
  /** The CPU sampler's domain: the relation's bounds, else the sampled viewport. */
  domain: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** Vertices per side. */
  resolution: number;
};

export type GraphRendererFieldFrameV1 = {
  version: 1;
  items: Array<{ itemId: string; route: GraphGpuFieldRouteV1; program: GraphGpuProgramV1; surface?: GraphGpuSurfaceGridV1 }>;
  parameters: Record<string, number>;
};

export type GraphRendererFieldStatusV1 = {
  /** Items the renderer currently draws from their field programs. */
  drawnItemIds: string[];
  /** Items whose program failed on this device, with the reason; they stay on the CPU geometry. */
  failures: Record<string, string>;
};

export interface InteractiveGraphFieldRenderer {
  setFieldFrame(frame: GraphRendererFieldFrameV1 | null): void;
  getFieldStatus(): GraphRendererFieldStatusV1;
}

export const GRAPH_GPU_FIELD_LIMITS = {
  maximumItems: 32,
  maximumOps: 512,
  maximumParameters: 16,
  maximumGlslLength: 65_536,
  minimumSurfaceResolution: 2,
  maximumSurfaceResolution: 512,
} as const;

const finite = z.number().finite();
const identifier = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u);
const operator = z.strictObject({ kind: z.literal('operator'), operator: identifier, arity: z.number().int().min(1).max(64) });
const parameter = z.strictObject({ kind: z.literal('parameter'), index: z.number().int().min(0).max(GRAPH_GPU_FIELD_LIMITS.maximumParameters - 1) });
const programBase = {
  key: z.string().min(1).max(512),
  parameterNames: z.array(identifier).max(GRAPH_GPU_FIELD_LIMITS.maximumParameters),
  glsl: z.string().min(1).max(GRAPH_GPU_FIELD_LIMITS.maximumGlslLength),
};
const realProgram = z.strictObject({
  kind: z.literal('real'),
  ...programBase,
  ops: z.array(z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('literal'), value: finite }),
    z.strictObject({ kind: z.literal('coordinate'), axis: z.enum(['x', 'y']) }),
    parameter,
    operator,
  ])).min(1).max(GRAPH_GPU_FIELD_LIMITS.maximumOps),
});
const complexProgram = z.strictObject({
  kind: z.literal('complex'),
  ...programBase,
  ops: z.array(z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('z') }),
    z.strictObject({ kind: z.literal('constant'), value: z.strictObject({ re: finite, im: finite }) }),
    parameter,
    z.strictObject({ kind: z.literal('power-integer'), exponent: z.number().int().min(-1024).max(1024) }),
    z.strictObject({ kind: z.literal('root'), degree: z.number().int().min(2).max(1024) }),
    operator,
  ])).min(1).max(GRAPH_GPU_FIELD_LIMITS.maximumOps),
});
const fieldFrameSchema = z.strictObject({
  version: z.literal(1),
  items: z.array(z.strictObject({
    itemId: z.string().min(1).max(256),
    route: z.enum(['complex-domain', 'real-implicit', 'real-inequality', 'real-surface']),
    program: z.discriminatedUnion('kind', [realProgram, complexProgram]),
    surface: z.strictObject({
      domain: z.strictObject({ xMin: finite, xMax: finite, yMin: finite, yMax: finite }),
      resolution: z.number().int().min(GRAPH_GPU_FIELD_LIMITS.minimumSurfaceResolution)
        .max(GRAPH_GPU_FIELD_LIMITS.maximumSurfaceResolution),
    }).optional(),
  })).max(GRAPH_GPU_FIELD_LIMITS.maximumItems),
  parameters: z.record(identifier, finite),
}) as z.ZodType<GraphRendererFieldFrameV1>;

export type GraphRendererFieldFrameValidation =
  | { ok: true; value: GraphRendererFieldFrameV1 }
  | { ok: false; reason: string; path: string };

/**
 * Strict validation of a field frame, including route/program agreement and
 * parameter-index bounds, before any GLSL reaches a WebGL context.
 */
export function validateGraphRendererFieldFrame(input: unknown): GraphRendererFieldFrameValidation {
  const parsed = fieldFrameSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, reason: issue?.message ?? 'invalid field frame', path: `$.${issue?.path.join('.') ?? ''}` };
  }
  for (const [index, item] of parsed.data.items.entries()) {
    const expectedKind = item.route === 'complex-domain' ? 'complex' : 'real';
    if (item.program.kind !== expectedKind) {
      return { ok: false, reason: `route ${item.route} requires a ${expectedKind} program`, path: `$.items.${index}.program.kind` };
    }
    if ((item.route === 'real-surface') !== Boolean(item.surface)) {
      return { ok: false, reason: 'surface grids belong to real-surface items only', path: `$.items.${index}.surface` };
    }
    const domain = item.surface?.domain;
    if (domain && !(domain.xMax > domain.xMin && domain.yMax > domain.yMin)) {
      return { ok: false, reason: 'surface domain must have positive extent', path: `$.items.${index}.surface.domain` };
    }
    const outOfRange = item.program.ops.findIndex((op) => op.kind === 'parameter' && op.index >= item.program.parameterNames.length);
    if (outOfRange >= 0) return { ok: false, reason: 'parameter index outside parameterNames', path: `$.items.${index}.program.ops.${outOfRange}` };
    const missing = item.program.parameterNames.find((name) => !(name in parsed.data.parameters));
    if (missing) return { ok: false, reason: `missing parameter ${missing}`, path: `$.parameters.${missing}` };
  }
  return { ok: true, value: parsed.data };
}
