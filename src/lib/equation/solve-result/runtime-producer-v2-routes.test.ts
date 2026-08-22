import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../../modes/equation/run';
import { makeRequest } from '../../modes/equation/test-support';
import { finalizeEquationCanonicalRuntimeOutcome } from './runtime-producer-adapter';

function finalizedSymbolic(equationLatex: string) {
  const draft = runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    complexExactForm: 'rectangular',
  });
  expect(draft.kind).toBe('success');
  const runtime = finalizeEquationCanonicalRuntimeOutcome(draft, 'Equation V2 route test');
  if (runtime.kind === 'prompt' || runtime.canonicalResult.version !== 2) {
    throw new Error('Expected a finalized Equation V2 result.');
  }
  return { draft, document: runtime.canonicalResult };
}

describe('Equation active typed-supplement V2 routes', () => {
  it('keeps PRL4 exact while preserving right-facing producer conditions', () => {
    const { draft, document } = finalizedSymbolic(String.raw`\ln(x+1)=\ln(2x-3)`);

    expect(draft.kind === 'success' ? draft.exactLatex : undefined).toBe('x=4');
    expect(document.supplements?.map((entry) => entry.presentationLatex)).toEqual([
      'x+1>0',
      '2x-3>0',
    ]);
    expect(document.supplements?.every((entry) => entry.math.mathJson !== undefined)).toBe(true);
  });

  it('keeps COMP2 branches and excludes constant-base evidence from supplements', () => {
    const { draft, document } = finalizedSymbolic(String.raw`\sqrt{\ln_{3}((x+1)^2)}=2`);

    expect(draft.kind === 'success' ? draft.exactLatex : undefined)
      .toBe(String.raw`x\in\left\{-10, 8\right\}`);
    expect(document.branchReadback?.branches.map((branch) => branch.canonicalLatex))
      .toEqual(['-10', '8']);
    expect(document.supplements?.map((entry) => entry.presentationLatex)).toEqual([
      String.raw`\log_{3}((x+1)^2)\ge0`,
      '(x+1)^2>0',
    ]);
    expect(document.supplements?.some((entry) => entry.presentationLatex === '3>0')).toBe(false);
  });

  it('keeps COMP4 exact with its single labeled condition', () => {
    const { draft, document } = finalizedSymbolic(String.raw`\arctan(\ln(x+1))=45`);

    expect(draft.kind === 'success' ? draft.exactLatex : undefined)
      .toBe(String.raw`x=\exponentialE-1`);
    expect(document.supplements?.map((entry) => entry.presentationLatex)).toEqual([
      String.raw`\text{Conditions: } x+1>0`,
    ]);
    expect(document.summaries?.solve).toHaveLength(2);
  });

  it('keeps RAD2 exact with independently proven guarded conditions and rejection details', () => {
    const { draft, document } = finalizedSymbolic(String.raw`\sqrt{x+1}=\sqrt{2x-1}+1`);

    expect(draft.kind === 'success' ? draft.exactLatex : undefined)
      .toBe(String.raw`x=\frac{1}{2}(10-2\sqrt{20})`);
    expect(document.supplements).toHaveLength(4);
    expect(document.supplements?.every((entry) => entry.math.mathJson !== undefined)).toBe(true);
    expect(document.details?.some((section) => section.title === 'Extraneous Solutions')).toBe(true);
    expect(document.summaries?.solve?.flat().some((part) =>
      part.kind === 'text' && part.text.includes('exact power lift'))).toBe(true);
  });
});
