import { describe, expect, it } from 'vitest';
import { dedupeNumericRoots, validateCandidateRoots } from '../candidate-validation';
import {
  buildExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from './extraneous';

describe('candidate validation', () => {
  it('dedupes near-identical numeric roots', () => {
    const deduped = dedupeNumericRoots([1, 1 + 1e-7, 2]);
    expect(deduped).toHaveLength(2);
  });

  it('accepts valid roots and rejects invalid ones against the original equation', () => {
    const validation = validateCandidateRoots('x^2-1=0', [1, 1.0000001, 3], [], 'numeric-interval');

    expect(validation.accepted).toContain(1);
    expect(validation.rejected.some((candidate) => candidate.value === 3)).toBe(true);
  });

  it('builds exact and approximate extraneous-candidate detail rows', () => {
    const validation = validateCandidateRoots('x^2-1=0', [1, -1, 3], [], 'numeric-interval');
    const section = buildExtraneousSolutionsDetailSection(
      extraneousEvidenceFromRejectedCandidates(validation.rejected, {
        exactCandidatesLatex: ['1', '-1', '3'],
      }),
    );

    expect(section?.title).toBe('Extraneous Solutions');
    expect(section?.lines[0]).toContain('rejected');
    expect(section?.lineParts?.[0]).toContainEqual({ kind: 'math', latex: '3' });
  });
});
