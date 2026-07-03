import { describe, expect, it } from 'vitest';
import {
  parsePiecewiseLimitExpression,
  resolvePiecewiseLimit,
} from './piecewise-limits';

describe('piecewise limits', () => {
  it('parses friendly piecewise branch syntax', () => {
    const parsed = parsePiecewiseLimitExpression('piecewise(x if x<0, x^2 otherwise)');

    expect(parsed.kind).toBe('piecewise');
    if (parsed.kind === 'piecewise') {
      expect(parsed.branches).toHaveLength(2);
      expect(parsed.branches[0]).toMatchObject({
        expressionLatex: 'x',
        condition: {
          variable: 'x',
          operator: '<',
          value: 0,
        },
      });
      expect(parsed.branches[1]).toMatchObject({
        expressionLatex: 'x^2',
        otherwise: true,
      });
    }
  });

  it('parses semicolon and line-break friendly piecewise branch syntax', () => {
    const semicolon = parsePiecewiseLimitExpression('piecewise(x if x<0; x^2 otherwise)');
    const lineBreak = parsePiecewiseLimitExpression('piecewise(x if x<0\nx^2 otherwise)');

    for (const parsed of [semicolon, lineBreak]) {
      expect(parsed.kind).toBe('piecewise');
      if (parsed.kind === 'piecewise') {
        expect(parsed.branches).toHaveLength(2);
        expect(parsed.branches[0]?.expressionLatex).toBe('x');
        expect(parsed.branches[0]?.condition?.operator).toBe('<');
        expect(parsed.branches[1]?.expressionLatex).toBe('x^2');
        expect(parsed.branches[1]?.otherwise).toBe(true);
      }
    }
  });

  it('resolves agreeing one-sided finite Piecewise branch limits', () => {
    const result = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(x if x<0, x^2 otherwise)',
      variable: 'x',
      target: {
        kind: 'finite',
        value: 0,
        direction: 'two-sided',
      },
    });

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.exactLatex).toBe('0');
      expect(result.detailSections?.[0]?.title).toBe('Limit Method');
      expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Left branch');
      expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Right branch');
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 0^{-}}x=0',
      });
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 0^{+}}x^2=0',
      });
    }
  });

  it('fails two-sided Piecewise limits when branch limits disagree', () => {
    const result = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(-1 if x<0, 1 otherwise)',
      variable: 'x',
      target: {
        kind: 'finite',
        value: 0,
        direction: 'two-sided',
      },
    });

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.error).toContain('do not agree');
      expect(result.detailSections?.[0]?.title).toBe('Why This Limit Fails');
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 0^{-}}-1=-1',
      });
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '\\lim_{x\\to 0^{+}}1=1',
      });
    }
  });

  it('selects Piecewise branches at infinity', () => {
    const positive = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(1 if x<0, 2 otherwise)',
      variable: 'x',
      target: {
        kind: 'infinite',
        targetKind: 'posInfinity',
      },
    });
    const negative = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(1 if x<0, 2 otherwise)',
      variable: 'x',
      target: {
        kind: 'infinite',
        targetKind: 'negInfinity',
      },
    });

    expect(positive.kind).toBe('success');
    if (positive.kind === 'success') {
      expect(positive.exactLatex).toBe('2');
    }
    expect(negative.kind).toBe('success');
    if (negative.kind === 'success') {
      expect(negative.exactLatex).toBe('1');
    }
  });

  it('parses LaTeX cases syntax', () => {
    const parsed = parsePiecewiseLimitExpression(
      '\\begin{cases}x&x<0\\\\x^2&\\text{otherwise}\\end{cases}',
    );

    expect(parsed.kind).toBe('piecewise');
    if (parsed.kind === 'piecewise') {
      expect(parsed.branches[0]?.expressionLatex).toBe('x');
      expect(parsed.branches[1]?.expressionLatex).toBe('x^2');
      expect(parsed.branches[1]?.otherwise).toBe(true);
    }
  });
});
