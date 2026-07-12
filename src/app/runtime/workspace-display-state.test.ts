import { describe, expect, it } from 'vitest';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../lib/result-contract';
import { applyWorkspaceDisplayOutcome } from './workspace-display-state';

describe('workspace display state canonical consumers', () => {
  it('updates Ans from native canonical truth instead of compatibility LaTeX', () => {
    const next = applyWorkspaceDisplayOutcome(
      { ansLatex: '0', displayOutcome: null, replayVariableSubstitutions: null },
      {
        kind: 'success',
        title: 'Stale result',
        exactLatex: 'x=999',
        warnings: [],
        canonicalResult: buildCanonicalResultDocumentFromProducer({
          outcomeKind: 'success',
          title: 'Canonical result',
          primaryMath: canonicalMathValue('x=1'),
          warnings: [],
        }),
      },
    );

    expect(next.ansLatex).toBe('x=1');
    expect(next.displayOutcome).toMatchObject({ exactLatex: 'x=999' });
  });
});
