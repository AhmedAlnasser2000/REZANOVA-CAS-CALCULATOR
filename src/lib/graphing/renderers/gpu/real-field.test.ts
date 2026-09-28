import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../../contracts';
import { compileGraphExpression } from '../../evaluator';
import { graphSurfaceContourStep } from '../../sampling/surface-contours';
import {
  buildGraphGpuRealFieldProgram, GRAPH_GPU_MAX_FIELD_CLAUSES, GRAPH_GPU_SURFACE_HEAT_SHADING,
  graphGpuRealFieldValueShading, graphGpuSurfaceHeatUniforms,
} from './real-field';

function plan(mathJson: GraphExpressionIR['mathJson'], freeSymbols: string[], planId: string) {
  const compiled = compileGraphExpression({ planId, sourceRevision: 1, expression: { mathJson, freeSymbols } });
  if (!compiled.ok) throw new Error(compiled.stopReason.detailCode);
  return compiled.plan;
}

describe('Graph GPU real field programs', () => {
  it('builds one clause function per comparison with shared parameter uniforms', () => {
    const program = buildGraphGpuRealFieldProgram([
      { left: plan(['Multiply', 'a', ['Power', 'x', 2]], ['a', 'x'], 'l0'), right: plan('y', ['y'], 'r0'), operator: '<=' },
      { left: plan('y', ['y'], 'l1'), right: plan(['Add', 'a', 3], ['a'], 'r1'), operator: '<' },
    ], { key: 'chained@1', fillsRegion: true });
    if (!('kind' in program)) throw new Error(program.reason);
    expect(program.clauseCount).toBe(2);
    expect(program.strict).toEqual([false, true]);
    expect(program.fillsRegion).toBe(true);
    expect(program.parameterNames).toEqual(['a']);
    expect(program.glsl).toContain('float graphClause0(vec2 p, out bool ok)');
    expect(program.glsl).toContain('float graphClause1(vec2 p, out bool ok)');
    expect(program.glsl).toContain('float graphReal(vec2 p, out bool ok)');
  });

  it('keeps "inside" at or below zero for greater-than comparisons', () => {
    const program = buildGraphGpuRealFieldProgram([
      { left: plan('y', ['y'], 'l'), right: plan('x', ['x'], 'r'), operator: '>' },
    ], { key: 'gt@1', fillsRegion: true });
    if (!('kind' in program)) throw new Error(program.reason);
    expect(program.glsl).toContain('return r - l;');
    expect(program.strict).toEqual([true]);
  });

  it('refuses empty, oversized, and unsupported relations', () => {
    const clause = { left: plan('x', ['x'], 'l'), right: plan('y', ['y'], 'r'), operator: '=' as const };
    expect(buildGraphGpuRealFieldProgram([], { key: 'none', fillsRegion: false })).toEqual({ ok: false, reason: 'no-clauses' });
    const tooMany = Array.from({ length: GRAPH_GPU_MAX_FIELD_CLAUSES + 1 }, () => clause);
    expect(buildGraphGpuRealFieldProgram(tooMany, { key: 'many', fillsRegion: true })).toEqual({ ok: false, reason: 'too-many-clauses' });
  });

  it('writes the undefined sentinel for non-finite clause values in pass 1', () => {
    const shading = graphGpuRealFieldValueShading(2);
    expect(shading.id).toBe('real-field-values-2');
    expect(shading.body).toContain('graphOk0 ? clamp(graphValue0, -1e29, 1e29) : 1e30');
    expect(shading.body).toContain('graphOk1 ? clamp(graphValue1, -1e29, 1e29) : 1e30');
    expect(shading.body).toContain(', 0.0, 0.0);');
  });

  it('draws a surface height map from a one-clause z - 0 program with the CPU ramp and contour step', () => {
    const program = buildGraphGpuRealFieldProgram([
      { left: plan(['Add', ['Power', 'x', 2], ['Power', 'y', 2]], ['x', 'y'], 'z'), right: plan(0, [], 'zero'), operator: '=' },
    ], { key: 'surface@1:surface', fillsRegion: false });
    if (!('kind' in program)) throw new Error(program.reason);
    expect(program.clauseCount).toBe(1);
    expect(graphGpuSurfaceHeatUniforms({ minimum: 0, maximum: 8 })).toEqual({ uRange: [0, 8], uContourStep: graphSurfaceContourStep(0, 8) });
    expect(graphGpuSurfaceHeatUniforms({ minimum: 2, maximum: 2 }).uContourStep).toBe(0);
    // Undefined points and points outside the sampled bounds stay transparent.
    expect(GRAPH_GPU_SURFACE_HEAT_SHADING.body).toContain('if (outside || abs(value) >= 1e29 + 1e28) { outColor = vec4(0.0); return; }');
    expect(GRAPH_GPU_SURFACE_HEAT_SHADING.body).toContain('graphHsl(0.62 - ratio * 0.52, 0.76, 0.5)');
  });
});
