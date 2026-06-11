import { describe, expect, it } from 'vitest';
import {
  extractFiniteBranchReadback,
  normalizeFiniteBranchReadback,
  splitTopLevelCommaList,
} from './branch-readback';

describe('branch readback extraction', () => {
  it('extracts finite set branches for generic solve targets', () => {
    expect(extractFiniteBranchReadback('x\\in\\left\\{1,2\\right\\}')).toMatchObject({
      targetLatex: 'x',
      relationLatex: '\\in',
      rowRelationLatex: '=',
      branchesLatex: ['1', '2'],
      rowsLatex: ['x=1', 'x=2'],
    });

    expect(extractFiniteBranchReadback('z=\\left\\{a+b,a-b\\right\\}')).toMatchObject({
      targetLatex: 'z',
      relationLatex: '=',
      rowsLatex: ['z=a+b', 'z=a-b'],
    });

    expect(extractFiniteBranchReadback('\\theta\\approx\\left\\{0,\\pi\\right\\}')).toMatchObject({
      targetLatex: '\\theta',
      relationLatex: '\\approx',
      rowRelationLatex: '\\approx',
      rowsLatex: ['\\theta\\approx0', '\\theta\\approx\\pi'],
    });
  });

  it('preserves multivariable and parameterized branch content', () => {
    const result = extractFiniteBranchReadback(
      's\\in\\left\\{\\frac{d}{4}+r+\\sqrt{x+j},\\ \\frac{d}{4}-r-\\sqrt{x+j}\\right\\}',
    );

    expect(result?.rowsLatex).toEqual([
      's=\\frac{d}{4}+r+\\sqrt{x+j}',
      's=\\frac{d}{4}-r-\\sqrt{x+j}',
    ]);
    expect(result?.originalLatex).toContain('s\\in\\left\\{');
  });

  it('normalizes trusted branch metadata for generic targets', () => {
    expect(normalizeFiniteBranchReadback({
      targetLatex: '\\theta',
      relationLatex: '\\approx',
      branchesLatex: ['0', '\\pi'],
      source: 'test',
    })).toMatchObject({
      targetLatex: '\\theta',
      relationLatex: '\\approx',
      rowRelationLatex: '\\approx',
      branchesLatex: ['0', '\\pi'],
      rowsLatex: ['\\theta\\approx0', '\\theta\\approx\\pi'],
    });

    expect(normalizeFiniteBranchReadback({
      targetLatex: 't',
      relationLatex: '\\in',
      branchesLatex: [
        '\\frac{d}{4}+r+\\sqrt{x+j}',
        '\\frac{d}{4}-r-\\sqrt{x+j}',
      ],
    }, 't\\in\\left\\{...\\right\\}')?.rowsLatex).toEqual([
      't=\\frac{d}{4}+r+\\sqrt{x+j}',
      't=\\frac{d}{4}-r-\\sqrt{x+j}',
    ]);
  });

  it('splits only top-level commas', () => {
    expect(splitTopLevelCommaList(
      '\\frac{a,b}{c},\\sqrt{x,y},f(a,b),\\left\\{1,2\\right\\},z',
    )).toEqual([
      '\\frac{a,b}{c}',
      '\\sqrt{x,y}',
      'f(a,b)',
      '\\left\\{1,2\\right\\}',
      'z',
    ]);
  });

  it('fails closed for ambiguous or malformed branch answers', () => {
    expect(extractFiniteBranchReadback('(x,y)\\in\\left\\{(1,2),(3,4)\\right\\}')).toBeNull();
    expect(extractFiniteBranchReadback('x\\in\\left\\{1\\right\\}')).toBeNull();
    expect(extractFiniteBranchReadback('x\\in1,2')).toBeNull();
    expect(extractFiniteBranchReadback('x+y=\\left\\{1,2\\right\\}')).toBeNull();
    expect(normalizeFiniteBranchReadback({
      targetLatex: '(x,y)',
      relationLatex: '\\in',
      branchesLatex: ['(1,2)', '(3,4)'],
    })).toBeNull();
    expect(normalizeFiniteBranchReadback({
      targetLatex: 'x',
      relationLatex: '=',
      branchesLatex: ['1'],
    })).toBeNull();
  });
});
