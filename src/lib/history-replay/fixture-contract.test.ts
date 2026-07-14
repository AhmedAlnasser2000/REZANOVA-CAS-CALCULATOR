import { describe, expect, it } from 'vitest';
import { canonicalResultFixture } from '../../test-utils/canonical-result-fixture';
import {
  canonicalRuntimeResultV2Fixture,
  standardV2MathValue,
} from '../../test-utils/canonical-result-v2-fixture';
import { canonicalMathValue } from '../result-contract';
import {
  historyReplayCardinalities,
  historyReplayIdentity,
  normalizedHistoryReplayLatex,
} from './fixture-contract';

describe('dual-version History replay fixture contract', () => {
  it.each([
    {
      version: 1,
      outcome: canonicalResultFixture({
        outcomeKind: 'success',
        title: 'Versioned result',
        primaryMath: canonicalMathValue('2', 2),
        supplements: ['x>0'],
        warnings: [],
        metadata: { answerDomain: 'real', solutionKind: 'exact-symbolic' },
      }),
    },
    {
      version: 2,
      outcome: canonicalRuntimeResultV2Fixture({
        outcomeKind: 'success',
        title: 'Versioned result',
        primary: { kind: 'math', value: standardV2MathValue('2', 2) },
        supplements: [{
          role: 'condition',
          presentationLatex: 'x>0',
          math: standardV2MathValue('x>0', ['Greater', 'x', 0]),
        }],
        warnings: [],
        metadata: { answerDomain: 'real', solutionKind: 'exact-symbolic' },
      }),
    },
  ])('reads V$version identity, cardinality, and canonical fragments', ({ outcome }) => {
    expect(historyReplayIdentity(outcome)).toEqual({
      kind: 'success',
      title: 'Versioned result',
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
    });
    expect(historyReplayCardinalities({ outcome })).toMatchObject({
      supplements: 1,
      warnings: 0,
    });
    expect(normalizedHistoryReplayLatex({ outcome })).toContain('=2');
  });
});
