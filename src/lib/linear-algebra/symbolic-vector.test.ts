import { describe, expect, it } from 'vitest';
import type {
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarVectorOperandV1,
  ScalarVectorRequestV1,
  VersionedResultProducerDraft,
  VectorOperation,
} from '../../types/calculator';
import { runVectorMode } from '../modes/vector';
import { parseLinearAlgebraScalarWire } from './scalar-wire';
import { runSymbolicVectorOperation } from './symbolic-vector';

function scalar(latex: string, domain: LinearAlgebraScalarDomain) {
  const parsed = parseLinearAlgebraScalarWire(latex, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function operand(
  values: readonly string[],
  domain: LinearAlgebraScalarDomain,
): LinearAlgebraScalarVectorOperandV1 {
  const entries = values.map((value) => scalar(value, domain));
  return { encoding: 'scalar-v1', source: entries, resolved: entries };
}

function request(
  operation: VectorOperation,
  left: readonly string[],
  right: readonly string[],
  domain: LinearAlgebraScalarDomain = 'real',
): ScalarVectorRequestV1 & { vectorB: LinearAlgebraScalarVectorOperandV1 } {
  return {
    operation,
    operandEncoding: 'scalar-v1',
    vectorA: operand(left, domain),
    vectorB: operand(right, domain),
    angleUnit: 'rad',
    domain,
    substitutionMode: 'symbolic',
  };
}

function nonPrompt(result: VersionedResultProducerDraft) {
  if (result.kind === 'prompt') throw new Error('Expected a completed Vector result.');
  return result;
}

describe('symbolic and complex Vector producer', () => {
  it('keeps the real symbolic dot product as ac+bd', () => {
    const response = runSymbolicVectorOperation(request('dot', ['a', 'b'], ['c', 'd']));
    expect(response.error).toBeUndefined();
    expect(response.resultLatex).toBe('ac+bd');

    const outcome = nonPrompt(runVectorMode(request('dot', ['a', 'b'], ['c', 'd'])));
    expect(outcome.kind).toBe('success');
    expect(outcome.canonicalResult?.version).toBe(2);
    if (outcome.canonicalResult?.version !== 2) throw new Error('Expected V2.');
    expect(outcome.canonicalResult.primary?.kind).toBe('math');
  });

  it('uses the Hermitian inner product and proves the locked complex example orthogonal', () => {
    const dot = runSymbolicVectorOperation(request('dot', ['1', 'i'], ['i', '1'], 'complex'));
    expect(dot.resultLatex).toBe('0');

    const result = nonPrompt(runVectorMode(request('orthogonalCheck', ['1', 'i'], ['i', '1'], 'complex')));
    expect(result.kind).toBe('success');
    expect(result.title).toBe('orthogonal(u,v)');
    expect(result.exactLatex).toBe('\\text{Orthogonal}');
  });

  it('labels complex cross products and Gram measures without orientation claims', () => {
    const cross = nonPrompt(runVectorMode(request('cross', ['1', 'i', '0'], ['0', '1', 'i'], 'complex')));
    expect(cross.kind).toBe('success');
    expect(cross.title).toBe('Algebraic cross product');
    expect(cross.detailSections ?? []).toEqual([]);

    const area = nonPrompt(runVectorMode(request('parallelogramArea', ['1', 'i'], ['i', '1'], 'complex')));
    expect(area.kind).toBe('success');
    expect(area.title).toBe('Hermitian Gram area');
    expect(area.detailSections ?? []).toEqual([]);
  });

  it('uses the configured complex form for exact-constant numeric readback', () => {
    const input = {
      ...request('dot', ['1', '0'], ['i', '0'], 'complex'),
      complexExactForm: 'cis' as const,
    };
    const result = nonPrompt(runVectorMode(input));
    expect(result.kind).toBe('success');
    expect(result.approxText).toContain('cis');
    if (result.canonicalResult?.version !== 2) throw new Error('Expected V2.');
    expect(result.canonicalResult.primary).toMatchObject({
      kind: 'math',
      value: { mathJson: expect.anything() },
    });
  });

  it('emits producer-proven nonzero conditions for formal projections', () => {
    const result = nonPrompt(runVectorMode(request('projectionUofV', ['a', '0'], ['1', '1'])));
    expect(result.kind).toBe('success');
    expect(result.exactSupplementLatex?.join(' ')).toContain('a');
    if (result.canonicalResult?.version !== 2) throw new Error('Expected V2.');
    expect(result.canonicalResult.supplements?.[0]?.math.mathJson).toBeDefined();
  });

  it('uses standard Which MathJSON for bounded symbolic classifications', () => {
    const result = nonPrompt(runVectorMode(request('orthogonalCheck', ['a', '0'], ['1', '0'])));
    expect(result.kind).toBe('success');
    if (result.canonicalResult?.version !== 2) throw new Error('Expected V2.');
    const primary = result.canonicalResult.primary;
    expect(primary?.kind).toBe('math');
    if (primary?.kind !== 'math') return;
    expect(Array.isArray(primary.value.mathJson) && primary.value.mathJson[0]).toBe('Which');
  });

  it('retains the narrow V3 gradian angle for symbolic operands', () => {
    const input = { ...request('angle', ['1', '0'], ['0', '1']), angleUnit: 'grad' as const };
    const result = nonPrompt(runVectorMode(input));
    expect(result.kind).toBe('success');
    expect(result.exactLatex).toBe('100^{g}');
    expect(result.canonicalResult?.version).toBe(3);
    if (result.canonicalResult?.version !== 3) throw new Error('Expected V3.');
    expect(result.canonicalResult.primary).toMatchObject({
      kind: 'angle-quantity',
      unit: 'grad',
    });
  });

  it('labels the Complex angle as a principal line angle', () => {
    const result = nonPrompt(runVectorMode(request('angle', ['1', 'i'], ['1', '0'], 'complex')));
    expect(result.kind).toBe('success');
    expect(result.title).toBe('Principal line angle');
    expect(result.canonicalResult?.version).toBe(2);
  });

  it('proves the formal principal line angle instead of failing canonical validation', () => {
    const result = nonPrompt(runVectorMode(request('angle', ['a', 'b'], ['c', 'd'])));
    expect(result.kind).toBe('success');
    expect(result.title).toBe('∠(u,v)');
    expect(result.canonicalResult?.version).toBe(2);
    expect(result.exactLatex).toContain('\\arccos');
  });

  it('keeps every Milestone 9 symbolic Vector family on producer-proven V2', () => {
    const operations: VectorOperation[] = [
      'add', 'subtract', 'dot', 'cross', 'normA', 'normB', 'projectionUofV',
      'projectionVofU', 'orthogonalToU', 'orthogonalToV', 'unitA', 'unitB',
      'orthogonalCheck', 'parallel', 'distance', 'parallelogramArea',
      'triangleArea', 'linearCombination', 'volume',
    ];
    for (const operation of operations) {
      const base = request(operation, ['a', '1', '0'], ['1', '0', '1']);
      const third = operand(['0', '1', '1'], 'real');
      const input = operation === 'volume'
        ? { ...base, vectorOperands: [base.vectorA, base.vectorB, third] }
        : operation === 'linearCombination'
          ? { ...base, vectorOperands: [base.vectorA, base.vectorB] }
          : base;
      const result = nonPrompt(runVectorMode(input));
      expect(result.canonicalResult?.version, operation).toBe(2);
    }
  });

  it('runs bounded symbolic Gram-Schmidt with producer-proven conditions', () => {
    const base = request('gramSchmidtUV', ['a', '0'], ['0', '1']);
    const result = nonPrompt(runVectorMode({
      ...base,
      vectorOperands: [base.vectorA, base.vectorB],
    }));
    expect(result.kind).toBe('success');
    expect(result.canonicalResult?.version).toBe(2);
    expect(result.exactSupplementLatex?.join(' ')).toContain('a');
  });

  it('classifies symbolic span and independence through the shared elimination ceiling', () => {
    const independentBase = request('independent', ['1', '0'], ['0', '1']);
    const independent = nonPrompt(runVectorMode({
      ...independentBase,
      vectorOperands: [independentBase.vectorA, independentBase.vectorB],
    }));
    expect(independent.kind).toBe('success');
    expect(independent.canonicalResult?.version).toBe(2);
    if (independent.canonicalResult?.version !== 2) throw new Error('Expected V2.');
    expect(independent.canonicalResult.primary?.kind).toBe('linear-independence');
    expect(independent.exactLatex).toBe('\\text{Independent}');

    const conditionalBase = request('independent', ['a'], ['1']);
    const conditional = nonPrompt(runVectorMode({
      ...conditionalBase,
      vectorOperands: [conditionalBase.vectorA],
    }));
    expect(conditional.canonicalResult?.version).toBe(2);
    if (conditional.canonicalResult?.version !== 2) return;
    const primary = conditional.canonicalResult.primary;
    expect(primary?.kind).toBe('math');
    if (primary?.kind === 'math') {
      expect(Array.isArray(primary.value.mathJson) && primary.value.mathJson[0]).toBe('Which');
    }
  });
});
