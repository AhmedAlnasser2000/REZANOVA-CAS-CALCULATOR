import { describe, expect, it } from 'vitest';
import { getEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(input: {
  equationLatex: string;
  interval?: { start: string; end: string; subdivisions: number };
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

function domainEvidenceText(result: ReturnType<typeof solve>) {
  return getEquationAnalysisEvidence(result)
    .filter((entry) => entry.category === 'domain')
    .map((entry) => `${entry.latex ?? ''} ${entry.text ?? ''}`)
    .join(' ');
}

describe('Equation domain fact evidence export', () => {
  it('exports log and denominator facts as structured evidence', () => {
    const result = solve({
      equationLatex: String.raw`\ln(x-1)+1/(x-2)=3`,
      interval: { start: '1.1', end: '25', subdivisions: 256 },
    });

    const text = domainEvidenceText(result);
    expect(text).toContain('x-1>0');
    expect(text).toContain('x-2\\ne0');
    expect(text).toContain('x\\ne 2');
    expect(getEquationAnalysisEvidence(result)).toContainEqual(expect.objectContaining({
      category: 'domain',
      confidence: 'proven',
      sourceRoute: 'numeric-interval',
      target: 'x',
    }));
  });

  it('exports even-root domain facts without relying on Display prose', () => {
    const result = solve({
      equationLatex: String.raw`\sqrt{x+1}=2`,
      interval: { start: '-2', end: '5', subdivisions: 128 },
    });

    expect(domainEvidenceText(result)).toContain('x+1\\ge0');
  });

  it('exports trig-pole facts but does not mark periodic carriers as domain facts', () => {
    const result = solve({
      equationLatex: String.raw`\tan(x)=1`,
      interval: { start: '0', end: '10', subdivisions: 256 },
    });

    const domainEntries = getEquationAnalysisEvidence(result).filter((entry) => entry.category === 'domain');
    expect(domainEntries.map((entry) => entry.latex).join(' ')).toContain(String.raw`\cos\left(x\right)\ne0`);
    expect(domainEntries.map((entry) => entry.text).join(' ')).not.toContain('Periodic carrier detected');
  });

  it('exports inverse trig argument facts for exact symbolic routes too', () => {
    const result = solve({ equationLatex: String.raw`\arcsin(x)=a` });

    expect(domainEvidenceText(result)).toContain('-1\\le x\\le1');
    expect(JSON.stringify(result)).not.toContain('"category":"domain"');
  });
});
