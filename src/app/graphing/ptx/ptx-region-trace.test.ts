import { describe, expect, it } from 'vitest';
import type { GraphDocumentV4 } from '../../../lib/graphing';
import { graphLatexText, ptxRegionAt, ptxRegions } from './ptx-region-trace';

const expression = (mathJson: unknown, freeSymbols: string[]) => ({ mathJson, freeSymbols });

describe('PTX3 region tracing', () => {
  it('turns typed LaTeX into short readout text', () => {
    expect(graphLatexText(String.raw`x^2+y^2\le9`)).toBe('x² + y² ≤ 9');
    expect(graphLatexText(String.raw`\frac{1}{x}`)).toBe('1/x');
    expect(graphLatexText(String.raw`\sqrt{x+1}\ge\sin\left(x\right)`)).toBe("√(x + 1) ≥ sin(x)");
    expect(graphLatexText(String.raw`y^{-2}`)).toBe('y⁻²');
  });

  it('says which conditions hold inside a region, and nothing outside it', () => {
    const document = { items: [{
      kind: 'relation', itemId: 'band', visible: true, source: { sourceLatex: String.raw`x<y\le2` },
      relation: { kind: 'chained-inequality', operands: [expression('x', ['x']), expression('y', ['y']), expression(2, [])], operators: ['<', '<='] },
    }] } as unknown as GraphDocumentV4;
    const regions = ptxRegions(document, {});
    expect(ptxRegionAt(regions, 0, 1)).toEqual({ itemId: 'band', text: 'x < y ✓ · y ≤ 2 ✓' });
    expect(ptxRegionAt(regions, 0, 3)).toBeNull();
    expect(ptxRegionAt(regions, 1, 0)).toBeNull();
  });
});
