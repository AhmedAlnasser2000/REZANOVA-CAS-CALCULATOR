import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  LimitTargetKind,
} from '../../../types/calculator';
import {
  LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP,
  type LimitAsymptoticBranchDriver,
  type LimitAsymptoticCondition,
} from './asymptotic-terms';
import {
  buildLimitConditionalCases,
  type LimitConditionalCaseRow,
} from './conditional-cases';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import type {
  GruntzBranchAssumption,
  GruntzCoefficientDriver,
  GruntzMrvSetOptions,
} from './gruntz-foundation';
import {
  buildGruntzSeriesInWContract,
  type GruntzSeriesInWContract,
} from './gruntz-series-w';

type CoefficientSign = 'positive' | 'negative' | 'zero' | 'unknown';

export type GruntzSignLimitExtractionContract = {
  supported: boolean;
  variable: string;
  resultKind?: 'zero' | 'finite' | 'infinity' | 'casewise';
  exactLatex?: string;
  signKnowledge?: CoefficientSign;
  series?: GruntzSeriesInWContract;
  cases?: LimitConditionalCaseRow[];
  detailSections?: DisplayDetailSection[];
  evidenceRows?: DisplayDetailLinePart[][];
  branchAssumptions?: GruntzBranchAssumption[];
  coefficientDrivers?: GruntzCoefficientDriver[];
  stopReason?: string;
};

function exactCoefficientSign(coefficient: string): CoefficientSign {
  const trimmed = coefficient.trim();
  if (trimmed === '0') {
    return 'zero';
  }
  const sign = trimmed.startsWith('-') ? 'negative' : 'positive';
  const unsigned = trimmed.startsWith('-') ? trimmed.slice(1) : trimmed;
  if (/^(?:1|[2-9]\d*)(?:\.\d+)?$/u.test(unsigned)) {
    return sign;
  }
  if (/^\\frac\{(?:1|[2-9]\d*)\}\{(?:1|[2-9]\d*)\}$/u.test(unsigned)) {
    return sign;
  }
  return 'unknown';
}

function invertSign(sign: CoefficientSign): CoefficientSign {
  if (sign === 'positive') {
    return 'negative';
  }
  if (sign === 'negative') {
    return 'positive';
  }
  return sign;
}

function signToInfinity(sign: CoefficientSign) {
  if (sign === 'positive') {
    return '\\infty';
  }
  if (sign === 'negative') {
    return '-\\infty';
  }
  return undefined;
}

function driverToCaseDriver(driver: GruntzCoefficientDriver): LimitAsymptoticBranchDriver {
  return {
    latex: driver.latex,
    source: 'leading-coefficient',
  };
}

function syntheticDriver(latex: string): GruntzCoefficientDriver {
  return {
    latex,
    facts: [],
    atomIds: [],
    branchConditions: [`${latex}>0`, `${latex}=0`, `${latex}<0`],
  };
}

function simpleLatinProductDrivers(coefficient: string) {
  const unsigned = coefficient.startsWith('-') ? coefficient.slice(1) : coefficient;
  if (!/^[a-z]{2,3}$/u.test(unsigned)) {
    return undefined;
  }
  const factors = [...unsigned];
  return new Set(factors).size === factors.length
    ? factors.map(syntheticDriver)
    : undefined;
}

function coefficientUsesDriver(coefficient: string, driver: GruntzCoefficientDriver) {
  return coefficient === driver.latex
    || coefficient === `-${driver.latex}`
    || coefficient.includes(driver.latex);
}

function activeCoefficientDrivers(coefficient: string, drivers: GruntzCoefficientDriver[]) {
  return simpleLatinProductDrivers(coefficient)
    ?? drivers.filter((driver) => coefficientUsesDriver(coefficient, driver));
}

function productOnlyCoefficient(coefficient: string, drivers: GruntzCoefficientDriver[]) {
  let rest = coefficient.startsWith('-') ? coefficient.slice(1) : coefficient;
  drivers.forEach((driver) => {
    rest = rest.split(driver.latex).join('');
  });
  rest = rest.replace(/[\\,\s*{}()]/gu, '');
  return rest === '' || rest === '1';
}

function combineSigns(signs: readonly CoefficientSign[]): CoefficientSign {
  if (signs.includes('zero')) {
    return 'zero';
  }
  if (signs.includes('unknown')) {
    return 'unknown';
  }
  const negativeCount = signs.filter((sign) => sign === 'negative').length;
  return negativeCount % 2 === 0 ? 'positive' : 'negative';
}

function branchCombinations(drivers: readonly GruntzCoefficientDriver[]) {
  const signs: CoefficientSign[] = ['positive', 'zero', 'negative'];
  return drivers.reduce<Array<Array<{ driver: GruntzCoefficientDriver; sign: CoefficientSign }>>>(
    (rows, driver) => rows.flatMap((row) => signs.map((sign) => [...row, { driver, sign }])),
    [[]],
  );
}

function signCondition(entry: { driver: GruntzCoefficientDriver; sign: CoefficientSign }): LimitAsymptoticCondition {
  const driver = driverToCaseDriver(entry.driver);
  if (entry.sign === 'positive') {
    return { kind: 'positive', driver };
  }
  if (entry.sign === 'negative') {
    return { kind: 'negative', driver };
  }
  return { kind: 'zero', driver };
}

function coefficientCaseRows(input: {
  coefficient: string;
  baseSign: CoefficientSign;
  drivers: GruntzCoefficientDriver[];
}): LimitConditionalCaseRow[] | undefined {
  const activeDrivers = activeCoefficientDrivers(input.coefficient, input.drivers);
  if (activeDrivers.length === 0) {
    return undefined;
  }
  if (
    activeDrivers.length > LIMIT_ASYMPTOTIC_BRANCH_DRIVER_CAP
    || !productOnlyCoefficient(input.coefficient, activeDrivers)
  ) {
    return undefined;
  }

  const signPrefix = input.coefficient.startsWith('-') ? invertSign(input.baseSign) : input.baseSign;
  return branchCombinations(activeDrivers).map((combination) => {
    const productSign = combineSigns([signPrefix, ...combination.map((entry) => entry.sign)]);
    const valueLatex = productSign === 'zero' ? '0' : signToInfinity(productSign) ?? '?';
    return {
      valueLatex,
      conditions: combination.map(signCondition),
      proofRows: [[
        limitTextPart('Leading coefficient '),
        limitMathPart(input.coefficient),
        limitTextPart(' controls the sign of the divergent Gruntz term.'),
      ]],
    };
  });
}

function extractionEvidenceRows(input: {
  coefficientLatex: string;
  order: number;
  resultLatex: string;
}): DisplayDetailLinePart[][] {
  return [[
    limitTextPart('Sign extraction: '),
    limitMathPart(`${input.coefficientLatex}w^{${input.order}}`),
    limitTextPart(' gives '),
    limitMathPart(input.resultLatex),
    limitTextPart(' as '),
    limitMathPart('w\\to0^+'),
    limitTextPart('.'),
  ]];
}

function extractionDetailSection(rows: DisplayDetailLinePart[][]): DisplayDetailSection {
  return limitDetailSection('Gruntz Sign Extraction', rows);
}

export function buildGruntzSignLimitExtractionContract(
  node: unknown,
  variable = 'x',
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
  options: GruntzMrvSetOptions = {},
): GruntzSignLimitExtractionContract {
  const series = buildGruntzSeriesInWContract(node, variable, targetKind, options);
  if (!series.supported || series.leadingOrder === undefined || !series.leadingCoefficientLatex) {
    return {
      supported: false,
      variable,
      series,
      stopReason: series.stopReason ?? 'Series-in-w did not produce a leading term.',
    };
  }

  const coefficient = series.leadingCoefficientLatex;
  const coefficientSign = exactCoefficientSign(coefficient);
  if (series.leadingOrder > 0) {
    const evidenceRows = extractionEvidenceRows({ coefficientLatex: coefficient, order: series.leadingOrder, resultLatex: '0' });
    return {
      supported: true,
      variable,
      resultKind: 'zero',
      exactLatex: '0',
      signKnowledge: 'zero',
      series,
      branchAssumptions: series.branchAssumptions,
      coefficientDrivers: series.coefficientDrivers,
      evidenceRows,
      detailSections: [extractionDetailSection(evidenceRows)],
    };
  }

  if (series.leadingOrder === 0) {
    const evidenceRows = extractionEvidenceRows({ coefficientLatex: coefficient, order: 0, resultLatex: coefficient });
    return {
      supported: true,
      variable,
      resultKind: 'finite',
      exactLatex: coefficient,
      signKnowledge: coefficientSign,
      series,
      branchAssumptions: series.branchAssumptions,
      coefficientDrivers: series.coefficientDrivers,
      evidenceRows,
      detailSections: [extractionDetailSection(evidenceRows)],
    };
  }

  const cases = coefficientCaseRows({
    coefficient,
    baseSign: coefficientSign === 'unknown' ? 'positive' : coefficientSign,
    drivers: series.coefficientDrivers ?? [],
  });
  if (cases) {
    const builtCases = buildLimitConditionalCases({ rows: cases });
    if (!builtCases.ok) {
      return {
        supported: false,
        variable,
        series,
        cases,
        branchAssumptions: series.branchAssumptions,
        coefficientDrivers: series.coefficientDrivers,
        detailSections: builtCases.detailSections,
        stopReason: builtCases.error,
      };
    }
    return {
      supported: true,
      variable,
      resultKind: 'casewise',
      exactLatex: builtCases.exactLatex,
      signKnowledge: 'unknown',
      series,
      cases,
      branchAssumptions: series.branchAssumptions,
      coefficientDrivers: series.coefficientDrivers,
      detailSections: builtCases.detailSections,
      evidenceRows: series.evidenceRows,
    };
  }

  const infinityLatex = signToInfinity(coefficientSign);
  if (!infinityLatex) {
    return {
      supported: false,
      variable,
      series,
      branchAssumptions: series.branchAssumptions,
      coefficientDrivers: series.coefficientDrivers,
      stopReason: 'The sign of the leading Gruntz coefficient is not known.',
    };
  }

  const evidenceRows = extractionEvidenceRows({
    coefficientLatex: coefficient,
    order: series.leadingOrder,
    resultLatex: infinityLatex,
  });
  return {
    supported: true,
    variable,
    resultKind: 'infinity',
    exactLatex: infinityLatex,
    signKnowledge: coefficientSign,
    series,
    branchAssumptions: series.branchAssumptions,
    coefficientDrivers: series.coefficientDrivers,
    evidenceRows,
    detailSections: [extractionDetailSection(evidenceRows)],
  };
}
