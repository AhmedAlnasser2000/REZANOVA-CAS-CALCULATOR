import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../../result-contract';
import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { makeRequest } from './test-support';

type SolveOverrides = Partial<Parameters<typeof runEquationMode>[0]>;

function solve(equationLatex: string, overrides: SolveOverrides = {}) {
  return runEquationMode({
    ...makeRequest(),
    angleUnit: 'rad',
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationDomainIntent: 'complex',
    ...overrides,
  });
}

function expectComplexSuccess(equationLatex: string) {
  const result = solve(equationLatex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected Complex mixed algebraic wrapper success for ${equationLatex}, received ${result.kind}`);
  }
  expect(result.answerDomain).toBe('complex');
  return result;
}

function expectNoFormulaLeak(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('RootOf');
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('Nested Formula Cases');
  expect(text).not.toContain('Trig Formula Cases');
}

describe('Equation Complex mixed algebraic wrapper catchup', () => {
  it('solves one principal square-root carrier mixed with compact algebraic companions', () => {
    const affine = expectComplexSuccess(String.raw`\sqrt{z+a}+z=b`);
    const quadratic = expectComplexSuccess(String.raw`\sqrt{z^2+1}+z=b`);

    for (const result of [affine, quadratic]) {
      expect(result.detailSections?.some((section) => section.title === 'Complex Mixed Algebraic Wrapper Solve')).toBe(true);
      expect(result.detailSections?.some((section) => section.title === 'Complex Principal-Image Facts')).toBe(true);
      expect(result.exactSupplementLatex?.some((fact) =>
        fact.includes(String.raw`\operatorname{Re}`) && fact.includes('b') && fact.includes('z'))).not.toBe(true);
      expect(result.detailSections
        ?.find((section) => section.title === 'Complex Principal-Image Facts')
        ?.lines.join(' ')).toContain(String.raw`\operatorname{Re}\left(b-z\right)`);
      expect(result.exactLatex).toContain('z');
      expectNoFormulaLeak(result);
    }

    expect(affine.branchReadback?.branchesLatex).toHaveLength(2);
    expect(affine.branchReadback?.countLabel).toBe('candidateRoots');
    expect(buildProducerDisplayBlocks(affine).find((block) => block.id === 'answer')?.countSummary?.text)
      .toBe('2 candidate roots');
    expect(quadratic.exactLatex).toBe(String.raw`z=\frac{b}{2}-\frac{1}{2b}`);
  });

  it('keeps generated cubic/quartic mixed root carriers deferred without formula readback', () => {
    const cubic = solve(String.raw`\sqrt{z^3+z+1}+z=b`);
    const quartic = solve(String.raw`\sqrt{z^4+z+1}+z=b`);

    for (const result of [cubic, quartic]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).toMatch(/generated branch is outside|more than one selected-target island/u);
      expectNoFormulaLeak(result);
    }
  });

  it('keeps two-root, nested-root, abs-companion, and non-Exact boundaries deferred', () => {
    const cases = [
      solve(String.raw`\sqrt{z+a}+\sqrt{z+1}=b`),
      solve(String.raw`\sqrt{\sqrt{z^2+1}}+z=b`),
      solve(String.raw`\sqrt{z+a}+\left|z\right|=b`),
      solve(String.raw`\sqrt{z+a}+z^2=b`),
    ];

    for (const result of cases) {
      expect(result.kind).toBe('error');
      expectNoFormulaLeak(result);
    }
  });
});

function buildProducerDisplayBlocks(outcome: Parameters<typeof finalizeCanonicalRuntimeOutcomeFromProducer>[0]) {
  return buildDisplayBlocks(finalizeCanonicalRuntimeOutcomeFromProducer(outcome, 'Equation test'));
}
