import { runCalculateMode } from '../../../src/lib/modes/calculate';

export function runExpressionBaselineProbe(latex: string) {
  return {
    inputLatex: latex,
    outcome: runCalculateMode({
      action: 'evaluate',
      latex,
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    }),
  };
}
