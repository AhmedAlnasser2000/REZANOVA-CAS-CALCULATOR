import { describe, expect, it } from 'vitest';
import { buildFormulaViewerArtifact } from '../../../app/runtime/formula-viewer-artifacts';
import { buildDisplayBlocks, type DisplayBlock } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(equationLatex: string) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationDomainIntent: 'real',
  });
}

function expectSuccess(equationLatex: string) {
  const result = solve(equationLatex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success for ${equationLatex}, received ${result.kind}`);
  }
  return result;
}

function answerBlock(result: ReturnType<typeof expectSuccess>) {
  const block = buildDisplayBlocks(result).find((entry) => entry.id === 'answer');
  expect(block?.renderKind).toBe('caseMath');
  return block as DisplayBlock & { renderKind: 'caseMath' };
}

function expectFormulaCopyPreserved(result: ReturnType<typeof expectSuccess>, equationLatex: string) {
  const blocks = buildDisplayBlocks(result);
  const answer = answerBlock(result);
  const copyLatex = result.exactLatex ?? '';
  const artifact = buildFormulaViewerArtifact({
    block: answer,
    displayBlocks: blocks,
    now: () => 1,
    source: {
      copyLatex,
      resolvedInputLatex: equationLatex,
      resultTitle: 'Symbolic',
      sourceExpressionLatex: equationLatex,
      sourceWorkspaceInstanceId: 'equation.audit',
      sourceWorkspaceKind: 'equation',
      sourceWorkspaceTitle: 'Equation',
    },
  });

  expect(copyLatex).toContain('\\begin{cases}');
  expect(artifact.copyLatex).toBe(copyLatex);
}

function expectRowLocalConditions(result: ReturnType<typeof expectSuccess>) {
  const answer = answerBlock(result);
  expect(answer.lines?.some((line) => Boolean(line.conditionLatex))).toBe(true);
}

describe('Equation Real wrapper formula readback audit', () => {
  it('keeps wrapper facts global and formula guards row-local across wrapper families', () => {
    const cases = [
      {
        equation: '2\\sqrt{z^3+z+1}+c=b',
        fact: (fact: string) => fact.includes('b') && fact.includes('c') && fact.includes('\\ge0'),
        detail: 'Real Cardano Cases',
      },
      {
        equation: '\\sqrt[3]{\\sqrt{z^4+z+1}}=b',
        fact: (fact: string) => fact.includes('b') && fact.includes('\\ge0'),
        detail: 'Nested Formula Cases',
      },
      {
        equation: 'a e^{z^4+z+1}+c=d',
        fact: (fact: string) => fact === 'a\\ne0',
        detail: 'Real Ferrari Cases',
      },
      {
        equation: 'a\\sin\\left(z^3+z+1\\right)+c=d',
        fact: (fact: string) => fact === 'a\\ne0',
        detail: 'Trig Formula Cases',
      },
    ];

    for (const entry of cases) {
      const result = expectSuccess(entry.equation);
      expect(result.answerDomain).toBe('real');
      expect(result.exactSupplementLatex?.some(entry.fact)).toBe(true);
      expect(result.detailSections?.some((section) => section.title === entry.detail)).toBe(true);
      expectRowLocalConditions(result);
      expectFormulaCopyPreserved(result, entry.equation);
    }
  });
});
