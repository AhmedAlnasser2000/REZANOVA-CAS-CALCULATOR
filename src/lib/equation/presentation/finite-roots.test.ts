import { describe, expect, it } from 'vitest';

import type { VariableAnalysis } from '../../algebra/variable-core/types';
import {
  exactLatexForFiniteBranchExpressions,
  finiteBranchReadbackForFiniteBranchExpressions,
  renderFiniteRootPresentation,
} from './finite-roots';
import { createComplexPrincipalRootBranchNode } from '../roots/complex-principal-roots';
import { createCubicCardanoBranchNode } from '../roots/cubic-cardano-roots';

const userVariableIAnalysis: VariableAnalysis = {
  symbols: [{
    name: 'i',
    identifierKind: 'single-symbol-variable',
    roles: ['symbolic-parameter'],
    occurrences: 2,
  }],
  reservedIdentifiers: [],
  implicitCharacterProducts: [],
  stops: [],
};

function renderRoot(node: unknown, context = {}) {
  return renderFiniteRootPresentation(
    {
      target: 'x',
      fallbackLatex: 'fallback',
      node,
    },
    {
      target: 'x',
      ...context,
    },
  );
}

describe('Equation finite-root presentation IR', () => {
  it('renders node-backed nested radicals through recursive MathJSON simplification before final polish', () => {
    const branch = renderRoot([
      'Add',
      ['Divide', -1, 2],
      ['Multiply', -1, ['Divide', [
        'Sqrt',
        ['Add', 1, ['Multiply', -4, ['Add', ['Divide', -1, 2], ['Multiply', -1, ['Divide', ['Sqrt', 5], 2]]]]],
      ], 2]],
    ]);

    expect(branch).not.toContain('1+-4');
    expect(branch).not.toContain(String.raw`1+\left(-4`);
    expect(branch).not.toContain('ii');
    expect(branch).toContain(String.raw`\sqrt`);
  });

  it('normalizes reserved imaginary-unit products without touching a user variable named i', () => {
    expect(renderRoot(['Multiply', ['Complex', 0, 1], ['Complex', 0, 1]]))
      .toBe('-1');

    const fallback = renderFiniteRootPresentation(
      {
        target: 'x',
        fallbackLatex: String.raw`i\cdot i`,
      },
      {
        target: 'x',
        domainIntent: 'complex',
        variableAnalysis: userVariableIAnalysis,
      },
    );
    expect(fallback).toBe(String.raw`i\cdot i`);
  });

  it('cleans root-context identities while preserving symbolic multivariable meaning', () => {
    expect(renderRoot(['Add', 0, 'a'])).toBe('a');
    expect(renderRoot(['Multiply', 1, ['Sqrt', ['Add', 'v', 'b']]]))
      .toBe(String.raw`\sqrt{b+v}`);

    const discriminant = renderRoot(['Subtract', ['Power', 'b', 2], ['Multiply', 4, 'a', 'c']]);
    expect(discriminant).toContain('b');
    expect(discriminant).toContain('a');
    expect(discriminant).toContain('c');

    expect(renderRoot(['Divide', 'F', 'a'])).toBe(String.raw`\frac{F}{a}`);
    expect(renderRoot(['Sqrt', ['Multiply', ['Power', 'c', 2], ['Add', 'v', 'b']]]))
      .toContain('c^2');
  });

  it('adapts finite-root presentation back to exact and branch-readback compatibility surfaces', () => {
    const roots = [
      { latex: '0+a', node: ['Add', 0, 'a'] },
      { latex: String.raw`1\cdot\sqrt{b}`, node: ['Multiply', 1, ['Sqrt', 'b']] },
    ];

    expect(exactLatexForFiniteBranchExpressions({
      targetLatex: 'x',
      branches: roots,
      preserveOrder: true,
    })).toBe(String.raw`x\in\left\{a,\ \sqrt{b}\right\}`);

    const readback = finiteBranchReadbackForFiniteBranchExpressions({
      targetLatex: 'x',
      branches: roots,
      preserveOrder: true,
      source: 'test-presentation',
    });
    expect(readback?.branchesLatex).toEqual(['a', String.raw`\sqrt{b}`]);
  });

  it('renders node-backed cubic-sized finite root sets with dedupe and branch metadata', () => {
    const roots = [
      { latex: 'fallback', node: ['Add', 0, 'a'] },
      { latex: 'fallback', node: ['Add', 0, 'a'] },
      { latex: 'fallback', node: ['Multiply', 1, ['Sqrt', 'b']] },
      { latex: 'fallback', node: ['Negate', ['Sqrt', 'b']] },
    ];

    expect(exactLatexForFiniteBranchExpressions({
      targetLatex: 'x',
      branches: roots,
      preserveOrder: true,
    })).toBe(String.raw`x\in\left\{a,\ \sqrt{b},\ -\sqrt{b}\right\}`);

    const readback = finiteBranchReadbackForFiniteBranchExpressions({
      targetLatex: 'x',
      branches: roots,
      preserveOrder: true,
      source: 'test-cubic-presentation',
    });
    expect(readback).toMatchObject({
      targetLatex: 'x',
      branchesLatex: ['a', String.raw`\sqrt{b}`, String.raw`-\sqrt{b}`],
      source: 'test-cubic-presentation',
    });
  });

  it('renders node-backed quartic-sized finite root sets in stable order', () => {
    const roots = [
      { latex: 'fallback', node: -2 },
      { latex: 'fallback', node: -1 },
      { latex: 'fallback', node: 1 },
      { latex: 'fallback', node: 2 },
    ];

    expect(exactLatexForFiniteBranchExpressions({
      targetLatex: 'x',
      branches: roots,
      preserveOrder: true,
    })).toBe(String.raw`x\in\left\{-2,\ -1,\ 1,\ 2\right\}`);

    const readback = finiteBranchReadbackForFiniteBranchExpressions({
      targetLatex: 'x',
      branches: roots,
      preserveOrder: true,
      source: 'test-quartic-presentation',
    });
    expect(readback?.branchesLatex).toEqual(['-2', '-1', '1', '2']);
  });

  it('renders node-backed Complex principal-root branches through finite-root presentation', () => {
    const branches = [
      {
        latex: 'fallback',
        node: createComplexPrincipalRootBranchNode({
          radicand: 'a',
          degree: 5,
          branchIndex: 0,
        }),
      },
      {
        latex: 'fallback',
        node: createComplexPrincipalRootBranchNode({
          radicand: 'a',
          degree: 5,
          branchIndex: 1,
        }),
      },
    ];

    expect(exactLatexForFiniteBranchExpressions({
      targetLatex: 'x',
      branches,
      preserveOrder: true,
      context: { domainIntent: 'complex' },
      presentationContext: { complexExactForm: 'cis' },
    })).toBe(
      String.raw`x\in\left\{\operatorname{PrincipalRoot}_{5}\left(a\right),\ \operatorname{PrincipalRoot}_{5}\left(a\right)\left(\operatorname{cis}\left(\frac{2\pi}{5}\right)\right)\right\}`,
    );

    const readback = finiteBranchReadbackForFiniteBranchExpressions({
      targetLatex: 'x',
      branches,
      preserveOrder: true,
      context: { domainIntent: 'complex' },
      presentationContext: { complexExactForm: 'cis' },
      source: 'test-principal-root-presentation',
    });
    expect(readback?.branchesLatex[1]).toContain(String.raw`\operatorname{cis}\left(\frac{2\pi}{5}\right)`);
  });

  it('renders node-backed cubic Cardano branches through finite-root presentation', () => {
    const branches = [
      {
        latex: 'fallback',
        node: createCubicCardanoBranchNode({
          shift: 0,
          p: 'p',
          q: 'q',
          delta: 'Delta',
          primaryRadicand: 'R',
          branchIndex: 0,
          noDenominator: false,
        }),
      },
      {
        latex: 'fallback',
        node: createCubicCardanoBranchNode({
          shift: 0,
          p: 'p',
          q: 'q',
          delta: 'Delta',
          primaryRadicand: 'R',
          branchIndex: 1,
          noDenominator: false,
        }),
      },
    ];

    const exact = exactLatexForFiniteBranchExpressions({
      targetLatex: 'x',
      branches,
      preserveOrder: true,
      context: { domainIntent: 'complex' },
      presentationContext: { complexExactForm: 'cis' },
    });

    expect(exact).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(R\right)`);
    expect(exact).toContain(String.raw`\operatorname{cis}\left(\frac{2\pi}{3}\right)`);

    const readback = finiteBranchReadbackForFiniteBranchExpressions({
      targetLatex: 'x',
      branches,
      preserveOrder: true,
      context: { domainIntent: 'complex' },
      presentationContext: { complexExactForm: 'cis' },
      source: 'test-cardano-presentation',
    });
    expect(readback?.branchesLatex).toHaveLength(2);
    expect(readback?.source).toBe('test-cardano-presentation');
  });
});
