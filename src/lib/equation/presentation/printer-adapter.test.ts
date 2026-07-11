import { describe, expect, it } from 'vitest';
import { equationFiniteRootPrinterAdapter } from './printer-adapter';

describe('Equation finite-root printer adapter', () => {
  it('reuses the existing finite-root presentation IR', () => {
    const result = equationFiniteRootPrinterAdapter.print(
      { target: 'x', fallbackLatex: '0+a', node: ['Add', 0, 'a'] },
      { profile: 'compatibility-v1', target: 'canonical-latex' },
      { target: 'x' },
    );

    expect(result).toMatchObject({
      ok: true,
      canonicalLatex: 'a',
      source: 'domain-adapter',
    });
  });
});
