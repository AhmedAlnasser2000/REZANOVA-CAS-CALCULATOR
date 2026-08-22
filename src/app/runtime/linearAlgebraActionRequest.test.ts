import { describe, expect, it } from 'vitest';
import { parseLinearAlgebraScalarWire } from '../../lib/linear-algebra/runtime-request';
import { buildMatrixActionRuntimeRequest } from './linearAlgebraMatrixActionRequest';
import { buildVectorActionRuntimeRequest } from './linearAlgebraVectorActionRequest';

function scalar(latex: string, domain: 'real' | 'complex' = 'real') {
  const parsed = parseLinearAlgebraScalarWire(latex, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

const baseMatrixState = {
  activeMatrixLeftId: 'matrix-a',
  activeMatrixRightId: 'matrix-b',
  complexExactForm: 'rectangular' as const,
  domain: 'real' as const,
  substitutionMode: 'symbolic' as const,
  storedVariables: [],
};

const baseVectorState = {
  activeVectorLeftId: 'vector-u',
  activeVectorRightId: 'vector-v',
  angleUnit: 'rad' as const,
  complexExactForm: 'rectangular' as const,
  domain: 'real' as const,
  substitutionMode: 'symbolic' as const,
  storedVariables: [],
};

describe('Linear Algebra action request routing', () => {
  it('uses numeric Matrix authority for the required finite-real operand only', () => {
    const state = {
      ...baseMatrixState,
      matrixValues: [
        { id: 'matrix-a', name: 'A', encoding: 'scalar-v1' as const, value: [[scalar('1/3')]] },
        { id: 'matrix-b', name: 'B', encoding: 'scalar-v1' as const, value: [[scalar('b')]] },
      ],
    };
    expect(buildMatrixActionRuntimeRequest('detA', state)).toMatchObject({
      request: {
        matrixA: [[1 / 3]],
        exactMatrixA: [[{ numerator: 1, denominator: 3 }]],
      },
    });
    expect(buildMatrixActionRuntimeRequest('add', state)).toMatchObject({
      request: { operandEncoding: 'scalar-v1' },
    });
  });

  it('uses numeric Vector authority for unary finite-real actions and scalar authority otherwise', () => {
    const state = {
      ...baseVectorState,
      vectorValues: [
        { id: 'vector-u', name: 'u', encoding: 'scalar-v1' as const, value: [scalar('1'), scalar('2')] },
        { id: 'vector-v', name: 'v', encoding: 'scalar-v1' as const, value: [scalar('a'), scalar('3')] },
      ],
    };
    expect(buildVectorActionRuntimeRequest('normA', state)).toMatchObject({
      request: {
        vectorA: [1, 2],
        exactVectorA: [{ numerator: 1, denominator: 1 }, { numerator: 2, denominator: 1 }],
      },
    });
    expect(buildVectorActionRuntimeRequest('dot', state)).toMatchObject({
      request: { operandEncoding: 'scalar-v1' },
    });
  });

  it('keeps Complex and stored-substitution actions on scalar authority', () => {
    const matrixValues = [
      { id: 'matrix-a', name: 'A', encoding: 'scalar-v1' as const, value: [[scalar('1')]] },
      { id: 'matrix-b', name: 'B', encoding: 'scalar-v1' as const, value: [[scalar('2')]] },
    ];
    expect(buildMatrixActionRuntimeRequest('detA', {
      ...baseMatrixState,
      domain: 'complex',
      matrixValues,
    })).toMatchObject({ request: { operandEncoding: 'scalar-v1' } });
    expect(buildMatrixActionRuntimeRequest('detA', {
      ...baseMatrixState,
      substitutionMode: 'use-stored-values',
      matrixValues,
    })).toMatchObject({ request: { operandEncoding: 'scalar-v1' } });
  });
});
