import { describe, expect, it } from 'vitest';
import { buildAssumptionFact } from './assumptions-core';
import {
  assumptionFactsToDetailSections,
  mergeAssumptionDetailSections,
} from './assumption-readback';
import { mathPart, textPart } from '../display/result/result-detail-lines';

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
        kind: 'inequality-constraint',
        source: 'inequality-core',
        trust: 'proved',
        scope: 'result',
        message: 'x <= 2.',
      }),
      buildAssumptionFact({
        kind: 'complex-domain-note',
        source: 'complex-core',
        trust: 'display-only',
        scope: 'result',
        message: 'Complex answers are enabled for this route.',
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
      'Inequality Facts',
      'Complex Domain',
      'Candidate Checking',
      'Branch Facts',
      'Trust',
    ]);
    expect(sections[0].lines[0]).toContain('Trust: proved via rational-function core.');
    expect(sections[1].lines[0]).toContain('Trust: proved via inequality core.');
    expect(sections[2].lines[0]).toContain('Trust: display-only via complex core.');
    expect(sections[3].lines[0]).toContain('Trust: validated via candidate validation.');
    expect(sections[5].lines[0]).toContain('Trust: display-only via simplify policy.');
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

  it('preserves structured math detail metadata while merging facts', () => {
    const fact = buildAssumptionFact({
      kind: 'equivalence-trust',
      source: 'calculus-verification',
      trust: 'proved',
      scope: 'result',
      message: 'Antiderivative backcheck status: verified-exact.',
    });

    const merged = mergeAssumptionDetailSections([
      {
        title: 'Genus-1 Elliptic Proof Backcheck',
        lines: [
          'first-kind: template-proved; prototype \\operatorname{EllipticF}(\\arcsin(x),m).',
        ],
        lineParts: [[
          textPart('first-kind: template-proved; prototype '),
          mathPart('\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)'),
          textPart('.'),
        ]],
      },
    ], [fact]);

    expect(merged?.find((section) => section.title === 'Genus-1 Elliptic Proof Backcheck')).toMatchObject({
      lineParts: [[
        textPart('first-kind: template-proved; prototype '),
        mathPart('\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)'),
        textPart('.'),
      ]],
    });
    expect(merged?.find((section) => section.title === 'Trust')?.lines).toEqual([
      'Antiderivative backcheck status: verified-exact. Trust: proved via calculus verification.',
    ]);
  });
});
