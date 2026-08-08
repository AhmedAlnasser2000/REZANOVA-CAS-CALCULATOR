import { describe, expect, it } from 'vitest';
import type {
  CanonicalResultDocumentV1,
  ResultProducerDraft,
} from '../../../types/calculator';
import type { EquationAnalysisEvidence } from '../analysis-evidence';
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

function evidence(canonicalLatex: string): EquationAnalysisEvidence {
  return {
    id: `domain:guarded-domain-constraint:x:positive:${canonicalLatex}`,
    target: 'x',
    sourceRoute: 'guarded-domain-constraint',
    category: 'domain',
    confidence: 'proven',
    supplementEvidence: {
      role: 'condition',
      canonicalLatex,
      mathJson: ['Greater', 'x', 0],
    },
  };
}

describe('Equation runtime Canonical Result V2 supplements', () => {
  it('fails closed when a typed supplement route has no producer-owned evidence', () => {
    expect(() => buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['\\text{Conditions: } x>0']),
      document,
      analysisEvidence: [],
    })).toThrow('without producer-owned evidence');
  });

  it('fails closed when one-to-one supplement presentation and evidence counts disagree', () => {
    expect(() => buildEquationRuntimeCanonicalResultDocument({
      outcome: outcome(['x>0', 'x+1>0']),
      document,
      analysisEvidence: [evidence('x>0')],
    })).toThrow('presentation/evidence count mismatch (2/1)');
  });
});
