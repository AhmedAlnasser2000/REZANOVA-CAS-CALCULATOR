import { describe, expect, it } from 'vitest';
import { buildAssumptionFact } from './assumptions-core';
import {
  assumptionFactsToDetailSections,
  mergeAssumptionDetailSections,
} from './assumption-readback';

describe('assumption readback', () => {
  it('groups assumption facts into stable visible detail sections', () => {
    const sections = assumptionFactsToDetailSections([
      buildAssumptionFact({
        kind: 'domain-exclusion',
        source: 'rational-function-core',
        trust: 'proved',
        scope: 'result',
        expressionLatex: 'x-1',
        message: 'x-1 must stay nonzero.',
      }),
      buildAssumptionFact({
        kind: 'candidate-rejection',
        source: 'candidate-validation',
        trust: 'validated',
        scope: 'candidate',
        message: 'Candidate was rejected by denominator exclusions.',
      }),
      buildAssumptionFact({
        kind: 'branch-principal-range',
        source: 'branch-core',
        trust: 'proved',
        scope: 'result',
        message: 'x uses principal range [-90,90].',
      }),
      buildAssumptionFact({
        kind: 'equivalence-trust',
        source: 'simplify-policy',
        trust: 'display-only',
        scope: 'display',
        message: 'readable form has display-only trust.',
      }),
    ]);

    expect(sections.map((section) => section.title)).toEqual([
      'Domain Facts',
      'Candidate Checking',
      'Branch Facts',
      'Trust',
    ]);
    expect(sections[0].lines[0]).toContain('Trust: proved via rational-function core.');
    expect(sections[1].lines[0]).toContain('Trust: validated via candidate validation.');
    expect(sections[3].lines[0]).toContain('Trust: display-only via simplify policy.');
  });

  it('dedupes facts and merges generated lines into existing sections', () => {
    const fact = buildAssumptionFact({
      kind: 'interval-hazard',
      source: 'domain-range-core',
      trust: 'blocked',
      scope: 'interval',
      message: 'A real-domain constraint failed on [0, 2].',
    });

    const merged = mergeAssumptionDetailSections([
      {
        title: 'Interval Safety',
        lines: ['Stopped before integration because x=1 makes a denominator zero.'],
      },
    ], [fact, fact]);

    expect(merged).toEqual([
      {
        title: 'Interval Safety',
        lines: [
          'Stopped before integration because x=1 makes a denominator zero.',
          'A real-domain constraint failed on [0, 2]. Trust: blocked via domain/range core.',
        ],
      },
    ]);
  });
});
