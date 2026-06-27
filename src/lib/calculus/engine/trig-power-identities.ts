import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  scaleExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';

const MAX_SIN_COS_POWER = 12;

type AffineArgument = {
  argument: unknown;
  latex: string;
  slope: ExactScalar;
};

type TrigExpansionTerm = {
  coefficient: ExactScalar;
  head: 'Sin' | 'Cos' | 'Constant';
  harmonic?: number;
};

function exact(numerator: number, denominator = 1): ExactScalar {
  return normalizeExactScalar({ numerator, denominator });
}

function binomial(n: number, k: number) {
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - index + 1)) / index;
  }
  return result;
}

function exactIntegerPower(base: number, exponent: number) {
  return base ** exponent;
}

function parsePositiveIntegerExponent(node: unknown) {
  if (typeof node === 'number' && Number.isInteger(node)) {
    return node;
  }

  const exactExponent = readExactScalarNode(node);
  if (exactExponent && exactExponent.denominator === 1) {
    return exactExponent.numerator;
  }

  return undefined;
}

function parseAffineArgument(node: unknown, variable: string): AffineArgument | undefined {
  const polynomial = parseExactPolynomial(node, variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  if (slope.numerator === 0) {
    return undefined;
  }

  return {
    argument: exactPolynomialToNode(polynomial),
    latex: exactPolynomialToLatex(polynomial),
    slope,
  };
}

function sinCosPowerExpansion(head: 'Sin' | 'Cos', exponent: number): TrigExpansionTerm[] | undefined {
  if (exponent < 3 || exponent > MAX_SIN_COS_POWER) {
    return undefined;
  }

  if (exponent % 2 === 0) {
    const halfExponent = exponent / 2;
    const denominator = exactIntegerPower(2, exponent);
    const terms: TrigExpansionTerm[] = [{
      coefficient: exact(binomial(exponent, halfExponent), denominator),
      head: 'Constant',
    }];

    for (let index = 0; index < halfExponent; index += 1) {
      const harmonic = exponent - 2 * index;
      const sign = head === 'Sin' && (halfExponent - index) % 2 === 1 ? -1 : 1;
      terms.push({
        coefficient: exact(sign * binomial(exponent, index), exactIntegerPower(2, exponent - 1)),
        head: 'Cos',
        harmonic,
      });
    }

    return terms;
  }

  const halfFloor = (exponent - 1) / 2;
  return Array.from({ length: halfFloor + 1 }, (_, index): TrigExpansionTerm => {
    const harmonic = exponent - 2 * index;
    const sign = head === 'Sin' && (halfFloor - index) % 2 === 1 ? -1 : 1;
    return {
      coefficient: exact(sign * binomial(exponent, index), exactIntegerPower(2, exponent - 1)),
      head,
      harmonic,
    };
  });
}

function harmonicArgument(argument: unknown, harmonic: number, variable: string) {
  const polynomial = parseExactPolynomial(argument, variable, 1);
  if (!polynomial) {
    return undefined;
  }

  return exactPolynomialToNode(scaleExactPolynomial(polynomial, exact(harmonic)));
}

function expansionTermNode(term: TrigExpansionTerm, affine: AffineArgument, variable: string): unknown | undefined {
  if (term.head === 'Constant') {
    return buildExactScalarNode(term.coefficient);
  }

  if (term.harmonic === undefined) {
    return undefined;
  }

  const argument = harmonicArgument(affine.argument, term.harmonic, variable);
  if (!argument) {
    return undefined;
  }

  const trigNode = [term.head, argument];
  const normalized = normalizeExactScalar(term.coefficient);
  if (normalized.numerator === normalized.denominator) {
    return trigNode;
  }

  if (normalized.numerator === -normalized.denominator) {
    return normalizeAst(['Multiply', -1, trigNode]);
  }

  return normalizeAst(['Multiply', buildExactScalarNode(normalized), trigNode]);
}

function expansionNode(head: 'Sin' | 'Cos', exponent: number, affine: AffineArgument, variable: string) {
  const terms = sinCosPowerExpansion(head, exponent);
  if (!terms) {
    return undefined;
  }

  const nodes = terms
    .map((term) => expansionTermNode(term, affine, variable))
    .filter((term): term is unknown => term !== undefined);
  return nodes.length === terms.length ? normalizeAst(['Add', ...nodes]) : undefined;
}

function wrapGroupedLatex(latex: string) {
  return /^[-+]?\w+(?:\^\{?[-+]?\d+\}?)?$/.test(latex) ? latex : `\\left(${latex}\\right)`;
}

function scaleLatexByExact(coefficient: ExactScalar, latex: string) {
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === 0) {
    return undefined;
  }

  if (normalized.numerator === normalized.denominator) {
    return latex;
  }

  if (normalized.numerator === -normalized.denominator) {
    return `-${wrapGroupedLatex(latex)}`;
  }

  const sign = normalized.numerator < 0 ? '-' : '';
  const absNumerator = Math.abs(normalized.numerator);
  const numeratorLatex = absNumerator === 1 ? latex : `${absNumerator}${wrapGroupedLatex(latex)}`;
  return `${sign}\\frac{${numeratorLatex}}{${normalized.denominator}}`;
}

function divideByExact(value: ExactScalar, divisor: ExactScalar) {
  return divideExactScalars(value, divisor);
}

function harmonicLatex(affineLatex: string, harmonic: number) {
  return harmonic === 1 ? affineLatex : `${harmonic}${wrapGroupedLatex(affineLatex)}`;
}

function integrateExpansionTerm(term: TrigExpansionTerm, affine: AffineArgument) {
  if (term.head === 'Constant') {
    const scaled = divideByExact(term.coefficient, affine.slope);
    return scaled ? scaleLatexByExact(scaled, wrapGroupedLatex(affine.latex)) : undefined;
  }

  if (term.harmonic === undefined) {
    return undefined;
  }

  const slopeHarmonic = multiplyExactScalars(affine.slope, exact(term.harmonic));
  const scaled = divideByExact(
    term.head === 'Sin' ? negateExactScalar(term.coefficient) : term.coefficient,
    slopeHarmonic,
  );
  if (!scaled) {
    return undefined;
  }

  const argumentLatex = harmonicLatex(affine.latex, term.harmonic);
  const antiderivative =
    term.head === 'Sin'
      ? `\\cos\\left(${argumentLatex}\\right)`
      : `\\sin\\left(${argumentLatex}\\right)`;
  return scaleLatexByExact(scaled, antiderivative);
}

function joinAdditiveLatex(parts: string[]) {
  return parts.reduce((joined, part, index) => {
    if (index === 0) {
      return part;
    }

    return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
  }, '');
}

export function tryAffineSinCosPowerAntiderivative(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) {
    return undefined;
  }

  const exponent = parsePositiveIntegerExponent(node[2]);
  const base = node[1];
  if (
    exponent === undefined
    || !isNodeArray(base)
    || base.length !== 2
    || (base[0] !== 'Sin' && base[0] !== 'Cos')
  ) {
    return undefined;
  }

  const affine = parseAffineArgument(base[1], variable);
  const terms = affine ? sinCosPowerExpansion(base[0] as 'Sin' | 'Cos', exponent) : undefined;
  if (!affine || !terms) {
    return undefined;
  }

  const pieces = terms
    .map((term) => integrateExpansionTerm(term, affine))
    .filter((term): term is string => Boolean(term));
  return pieces.length === terms.length ? joinAdditiveLatex(pieces) : undefined;
}

function normalizeSinCosPowers(node: unknown, variable: string): { node: unknown; changed: boolean } {
  if (!isNodeArray(node)) {
    return { node, changed: false };
  }

  if (node[0] === 'Power' && node.length === 3 && isNodeArray(node[1]) && node[1].length === 2) {
    const head = node[1][0];
    const exponent = parsePositiveIntegerExponent(node[2]);
    const affine = (head === 'Sin' || head === 'Cos') ? parseAffineArgument(node[1][1], variable) : undefined;
    const expanded = affine && exponent !== undefined
      ? expansionNode(head as 'Sin' | 'Cos', exponent, affine, variable)
      : undefined;
    if (expanded) {
      return { node: expanded, changed: true };
    }
  }

  let changed = false;
  const children = node.slice(1).map((child) => {
    const normalized = normalizeSinCosPowers(child, variable);
    changed ||= normalized.changed;
    return normalized.node;
  });

  return {
    node: changed ? normalizeAst([node[0], ...children]) : node,
    changed,
  };
}

export function normalizeTrigSinCosPowerIdentityPair(left: unknown, right: unknown, variable: string) {
  const normalizedLeft = normalizeSinCosPowers(left, variable);
  const normalizedRight = normalizeSinCosPowers(right, variable);
  if (!normalizedLeft.changed && !normalizedRight.changed) {
    return undefined;
  }

  return {
    left: normalizedLeft.node,
    right: normalizedRight.node,
  };
}
