import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  resolveFiniteComplexDomainLimit,
  unsupportedComplexDomainLimit,
} from './complex-domain';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('complex-domain finite limit proofs', () => {
  it('proves principal square-root boundary carriers tend to zero', () => {
    const result = resolveFiniteComplexDomainLimit({
      node: parse('\\sqrt{x}'),
      variable: 'x',
      target: 0,
      direction: 'two-sided',
    });

    expect(result?.kind).toBe('success');
    if (result?.kind === 'success') {
      expect(result.exactLatex).toBe('0');
      expect(result.detailSections?.[0]?.title).toBe('Complex Domain');
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 0}x=0',
      });
    }
  });

  it('handles shifted affine principal square-root boundaries', () => {
    const result = resolveFiniteComplexDomainLimit({
      node: parse('\\sqrt{x+1}'),
      variable: 'x',
      target: -1,
      direction: 'two-sided',
    });

    expect(result?.kind).toBe('success');
    if (result?.kind === 'success') {
      expect(result.exactLatex).toBe('0');
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to -1}x+1=0',
      });
    }
  });

  it('keeps recognized square-root sums proof-first', () => {
    const result = resolveFiniteComplexDomainLimit({
      node: parse('\\sqrt{x^2+x}-x'),
      variable: 'x',
      target: 0,
      direction: 'two-sided',
    });

    expect(result?.kind).toBe('success');
    if (result?.kind === 'success') {
      expect(result.exactLatex).toBe('0');
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\sqrt{x^2+x}',
      });
    }
  });

  it('keeps unsupported complex proofs controlled', () => {
    const result = unsupportedComplexDomainLimit(
      'Complex proof is not supported yet for this finite-domain-boundary limit.',
    );

    expect(result.kind).toBe('unsupported');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Form detected');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Key calculation');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Conclusion');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('proof-first');
  });
});
