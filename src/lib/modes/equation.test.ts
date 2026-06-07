import { describe, expect, it } from 'vitest';
import {
  buildEquationOoeInputRevisionId,
  buildEquationOoeSnapshot,
  runEquationAlgebraTransform,
  runEquationMode,
  runEquationModeWithOoePilot,
} from './equation';

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

function makeRequest() {
  return {
    equationLatex: 'x^2-5x+6=0',
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, -5, 0, 4],
    polynomialSystem2Latex: ['x+y=3', 'x-y=1'] as const,
    system2,
    system3,
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };
}

describe('runEquationMode', () => {
  it('builds stable OOE revisions for equivalent Equation requests and changes on meaningful input', () => {
    const first = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: 'x+1=2',
      equationSolveTarget: 'x',
      numericInterval: { start: '-1', end: '3', subdivisions: 32 },
      storedVariables: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
    };
    const second = {
      ...makeRequest(),
      storedVariables: [{ numericValue: 4, valueLatex: '4', name: 'a' }],
      numericInterval: { subdivisions: 32, end: '3', start: '-1' },
      equationSolveTarget: 'x',
      equationLatex: 'x+1=2',
      equationScreen: 'symbolic' as const,
    };
    const changed = {
      ...first,
      numericInterval: { start: '-1', end: '4', subdivisions: 32 },
    };
    const changedAnswerMode = {
      ...first,
      equationAnswerMode: 'isolate' as const,
    };
    const changedDomainIntent = {
      ...first,
      equationDomainIntent: 'complex' as const,
    };

    expect(buildEquationOoeSnapshot(first)).toEqual({
      route: 'numeric-interval',
      request: first,
    });
    expect(buildEquationOoeInputRevisionId(first)).toBe(buildEquationOoeInputRevisionId(second));
    expect(buildEquationOoeInputRevisionId({
      ...first,
      equationLatex: '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)',
    })).toBe(buildEquationOoeInputRevisionId({
      ...first,
      equationLatex: '\\ln(x+1)=\\ln(2x-3)',
    }));
    expect(buildEquationOoeInputRevisionId(first)).not.toBe(buildEquationOoeInputRevisionId(changed));
    expect(buildEquationOoeInputRevisionId(first)).not.toBe(buildEquationOoeInputRevisionId(changedAnswerMode));
    expect(buildEquationOoeInputRevisionId(first)).not.toBe(buildEquationOoeInputRevisionId(changedDomainIntent));
    expect(buildEquationOoeInputRevisionId(first)).toMatch(/^input\.equation\.solve\.[a-z0-9]+$/u);
  });

  it('solves symbolic equations in x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '5x+6=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('\\frac');
    expect(result.approxText).toContain('x ~=');
  });

  it('keeps Equation complex intent behavior-neutral until complex solving is enabled', () => {
    const real = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationDomainIntent: 'real',
    });
    const complex = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationDomainIntent: 'complex',
    });

    expect(complex).toEqual(real);
  });

  it('keeps Complex Off real-first for symbolic complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Complex Off to keep the real-first stop');
    }
    expect(result.answerDomain).toBeUndefined();
    expect(result.error).toContain('outside the supported exact symbolic solve families');
  });

  it('treats explicit imaginary input as Complex-only Equation intent', () => {
    const complexOff = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+\\imaginaryI=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(complexOff.kind).toBe('error');
    if (complexOff.kind !== 'error') {
      throw new Error('Expected Complex Off guidance');
    }
    expect(complexOff.error).toContain('Enable Complex');
    expect(complexOff.detailSections?.some((section) => section.title === 'Complex Input')).toBe(true);
  });

  it('solves bounded symbolic quadratics over the complex domain when Complex is enabled', () => {
    const pureImaginary = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+1=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });
    const shifted = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(pureImaginary.kind).toBe('success');
    expect(shifted.kind).toBe('success');
    if (pureImaginary.kind !== 'success' || shifted.kind !== 'success') {
      throw new Error('Expected complex quadratic successes');
    }
    expect(pureImaginary.answerDomain).toBe('complex');
    expect(pureImaginary.exactLatex).toContain('-i');
    expect(pureImaginary.exactLatex).toContain('i');
    expect(shifted.answerDomain).toBe('complex');
    expect(shifted.exactLatex).toContain('-1-i');
    expect(shifted.exactLatex).toContain('-1+i');
    expect(shifted.detailSections?.some((section) => section.title === 'Complex Domain')).toBe(true);
  });

  it('solves simple selected-target powers with bounded complex branches when Complex is enabled', () => {
    const square = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^2=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });
    const cube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^3=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });

    expect(square.kind).toBe('success');
    expect(cube.kind).toBe('success');
    if (square.kind !== 'success' || cube.kind !== 'success') {
      throw new Error('Expected complex power successes');
    }
    expect(square.answerDomain).toBe('complex');
    expect(square.exactLatex).toContain('-\\sqrt{a}');
    expect(square.exactLatex).toContain('\\sqrt{a}');
    expect(square.exactSupplementLatex ?? []).not.toContain('a\\ge0');
    expect(cube.answerDomain).toBe('complex');
    expect(cube.exactLatex).toContain('\\sqrt[3]{a}');
    expect(cube.exactLatex).toContain('\\sqrt{3}');
    expect(cube.exactLatex).toContain('i');

    const concreteCube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3+8=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });
    expect(concreteCube.kind).toBe('success');
    if (concreteCube.kind !== 'success') {
      throw new Error('Expected concrete complex cube success');
    }
    expect(concreteCube.exactLatex).toContain('-2');
    expect(concreteCube.exactLatex).toContain('1-\\sqrt{3}i');
    expect(concreteCube.exactLatex).toContain('1+\\sqrt{3}i');
    expect(concreteCube.exactLatex).not.toContain('\\right)\\left(');
  });

  it('uses Approx answer mode as an explicit numeric-interval lane', () => {
    const missingInterval = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=0',
      equationSolveTarget: 'x',
      equationAnswerMode: 'approximate',
    });

    expect(missingInterval.kind).toBe('error');
    if (missingInterval.kind !== 'error') {
      throw new Error('Expected approximate mode guidance');
    }
    expect(missingInterval.answerMode).toBe('approximate');
    expect(missingInterval.error).toContain('numeric interval');

    const numeric = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=0',
      equationSolveTarget: 'x',
      equationAnswerMode: 'approximate',
      numericInterval: { start: '-2', end: '2', subdivisions: 64 },
    });

    expect(numeric.kind).toBe('success');
    if (numeric.kind !== 'success') {
      throw new Error('Expected approximate numeric success');
    }
    expect(numeric.answerMode).toBe('approximate');
    expect(numeric.solveBadges).toContain('Numeric Interval');
    expect(numeric.approxText ?? numeric.exactLatex ?? '').toContain('x');
  });

  it('keeps Approx answer mode numeric-only after stored-value substitution', () => {
    const symbolicParameters = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'b^{45}=nvm^3',
      equationSolveTarget: 'm',
      equationAnswerMode: 'approximate',
      numericInterval: { start: '0', end: '10', subdivisions: 64 },
    });
    const substitutedNumeric = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a+x=5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'approximate',
      numericInterval: { start: '0', end: '5', subdivisions: 64 },
      storedVariables: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
    });
    const protectedTarget = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a+x=5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'approximate',
      numericInterval: { start: '0', end: '5', subdivisions: 64 },
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'x', valueLatex: '100', numericValue: 100 },
      ],
    });

    expect(symbolicParameters.kind).toBe('error');
    if (symbolicParameters.kind !== 'error') {
      throw new Error('Expected Approx to stop on symbolic parameters');
    }
    expect(symbolicParameters.answerMode).toBe('approximate');
    expect(symbolicParameters.error).toContain('Remaining symbolic parameters: b, n, v');
    expect(symbolicParameters.error).not.toContain('parameters: b, m');

    expect(substitutedNumeric.kind).toBe('success');
    expect(protectedTarget.kind).toBe('success');
    if (substitutedNumeric.kind !== 'success' || protectedTarget.kind !== 'success') {
      throw new Error('Expected Approx numeric successes');
    }
    expect(substitutedNumeric.approxText).toContain('x ~= 3');
    expect(protectedTarget.approxText).toContain('x ~= 3');
    expect(protectedTarget.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Kept x symbolic as the solve target');
  });

  it('uses Isolate answer mode for compact selected-target rearrangement', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'b^2+c^4v^3=uy\\sqrt{k}',
      equationSolveTarget: 'v',
      equationAnswerMode: 'isolate',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected isolate success');
    }
    expect(result.answerMode).toBe('isolate');
    expect(result.exactLatex).toContain('v=\\sqrt[3]');
    expect(result.exactSupplementLatex?.join(' ')).toContain('c^4\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Target Isolation')).toBe(true);
    expect(result.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(false);
  });

  it('uses Isolate answer mode as textbook formula rearrangement for selected-target powers', () => {
    const square = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^2=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'isolate',
    });
    const cube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^3=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'isolate',
    });
    const screenshot = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{b}{\\sqrt{a+c+v+x}}=u^2',
      equationSolveTarget: 'u',
      equationAnswerMode: 'isolate',
    });
    const denominatorTarget = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{b}{\\sqrt{a+c+v+x}}=u^2',
      equationSolveTarget: 'x',
      equationAnswerMode: 'isolate',
    });

    expect(square.kind).toBe('success');
    expect(cube.kind).toBe('success');
    expect(screenshot.kind).toBe('success');
    expect(denominatorTarget.kind).toBe('error');

    if (square.kind !== 'success' || cube.kind !== 'success' || screenshot.kind !== 'success') {
      throw new Error('Expected isolate power formulas');
    }
    if (denominatorTarget.kind !== 'error') {
      throw new Error('Expected target-containing denominator to remain deferred');
    }

    expect(square.exactLatex).toBe('u=\\pm \\sqrt{a}');
    expect(square.exactSupplementLatex?.join(' ')).toContain('a\\ge0');
    expect(square.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Formula branches: u=-\\sqrt{a}, u=\\sqrt{a}');
    expect(cube.exactLatex).toBe('u=\\sqrt[3]{a}');
    expect(screenshot.exactLatex).toContain('u=\\pm');
    expect(screenshot.exactLatex).toContain('\\sqrt{\\frac{b}{\\sqrt{a+c+v+x}}}');
    expect(denominatorTarget.error).toContain('denominator');
  });

  it('prefers real algebraic power isolation before exp/log in Exact mode', () => {
    const cube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^3=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'exact',
    });
    const quartic = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^4=a',
      equationSolveTarget: 'u',
      equationAnswerMode: 'exact',
    });

    expect(cube.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    if (cube.kind !== 'success' || quartic.kind !== 'success') {
      throw new Error('Expected exact power successes');
    }

    expect(cube.exactLatex).toBe('u=\\sqrt[3]{a}');
    expect(cube.exactSupplementLatex ?? []).not.toContain('a>0');
    expect(cube.exactSupplementLatex ?? []).not.toContain('u>0');
    expect(cube.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(quartic.exactLatex).toContain('u\\in');
    expect(quartic.exactLatex).toContain('-\\sqrt[4]{a}');
    expect(quartic.exactLatex).toContain('\\sqrt[4]{a}');
    expect(quartic.exactSupplementLatex).toContain('a\\ge0');
    expect(quartic.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
  });

  it('keeps the OOE pilot wrapper fail-open and outcome-stable', async () => {
    const request = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: 'x^2-5x+6=0',
    };
    const direct = runEquationMode(request);
    const wrapped = await runEquationModeWithOoePilot(request);

    expect(wrapped.payload).toEqual(direct);
    expect(wrapped.ooe.status.kind).toBe('unavailable');
    expect(wrapped.ooe.guardedTrace?.attempts.length).toBeGreaterThan(0);
  });

  it('records stale Equation commit assessments as metadata without changing payloads', async () => {
    const request = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: 'x^2-5x+6=0',
    };
    const direct = runEquationMode(request);
    const wrapped = await runEquationModeWithOoePilot(request, {
      activeInputRevisionId: 'input.equation.solve.stale',
    });

    expect(wrapped.payload).toEqual(direct);
    expect(wrapped.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId: 'input.equation.solve.stale',
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });
  });

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
    expect(symbolic.detailSections?.[0]).toEqual({
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
      equationAnswerMode: 'approximate',
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
    expect(numeric.detailSections?.[0]).toEqual({
      title: 'Stored Values',
      lines: [
        'Used stored values: a=2.',
        'Effective equation for z: z+2=5.',
      ],
    });
    expect(numeric.detailSections?.[1]).toEqual({
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
    expect(symbolic.detailSections?.[0]).toEqual({
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
      equationAnswerMode: 'approximate',
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
    expect(parameterized.detailSections?.[0]).toEqual({
      title: 'Solve Target',
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
    const output = [
      result.exactLatex,
      ...(result.exactSupplementLatex ?? []),
      ...(result.detailSections?.flatMap((section) => section.lines) ?? []),
    ].join(' ');
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

      const output = [
        result.kind,
        result.kind === 'success' || result.kind === 'error' ? result.exactLatex : undefined,
        result.kind === 'error' ? result.error : undefined,
        ...(result.kind === 'success' || result.kind === 'error' ? result.exactSupplementLatex ?? [] : []),
        ...(result.kind === 'success' || result.kind === 'error'
          ? result.detailSections?.flatMap((section) => section.lines) ?? []
          : []),
      ].join(' ');

      expect(output, target).not.toContain('\\mathtip');
      expect(output, target).not.toContain('\\blacksquare');
      expect(output, target).not.toContain('\\error');
      expect(output, target).not.toContain('tuple<');
    },
  );

  it('fails closed when a symbolic solver outcome contains internal readback fragments', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x=1',
      sharedSolveRunner: () => ({
        kind: 'success',
        title: 'Solve',
        exactLatex: 'x=\\mathtip{\\error{\\blacksquare}}{tuple<bad>}',
        warnings: [],
        resultOrigin: 'symbolic',
      }),
    });

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
    expect(exponential.exactLatex).toContain('\\log_{4}');
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
    expect(result.exactLatex).toContain('\\log_{4}');
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

  it('solves affine multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+z=5',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=5-x');
    expect(result.approxText).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.detailSections?.[0]?.title).toBe('Solve Target');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Selected target: z');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Symbolic parameters: x');
  });

  it('adds nonzero parameter facts for symbolic linear coefficients', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a z+b=c',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\frac{c-b}{a}');
    expect(result.exactSupplementLatex).toEqual(['a\\ne0']);
  });

  it('solves quadratic multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z^2+x z+1=0',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('x^2-4');
    expect(result.exactSupplementLatex).toEqual(['x^2-4\\ge0']);
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Selected target: z');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Symbolic parameters: x');
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves rational multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{z-a}=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\frac{ab+1}{b}');
    expect(result.exactSupplementLatex).toEqual(['z-a\\ne0', 'b\\ne0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Rational Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves nested rational multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{1+\\frac{1}{z-a}}=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\frac{-(ab)+a+b}{1-b}');
    expect(result.exactSupplementLatex).toContain('z-a\\ne0');
    expect(result.exactSupplementLatex).toContain('-a+z+1\\ne0');
    expect(result.exactSupplementLatex).toContain('1-b\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Rational Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves factorable polynomial multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(z-a)(z-b)(z-c)=0',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z\\in\\left\\{a,\\ b,\\ c\\right\\}');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Factorable Polynomial Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves nonperiodic carrier equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|z-a\\right|=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a+b');
    expect(result.exactLatex).toContain('a-b');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Carrier Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves exp-log multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\ln\\left(z+a\\right)=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=e^{b}-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Exp/Log Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves symbolic-base exp-log equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a^z=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\log_{a}(b)');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'b>0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Exp/Log Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves direct affine trig multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(z\\right)=a',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin(a)');
    expect(result.exactLatex).toContain('2\\pi n');
    expect(result.exactSupplementLatex).toEqual(['-1\\le a\\le1', 'n\\in\\mathbb{Z}']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Trig Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves mixed sine/cosine identities for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'A\\sin\\left(z\\right)+B\\cos\\left(z\\right)=C',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\operatorname{atan2}\\left(B,A\\right)');
    expect(result.exactSupplementLatex).toContain('A^2+B^2>0');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Mixed Trig Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves one-layer composition handoffs for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(z^2+a\\right)=b',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin(b)');
    expect(result.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves two-layer periodic/composition carrier families after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\left|z-a\\right|\\right)=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin(b)');
    expect(result.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
  });

  it('solves nested algebraic composition when it reduces to power isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{\\sqrt{x^3+a}}=b',
      equationSolveTarget: 'x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=\\sqrt[3]');
    expect(result.exactLatex).toContain('b^4-a');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
  });

  it('solves algebraic mixed-carrier equations for the selected target', () => {
    const rootCompanion = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{z+a}+z=b',
      equationSolveTarget: 'z',
    });
    const twoCarriers = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{z+a}+\\sqrt{z+b}=c',
      equationSolveTarget: 'z',
    });

    expect(rootCompanion.kind).toBe('success');
    expect(twoCarriers.kind).toBe('success');
    if (rootCompanion.kind !== 'success' || twoCarriers.kind !== 'success') {
      throw new Error('Expected success outcomes');
    }
    expect(rootCompanion.exactLatex).toContain('z\\in');
    expect(rootCompanion.exactSupplementLatex).toContain('b-z\\ge0');
    expect(rootCompanion.detailSections?.some((section) =>
      section.title === 'Parameterized Mixed Algebraic Solve')).toBe(true);
    expect(twoCarriers.exactLatex).toContain('z=');
    expect(twoCarriers.exactSupplementLatex?.join(' ')).toContain('c-\\sqrt{b+z}\\ge0');
    expect(twoCarriers.detailSections?.some((section) =>
      section.title === 'Parameterized Mixed Algebraic Solve')).toBe(true);
  });

  it('keeps depth-three composition carrier families controlled after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\sqrt{\\left|z-a\\right|}\\right)=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation needs a deeper composition pass.');
    expect(result.detailSections?.some((section) => section.title === 'Why It Stopped')).toBe(true);
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('more composition layers')))).toBe(true);
    expect(`${result.error} ${result.detailSections?.flatMap((section) => section.lines).join(' ')}`).not.toMatch(/(?:EQUATION-)?PARAM\d|milestone/i);
  });

  it('solves selected-target cubic power families after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z^3+a=0',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z=\\sqrt[3]{-a}');
    expect(result.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({ kind: 'manual-only' });
  });

  it('solves selected-target cube-root isolation after shell isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '34x^3-z^2=25',
      equationSolveTarget: 'x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=\\sqrt[3]');
    expect(result.exactLatex).toContain('z^2');
    expect(result.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('reports real range failures without milestone wording after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\cos\\left(z^2+x\\right)\\right)=5',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    const text = `${result.error} ${result.detailSections?.flatMap((section) => section.lines).join(' ')}`;
    expect(result.error).toBe('No real solution remains for the selected target.');
    expect(text).toContain('Sine and cosine outputs must stay between -1 and 1');
    expect(text).not.toMatch(/(?:EQUATION-)?PARAM\d|milestone/i);
  });

  it('explains mixed carriers and multiple target islands while solving raw adjacent products as multiplication', () => {
    const mixed = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin(z)+\\sqrt{z}=a',
      equationSolveTarget: 'z',
    });
    const outside = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z+\\sin\\left(z^2\\right)=a',
      equationSolveTarget: 'z',
    });
    const ambiguous = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'az=1',
      equationSolveTarget: 'z',
    });

    expect(mixed.kind).toBe('error');
    expect(outside.kind).toBe('error');
    expect(ambiguous.kind).toBe('success');
    if (mixed.kind !== 'error' || outside.kind !== 'error' || ambiguous.kind !== 'success') {
      throw new Error('Expected mixed/outside errors and adjacent-product success');
    }
    expect(mixed.error).toBe('This equation mixes independent selected-target carriers.');
    expect(outside.error).toBe('This equation has more than one selected-target island.');
    expect(ambiguous.exactLatex).toBe('z=\\frac{1}{a}');
    const text = [
      mixed.error,
      outside.error,
      ...(mixed.detailSections ?? []).flatMap((section) => section.lines),
      ...(outside.detailSections ?? []).flatMap((section) => section.lines),
    ].join(' ');
    expect(text).not.toMatch(/(?:EQUATION-)?PARAM\d|milestone/i);
  });

  it('rejects reserved-only equations without inventing a solve target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\pi\\right)=e',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('reserved');
  });

  it('keeps symbolic mode symbolic-only for complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation is outside the supported exact symbolic solve families.');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'stage',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('solves bounded one-variable linear inequalities in Exact mode', () => {
    const less = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x<2',
      equationAnswerMode: 'exact',
    });
    const lessEqual = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\le2',
      equationAnswerMode: 'exact',
    });
    const greater = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x>2',
      equationAnswerMode: 'exact',
    });
    const greaterEqual = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\ge2',
      equationAnswerMode: 'exact',
    });

    for (const result of [less, lessEqual, greater, greaterEqual]) {
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') {
        throw new Error('Expected inequality success');
      }
      expect(result.answerDomain).toBe('conditional-real');
      expect(result.solutionKind).toBe('inequality-solution-set');
      expect(result.answerMode).toBe('exact');
      expect(result.exactSupplementLatex?.join(' ')).toContain('Ordered inequalities are solved over the real line.');
    }

    expect(less.kind === 'success' ? less.exactLatex : '').toBe('x<2');
    expect(lessEqual.kind === 'success' ? lessEqual.exactLatex : '').toBe('x\\le2');
    expect(greater.kind === 'success' ? greater.exactLatex : '').toBe('x>2');
    expect(greaterEqual.kind === 'success' ? greaterEqual.exactLatex : '').toBe('x\\ge2');
  });

  it('solves affine linear inequalities and flips direction for negative coefficients', () => {
    const positive = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'exact',
    });
    const negative = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '-2x+3<7',
      equationAnswerMode: 'exact',
    });

    expect(positive.kind).toBe('success');
    expect(negative.kind).toBe('success');
    if (positive.kind !== 'success' || negative.kind !== 'success') {
      throw new Error('Expected affine inequality successes');
    }

    expect(positive.exactLatex).toBe('x\\le2');
    expect(negative.exactLatex).toBe('x>-2');
  });

  it('returns all-real and empty-set results for constant linear inequality reductions', () => {
    const allReal = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3<2x+5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const empty = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3>2x+5',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });

    expect(allReal.kind).toBe('success');
    expect(empty.kind).toBe('success');
    if (allReal.kind !== 'success' || empty.kind !== 'success') {
      throw new Error('Expected constant inequality reductions');
    }

    expect(allReal.exactLatex).toBe('x\\in\\mathbb{R}');
    expect(empty.exactLatex).toBe('x\\in\\varnothing');
  });

  it('solves bounded rational inequalities while keeping unsupported families controlled', () => {
    const rational = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x}<1',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const symbolicParameter = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a x+b<3',
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
    });
    const notEqual = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x\\ne2',
      equationAnswerMode: 'exact',
    });

    expect(rational.kind).toBe('success');
    if (rational.kind !== 'success') {
      throw new Error('Expected rational inequality support');
    }
    expect(rational.exactLatex).toBe('x<0\\;\\cup\\;x>1');
    expect(rational.exactSupplementLatex).toContain('x\\ne0');

    for (const result of [symbolicParameter]) {
      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error('Expected unsupported inequality guidance');
      }
      expect(result.error).toContain('outside the supported guarded real inequality families');
      expect(result.detailSections?.flatMap((section) => section.lines).join(' ')).toContain(
        'finite composition through 4 layers, direct affine trig, and representable two-layer trig cases',
      );
    }

    expect(notEqual.kind).toBe('error');
    if (notEqual.kind !== 'error') {
      throw new Error('Expected not-equal to remain unsupported');
    }
    expect(notEqual.error).toContain('only = equations');
    expect(notEqual.runtimeAdvisories?.stopReason).toEqual({
      kind: 'invalid-request',
      source: 'host',
    });
    expect(notEqual.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'invalid-request',
    });
  });

  it('shows mode-specific guidance for inequality inputs outside Exact mode', () => {
    const approximate = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'approximate',
    });
    const isolate = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'isolate',
    });

    expect(approximate.kind).toBe('error');
    expect(isolate.kind).toBe('error');
    if (approximate.kind !== 'error' || isolate.kind !== 'error') {
      throw new Error('Expected answer-mode inequality guidance');
    }

    expect(approximate.error).toContain('Approximate answer mode does not solve inequalities');
    expect(isolate.error).toContain('Isolate answer mode does not solve inequalities');
    expect(approximate.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Use Exact mode');
    expect(isolate.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Use Exact mode');
  });

  it('keeps Complex On inequality answers on the real order line', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex On inequality success');
    }

    expect(result.exactLatex).toBe('x\\le2');
    expect(result.answerDomain).toBe('conditional-real');
    expect(result.solutionKind).toBe('inequality-solution-set');
    expect(result.exactSupplementLatex?.join(' ')).toContain(
      'Complex intent is enabled; ordered inequalities are solved over the real line.',
    );
  });

  it('attaches a shared range-guard stop reason when the guarded backend proves impossibility', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(x\\right)=2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'range-guard',
      source: 'stage',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'range-guard',
    });
  });

  it('marks successful symbolic equation solves as manual-only for numeric follow-up', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '5x+6=3',
    });

    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'manual-only',
    });
  });

  it('marks recognized abs families outside the bounded exact set as numeric-follow-up eligible', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x+1\\right|=e^x',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('absolute-value family is outside the current exact bounded solve set');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'host',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('keeps wrapped recognized abs families numeric-follow-up eligible when a branch falls outside the bounded exact sinks', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x^2+1\\right|+1=e^x',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('stronger absolute-value carrier family is outside the current exact bounded solve set');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'host',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('solves stronger polynomial, radical, and rational-power abs carriers through the shared symbolic backend', () => {
    const polynomial = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x^2+x-2\\right|=3',
    });
    const radical = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|\\sqrt{x+1}-2\\right|=1',
    });
    const rationalPower = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x^{\\frac{1}{3}}-1\\right|=2',
    });

    expect(polynomial.kind).toBe('success');
    if (polynomial.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(polynomial.exactLatex).toMatch(/(\\sqrt\{21\}|21\^\{1\/2\})/);

    expect(radical.kind).toBe('success');
    if (radical.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(radical.exactLatex).toContain('8');
    expect(radical.exactLatex).toContain('0');

    expect(rationalPower.kind).toBe('success');
    if (rationalPower.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(rationalPower.exactLatex).toContain('27');
    expect(rationalPower.exactLatex).toContain('-1');
  });

  it('solves outer-polynomial abs families through the shared symbolic backend', () => {
    const polynomial = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|x-1\\right|^2-5\\left|x-1\\right|+6=0',
    });
    const composition = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|\\sin\\left(x^2+x\\right)\\right|^2=\\frac{1}{4}',
    });

    expect(polynomial.kind).toBe('success');
    if (polynomial.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(polynomial.exactLatex).toContain('-2');
    expect(polynomial.exactLatex).toContain('4');

    expect(composition.kind).toBe('success');
    if (composition.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(composition.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(0);
  });

  it('returns exact reduced-carrier results for outer-polynomial composition-backed abs families when every generated branch stays exact', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '6\\left|\\sin\\left(x^3+x\\right)\\right|^2-5\\left|\\sin\\left(x^3+x\\right)\\right|+1=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex ?? '').toContain('x^3+x');
    expect(result.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(1);
  });

  it('solves deeper outer non-periodic abs families through the shared symbolic backend', () => {
    const logarithmic = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\ln\\left(\\left|x\\right|+1\\right)=2',
    });
    const stacked = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\ln\\left(\\sqrt{\\left|x-1\\right|+1}\\right)=2',
    });
    const composition = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2^{\\left|\\sin\\left(x^3+x\\right)\\right|}=2^{\\frac{1}{2}}',
    });

    expect(logarithmic.kind).toBe('success');
    if (logarithmic.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(logarithmic.exactLatex ?? '').toContain('\\exponentialE^{2}-1');
    expect(logarithmic.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(logarithmic.detailSections?.[0]?.title).toBe('Absolute-Value Reduction');

    expect(stacked.kind).toBe('success');
    if (stacked.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(stacked.exactLatex ?? '').toContain('\\exponentialE^{4}');
    expect(stacked.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');

    expect(composition.kind).toBe('success');
    if (composition.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(composition.exactLatex ?? '').toContain('x^3+x');
    expect(composition.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(1);
    expect(composition.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(composition.detailSections?.some((section) => section.title === 'Generated Branches')).toBe(true);
  });

  it('keeps deeper outer non-periodic abs families numeric-follow-up eligible when they exceed the bounded placeholder depth or downstream exact sink set', () => {
    const depthLimited = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\ln\\left(\\sqrt{\\log_{2}\\left(\\left|x\\right|+2\\right)}\\right)=0',
    });
    const unresolvedComposition = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2^{\\left|\\sin\\left(x^5+x\\right)\\right|}=2^{\\frac{1}{2}}',
    });

    expect(depthLimited.kind).toBe('error');
    if (depthLimited.kind !== 'error') {
      throw new Error('Expected a bounded-depth error outcome');
    }
    expect(depthLimited.error).toContain('more than one extra bounded non-periodic outer layer');
    expect(depthLimited.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
    expect(depthLimited.detailSections?.some((section) => section.title === 'Exact Closure Boundary')).toBe(true);

    expect(unresolvedComposition.kind).toBe('error');
    if (unresolvedComposition.kind !== 'error') {
      throw new Error('Expected an unresolved composition-backed error outcome');
    }
    expect(unresolvedComposition.error).toContain('bounded non-periodic outer layer');
    expect(unresolvedComposition.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
    expect(unresolvedComposition.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(unresolvedComposition.detailSections?.some((section) => section.title === 'Exact Closure Boundary')).toBe(true);
  });

  it('returns exact reduced-carrier composition families for shifted radical carriers after COMP12A', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\arcsin\\left(\\sin\\left(\\sqrt{x+1}-2\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex ?? '').toContain('\\sqrt{x+1}-2');
    expect(result.periodicFamily?.reducedCarrierLatex ?? '').toContain('\\sqrt{x+1}-2');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
    expect(result.solveSummaryText ?? '').toContain('Exact reduced-carrier sawtooth family');
  });

  it('keeps explicit-x composition closure when sin(ln(x+1))=1/2 can still solve back to x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.periodicFamily?.carrierLatex).toBe('x');
    expect(result.exactLatex ?? '').not.toContain('\\ln\\left(x+1\\right)');
    expect(result.solveSummaryText ?? '').not.toContain('Exact reduced-carrier');
  });

  it('solves linear 2x2 systems', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'linear2',
      equationLatex: '',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=1');
    expect(result.exactLatex).toContain('y=2');
  });

  it('solves polynomial 2x2 systems through bounded resultant projection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'polynomialSystem2',
      equationLatex: '',
      polynomialSystem2Latex: ['y=x^2', 'y=1'],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\left(-1,1\\right)');
    expect(result.exactLatex).toContain('\\left(1,1\\right)');
    expect(result.detailSections?.map((section) => section.title)).toContain('Resultant Projection');
  });

  it('returns a local polynomial-system error for partial input', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'polynomialSystem2',
      equationLatex: '',
      polynomialSystem2Latex: ['', 'x-y=0'],
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('Enter both polynomial equations');
  });

  it('uses symbolic results for guided quadratic equations when available', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('falls back numerically for guided quadratic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [1, 2, 2],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('-1 - i');
    expect(result.approxText).toContain('-1 + i');
    expect(result.warnings).toContain('Symbolic solve unavailable; showing numeric roots.');
    expect(result.answerDomain).toBeUndefined();
  });

  it('marks guided polynomial complex-capable outputs when Complex is enabled', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [1, 2, 2],
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.answerDomain).toBe('complex');
  });

  it('solves cubic coefficient entry symbolically', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'cubic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
  });

  it('solves quartic coefficient entry symbolically through the bounded factor-first path', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quartic',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toContain('-2');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
  });

  it('falls back numerically for guided quartic complex roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quartic',
      quarticCoefficients: [5, -6, 5, 4, 1],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.exactLatex).toContain('\\approx');
    expect(result.exactLatex).toContain('i');
    expect(result.approxText).toContain('0.870267 - 1.036465i');
    expect(result.approxText).toContain('-0.270267 + 0.190128i');
    expect(result.answerDomain).toBeUndefined();
  });

  it('rejects a zero leading quadratic coefficient', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'quadratic',
      quadraticCoefficients: [0, 2, 1],
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('non-zero');
  });

  it('reduces embedded derivatives before solving for x', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '12+\\frac{d}{dx}(5x)+6x=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('-2');
    const normalized = result.resolvedInputLatex?.replaceAll(' ', '') ?? '';
    expect(normalized).toContain('6x');
    expect(normalized).toContain('17');
    expect(normalized).toContain('=5');
    expect(result.plannerBadges).toContain('Reduced Derivative');
  });

  it('solves supported free-form cubic polynomial equations exactly', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3-6x^2+11x-6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).toContain('3');
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('keeps unsupported free-form quartic polynomial equations on the current symbolic-only error path', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^4+x+1=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation is outside the supported exact symbolic solve families.');
  });

  it('uses the shared bounded trig backend for symbolic trig equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(2x\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.plannerBadges).toContain('Trig Solve Backend');
  });

  it('solves selected trig rewrite families from Equation mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Rewrite');
    expect(result.solveSummaryText).toContain('double-angle');
  });

  it('normalizes bounded rational equations before solving and carries exclusions', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{3}+\\frac{1}{6x}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{1}{4}');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x\\ne0']);
    expect(result.detailSections?.[0]?.title).toBe('Domain Facts');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('x must stay nonzero');
    expect(result.resolvedInputLatex).toBe('\\frac{2x+1}{6x}=1');
  });

  it('keeps denominator exclusions when solving rational-zero equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{x^2-1}{x-1}=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-1');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x-1\\ne0']);
    expect(result.resolvedInputLatex).toBe('x+1=0');
  });

  it('carries radical domain conditions through symbolic solve prep', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{\\sqrt{x}}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('x\\ne0');
  });

  it('preserves radical denominator conditions on unresolved symbolic equations', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x+\\sqrt{2}}=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x+\\sqrt{2}\\ne0']);
  });

  it('solves bounded rational equations by clearing the LCD before guarded recursion', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('LCD Clear');
    expect(result.exactLatex).toContain('\\sqrt{5}');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result.exactSupplementLatex?.[0]).toContain('x+1\\ne0');
  });

  it('solves affine-radicand equations through bounded radical isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+1}=x-1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=3');
    expect(result.rejectedCandidateCount).toBe(1);
    expect(result.detailSections?.map((section) => section.title)).toContain('Candidate Checking');
  });

  it('solves broader root-vs-root-plus-affine families through RAD2 sequential isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+1}=\\sqrt{2x-1}+1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=');
    expect(result.exactLatex).toContain('\\sqrt');
    expect(result.candidateValues?.[0]).toBeCloseTo(5 - 2 * Math.sqrt(5), 8);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.rejectedCandidateCount).toBe(1);
    expect(result.resolvedInputLatex).toBe('2x-1=\\frac{(x-1)^2}{4}');
    expect(result.exactSupplementLatex?.[0]).toContain('2x-1\\ge0');
  });

  it('uses mixed-carrier factorization incidentally for bounded symbolic square-root factor families', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x-5\\sqrt{x}+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('4');
    expect(result.exactLatex).toContain('9');
    expect(result.solveSummaryText).toContain('Factored the mixed carrier expression');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
  });

  it('solves exact square-root-square families through bounded absolute-value follow-on solving', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{(x+1)^2}=x+3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-2');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+3\\ge0']);
  });

  it('solves bounded repeated-clearing nested radical families through the guarded equation runtime', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{x+\\sqrt{5-x}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a repeated-clearing success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{7}{2}-\\frac{\\sqrt{5}}{2}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('preprocesses fractional-power and explicit-base-log notation into existing solver families', () => {
    const rootCarrier = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^{1/2}=3',
    });
    const logCarrier = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\log_{e}(2x+1)=3',
    });

    expect(rootCarrier.kind).toBe('success');
    if (rootCarrier.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(rootCarrier.exactLatex).toBe('x=9');
    expect(rootCarrier.resolvedInputLatex).toBe('\\sqrt{x}=3');

    expect(logCarrier.kind).toBe('success');
    if (logCarrier.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(logCarrier.exactLatex).toContain('x=');
    expect(logCarrier.exactLatex).toContain('\\exponentialE^{3}');
    expect(logCarrier.resultOrigin).toBe('symbolic');
    expect(logCarrier.resolvedInputLatex).toBe('\\ln(2x+1)=3');
  });

  it('stops Exact mode when a symbolic equation only produces numeric fallback roots', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\log(x^2+9x-5)=\\log(8x+\\ln 4)',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Exact mode to stop on numeric-only fallback');
    }
    expect(result.answerMode).toBe('exact');
    expect(result.error).toContain('Exact answer mode could not produce');
    expect(result.exactLatex).toBeUndefined();
    expect(result.detailSections?.flatMap((section) => section.lines).join(' ')).toContain('Use Approximate with a numeric interval');
  });

  it('solves new PRL4 same-base and mixed-base log families exactly in symbolic mode', () => {
    const sameBase = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)',
    });
    const mixedBase = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\log_{2}\\left(x\\right)+\\log_{4}\\left(x\\right)=3',
    });

    expect(sameBase.kind).toBe('success');
    if (sameBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(sameBase.exactLatex).toBe('x=4');
    expect(sameBase.solveBadges).toContain('Same-Base Equality');
    expect(sameBase.exactSupplementLatex?.[0]).toContain('2x-3>0');

    expect(mixedBase.kind).toBe('success');
    if (mixedBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(mixedBase.exactLatex).toBe('x=4');
    expect(mixedBase.solveBadges).toContain('Log Base Normalize');
  });

  it('solves PRL4 bounded rational-power isolation families in symbolic mode', () => {
    const direct = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^{\\frac{3}{2}}=8',
    });
    const twoSided = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left(2x+1\\right)^{\\frac{2}{3}}=5',
    });

    expect(direct.kind).toBe('success');
    if (direct.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(direct.exactLatex).toBe('x=4');
    expect(direct.solveBadges).toContain('Power Lift');

    expect(twoSided.kind).toBe('success');
    if (twoSided.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(twoSided.exactLatex).toContain('x\\in');
    expect(twoSided.solveBadges).toContain('Power Lift');
  });

  it('solves bounded trig squares through exact branch splitting', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin^2\\left(x\\right)=\\frac{1}{4}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Trig Square Split');
    expect(result.exactLatex).toContain('x\\in');
  });

  it('blocks unsupported indefinite integrals before solve', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\int x\\,dx+x=3',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('indefinite integral');
    expect(result.plannerBadges).toContain('Hard Stop');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'planner-hard-stop',
      source: 'planner',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'blocked',
      reason: 'invalid-request',
    });
  });

  it('runs explicit equation transforms without auto-solving the transformed equation', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('Cleared the equation');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
  });

  it('runs PRL3 explicit equation transforms without auto-solving', () => {
    const asRoot = runEquationAlgebraTransform({
      action: 'rewriteAsRoot',
      equationLatex: 'x^{1/2}=3',
      angleUnit: 'deg',
    });
    const asPower = runEquationAlgebraTransform({
      action: 'rewriteAsPower',
      equationLatex: '\\sqrt{x}=3',
      angleUnit: 'deg',
    });
    const changedBase = runEquationAlgebraTransform({
      action: 'changeBase',
      equationLatex: '\\log_{4}(x)=2',
      angleUnit: 'deg',
    });

    expect(asRoot.kind).toBe('success');
    if (asRoot.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asRoot.exactLatex).toBe('\\sqrt{x}=3');
    expect(asRoot.transformBadges).toEqual(['Rewrite as Root']);

    expect(asPower.kind).toBe('success');
    if (asPower.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asPower.exactLatex).toBe('x^{\\frac{1}{2}}=3');
    expect(asPower.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
    expect(asPower.transformBadges).toEqual(['Rewrite as Power']);

    expect(changedBase.kind).toBe('success');
    if (changedBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(changedBase.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}=2');
    expect(changedBase.transformBadges).toEqual(['Change Base']);
  });

  it('widens explicit equation transforms to binomial denominator families', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x^2+1}+\\frac{1}{x-1}=0',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x^2+x=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('Cleared the equation');
    expect(result.transformSummaryLatex).toContain('x-1');
    expect(result.transformSummaryLatex).toContain('x^2+1');
    expect(result.exactSupplementLatex?.[0]).toContain('x^2+1\\ne0');
  });

  it('solves bounded conjugate families through the shared symbolic backend', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
  });

  it('solves widened affine-scaled conjugate families through the shared symbolic backend', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{2+\\sqrt{x}}=\\frac{1}{3}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
    expect(result.solveBadges).toContain('LCD Clear');
  });

  it('solves selected three-term reciprocal families only when the bounded sink closes cleanly', () => {
    const success = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}',
    });
    const honestStop = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2+\\sqrt{2}}',
    });

    expect(success.kind).toBe('success');
    if (success.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(success.exactLatex).toBe('x=0');
    expect(success.solveBadges).toContain('LCD Clear');

    expect(honestStop.kind).toBe('error');
    if (honestStop.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(honestStop.error).toContain('bounded solve set');
    expect(honestStop.solveBadges).toContain('LCD Clear');
  });
});
