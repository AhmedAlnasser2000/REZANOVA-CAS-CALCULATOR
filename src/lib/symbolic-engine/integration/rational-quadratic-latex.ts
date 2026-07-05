import {
  buildExactScalarNode,
  divideExactScalars,
  normalizeExactScalar,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { boxLatex } from '../patterns';

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(normalizeExactScalar(value)));
}

function exactScalarSignLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator === 0) {
    return '';
  }

  const absoluteLatex = exactScalarLatex({
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  });
  return normalized.numerator > 0 ? `+${absoluteLatex}` : `-${absoluteLatex}`;
}

export function affineQuadraticArgumentLatex(
  variable: string,
  linearCoefficient: ExactScalar,
  denominatorRoot: ExactScalar | undefined,
  denominatorLatex: string,
) {
  if (
    denominatorRoot
    && Math.abs(denominatorRoot.numerator / denominatorRoot.denominator - 2) < 1e-12
  ) {
    const halfB = divideExactScalars(linearCoefficient, { numerator: 2, denominator: 1 });
    const offset = halfB ? exactScalarSignLatex(halfB) : '';
    return `${variable}${offset}`;
  }

  const numerator = `2${variable}${exactScalarSignLatex(linearCoefficient)}`;
  if (
    denominatorRoot
    && Math.abs(denominatorRoot.numerator / denominatorRoot.denominator - 1) < 1e-12
  ) {
    return numerator;
  }

  return `\\frac{${numerator}}{${denominatorLatex}}`;
}
