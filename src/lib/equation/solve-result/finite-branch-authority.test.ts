import { describe, expect, it } from 'vitest';
import type {
  CanonicalMathValueV1,
  DisplayBranchReadback,
  SerializableMathJson,
} from '../../../types/calculator';
import { resolveEquationFiniteBranchAuthority } from './finite-branch-authority';
import { equationMathValuesForOwnedSuccessReadback } from './owned-readback-math';

const routeId = 'equation.rational-radical' as const;

function resolve(input: {
  target?: string;
  relation?: DisplayBranchReadback['relationLatex'];
  nodes: SerializableMathJson[];
  branches: string[];
  primaryMath?: CanonicalMathValueV1;
}) {
  const target = input.target ?? 'x';
  const relation = input.relation ?? (input.nodes.length === 1 ? '=' : '\\in');
  const primaryMath = input.primaryMath ?? {
    canonicalLatex: input.nodes.length === 1
      ? `${target}=${input.branches[0]}`
      : `${target}\\in\\left\\{${input.branches.join(', ')}\\right\\}`,
    mathJson: input.nodes.length === 1
      ? ['Equal', target, input.nodes[0]]
      : ['Element', target, ['Set', ...input.nodes]],
  };
  return resolveEquationFiniteBranchAuthority({
    primaryMath,
    branchReadback: {
      targetLatex: target,
      relationLatex: relation,
      branchesLatex: input.branches,
      source: 'finite-branch-authority-test',
    },
    routeId,
    source: 'finite-branch-authority-test',
  });
}

describe('Equation exact finite branch authority', () => {
  it('proves a single exact branch from Equal target and root nodes', () => {
    const result = resolve({ nodes: [['Rational', 1, 2]], branches: ['\\frac{1}{2}'] });

    expect(result).toMatchObject({
      exactLatex: 'x=\\frac{1}{2}',
    });
    expect(result?.branchReadback).toBeUndefined();
    expect(result?.primaryMath.mathJson).toEqual(['Equal', 'x', ['Rational', 1, 2]]);
  });

  it('preserves an approved single-root presentation while attaching native proof', () => {
    const result = resolve({
      nodes: [['Add', ['Divide', ['Sqrt', ['Add', 1, ['Multiply', 4, ['Power', 'ExponentialE', 2]]]], 2], ['Rational', -1, 2]]],
      branches: ['\\frac{1}{2}(\\sqrt{1+4\\exponentialE^{2}})-\\frac{1}{2}'],
      primaryMath: {
        canonicalLatex: 'x=\\frac{1}{2}(\\sqrt{1+4\\exponentialE^{2}})-\\frac{1}{2}',
        mathJson: ['Equal', 'x', ['Add', ['Divide', ['Sqrt', ['Add', 1, ['Multiply', 4, ['Power', 'ExponentialE', 2]]]], 2], ['Rational', -1, 2]]],
      },
    });

    expect(result?.exactLatex)
      .toBe('x=\\frac{1}{2}(\\sqrt{1+4\\exponentialE^{2}})-\\frac{1}{2}');
  });

  it('matches reordered rational and radical branches by identity, then preserves native order', () => {
    const result = resolve({
      nodes: [['Rational', 1, 2], ['Sqrt', 2]],
      branches: ['\\sqrt{2}', '\\frac{1}{2}'],
      primaryMath: {
        canonicalLatex: 'x\\in\\left\\{\\frac{1}{2}, \\sqrt{2}\\right\\}',
        mathJson: ['Element', 'x', ['Set', ['Rational', 1, 2], ['Sqrt', 2]]],
      },
    });

    expect(result?.branchReadback?.branchesLatex).toEqual(['\\frac{1}{2}', '\\sqrt{2}']);
    expect(result?.primaryMath.mathJson).toEqual([
      'Element', 'x', ['Set', ['Rational', 1, 2], ['Sqrt', 2]],
    ]);
  });

  it('covers bounded finite sets without depending on a particular equation formula', () => {
    const nodes = Array.from({ length: 8 }, (_, index) => index - 4);
    const result = resolve({
      nodes,
      branches: [...nodes].reverse().map(String),
      primaryMath: {
        canonicalLatex: `x\\in\\left\\{${nodes.join(', ')}\\right\\}`,
        mathJson: ['Element', 'x', ['Set', ...nodes]],
      },
    });

    expect(result?.branchReadback?.branchesLatex).toEqual(nodes.map(String));
  });

  it('normalizes spacing and equivalent square-root spelling from native nodes', () => {
    const node: SerializableMathJson = [
      'Negate',
      ['Sqrt', ['Add', ['Negate', ['Divide', ['Sqrt', 13], 2]], ['Rational', 5, 2]]],
    ];
    const result = resolve({
      nodes: [node, 0],
      branches: ['\\ -\\sqrt{\\frac{5}{2}-\\frac{13^{1/2}}{2}}', '0'],
      primaryMath: {
        canonicalLatex: 'x\\in\\left\\{-\\sqrt{\\frac{5}{2}-\\frac{13^{1/2}}{2}}, 0\\right\\}',
        mathJson: ['Element', 'x', ['Set', node, 0]],
      },
    });

    expect(result?.branchReadback?.branchesLatex[0])
      .toBe('-\\sqrt{\\frac{5}{2}-\\frac{\\sqrt{13}}{2}}');
    expect(result?.exactLatex).not.toContain('13^{1/2}');
  });

  it('normalizes existing answer rows from the same uniquely matched nodes', () => {
    const result = resolveEquationFiniteBranchAuthority({
      primaryMath: {
        canonicalLatex: 'x\\in\\left\\{1, 2\\right\\}',
        mathJson: ['Element', 'x', ['Set', 1, 2]],
      },
      branchReadback: {
        targetLatex: 'x', relationLatex: '\\in', branchesLatex: ['2', '1'],
      },
      answerRows: {
        label: 'Exact roots',
        rows: [{ latex: 'x=2', label: 'second' }, { latex: 'x=1', label: 'first' }],
      },
      routeId,
      source: 'finite-branch-answer-row-test',
    });

    expect(result?.answerRows).toEqual({
      label: 'Exact roots',
      rows: [{ latex: 'x=1', label: 'first' }, { latex: 'x=2', label: 'second' }],
    });
  });

  it('matches signed imaginary answer rows by their branch value', () => {
    const negativeImaginary: SerializableMathJson = ['Multiply', -1, 'ImaginaryUnit'];
    const positiveImaginary: SerializableMathJson = ['Multiply', 1, 'ImaginaryUnit'];
    const result = resolveEquationFiniteBranchAuthority({
      primaryMath: {
        canonicalLatex: 'x\\in\\left\\{-i,\\ i\\right\\}',
        mathJson: ['Element', 'x', ['Set', negativeImaginary, positiveImaginary]],
      },
      branchReadback: {
        targetLatex: 'x', relationLatex: '\\in', branchesLatex: ['-i', 'i'],
      },
      answerRows: {
        rows: [{ latex: 'x=-i' }, { latex: 'x=i' }],
      },
      routeId: 'equation.domain-boundary',
      source: 'complex-answer-row-test',
    });

    expect(result?.answerRows?.rows.map((row) => row.latex)).toEqual(['x=-i', 'x=i']);
  });

  it('prevents readback enrichment from downgrading native branch proof', () => {
    const values = equationMathValuesForOwnedSuccessReadback({
      readback: {
        exactLatex: 'x\\in\\left\\{1, 2\\right\\}',
        primaryMath: {
          canonicalLatex: 'x\\in\\left\\{1, 2\\right\\}',
          mathJson: ['Element', 'x', ['Set', 1, 2]],
        },
        branchReadback: {
          targetLatex: 'x', relationLatex: '\\in', branchesLatex: ['2', '1'],
        },
      },
      leaves: [],
    });

    expect(values.branchReadback?.branches.map((branch) => branch.mathJson)).toEqual([2, 1]);
  });

  it.each([
    { name: 'missing branch', nodes: [1, 2], branches: ['1'], message: 'missing or extra' },
    { name: 'extra branch', nodes: [1, 2], branches: ['1', '2', '3'], message: 'missing or extra' },
    { name: 'conflicting branch', nodes: [1, 2], branches: ['1', '3'], message: 'conflicting or ambiguous' },
    { name: 'ambiguous duplicate roots', nodes: [1, 1], branches: ['1', '1'], message: 'conflicting or ambiguous' },
  ])('fails closed for $name', ({ nodes, branches, message }) => {
    expect(() => resolve({
      nodes,
      branches,
      primaryMath: {
        canonicalLatex: `x\\in\\left\\{${nodes.join(', ')}\\right\\}`,
        mathJson: ['Element', 'x', ['Set', ...nodes]],
      },
    })).toThrow(message);
  });

  it('fails closed when exact finite readback has no producer-owned primary tree', () => {
    expect(() => resolveEquationFiniteBranchAuthority({
      primaryMath: { canonicalLatex: 'x\\in\\left\\{1, 2\\right\\}' },
      branchReadback: {
        targetLatex: 'x', relationLatex: '\\in', branchesLatex: ['1', '2'],
      },
      routeId,
      source: 'missing-primary-test',
    })).toThrow('require producer-owned primary MathJSON');
  });

  it('fails closed for a target or relation that conflicts with the native primary tree', () => {
    expect(() => resolve({
      target: 'y',
      nodes: [1, 2],
      branches: ['1', '2'],
      primaryMath: {
        canonicalLatex: 'x\\in\\left\\{1, 2\\right\\}',
        mathJson: ['Element', 'x', ['Set', 1, 2]],
      },
    })).toThrow('target conflicts');

    expect(() => resolve({
      relation: '=',
      nodes: [1, 2],
      branches: ['1', '2'],
      primaryMath: {
        canonicalLatex: 'x\\in\\left\\{1, 2\\right\\}',
        mathJson: ['Element', 'x', ['Set', 1, 2]],
      },
    })).toThrow('relation does not match');
  });

  it('does not claim approximate, system, or compound-target readback', () => {
    expect(resolveEquationFiniteBranchAuthority({
      primaryMath: { canonicalLatex: 'x\\approx1', mathJson: ['Equal', 'x', 1] },
      branchReadback: {
        targetLatex: 'x', relationLatex: '\\approx', branchesLatex: ['1'],
      },
      routeId,
      source: 'approximate-test',
    })).toBeUndefined();
    expect(resolveEquationFiniteBranchAuthority({
      primaryMath: {
        canonicalLatex: '(x,y)=(1,2)',
        mathJson: ['Equal', ['Tuple', 'x', 'y'], ['Tuple', 1, 2]],
      },
      branchReadback: {
        targetLatex: '(x,y)', relationLatex: '=', branchesLatex: ['(1,2)'],
      },
      routeId,
      source: 'system-test',
    })).toBeUndefined();
  });
});
