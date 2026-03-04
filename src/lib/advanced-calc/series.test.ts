import { describe, expect, it } from 'vitest';
import { evaluateMaclaurinSeries, evaluateTaylorSeries } from './series';

describe('advanced calc series', () => {
  it('builds supported maclaurin series', () => {
    const sinSeries = evaluateMaclaurinSeries({
      bodyLatex: '\\sin(x)',
      kind: 'maclaurin',
      center: '0',
      order: 5,
    });
    expect(sinSeries.error).toBeUndefined();
    expect(sinSeries.exactLatex).toContain('x');

    const expSeries = evaluateMaclaurinSeries({
      bodyLatex: 'e^x',
      kind: 'maclaurin',
      center: '0',
      order: 4,
    });
    expect(expSeries.error).toBeUndefined();

    const logSeries = evaluateMaclaurinSeries({
      bodyLatex: '\\ln(1+x)',
      kind: 'maclaurin',
      center: '0',
      order: 4,
    });
    expect(logSeries.error).toBeUndefined();
  });

  it('builds supported taylor series', () => {
    const taylor = evaluateTaylorSeries({
      bodyLatex: 'x^3+2x',
      kind: 'taylor',
      center: '1',
      order: 4,
    });
    expect(taylor.error).toBeUndefined();
    expect(taylor.exactLatex).toContain('x-1');
  });
});
