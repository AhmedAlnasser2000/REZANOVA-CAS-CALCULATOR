import { describe, expect, it } from 'vitest';
import { solveTranscendentalDegeneracyBranches } from './integration/transcendental-degeneracy-branch-solver';

describe('transcendental degeneracy branch solver', () => {
  it('splits pivot, slope, repeated-resultant, and parameter vanishings into generic and degenerate rows', () => {
    const result = solveTranscendentalDegeneracyBranches([
      { kind: 'pivot', expressionLatex: 'a', label: 'RDE pivot' },
      { kind: 'slope', expressionLatex: 'm', label: 'affine slope' },
    ]);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(`expected branch rows, got ${JSON.stringify(result)}`);
    }
    expect(result.branchRows).toHaveLength(4);
    expect(result.branchRows[0]).toMatchObject({
      branchKind: 'generic',
      conditionLatex: 'a\\ne0, m\\ne0',
    });
    expect(result.branchRows.some((row) => row.conditionLatex.includes('a=0'))).toBe(true);
    expect(result.branchRows.some((row) => row.conditionLatex.includes('m=0'))).toBe(true);
  });

  it('uses three real branches for discriminant signs', () => {
    const result = solveTranscendentalDegeneracyBranches([
      { kind: 'discriminant-sign', expressionLatex: '4ac-b^2' },
    ]);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(`expected branch rows, got ${JSON.stringify(result)}`);
    }
    expect(result.branchRows.map((row) => row.conditionLatex)).toEqual([
      '4ac-b^2>0',
      '4ac-b^2=0',
      '4ac-b^2<0',
    ]);
  });

  it('records repeated-resultant and special-parameter branch evidence', () => {
    const result = solveTranscendentalDegeneracyBranches([
      { kind: 'repeated-resultant', expressionLatex: '\\operatorname{disc}(R)' },
      { kind: 'parameter', expressionLatex: 'q-1' },
    ]);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(`expected branch rows, got ${JSON.stringify(result)}`);
    }
    expect(result.branchRows).toHaveLength(4);
    expect(result.branchRows[0].proofScope).toContain('repeated-resultant nonzero branch');
    expect(result.branchRows[3]).toMatchObject({
      branchKind: 'degenerate',
      conditionLatex: '\\operatorname{disc}(R)=0, q-1=0',
    });
  });

  it('stops cleanly when branch combinations exceed the formal row cap', () => {
    const result = solveTranscendentalDegeneracyBranches([
      { kind: 'discriminant-sign', expressionLatex: '\\Delta_1' },
      { kind: 'discriminant-sign', expressionLatex: '\\Delta_2' },
      { kind: 'discriminant-sign', expressionLatex: '\\Delta_3' },
    ]);

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'branch-row-cap',
      attemptedRows: 27,
      capEvidence: {
        casewiseBranchRowCap: 12,
      },
      proofMode: 'exact-symbolic-no-compute-engine',
    });
  });
});
