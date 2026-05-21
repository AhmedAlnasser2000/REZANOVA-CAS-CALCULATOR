import { describe, expect, it } from 'vitest';
import { runExpressionBaselineProbe } from './run-experiment';

describe('expression baseline probe lab', () => {
  it('runs expression input through stable Calculate behavior for visual Labs proof', () => {
    const result = runExpressionBaselineProbe('\\frac{1}{3}+\\frac{1}{6}');

    expect(result.inputLatex).toBe('\\frac{1}{3}+\\frac{1}{6}');
    expect(result.outcome.kind).toBe('success');
    expect(result.outcome.title).toBe('Numeric');
    if (result.outcome.kind === 'success') {
      expect(result.outcome.exactLatex).toBeTruthy();
    }
  });
});
