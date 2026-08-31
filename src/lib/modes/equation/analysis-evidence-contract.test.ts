import { describe, expect, it } from 'vitest';
import {
  attachEquationAnalysisEvidence,
  EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION,
  getEquationAnalysisEvidence,
} from '../../equation/analysis-evidence';
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

describe('Equation analysis evidence contract', () => {
  it('keeps the first producer-owned supplement selection authoritative during later evidence merges', () => {
    const result = solve({ equationLatex: String.raw`\sqrt{x+1}=2` });
    const originalSelection = getEquationAnalysisEvidence(result).find((entry) =>
      entry.classification === EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION);
    expect(originalSelection).toBeDefined();
    attachEquationAnalysisEvidence(result, [{
      id: 'domain:later:x',
      target: 'x',
      sourceRoute: 'symbolic-exact',
      category: 'domain',
      confidence: 'proven',
      classification: EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION,
      supplementEvidence: {
        role: 'condition',
        canonicalLatex: String.raw`x+1\ge0`,
        mathJson: ['GreaterEqual', ['Add', 'x', 1], 0],
      },
    }]);

    const selected = getEquationAnalysisEvidence(result).filter((entry) =>
      entry.classification === EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION);
    expect(selected.map((entry) => entry.id)).toEqual([originalSelection?.id]);
  });

  it('attaches internal route evidence for numeric interval solves without leaking into JSON', () => {
    const result = solve({
      equationLatex: String.raw`x^2+\sin(x)=2`,
      numericInterval: { start: '-10', end: '10', subdivisions: 256 },
    });

    const evidence = getEquationAnalysisEvidence(result);
    expect(evidence).toContainEqual(expect.objectContaining({
      id: 'route:numeric-interval:x',
      target: 'x',
      sourceRoute: 'numeric-interval',
      category: 'route',
      confidence: 'reported',
      interval: {
        start: '-10',
        end: '10',
        subdivisions: 256,
        local: true,
      },
    }));
    expect(JSON.stringify(result)).not.toContain('"category":"route"');
    expect(JSON.stringify(result)).not.toContain('route:numeric-interval:x');
  });

  it('attaches internal route evidence for exact symbolic solves', () => {
    const result = solve({ equationLatex: String.raw`\sin(x)=0` });

    const evidence = getEquationAnalysisEvidence(result);
    expect(evidence).toContainEqual(expect.objectContaining({
      id: 'route:symbolic-exact:x',
      target: 'x',
      sourceRoute: 'symbolic-exact',
      category: 'route',
      confidence: 'reported',
    }));
  });

  it('attaches route evidence to interval parameter errors without running a hidden graphing API', () => {
    const result = solve({
      equationLatex: 'x+a=2',
      numericInterval: { start: '-1', end: '1', subdivisions: 32 },
    });

    expect(result.kind).toBe('error');
    const evidence = getEquationAnalysisEvidence(result);
    expect(evidence).toContainEqual(expect.objectContaining({
      id: 'route:numeric-interval:x',
      target: 'x',
      sourceRoute: 'numeric-interval',
      category: 'route',
    }));
    expect(Object.keys(result)).not.toContain('equationAnalysisEvidence');
  });
});
