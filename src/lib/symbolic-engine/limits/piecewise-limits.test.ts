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

  it('parses pasted friendly piecewise syntax after spaces are stripped', () => {
    const parsed = parsePiecewiseLimitExpression('piecewise(-1ifx<0;1otherwise)');

    expect(parsed.kind).toBe('piecewise');
    if (parsed.kind === 'piecewise') {
      expect(parsed.branches[0]).toMatchObject({
        expressionLatex: '-1',
        condition: {
          variable: 'x',
          operator: '<',
          value: 0,
        },
      });
      expect(parsed.branches[1]).toMatchObject({
        expressionLatex: '1',
        otherwise: true,
      });
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

  it('resolves one-sided and boundary Piecewise branch limits', () => {
    const right = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(-1 if x<0; 1 otherwise)',
      variable: 'x',
      target: {
        kind: 'finite',
        value: 0,
        direction: 'right',
      },
    });
    const left = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(-1 if x<0; 1 otherwise)',
      variable: 'x',
      target: {
        kind: 'finite',
        value: 0,
        direction: 'left',
      },
    });
    const boundary = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(x^2 if x<2; 4 otherwise)',
      variable: 'x',
      target: {
        kind: 'finite',
        value: 2,
        direction: 'two-sided',
      },
    });

    expect(right.kind).toBe('success');
    if (right.kind === 'success') {
      expect(right.exactLatex).toBe('1');
      expect(right.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '1',
      });
    }
    expect(left.kind).toBe('success');
    if (left.kind === 'success') {
      expect(left.exactLatex).toBe('-1');
    }
    expect(boundary.kind).toBe('success');
    if (boundary.kind === 'success') {
      expect(boundary.exactLatex).toBe('4');
    }
  });

  it('keeps selected branch evidence when a Piecewise branch is unsupported', () => {
    const result = resolvePiecewiseLimit({
      bodyLatex: 'piecewise(floor(1/x) if x<0; 0 otherwise)',
      variable: 'x',
      target: {
        kind: 'finite',
        value: 0,
        direction: 'two-sided',
      },
    });

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.error).toContain('outside the supported Calculus rules');
      expect(result.detailSections?.[0]?.title).toBe('Limit Diagnostic');
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: 'floor(1/x)',
      });
      expect(result.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
        kind: 'math',
        latex: '0',
      });
    }
  });

  it('stops Piecewise branch analysis over the solver cap', () => {
    const branches = Array.from({ length: 13 }, (_, index) =>
      `${index} if x<${index - 6}`,
    );
    branches.push('99 otherwise');
    const result = resolvePiecewiseLimit({
      bodyLatex: `piecewise(${branches.join('; ')})`,
      variable: 'x',
      target: {
        kind: 'finite',
        value: 0,
        direction: 'two-sided',
      },
    });

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.error).toContain('supports up to 12 branches');
      expect(result.detailSections?.[0]?.lines.join(' ')).toContain('solver cap is 12');
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
