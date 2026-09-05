import { describe, expect, it } from 'vitest';
import {
  canonicalMathValueFromProof,
  declareProducerOwnedAnswerMathJson,
  proveAnswerMathJson,
  proveStandardAnswerMathJson,
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

  it('accepts non-formal radical forms with identical canonical boxed trees', () => {
    const result = proveAnswerMathJson({
      canonicalLatex: String.raw`-\frac{1}{2}-\frac{1}{10}\sqrt{275+50\sqrt{13}}`,
      candidate: candidate([
        'Add',
        ['Rational', -1, 2],
        [
          'Multiply',
          ['Rational', -1, 10],
          ['Sqrt', ['Add', 275, ['Multiply', 50, ['Sqrt', 13]]]],
        ],
      ]),
    });

    expect(result).toMatchObject({
      ok: true,
      evidence: {
        semanticRelation: 'structural',
        printerSource: 'compatibility-fallback',
      },
    });
  });

  it('accepts exact producer serialization when nested-radical reparsing is weaker', () => {
    const root = [
      'Divide',
      [
        'Subtract',
        -1,
        [
          'Sqrt',
          [
            'Subtract',
            ['Power', 1, 2],
            ['Multiply', 4, ['Subtract', 0, ['Add', ['Divide', ['Sqrt', 5], 2], ['Rational', 1, 2]]]],
          ],
        ],
      ],
      2,
    ];
    const canonicalLatex = String.raw`\frac{1}{2}(-\sqrt{1-4(-(5^{1/2}/2)-1/2)}-1)`;

    expect(proveAnswerMathJson({
      canonicalLatex,
      candidate: candidate(root),
    })).toMatchObject({
      ok: true,
      evidence: {
        mathJson: root,
        semanticRelation: 'structural',
      },
    });

    expect(proveAnswerMathJson({
      canonicalLatex: String.raw`\frac{1}{2}(-\sqrt{1-4(-(5^{1/2}/2)-1/2)}-2)`,
      candidate: candidate(root),
    })).toMatchObject({
      ok: false,
      failure: { reason: 'semantic-mismatch' },
    });
  });

  it('keeps ordinary Calculus function and differential trees on exact comparison', () => {
    expect(proveAnswerMathJson({
      canonicalLatex: String.raw`y\left(1\right)\approx2.71828`,
      candidate: candidate(['Approx', ['y', 1], 2.71828]),
    })).toMatchObject({ ok: true });

    expect(proveAnswerMathJson({
      canonicalLatex: String.raw`\frac{dy}{dx}=-\frac{x}{y}`,
      candidate: candidate([
        'Equal',
        [
          'Divide',
          ['InvisibleOperator', 'd', 'y'],
          ['InvisibleOperator', 'd', 'x'],
        ],
        ['Divide', ['Multiply', -2, 'x'], ['Multiply', 2, 'y']],
      ]),
    })).toMatchObject({ ok: true });
  });

  it('accepts standard formal Apply trees behind visible function notation', () => {
    const result = proveStandardAnswerMathJson({
      canonicalLatex: String.raw`\frac{f\left(x\right)^2}{2}+C`,
      candidate: candidate([
        'Add',
        ['Divide', ['Power', ['Apply', 'f', 'x'], 2], 2],
        'C',
      ]),
    });
    expect(result).toMatchObject({
      ok: true,
      evidence: {
        semanticRelation: 'equal',
        printerSource: 'compatibility-fallback',
      },
    });

    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`\frac{f\left(x\right)^2}{2}+C`,
      candidate: candidate([
        'Add',
        ['Divide', ['Power', ['f', 'x'], 2], 2],
        'C',
      ]),
    })).toMatchObject({ ok: false });
  });

  it('accepts canonical lowercase error-function notation for standard MathJSON heads', () => {
    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`\frac{\sqrt{\pi}}{2}\cdot \operatorname{erf}\left(x\right)`,
      candidate: candidate([
        'Multiply',
        ['Divide', ['Sqrt', 'Pi'], 2],
        ['Erf', 'x'],
      ]),
    })).toMatchObject({
      ok: true,
      evidence: {
        semanticRelation: 'equal',
        printerSource: 'compatibility-fallback',
      },
    });

    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`\operatorname{erf}\left(x+1\right)`,
      candidate: candidate(['Erf', 'x']),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });
  });

  it('compares reviewed formal operators deterministically without changing producer trees', () => {
    const cases = [
      {
        canonicalLatex: String.raw`\det(A)=1`,
        mathJson: ['Equal', ['Determinant', 'A'], 1],
      },
      {
        canonicalLatex: String.raw`\operatorname{tr}(A)=2`,
        mathJson: ['Equal', ['Trace', 'A'], 2],
      },
      {
        canonicalLatex: String.raw`\operatorname{dimension}(V)=3`,
        mathJson: ['Equal', ['Apply', 'dim', 'V'], 3],
      },
      {
        canonicalLatex: String.raw`u\cdot v=0`,
        mathJson: ['Equal', ['Apply', 'dot', ['List', 'u', 'v']], 0],
      },
      {
        canonicalLatex: String.raw`u\times v=w`,
        mathJson: ['Equal', ['Apply', 'cross', ['List', 'u', 'v']], 'w'],
      },
      {
        canonicalLatex: String.raw`\Delta=(p\cdot p)(q\cdot q)-(p\cdot q)^{2}=4`,
        mathJson: [
          'Equal',
          'Delta',
          [
            'Subtract',
            [
              'Multiply',
              ['InvisibleOperator', 'dot', ['Delimiter', ['List', 'p', 'p']]],
              ['InvisibleOperator', 'dot', ['Delimiter', ['List', 'q', 'q']]],
            ],
            ['Power', ['InvisibleOperator', 'dot', ['Delimiter', ['List', 'p', 'q']]], 2],
          ],
          4,
        ],
      },
      {
        canonicalLatex: String.raw`P_{B\leftarrow A}=B^{-1}A`,
        mathJson: [
          'Equal',
          ['Subscript', 'P', ['List', 'B', 'A']],
          ['Multiply', ['Power', 'B', -1], 'A'],
        ],
      },
      {
        canonicalLatex: String.raw`x=\begin{bmatrix}1-t\\t\end{bmatrix}\quad t\in\mathbb{R}`,
        mathJson: [
          'Element',
          [
            'Equal',
            'x',
            [
              'InvisibleOperator',
              ['Matrix', ['List', ['List', ['Add', 1, ['Negate', 't']]], ['List', 't']], "'[]'"],
              ['HorizontalSpacing', 18],
              't',
            ],
          ],
          'RealNumbers',
        ],
      },
    ] as const;

    for (const testCase of cases) {
      const result = proveStandardAnswerMathJson({
        canonicalLatex: testCase.canonicalLatex,
        candidate: candidate(testCase.mathJson),
      });
      expect(result, testCase.canonicalLatex).toMatchObject({
        ok: true,
        evidence: {
          mathJson: testCase.mathJson,
          semanticRelation: expect.stringMatching(/^(structural|equal)$/u),
        },
      });
    }
  });

  it('normalizes exact negative integer products without weakening formal comparison', () => {
    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`f(x)=-i`,
      candidate: candidate([
        'Equal',
        ['Apply', 'f', 'x'],
        ['Multiply', -1, 'ImaginaryUnit'],
      ]),
    })).toMatchObject({ ok: true });

    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`f(x)=-i`,
      candidate: candidate([
        'Equal',
        ['Apply', 'f', 'x'],
        ['Multiply', 1, 'ImaginaryUnit'],
      ]),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });

    const eigenspaceLatex = String.raw`E_{\imaginaryI}=\left\{\begin{bmatrix}\frac{-1}{\imaginaryI}\\1\end{bmatrix}\right\}`;
    const eigenspace = (numerator: number) => [
      'Equal',
      ['Subscript', 'E', 'ImaginaryUnit'],
      ['Set', ['Matrix', ['List', ['List', ['Divide', numerator, 'ImaginaryUnit']], ['List', 1]], "'[]'"]],
    ];
    expect(proveStandardAnswerMathJson({
      canonicalLatex: eigenspaceLatex,
      candidate: candidate(eigenspace(-1)),
    })).toMatchObject({ ok: true });
    expect(proveStandardAnswerMathJson({
      canonicalLatex: eigenspaceLatex,
      candidate: candidate(eigenspace(1)),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });
  });

  it('keeps opposite signed imaginary values distinct inside equality and set trees', () => {
    const negativeImaginary = ['Multiply', -1, 'ImaginaryUnit'];
    const positiveImaginary = ['Multiply', 1, 'ImaginaryUnit'];

    expect(proveStandardAnswerMathJson({
      canonicalLatex: 'x=-i',
      candidate: candidate(['Equal', 'x', negativeImaginary]),
    })).toMatchObject({ ok: true });
    expect(proveStandardAnswerMathJson({
      canonicalLatex: 'x=i',
      candidate: candidate(['Equal', 'x', positiveImaginary]),
    })).toMatchObject({ ok: true });
    expect(proveStandardAnswerMathJson({
      canonicalLatex: 'x=-i',
      candidate: candidate(['Equal', 'x', positiveImaginary]),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });
    expect(proveStandardAnswerMathJson({
      canonicalLatex: 'x=i',
      candidate: candidate(['Equal', 'x', negativeImaginary]),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });

    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`x\in\left\{-i,i\right\}`,
      candidate: candidate(['Element', 'x', ['Set', negativeImaginary, positiveImaginary]]),
    })).toMatchObject({ ok: true });
    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`x\in\left\{-i,i\right\}`,
      candidate: candidate(['Element', 'x', ['Set', positiveImaginary, positiveImaginary]]),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });
  });

  it('recognizes reviewed imaginary-unit aliases in deterministic formal trees', () => {
    expect(proveStandardAnswerMathJson({
      canonicalLatex: 'x=i',
      candidate: candidate(['Equal', 'x', 'i']),
    })).toMatchObject({ ok: true });
    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`x=\imaginaryI`,
      candidate: candidate(['Equal', 'x', 'ImaginaryUnit']),
    })).toMatchObject({ ok: true });
    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`x=-\imaginaryI`,
      candidate: candidate(['Equal', 'x', 'ImaginaryUnit']),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });
  });

  it('compares evaluated derivative subscripts without discarding request structure', () => {
    const request = [
      'Subscript',
      ['EvaluateAt', ['D', ['Delimiter', ['Add', ['Multiply', 4, ['Power', 't', 2]], ['Multiply', 2, 't']]], 't']],
      ['Equal', 't', 3],
    ];
    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`\left.\frac{\mathrm{d}}{\mathrm{d}t}\left(4t^2+2t\right)\right|_{t=3}`,
      candidate: candidate(request),
    })).toMatchObject({ ok: true });

    expect(proveStandardAnswerMathJson({
      canonicalLatex: String.raw`\left.\frac{\mathrm{d}}{\mathrm{d}t}\left(4t^2+2t\right)\right|_{t=4}`,
      candidate: candidate(request),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });
  });

  it('fails closed on formal name, case, arity, order, subscript, matrix, and value near-misses', () => {
    const failures = [
      [String.raw`f(x)`, ['Apply', 'F', 'x']],
      [String.raw`f(x)`, ['Apply', 'f', ['List', 'x', 'y']]],
      [String.raw`f(x,y)`, ['Apply', 'f', ['List', 'y', 'x']]],
      [String.raw`P_{B\leftarrow A}`, ['Subscript', 'P', ['List', 'A', 'B']]],
      [String.raw`\det\begin{bmatrix}1&0\\0&1\end{bmatrix}`, ['Determinant', ['Matrix', ['List', ['List', 1, 0], ['List', 0, 2]], "'[]'"]]],
      [String.raw`\operatorname{dimension}(V)=3`, ['Equal', ['Apply', 'dim', 'V'], 4]],
    ] as const;

    for (const [canonicalLatex, mathJson] of failures) {
      expect(proveStandardAnswerMathJson({
        canonicalLatex,
        candidate: candidate(mathJson),
      }), canonicalLatex).toMatchObject({
        ok: false,
        failure: { reason: 'semantic-mismatch' },
      });
    }
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

  it('fails closed when formal comparison cannot align a boxed candidate', () => {
    const inlineMatrixLatex = String.raw`\begin{bmatrix}1&1\\2&2\end{bmatrix}`;
    expect(proveAnswerMathJson({
      canonicalLatex: String.raw`\det(${inlineMatrixLatex})=0`,
      candidate: candidate([
        'Equal',
        ['Determinant', inlineMatrixLatex],
        0,
      ]),
    })).toMatchObject({ ok: false, failure: { reason: 'semantic-mismatch' } });
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
