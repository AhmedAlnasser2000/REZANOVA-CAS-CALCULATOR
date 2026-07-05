import {
  buildExactScalarNode,
  normalizeExactScalar,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  boxLatex,
  divideByNumericCoefficient,
  multiplyLatex,
  wrapGroupedLatex,
} from '../patterns';
import { negateGeneratedLatex } from './generated-latex';
import { rationalApproximation } from './node-helpers';

export function scaleLatex(latex: string, scale: number) {
  if (Math.abs(scale - 1) < 1e-10) {
    return latex;
  }

  if (Math.abs(scale + 1) < 1e-10) {
    return negateGeneratedLatex(latex);
  }

  const rational = rationalApproximation(scale);
  if (rational) {
    const sign = rational.numerator < 0 ? '-' : '';
    const numerator = Math.abs(rational.numerator);
    if (rational.denominator === 1) {
      return `${sign}${multiplyLatex(String(numerator), latex)}`;
    }

    if (numerator === 1) {
      const divided = divideByNumericCoefficient(latex, rational.denominator);
      return sign ? negateGeneratedLatex(divided) : divided;
    }

    return `${sign}\\frac{${numerator}${wrapGroupedLatex(latex)}}{${rational.denominator}}`;
  }

  const reciprocal = 1 / scale;
  if (Math.abs(reciprocal - Math.round(reciprocal)) < 1e-10) {
    return divideByNumericCoefficient(latex, Math.round(reciprocal));
  }

  return multiplyLatex(boxLatex(scale), latex);
}

function canAttachCoefficientDirectly(latex: string) {
  return latex.startsWith('\\ln')
    || latex.startsWith('\\arctan')
    || latex.startsWith('\\frac')
    || /^[a-zA-Z](?:\^\{?[-+]?\d+\}?)?$/.test(latex);
}

export function coefficientTimesLatex(coefficientLatex: string, latex: string) {
  return canAttachCoefficientDirectly(latex)
    ? `${coefficientLatex}${latex}`
    : `${coefficientLatex}${wrapGroupedLatex(latex)}`;
}

export function scaleByExactScalar(latex: string, coefficient: ExactScalar) {
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === 0) {
    return '0';
  }

  if (normalized.numerator === 1 && normalized.denominator === 1) {
    return latex;
  }

  if (normalized.numerator === -1 && normalized.denominator === 1) {
    return canAttachCoefficientDirectly(latex) ? `-${latex}` : `-${wrapGroupedLatex(latex)}`;
  }

  if (normalized.denominator === 1) {
    return coefficientTimesLatex(boxLatex(buildExactScalarNode(normalized)), latex);
  }

  const sign = normalized.numerator < 0 ? '-' : '';
  const numerator = Math.abs(normalized.numerator);
  const coefficientLatex = numerator === 1
    ? `\\frac{1}{${normalized.denominator}}`
    : `\\frac{${numerator}}{${normalized.denominator}}`;

  return `${sign}${coefficientTimesLatex(coefficientLatex, latex)}`;
}
