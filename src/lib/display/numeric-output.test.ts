import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampApproxDigits,
  formatApproxLiteral,
  formatApproxNumber,
  setNumericOutputSettings,
} from './numeric-output';

describe('numeric output formatting', () => {
  beforeEach(() => {
    setNumericOutputSettings({
      approxDigits: 6,
      numericNotationMode: 'decimal',
      scientificNotationStyle: 'times10',
    });
  });

  it('clamps approximate digits into the supported range', () => {
    expect(clampApproxDigits(-5)).toBe(0);
    expect(clampApproxDigits(26)).toBe(20);
  });

  it('formats decimal output with the configured digits', () => {
    setNumericOutputSettings({
      approxDigits: 3,
      numericNotationMode: 'decimal',
      scientificNotationStyle: 'times10',
    });

    expect(formatApproxNumber(Math.PI)).toBe('3.142');
  });

  it('formats scientific output in times-10 style', () => {
    setNumericOutputSettings({
      approxDigits: 2,
      numericNotationMode: 'scientific',
      scientificNotationStyle: 'times10',
    });

    expect(formatApproxNumber(1234567)).toBe('1.23 × 10^6');
  });

  it('formats scientific output in e notation when requested', () => {
    setNumericOutputSettings({
      approxDigits: 2,
      numericNotationMode: 'scientific',
      scientificNotationStyle: 'e',
    });

    expect(formatApproxNumber(0.00001234)).toBe('1.23e-5');
  });

  it('switches automatically at the configured thresholds', () => {
    setNumericOutputSettings({
      approxDigits: 2,
      numericNotationMode: 'auto',
      scientificNotationStyle: 'times10',
    });

    expect(formatApproxNumber(999999)).toBe('999999');
    expect(formatApproxNumber(1000000)).toBe('1 × 10^6');
    expect(formatApproxNumber(0.0001)).toBe('0.0001');
    expect(formatApproxNumber(0.00001)).toBe('1 × 10^-5');
  });

  it('formats plain numeric literals extracted from latex', () => {
    setNumericOutputSettings({
      approxDigits: 4,
      numericNotationMode: 'scientific',
      scientificNotationStyle: 'e',
    });

    expect(formatApproxLiteral('12345')).toBe('1.2345e4');
    expect(formatApproxLiteral('x+1')).toBe('x+1');
  });
});
