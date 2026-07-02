import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../display/result/result-detail-lines';

type LimitValueLike = number | 'posInfinity' | 'negInfinity';

export function formatLimitNumberLatex(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-10) {
    return `${rounded}`;
  }

  for (let denominator = 2; denominator <= 24; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < 1e-10) {
      const sign = numerator < 0 ? '-' : '';
      return `${sign}\\frac{${Math.abs(numerator)}}{${denominator}}`;
    }
  }

  return `${value}`;
}

export function formatLimitValueLatex(value: LimitValueLike): string | undefined {
  if (value === 'posInfinity') {
    return '\\infty';
  }
  if (value === 'negInfinity') {
    return '-\\infty';
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return formatLimitNumberLatex(value);
}

export function limitTextPart(text: string): DisplayDetailLinePart {
  return textPart(text);
}

export function limitMathPart(latex: string): DisplayDetailLinePart {
  return mathPart(latex);
}

export function limitTextRow(text: string): DisplayDetailLinePart[] {
  return [limitTextPart(text)];
}

export function limitDetailSection(
  title: string,
  rows: readonly (readonly DisplayDetailLinePart[])[],
): DisplayDetailSection {
  return mixedDetailSection(title, rows);
}

function normalizeSmallNumericLatex(text: string) {
  const numeric = Number(text);
  return Number.isFinite(numeric)
    ? formatLimitNumberLatex(numeric)
    : text;
}

function stripFinalPeriod(text: string) {
  return text.endsWith('.') ? text.slice(0, -1) : text;
}

function looksLikeMathValue(text: string) {
  return /[\\=^/]/u.test(text);
}

function mathValueLineParts(
  prefix: string,
  value: string,
  suffix = '.',
): DisplayDetailLinePart[] {
  return [
    limitTextPart(prefix),
    limitMathPart(normalizeSmallNumericLatex(stripFinalPeriod(value.trim()))),
    limitTextPart(suffix),
  ];
}

function inferLimitDetailLineParts(line: string): DisplayDetailLinePart[] | undefined {
  const finalLimit = line.match(/^Final limit:\s*(.+)\.$/u);
  if (finalLimit) {
    return mathValueLineParts('Final limit: ', finalLimit[1]);
  }

  const originalForm = line.match(/^Original form:\s*(.+)\.$/u);
  if (originalForm) {
    return mathValueLineParts('Original form: ', originalForm[1]);
  }

  const rewrite = line.match(/^Rewrite:\s*(.+)\.$/u);
  if (rewrite) {
    return mathValueLineParts('Rewrite: ', rewrite[1]);
  }

  const rewriteEquivalent = line.match(/^Rewrite\/equivalent:\s*(.+)\.$/u);
  if (rewriteEquivalent) {
    const value = rewriteEquivalent[1];
    return looksLikeMathValue(value)
      ? mathValueLineParts('Rewrite/equivalent: ', value)
      : undefined;
  }

  const logTransform = line.match(/^Log transform:\s*(.+)\.$/u);
  if (logTransform) {
    return mathValueLineParts('Log transform: ', logTransform[1]);
  }

  const squeezeBound = line.match(/^Squeeze bound:\s*(.+)\.$/u);
  if (squeezeBound) {
    return mathValueLineParts('Squeeze bound: ', squeezeBound[1]);
  }

  const equivalent = line.match(/^Equivalent used: coefficient\s+(.+)\s+with net order\s+(-?\d+)\.$/u);
  if (equivalent) {
    return [
      limitTextPart('Equivalent used: coefficient '),
      limitMathPart(normalizeSmallNumericLatex(equivalent[1])),
      limitTextPart(' with net order '),
      limitMathPart(equivalent[2]),
      limitTextPart('.'),
    ];
  }

  const orderComparison = line.match(/^Order comparison: net order\s+(-?\d+)\.$/u);
  if (orderComparison) {
    return [
      limitTextPart('Order comparison: net order '),
      limitMathPart(orderComparison[1]),
      limitTextPart('.'),
    ];
  }

  const taylor = line.match(/^Taylor leading term: first nonzero derivative order\s+(\d+), coefficient\s+(.+)\.$/u);
  if (taylor) {
    return [
      limitTextPart('Taylor leading term: first nonzero derivative order '),
      limitMathPart(taylor[1]),
      limitTextPart(', coefficient '),
      limitMathPart(normalizeSmallNumericLatex(taylor[2])),
      limitTextPart('.'),
    ];
  }

  const keyEquivalent = line.match(/^Key calculation: coefficient\s+(.+)\s+with net order\s+(-?\d+)\.$/u);
  if (keyEquivalent) {
    return [
      limitTextPart('Key calculation: coefficient '),
      limitMathPart(normalizeSmallNumericLatex(keyEquivalent[1])),
      limitTextPart(' with net order '),
      limitMathPart(keyEquivalent[2]),
      limitTextPart('.'),
    ];
  }

  const conclusionLimit = line.match(/^Conclusion: final limit is\s+(.+)\.$/u);
  if (conclusionLimit) {
    return mathValueLineParts('Conclusion: final limit is ', conclusionLimit[1]);
  }

  const sideLimit = line.match(/^(Left side|Right side) tends to\s+(.+)\.$/u);
  if (sideLimit) {
    return [
      limitTextPart(`${sideLimit[1]} tends to `),
      limitMathPart(sideLimit[2]),
      limitTextPart('.'),
    ];
  }

  const evaluated = line.match(/^The differentiated quotient evaluates to\s+(.+)\s+at the target\.$/u);
  if (evaluated) {
    return mathValueLineParts('The differentiated quotient evaluates to ', evaluated[1], ' at the target.');
  }

  const stabilizes = line.match(/^The differentiated quotient stabilizes to\s+(.+)\s+at infinity\.$/u);
  if (stabilizes) {
    return mathValueLineParts('The differentiated quotient stabilizes to ', stabilizes[1], ' at infinity.');
  }

  const domainConstraint = line.match(/^(.+?) must stay (nonnegative|positive|nonzero)\. (Trust: .+)$/u);
  if (domainConstraint) {
    return [
      limitMathPart(domainConstraint[1]),
      limitTextPart(` must stay ${domainConstraint[2]}. ${domainConstraint[3]}`),
    ];
  }

  return undefined;
}

export function limitDetailSectionFromLines(
  title: string,
  lines: readonly string[],
): DisplayDetailSection {
  return limitDetailSection(
    title,
    lines.map((line) => inferLimitDetailLineParts(line) ?? limitTextRow(line)),
  );
}

export function limitMethodSection(...lines: string[]): DisplayDetailSection[] {
  return [limitDetailSectionFromLines('Limit Method', lines)];
}

export function withLimitDetailLineParts(
  sections: readonly DisplayDetailSection[] | undefined,
): DisplayDetailSection[] | undefined {
  if (!sections) {
    return undefined;
  }

  return sections.map((section) => {
    const lineParts = section.lines.map((line, index) => (
      section.lineParts?.[index]
        ?? inferLimitDetailLineParts(line)
        ?? []
    ));

    return {
      ...section,
      lineParts,
    };
  });
}
