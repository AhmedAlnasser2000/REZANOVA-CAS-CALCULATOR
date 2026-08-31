import { describe, expect, it } from 'vitest';
import type {
  CanonicalResultDocumentV1,
  ResultProducerDraft,
  SerializableMathJson,
} from '../../../types/calculator';
import {
  EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION,
  type EquationAnalysisEvidence,
} from '../analysis-evidence';
import { buildEquationRuntimeCanonicalResultDocument } from './runtime-producer-v2';

const document: CanonicalResultDocumentV1 = {
  version: 1,
  outcomeKind: 'success',
  title: 'Solve',
  primaryMath: {
    canonicalLatex: 'x=1',
    mathJson: ['Equal', 'x', 1],
  },
  supplements: [{ canonicalLatex: 'x>0', mathJson: ['Greater', 'x', 0] }],
  warnings: [],
};

function outcome(exactSupplementLatex: string[]): Exclude<ResultProducerDraft, { kind: 'prompt' }> {
  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: 'x=1',
    primaryMath: {
      canonicalLatex: 'x=1',
      mathJson: ['Equal', 'x', 1],
    },
    exactSupplementLatex,
    solveBadges: ['Log Combine'],
    warnings: [],
  };
}

function evidence(
  canonicalLatex: string,
  mathJson: SerializableMathJson = ['Greater', 'x', 0],
  presentationLatex?: string,
  selected = true,
): EquationAnalysisEvidence {
  return {
    id: `domain:guarded-domain-constraint:x:positive:${canonicalLatex}`,
    target: 'x',
    sourceRoute: 'guarded-domain-constraint',
    category: 'domain',
    confidence: 'proven',
    ...(selected ? { classification: EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION } : {}),
    ...(presentationLatex ? { latex: presentationLatex } : {}),
    supplementEvidence: {
      role: 'condition',
      canonicalLatex,
      mathJson,
    },
  };
}

describe('Equation runtime Canonical Result V2 supplements', () => {
  it('keeps a single producer-proven condition label as presentation only', () => {
    const runtimeDocument = buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['\\text{Conditions: } x+1\\ge0']),
      document,
      analysisEvidence: [evidence(
        'x+1\\ge0',
        ['GreaterEqual', ['Add', 'x', 1], 0],
      )],
    });

    expect(runtimeDocument.version).toBe(2);
    if (runtimeDocument.version !== 2) throw new Error('Expected typed V2 supplements.');
    expect(runtimeDocument.supplements).toEqual([
      expect.objectContaining({
        role: 'condition',
        presentationLatex: '\\text{Conditions: } x+1\\ge0',
        math: expect.objectContaining({
          canonicalLatex: 'x+1\\ge0',
          mathJson: ['GreaterEqual', ['Add', 'x', 1], 0],
        }),
      }),
    ]);
  });

  it('splits grouped presentation into independently proven clean condition rows', () => {
    const runtimeDocument = buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['\\text{Conditions: } x+1\\ge0,\\;x-1\\ge0']),
      document,
      analysisEvidence: [
        evidence('x+1\\ge0', ['GreaterEqual', ['Add', 'x', 1], 0]),
        evidence('x-1\\ge0', ['GreaterEqual', ['Add', 'x', -1], 0]),
      ],
    });

    expect(runtimeDocument.version).toBe(2);
    if (runtimeDocument.version !== 2) throw new Error('Expected typed V2 supplements.');
    expect(runtimeDocument.supplements).toEqual([
      expect.objectContaining({
        role: 'condition',
        presentationLatex: 'x+1\\ge0',
        math: expect.objectContaining({ canonicalLatex: 'x+1\\ge0' }),
      }),
      expect.objectContaining({
        role: 'condition',
        presentationLatex: 'x-1\\ge0',
        math: expect.objectContaining({ canonicalLatex: 'x-1\\ge0' }),
      }),
    ]);
  });

  it('preserves a single exclusion label while splitting a grouped condition row', () => {
    const runtimeDocument = buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome([
        '\\text{Exclusions: } x\\ne0',
        '\\text{Conditions: } x\\ge0,\\;\\frac{1}{x}\\ge0',
      ]),
      document,
      analysisEvidence: [
        {
          ...evidence('x\\ne0', ['NotEqual', 'x', 0]),
          supplementEvidence: {
            role: 'exclusion',
            canonicalLatex: 'x\\ne0',
            mathJson: ['NotEqual', 'x', 0],
          },
        },
        evidence('x\\ge0', ['GreaterEqual', 'x', 0]),
        evidence('\\frac{1}{x}\\ge0', ['GreaterEqual', ['Divide', 1, 'x'], 0]),
      ],
    });

    expect(runtimeDocument.version).toBe(2);
    if (runtimeDocument.version !== 2) throw new Error('Expected typed V2 supplements.');
    expect(runtimeDocument.supplements).toEqual([
      expect.objectContaining({
        role: 'exclusion',
        presentationLatex: '\\text{Exclusions: } x\\ne0',
        math: expect.objectContaining({ canonicalLatex: 'x\\ne0' }),
      }),
      expect.objectContaining({
        role: 'condition',
        presentationLatex: 'x\\ge0',
        math: expect.objectContaining({ canonicalLatex: 'x\\ge0' }),
      }),
      expect.objectContaining({
        role: 'condition',
        presentationLatex: '\\frac{1}{x}\\ge0',
        math: expect.objectContaining({ canonicalLatex: '\\frac{1}{x}\\ge0' }),
      }),
    ]);
  });

  it('fails closed when a typed supplement route has no producer-owned evidence', () => {
    expect(() => buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['\\text{Conditions: } x>0']),
      document,
      analysisEvidence: [],
    })).toThrow('without producer-owned evidence');
  });

  it('uses producer-selected identities rather than presentation row counts', () => {
    const runtimeDocument = buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['x>0', 'x+1>0']),
      document,
      analysisEvidence: [evidence('x>0')],
    });

    expect(runtimeDocument.version).toBe(2);
    if (runtimeDocument.version !== 2) throw new Error('Expected typed V2 supplements.');
    expect(runtimeDocument.supplements).toHaveLength(1);
  });

  it('selects producer-classified identities and preserves producer-facing presentation', () => {
    const runtimeDocument = buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['81\\ge0', '\\text{Conditions: } (x+1)^2>0,\\;\\log_{3}((x+1)^2)\\ge0']),
      document,
      analysisEvidence: [
        evidence(
          '0\\lt(x+1)^2',
          ['Greater', ['Power', ['Add', 'x', 1], 2], 0],
          '(x+1)^2>0',
        ),
        evidence(
          '0\\le\\log_{3}((x+1)^2)',
          ['GreaterEqual', ['Log', ['Power', ['Add', 'x', 1], 2], 3], 0],
          '\\log_{3}((x+1)^2)\\ge0',
        ),
        evidence('0\\lt3', ['Greater', 3, 0], '3>0', false),
      ],
    });

    expect(runtimeDocument.version).toBe(2);
    if (runtimeDocument.version !== 2) throw new Error('Expected typed V2 supplements.');
    expect(runtimeDocument.supplements?.map((entry) => entry.presentationLatex)).toEqual([
      '(x+1)^2>0',
      '\\log_{3}((x+1)^2)\\ge0',
    ]);
  });

  it('fails closed when one producer supplement identity carries conflicting trees', () => {
    expect(() => buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['\\text{Conditions: } x>0']),
      document,
      analysisEvidence: [
        evidence('0\\lt x', ['Greater', 'x', 0], 'x>0'),
        evidence('0\\lt x', ['Greater', 'x', 1], 'x>0'),
      ],
    })).toThrow('conflicting typed V2 supplement evidence');
  });

  it('fails closed when a selected supplement identity is incomplete or unrelated', () => {
    expect(() => buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['\\text{Conditions: } x>0']),
      document,
      analysisEvidence: [{
        id: 'diagnostic:selected-without-proof',
        target: 'x',
        sourceRoute: 'diagnostic',
        category: 'diagnostic',
        confidence: 'reported',
        classification: EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION,
      }],
    })).toThrow('unrelated or incomplete canonical supplement evidence');
  });

  it('fails closed when one proof tree is assigned ambiguous canonical identities', () => {
    expect(() => buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['\\text{Conditions: } x>0']),
      document,
      analysisEvidence: [
        evidence('x>0', ['Greater', 'x', 0]),
        evidence('0<x', ['Greater', 'x', 0]),
      ],
    })).toThrow('ambiguous typed V2 supplement evidence');
  });

  it('fails closed when the selected V2 primary has no producer proof', () => {
    expect(() => buildEquationRuntimeCanonicalResultDocument({
      outcome: {
        ...outcome(['\\text{Conditions: } x>0']),
        primaryMath: undefined,
      },
      document: {
        ...document,
        primaryMath: { canonicalLatex: 'x=1' },
      },
      analysisEvidence: [evidence('x>0')],
    })).toThrow('without producer MathJSON for primary');
  });
});
