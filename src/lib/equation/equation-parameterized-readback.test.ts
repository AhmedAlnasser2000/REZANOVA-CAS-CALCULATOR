import { describe, expect, it } from 'vitest';
import {
  buildParameterizedBoundaryReadback,
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

  it('maps selected-target boundary stops to user-facing text', () => {
    const domain = buildParameterizedBoundaryReadback({
      reason: 'domain-empty',
      message: 'No real selected-target solution remains because the trigonometric range check fails.',
      target: 'z',
      detectedVariables: ['x', 'z'],
    });

    expect(domain.error).toBe('No real solution remains for the selected target.');
    expect(domain.detailSections.map((section) => section.title)).toEqual([
      'Solve Target',
      'Why It Stopped',
      'What To Try',
    ]);
    expect(domain.detailSections.flatMap((section) => section.lines).join(' ')).toContain('Sine and cosine outputs');
  });

  it('removes milestone and helper names from boundary readback', () => {
    const branch = buildParameterizedBoundaryReadback({
      reason: 'unsupported-branch',
      message: 'Explicit PARAM9 factors must delegate to existing linear or quadratic selected-target solvers.',
      target: 'z',
      detectedVariables: ['a', 'z'],
    });
    const text = `${branch.error} ${branch.detailSections.flatMap((section) => section.lines).join(' ')}`;

    expect(text).not.toMatch(/PARAM\d|EQUATION-PARAM|milestone/i);
    expect(branch.detailSections.some((section) => section.title === 'What To Try')).toBe(true);
  });

  it('adds actionable wording for ambiguous adjacent symbols', () => {
    const ambiguous = buildParameterizedBoundaryReadback({
      reason: 'ambiguous-adjacent-product',
      message: 'ambiguous-adjacent-product',
      target: 'z',
      detectedVariables: ['a', 'z'],
    });

    expect(ambiguous.error).toBe('The selected target is ambiguous in this equation.');
    expect(ambiguous.detailSections.flatMap((section) => section.lines).join(' ')).toContain('Use explicit multiplication');
  });

  it('explains cube-root selected-target isolation gaps with target-choice guidance', () => {
    const readback = buildParameterizedBoundaryReadback({
      reason: 'degree-limit',
      message: 'This selected-target expression is outside the supported exact family.',
      target: 'x',
      detectedVariables: ['x', 'z'],
      equationLatex: '34x^3-z^2=25',
    });

    const text = `${readback.error} ${readback.detailSections.flatMap((section) => section.lines).join(' ')}`;
    expect(readback.error).toBe('Solving for x needs unsupported cube-root isolation.');
    expect(text).toContain('try solving for z');
    expect(text).toContain('numeric solve for x');
    expect(text).not.toMatch(/PARAM\d|EQUATION-PARAM|milestone/i);
  });
});
