import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../../contracts';
import { compileGraphExpression } from '../../evaluator';
import { buildGraphGpuRealFieldProgram, GRAPH_GPU_MAX_FIELD_CLAUSES, graphGpuRealFieldValueShading } from './real-field';

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
});
