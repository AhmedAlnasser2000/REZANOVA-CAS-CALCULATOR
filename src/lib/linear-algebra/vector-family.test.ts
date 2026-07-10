import { describe, expect, it } from 'vitest';
import type { ExactScalarWire, VectorRequest } from '../../types/calculator';
import { runVectorFamilyOperation } from './vector-family';

const exact = (vectors: number[][]): ExactScalarWire[][] => vectors.map((vector) => (
  vector.map((numerator) => ({ numerator, denominator: 1 }))
));

function request(
  operation: 'span' | 'independent',
  vectors: number[][],
  labels = vectors.map((_, index) => `v_{${index + 1}}`),
): VectorRequest {
  return {
    operation,
    vectorA: vectors[0] ?? [],
    vectorB: vectors[1] ?? vectors[0],
    vectorOperands: vectors,
    exactVectorOperands: exact(vectors),
    vectorOperandLatexList: labels,
    angleUnit: 'rad',
  };
}

describe('runVectorFamilyOperation', () => {
  it('returns span dimension, an input-selected basis, and a dependence relation', () => {
    const response = runVectorFamilyOperation(request(
      'span',
      [[1, 0], [0, 1], [1, 1]],
      ['p', 'q', 'r'],
    ));

    expect(response.resultLatex).toBe(
      '\\operatorname{span}\\left(p,q,r\\right)=\\operatorname{span}\\left\\{p,q\\right\\}',
    );
    expect(response.approxText).toBeUndefined();
    expect(response.answerRows?.rows.map((row) => row.latex)).toEqual([
      '\\dim\\operatorname{span}\\left(p,q,r\\right)=2',
      '\\operatorname{basis}=\\left\\{p,q\\right\\}',
    ]);
    expect(response.detailSections?.map((section) => section.title)).toEqual([
      'Span Facts',
      'Dependence Relation',
      'RREF Evidence',
    ]);
    expect(response.detailSections?.[1]?.lines).toContain('p+q-r=0');
    expect(response.detailSections?.[1]?.lines).toContain('r=p+q');
  });

  it('classifies independent and dependent vector families exactly', () => {
    expect(runVectorFamilyOperation(request(
      'independent',
      [[1, 0], [0, 1]],
      ['p', 'q'],
    )).resultLatex).toBe(
      '\\operatorname{independent}\\left(p,q\\right)=\\text{Yes}',
    );

    const dependent = runVectorFamilyOperation(request(
      'independent',
      [[1, 0], [0, 1], [1, 1]],
      ['p', 'q', 'r'],
    ));
    expect(dependent.resultLatex).toBe(
      '\\operatorname{independent}\\left(p,q,r\\right)=\\text{No}',
    );
    expect(dependent.detailSections?.[1]?.lines).toContain('p+q-r=0');
  });

  it('handles duplicates, zero vectors, six vectors, mismatches, and exact caps', () => {
    const duplicate = runVectorFamilyOperation(request('independent', [[1, 0], [1, 0]], ['p', 'q']));
    expect(duplicate.resultLatex).toContain('\\text{No}');
    expect(duplicate.detailSections?.[1]?.lines).toContain('p-q=0');

    const zero = runVectorFamilyOperation(request('independent', [[0, 0]], ['z']));
    expect(zero.resultLatex).toContain('\\text{No}');

    const identitySix = Array.from({ length: 6 }, (_, row) => (
      Array.from({ length: 6 }, (_, column) => Number(row === column))
    ));
    expect(runVectorFamilyOperation(request('independent', identitySix)).resultLatex).toContain('\\text{Yes}');

    expect(runVectorFamilyOperation(request('span', [[1, 0], [1]]))).toMatchObject({
      error: 'All vectors in span and independence must have the same length.',
    });
    expect(runVectorFamilyOperation(request('span', [Array(7).fill(1)]))).toMatchObject({
      error: expect.stringContaining('length up to 6'),
    });
    expect(runVectorFamilyOperation(request('span', Array.from({ length: 7 }, () => [1])))).toMatchObject({
      error: expect.stringContaining('one through 6 vectors'),
    });
  });
});
