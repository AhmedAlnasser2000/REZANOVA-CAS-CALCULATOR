import {
  buildTable,
  buildTableCooperatively,
} from '../engine/math-engine';
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
import { textDetailSection } from '../display/result/result-detail-lines';
import { profileTableResult } from '../display/printer';
import { createTableResultOutcome } from './table-result-document';

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
  runtimeStatus?: 'cancelled';
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

function prepareTableRuntime(request: RunTableModeRequest) {
  const substitutionSource = request.variableSubstitutionSnapshot ?? request.storedVariables;
  const storedValuePolicy = resolveStoredValueModePolicy({
    mode: 'table',
    action: 'table-evaluate',
    protectedNames: ['x'],
    protectedNameDescriptions: { x: 'the table variable' },
  });
  const protectedNames = storedValuePolicy.kind === 'apply' ? storedValuePolicy.protectedNames : [];
  const primarySubstitution = applyStoredVariableSubstitutions(request.primaryLatex, substitutionSource, {
    protectedNames,
  });
  const secondarySubstitution = request.secondaryEnabled
    ? applyStoredVariableSubstitutions(request.secondaryLatex, substitutionSource, {
        protectedNames,
      })
    : { latex: request.secondaryLatex, substitutions: [], protectedSubstitutions: [] };
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

  const functions = request.secondaryEnabled && secondarySubstitution.latex.trim()
    ? `f(x)=${primarySubstitution.latex},\\;g(x)=${secondarySubstitution.latex}`
    : `f(x)=${primarySubstitution.latex}`;
  const originalFunctions = request.secondaryEnabled && request.secondaryLatex.trim()
    ? `f(x)=${request.primaryLatex},\\;g(x)=${request.secondaryLatex}`
    : `f(x)=${request.primaryLatex}`;
  const storedValueDetails = storedValueReadbackSections({
    substitutions,
    protectedSubstitutions,
    protectedNameDescriptions:
      storedValuePolicy.kind === 'apply' ? storedValuePolicy.protectedNameDescriptions : undefined,
    originalLatex: originalFunctions,
    effectiveLatex: functions,
    effectiveLabel: 'Effective table expression',
    replayedSnapshot: Boolean(request.variableSubstitutionSnapshot),
  });

  return {
    primaryLatex: primarySubstitution.latex,
    secondaryLatex: secondarySubstitution.latex,
    secondaryEnabled: request.secondaryEnabled,
    start: request.start,
    end: request.end,
    step: request.step,
    substitutions,
    functions,
    storedValueDetails,
  };
}

function buildTableModeResult(
  prepared: ReturnType<typeof prepareTableRuntime>,
  response: TableResponse,
): TableModeResult {
  if (response.error) {
    const outcome: Extract<DisplayOutcome, { kind: 'error' }> = {
      kind: 'error',
      title: 'Table',
      error: response.error,
      warnings: response.warnings,
    };
    return {
      response,
      outcome: createTableResultOutcome(outcome, response),
    };
  }

  const outcome = profileTableResult<Extract<DisplayOutcome, { kind: 'success' }>>({
    kind: 'success',
    title: 'Table',
    exactLatex: prepared.functions,
    approxText: `${response.rows.length} rows generated`,
    warnings: response.warnings,
    detailSections: [
      ...prepared.storedValueDetails,
      ...(tableAssumptionDetails({
        primaryLatex: prepared.primaryLatex,
        secondaryLatex: prepared.secondaryLatex,
        secondaryEnabled: prepared.secondaryEnabled,
        response,
      }) ?? []),
    ],
    variableSubstitutions: prepared.substitutions.length > 0 ? prepared.substitutions : undefined,
  });
  return {
    response,
    outcome: createTableResultOutcome(outcome, response),
  };
}

export function buildCancelledTableModeResult(): TableModeResult {
  return {
    runtimeStatus: 'cancelled',
    response: {
      headers: [],
      rows: [],
      warnings: [],
    },
    outcome: {
      kind: 'error',
      title: 'Table',
      error: 'Table build was stopped before it finished.',
      warnings: [],
      detailSections: [
        textDetailSection('OOE', [
          'The active Table job observed a Stop request and exited before committing rows.',
        ]),
      ],
    },
  };
}

export function runTableMode(request: RunTableModeRequest): TableModeResult {
  const prepared = prepareTableRuntime(request);
  const response = buildTable({
    primaryExpression: { latex: prepared.primaryLatex },
    secondaryExpression: prepared.secondaryEnabled ? { latex: prepared.secondaryLatex } : null,
    variable: 'x',
    start: prepared.start,
    end: prepared.end,
    step: prepared.step,
  });

  return buildTableModeResult(prepared, response);
}

export async function runTableModeCooperatively(
  request: RunTableModeRequest,
  options: {
    rowsPerBatch?: number;
    shouldCancel?: () => boolean;
    onCheckpoint?: (checkpoint: {
      completedRows: number;
      totalRows: number;
    }) => void;
    yieldIfBudgetExceeded?: (message?: string) => Promise<unknown>;
  } = {},
): Promise<TableModeResult> {
  const prepared = prepareTableRuntime(request);
  const result = await buildTableCooperatively({
    primaryExpression: { latex: prepared.primaryLatex },
    secondaryExpression: prepared.secondaryEnabled ? { latex: prepared.secondaryLatex } : null,
    variable: 'x',
    start: prepared.start,
    end: prepared.end,
    step: prepared.step,
  }, options);

  if (result.kind === 'cancelled') {
    return buildCancelledTableModeResult();
  }

  return buildTableModeResult(prepared, result.response);
}
