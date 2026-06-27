import { describe, expect, it } from 'vitest';
import { inspectComplexNestedWrapperSubstrate } from '../../equation/composition/complex-nested-wrapper-substrate';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function inspect(equationLatex: string) {
  return inspectComplexNestedWrapperSubstrate(equationLatex, 'z', 'rad');
}

function expectReady(equationLatex: string) {
  const result = inspect(equationLatex);
  expect(result.kind).toBe('ready');
  if (result.kind !== 'ready') {
    throw new Error(`Expected Complex nested substrate readiness for ${equationLatex}, received ${result.reason}`);
  }
  expect(result.visibleSolve).toBe('deferred');
  return result;
}

function solve(equationLatex: string) {
  return runEquationMode({
    ...makeRequest(),
    angleUnit: 'rad',
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationDomainIntent: 'complex',
  });
}

function expectNoNestedOrRealFormulaSections(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('Complex Nested Wrapper Solve');
  expect(text).not.toContain('Nested Formula Cases');
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('RootOf');
}

describe('Equation Complex nested wrapper substrate', () => {
  it('classifies exact depth-two Complex algebraic wrapper chains without enabling output', () => {
    const nestedSquareRoot = expectReady(String.raw`\sqrt{\sqrt{z^2+1}}=a`);
    expect(nestedSquareRoot.depth).toBe(2);
    expect(nestedSquareRoot.carrierKinds).toEqual(['square-root', 'square-root']);
    expect(nestedSquareRoot.principalImageFacts).toHaveLength(2);
    expect(nestedSquareRoot.principalImageFacts[0].conditionLatex).toContain(String.raw`\operatorname{Re}\left(a\right)`);
    expect(nestedSquareRoot.principalImageFacts[1].conditionLatex).toContain(String.raw`a^2`);
    expect(nestedSquareRoot.generatedEquationLatex.join(' ')).toContain('z^2+1');
    expect(nestedSquareRoot.compactRouteEligibility.kind).toBe('eligible');

    const rootAroundPower = expectReady(String.raw`\sqrt{(z^2+1)^3}=a`);
    expect(rootAroundPower.carrierKinds).toEqual(['square-root', 'odd-power']);
    expect(rootAroundPower.principalImageFacts).toHaveLength(1);
    expect(rootAroundPower.powerBranchDefinitions).toHaveLength(1);
    expect(rootAroundPower.powerBranchDefinitions[0].branches).toHaveLength(3);
    expect(rootAroundPower.powerBranchDefinitions[0].branches[1].valueLatex).toContain(String.raw`\omega_{1}`);
    expect(rootAroundPower.generatedEquationLatex).toHaveLength(3);
    expect(rootAroundPower.compactRouteEligibility.kind).toBe('eligible');

    const nthRootAroundSquareRoot = expectReady(String.raw`\sqrt[3]{\sqrt{z^2+1}}=a`);
    expect(nthRootAroundSquareRoot.carrierKinds).toEqual(['nth-root', 'square-root']);
    expect(nthRootAroundSquareRoot.principalImageFacts).toHaveLength(2);
    expect(nthRootAroundSquareRoot.principalImageFacts[0].conditionLatex).toContain(String.raw`\arg\left(a\right)`);
    expect(nthRootAroundSquareRoot.principalImageFacts[1].conditionLatex).toContain(String.raw`a^3`);
    expect(nthRootAroundSquareRoot.generatedEquationLatex.join(' ')).toContain('z^2+1');
    expect(nthRootAroundSquareRoot.compactRouteEligibility.kind).toBe('eligible');
  });

  it('tracks noncompact final branches without making them formula-ready', () => {
    const result = expectReady(String.raw`\sqrt{\sqrt{z^3+z+1}}=a`);

    expect(result.generatedEquationLatex.join(' ')).toContain('z^3+z+1');
    expect(result.compactRouteEligibility.kind).toBe('deferred');
    expect(result.compactRouteEligibility.equations[0].reason).toContain('noncompact higher-degree');
  });

  it('keeps abs, depth-three, and non-algebraic nested boundaries deferred', () => {
    const absNested = inspect(String.raw`\sqrt{\left|z^2+1\right|}=a`);
    expect(absNested.kind).toBe('deferred');
    if (absNested.kind === 'deferred') {
      expect(absNested.reason).toBe('unsupported-carrier');
      expect(absNested.carrierKinds).toEqual(['square-root', 'absolute-value']);
    }

    const trigNested = inspect(String.raw`\sin\left(\sqrt{z^2+1}\right)=a`);
    expect(trigNested.kind).toBe('deferred');
    if (trigNested.kind === 'deferred') {
      expect(trigNested.reason).toBe('unsupported-carrier');
      expect(trigNested.carrierKinds).toEqual(['sin', 'square-root']);
    }

    const depthThree = inspect(String.raw`\sqrt{\sqrt{\sqrt{z^2+1}}}=a`);
    expect(depthThree.kind).toBe('deferred');
  });

  it('leaves visible Complex nested wrapper solving deferred', () => {
    const cases = [
      String.raw`\sqrt{\sqrt{z^2+1}}=a`,
      String.raw`\sqrt{(z^2+1)^3}=a`,
      String.raw`\sqrt[3]{\sqrt{z^2+1}}=a`,
    ];

    for (const equationLatex of cases) {
      const result = solve(equationLatex);
      expectNoNestedOrRealFormulaSections(result);
    }
  });
});
