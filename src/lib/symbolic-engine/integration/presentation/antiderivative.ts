import type {
  DisplayAnswerRowsReadback,
  DisplayDetailSection,
} from '../../../../types/calculator';
import {
  backcheckAntiderivative,
  type AntiderivativeBackcheck,
} from '../../../calculus/engine/verification';

type PresentationInput = {
  exactLatex: string;
  integrand: unknown;
  variable: string;
  verification?: AntiderivativeBackcheck;
};

export type IntegrationPresentation = {
  exactLatex: string;
  answerRows?: DisplayAnswerRowsReadback;
  verification: AntiderivativeBackcheck;
  detailSections: DisplayDetailSection[];
};

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function rationalLatex(numerator: number, denominator: number) {
  const sign = numerator * denominator < 0 ? '-' : '';
  const absNumerator = Math.abs(numerator);
  const absDenominator = Math.abs(denominator);
  const divisor = gcd(absNumerator, absDenominator);
  const normalizedNumerator = absNumerator / divisor;
  const normalizedDenominator = absDenominator / divisor;
  if (normalizedDenominator === 1) {
    return `${sign}${normalizedNumerator}`;
  }
  return `${sign}\\frac{${normalizedNumerator}}{${normalizedDenominator}}`;
}

function normalizeCoefficientAdjacency(latex: string) {
  return latex.replace(
    /(?<![A-Za-z])(-?\d+)\\frac\{(-?\d+)\}\{(-?\d+)\}/g,
    (_match, scalarText: string, numeratorText: string, denominatorText: string) =>
      rationalLatex(Number(scalarText) * Number(numeratorText), Number(denominatorText)),
  );
}

function normalizeNestedCoefficientFractions(latex: string) {
  return latex.replace(
    /\\frac\{\\frac\{(-?\d+)\}\{(-?\d+)\}\}\{(\\sqrt\{[^{}]+\}|[^{}]+)\}/g,
    (_match, numeratorText: string, denominatorText: string, denominatorLatex: string) => {
      const numerator = Number(numeratorText);
      const denominator = Number(denominatorText);
      if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return _match;
      }
      const sign = numerator * denominator < 0 ? '-' : '';
      return `${sign}\\frac{${Math.abs(numerator)}}{${Math.abs(denominator)}${denominatorLatex}}`;
    },
  );
}

function normalizeScalarTimesMatchingFraction(latex: string) {
  return latex.replace(
    /(?<![A-Za-z])(\d+)\\left\(\\frac\{((?:[^{}]|\{[^{}]*\})+)\}\{\1\}\\right\)/g,
    '$2',
  );
}

function normalizeReciprocalFractionProducts(latex: string) {
  return latex.replace(
    /\\frac\{1\}\{(\d+)\}\\frac\{([^{}]+)\}\{\\sqrt\{((?:[^{}]|\{[^{}]*\})+)\}\}/g,
    '\\frac{$2}{$1\\sqrt{$3}}',
  );
}

function normalizeFunctionWrapperGroups(latex: string) {
  let next = latex;
  let previous = '';
  while (next !== previous) {
    previous = next;
    next = next
      .replace(/\\left\(\\left\(([^()]*)\\right\)\\right\)/g, '\\left($1\\right)')
      .replace(/\\left\((\\(?:sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|arcsin|arccos|arctan|ln|log)\\left\([^()]*\\right\))\\right\)/g, '$1');
  }
  return next;
}

function normalizePresentationLatex(latex: string) {
  return normalizeFunctionWrapperGroups(
    normalizeReciprocalFractionProducts(
      normalizeNestedCoefficientFractions(
        normalizeScalarTimesMatchingFraction(
          normalizeCoefficientAdjacency(latex),
        ),
      ),
    ),
  );
}

function isVerified(backcheck: AntiderivativeBackcheck | undefined) {
  return backcheck?.status === 'verified-exact'
    || backcheck?.status === 'verified-numeric-confidence';
}

function additiveTerms(latex: string): string[] {
  const terms: string[] = [];
  let start = 0;
  let braceDepth = 0;
  let fenceDepth = 0;
  for (let index = 0; index < latex.length; index += 1) {
    if (latex.startsWith('\\left', index)) {
      fenceDepth += 1;
      index += '\\left'.length - 1;
      continue;
    }
    if (latex.startsWith('\\right', index)) {
      fenceDepth = Math.max(0, fenceDepth - 1);
      index += '\\right'.length - 1;
      continue;
    }

    const char = latex[index];
    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (braceDepth === 0 && fenceDepth === 0 && index > start && (char === '+' || char === '-')) {
      const term = latex.slice(start, index).trim();
      if (term) {
        terms.push(term);
      }
      start = index;
    }
  }

  const finalTerm = latex.slice(start).trim();
  if (finalTerm) {
    terms.push(finalTerm);
  }
  return terms;
}

function hasNestedDisplayRisk(latex: string) {
  return latex.includes('\\ln\\left|')
    || latex.includes('\\frac{\\frac')
    || /\\frac\{[^{}]*\\sqrt/u.test(latex)
    || (latex.match(/\\frac/g)?.length ?? 0) >= 3;
}

function answerRowsFor(baseLatex: string, constantLatex: string): DisplayAnswerRowsReadback {
  const terms = additiveTerms(baseLatex);
  const shouldSplit = terms.length >= 3 || baseLatex.length > 96 || hasNestedDisplayRisk(baseLatex);
  if (!shouldSplit) {
    return {
      rows: [
        { latex: `${baseLatex}+${constantLatex}` },
      ],
    };
  }

  return {
    rows: [
      ...terms.map((term) => ({ latex: term })),
      { latex: `+${constantLatex}` },
    ],
  };
}

function presentationDetail(input: {
  changedLatex: boolean;
  answerRowCount: number;
  constantLatex: string;
}): DisplayDetailSection {
  const lines = [
    `Added integration constant ${input.constantLatex} after derivative backcheck.`,
  ];
  if (input.changedLatex) {
    lines.push('Canonical output was normalized for coefficient, fraction, and grouping readability.');
  }
  if (input.answerRowCount > 1) {
    lines.push('Long visible output is split into answer rows; Copy Result keeps one parseable canonical expression.');
  } else if (input.answerRowCount === 1) {
    lines.push('Short visible output uses one canonical answer row so display order matches Copy Result.');
  }
  return {
    title: 'Integration Presentation',
    lines,
  };
}

export function presentVerifiedIndefiniteAntiderivative(
  input: PresentationInput,
): IntegrationPresentation | undefined {
  if (!isVerified(input.verification) || input.exactLatex.includes('\\begin{cases}')) {
    return undefined;
  }

  const constantLatex = input.variable === 'C' ? 'K' : 'C';
  const baseLatex = normalizePresentationLatex(input.exactLatex);
  const exactLatex = `${baseLatex}+${constantLatex}`;
  const verification = backcheckAntiderivative({
    antiderivativeLatex: exactLatex,
    integrand: input.integrand,
    variable: input.variable,
  });
  if (!isVerified(verification)) {
    return undefined;
  }

  const answerRows = answerRowsFor(baseLatex, constantLatex);
  return {
    exactLatex,
    answerRows,
    verification,
    detailSections: [presentationDetail({
      changedLatex: baseLatex !== input.exactLatex,
      answerRowCount: answerRows.rows.length,
      constantLatex,
    })],
  };
}
