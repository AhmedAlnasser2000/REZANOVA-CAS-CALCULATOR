import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  algebraicRootLogTermLatex,
  createAlgebraicConstantDescriptor,
  createAlgebraicRootDescriptor,
  createAlgebraicTraceEvidence,
} from './algebraic-root-descriptor';
import { parseSymbolicPolynomial } from './symbolic-polynomial';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function polynomial(latex: string, variable = 'lambda') {
  const parsed = parseSymbolicPolynomial(node(latex), variable, 8);
  expect(parsed.kind).toBe('success');
  if (parsed.kind !== 'success') {
    throw new Error(`expected polynomial for ${latex}`);
  }
  return parsed.polynomial;
}

describe('algebraic root descriptors', () => {
  it('names algebraic roots and renders definitions without RootOf leakage', () => {
    const descriptor = createAlgebraicRootDescriptor(polynomial('λ^3+λ+1'), {
      familyId: 'lrt-test',
      polynomialNameLatex: 'R',
    });

    expect(descriptor.kind).toBe('success');
    if (descriptor.kind !== 'success') {
      throw new Error('expected descriptor');
    }
    expect(descriptor.degree).toBe(3);
    expect(descriptor.roots.map((root) => root.symbolLatex)).toEqual([
      '\\alpha_{1}',
      '\\alpha_{2}',
      '\\alpha_{3}',
    ]);
    expect(descriptor.detailSection.title).toBe('Algebraic Root Definitions');
    expect(descriptor.definitionLatex.join(' ')).toContain('R\\left(\\lambda\\right)');
    expect(descriptor.definitionLatex.join(' ')).not.toMatch(/RootOf|rootof/i);
  });

  it('builds MathLive-safe algebraic log term readback', () => {
    const descriptor = createAlgebraicRootDescriptor(polynomial('λ^2+λ+1'));
    expect(descriptor.kind).toBe('success');
    if (descriptor.kind !== 'success') {
      throw new Error('expected descriptor');
    }

    const term = algebraicRootLogTermLatex(descriptor.roots[0], 'x-\\alpha_{1}', '2');

    expect(term).toBe('2\\cdot \\alpha_{1}\\cdot\\ln\\left|x-\\alpha_{1}\\right|');
    expect(term).not.toMatch(/RootOf|rootof/i);
  });

  it('describes algebraic constants and trace readback without raw RootOf leakage', () => {
    const descriptor = createAlgebraicRootDescriptor(polynomial('λ^3+λ+1'));
    expect(descriptor.kind).toBe('success');
    if (descriptor.kind !== 'success') {
      throw new Error('expected descriptor');
    }

    const constant = createAlgebraicConstantDescriptor(descriptor, {
      baseFieldLatex: '\\mathbb{Q}',
    });
    const trace = createAlgebraicTraceEvidence(descriptor, {
      baseFieldLatex: '\\mathbb{Q}',
      traceBodyLatex: '\\alpha\\cdot\\ln\\left|S\\left(\\alpha,x\\right)\\right|',
      expandedTermsLatex: descriptor.roots.map((root) =>
        algebraicRootLogTermLatex(root, `S_{${root.index}}\\left(x\\right)`)),
    });

    expect(constant.extensionFieldLatex).toBe('\\mathbb{Q}\\left(\\alpha\\right)');
    expect(trace.traceLatex).toContain('\\operatorname{Tr}_{\\mathbb{Q}\\left(\\alpha\\right)/\\mathbb{Q}}');
    expect(trace.expandedTraceLatex).toContain('\\alpha_{1}\\cdot\\ln');
    expect([
      ...constant.definitionLatex,
      ...trace.definitionLatex,
      ...trace.detailSection.lines,
    ].join('\n')).not.toMatch(/RootOf|rootof/i);
  });

  it('stops on constants, zero polynomials, and descriptor degree over cap', () => {
    expect(createAlgebraicRootDescriptor(polynomial('1'))).toEqual({
      kind: 'stop',
      reason: 'constant-polynomial',
    });
    expect(createAlgebraicRootDescriptor(polynomial('0'))).toEqual({
      kind: 'stop',
      reason: 'zero-polynomial',
    });
    expect(createAlgebraicRootDescriptor(polynomial('λ^7+1'), { maxDegree: 6 })).toEqual({
      kind: 'stop',
      reason: 'degree-cap',
    });
  });
});
