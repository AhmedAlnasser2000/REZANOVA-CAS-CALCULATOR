import { describe, expect, it } from 'vitest';
import { getEquationAnalysisEvidence } from '../../equation/analysis-evidence';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(extra: Partial<Parameters<typeof runEquationMode>[0]>) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex: 'x^2-4=0',
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    ...extra,
  });
}

function rangeEvidence(result: ReturnType<typeof solve>) {
  return getEquationAnalysisEvidence(result).filter((entry) => entry.category === 'range-behavior');
}

describe('Equation range behavior hints', () => {
  it('exports bounded sine and cosine carrier hints without Display scraping', () => {
    const result = solve({ equationLatex: String.raw`\sin(x)+\cos(x)=1` });

    expect(rangeEvidence(result)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        classification: 'bounded-sine-carrier',
        confidence: 'proven',
        latex: String.raw`-1\le\sin(\cdot)\le1`,
      }),
      expect.objectContaining({
        classification: 'bounded-cosine-carrier',
        confidence: 'proven',
        latex: String.raw`-1\le\cos(\cdot)\le1`,
      }),
    ]));
    expect(JSON.stringify(result)).not.toContain('bounded-sine-carrier');
  });

  it('exports absolute-value and real principal-square-root nonnegative hints', () => {
    const result = solve({ equationLatex: String.raw`abs(x-2)+\sqrt{x+1}=3` });

    expect(rangeEvidence(result)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        classification: 'absolute-value-nonnegative',
        latex: String.raw`\left|\cdot\right|\ge0`,
      }),
      expect.objectContaining({
        classification: 'real-principal-square-root-nonnegative',
        latex: String.raw`\sqrt{\cdot}\ge0`,
      }),
    ]));
  });

  it('does not export real square-root range hints in Complex mode', () => {
    const result = solve({
      equationLatex: String.raw`\sqrt{x+1}=2`,
      equationDomainIntent: 'complex',
    });

    expect(rangeEvidence(result).map((entry) => entry.classification)).not.toContain(
      'real-principal-square-root-nonnegative',
    );
  });

  it('exports angle-unit-aware tangent pole spacing hints', () => {
    const result = solve({
      equationLatex: String.raw`\tan(x)=1`,
      angleUnit: 'deg',
    });

    expect(rangeEvidence(result)).toContainEqual(expect.objectContaining({
      classification: 'tangent-pole-spacing',
      confidence: 'reported',
      text: 'Tan poles repeat every 180 degrees in the carrier angle.',
    }));
  });
});
