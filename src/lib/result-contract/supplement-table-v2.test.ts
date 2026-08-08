import { describe, expect, it } from 'vitest';
import { goldenCases } from '../__golden__/golden-cases';
import { runGoldenCase } from '../__golden__/golden-execution';
import { executeHistoryReplayRequest } from '../history-replay/native-execution';
import { HISTORY_REPLAY_FIXTURES } from '../history-replay/fixtures';
import { runEquationModeWithOoePilot } from '../modes/equation';
import { makeRequest } from '../modes/equation/test-support';
import { collectCanonicalMathLeaves } from './mathjson-coverage';
import { MATHJSON_COVERAGE_EXEMPTIONS } from './mathjson-route-registry';

async function replay(id: string) {
  const fixture = HISTORY_REPLAY_FIXTURES.find((entry) => entry.id === id);
  if (!fixture) throw new Error(`Missing History replay fixture ${id}.`);
  const execution = await executeHistoryReplayRequest(fixture.workspace, fixture.request);
  if (execution.outcome.kind === 'prompt') throw new Error(`Unexpected prompt for ${id}.`);
  return execution.outcome.canonicalResult;
}

describe('Canonical Result V2 typed supplements and Table cells', () => {
  it.each([
    ['equation-denominator-exclusion', 'exclusion'],
    ['equation-even-root-domain', 'condition'],
    ['equation-rational-hole', 'exclusion'],
    ['equation-rational-simple', 'exclusion'],
  ] as const)('migrates %s with producer-proven %s semantics', async (id, role) => {
    const document = await replay(id);
    expect(document.version).toBe(2);
    if (document.version !== 2) throw new Error(`${id} did not select V2.`);
    expect(document.supplements).toHaveLength(1);
    expect(document.supplements?.[0]).toMatchObject({ role });
    expect(document.supplements?.[0]?.presentationLatex).toMatch(/^\\text\{/u);
    expect(document.supplements?.[0]?.math.mathJson).toBeDefined();
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('migrates the golden rational exclusion without changing its presentation label', async () => {
    const goldenCase = goldenCases.find((entry) => entry.id === 'equation-rational-exclusion');
    if (!goldenCase) throw new Error('Missing equation rational golden case.');
    const execution = await runGoldenCase(goldenCase);
    if (execution.outcome.kind === 'prompt') throw new Error('Unexpected golden prompt.');
    const document = execution.outcome.canonicalResult;
    expect(document.version).toBe(2);
    if (document.version !== 2) throw new Error('Golden rational exclusion did not select V2.');
    expect(document.supplements?.[0]).toMatchObject({
      role: 'exclusion',
      presentationLatex: '\\text{Exclusions: } x\\ne0',
    });
  });

  it('splits grouped radical conditions into independently proven V2 supplements', async () => {
    const goldenCase = goldenCases.find((entry) =>
      entry.id === 'equation-radical-candidate-rejection');
    if (!goldenCase) throw new Error('Missing radical candidate-rejection golden case.');
    const execution = await runGoldenCase(goldenCase);
    expect(execution.outcome.kind).toBe('success');
    if (execution.outcome.kind === 'prompt') throw new Error('Unexpected golden prompt.');
    const document = execution.outcome.canonicalResult;
    expect(document.version).toBe(2);
    if (document.version !== 2) {
      throw new Error('Radical candidate-rejection result did not select V2.');
    }
    expect(document.primary).toMatchObject({
      kind: 'math',
      value: { canonicalLatex: 'x=3' },
    });
    expect(document.supplements).toEqual([
      expect.objectContaining({
        role: 'condition',
        presentationLatex: 'x+1\\ge0',
        math: expect.objectContaining({
          canonicalLatex: 'x+1\\ge0',
          mathJson: expect.anything(),
        }),
      }),
      expect.objectContaining({
        role: 'condition',
        presentationLatex: 'x-1\\ge0',
        math: expect.objectContaining({
          canonicalLatex: 'x-1\\ge0',
          mathJson: expect.anything(),
        }),
      }),
    ]);
    expect(document.supplements?.every((supplement) =>
      !supplement.math.canonicalLatex.includes('\\text{Conditions: }'))).toBe(true);
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('promotes log-combine through its explicit V2 selector without changing output', async () => {
    const document = await replay('equation-log-combine');
    expect(document.version).toBe(2);
    if (document.version !== 2) throw new Error('Log-combine result did not select V2.');
    expect(document).toMatchObject({
      title: 'Solve',
      primary: {
        kind: 'math',
        value: {
          canonicalLatex: 'x=\\frac{1}{2}(\\sqrt{1+4\\exponentialE^{2}})-\\frac{1}{2}',
        },
      },
      supplements: [
        {
          role: 'condition',
          presentationLatex: 'x>0',
          math: { canonicalLatex: 'x>0', mathJson: expect.anything() },
        },
        {
          role: 'condition',
          presentationLatex: 'x+1>0',
          math: { canonicalLatex: 'x+1>0', mathJson: expect.anything() },
        },
      ],
      warnings: [],
      metadata: {
        solveBadges: expect.arrayContaining(['Log Combine']),
        resolvedInput: { canonicalLatex: '\\ln(x)+\\ln(x+1)=2' },
      },
    });
    expect(document.details?.map((detail) => detail.title)).toEqual([
      'Extraneous Solutions',
      'Candidate Checking',
    ]);
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('keeps untouched periodic Equation producers on V1 when primary proof is unavailable', async () => {
    const execution = await runEquationModeWithOoePilot({
      ...makeRequest(),
      angleUnit: 'rad',
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\sqrt{x+1}-2\\right)=\\frac{1}{2}',
    });
    expect(execution.payload.kind).toBe('success');
    if (execution.payload.kind !== 'success') {
      throw new Error('Expected shifted-radical periodic success.');
    }
    expect(execution.payload.canonicalResult.version).toBe(1);
    if (execution.payload.canonicalResult.version !== 1) {
      throw new Error('Shifted-radical periodic result did not remain on V1.');
    }
    expect(execution.payload.canonicalResult.primaryMath?.canonicalLatex)
      .toContain('\\sqrt{x+1}-2');
  });

  it.each([
    ['table-partial-domain', 'outside-real-domain', 0],
    ['table-reciprocal', 'pole', 1],
  ] as const)('types %s undefined cells and preserves defined neighbors', async (id, reason, index) => {
    const document = await replay(id);
    expect(document.version).toBe(2);
    if (document.version !== 2) throw new Error(`${id} did not select V2.`);
    expect(document.table?.rows[index]?.primary).toEqual({
      kind: 'undefined',
      reason,
      presentationLatex: 'undefined',
    });
    const defined = document.table?.rows
      .filter((_row, rowIndex) => rowIndex !== index)
      .map((row) => row.primary);
    expect(defined?.every((cell) => cell.kind === 'value' && cell.value.mathJson !== undefined))
      .toBe(true);
  });

  it('migrates the golden partial-domain Table case without residual exemptions', async () => {
    const goldenCase = goldenCases.find((entry) => entry.id === 'table-partial-real-domain');
    if (!goldenCase) throw new Error('Missing partial-domain Table golden case.');
    const execution = await runGoldenCase(goldenCase);
    if (execution.outcome.kind === 'prompt') throw new Error('Unexpected Table golden prompt.');
    expect(execution.outcome.canonicalResult.version).toBe(2);
    expect(MATHJSON_COVERAGE_EXEMPTIONS).toEqual([]);
  });
});
