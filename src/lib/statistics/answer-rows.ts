import type { DisplayAnswerRowsReadback } from '../../types/calculator';
import type { StatisticsOwnedMathJsonLeaf } from './math-values';

export type StatisticsAnswerRowSpec = {
  label: string;
  latex: string;
  mathJson: unknown;
};

export function buildStatisticsAnswerRows(
  rows: readonly StatisticsAnswerRowSpec[],
  source: string,
): {
  answerRows: DisplayAnswerRowsReadback;
  mathJsonLeaves: StatisticsOwnedMathJsonLeaf[];
} {
  return {
    answerRows: {
      label: 'Answer',
      rows: rows.map(({ label, latex }) => ({ label, latex })),
    },
    mathJsonLeaves: rows.map(({ latex, mathJson }, index) => ({
      canonicalLatex: latex,
      mathJson,
      source: `${source}.answer-row-${index}`,
    })),
  };
}
