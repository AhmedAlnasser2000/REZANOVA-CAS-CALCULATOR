import type { DisplayDetailSection } from '../../../types/calculator';
import {
  LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP,
  LIMIT_ASYMPTOTIC_CASE_ROW_CAP,
  type LimitAsymptoticBranchDriver,
  type LimitAsymptoticCondition,
} from './asymptotic-terms';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';

export type LimitConditionalCaseRow = {
  valueLatex: string;
  conditions: LimitAsymptoticCondition[];
  proofRows?: DisplayDetailSection['lineParts'];
};

export type LimitConditionalCasesResult =
  | {
      ok: true;
      exactLatex: string;
      detailSections: DisplayDetailSection[];
      branchDrivers: LimitAsymptoticBranchDriver[];
      rowCount: number;
    }
  | {
      ok: false;
      error: string;
      detailSections: DisplayDetailSection[];
      branchDrivers: LimitAsymptoticBranchDriver[];
      rowCount: number;
    };

function driverKey(driver: LimitAsymptoticBranchDriver) {
  return `${driver.source}:${driver.latex}`;
}

function uniqueBranchDrivers(rows: readonly LimitConditionalCaseRow[]) {
  const seen = new Set<string>();
  const drivers: LimitAsymptoticBranchDriver[] = [];
  for (const row of rows) {
    for (const condition of row.conditions) {
      const key = driverKey(condition.driver);
      if (!seen.has(key)) {
        seen.add(key);
        drivers.push(condition.driver);
      }
    }
  }
  return drivers;
}

export function limitConditionLatex(condition: LimitAsymptoticCondition): string {
  if (condition.kind === 'positive') {
    return `${condition.driver.latex}>0`;
  }
  if (condition.kind === 'negative') {
    return `${condition.driver.latex}<0`;
  }
  if (condition.kind === 'zero') {
    return `${condition.driver.latex}=0`;
  }
  return `${condition.driver.latex}\\ne0`;
}

function caseConditionLatex(conditions: readonly LimitAsymptoticCondition[]) {
  return conditions.map(limitConditionLatex).join(',\\ ');
}

function caseRowsLatex(rows: readonly LimitConditionalCaseRow[]) {
  return rows
    .map((row) => `${row.valueLatex},&\\substack{${caseConditionLatex(row.conditions)}}`)
    .join('\\\\');
}

function caseDetailSection(rows: readonly LimitConditionalCaseRow[]) {
  return limitDetailSection(
    'Limit Cases',
    rows.map((row) => [
      limitMathPart(row.valueLatex),
      limitTextPart(' when '),
      limitMathPart(caseConditionLatex(row.conditions)),
      limitTextPart('.'),
    ]),
  );
}

function caseProofSection(rows: readonly LimitConditionalCaseRow[]) {
  const rowsWithProof = rows.flatMap((row) => row.proofRows ?? []);
  if (rowsWithProof.length > 0) {
    return limitDetailSection('Limit Case Proof', rowsWithProof);
  }

  return limitDetailSection('Limit Case Proof', [
    [
      limitTextPart('Branches split on target-free coefficient signs; each row records the condition needed for that leading behavior.'),
    ],
  ]);
}

function caseStopDetail(input: {
  branchDrivers: readonly LimitAsymptoticBranchDriver[];
  rowCount: number;
}) {
  return limitDetailSection('Limit Case Explosion', [
    [
      limitTextPart('Case surface stopped before display because it would need '),
      limitMathPart(`${input.rowCount}`),
      limitTextPart(' rows and '),
      limitMathPart(`${input.branchDrivers.length}`),
      limitTextPart(' branch drivers.'),
    ],
    [
      limitTextPart('Current cap: '),
      limitMathPart(`${LIMIT_ASYMPTOTIC_CASE_ROW_CAP}`),
      limitTextPart(' rows, '),
      limitMathPart(`${LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP}`),
      limitTextPart(' branch drivers.'),
    ],
  ]);
}

export function buildLimitConditionalCases(input: {
  rows: readonly LimitConditionalCaseRow[];
  answerTargetLatex?: string;
}): LimitConditionalCasesResult {
  const branchDrivers = uniqueBranchDrivers(input.rows);
  const rowCount = input.rows.length;
  if (
    rowCount === 0
    || rowCount > LIMIT_ASYMPTOTIC_CASE_ROW_CAP
    || branchDrivers.length > LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP
  ) {
    return {
      ok: false,
      error: 'This conditional limit would create too many symbolic cases to display cleanly.',
      detailSections: [caseStopDetail({ branchDrivers, rowCount })],
      branchDrivers,
      rowCount,
    };
  }

  const answerTargetLatex = input.answerTargetLatex ?? 'L';
  const exactLatex = `${answerTargetLatex}\\in\\begin{cases}${caseRowsLatex(input.rows)}\\end{cases}`;
  return {
    ok: true,
    exactLatex,
    detailSections: [
      caseDetailSection(input.rows),
      caseProofSection(input.rows),
    ],
    branchDrivers,
    rowCount,
  };
}
