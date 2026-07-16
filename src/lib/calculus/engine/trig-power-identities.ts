import {
  addExactScalars,
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
const MAX_PRODUCT_INDIVIDUAL_POWER = 8;
const MAX_PRODUCT_TOTAL_DEGREE = 12;
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

type LatexTerm = { coefficient: ExactScalar; latex: string };

export function exact(numerator: number, denominator = 1): ExactScalar {
  return normalizeExactScalar({ numerator, denominator });
}

export function binomial(n: number, k: number) {
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - index + 1)) / index;
  }
  return result;
}

function exactIntegerPower(base: number, exponent: number) {
  return base ** exponent;
}

export function parsePositiveIntegerExponent(node: unknown) {
  if (typeof node === 'number' && Number.isInteger(node)) {
    return node;
  }

  const exactExponent = readExactScalarNode(node);
  if (exactExponent && exactExponent.denominator === 1) {
    return exactExponent.numerator;
  }

  return undefined;
}

export function parseAffineArgument(node: unknown, variable: string): AffineArgument | undefined {
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

function sinCosPowerExpansionAny(head: 'Sin' | 'Cos', exponent: number): TrigExpansionTerm[] | undefined {
  if (exponent === 0) {
    return [{ coefficient: EXACT_ONE, head: 'Constant' }];
  }

  if (exponent === 1) {
    return [{ coefficient: EXACT_ONE, head, harmonic: 1 }];
  }

  if (exponent === 2) {
    return [
      { coefficient: exact(1, 2), head: 'Constant' },
      { coefficient: exact(head === 'Sin' ? -1 : 1, 2), head: 'Cos', harmonic: 2 },
    ];
  }

  return sinCosPowerExpansion(head, exponent);
}

function signedHarmonicTerm(
  head: 'Sin' | 'Cos',
  harmonic: number,
  coefficient: ExactScalar,
): TrigExpansionTerm | undefined {
  if (harmonic === 0) {
    return head === 'Cos' ? { coefficient, head: 'Constant' } : undefined;
  }

  if (harmonic < 0) {
    return {
      coefficient: head === 'Sin' ? negateExactScalar(coefficient) : coefficient,
      head,
      harmonic: Math.abs(harmonic),
    };
  }

  return { coefficient, head, harmonic };
}

function scaleExpansionTerm(term: TrigExpansionTerm, coefficient: ExactScalar): TrigExpansionTerm {
  return {
    ...term,
    coefficient: multiplyExactScalars(term.coefficient, coefficient),
  };
}

function productToSumTerms(left: TrigExpansionTerm, right: TrigExpansionTerm): TrigExpansionTerm[] {
  if (left.head === 'Constant') {
    return [scaleExpansionTerm(right, left.coefficient)];
  }
  if (right.head === 'Constant') {
    return [scaleExpansionTerm(left, right.coefficient)];
  }

  const coefficient = multiplyExactScalars(left.coefficient, right.coefficient);
  const half = multiplyExactScalars(coefficient, exact(1, 2));
  const leftHarmonic = left.harmonic ?? 0;
  const rightHarmonic = right.harmonic ?? 0;
  const terms: Array<TrigExpansionTerm | undefined> =
    left.head === 'Cos' && right.head === 'Cos'
      ? [
        signedHarmonicTerm('Cos', leftHarmonic - rightHarmonic, half),
        signedHarmonicTerm('Cos', leftHarmonic + rightHarmonic, half),
      ]
      : left.head === 'Sin' && right.head === 'Sin'
        ? [
          signedHarmonicTerm('Cos', leftHarmonic - rightHarmonic, half),
          signedHarmonicTerm('Cos', leftHarmonic + rightHarmonic, negateExactScalar(half)),
        ]
        : [
          signedHarmonicTerm('Sin', left.head === 'Sin'
            ? leftHarmonic + rightHarmonic
            : rightHarmonic + leftHarmonic, half),
          signedHarmonicTerm('Sin', left.head === 'Sin'
            ? leftHarmonic - rightHarmonic
            : rightHarmonic - leftHarmonic, half),
        ];

  return terms.filter((term): term is TrigExpansionTerm => term !== undefined);
}

function combineExpansionTerms(terms: TrigExpansionTerm[]) {
  const combined = new Map<string, TrigExpansionTerm>();
  for (const term of terms) {
    const key = term.head === 'Constant' ? 'Constant:0' : `${term.head}:${term.harmonic ?? 0}`;
    const existing = combined.get(key);
    const coefficient = existing
      ? addExactScalars(existing.coefficient, term.coefficient)
      : term.coefficient;
    combined.set(key, { ...term, coefficient: normalizeExactScalar(coefficient) });
  }

  return [...combined.values()].filter((term) => term.coefficient.numerator !== 0);
}

function sinCosProductExpansion(
  sinExponent: number,
  cosExponent: number,
): TrigExpansionTerm[] | undefined {
  if (
    sinExponent < 1
    || cosExponent < 1
    || sinExponent > MAX_PRODUCT_INDIVIDUAL_POWER
    || cosExponent > MAX_PRODUCT_INDIVIDUAL_POWER
    || sinExponent + cosExponent > MAX_PRODUCT_TOTAL_DEGREE
  ) {
    return undefined;
  }

  const sinExpansion = sinCosPowerExpansionAny('Sin', sinExponent);
  const cosExpansion = sinCosPowerExpansionAny('Cos', cosExponent);
  if (!sinExpansion || !cosExpansion) {
    return undefined;
  }

  return combineExpansionTerms(sinExpansion.flatMap((left) =>
    cosExpansion.flatMap((right) => productToSumTerms(left, right))));
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

export function expansionNode(head: 'Sin' | 'Cos', exponent: number, affine: AffineArgument, variable: string) {
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

function scaledNode(coefficient: ExactScalar, node: unknown): unknown {
  const normalized = normalizeExactScalar(coefficient);
  if (normalized.numerator === normalized.denominator) return node;
  if (normalized.numerator === -normalized.denominator) return ['Negate', node];
  return ['Multiply', buildExactScalarNode(normalized), node];
}

function integrateExpansionTermNode(
  term: TrigExpansionTerm,
  affine: AffineArgument,
  variable: string,
): unknown | undefined {
  if (term.head === 'Constant') {
    const coefficient = divideByExact(term.coefficient, affine.slope);
    return coefficient ? scaledNode(coefficient, affine.argument) : undefined;
  }
  if (term.harmonic === undefined) return undefined;
  const argument = harmonicArgument(affine.argument, term.harmonic, variable);
  const denominator = multiplyExactScalars(affine.slope, exact(term.harmonic));
  const coefficient = divideByExact(
    term.head === 'Sin' ? negateExactScalar(term.coefficient) : term.coefficient,
    denominator,
  );
  if (!argument || !coefficient) return undefined;
  return scaledNode(coefficient, [term.head === 'Sin' ? 'Cos' : 'Sin', argument]);
}

function joinAdditiveLatex(parts: string[]) {
  return parts.reduce((joined, part, index) => {
    if (index === 0) {
      return part;
    }

    return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
  }, '');
}

function combineLatexTerms(terms: LatexTerm[]) {
  const combined = new Map<string, ExactScalar>();
  for (const term of terms) {
    const existing = combined.get(term.latex);
    combined.set(
      term.latex,
      normalizeExactScalar(existing ? addExactScalars(existing, term.coefficient) : term.coefficient),
    );
  }

  return [...combined.entries()]
    .map(([latex, coefficient]) => ({ coefficient, latex }))
    .filter((term) => term.coefficient.numerator !== 0);
}

function scaleLatexTerm(term: LatexTerm, coefficient: ExactScalar): LatexTerm {
  return {
    ...term,
    coefficient: multiplyExactScalars(term.coefficient, coefficient),
  };
}

function latexTermsToSum(terms: LatexTerm[]) {
  const pieces = combineLatexTerms(terms)
    .map((term) => scaleLatexByExact(term.coefficient, term.latex))
    .filter((term): term is string => Boolean(term));
  return pieces.length > 0 ? joinAdditiveLatex(pieces) : undefined;
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

function scaledTrigPowerNode(
  coefficient: ExactScalar,
  affine: AffineArgument,
  denominator: number,
  head: PoweredTrigFactor['head'],
  exponent: number,
) {
  const scaled = exactScaleForPower(coefficient, affine, denominator);
  if (!scaled) return undefined;
  const trig = [head, structuredClone(affine.argument)];
  return scaledNode(scaled, exponent === 1 ? trig : ['Power', trig, exponent]);
}

function tanPowerIntegralNodes(exponent: number, affine: AffineArgument): unknown[] | undefined {
  if (exponent === 0) {
    const scaled = divideByExact(EXACT_ONE, affine.slope);
    return scaled ? [scaledNode(scaled, affine.argument)] : undefined;
  }
  if (exponent === 1) {
    const scaled = divideByExact(EXACT_MINUS_ONE, affine.slope);
    return scaled ? [scaledNode(scaled, ['Ln', ['Cos', affine.argument]])] : undefined;
  }
  const leading = scaledTrigPowerNode(EXACT_ONE, affine, exponent - 1, 'Tan', exponent - 1);
  const rest = tanPowerIntegralNodes(exponent - 2, affine);
  return leading && rest ? [leading, ...rest.map((term) => ['Negate', term])] : undefined;
}

function cotPowerIntegralNodes(exponent: number, affine: AffineArgument): unknown[] | undefined {
  if (exponent === 0) {
    const scaled = divideByExact(EXACT_ONE, affine.slope);
    return scaled ? [scaledNode(scaled, affine.argument)] : undefined;
  }
  if (exponent === 1) {
    const scaled = divideByExact(EXACT_ONE, affine.slope);
    return scaled ? [scaledNode(scaled, ['Ln', ['Sin', affine.argument]])] : undefined;
  }
  const leading = scaledTrigPowerNode(EXACT_MINUS_ONE, affine, exponent - 1, 'Cot', exponent - 1);
  const rest = cotPowerIntegralNodes(exponent - 2, affine);
  return leading && rest ? [leading, ...rest.map((term) => ['Negate', term])] : undefined;
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

function oddSecPowerTerms(exponent: number, affine: AffineArgument): LatexTerm[] | undefined {
  if (exponent === 1) {
    const coefficient = divideByExact(EXACT_ONE, affine.slope);
    return coefficient
      ? [{
        coefficient,
        latex: `\\ln\\left|\\sec\\left(${affine.latex}\\right)+\\tan\\left(${affine.latex}\\right)\\right|`,
      }]
      : undefined;
  }

  const denominator = multiplyExactScalars(affine.slope, exact(exponent - 1));
  const coefficient = divideByExact(EXACT_ONE, denominator);
  const restScale = exact(exponent - 2, exponent - 1);
  const rest = oddSecPowerTerms(exponent - 2, affine)?.map((term) => scaleLatexTerm(term, restScale));
  return coefficient && rest
    ? [
      {
        coefficient,
        latex: `${trigPowerLatex('Sec', affine.latex, exponent - 2)}\\tan\\left(${affine.latex}\\right)`,
      },
      ...rest,
    ]
    : undefined;
}

function oddCscPowerTerms(exponent: number, affine: AffineArgument): LatexTerm[] | undefined {
  if (exponent === 1) {
    const coefficient = divideByExact(EXACT_ONE, affine.slope);
    return coefficient
      ? [{
        coefficient,
        latex: `\\ln\\left|\\csc\\left(${affine.latex}\\right)-\\cot\\left(${affine.latex}\\right)\\right|`,
      }]
      : undefined;
  }

  const denominator = multiplyExactScalars(affine.slope, exact(exponent - 1));
  const coefficient = divideByExact(EXACT_MINUS_ONE, denominator);
  const restScale = exact(exponent - 2, exponent - 1);
  const rest = oddCscPowerTerms(exponent - 2, affine)?.map((term) => scaleLatexTerm(term, restScale));
  return coefficient && rest
    ? [
      {
        coefficient,
        latex: `${trigPowerLatex('Csc', affine.latex, exponent - 2)}\\cot\\left(${affine.latex}\\right)`,
      },
      ...rest,
    ]
    : undefined;
}

function evenTanOddSecIntegral(tanExponent: number, secExponent: number, affine: AffineArgument) {
  const halfTan = tanExponent / 2;
  const pieces: LatexTerm[] = [];
  for (let index = 0; index <= halfTan; index += 1) {
    const coefficient = exact((halfTan - index) % 2 === 0 ? binomial(halfTan, index) : -binomial(halfTan, index));
    const secPower = secExponent + 2 * index;
    const terms = oddSecPowerTerms(secPower, affine);
    if (!terms) {
      return undefined;
    }
    pieces.push(...terms.map((term) => scaleLatexTerm(term, coefficient)));
  }
  const latex = latexTermsToSum(pieces);
  return latex ? [latex] : undefined;
}

function evenCotOddCscIntegral(cotExponent: number, cscExponent: number, affine: AffineArgument) {
  const halfCot = cotExponent / 2;
  const pieces: LatexTerm[] = [];
  for (let index = 0; index <= halfCot; index += 1) {
    const coefficient = exact((halfCot - index) % 2 === 0 ? binomial(halfCot, index) : -binomial(halfCot, index));
    const cscPower = cscExponent + 2 * index;
    const terms = oddCscPowerTerms(cscPower, affine);
    if (!terms) {
      return undefined;
    }
    pieces.push(...terms.map((term) => scaleLatexTerm(term, coefficient)));
  }
  const latex = latexTermsToSum(pieces);
  return latex ? [latex] : undefined;
}

function parsePoweredTrigFactor(node: unknown, variable: string): PoweredTrigFactor | undefined {
  const base = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[1] : node;
  const exponentNode = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[2] : 1;
  const exponent = parsePositiveIntegerExponent(exponentNode);
  if (
    exponent === undefined
    || exponent < 1
    || exponent > MAX_PRODUCT_INDIVIDUAL_POWER
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

  if (
    [powers.tan, powers.sec, powers.cot, powers.csc].some((power) => power > MAX_PRODUCT_INDIVIDUAL_POWER)
    || powers.tan + powers.sec + powers.cot + powers.csc > MAX_PRODUCT_TOTAL_DEGREE
  ) {
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

export function tryAffineSinCosPowerAntiderivativeNode(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) return undefined;
  const exponent = parsePositiveIntegerExponent(node[2]);
  const base = node[1];
  if (
    exponent === undefined
    || !isNodeArray(base)
    || base.length !== 2
    || (base[0] !== 'Sin' && base[0] !== 'Cos')
  ) return undefined;
  const affine = parseAffineArgument(base[1], variable);
  const terms = affine ? sinCosPowerExpansion(base[0] as 'Sin' | 'Cos', exponent) : undefined;
  if (!affine || !terms) return undefined;
  const nodes = terms.map((term) => integrateExpansionTermNode(term, affine, variable));
  return nodes.some((entry) => entry === undefined)
    ? undefined
    : normalizeAst(['Add', ...nodes]);
}

function parseSinCosPowerFactor(node: unknown, variable: string) {
  const base = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[1] : node;
  const exponentNode = isNodeArray(node) && node[0] === 'Power' && node.length === 3 ? node[2] : 1;
  const exponent = parsePositiveIntegerExponent(exponentNode);
  if (
    exponent === undefined
    || exponent < 1
    || exponent > MAX_PRODUCT_INDIVIDUAL_POWER
    || !isNodeArray(base)
    || base.length !== 2
    || (base[0] !== 'Sin' && base[0] !== 'Cos')
  ) {
    return undefined;
  }

  const affine = parseAffineArgument(base[1], variable);
  return affine
    ? { head: base[0] as 'Sin' | 'Cos', exponent, affine }
    : undefined;
}

export function tryAffineSinCosProductPowerAntiderivative(node: unknown, variable: string) {
  const factors = isNodeArray(node) && node[0] === 'Multiply' ? node.slice(1) : [node];
  const parsed = factors.map((factor) => parseSinCosPowerFactor(factor, variable));
  if (parsed.some((factor) => !factor)) {
    return undefined;
  }

  const trigFactors = parsed as Array<{
    head: 'Sin' | 'Cos';
    exponent: number;
    affine: AffineArgument;
  }>;
  const first = trigFactors[0];
  if (!first || trigFactors.some((factor) => !sameAffineArgument(first.affine, factor.affine))) {
    return undefined;
  }

  const powers = trigFactors.reduce((sum, factor) => ({
    sin: sum.sin + (factor.head === 'Sin' ? factor.exponent : 0),
    cos: sum.cos + (factor.head === 'Cos' ? factor.exponent : 0),
  }), { sin: 0, cos: 0 });
  const terms = sinCosProductExpansion(powers.sin, powers.cos);
  if (!terms) {
    return undefined;
  }

  const pieces = terms
    .map((term) => integrateExpansionTerm(term, first.affine))
    .filter((term): term is string => Boolean(term));
  return pieces.length === terms.length ? joinAdditiveLatex(pieces) : undefined;
}

export function tryAffineSinCosProductPowerAntiderivativeNode(node: unknown, variable: string) {
  const factors = isNodeArray(node) && node[0] === 'Multiply' ? node.slice(1) : [node];
  const parsed = factors.map((factor) => parseSinCosPowerFactor(factor, variable));
  if (parsed.some((factor) => !factor)) return undefined;
  const trigFactors = parsed as Array<{
    head: 'Sin' | 'Cos';
    exponent: number;
    affine: AffineArgument;
  }>;
  const first = trigFactors[0];
  if (!first || trigFactors.some((factor) => !sameAffineArgument(first.affine, factor.affine))) {
    return undefined;
  }
  const powers = trigFactors.reduce((sum, factor) => ({
    sin: sum.sin + (factor.head === 'Sin' ? factor.exponent : 0),
    cos: sum.cos + (factor.head === 'Cos' ? factor.exponent : 0),
  }), { sin: 0, cos: 0 });
  const terms = sinCosProductExpansion(powers.sin, powers.cos);
  if (!terms) return undefined;
  const nodes = terms.map((term) => integrateExpansionTermNode(term, first.affine, variable));
  return nodes.some((entry) => entry === undefined)
    ? undefined
    : normalizeAst(['Add', ...nodes]);
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
    } else if (powers.sec > 0 && powers.sec % 2 === 1 && powers.tan % 2 === 0) {
      pieces = evenTanOddSecIntegral(powers.tan, powers.sec, affine);
    } else if (powers.sec === 0) {
      pieces = tanPowerIntegral(powers.tan, affine);
    }
  } else if (powers.csc > 0 || powers.cot > 0) {
    if (powers.csc > 0 && powers.csc % 2 === 0) {
      pieces = evenCscPowerIntegral(powers.cot, powers.csc, affine);
    } else if (powers.cot > 0 && powers.cot % 2 === 1 && powers.csc > 0) {
      pieces = oddCotMixedIntegral(powers.cot, powers.csc, affine);
    } else if (powers.csc > 0 && powers.csc % 2 === 1 && powers.cot % 2 === 0) {
      pieces = evenCotOddCscIntegral(powers.cot, powers.csc, affine);
    } else if (powers.csc === 0) {
      pieces = cotPowerIntegral(powers.cot, affine);
    }
  }

  return pieces && pieces.length > 0 ? joinAdditiveLatex(pieces) : undefined;
}

export function tryAffineTanSecCotCscPowerAntiderivativeNode(node: unknown, variable: string) {
  const parsed = parseTanSecCotCscPowers(node, variable);
  if (!parsed) return undefined;
  const { affine, powers } = parsed;
  let nodes: unknown[] | undefined;
  if (powers.sec > 0 || powers.tan > 0) {
    if (powers.sec > 0 && powers.sec % 2 === 0) {
      const halfSec = powers.sec / 2;
      nodes = Array.from({ length: halfSec }, (_, index) => {
        const power = powers.tan + 2 * index + 1;
        return scaledTrigPowerNode(
          exact(binomial(halfSec - 1, index)),
          affine,
          power,
          'Tan',
          power,
        );
      }).filter((entry): entry is unknown => entry !== undefined);
      if (nodes.length !== halfSec) return undefined;
    } else if (powers.tan > 0 && powers.tan % 2 === 1 && powers.sec > 0) {
      const reduced = (powers.tan - 1) / 2;
      nodes = Array.from({ length: reduced + 1 }, (_, index) => {
        const sign = (reduced - index) % 2 === 1 ? -1 : 1;
        const power = powers.sec + 2 * index;
        return scaledTrigPowerNode(
          exact(sign * binomial(reduced, index)), affine, power, 'Sec', power,
        );
      }).filter((entry): entry is unknown => entry !== undefined);
      if (nodes.length !== reduced + 1) return undefined;
    } else if (powers.sec === 0) {
      nodes = tanPowerIntegralNodes(powers.tan, affine);
    }
  } else if (powers.csc > 0 || powers.cot > 0) {
    if (powers.csc > 0 && powers.csc % 2 === 0) {
      const halfCsc = powers.csc / 2;
      nodes = Array.from({ length: halfCsc }, (_, index) => {
        const power = powers.cot + 2 * index + 1;
        return scaledTrigPowerNode(
          exact(-binomial(halfCsc - 1, index)), affine, power, 'Cot', power,
        );
      }).filter((entry): entry is unknown => entry !== undefined);
      if (nodes.length !== halfCsc) return undefined;
    } else if (powers.cot > 0 && powers.cot % 2 === 1 && powers.csc > 0) {
      const reduced = (powers.cot - 1) / 2;
      nodes = Array.from({ length: reduced + 1 }, (_, index) => {
        const sign = (reduced - index) % 2 === 1 ? 1 : -1;
        const power = powers.csc + 2 * index;
        return scaledTrigPowerNode(
          exact(sign * binomial(reduced, index)), affine, power, 'Csc', power,
        );
      }).filter((entry): entry is unknown => entry !== undefined);
      if (nodes.length !== reduced + 1) return undefined;
    } else if (powers.csc === 0) {
      nodes = cotPowerIntegralNodes(powers.cot, affine);
    }
  }
  return nodes && nodes.length > 0 ? normalizeAst(['Add', ...nodes]) : undefined;
}
