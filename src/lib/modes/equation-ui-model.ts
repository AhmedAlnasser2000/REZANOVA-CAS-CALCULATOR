import { formatNumber } from '../display/format';
import { trimHarmlessTrailingMathSpacing } from '../input/input-canonicalization';
import type { EquationScreen, PolynomialEquationView } from '../../types/calculator';

type PolynomialDegree = 2 | 3 | 4;

type PolynomialMeta = {
  degree: PolynomialDegree;
  title: string;
  coefficientLabels: string[];
};

export const POLYNOMIAL_VIEW_META: Record<PolynomialEquationView, PolynomialMeta> = {
  quadratic: {
    degree: 2,
    title: 'Quadratic',
    coefficientLabels: ['a', 'b', 'c'],
  },
  cubic: {
    degree: 3,
    title: 'Cubic',
    coefficientLabels: ['a', 'b', 'c', 'd'],
  },
  quartic: {
    degree: 4,
    title: 'Quartic',
    coefficientLabels: ['a', 'b', 'c', 'd', 'e'],
  },
};

export const DEFAULT_POLYNOMIAL_COEFFICIENTS: Record<PolynomialEquationView, number[]> = {
  quadratic: [1, -5, 6],
  cubic: [1, -6, 11, -6],
  quartic: [1, 0, -5, 0, 4],
};

export function normalizedPolynomialCoefficients(coefficients: number[], expectedLength: number) {
  return Array.from({ length: expectedLength }, (_, index) => {
    const value = coefficients[index];
    return Number.isFinite(value) ? value : 0;
  });
}

function termLatex(coefficient: number, power: number) {
  const absoluteValue = Math.abs(coefficient);
  const coefficientText = formatNumber(absoluteValue, 6);

  if (power === 0) {
    return coefficientText;
  }

  if (absoluteValue === 1) {
    return power === 1 ? 'x' : `x^{${power}}`;
  }

  return power === 1 ? `${coefficientText}x` : `${coefficientText}x^{${power}}`;
}

export function buildPolynomialEquationLatex(
  view: PolynomialEquationView,
  coefficients: number[],
) {
  const { degree } = POLYNOMIAL_VIEW_META[view];
  const normalized = normalizedPolynomialCoefficients(coefficients, degree + 1);
  const terms = normalized.reduce<string[]>((currentTerms, coefficient, index) => {
    if (Math.abs(coefficient) < 1e-10) {
      return currentTerms;
    }

    const sign = coefficient < 0 ? '-' : '+';
    const power = degree - index;
    const body = termLatex(coefficient, power);

    if (currentTerms.length === 0) {
      return [`${sign === '-' ? '-' : ''}${body}`];
    }

    return [...currentTerms, `${sign}${body}`];
  }, []);

  const leftSide = terms.length > 0 ? terms.join('') : '0';
  return `${leftSide}=0`;
}

export function equationInputLatexForScreen(
  equationScreen: EquationScreen,
  equationLatex: string,
  quadraticCoefficients: number[],
  cubicCoefficients: number[],
  quarticCoefficients: number[],
  polynomialSystem2Latex: readonly [string, string] = ['', ''],
) {
  if (equationScreen === 'symbolic') {
    return equationLatex;
  }

  if (equationScreen === 'quadratic') {
    return buildPolynomialEquationLatex('quadratic', quadraticCoefficients);
  }

  if (equationScreen === 'cubic') {
    return buildPolynomialEquationLatex('cubic', cubicCoefficients);
  }

  if (equationScreen === 'quartic') {
    return buildPolynomialEquationLatex('quartic', quarticCoefficients);
  }

  if (equationScreen === 'polynomialSystem2') {
    return polynomialSystem2Latex
      .map((entry) => trimHarmlessTrailingMathSpacing(entry.trim()))
      .filter(Boolean)
      .join('\\quad;\\quad');
  }

  return '';
}
