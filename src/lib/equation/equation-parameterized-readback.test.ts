import { describe, expect, it } from 'vitest';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
  normalizeRestrictionLatex,
} from './equation-parameterized-readback';

describe('parameterized equation readback helpers', () => {
  it('preserves solve-target and family section titles', () => {
    const sections = buildParameterizedDetailSections({
      target: 'z',
      parameterNames: ['a', 'b'],
      familyTitle: 'Parameterized Linear Solve',
      familyLines: ['Collected the equation as A*z+B=0 and isolated z.'],
    });

    expect(sections.map((section) => section.title)).toEqual([
      'Solve Target',
      'Parameterized Linear Solve',
    ]);
    expect(sections[0].lines).toEqual([
      'Selected target: z',
      'Symbolic parameters: a, b',
    ]);
  });

  it('keeps no-parameter wording concise', () => {
    const sections = buildParameterizedDetailSections({
      target: 'K',
      parameterNames: [],
      familyTitle: 'Parameterized Trig Solve',
      familyLines: ['Angle unit: RAD. The integer family parameter is n.'],
    });

    expect(sections[0].lines[1]).toBe('No symbolic parameters were preserved.');
  });

  it('normalizes inverse-power restrictions into fraction notation', () => {
    expect(normalizeRestrictionLatex('\\left(15x\\left(x+z\\right)\\right)^{-1}\\ne0')).toBe(
      '\\frac{1}{15x\\left(x+z\\right)}\\ne0',
    );
    expect(normalizeRestrictionLatex('(a+b)^{-1}>0')).toBe('\\frac{1}{a+b}>0');
  });

  it('dedupes and normalizes supplement arrays', () => {
    expect(normalizeParameterizedSupplementLatex([
      'a\\ne0',
      '\\left(a+b\\right)^{-1}\\ne0',
      'a\\ne0',
    ])).toEqual([
      'a\\ne0',
      '\\frac{1}{a+b}\\ne0',
    ]);
  });

  it('normalizes detail lines without renaming sections', () => {
    const sections = normalizeParameterizedDetailSections([{
      title: 'Parameterized Rational Solve',
      lines: ['Preserved \\left(a+b\\right)^{-1}\\ne0 before solving.'],
    }]);

    expect(sections).toEqual([{
      title: 'Parameterized Rational Solve',
      lines: ['Preserved \\frac{1}{a+b}\\ne0 before solving.'],
    }]);
  });
});
