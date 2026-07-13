import { describe, expect, it } from 'vitest';
import {
  canonicalMathValueFromProof,
  declareProducerOwnedAnswerMathJson,
  proveAnswerMathJson,
} from './proven-answer-mathjson';

function candidate(mathJson: unknown) {
  return declareProducerOwnedAnswerMathJson({
    mathJson,
    owner: 'calculate',
    routeId: 'calculate.arithmetic',
    source: 'unit-test-answer-node',
  });
}

describe('producer-proven answer MathJSON', () => {
  it('returns the validated producer tree with structural and printer evidence', () => {
    const result = proveAnswerMathJson({
      canonicalLatex: 'x+1',
      candidate: candidate(['Add', 'x', 1]),
    });
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        canonicalLatex: 'x+1',
        mathJson: ['Add', 'x', 1],
        semanticRelation: 'structural',
        printerSource: 'math-json',
      },
    });
    if (result.ok) {
      expect(structuredClone(result.evidence.mathJson)).toEqual(['Add', 'x', 1]);
      expect(canonicalMathValueFromProof(result.evidence)).toEqual({
        canonicalLatex: 'x+1',
        mathJson: ['Add', 'x', 1],
      });
    }
  });

  it('accepts equivalent compatibility formatting without replacing the producer tree', () => {
    const result = proveAnswerMathJson({
      canonicalLatex: String.raw`\frac{ 1 }{ 2 }`,
      candidate: candidate(['Divide', 1, 2]),
    });
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        mathJson: ['Divide', 1, 2],
        semanticRelation: 'structural',
        serializedLatex: String.raw`\frac{1}{2}`,
        printerSource: 'compatibility-fallback',
      },
    });
  });

  it('accepts independently simplified producer and presentation forms', () => {
    const result = proveAnswerMathJson({
      canonicalLatex: String.raw`\frac{1}{2}\sqrt{x^2-4}-\frac{x}{2}`,
      candidate: candidate([
        'Add',
        ['Multiply', ['Rational', -1, 2], 'x'],
        ['Multiply', ['Rational', 1, 2], ['Sqrt', ['Add', ['Power', 'x', 2], -4]]],
      ]),
    });
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        semanticRelation: 'simplified',
        printerSource: 'compatibility-fallback',
      },
    });
  });

  it('rejects mismatched answers and mismatched ownership', () => {
    expect(proveAnswerMathJson({
      canonicalLatex: 'x+2',
      candidate: candidate(['Add', 'x', 1]),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });

    const wrongOwner = declareProducerOwnedAnswerMathJson({
      mathJson: 1,
      owner: 'equation',
      routeId: 'calculate.arithmetic',
      source: 'wrong-owner',
    });
    expect(proveAnswerMathJson({ canonicalLatex: '1', candidate: wrongOwner }))
      .toMatchObject({ ok: false, failure: { reason: 'invalid-provenance' } });
  });

  it('rejects private operators even when Compute Engine can box them', () => {
    expect(proveAnswerMathJson({
      canonicalLatex: String.raw`\mathrm{CalcwizSecret}(1)`,
      candidate: candidate(['CalcwizSecret', 1]),
    })).toMatchObject({ ok: false, failure: { reason: 'private-operator' } });
    expect(proveAnswerMathJson({
      canonicalLatex: String.raw`\mathrm{RezanovaNode}(1)`,
      candidate: candidate({ fn: ['RezanovaNode', 1] }),
    })).toMatchObject({ ok: false, failure: { reason: 'private-operator' } });
  });

  it('fails closed when Compute Engine cannot compare a boxed candidate', () => {
    const inlineMatrixLatex = String.raw`\begin{bmatrix}1&1\\2&2\end{bmatrix}`;
    expect(proveAnswerMathJson({
      canonicalLatex: String.raw`\det(${inlineMatrixLatex})=0`,
      candidate: candidate([
        'Equal',
        ['Determinant', inlineMatrixLatex],
        0,
      ]),
    })).toMatchObject({ ok: false, failure: { reason: 'compute-engine-invalid' } });
  });

  it('preserves existing validation limits and rejects malformed values', () => {
    const cyclic: unknown[] = ['Add', 1];
    cyclic.push(cyclic);
    expect(proveAnswerMathJson({ canonicalLatex: '2', candidate: candidate(cyclic) }))
      .toMatchObject({ ok: false, failure: { reason: 'invalid-math-json' } });
    expect(proveAnswerMathJson({ canonicalLatex: 'x', candidate: candidate({ boxed: true }) }))
      .toMatchObject({ ok: false, failure: { reason: 'invalid-math-json' } });
  });
});
