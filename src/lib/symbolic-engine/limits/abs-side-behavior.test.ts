import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveFiniteAbsSideBehaviorLimit } from './abs-side-behavior';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

describe('absolute-value side behavior limits', () => {
  it('resolves one-sided absolute-value quotients exactly', () => {
    const left = resolveFiniteAbsSideBehaviorLimit(node('\\frac{|x|}{x}'), 0, 'x', 'left');
    const right = resolveFiniteAbsSideBehaviorLimit(node('\\frac{|x|}{x}'), 0, 'x', 'right');

    expect(left?.kind).toBe('success');
    if (left?.kind === 'success') {
      expect(left.exactLatex).toBe('-1');
      expect(left.origin).toBe('rule-based-symbolic');
      expect(left.detailSections?.[0]?.title).toBe('Side Behavior');
    }

    expect(right?.kind).toBe('success');
    if (right?.kind === 'success') {
      expect(right.exactLatex).toBe('1');
      expect(right.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 0^{+}}\\frac{\\vert x\\vert}{x}=1',
      });
    }
  });

  it('proves two-sided disagreement for absolute-value quotients', () => {
    const result = resolveFiniteAbsSideBehaviorLimit(node('\\frac{|x-2|}{x-2}'), 2, 'x', 'two-sided');

    expect(result?.kind).toBe('failure');
    if (result?.kind === 'failure') {
      expect(result.error).toContain('do not agree');
      expect(result.detailSections[0]?.title).toBe('Why This Limit Fails');
      expect(result.detailSections[0]?.lines.join(' ')).toContain('Form detected');
      expect(result.detailSections[0]?.lines.join(' ')).toContain('Conclusion');
      expect(result.detailSections[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 2^{-}}\\frac{\\vert x-2\\vert}{x-2}=-1',
      });
      expect(result.detailSections[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 2^{+}}\\frac{\\vert x-2\\vert}{x-2}=1',
      });
    }
  });

  it('handles affine carrier orientation', () => {
    const left = resolveFiniteAbsSideBehaviorLimit(node('\\frac{|2x-4|}{2x-4}'), 2, 'x', 'left');
    const right = resolveFiniteAbsSideBehaviorLimit(node('\\frac{|2x-4|}{2x-4}'), 2, 'x', 'right');

    expect(left?.kind).toBe('success');
    expect(right?.kind).toBe('success');
    if (left?.kind === 'success' && right?.kind === 'success') {
      expect(left.exactLatex).toBe('-1');
      expect(right.exactLatex).toBe('1');
    }
  });

  it('resolves absolute-value carriers at their zero', () => {
    const result = resolveFiniteAbsSideBehaviorLimit(node('|x-2|'), 2, 'x', 'two-sided');

    expect(result?.kind).toBe('success');
    if (result?.kind === 'success') {
      expect(result.exactLatex).toBe('0');
      expect(result.detailSections?.[0]?.lines.join(' ')).toContain('absolute-value carrier');
    }
  });
});
