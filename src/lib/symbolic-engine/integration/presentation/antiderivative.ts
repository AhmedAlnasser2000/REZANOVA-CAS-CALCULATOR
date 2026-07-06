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

function normalizeSimpleFractionalPowerGroups(latex: string) {
  return latex
    .replace(
      /\\left\(\\sqrt\{([A-Za-z])\}\^\{(-?\d+)\}\\right\)/g,
      (_match, baseLatex: string, numeratorText: string) =>
        `${baseLatex}^{\\frac{${numeratorText}}{2}}`,
    )
    .replace(
      /\\left\(([A-Za-z])\^\{\\frac\{(-?\d+)\}\{(-?\d+)\}\}\\right\)/g,
      (_match, baseLatex: string, numeratorText: string, denominatorText: string) =>
        `${baseLatex}^{\\frac{${numeratorText}}{${denominatorText}}}`,
    );
}

function normalizePresentationLatex(latex: string) {
  return normalizeSimpleFractionalPowerGroups(
    normalizeFunctionWrapperGroups(
      normalizeReciprocalFractionProducts(
        normalizeNestedCoefficientFractions(
          normalizeScalarTimesMatchingFraction(
            normalizeCoefficientAdjacency(latex),
          ),
        ),
      ),
    ),
  );
}

function isVerified(
  backcheck: AntiderivativeBackcheck | undefined,
): backcheck is AntiderivativeBackcheck {
  return backcheck?.status === 'verified-exact'
    || backcheck?.status === 'verified-numeric-confidence';
}

function answerRowsFor(exactLatex: string): DisplayAnswerRowsReadback {
  return {
    rows: [
      { latex: exactLatex },
    ],
  };
}

function presentationDetail(input: {
  changedLatex: boolean;
  constantLatex: string;
  reusedExistingVerification: boolean;
}): DisplayDetailSection {
  const lines = [
    input.reusedExistingVerification
      ? `Added integration constant ${input.constantLatex} after the existing antiderivative verification.`
      : `Added integration constant ${input.constantLatex} after derivative backcheck.`,
  ];
  if (input.changedLatex) {
    lines.push('Canonical output was normalized for coefficient, fraction, and grouping readability.');
  }
  lines.push('Visible output is kept as one antiderivative expression; Copy Result uses the same parseable LaTeX.');
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
  const changedLatex = baseLatex !== input.exactLatex;
  const verification = changedLatex
    ? backcheckAntiderivative({
      antiderivativeLatex: exactLatex,
      integrand: input.integrand,
      variable: input.variable,
    })
    : input.verification;
  if (!isVerified(verification)) {
    return undefined;
  }

  const answerRows = answerRowsFor(exactLatex);
  return {
    exactLatex,
    answerRows,
    verification,
    detailSections: [presentationDetail({
      changedLatex,
      constantLatex,
      reusedExistingVerification: !changedLatex,
    })],
  };
}
