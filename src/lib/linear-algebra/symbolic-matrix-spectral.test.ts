import { describe, expect, it } from 'vitest';
import type { ScalarMatrixRequestV1 } from '../../types/calculator';
import { linearAlgebraCanonicalEvidenceForResponse } from './canonical-evidence';
import { parseLinearAlgebraScalarWire } from './scalar-wire';
import { runSymbolicMatrixOperation } from './symbolic-matrix';
import { runMatrixMode } from '../modes/matrix';

function wire(latex: string, domain: 'real' | 'complex') {
  const parsed = parseLinearAlgebraScalarWire(latex, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function request(
  operation: ScalarMatrixRequestV1['operation'],
  values: string[][],
  domain: 'real' | 'complex' = 'real',
): ScalarMatrixRequestV1 {
  const matrix = values.map((row) => row.map((value) => wire(value, domain)));
  return {
    operation,
    operandEncoding: 'scalar-v1',
    matrixA: { encoding: 'scalar-v1', source: matrix, resolved: matrix },
    domain,
    matrixOperandLatexA: 'A',
  };
}

describe('symbolic Matrix spectral operations', () => {
  it('keeps a four-parameter diagonal characteristic polynomial factorized', () => {
    const scalarRequest = request('charpolyA', [
      ['a', '0', '0', '0'],
      ['0', 'b', '0', '0'],
      ['0', '0', 'c', '0'],
      ['0', '0', '0', 'd'],
    ]);
    const response = runSymbolicMatrixOperation(scalarRequest);
    expect(response.error).toBeUndefined();
    expect(response.resultLatex).toContain('lambda-a');
    expect(response.resultLatex).toContain('lambda-d');
    expect(response.answerRows?.rows[0]?.label).toBe('Characteristic polynomial');
    expect(linearAlgebraCanonicalEvidenceForResponse(response).primary?.source)
      .toContain('native-symbolic-spectral');
    const outcome = runMatrixMode({ ...scalarRequest, matrixB: scalarRequest.matrixA });
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.canonicalResult?.version).toBe(2);
      expect(outcome.canonicalResult?.answerRows?.rows[0]?.label)
        .toBe('Characteristic polynomial');
    }
  });

  it('chooses a collision-free spectral target', () => {
    const response = runSymbolicMatrixOperation(request('charpolyA', [['\\lambda']]));
    expect(response.error).toBeUndefined();
    expect(JSON.stringify(linearAlgebraCanonicalEvidenceForResponse(response).primary?.mathJson))
      .toContain('lambda_1');
  });

  it('distinguishes Real and Complex spectral domains for a rotation', () => {
    const values = [['0', '-1'], ['1', '0']];
    const real = runSymbolicMatrixOperation(request('eigenA', values, 'real'));
    const complex = runSymbolicMatrixOperation(request('eigenA', values, 'complex'));
    expect(real.resultLatex).toContain('\\emptyset');
    expect(complex.error).toBeUndefined();
    expect(complex.answerRows?.rows.filter((row) => row.label === 'Eigenvalue')).toHaveLength(2);
    expect(complex.answerRows?.rows.filter((row) => row.label === 'Eigenspace')).toHaveLength(2);
  });

  it('diagonalizes a proved exact 3 by 3 matrix', () => {
    const response = runSymbolicMatrixOperation(request('diagonalizeA', [
      ['1', '0', '0'],
      ['0', '2', '0'],
      ['0', '0', '3'],
    ]));
    expect(response.error).toBeUndefined();
    expect(response.answerRows?.rows.map((row) => row.label))
      .toEqual(['P', 'D', 'P inverse', 'Reconstruction']);
  });
});
