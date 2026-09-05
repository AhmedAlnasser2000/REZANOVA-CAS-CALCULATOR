import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runEquationModeForIsolatedWorker } from '../../modes/equation/runtime-request-adapter';
import { makeRequest } from '../../modes/equation/test-support';

async function finalizedSymbolic(equationLatex: string) {
  const result = await runEquationModeForIsolatedWorker({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    complexExactForm: 'rectangular',
  });
  const runtime = result.outcome;
  if (runtime.kind === 'error') {
    throw new Error(`Expected Equation success: ${runtime.canonicalResult.error ?? 'unknown error'}`);
  }
  expect(runtime.kind).toBe('success');
  if (runtime.kind === 'prompt' || runtime.canonicalResult.version !== 2) {
    throw new Error('Expected a finalized Equation V2 result.');
  }
  return { outcome: runtime, document: runtime.canonicalResult };
}

describe('Equation active typed-supplement V2 routes', () => {
  it('keeps production-finalization coverage on the public runtime adapter', () => {
    const source = readFileSync(new URL(import.meta.url), 'utf8');
    const frozenRunnerImport = ['../../modes/equation', 'run'].join('/');
    const manualFinalizer = ['finalize', 'EquationCanonicalRuntimeOutcome'].join('');

    expect(source).not.toContain(`from '${frozenRunnerImport}'`);
    expect(source).not.toContain(manualFinalizer);
  });

  it('carries a single accepted native root across the isolated worker boundary', async () => {
    const result = await runEquationModeForIsolatedWorker({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: String.raw`\sqrt{x+1}=\sqrt{2x-1}+1`,
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
      complexExactForm: 'rectangular',
    });

    expect(result.outcome.kind).toBe('success');
    if (result.outcome.kind === 'prompt' || result.outcome.canonicalResult.version !== 2) {
      throw new Error('Expected an isolated Equation V2 result.');
    }
    const primary = result.outcome.canonicalResult.primary;
    expect(primary?.kind).toBe('math');
    if (!primary || primary.kind !== 'math') {
      throw new Error('Expected an isolated Equation math primary.');
    }
    expect(primary.value.mathJson).toBeDefined();
  }, 30_000);

  it.each([
    {
      equation: String.raw`\sqrt{(x^2+x)^2-(x^2+x)}=1`,
      branches: 2,
      badges: ['Radical Isolation', 'Power Lift'],
    },
    {
      equation: String.raw`\sqrt{x^2+\sqrt{5-x^2}}=2`,
      branches: 2,
      badges: ['Radical Isolation', 'Power Lift'],
    },
    {
      equation: String.raw`\ln(\sqrt{(x^2+x)^2-5(x^2+x)+4})=0`,
      branches: 4,
      badges: ['Outer Inversion', 'Nested Recursion'],
    },
  ])('finalizes carrier primary proof for $equation', async ({ equation, branches, badges }) => {
    const { document } = await finalizedSymbolic(equation);

    expect(document.primary?.kind).toBe('math');
    if (!document.primary || document.primary.kind !== 'math') {
      throw new Error('Expected an Equation math primary.');
    }
    expect(document.primary.value.mathJson).toBeDefined();
    expect(document.branchReadback?.branches).toHaveLength(branches);
    expect(document.branchReadback?.branches.every((branch) => branch.mathJson !== undefined)).toBe(true);
    if (equation.includes(String.raw`\ln(\sqrt{(x^2+x)^2`)) {
      expect(document.branchReadback?.branches.map((branch) => branch.canonicalLatex)).toEqual([
        expect.any(String),
        expect.any(String),
        expect.stringContaining(String.raw`\sqrt{275-50\sqrt{13}}`),
        expect.stringContaining(String.raw`\sqrt{275+50\sqrt{13}}`),
      ]);
      expect(document.primary.value.canonicalLatex).not.toContain(String.raw`\sqrt{513}`);
    }
    expect([
      ...(document.metadata?.plannerBadges ?? []),
      ...(document.metadata?.solveBadges ?? []),
    ]).toEqual(expect.arrayContaining(badges));
  }, 120_000);

  it('keeps PRL4 exact while preserving right-facing producer conditions', async () => {
    const { document } = await finalizedSymbolic(String.raw`\ln(x+1)=\ln(2x-3)`);

    expect(document.primary?.kind === 'math'
      ? document.primary.value.canonicalLatex
      : undefined).toBe('x=4');
    expect(document.supplements?.map((entry) => entry.presentationLatex)).toEqual([
      'x+1>0',
      '2x-3>0',
    ]);
    expect(document.supplements?.every((entry) => entry.math.mathJson !== undefined)).toBe(true);
  });

  it('keeps COMP2 branches and excludes constant-base evidence from supplements', async () => {
    const { document } = await finalizedSymbolic(String.raw`\sqrt{\ln_{3}((x+1)^2)}=2`);

    expect(document.primary?.kind === 'math'
      ? document.primary.value.canonicalLatex
      : undefined)
      .toBe(String.raw`x\in\left\{-10, 8\right\}`);
    expect(document.branchReadback?.branches.map((branch) => branch.canonicalLatex))
      .toEqual(['-10', '8']);
    expect(document.supplements?.map((entry) => entry.presentationLatex)).toEqual([
      String.raw`\log_{3}((x+1)^2)\ge0`,
      '(x+1)^2>0',
    ]);
    expect(document.supplements?.some((entry) => entry.presentationLatex === '3>0')).toBe(false);
  });

  it('keeps COMP4 exact with its single labeled condition', async () => {
    const { document } = await finalizedSymbolic(String.raw`\arctan(\ln(x+1))=45`);

    expect(document.primary?.kind === 'math'
      ? document.primary.value.canonicalLatex
      : undefined)
      .toBe(String.raw`x=\exponentialE-1`);
    expect(document.supplements?.map((entry) => entry.presentationLatex)).toEqual([
      String.raw`\text{Conditions: } x+1>0`,
    ]);
    expect(document.summaries?.solve).toHaveLength(2);
  });

  it('keeps RAD2 exact with independently proven guarded conditions and rejection details', async () => {
    const { document } = await finalizedSymbolic(String.raw`\sqrt{x+1}=\sqrt{2x-1}+1`);

    expect(document.primary?.kind === 'math'
      ? document.primary.value.canonicalLatex
      : undefined)
      .toBe(String.raw`x=\frac{1}{2}(10-2\sqrt{20})`);
    expect(document.supplements).toHaveLength(4);
    expect(document.supplements?.every((entry) => entry.math.mathJson !== undefined)).toBe(true);
    expect(document.details?.some((section) => section.title === 'Extraneous Solutions')).toBe(true);
    expect(document.summaries?.solve?.flat().some((part) =>
      part.kind === 'text' && part.text.includes('exact power lift'))).toBe(true);
  });
});
