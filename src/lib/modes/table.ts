import { buildTable } from '../engine/math-engine';
import { assumptionFactsToDetailSections } from '../algebra/assumption-readback';
import { buildDomainSamplingReadiness } from '../algebra/domain-sampling-readiness';
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

function tableAssumptionDetails(input: {
  primaryLatex: string;
  secondaryLatex: string;
  secondaryEnabled: boolean;
  response: TableResponse;
}) {
  const undefinedRows = input.response.rows.filter((row) =>
    row.primary === 'undefined' || row.secondary === 'undefined').length;
  const hasDomainWarning = input.response.warnings.some((warning) =>
    warning.includes('outside the real domain'));

  if (!hasDomainWarning && undefinedRows === 0) {
    return undefined;
  }

  const readiness = buildDomainSamplingReadiness({
    expressions: [
      { latex: input.primaryLatex, label: 'f(x)' },
      ...(input.secondaryEnabled ? [{ latex: input.secondaryLatex, label: 'g(x)' }] : []),
    ],
    sampledPoints: input.response.rows.flatMap((row) => {
      const value = Number(row.x);
      if (!Number.isFinite(value)) {
        return [];
      }

      return [{
        value,
        undefined: row.primary === 'undefined' || row.secondary === 'undefined',
      }];
    }),
    hasDomainWarning,
  });

  const sections = assumptionFactsToDetailSections(readiness.assumptionFacts);
  return sections.length > 0 ? sections : undefined;
}

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
      detailSections: tableAssumptionDetails({
        primaryLatex,
        secondaryLatex,
        secondaryEnabled,
        response,
      }),
    },
  };
}
