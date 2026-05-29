import { buildTable } from '../engine/math-engine';
import { assumptionFactsToDetailSections } from '../algebra/assumption-readback';
import { buildDomainSamplingReadiness } from '../algebra/domain-sampling-readiness';
import {
  applyStoredVariableSubstitutions,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
} from '../algebra/variable-memory';
import type {
  DisplayOutcome,
  StoredVariableValue,
  TableResponse,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { buildOoeInputRevisionId, type OoeJobContextOptions } from '../ooe/job-contract';
import { runTableWithOoePilot } from '../ooe/table-pilot';

export type RunTableModeRequest = {
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

export function buildTableOoeSnapshot(request: RunTableModeRequest) {
  return {
    request: {
      primaryLatex: request.primaryLatex,
      secondaryLatex: request.secondaryLatex,
      secondaryEnabled: request.secondaryEnabled,
      start: request.start,
      end: request.end,
      step: request.step,
      storedVariables: request.storedVariables,
      variableSubstitutionSnapshot: request.variableSubstitutionSnapshot,
    },
  };
}

export function buildTableOoeInputRevisionId(request: RunTableModeRequest) {
  return buildOoeInputRevisionId('table.build', buildTableOoeSnapshot(request));
}

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
  const storedValuePolicy = resolveStoredValueModePolicy({
    mode: 'table',
    action: 'table-evaluate',
    protectedNames: ['x'],
    protectedNameDescriptions: { x: 'the table variable' },
  });
  const protectedNames = storedValuePolicy.kind === 'apply' ? storedValuePolicy.protectedNames : [];
  const primarySubstitution = applyStoredVariableSubstitutions(primaryLatex, substitutionSource, {
    protectedNames,
  });
  const secondarySubstitution = secondaryEnabled
    ? applyStoredVariableSubstitutions(secondaryLatex, substitutionSource, {
        protectedNames,
      })
    : { latex: secondaryLatex, substitutions: [], protectedSubstitutions: [] };
  const substitutions = [
    ...primarySubstitution.substitutions,
    ...secondarySubstitution.substitutions.filter((entry) =>
      !primarySubstitution.substitutions.some((used) => used.name === entry.name)),
  ];
  const protectedSubstitutions = [
    ...primarySubstitution.protectedSubstitutions,
    ...secondarySubstitution.protectedSubstitutions.filter((entry) =>
      !primarySubstitution.protectedSubstitutions.some((used) => used.name === entry.name)),
  ];

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
  const originalFunctions = secondaryEnabled && secondaryLatex.trim()
    ? `f(x)=${primaryLatex},\\;g(x)=${secondaryLatex}`
    : `f(x)=${primaryLatex}`;
  const storedValueDetails = storedValueReadbackSections({
    substitutions,
    protectedSubstitutions,
    protectedNameDescriptions:
      storedValuePolicy.kind === 'apply' ? storedValuePolicy.protectedNameDescriptions : undefined,
    originalLatex: originalFunctions,
    effectiveLatex: functions,
    effectiveLabel: 'Effective table expression',
    replayedSnapshot: Boolean(variableSubstitutionSnapshot),
  });

  return {
    response,
    outcome: {
      kind: 'success',
      title: 'Table',
      exactLatex: functions,
      approxText: `${response.rows.length} rows generated`,
      warnings: response.warnings,
      detailSections: [
        ...storedValueDetails,
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

export async function runTableModeWithOoePilot(
  request: RunTableModeRequest,
  options?: OoeJobContextOptions,
) {
  return runTableWithOoePilot(() => runTableMode(request), buildTableOoeSnapshot(request), options);
}
