import { describe, expect, it } from 'vitest';

import {
  createPeriodicFamily,
  piRationalFromDegrees,
  rational,
  renderPeriodicFamilies,
  transformPeriodicFamilyForAffineTarget,
} from './periodic-family';

describe('Equation structured periodic families', () => {
  it('renders rational multiples of pi without route-local latex cleanup', () => {
    const family = createPeriodicFamily({
      targetLatex: 'x',
      offset: rational(1, 4),
      period: rational(1, 2),
      parameter: 'n',
      domain: 'real',
    });

    const rendered = renderPeriodicFamilies([family], {
      source: 'test-periodic-family',
    });

    expect(rendered.exactLatex).toBe(String.raw`x\in\left\{\frac{\pi}{4}+\frac{\pi n}{2}\right\}`);
    expect(rendered.branchesLatex).toEqual([String.raw`\frac{\pi}{4}+\frac{\pi n}{2}`]);
    expect(rendered.exactSupplementLatex).toEqual([String.raw`n\in\mathbb{Z}`]);
  });

  it('transforms affine trig arguments structurally', () => {
    const angleFamily = createPeriodicFamily({
      targetLatex: String.raw`2x`,
      offset: rational(1, 2),
      period: rational(1),
      parameter: 'k',
      domain: 'complex',
    });

    const solved = transformPeriodicFamilyForAffineTarget(angleFamily, {
      targetLatex: 'x',
      coefficient: rational(2),
    });

    expect(solved).toBeTruthy();
    const rendered = renderPeriodicFamilies(solved ? [solved] : [], {
      source: 'test-periodic-family',
      parameterPlacement: 'inline',
    });
    expect(rendered.exactLatex).toBe(String.raw`x\in\left\{\frac{\pi}{4}+\frac{\pi k}{2}\right\},\ k\in\mathbb{Z}`);
  });

  it('supports textbook special-angle offsets from degrees', () => {
    const family = createPeriodicFamily({
      targetLatex: 'x',
      offset: piRationalFromDegrees(45),
      period: rational(1),
      parameter: 'n',
      domain: 'real',
    });

    expect(renderPeriodicFamilies([family], { source: 'test-periodic-family' }).branchesLatex)
      .toEqual([String.raw`\frac{\pi}{4}+\pi n`]);
  });
});
