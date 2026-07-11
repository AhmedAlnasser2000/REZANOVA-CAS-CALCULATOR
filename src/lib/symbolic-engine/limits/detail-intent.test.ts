import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import type { DisplayDetailSection } from '../../../types/calculator';
import { resolveFiniteLimitRule } from './api';
import { resolveInfiniteIndeterminateTransformLimit } from './indeterminate-transforms';
import { attemptLHospital } from './lhospital';

const ce = new ComputeEngine();

function partValue(part: NonNullable<DisplayDetailSection['lineParts']>[number][number]) {
  return part.kind === 'math' ? part.latex : part.text;
}

function expectFullyTyped(sections: DisplayDetailSection[] | undefined) {
  expect(sections?.length).toBeGreaterThan(0);
  for (const section of sections ?? []) {
    expect(section.lineParts).toHaveLength(section.lines.length);
    expect(section.lineParts?.map((row) => row.map(partValue).join(''))).toEqual(section.lines);
    expect(section.lineParts?.every((row) => row.length > 0)).toBe(true);
  }
}

describe('Symbolic Limits detail intent', () => {
  it('keeps finite, rewrite, and indeterminate routes fully typed', () => {
    const local = resolveFiniteLimitRule(ce.parse('\\frac{\\sin(3x)}{x}').json, 0, 'x');
    const rewrite = resolveFiniteLimitRule(
      ce.parse('\\frac{1}{x}-\\frac{1}{\\sin(x)}').json,
      0,
      'x',
    );
    const power = resolveInfiniteIndeterminateTransformLimit(
      ce.parse('(1+1/x)^x').json,
      'posInfinity',
      'x',
    );

    expect(local.kind).toBe('success');
    expect(rewrite.kind).toBe('success');
    expect(power?.kind).toBe('success');
    if (local.kind === 'success') expectFullyTyped(local.detailSections);
    if (rewrite.kind === 'success') expectFullyTyped(rewrite.detailSections);
    if (power?.kind === 'success') expectFullyTyped(power.detailSections);
  });

  it("keeps L'Hospital compatibility lines derived from explicit parts", () => {
    const result = attemptLHospital(
      ce.parse('\\frac{\\sin(x)-x}{x^3}').json,
      0,
      'x',
    );

    expect(result.kind).toBe('success');
    expectFullyTyped(result.detailSections);
    expect(result.detailSections[0]?.lines).toEqual([
      "Form detected: L'Hospital route selected for an indeterminate quotient.",
      'Iteration 1: differentiated numerator and denominator.',
      'Iteration 2: differentiated numerator and denominator.',
      'Iteration 3: differentiated numerator and denominator.',
      'Key calculation: the differentiated quotient evaluates to -\\frac{1}{6} at the target.',
      'Conclusion: final limit is -\\frac{1}{6}.',
    ]);
    expect(result.detailSections[0]?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '-\\frac{1}{6}',
    });
  });
});
