import { describe, expect, it } from 'vitest';
import { detailLineIntentAt } from '../../display/result-detail-lines';
import { domainFactsDetailSection } from './readback';

describe('domain/range detail readback', () => {
  it('derives compatibility lines from typed structured constraints', () => {
    const [section] = domainFactsDetailSection([
      { kind: 'nonzero', expressionLatex: 'x-1' },
      {
        kind: 'expression-interval',
        expressionLatex: '\\sin(x)',
        min: -1,
        minInclusive: true,
        max: 1,
        maxInclusive: true,
      },
      { kind: 'carrier-range', carrier: 'sin', min: -1, max: 1 },
      { kind: 'interval', variable: 'x', min: 0, minInclusive: true, max: 2, maxInclusive: false },
    ]) ?? [];

    expect(section?.lines).toEqual([
      'x-1 must stay nonzero.',
      '\\sin(x) must stay in [-1, 1].',
      'The trig carrier target must stay between -1 and 1.',
      'The variable must stay inside the permitted interval.',
    ]);
    section?.lines.forEach((_line, index) => {
      expect(detailLineIntentAt(section, index)).toBe('typed-parts');
    });
    expect(section?.lineParts?.flat().filter((part) => part.kind === 'math')).toEqual([
      { kind: 'math', latex: 'x-1' },
      { kind: 'math', latex: '\\sin(x)' },
      { kind: 'math', latex: '[-1, 1]' },
      { kind: 'math', latex: '-1' },
      { kind: 'math', latex: '1' },
    ]);
  });
});
