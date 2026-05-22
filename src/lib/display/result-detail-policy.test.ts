import { describe, expect, it } from 'vitest';
import { displayDetailSectionsForPolicy } from './result-detail-policy';
import type { DisplayDetailSection } from '../../types/calculator';

const sections: DisplayDetailSection[] = [
  {
    title: 'Partial Fractions',
    lines: [
      'The shared polynomial/rational core decomposed this rational expression before integration.',
      'Bounded support covers distinct or repeated rational linear factors and irreducible quadratic factors.',
      'The resulting antiderivative still had to pass the derivative backcheck.',
    ],
  },
  {
    title: 'Domain Facts',
    lines: [
      'x-1 must stay nonzero. Trust: proved via rational-function core.',
      'x+2 must stay nonzero. Trust: proved via rational-function core.',
    ],
  },
  {
    title: 'Trust',
    lines: [
      'Antiderivative backcheck status: verified-numeric-confidence. Trust: sampled via calculus verification.',
    ],
  },
];

describe('displayDetailSectionsForPolicy', () => {
  it('keeps detailed fact sections unchanged when detailed facts are enabled', () => {
    expect(displayDetailSectionsForPolicy(sections, { detailedFactsEnabled: true })).toEqual(sections);
  });

  it('keeps concise fact readback by default', () => {
    const concise = displayDetailSectionsForPolicy(sections, { detailedFactsEnabled: false });

    expect(concise?.map((section) => section.title)).toEqual(['Partial Fractions', 'Domain Facts']);
    expect(concise?.[0]?.lines).toEqual([
      'Used bounded partial fractions over the shared polynomial/rational core.',
      'The antiderivative passed the derivative backcheck.',
    ]);
    expect(concise?.[1]?.lines).toEqual([
      'x-1 must stay nonzero.',
      'x+2 must stay nonzero.',
    ]);
    expect(concise?.flatMap((section) => section.lines).join(' ')).not.toContain('Trust:');
  });

  it('keeps critical trust stops visible in concise mode', () => {
    const concise = displayDetailSectionsForPolicy([
      {
        title: 'Trust',
        lines: ['Domain safety could not be established. Trust: blocked via domain/range core.'],
      },
    ], { detailedFactsEnabled: false });

    expect(concise).toEqual([
      {
        title: 'Trust',
        lines: ['Domain safety could not be established.'],
      },
    ]);
  });
});
