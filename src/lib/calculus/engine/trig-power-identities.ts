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
const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };
const EXACT_MINUS_ONE: ExactScalar = { numerator: -1, denominator: 1 };

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

type PoweredTrigFactor = {
  head: 'Tan' | 'Sec' | 'Cot' | 'Csc';
  exponent: number;
  affine: AffineArgument;
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

function trigPowerLatex(head: PoweredTrigFactor['head'], affineLatex: string, exponent: number) {
  const command = head.toLowerCase();
  const call = `\\${command}\\left(${affineLatex}\\right)`;
  return exponent === 1 ? call : `${wrapGroupedLatex(call)}^{${exponent}}`;
}

function exactScaleForPower(coefficient: ExactScalar, affine: AffineArgument, denominator: number) {
  return divideByExact(coefficient, multiplyExactScalars(affine.slope, exact(denominator)));
}

function scaledTrigPowerTerm(
  coefficient: ExactScalar,
  affine: AffineArgument,
  denominator: number,
  head: PoweredTrigFactor['head'],
  exponent: number,
) {
  const scaled = exactScaleForPower(coefficient, affine, denominator);
  return scaled ? scaleLatexByExact(scaled, trigPowerLatex(head, affine.latex, exponent)) : undefined;
}

function tanPowerIntegral(exponent: number, affine: AffineArgument): string[] | undefined {
  if (exponent === 0) {
    const scaled = divideByExact(EXACT_ONE, affine.slope);
    const term = scaled ? scaleLatexByExact(scaled, wrapGroupedLatex(affine.latex)) : undefined;
    return term ? [term] : undefined;
  }

  if (exponent === 1) {
    const scaled = divideByExact(EXACT_MINUS_ONE, affine.slope);
    const term = scaled
      ? scaleLatexByExact(scaled, `\\ln\\left(\\cos\\left(${affine.latex}\\right)\\right)`)
      : undefined;
    return term ? [term] : undefined;
  }

  const leading = scaledTrigPowerTerm(EXACT_ONE, affine, exponent - 1, 'Tan', exponent - 1);
  const rest = tanPowerIntegral(exponent - 2, affine);
  return leading && rest ? [leading, ...rest.map((term) => `-${wrapGroupedLatex(term)}`)] : undefined;
}

function cotPowerIntegral(exponent: number, affine: AffineArgument): string[] | undefined {
  if (exponent === 0) {
    const scaled = divideByExact(EXACT_ONE, affine.slope);
    const term = scaled ? scaleLatexByExact(scaled, wrapGroupedLatex(affine.latex)) : undefined;
    return term ? [term] : undefined;
  }

  if (exponent === 1) {
    const scaled = divideByExact(EXACT_ONE, affine.slope);
    const term = scaled
      ? scaleLatexByExact(scaled, `\\ln\\left(\\sin\\left(${affine.latex}\\right)\\right)`)
      : undefined;
    return term ? [term] : undefined;
  }

  const leading = scaledTrigPowerTerm(EXACT_MINUS_ONE, affine, exponent - 1, 'Cot', exponent - 1);
  const rest = cotPowerIntegral(exponent - 2, affine);
  return leading && rest ? [leading, ...rest.map((term) => `-${wrapGroupedLatex(term)}`)] : undefined;
}

function evenSecPowerIntegral(tanExponent: number, secExponent: number, affine: AffineArgument) {
  const halfSec = secExponent / 2;
  const pieces: string[] = [];
  for (let index = 0; index <= halfSec - 1; index += 1) {
    const power = tanExponent + 2 * index + 1;
    const term = scaledTrigPowerTerm(exact(binomial(halfSec - 1, index)), affine, power, 'Tan', power);
    if (!term) {
      return undefined;
    }
    pieces.push(term);
  }
  return pieces;
}

function evenCscPowerIntegral(cotExponent: number, cscExponent: number, affine: AffineArgument) {
  const halfCsc = cscExponent / 2;
  const pieces: string[] = [];
  for (let index = 0; index <= halfCsc - 1; index += 1) {
    const power = cotExponent + 2 * index + 1;
    const term = scaledTrigPowerTerm(
      exact(-binomial(halfCsc - 1, index)),
      affine,
      power,
      'Cot',
      power,
    );
    if (!term) {
      return undefined;
    }
    pieces.push(term);
  }
  return pieces;
}

function oddTanMixedIntegral(tanExponent: number, secExponent: number, affine: AffineArgument) {
  const reduced = (tanExponent - 1) / 2;
  const pieces: string[] = [];
  for (let index = 0; index <= reduced; index += 1) {
    const sign = (reduced - index) % 2 === 1 ? -1 : 1;
    const power = secExponent + 2 * index;
    const term = scaledTrigPowerTerm(
      exact(sign * binomial(reduced, index)),
      affine,
      power,
      'Sec',
      power,
    );
    if (!term) {
      return undefined;
    }
    pieces.push(term);
  }
  return pieces;
}

function oddCotMixedIntegral(cotExponent: number, cscExponent: number, affine: AffineArgument) {
  const reduced = (cotExponent - 1) / 2;
  const pieces: string[] = [];
  for (let index = 0; index <= reduced; index += 1) {
    const sign = (reduced - index) % 2 === 1 ? 1 : -1;
    const power = cscExponent + 2 * index;
    const term = scaledTrigPowerTerm(
      exact(sign * binomial(reduced, index)),
      affine,
      power,
      'Csc',
      power,
    );
    if (!term) {
      return undefined;
    }
    pieces.push(term);
  }
  return pieces;
}

function parsePoweredTrigFactor(node: unknown, variable: string): PoweredTrigFactor | undefined {
  const base = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[1] : node;
  const exponentNode = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[2] : 1;
  const exponent = parsePositiveIntegerExponent(exponentNode);
  if (
    exponent === undefined
    || exponent < 1
    || exponent > 6
    || !isNodeArray(base)
    || base.length !== 2
    || !['Tan', 'Sec', 'Cot', 'Csc'].includes(String(base[0]))
  ) {
    return undefined;
  }

  const affine = parseAffineArgument(base[1], variable);
  return affine
    ? { head: base[0] as PoweredTrigFactor['head'], exponent, affine }
    : undefined;
}

function sameAffineArgument(left: AffineArgument, right: AffineArgument) {
  return JSON.stringify(left.argument) === JSON.stringify(right.argument);
}

function parseTanSecCotCscPowers(node: unknown, variable: string) {
  const factors = isNodeArray(node) && node[0] === 'Multiply' ? node.slice(1) : [node];
  const parsed = factors.map((factor) => parsePoweredTrigFactor(factor, variable));
  if (parsed.some((factor) => !factor)) {
    return undefined;
  }

  const trigFactors = parsed as PoweredTrigFactor[];
  const first = trigFactors[0];
  if (!first || trigFactors.some((factor) => !sameAffineArgument(first.affine, factor.affine))) {
    return undefined;
  }

  const powers = { tan: 0, sec: 0, cot: 0, csc: 0 };
  for (const factor of trigFactors) {
    if (factor.head === 'Tan') {
      powers.tan += factor.exponent;
    } else if (factor.head === 'Sec') {
      powers.sec += factor.exponent;
    } else if (factor.head === 'Cot') {
      powers.cot += factor.exponent;
    } else {
      powers.csc += factor.exponent;
    }
  }

  if ([powers.tan, powers.sec, powers.cot, powers.csc].some((power) => power > 6)) {
    return undefined;
  }

  if ((powers.tan > 0 || powers.sec > 0) && (powers.cot > 0 || powers.csc > 0)) {
    return undefined;
  }

  return { affine: first.affine, powers };
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

export function tryAffineTanSecCotCscPowerAntiderivative(node: unknown, variable: string) {
  const parsed = parseTanSecCotCscPowers(node, variable);
  if (!parsed) {
    return undefined;
  }

  const { affine, powers } = parsed;
  let pieces: string[] | undefined;
  if (powers.sec > 0 || powers.tan > 0) {
    if (powers.sec > 0 && powers.sec % 2 === 0) {
      pieces = evenSecPowerIntegral(powers.tan, powers.sec, affine);
    } else if (powers.tan > 0 && powers.tan % 2 === 1 && powers.sec > 0) {
      pieces = oddTanMixedIntegral(powers.tan, powers.sec, affine);
    } else if (powers.sec === 0) {
      pieces = tanPowerIntegral(powers.tan, affine);
    }
  } else if (powers.csc > 0 || powers.cot > 0) {
    if (powers.csc > 0 && powers.csc % 2 === 0) {
      pieces = evenCscPowerIntegral(powers.cot, powers.csc, affine);
    } else if (powers.cot > 0 && powers.cot % 2 === 1 && powers.csc > 0) {
      pieces = oddCotMixedIntegral(powers.cot, powers.csc, affine);
    } else if (powers.csc === 0) {
      pieces = cotPowerIntegral(powers.cot, affine);
    }
  }

  return pieces && pieces.length > 0 ? joinAdditiveLatex(pieces) : undefined;
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

function normalizeEvenSecCscPowers(node: unknown): { node: unknown; changed: boolean } {
  if (!isNodeArray(node)) {
    return { node, changed: false };
  }

  if (
    node[0] === 'Power'
    && node.length === 3
    && isNodeArray(node[1])
    && node[1].length === 2
    && (node[1][0] === 'Sec' || node[1][0] === 'Csc')
  ) {
    const exponent = parsePositiveIntegerExponent(node[2]);
    if (exponent !== undefined && exponent >= 2 && exponent <= 12 && exponent % 2 === 0) {
      const argument = node[1][1];
      const baseHead = node[1][0] === 'Sec' ? 'Tan' : 'Cot';
      const halfExponent = exponent / 2;
      const terms = Array.from({ length: halfExponent + 1 }, (_, index) => {
        if (index === 0) {
          return buildExactScalarNode(exact(binomial(halfExponent, index)));
        }

        const powerNode = ['Power', [baseHead, argument], 2 * index];
        const coefficient = exact(binomial(halfExponent, index));
        return coefficient.numerator === coefficient.denominator
          ? powerNode
          : normalizeAst(['Multiply', buildExactScalarNode(coefficient), powerNode]);
      });
      return {
        node: normalizeAst(['Add', ...terms]),
        changed: true,
      };
    }
  }

  let changed = false;
  const children = node.slice(1).map((child) => {
    const normalized = normalizeEvenSecCscPowers(child);
    changed ||= normalized.changed;
    return normalized.node;
  });

  return {
    node: changed ? normalizeAst([node[0], ...children]) : node,
    changed,
  };
}

export function normalizeTrigTanSecCotCscPowerIdentityPair(left: unknown, right: unknown) {
  const normalizedLeft = normalizeEvenSecCscPowers(left);
  const normalizedRight = normalizeEvenSecCscPowers(right);
  if (!normalizedLeft.changed && !normalizedRight.changed) {
    return undefined;
  }

  return {
    left: normalizedLeft.node,
    right: normalizedRight.node,
  };
}
