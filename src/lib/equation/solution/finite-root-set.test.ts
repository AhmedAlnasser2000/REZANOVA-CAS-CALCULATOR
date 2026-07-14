import { describe, expect, it } from 'vitest';

import {
  createFiniteRootBranch,
  createFiniteRootSet,
  renderFiniteRootSet,
  uniqueFiniteRootSetBranchLatex,
} from './finite-root-set';

describe('Equation structured finite root sets', () => {
  it('normalizes and dedupes exact branch expressions through the finite-root presentation seam', () => {
    const rootSet = createFiniteRootSet({
      targetLatex: 'x',
      source: 'test-finite-root-set',
      branches: [
        String.raw`0+\sqrt{a}`,
        String.raw`\sqrt{a}`,
        String.raw`\imaginaryI\imaginaryI`,
      ],
    });

    const rendered = renderFiniteRootSet(rootSet, { preserveOrder: true });

    expect(rendered.exactLatex).toBe(String.raw`x\in\left\{\sqrt{a},\ -1\right\}`);
    expect(rendered.branchReadback).toMatchObject({
      targetLatex: 'x',
      branchesLatex: [String.raw`\sqrt{a}`, '-1'],
      source: 'test-finite-root-set',
    });
    expect(rendered.primaryMath).toBeUndefined();
  });

  it('renders node-backed finite branches before adapting to display fields', () => {
    const rootSet = createFiniteRootSet({
      targetLatex: 'x',
      source: 'test-node-root-set',
      branches: [
        createFiniteRootBranch('fallback', {
          node: ['Add', 0, 'a'],
        }),
        createFiniteRootBranch('fallback', {
          node: ['Multiply', 1, ['Sqrt', 'b']],
        }),
      ],
    });

    expect(uniqueFiniteRootSetBranchLatex(rootSet, { preserveOrder: true }))
      .toEqual(['a', String.raw`\sqrt{b}`]);
    const rendered = renderFiniteRootSet(rootSet, { preserveOrder: true });
    expect(rendered.exactLatex).toBe(String.raw`x\in\left\{a,\ \sqrt{b}\right\}`);
    expect(rendered.primaryMath).toEqual({
      canonicalLatex: String.raw`x\in\left\{a,\ \sqrt{b}\right\}`,
      mathJson: ['Element', 'x', ['Set', ['Add', 0, 'a'], ['Multiply', 1, ['Sqrt', 'b']]]],
    });
    expect(structuredClone(rendered.primaryMath)).toEqual(rendered.primaryMath);
  });

  it('records rejected candidates without rendering them as accepted finite roots', () => {
    const rootSet = createFiniteRootSet({
      targetLatex: 'x',
      source: 'test-rejected-root-set',
      branches: [
        createFiniteRootBranch('1', {
          validation: {
            kind: 'accepted',
            evidence: { kind: 'accepted', value: 1, residual: 0 },
          },
        }),
        createFiniteRootBranch('2', {
          validation: {
            kind: 'rejected',
            reason: 'denominator zero',
            evidence: { kind: 'rejected', value: 2, reason: 'denominator zero' },
          },
        }),
      ],
    });

    const rendered = renderFiniteRootSet(rootSet, { preserveOrder: true });

    expect(rendered.exactLatex).toBe('x=1');
    expect(rendered.branchReadback).toBeUndefined();
    expect(rendered.rejectedBranches).toHaveLength(1);
    expect(rendered.rejectedBranches[0]?.latex).toBe('2');
  });
});
