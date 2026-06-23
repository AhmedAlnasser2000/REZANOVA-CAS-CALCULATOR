import { describe, expect, it } from 'vitest';

import {
  extractFiniteRootBranchesFromExactLatex,
  normalizeFiniteRootExactLatexOverride,
} from './exact-overrides';

describe('Equation finite-root exact override policy', () => {
  it('cleans decomposable finite-set overrides', () => {
    const normalized = normalizeFiniteRootExactLatexOverride({
      targetLatex: 'x',
      exactLatex: String.raw`x\in\left\{0+\sqrt{a},\ \sqrt{b}c\right\}`,
    });

    expect(normalized?.exactLatex).toBe(String.raw`x\in\left\{\sqrt{a},\ c\sqrt{b}\right\}`);
  });

  it('cleans repeated equality rows with sign and imaginary-unit noise', () => {
    const normalized = normalizeFiniteRootExactLatexOverride({
      targetLatex: 'x',
      exactLatex: String.raw`x=+\frac{-1}{2}+\sqrt{5}\\x=-\frac{-1}{2}\\x=1+ii`,
    });

    expect(normalized?.exactLatex).toBe(String.raw`x\in\left\{-\frac{1}{2}+\sqrt{5},\ \frac{1}{2},\ 1-1\right\}`);
  });

  it('splits only top-level commas inside finite sets', () => {
    expect(extractFiniteRootBranchesFromExactLatex(
      String.raw`x\in\left\{\operatorname{f}\left(a,b\right),\ c\right\}`,
      'x',
    )).toEqual([
      String.raw`\operatorname{f}\left(a,b\right)`,
      'c',
    ]);
  });

  it('fails closed on unsafe finite-root override shapes', () => {
    const unsafe = [
      String.raw`x=a,\ y=b`,
      String.raw`x\in\left\{a,\ b`,
      String.raw`x=2\pi k`,
      String.raw`x\le a`,
      String.raw`a=x`,
      String.raw`x\in\left\{a,\ y=b\right\}`,
    ];

    for (const exactLatex of unsafe) {
      expect(normalizeFiniteRootExactLatexOverride({
        targetLatex: 'x',
        exactLatex,
      })).toBeNull();
    }
  });
});
