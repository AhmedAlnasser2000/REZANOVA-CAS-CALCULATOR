import { describe, expect, it } from 'vitest';

import {
  createComplexLogExpFamily,
  createRealLogExpFamily,
  renderLogExpFamily,
} from './log-exp-family';

describe('Equation log/exp structured families', () => {
  it('renders real inverse log/exp branches through finite root sets', () => {
    const rendered = renderLogExpFamily(createRealLogExpFamily({
      targetLatex: 'x',
      branches: [{
        latex: '2+\\ln(5)',
        node: ['Add', 2, ['Log', 5, 'ExponentialE']],
      }, {
        latex: '2+\\ln(5)',
        node: ['Add', 2, ['Log', 5, 'ExponentialE']],
      }],
    }));

    expect(rendered.exactLatex).toMatch(/\\ln|\\log_\{\\exponentialE\}/u);
    expect(rendered.exactLatex).not.toContain('3.609');
  });

  it('preserves complex exp/log branch readback payloads', () => {
    const rendered = renderLogExpFamily(createComplexLogExpFamily({
      targetLatex: 'z',
      exactLatex: 'z=2\\pi i k',
      branchReadback: {
        targetLatex: 'z',
        relationLatex: '\\in',
        branchesLatex: ['2\\pi i k'],
        source: 'test',
      },
    }));

    expect(rendered.exactLatex).toBe('z=2\\pi i k');
    expect(rendered.branchReadback?.branchesLatex).toEqual(['2\\pi i k']);
  });
});
