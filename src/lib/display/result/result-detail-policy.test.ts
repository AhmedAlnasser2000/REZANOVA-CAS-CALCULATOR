import { describe, expect, it } from 'vitest';
import { displayDetailSectionsForPolicy } from './result-detail-policy';
import type { DisplayDetailSection } from '../../../types/calculator';
import {
  detailLineKindAt,
  detailLinePartsAt,
  inferDetailLinePartsFromText,
  mathPart,
  textPart,
} from './result-detail-lines';

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
  {
    title: 'Stored Values',
    lines: ['Used stored values: a=4.'],
  },
  {
    title: 'Variable Policy',
    lines: ['Kept x symbolic as the table variable.'],
  },
];

describe('displayDetailSectionsForPolicy', () => {
  it('keeps detailed fact sections unchanged when detailed facts are enabled', () => {
    expect(displayDetailSectionsForPolicy(sections, { detailedFactsEnabled: true })).toEqual(sections);
  });

  it('keeps concise fact readback by default', () => {
    const concise = displayDetailSectionsForPolicy(sections, { detailedFactsEnabled: false });

    expect(concise?.map((section) => section.title)).toEqual(['Partial Fractions', 'Domain Facts', 'Stored Values']);
    expect(concise?.[0]?.lines).toEqual([
      'Used bounded partial fractions over the shared polynomial/rational core.',
      'The antiderivative passed the derivative backcheck.',
    ]);
    expect(concise?.[1]?.lines).toEqual([
      'x-1 must stay nonzero.',
      'x+2 must stay nonzero.',
    ]);
    expect(concise?.[2]?.lines).toEqual(['Used stored values: a=4.']);
    expect(concise?.some((section) => section.title === 'Variable Policy')).toBe(false);
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

  it('preserves explicit detail-line render metadata through policy filtering', () => {
    const mathSections: DisplayDetailSection[] = [
      {
        title: 'Expanded Branches',
        lines: ['x=\\sqrt{2}', 'x=-\\sqrt{2}'],
        lineKind: 'math',
      },
      {
        title: 'Mixed Evidence',
        lines: ['Solved branch', 'x=\\sqrt{2}'],
        lineKinds: ['text', 'math'],
        lineParts: [
          [textPart('Solved branch')],
          [mathPart('x=\\sqrt{2}')],
        ],
      },
    ];

    const detailed = displayDetailSectionsForPolicy(mathSections, { detailedFactsEnabled: true });
    const concise = displayDetailSectionsForPolicy(mathSections, { detailedFactsEnabled: false });

    expect(detailed).toEqual(mathSections);
    expect(concise).toEqual(mathSections);
    expect(detailed).not.toBe(mathSections);
    expect(detailed?.[0]).not.toBe(mathSections[0]);
    expect(detailLineKindAt(detailed?.[0] ?? mathSections[0], 1)).toBe('math');
    expect(detailLineKindAt(detailed?.[1] ?? mathSections[1], 0)).toBe('text');
    expect(detailLineKindAt(detailed?.[1] ?? mathSections[1], 1)).toBe('math');
    expect(detailLinePartsAt(detailed?.[1] ?? mathSections[1], 1)).toEqual([mathPart('x=\\sqrt{2}')]);
  });

  it('caps numeric diagnostics by detail policy instead of dumping all samples', () => {
    const diagnostic: DisplayDetailSection = {
      title: 'Domain Probe',
      lines: Array.from({ length: 20 }, (_, index) => `Probe line ${index + 1}`),
    };

    const compact = displayDetailSectionsForPolicy([diagnostic], { detailedFactsEnabled: false });
    const detailed = displayDetailSectionsForPolicy([diagnostic], { detailedFactsEnabled: true });

    expect(compact?.[0]?.lines).toHaveLength(9);
    expect(compact?.[0]?.lines[0]).toBe('Probe line 1');
    expect(compact?.[0]?.lines[7]).toBe('Probe line 8');
    expect(compact?.[0]?.lines[8]).toContain('enable Detailed Facts');
    expect(detailed?.[0]?.lines).toHaveLength(17);
    expect(detailed?.[0]?.lines[15]).toBe('Probe line 16');
    expect(detailed?.[0]?.lines[16]).toContain('numeric diagnostics cap');
  });

  it('infers mixed math fragments for known Equation route prose lines', () => {
    const parts = inferDetailLinePartsFromText(
      'Composition branch: \\cos(|3x^2+1|) stays in [-1, 1], so \\tan(\\cos(|3x^2+1|))=1 reduces to \\cos(|3x^2+1|)=\\frac{\\pi}{4}.',
    );

    expect(parts).toEqual([
      textPart('Composition branch: '),
      mathPart('\\cos(|3x^2+1|)'),
      textPart(' stays in '),
      mathPart('[-1, 1]'),
      textPart(', so '),
      mathPart('\\tan(\\cos(|3x^2+1|))=1'),
      textPart(' reduces to '),
      mathPart('\\cos(|3x^2+1|)=\\frac{\\pi}{4}'),
      textPart('.'),
    ]);
  });

  it('splits crowded solve notes at solver narrative boundaries', () => {
    const [section] = displayDetailSectionsForPolicy([
      {
        title: 'Solve Note',
        lines: [
          'Composition branch: sin(ln(x)+1) stays in [-1, 1], so tan(sin(ln(x)+1))=1 reduces to sin(ln(x)+1)=\\frac{\\pi}{4}.; Periodic family: sin(ln(x)+1)=\\frac{\\pi}{4} yields x\\in\\left\\{e^{2\\pi k-1}\\right\\}.',
        ],
      },
    ], { detailedFactsEnabled: false }) ?? [];

    expect(section?.lines).toEqual([
      'Composition branch: sin(ln(x)+1) stays in [-1, 1], so tan(sin(ln(x)+1))=1 reduces to sin(ln(x)+1)=\\frac{\\pi}{4}.',
      'Periodic family: sin(ln(x)+1)=\\frac{\\pi}{4} yields x\\in\\left\\{e^{2\\pi k-1}\\right\\}.',
    ]);
  });
});
