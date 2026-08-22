import { describe, expect, it } from 'vitest';
import { parseLinearAlgebraScalarWire } from './scalar-wire';
import {
  projectMatrixNamedValueToNumeric,
  projectVectorNamedValueToNumeric,
} from './numeric-scalar-projection';

function scalar(latex: string) {
  const parsed = parseLinearAlgebraScalarWire(latex, 'real');
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe('Linear Algebra numeric scalar projection', () => {
  it('projects finite real scalar matrices without changing their stored encoding', () => {
    const namedValue = {
      id: 'matrix-a',
      name: 'A',
      encoding: 'scalar-v1' as const,
      value: [[scalar('2'), scalar('0.5')], [scalar('-3'), scalar('4')]],
    };

    const projected = projectMatrixNamedValueToNumeric(namedValue);
    expect(projected).toEqual({
      value: [[2, 0.5], [-3, 4]],
    });
    expect(projected?.exactValue).toBeUndefined();
    expect(namedValue.encoding).toBe('scalar-v1');
  });

  it('carries exact rational evidence into numeric Matrix and Vector projections', () => {
    expect(projectMatrixNamedValueToNumeric({
      id: 'matrix-a',
      name: 'A',
      encoding: 'scalar-v1',
      value: [[scalar('\\frac{1}{3}'), scalar('2')]],
    })).toEqual({
      value: [[1 / 3, 2]],
      exactValue: [[
        { numerator: 1, denominator: 3 },
        { numerator: 2, denominator: 1 },
      ]],
    });

    expect(projectVectorNamedValueToNumeric({
      id: 'vector-u',
      name: 'u',
      encoding: 'scalar-v1',
      value: [scalar('-\\frac{2}{5}'), scalar('7')],
    })).toEqual({
      value: [-2 / 5, 7],
      exactValue: [
        { numerator: -2, denominator: 5 },
        { numerator: 7, denominator: 1 },
      ],
    });
  });

  it('refuses formal scalar leaves instead of manufacturing a numeric value', () => {
    expect(projectVectorNamedValueToNumeric({
      id: 'vector-u',
      name: 'u',
      encoding: 'scalar-v1',
      value: [scalar('a'), scalar('1')],
    })).toBeNull();
  });
});
