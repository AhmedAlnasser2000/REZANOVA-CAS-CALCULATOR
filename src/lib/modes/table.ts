import { buildTable } from '../engine/math-engine';
import { assumptionFactsToDetailSections } from '../algebra/assumption-readback';
import { buildDomainSamplingReadiness } from '../algebra/domain-sampling-readiness';
import {
  applyStoredVariableSubstitutions,
  storedValuesDetailSection,
} from '../algebra/variable-memory';
import type {
  DisplayOutcome,
  StoredVariableValue,
  TableResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

type RunTableModeRequest = {
  primaryLatex: string;
  secondaryLatex: string;
  secondaryEnabled: boolean;
  start: number;
  end: number;
  step: number;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
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
  storedVariables,
  variableSubstitutionSnapshot,
}: RunTableModeRequest): TableModeResult {
  const substitutionSource = variableSubstitutionSnapshot ?? storedVariables;
  const primarySubstitution = applyStoredVariableSubstitutions(primaryLatex, substitutionSource, {
    protectedNames: ['x'],
  });
  const secondarySubstitution = secondaryEnabled
    ? applyStoredVariableSubstitutions(secondaryLatex, substitutionSource, {
        protectedNames: ['x'],
      })
    : { latex: secondaryLatex, substitutions: [] };
  const substitutions = [
    ...primarySubstitution.substitutions,
    ...secondarySubstitution.substitutions.filter((entry) =>
      !primarySubstitution.substitutions.some((used) => used.name === entry.name)),
  ];
  const storedValuesDetail = storedValuesDetailSection(substitutions, 'Table expression');

  const response = buildTable({
    primaryExpression: { latex: primarySubstitution.latex },
    secondaryExpression: secondaryEnabled ? { latex: secondarySubstitution.latex } : null,
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

  const functions = secondaryEnabled && secondarySubstitution.latex.trim()
    ? `f(x)=${primarySubstitution.latex},\\;g(x)=${secondarySubstitution.latex}`
    : `f(x)=${primarySubstitution.latex}`;

  return {
    response,
    outcome: {
      kind: 'success',
      title: 'Table',
      exactLatex: functions,
      approxText: `${response.rows.length} rows generated`,
      warnings: response.warnings,
      detailSections: [
        ...(storedValuesDetail ? [storedValuesDetail] : []),
        ...(tableAssumptionDetails({
          primaryLatex: primarySubstitution.latex,
          secondaryLatex: secondarySubstitution.latex,
          secondaryEnabled,
          response,
        }) ?? []),
      ],
      variableSubstitutions: substitutions.length > 0 ? substitutions : undefined,
    },
  };
}
