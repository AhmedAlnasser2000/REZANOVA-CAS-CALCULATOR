import {
  buildExactScalarNode,
} from '../../algebra/polynomial-core';
import {
  addSymbolicCoefficients,
  divideSymbolicCoefficients,
  isSymbolicCoefficientZero,
  multiplySymbolicCoefficients,
  negateSymbolicCoefficient,
  parseSymbolicCoefficient,
  type SymbolicCoefficient,
} from '../primitives/coefficient-domain';
import {
  dependsOnVariable,
  flattenAdd,
  isNodeArray,
  termKey,
} from '../patterns';
import {
  evaluateNodeAt,
  isInteger,
  isNonZeroish,
  isZeroish,
} from './evaluation';
import { LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP } from './asymptotic-terms';

export type FiniteLocalSeriesLeadingTerm = {
  coefficient: SymbolicCoefficient;
  order: number;
  reason: string;
  notes?: string[];
};

type CoefficientSeries = Map<number, SymbolicCoefficient>;

const LOCAL_SERIES_DEPTH_CAP = 18;

function coefficientFromNode(node: unknown, variable: string) {
  const parsed = parseSymbolicCoefficient(node, variable);
  return parsed.kind === 'success' ? parsed.coefficient : undefined;
}

function exactNodeFromNumber(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-10) {
    return rounded;
  }

  for (let denominator = 2; denominator <= 24; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < 1e-10) {
      return buildExactScalarNode({ numerator, denominator });
    }
  }

  return undefined;
}

function coefficientFromNumber(value: number, variable: string) {
  const exact = exactNodeFromNumber(value);
  return exact === undefined ? undefined : coefficientFromNode(exact, variable);
}

function oneCoefficient(variable: string) {
  return coefficientFromNumber(1, variable);
}

function multiplyTermCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  const result = multiplySymbolicCoefficients(left, right, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function divideTermCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  const result = divideSymbolicCoefficients(left, right, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function negateTermCoefficient(coefficient: SymbolicCoefficient, variable: string) {
  const result = negateSymbolicCoefficient(coefficient, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function addTermCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  const result = addSymbolicCoefficients(left, right, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function rationalCoefficient(numerator: number, denominator: number, variable: string) {
  return coefficientFromNode(['Rational', numerator, denominator], variable);
}

function isNegatedNode(candidate: unknown, node: unknown) {
  return isNodeArray(candidate)
    && candidate[0] === 'Negate'
    && candidate.length === 2
    && termKey(candidate[1]) === termKey(node);
}

export function matchExpMinusOneMinusInner(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return undefined;
  }

  const terms = flattenAdd(node);
  const expTerm = terms.find((term) => (
    isNodeArray(term)
    && term[0] === 'Power'
    && term.length === 3
    && term[1] === 'ExponentialE'
  ));
  if (!isNodeArray(expTerm) || expTerm.length !== 3) {
    return undefined;
  }

  const inner = expTerm[2];
  const hasMinusOne = terms.some((term) => term === -1);
  const hasMinusInner = terms.some((term) => isNegatedNode(term, inner));
  return hasMinusOne && hasMinusInner && terms.length === 3 ? inner : undefined;
}

export function matchLogOnePlusMinusInner(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return undefined;
  }

  const terms = flattenAdd(node);
  const logTerm = terms.find((term) => (
    isNodeArray(term)
    && (term[0] === 'Ln' || term[0] === 'Log')
    && term.length === 2
  ));
  if (!isNodeArray(logTerm) || logTerm.length !== 2) {
    return undefined;
  }

  const inner = matchOnePlus(logTerm[1]);
  if (!inner) {
    return undefined;
  }
  const hasMinusInner = terms.some((term) => isNegatedNode(term, inner));
  return hasMinusInner && terms.length === 2 ? inner : undefined;
}

function matchOnePlus(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  const oneIndex = terms.findIndex((term) => term === 1);
  if (oneIndex === -1 || terms.length !== 2) {
    return null;
  }

  return terms[1 - oneIndex];
}

function setSeriesCoefficient(
  series: CoefficientSeries,
  order: number,
  coefficient: SymbolicCoefficient,
  variable: string,
) {
  if (order > LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP) {
    return false;
  }
  const existing = series.get(order);
  const next = existing
    ? addTermCoefficients(existing, coefficient, variable)
    : coefficient;
  if (!next) {
    return false;
  }
  if (isSymbolicCoefficientZero(next)) {
    series.delete(order);
  } else {
    series.set(order, next);
  }
  return true;
}

function negateSeries(series: CoefficientSeries, variable: string): CoefficientSeries | undefined {
  const result: CoefficientSeries = new Map();
  for (const [order, coefficient] of series) {
    const negated = negateTermCoefficient(coefficient, variable);
    if (!negated || !setSeriesCoefficient(result, order, negated, variable)) {
      return undefined;
    }
  }
  return result;
}

function addSeries(seriesList: CoefficientSeries[], variable: string): CoefficientSeries | undefined {
  const result: CoefficientSeries = new Map();
  for (const series of seriesList) {
    for (const [order, coefficient] of series) {
      if (!setSeriesCoefficient(result, order, coefficient, variable)) {
        return undefined;
      }
    }
  }
  return result;
}

function multiplySeries(
  left: CoefficientSeries,
  right: CoefficientSeries,
  variable: string,
): CoefficientSeries | undefined {
  const result: CoefficientSeries = new Map();
  for (const [leftOrder, leftCoefficient] of left) {
    for (const [rightOrder, rightCoefficient] of right) {
      const order = leftOrder + rightOrder;
      if (order > LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP) {
        continue;
      }
      const coefficient = multiplyTermCoefficients(leftCoefficient, rightCoefficient, variable);
      if (!coefficient || !setSeriesCoefficient(result, order, coefficient, variable)) {
        return undefined;
      }
    }
  }
  return result;
}

function divideSeriesByMonomial(
  numerator: CoefficientSeries,
  denominator: CoefficientSeries,
  variable: string,
): CoefficientSeries | undefined {
  if (denominator.size !== 1) {
    return undefined;
  }
  const [[denominatorOrder, denominatorCoefficient]] = [...denominator];
  const result: CoefficientSeries = new Map();
  for (const [order, coefficient] of numerator) {
    const divided = divideTermCoefficients(coefficient, denominatorCoefficient, variable);
    if (!divided || !setSeriesCoefficient(result, order - denominatorOrder, divided, variable)) {
      return undefined;
    }
  }
  return result;
}

function oneSeries(variable: string): CoefficientSeries | undefined {
  const one = oneCoefficient(variable);
  return one ? new Map([[0, one]]) : undefined;
}

function powerSeries(
  series: CoefficientSeries,
  exponent: number,
  variable: string,
): CoefficientSeries | undefined {
  if (exponent < 0) {
    return undefined;
  }
  let result = oneSeries(variable);
  if (!result) {
    return undefined;
  }
  for (let index = 0; index < exponent; index += 1) {
    result = multiplySeries(result, series, variable);
    if (!result) {
      return undefined;
    }
  }
  return result;
}

function factorial(value: number) {
  let product = 1;
  for (let index = 2; index <= value; index += 1) {
    product *= index;
  }
  return product;
}

function addScaledPower(
  result: CoefficientSeries,
  input: CoefficientSeries,
  exponent: number,
  numerator: number,
  denominator: number,
  variable: string,
) {
  const power = powerSeries(input, exponent, variable);
  const scalar = rationalCoefficient(numerator, denominator, variable);
  if (!power || !scalar) {
    return false;
  }
  for (const [order, coefficient] of power) {
    const scaled = multiplyTermCoefficients(coefficient, scalar, variable);
    if (!scaled || !setSeriesCoefficient(result, order, scaled, variable)) {
      return false;
    }
  }
  return true;
}

function composeTaylorSeries(
  input: CoefficientSeries,
  coefficients: Array<{ order: number; numerator: number; denominator: number }>,
  variable: string,
) {
  const result: CoefficientSeries = new Map();
  for (const coefficient of coefficients) {
    if (!addScaledPower(result, input, coefficient.order, coefficient.numerator, coefficient.denominator, variable)) {
      return undefined;
    }
  }
  return result;
}

function subtractOneFromSeries(series: CoefficientSeries, variable: string) {
  const one = oneCoefficient(variable);
  const negatedOne = one ? negateTermCoefficient(one, variable) : undefined;
  if (!negatedOne) {
    return undefined;
  }
  const result = new Map(series);
  return setSeriesCoefficient(result, 0, negatedOne, variable) ? result : undefined;
}

function hasZeroConstantTerm(series: CoefficientSeries) {
  return !series.has(0);
}

function localSeries(
  node: unknown,
  target: number,
  variable: string,
  depth = 0,
): CoefficientSeries | undefined {
  if (depth > LOCAL_SERIES_DEPTH_CAP) {
    return undefined;
  }

  const direct = evaluateNodeAt(node, target, variable);
  if (direct !== undefined && isNonZeroish(direct)) {
    const coefficient = coefficientFromNumber(direct, variable);
    return coefficient ? new Map([[0, coefficient]]) : undefined;
  }

  if (!dependsOnVariable(node, variable)) {
    const coefficient = coefficientFromNode(node, variable);
    return coefficient ? new Map([[0, coefficient]]) : undefined;
  }

  if (target === 0 && node === variable && isZeroish(direct)) {
    const coefficient = oneCoefficient(variable);
    return coefficient ? new Map([[1, coefficient]]) : undefined;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = localSeries(node[1], target, variable, depth + 1);
    return child ? negateSeries(child, variable) : undefined;
  }

  if (node[0] === 'Add') {
    const terms = node.slice(1).map((child) => localSeries(child, target, variable, depth + 1));
    return terms.every(Boolean) ? addSeries(terms as CoefficientSeries[], variable) : undefined;
  }

  if (node[0] === 'Multiply') {
    const factors = node.slice(1).map((child) => localSeries(child, target, variable, depth + 1));
    if (!factors.every(Boolean)) {
      return undefined;
    }
    let result = oneSeries(variable);
    if (!result) {
      return undefined;
    }
    for (const factor of factors as CoefficientSeries[]) {
      result = multiplySeries(result, factor, variable);
      if (!result) {
        return undefined;
      }
    }
    return result;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = localSeries(node[1], target, variable, depth + 1);
    const denominator = localSeries(node[2], target, variable, depth + 1);
    return numerator && denominator ? divideSeriesByMonomial(numerator, denominator, variable) : undefined;
  }

  if (node[0] === 'Power' && node.length === 3 && isInteger(node[2])) {
    const base = localSeries(node[1], target, variable, depth + 1);
    return base ? powerSeries(base, node[2], variable) : undefined;
  }

  if (node[0] === 'Sin' && node.length === 2) {
    const inner = localSeries(node[1], target, variable, depth + 1);
    return inner
      ? composeTaylorSeries(inner, [
          { order: 1, numerator: 1, denominator: 1 },
          { order: 3, numerator: -1, denominator: 6 },
          { order: 5, numerator: 1, denominator: 120 },
          { order: 7, numerator: -1, denominator: 5040 },
          { order: 9, numerator: 1, denominator: 362880 },
        ], variable)
      : undefined;
  }

  if (node[0] === 'Tan' && node.length === 2) {
    const inner = localSeries(node[1], target, variable, depth + 1);
    return inner
      ? composeTaylorSeries(inner, [
          { order: 1, numerator: 1, denominator: 1 },
          { order: 3, numerator: 1, denominator: 3 },
          { order: 5, numerator: 2, denominator: 15 },
          { order: 7, numerator: 17, denominator: 315 },
          { order: 9, numerator: 62, denominator: 2835 },
        ], variable)
      : undefined;
  }

  if (node[0] === 'Cos' && node.length === 2) {
    const inner = localSeries(node[1], target, variable, depth + 1);
    return inner
      ? composeTaylorSeries(inner, [
          { order: 0, numerator: 1, denominator: 1 },
          { order: 2, numerator: -1, denominator: 2 },
          { order: 4, numerator: 1, denominator: 24 },
          { order: 6, numerator: -1, denominator: 720 },
          { order: 8, numerator: 1, denominator: 40320 },
          { order: 10, numerator: -1, denominator: 3628800 },
        ], variable)
      : undefined;
  }

  if (node[0] === 'Power' && node.length === 3 && node[1] === 'ExponentialE') {
    const inner = localSeries(node[2], target, variable, depth + 1);
    if (!inner) {
      return undefined;
    }
    const result: CoefficientSeries = new Map();
    for (let order = 0; order <= LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP; order += 1) {
      if (!addScaledPower(result, inner, order, 1, factorial(order), variable)) {
        return undefined;
      }
    }
    return result;
  }

  if ((node[0] === 'Ln' || node[0] === 'Log') && node.length === 2) {
    const argument = localSeries(node[1], target, variable, depth + 1);
    const small = argument ? subtractOneFromSeries(argument, variable) : undefined;
    if (!small || !hasZeroConstantTerm(small)) {
      return undefined;
    }
    const result: CoefficientSeries = new Map();
    for (let order = 1; order <= LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP; order += 1) {
      const numerator = order % 2 === 0 ? -1 : 1;
      if (!addScaledPower(result, small, order, numerator, order, variable)) {
        return undefined;
      }
    }
    return result;
  }

  return undefined;
}

export function leadingTermFromLocalSeries(
  node: unknown,
  target: number,
  variable: string,
): FiniteLocalSeriesLeadingTerm | undefined {
  const series = localSeries(node, target, variable);
  if (!series || series.size === 0) {
    return undefined;
  }
  const [order, coefficient] = [...series]
    .sort(([left], [right]) => left - right)[0];
  return {
    coefficient,
    order,
    reason: 'selected first surviving term from a capped symbolic local series after cancellation',
    notes: [
      `Recursive leading term: expanded a capped symbolic local series through order ${LIMIT_ASYMPTOTIC_TAYLOR_ORDER_CAP}.`,
    ],
  };
}
