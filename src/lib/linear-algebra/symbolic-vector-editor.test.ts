import { describe, expect, it } from 'vitest';
import { dispatchVectorEditorLatex } from './editor-dispatch';
import { parseLinearAlgebraScalarWire } from './scalar-wire';

function scalar(latex: string, domain: 'real' | 'complex' = 'real') {
  const parsed = parseLinearAlgebraScalarWire(latex, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe('symbolic Vector editor dispatch', () => {
  it('evaluates arbitrary symbolic coefficients without treating x as privileged', () => {
    const result = dispatchVectorEditorLatex({
      latex: 'a u+b v',
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorValues: [
        { id: 'u', name: 'u', value: [1, 0] },
        { id: 'v', name: 'v', value: [0, 1] },
      ],
      angleUnit: 'rad',
      domain: 'real',
      substitutionMode: 'symbolic',
      storedVariables: [],
      complexExactForm: 'rectangular',
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.request.operandEncoding !== 'scalar-v1') return;
    expect(result.request.operation).toBe('add');
    expect(result.request.vectorA.source.map((entry) => entry.canonicalLatex)).toEqual(['a', '0']);
    expect(result.request.vectorB.source.map((entry) => entry.canonicalLatex)).toEqual(['0', 'b']);
  });

  it('substitutes every available parameter while retaining unmatched parameters formally', () => {
    const result = dispatchVectorEditorLatex({
      latex: 'a u+b v',
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorValues: [
        { id: 'u', name: 'u', value: [1, 0] },
        { id: 'v', name: 'v', value: [0, 1] },
      ],
      angleUnit: 'rad',
      domain: 'real',
      substitutionMode: 'use-stored-values',
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
      complexExactForm: 'rectangular',
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.request.operandEncoding !== 'scalar-v1') return;
    expect(result.request.vectorA.source.map((entry) => entry.canonicalLatex)).toEqual(['a', '0']);
    expect(result.request.vectorA.resolved.map((entry) => entry.canonicalLatex)).toEqual(['2', '0']);
    expect(result.request.vectorB.source.map((entry) => entry.canonicalLatex)).toEqual(['0', 'b']);
    expect(result.request.vectorB.resolved.map((entry) => entry.canonicalLatex)).toEqual(['0', 'b']);
    expect(result.request.substitutionSnapshot).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
  });

  it('routes scalar-v1 complex named vectors through the Hermitian dot operation', () => {
    const result = dispatchVectorEditorLatex({
      latex: 'u\\cdot v',
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorValues: [
        { id: 'u', name: 'u', encoding: 'scalar-v1', value: [scalar('1', 'complex'), scalar('i', 'complex')] },
        { id: 'v', name: 'v', encoding: 'scalar-v1', value: [scalar('i', 'complex'), scalar('1', 'complex')] },
      ],
      angleUnit: 'rad',
      domain: 'complex',
      substitutionMode: 'symbolic',
      storedVariables: [],
      complexExactForm: 'cis',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toMatchObject({
      operandEncoding: 'scalar-v1',
      operation: 'dot',
      domain: 'complex',
      complexExactForm: 'cis',
    });
  });

  it('routes complex named vector functions instead of falling into scalar parse errors', () => {
    const base = {
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorValues: [
        { id: 'u', name: 'u', encoding: 'scalar-v1' as const, value: [scalar('1', 'complex'), scalar('i', 'complex')] },
        { id: 'v', name: 'v', encoding: 'scalar-v1' as const, value: [scalar('i', 'complex'), scalar('1', 'complex')] },
      ],
      angleUnit: 'grad' as const,
      domain: 'complex' as const,
      substitutionMode: 'symbolic' as const,
      storedVariables: [],
      complexExactForm: 'rectangular' as const,
    };

    expect(dispatchVectorEditorLatex({
      ...base,
      latex: '\\operatorname{orthogonal}\\left(u,v\\right)',
    })).toMatchObject({
      ok: true,
      request: { operation: 'orthogonalCheck', operandEncoding: 'scalar-v1' },
    });
    expect(dispatchVectorEditorLatex({
      ...base,
      latex: '\\angle\\left(u,v\\right)',
    })).toMatchObject({
      ok: true,
      request: { operation: 'angle', operandEncoding: 'scalar-v1', angleUnit: 'grad' },
    });
    expect(dispatchVectorEditorLatex({
      ...base,
      latex: '\\operatorname{gramSchmidt}\\left(u,v\\right)',
    })).toMatchObject({
      ok: true,
      request: { operation: 'gramSchmidtUV', operandEncoding: 'scalar-v1' },
    });
  });

  it('preserves a one-vector family for conditional independence', () => {
    const result = dispatchVectorEditorLatex({
      latex: '\\operatorname{independent}(u)',
      vectorA: [0],
      vectorB: [0],
      vectorValues: [
        { id: 'u', name: 'u', encoding: 'scalar-v1', value: [scalar('a')] },
        { id: 'v', name: 'v', value: [0] },
      ],
      angleUnit: 'rad',
      domain: 'real',
      substitutionMode: 'symbolic',
      storedVariables: [],
      complexExactForm: 'rectangular',
    });
    expect(result).toMatchObject({
      ok: true,
      request: { operation: 'independent', vectorOperands: [{ resolved: [{ canonicalLatex: 'a' }] }] },
    });
  });
});
