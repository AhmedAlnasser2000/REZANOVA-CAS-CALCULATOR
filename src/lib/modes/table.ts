import { buildTable } from '../math-engine';
import type {
  DisplayOutcome,
  TableResponse,
} from '../../types/calculator';

type RunTableModeRequest = {
  primaryLatex: string;
  secondaryLatex: string;
  secondaryEnabled: boolean;
  start: number;
  end: number;
  step: number;
};

export type TableModeResult = {
  outcome: DisplayOutcome;
  response: TableResponse;
};

export function runTableMode({
  primaryLatex,
  secondaryLatex,
  secondaryEnabled,
  start,
  end,
  step,
}: RunTableModeRequest): TableModeResult {
  const response = buildTable({
    primaryExpression: { latex: primaryLatex },
    secondaryExpression: secondaryEnabled ? { latex: secondaryLatex } : null,
    variable: 'x',
    start,
    end,
    step,
  });

  if (response.error) {
    return {
      response,
      outcome: {
        kind: 'error',
        title: 'Table',
        error: response.error,
        warnings: response.warnings,
      },
    };
  }

  const functions = secondaryEnabled && secondaryLatex.trim()
    ? `f(x)=${primaryLatex},\\;g(x)=${secondaryLatex}`
    : `f(x)=${primaryLatex}`;

  return {
    response,
    outcome: {
      kind: 'success',
      title: 'Table',
      exactLatex: functions,
      approxText: `${response.rows.length} rows generated`,
      warnings: response.warnings,
    },
  };
}
