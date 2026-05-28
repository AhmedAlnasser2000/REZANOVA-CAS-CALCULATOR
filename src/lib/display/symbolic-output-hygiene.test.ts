import { describe, expect, it } from 'vitest';
import {
  collectUnsafeSymbolicOutputFragments,
  hasInternalSymbolicErrorLatex,
  hasUnsafeSymbolicOutput,
} from './symbolic-output-hygiene';

describe('symbolic output hygiene', () => {
  it('detects internal symbolic readback fragments', () => {
    expect(hasInternalSymbolicErrorLatex('\\mathtip{\\error{\\blacksquare}}{tuple<bad>}')).toBe(true);
    expect(hasInternalSymbolicErrorLatex('x=2')).toBe(false);
  });

  it('scans success outcomes across exact, supplement, detail, and periodic latex', () => {
    const outcome = {
      kind: 'success' as const,
      title: 'Solve',
      exactLatex: 'x=2',
      exactSupplementLatex: ['x\\ne0'],
      detailSections: [{ title: 'Facts', lines: ['safe'] }],
      periodicFamily: {
        carrierLatex: 'x',
        parameterLatex: 'n\\in\\mathbb{Z}',
        branchesLatex: ['x=2\\pi n'],
        piecewiseBranches: [{
          conditionLatex: 'n\\in\\mathbb{Z}',
          resultLatex: '\\mathtip{\\error{\\blacksquare}}{tuple<bad>}',
        }],
      },
      warnings: [],
    };

    expect(hasUnsafeSymbolicOutput(outcome)).toBe(true);
    expect(collectUnsafeSymbolicOutputFragments(outcome)).toHaveLength(1);
  });
});
