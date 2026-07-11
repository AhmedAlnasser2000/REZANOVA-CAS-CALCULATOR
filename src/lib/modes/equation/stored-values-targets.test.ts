import { describe, expect, it, vi } from 'vitest';
import {
  prepareEquationStoredValueSolveConsent,
  runEquationMode,
  shouldOfferEquationStoredValueConsent,
} from '../equation';
import { makeRequest, collectOutcomeText } from './test-support';

describe('Equation mode stored values and targets', () => {
  it('uses stored non-target values only for Equation numeric solve', () => {
    const symbolic = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z+a=5',
      equationSolveTarget: 'z',
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });

    expect(symbolic.kind).toBe('success');
    if (symbolic.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(symbolic.exactLatex).toBe('z=5-a');
    expect(symbolic.variableSubstitutions).toBeUndefined();
    expect(symbolic.detailSections?.[0]).toMatchObject({
      title: 'Variable Policy',
      lines: [
        'Ignored stored values: a=2. Equation symbolic solve keeps solve targets and symbolic parameters symbolic.',
      ],
    });

    const numeric = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z+a=5',
      equationSolveTarget: 'z',
      equationAnswerMode: 'exact',
      numericInterval: { start: '-10', end: '10', subdivisions: 40 },
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'z', valueLatex: '9', numericValue: 9 },
      ],
    });

    expect(numeric.kind).toBe('success');
    if (numeric.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(numeric.approxText).toContain('z ~= 3');
    expect(numeric.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
    expect(numeric.detailSections?.[0]).toMatchObject({
      title: 'Stored Values',
      lines: [
        'Used stored values: a=2.',
        'Effective equation for z: z+2=5.',
      ],
    });
    expect(numeric.detailSections?.[1]).toMatchObject({
      title: 'Variable Policy',
      lines: ['Kept z symbolic as the solve target.'],
    });
  });

  it('keeps explicit named stored values symbolic in Equation symbolic but uses them in numeric solve', () => {
    const symbolic = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+@mass=7',
      equationSolveTarget: 'x',
      storedVariables: [{ name: 'mass', valueLatex: '5', numericValue: 5 }],
    });

    expect(symbolic.kind).toBe('success');
    if (symbolic.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(symbolic.exactLatex).toContain('x=');
    expect(symbolic.exactLatex).toContain('\\mathrm{mass}');
    expect(symbolic.variableSubstitutions).toBeUndefined();
    expect(symbolic.detailSections?.[0]).toMatchObject({
      title: 'Variable Policy',
      lines: [
        'Ignored stored values: mass=5. Equation symbolic solve keeps solve targets and symbolic parameters symbolic.',
      ],
    });

    const numeric = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+@mass=7',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      numericInterval: { start: '-10', end: '10', subdivisions: 40 },
      storedVariables: [
        { name: 'mass', valueLatex: '5', numericValue: 5 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    });

    expect(numeric.kind).toBe('success');
    if (numeric.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(numeric.approxText).toContain('x ~= 2');
    expect(numeric.variableSubstitutions).toEqual([
      { name: 'mass', valueLatex: '5', numericValue: 5 },
    ]);
  });

  it('solves explicit named variables as selected Equation targets through existing families', () => {
    const linear = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '@mass+2=7',
      equationSolveTarget: 'mass',
    });

    expect(linear.kind).toBe('success');
    if (linear.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(linear.exactLatex).toBe('\\mathrm{mass}=5');

    const parameterized = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+@mass=7',
      equationSolveTarget: 'mass',
    });

    expect(parameterized.kind).toBe('success');
    if (parameterized.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(parameterized.exactLatex).toBe('\\mathrm{mass}=7-x');
    expect(parameterized.detailSections?.[0]).toMatchObject({
      title: 'Solve Target',
      lineKind: 'text',
      lines: [
        'Selected target: mass',
        'Symbolic parameters: x',
      ],
    });

    const quadratic = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '@mass^2-a=0',
      equationSolveTarget: 'mass',
    });

    expect(quadratic.kind).toBe('success');
    if (quadratic.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(quadratic.exactLatex).toContain('\\mathrm{mass}\\in');
  });

  it('solves raw adjacent-letter products as multiplication when a letter target is selected', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'mass=2',
      equationSolveTarget: 's',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('s\\in');
    expect(result.exactLatex).not.toContain('\\mathrm{mass}');
  });

  it('expands raw adjacent-letter coefficients before selected-target solving', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{b^2}{z-\\ln(m)+\\sqrt{x}}+(v)(c^4a^3)=uy\\sqrt{k}',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z=');
    expect(result.exactLatex).toContain('uy');
    expect(result.exactLatex).not.toContain('\\mathtip');
    expect(result.exactLatex).not.toContain('\\blacksquare');
  });

  it('keeps saved-history parenthesized products out of internal error output', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{b^2}{z^2-\\ln(m)+\\sqrt{x}}+(v)(c^4a^3)=uy\\sqrt{k}',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    const output = collectOutcomeText(result);
    expect(output).not.toContain('\\mathtip');
    expect(output).not.toContain('\\blacksquare');
    expect(output).not.toContain('tuple<');
  });

  it.each(['z', 'c', 'b', 'k'])(
    'keeps screenshot-style product equations free of internal error output for target %s',
    (target) => {
      const equationLatex = '\\frac{b^2}{z^2-\\ln(m)+\\sqrt{x}}+(v)(c^4a^3)=uy\\sqrt{k}';

      const result = runEquationMode({
        ...makeRequest(),
        equationScreen: 'symbolic',
        equationLatex,
        equationSolveTarget: target,
      });

      const output = collectOutcomeText(result);

      expect(output, target).not.toContain('\\mathtip');
      expect(output, target).not.toContain('\\blacksquare');
      expect(output, target).not.toContain('\\error');
      expect(output, target).not.toContain('tuple<');
    },
  );

  it('fails closed when a symbolic solver outcome contains internal readback fragments', () => {
    const sharedSolveRunner = vi.fn(() => ({
      kind: 'success' as const,
      title: 'Solve',
      exactLatex: 'x=\\mathtip{\\error{\\blacksquare}}{tuple<bad>}',
      warnings: [],
      resultOrigin: 'symbolic' as const,
    }));
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\cos(x)=x',
      sharedSolveRunner,
    });

    expect(sharedSolveRunner).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected unsafe symbolic output to fail closed');
    }
    expect(result.error).toBe('The exact symbolic readback became unsafe to display.');
    expect(result.exactLatex).toBeUndefined();
  });

  it('protects named solve targets from stored values in Equation symbolic solve', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '@mass+2=7',
      equationSolveTarget: 'mass',
      storedVariables: [{ name: 'mass', valueLatex: '5', numericValue: 5 }],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('\\mathrm{mass}=5');
    expect(result.variableSubstitutions).toBeUndefined();
    expect(result.detailSections?.[0].lines).toEqual([
      'Ignored stored values: mass=5. Equation symbolic solve keeps solve targets and symbolic parameters symbolic.',
    ]);
  });

  it('isolates one selected-target island before delegating to existing solver families', () => {
    const exponential = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{5f+4^p}{g+v}+cx=34',
      equationSolveTarget: 'p',
    });

    expect(exponential.kind).toBe('success');
    if (exponential.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(exponential.exactLatex).toContain('p=');
    expect(exponential.exactLatex).toContain('\\ln(4)');
    expect(exponential.exactSupplementLatex).toContain('g+v\\ne0');
    expect(exponential.detailSections?.some((section) => section.title === 'Target Isolation')).toBe(true);

    const radical = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{z+a}+bx=c',
      equationSolveTarget: 'z',
    });

    expect(radical.kind).toBe('success');
    if (radical.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(radical.exactLatex).toContain('z=');
  });

  it('isolates explicit named targets before delegation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{5f+4^{@mass}}{g+v}+cx=34',
      equationSolveTarget: 'mass',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\mathrm{mass}=');
    expect(result.exactLatex).toContain('\\ln(4)');
  });

  it('reports isolation boundaries for multiple target islands and target shell factors', () => {
    const multiple = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z+e^z=a',
      equationSolveTarget: 'z',
    });

    expect(multiple.kind).toBe('error');
    if (multiple.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(multiple.error).toBe('This equation has more than one selected-target island.');

    const factor = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z\\sin(z)=a',
      equationSolveTarget: 'z',
    });

    expect(factor.kind).toBe('error');
    if (factor.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(factor.error).toBe('The selected target appears in multiple multiplied factors.');
  });

  it('rejects non-equation symbolic input', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2+2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('Enter an equation containing x.');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'planner-hard-stop',
      source: 'planner',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'invalid-request',
    });
  });

  it('rejects equations without a supported target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2+2=4',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('Enter an equation containing a supported variable.');
  });

  it('solves safe single-variable non-x equations by retargeting the x backend', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z+1=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=2');
    expect(result.approxText).toContain('z ~=');
  });

  it('preserves case-sensitive non-x solve targets', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'K^2=4',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('K\\in');
    expect(result.exactLatex).not.toContain('x=');
  });

  it('prepares explicit stored-value solve consent without substituting the solve target', () => {
    const result = prepareEquationStoredValueSolveConsent({
      equationLatex: 'z+a=5',
      equationSolveTarget: 'z',
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'z', valueLatex: '9', numericValue: 9 },
      ],
    });

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') {
      throw new Error('Expected a stored-value consent ready result');
    }
    expect(result.protectedTarget).toBe('z');
    expect(result.effectiveLatex).toBe('z+2=5');
    expect(result.variableSubstitutionSnapshot).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);

    const solveResult = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z+a=5',
      equationSolveTarget: 'z',
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'z', valueLatex: '9', numericValue: 9 },
      ],
      variableSubstitutionSnapshot: result.variableSubstitutionSnapshot,
      useStoredValueSubstitution: true,
    });

    expect(solveResult.kind).toBe('success');
    if (solveResult.kind !== 'success') {
      throw new Error('Expected a substituted symbolic solve success outcome');
    }
    expect(solveResult.exactLatex).toBe('z=3');
    expect(solveResult.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
    expect(solveResult.detailSections?.[0]).toMatchObject({
      title: 'Stored Values',
      lines: [
        'Used stored values: a=2.',
        'Effective equation for z: z+2=5.',
      ],
    });
    expect(solveResult.detailSections?.[1]).toMatchObject({
      title: 'Variable Policy',
      lines: ['Kept z symbolic as the solve target.'],
    });
  });

  it('reports missing non-target values and handles named-variable consent status', () => {
    const missing = prepareEquationStoredValueSolveConsent({
      equationLatex: 'z+a+b=5',
      equationSolveTarget: 'z',
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });
    const named = prepareEquationStoredValueSolveConsent({
      equationLatex: 'x+@mass=7',
      equationSolveTarget: 'x',
      storedVariables: [{ name: 'mass', valueLatex: '5', numericValue: 5 }],
    });

    expect(missing.kind).toBe('error');
    expect(named.kind).toBe('ready');
    if (missing.kind !== 'error') {
      throw new Error('Expected missing-value consent error');
    }
    if (named.kind !== 'ready') {
      throw new Error('Expected named-variable consent ready result');
    }
    expect(missing.outcome.title).toBe('Use Stored Values');
    expect(missing.outcome.error).toContain('b');
    expect(JSON.stringify(missing.outcome.detailSections)).toContain('Parameters needing stored values: a, b.');
    expect(named.effectiveLatex).toBe('x+5=7');
    expect(named.variableSubstitutionSnapshot).toEqual([
      { name: 'mass', valueLatex: '5', numericValue: 5 },
    ]);
  });

  it('offers stored-value consent only when non-target parameter variables exist', () => {
    expect(shouldOfferEquationStoredValueConsent({
      equationLatex: 'z+a=5',
      equationSolveTarget: 'z',
    })).toBe(true);
    expect(shouldOfferEquationStoredValueConsent({
      equationLatex: '\\sqrt{x+c}-t=v^2',
      equationSolveTarget: 'x',
    })).toBe(true);
    expect(shouldOfferEquationStoredValueConsent({
      equationLatex: 'z=5',
      equationSolveTarget: 'z',
    })).toBe(false);
    expect(shouldOfferEquationStoredValueConsent({
      equationLatex: 'x^2+x+1=0',
      equationSolveTarget: 'x',
    })).toBe(false);
    expect(shouldOfferEquationStoredValueConsent({
      equationLatex: '\\sin(x)+\\pi=0',
      equationSolveTarget: 'x',
    })).toBe(false);
    expect(shouldOfferEquationStoredValueConsent({
      equationLatex: '\\sin(x)+c=0',
      equationSolveTarget: 'x',
    })).toBe(true);
  });
});
