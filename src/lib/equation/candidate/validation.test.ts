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

  it('reuses one prepared batch across multiple candidates while preserving dedupe and messages', () => {
    const validation = validateCandidateRoots(
      'x^2=1',
      [-1, 1, 1 + 1e-7, 3],
      [
        { kind: 'nonzero', expressionLatex: 'x' },
        { kind: 'nonzero', expressionLatex: 'x' },
      ],
      'symbolic-radical',
    );

    expect(validation.accepted).toEqual([-1, 1]);
    expect(validation.rejected).toEqual([{
      kind: 'rejected',
      value: 3,
      reason: 'does not satisfy the original equation after substitution',
    }]);
  });

  it.each([
    { angleUnit: 'rad' as const, candidate: Math.PI / 2 },
    { angleUnit: 'deg' as const, candidate: 90 },
    { angleUnit: 'grad' as const, candidate: 100 },
  ])('validates a non-x target in $angleUnit mode', ({ angleUnit, candidate }) => {
    const validation = validateCandidateRoots(
      String.raw`\sin(\theta)=1`,
      [candidate],
      [],
      'symbolic-direct',
      angleUnit,
      'theta',
    );

    expect(validation.accepted).toEqual([candidate]);
    expect(validation.rejected).toEqual([]);
  });

  it('preserves undefined, domain, residual, and tolerance classifications', () => {
    expect(validateCandidateRoots(String.raw`\frac{1}{x-1}=0`, [1]).rejected[0])
      .toEqual({
        kind: 'rejected',
        value: 1,
        reason: 'produces an undefined or non-real substitution',
      });
    expect(validateCandidateRoots('x^2=1', [-1], [{
      kind: 'positive',
      expressionLatex: 'x',
    }]).rejected[0]).toEqual({
      kind: 'rejected',
      value: -1,
      reason: expect.stringContaining('non-positive'),
    });
    expect(validateCandidateRoots('x=1', [1 + 5e-9]).accepted).toHaveLength(1);
    expect(validateCandidateRoots('x=1', [1 + 2e-8]).rejected[0]).toEqual({
      kind: 'rejected',
      value: 1 + 2e-8,
      reason: 'does not satisfy the original equation after substitution',
    });
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
