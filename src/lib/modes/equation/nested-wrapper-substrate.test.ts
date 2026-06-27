import { describe, expect, it } from 'vitest';
import { inspectNestedAlgebraicFormulaWrapperSubstrate } from '../../equation/composition/nested-formula-substrate';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function inspect(equationLatex: string) {
  return inspectNestedAlgebraicFormulaWrapperSubstrate(equationLatex, 'z', 'rad');
}

function expectReady(equationLatex: string) {
  const result = inspect(equationLatex);
  expect(result.kind).toBe('ready');
  if (result.kind !== 'ready') {
    throw new Error(`Expected nested substrate readiness for ${equationLatex}, received ${result.reason}`);
  }
  return result;
}

function solve(equationLatex: string, domain: 'real' | 'complex' = 'real') {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationDomainIntent: domain,
  });
}

function serialized(result: unknown) {
  return JSON.stringify(result);
}

function expectNoNestedFormulaSections(result: unknown) {
  const text = serialized(result);
  expect(text).not.toContain('Nested Formula Cases');
  expect(text).not.toContain('Nested Branch');
}

describe('Equation Real nested wrapper substrate', () => {
  it('classifies two-layer algebraic wrapper chains without solving formula payloads', () => {
    const nestedSquareRoot = expectReady('\\sqrt{\\sqrt{z^3+z+1}}=b');
    expect(nestedSquareRoot.depth).toBe(2);
    expect(nestedSquareRoot.carrierKinds).toEqual(['square-root', 'square-root']);
    expect(nestedSquareRoot.generatedEquationLatex.join(' ')).toContain('z^3+z+1');
    expect(nestedSquareRoot.generatedEquationLatex.join(' ')).toContain('b');
    expect(nestedSquareRoot.facts).toContain('b\\ge0');
    expect(nestedSquareRoot.layerEquationLatex.length).toBeGreaterThan(nestedSquareRoot.generatedEquationLatex.length);

    const nestedAbs = expectReady('\\sqrt{\\left|z^3+z+1\\right|}=b');
    expect(nestedAbs.carrierKinds).toEqual(['square-root', 'absolute-value']);
    expect(nestedAbs.generatedEquationLatex).toHaveLength(2);
    expect(nestedAbs.generatedEquationLatex.join(' ')).toContain('z^3+z+1');

    const nestedNthRoot = expectReady('\\sqrt[3]{\\sqrt{z^4+z+1}}=b');
    expect(nestedNthRoot.carrierKinds).toEqual(['nth-root', 'square-root']);
    expect(nestedNthRoot.generatedEquationLatex.join(' ')).toContain('z^4+z+1');
    expect(nestedNthRoot.facts.some((fact) => fact.includes('\\ge0'))).toBe(true);
  });

  it('keeps Complex, depth-three, and additive mixed-carrier boundaries deferred', () => {
    const complex = solve('\\sqrt{\\sqrt{z^3+z+1}}=b', 'complex');
    expect(complex.kind).toBe('error');
    expectNoNestedFormulaSections(complex);

    const depthThree = inspectNestedAlgebraicFormulaWrapperSubstrate(
      '\\sin\\left(\\sqrt{\\left|z-a\\right|}\\right)=b',
      'z',
      'rad',
    );
    expect(depthThree.kind).toBe('deferred');
    if (depthThree.kind === 'deferred') {
      expect(depthThree.reason).toBe('nested-composition');
    }

    const additiveMixed = inspectNestedAlgebraicFormulaWrapperSubstrate(
      '\\sin(z)+\\sqrt{z}=a',
      'z',
      'rad',
    );
    expect(additiveMixed.kind).toBe('deferred');

    const nonAlgebraic = inspectNestedAlgebraicFormulaWrapperSubstrate(
      '\\sin\\left(\\tan\\left(z\\right)\\right)=a',
      'z',
      'rad',
    );
    expect(nonAlgebraic.kind).toBe('deferred');
    if (nonAlgebraic.kind === 'deferred') {
      expect(nonAlgebraic.reason).toBe('unsupported-carrier');
      expect(nonAlgebraic.carrierKinds).toEqual(['sin', 'tan']);
    }
  });
});
