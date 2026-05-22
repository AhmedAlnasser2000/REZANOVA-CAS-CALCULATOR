import { ComputeEngine } from '@cortex-js/compute-engine';
import { buildTable } from '../engine/math-engine';
import { collectRealDomainConstraints } from '../algebra/domain-range-core';
import {
  assumptionFactsFromDomainConstraints,
  buildAssumptionFact,
  mergeAssumptionFacts,
} from '../algebra/assumptions-core';
import { assumptionFactsToDetailSections } from '../algebra/assumption-readback';
import type {
  DisplayOutcome,
  TableResponse,
} from '../../types/calculator';

const ce = new ComputeEngine();

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

  const constraints = [input.primaryLatex, input.secondaryEnabled ? input.secondaryLatex : undefined]
    .flatMap((latex) => {
      if (!latex?.trim()) {
        return [];
      }
      try {
        return collectRealDomainConstraints(ce.parse(latex).json);
      } catch {
        return [];
      }
    });

  const facts = mergeAssumptionFacts(
    assumptionFactsFromDomainConstraints(constraints, {
      source: 'domain-range-core',
      scope: 'request',
      trust: constraints.length > 0 ? 'proved' : 'sampled',
    }),
    [buildAssumptionFact({
      kind: 'interval-hazard',
      source: 'domain-range-core',
      trust: constraints.length > 0 ? 'sampled' : 'blocked',
      scope: 'interval',
      message: undefinedRows > 0
        ? `${undefinedRows} sampled table row${undefinedRows === 1 ? '' : 's'} left the real domain and stayed undefined.`
        : 'The table builder detected sampled real-domain hazards.',
    })],
  );

  const sections = assumptionFactsToDetailSections(facts);
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
