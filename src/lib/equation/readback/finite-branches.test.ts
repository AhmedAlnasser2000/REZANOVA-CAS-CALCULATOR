import { describe, expect, it } from 'vitest';

import {
  exactLatexForFiniteBranches,
  finiteBranchReadbackForNormalizedBranches,
  uniqueFiniteBranchLatex,
} from './finite-branches';

describe('Equation finite branch readback normalization', () => {
  it('cleans standalone branch signs before dedupe and set joining', () => {
    const branches = uniqueFiniteBranchLatex({
      targetLatex: 'x',
      preserveOrder: true,
      branchesLatex: [
        String.raw`\frac{-1}{2}+\frac{-1}{2}\sqrt{5}`,
        String.raw`\frac{-1}{2}-\frac{-1}{2}\sqrt{5}`,
        String.raw`\frac{-1}{2}+\frac{-1}{2}\sqrt{5}`,
      ],
    });

    expect(branches).toEqual([
      String.raw`-\frac{1}{2}-\frac{1}{2}\sqrt{5}`,
      String.raw`-\frac{1}{2}+\frac{1}{2}\sqrt{5}`,
    ]);
  });

  it('normalizes imaginary-unit products only in the finite branch context', () => {
    const readback = finiteBranchReadbackForNormalizedBranches({
      targetLatex: 'z',
      relationLatex: '\\in',
      preserveOrder: true,
      branchesLatex: ['1+ii', 'i\\cdot i'],
      source: 'test',
    });

    expect(readback).toBeDefined();
    if (!readback) {
      throw new Error('Expected finite branch readback');
    }
    expect(readback.branchesLatex).toEqual(['1-1', '-1']);
  });

  it('uses normalized roots for exact finite branch latex', () => {
    expect(exactLatexForFiniteBranches({
      targetLatex: 'x',
      preserveOrder: true,
      branchesLatex: [String.raw`+\frac{-1}{2}+\sqrt{5}`, String.raw`0+\sqrt{a}`],
    })).toBe(String.raw`x\in\left\{-\frac{1}{2}+\sqrt{5},\ \sqrt{a}\right\}`);
  });

  it('does not treat symbolic fractions as exact numeric sign noise', () => {
    expect(uniqueFiniteBranchLatex({
      targetLatex: 'x',
      branchesLatex: [String.raw`+\frac{-a}{b}`],
      preserveOrder: true,
    })).toEqual([String.raw`-\frac{a}{b}`]);
  });
});
