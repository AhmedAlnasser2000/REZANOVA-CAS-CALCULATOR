import { describe, expect, it } from 'vitest';
import { getEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(input: {
  equationLatex: string;
  interval: { start: string; end: string; subdivisions: number };
}) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex: input.equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    numericInterval: input.interval,
  });
}

function intervalEvidence(input: Parameters<typeof solve>[0]) {
  return getEquationAnalysisEvidence(solve(input))
    .filter((entry) => entry.category === 'interval-validity');
}

describe('Equation interval validity evidence', () => {
  it('exports split-required root-domain status and boundary evidence', () => {
    const evidence = intervalEvidence({
      equationLatex: String.raw`\sqrt{x+1}=2`,
      interval: { start: '-2', end: '5', subdivisions: 128 },
    });

    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'split-required',
      latex: String.raw`x+1\ge0`,
      interval: expect.objectContaining({ start: '-2', end: '5', local: true }),
    }));
    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'boundary:root-boundary',
      point: expect.objectContaining({ value: -1, role: 'boundary' }),
    }));
  });

  it('exports safe and split-required statuses for mixed log and denominator domains', () => {
    const evidence = intervalEvidence({
      equationLatex: String.raw`\ln(x-1)+1/(x-2)=3`,
      interval: { start: '1.1', end: '25', subdivisions: 256 },
    });

    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'safe',
      latex: String.raw`x-1>0`,
    }));
    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'split-required',
      latex: String.raw`x-2\ne0`,
    }));
    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'boundary:denominator-exclusion',
      point: expect.objectContaining({ value: 2, role: 'singularity' }),
    }));
  });

  it('exports invalid interval-domain status', () => {
    const evidence = intervalEvidence({
      equationLatex: String.raw`\ln(x-1)=0`,
      interval: { start: '-5', end: '0', subdivisions: 128 },
    });

    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'invalid',
      latex: String.raw`x-1>0`,
    }));
  });

  it('exports unknown interval-domain status for unresolved parameter facts', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: String.raw`\ln(y)+x=0`,
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
      angleUnit: 'rad',
      numericInterval: { start: '-5', end: '5', subdivisions: 128 },
    });
    const evidence = getEquationAnalysisEvidence(result)
      .filter((entry) => entry.category === 'interval-validity');

    expect(evidence).toContainEqual(expect.objectContaining({
      classification: 'unknown',
      latex: String.raw`y>0`,
    }));
    expect(JSON.stringify(result)).not.toContain('"interval-validity"');
  });
});
