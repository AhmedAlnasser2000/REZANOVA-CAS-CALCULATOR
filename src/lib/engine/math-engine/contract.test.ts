import { describe, expect, it } from 'vitest';
import { listExpressionActionDescriptors, runExpressionAction } from '../math-engine';
import { request } from './test-support';

describe('runExpressionAction contracts', () => {
  it('solves only when the action is explicit solve', () => {
    const result = runExpressionAction({ ...request, mode: 'equation' }, 'solve');

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('\\frac');
    expect(result.approxText).toContain('x ~=');
  });

  it('surfaces shared domain-range nonnegative guards in equation solve', () => {
    const root = runExpressionAction(
      { ...request, mode: 'equation', document: { latex: '\\sqrt{x}=-1' } },
      'solve',
    );
    const absolute = runExpressionAction(
      { ...request, mode: 'equation', document: { latex: '\\left|x\\right|=-2' } },
      'solve',
    );

    expect(root.error).toContain('square roots are always nonnegative');
    expect(absolute.error).toContain('absolute values are always nonnegative');
  });

  it('does not silently solve an equality when evaluating', () => {
    const evaluated = runExpressionAction({ ...request, mode: 'equation' }, 'evaluate');
    const solved = runExpressionAction({ ...request, mode: 'equation' }, 'solve');

    expect(evaluated.error).toBeUndefined();
    expect(evaluated.exactLatex).not.toBe(solved.exactLatex);
    expect(evaluated.approxText ?? '').not.toContain('x ~=');
  });

  it('keeps solve internal to the expression host while exposing only the four public expression capabilities', () => {
    expect(listExpressionActionDescriptors()).toEqual([
      {
        id: 'evaluate',
        label: 'Evaluate',
        publicCapabilityId: 'expression.evaluate',
        execute: expect.any(Function),
      },
      {
        id: 'simplify',
        label: 'Simplify',
        publicCapabilityId: 'expression.simplify',
        execute: expect.any(Function),
      },
      {
        id: 'factor',
        label: 'Factor',
        publicCapabilityId: 'expression.factor',
        execute: expect.any(Function),
      },
      {
        id: 'expand',
        label: 'Expand',
        publicCapabilityId: 'expression.expand',
        execute: expect.any(Function),
      },
      {
        id: 'solve',
        label: 'Solve',
        execute: expect.any(Function),
      },
    ]);
  });
});
