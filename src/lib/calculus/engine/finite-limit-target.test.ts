import { describe, expect, it } from 'vitest';
import {
  finiteLimitTargetLatex,
  normalizeDirectionalLimitLatex,
  parseFiniteLimitTargetDraft,
} from './finite-limit-target';

describe('finite limit target parsing', () => {
  it('accepts finite numeric and directional target drafts', () => {
    expect(parseFiniteLimitTargetDraft('0')).toEqual({
      value: 0,
      normalizedTargetLatex: '0',
      directionOverride: undefined,
    });
    expect(parseFiniteLimitTargetDraft('-2')).toMatchObject({
      value: -2,
      normalizedTargetLatex: '-2',
    });
    expect(parseFiniteLimitTargetDraft('3e-2')).toMatchObject({
      value: 0.03,
      normalizedTargetLatex: '0.03',
    });
    expect(parseFiniteLimitTargetDraft('0^+')).toEqual({
      value: 0,
      normalizedTargetLatex: '0',
      directionOverride: 'right',
    });
    expect(parseFiniteLimitTargetDraft('0^{-}')).toEqual({
      value: 0,
      normalizedTargetLatex: '0',
      directionOverride: 'left',
    });
  });

  it('rejects symbolic and malformed target drafts', () => {
    expect(parseFiniteLimitTargetDraft('x')).toBeNull();
    expect(parseFiniteLimitTargetDraft('0^x')).toBeNull();
    expect(parseFiniteLimitTargetDraft('0++')).toBeNull();
  });

  it('renders directional finite targets for generated limits', () => {
    expect(finiteLimitTargetLatex('0', 'two-sided')).toBe('0');
    expect(finiteLimitTargetLatex('0', 'right')).toBe('0^{+}');
    expect(finiteLimitTargetLatex('0^-', 'two-sided')).toBe('0^{-}');
  });

  it('normalizes free-form directional limit latex before Compute Engine parsing', () => {
    expect(normalizeDirectionalLimitLatex('\\lim_{x\\to 0^+}\\frac{1}{x}')).toEqual({
      latex: '\\lim_{x\\to 0}\\frac{1}{x}',
      directionOverride: 'right',
    });
    expect(normalizeDirectionalLimitLatex('\\lim_{x\\to -2^{-}}\\left(x\\right)')).toEqual({
      latex: '\\lim_{x\\to -2}\\left(x\\right)',
      directionOverride: 'left',
    });
  });
});
