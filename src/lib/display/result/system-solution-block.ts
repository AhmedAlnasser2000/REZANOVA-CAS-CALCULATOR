import type { DisplayOutcome } from '../../../types/calculator';
import type { DisplayBlock, DisplayBlockCountSummary, DisplayBlockLine } from './display-blocks';

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return count === 1 ? singular : pluralLabel;
}

function systemSolutionCountSummary(rowCount: number): DisplayBlockCountSummary {
  return {
    kind: 'roots',
    rootCount: rowCount,
    text: `${rowCount.toLocaleString()} ${plural(rowCount, 'pair')}`,
  };
}

export function systemSolutionAnswerBlockFromOutcome(
  outcome: DisplayOutcome,
  answerLatex: string,
  label: string,
): DisplayBlock | null {
  if (outcome.kind !== 'success' || !outcome.systemReadback) {
    return null;
  }

  const variables = outcome.systemReadback.variablesLatex
    .map((variable) => variable.trim())
    .filter(Boolean);
  const rows = outcome.systemReadback.rows.map((row, rowIndex): DisplayBlockLine | null => {
    if (row.valuesLatex.length !== variables.length) {
      return null;
    }
    const cells = row.valuesLatex.map((valueLatex, index) => ({
      variableLatex: variables[index] ?? '',
      valueLatex,
    }));
    return {
      id: `answer-system-row-${rowIndex}`,
      systemCells: cells,
      testId: `display-outcome-answer-system-row-${rowIndex}`,
      text: cells.map((cell) => `${cell.variableLatex}=${cell.valueLatex}`).join(', '),
    };
  });

  if (variables.length === 0 || rows.length === 0 || rows.some((row) => row === null)) {
    return null;
  }

  const visibleRows = rows.filter((row): row is DisplayBlockLine => row !== null);
  return {
    id: 'answer',
    kind: 'answer',
    label: outcome.systemReadback.label ?? label,
    renderKind: 'systemRows',
    branchCount: visibleRows.length,
    collapsible: true,
    defaultCollapsed: false,
    countSummary: systemSolutionCountSummary(visibleRows.length),
    latex: answerLatex,
    lines: visibleRows,
    rawContent: [answerLatex],
    testId: 'display-outcome-answer-block',
  };
}
