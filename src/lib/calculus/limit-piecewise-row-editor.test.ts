import { describe, expect, it } from 'vitest';
import {
  buildStarterLimitPiecewiseRequest,
  limitPiecewiseReadbackBodyLatex,
  parseLimitPiecewiseDraft,
  serializeLimitPiecewiseRequest,
} from './limit-piecewise-row-editor';

describe('limit piecewise row editor helpers', () => {
  it('normalizes friendly piecewise syntax into editable rows', () => {
    const draft = parseLimitPiecewiseDraft('lim x -> 0 piecewise(x if x < 0; x^2 otherwise)');

    expect(draft?.rows).toMatchObject([
      {
        expressionLatex: 'x',
        conditionLatex: 'x < 0',
        otherwise: false,
      },
      {
        expressionLatex: 'x^2',
        conditionLatex: '\\text{otherwise}',
        otherwise: true,
      },
    ]);
    expect(draft?.issues).toEqual([]);
  });

  it('recovers MathLive-glued friendly piecewise rows after paste', () => {
    const draft = parseLimitPiecewiseDraft('lim x -> 0 piecewise(-1ifx<0;1otherwise)');

    expect(draft?.rows).toMatchObject([
      {
        expressionLatex: '-1',
        conditionLatex: 'x<0',
        otherwise: false,
      },
      {
        expressionLatex: '1',
        conditionLatex: '\\text{otherwise}',
        otherwise: true,
      },
    ]);
    expect(draft?.issues).toEqual([]);
  });

  it('normalizes LaTeX cases into editable rows', () => {
    const draft = parseLimitPiecewiseDraft(
      '\\lim_{x\\to 0}\\begin{cases}x&x<0\\\\x^2&\\text{otherwise}\\end{cases}',
    );

    expect(draft?.rows).toHaveLength(2);
    expect(draft?.rows[0]).toMatchObject({
      expressionLatex: 'x',
      conditionLatex: 'x<0',
      otherwise: false,
    });
    expect(draft?.rows[1]).toMatchObject({
      expressionLatex: 'x^2',
      otherwise: true,
    });
  });

  it('strips MathLive placeholder tokens from cases templates', () => {
    const draft = parseLimitPiecewiseDraft(
      '\\lim_{x\\to 0}\\begin{cases}\\placeholder{}&x<0\\\\\\placeholder{}&\\text{otherwise}\\end{cases}',
    );

    expect(draft?.rows).toMatchObject([
      {
        expressionLatex: '',
        conditionLatex: 'x<0',
        otherwise: false,
      },
      {
        expressionLatex: '',
        conditionLatex: '\\text{otherwise}',
        otherwise: true,
      },
    ]);
  });

  it('preserves empty expression cells in the starter cases template', () => {
    const draft = parseLimitPiecewiseDraft(buildStarterLimitPiecewiseRequest());

    expect(draft?.rows).toMatchObject([
      {
        expressionLatex: '',
        conditionLatex: 'x<0',
        otherwise: false,
      },
      {
        expressionLatex: '',
        conditionLatex: '\\text{otherwise}',
        otherwise: true,
      },
    ]);
  });

  it('serializes rows back to canonical cases without wrapping the body', () => {
    const draft = parseLimitPiecewiseDraft('lim x -> 0 piecewise(x if x < 0; x^2 otherwise)');
    expect(draft).not.toBeNull();

    const serialized = serializeLimitPiecewiseRequest(draft!.request, draft!.rows);

    expect(serialized).toBe(
      '\\lim_{x\\to 0}\\begin{cases}x&x < 0\\\\x^2&\\text{otherwise}\\end{cases}',
    );
  });

  it('preserves authored spaces in cases conditions for the row editor', () => {
    const draft = parseLimitPiecewiseDraft(
      '\\lim_{x\\to 0}\\begin{cases}x&0 <= x < 5\\\\x^2&\\text{otherwise}\\end{cases}',
    );

    expect(draft?.rows[0]).toMatchObject({
      expressionLatex: 'x',
      conditionLatex: '0 <= x < 5',
      otherwise: false,
    });
  });

  it('keeps malformed rows recoverable with row-specific issues', () => {
    const draft = parseLimitPiecewiseDraft('lim x -> 0 piecewise(x if ; x^2 otherwise)');

    expect(draft?.rows).toHaveLength(2);
    expect(draft?.issues).toContainEqual({
      rowId: 'piecewise-row-1',
      field: 'condition',
      message: 'Enter a simple condition for this row.',
    });
  });

  it('uses rendered cases readback instead of mashed friendly text', () => {
    expect(limitPiecewiseReadbackBodyLatex('piecewise(x if x<0; x^2 otherwise)')).toBe(
      '\\begin{cases}x&x<0\\\\x^2&\\text{otherwise}\\end{cases}',
    );
  });
});
