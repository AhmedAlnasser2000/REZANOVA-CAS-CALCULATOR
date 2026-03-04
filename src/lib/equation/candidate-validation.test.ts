import { describe, expect, it } from 'vitest';
import { dedupeNumericRoots, validateCandidateRoots } from './candidate-validation';

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
});
