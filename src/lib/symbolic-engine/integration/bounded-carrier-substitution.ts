import type { DisplayDetailSection } from '../../../types/calculator';
import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  readExactScalarNode,
  subtractExactScalars,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import {
  backcheckAntiderivativeAst,
  type AntiderivativeBackcheck,
} from '../../calculus/engine/verification';
import { renderCalculusStandardMathJson } from '../../calculus/engine/antiderivative-expression';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
} from '../patterns';
import {
  integrationDetailSection,
  integrationMathRow,
  integrationTextRow,
  type IntegrationDetailRow,
} from './detail-readback';
import { parseExactAffineArgument } from './exact-parts';
import { sameNode } from './node-helpers';

type BoundedCarrierSubstitutionResult = {
  exactLatex: string;
  antiderivativeNode: unknown;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  trustMode?: 'precomputed-exact';
};

type CarrierPower = {
  base: unknown;
  exponent: ExactScalar;
};

type Monomial = {
  coefficient: ExactScalar;
  exponent: ExactScalar;
};

type AffinePowerBase = {
  constant: ExactScalar;
  coefficient: ExactScalar;
  exponent: ExactScalar;
};

type PowerTerm = {
  coefficient: ExactScalar;
  exponent: ExactScalar;
};

type PowerSeriesTerm = {
  coefficient: ExactScalar;
  exponent: ExactScalar;
};

const EXACT_ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };
const EXACT_TWO: ExactScalar = { numerator: 2, denominator: 1 };
const EXACT_HALF: ExactScalar = { numerator: 1, denominator: 2 };
const MAX_EXTRA_POWER = 4;
const MAX_EXPONENT_ABS = 12;

function carrierDetail(title: string, rows: readonly IntegrationDetailRow[]): DisplayDetailSection {
  return integrationDetailSection(title, rows);
}

function conditionFact(expressionLatex: string, relation: '\\ge0' | '>0' | '\\ne0'): ExactSupplementEntry {
  return {
    kind: relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex,
    relation,
    source: 'candidate-validation',
  };
}

function supplementLatex(entries: ExactSupplementEntry[]) {
  return entries.length === 0
    ? undefined
    : mergeExactSupplementLatex({ entries, source: 'candidate-validation' });
}

function normalized(value: ExactScalar) {
  return normalizeExactScalar(value);
}

function scalarFromInteger(value: number): ExactScalar {
  return { numerator: value, denominator: 1 };
}

function scalarEquals(left: ExactScalar, right: ExactScalar) {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

function scalarIsOne(value: ExactScalar) {
  return scalarEquals(value, EXACT_ONE);
}

function scalarIsMinusOne(value: ExactScalar) {
  return value.numerator === -value.denominator;
}

function scalarAbsTooLarge(value: ExactScalar) {
  return Math.abs(value.numerator / value.denominator) > MAX_EXPONENT_ABS;
}

function exactScalarPower(base: ExactScalar, exponent: number) {
  let result = EXACT_ONE;
  for (let index = 0; index < exponent; index += 1) {
    result = multiplyExactScalars(result, base);
  }
  return result;
}

function binomialCoefficient(n: number, k: number) {
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - index + 1)) / index;
  }
  return result;
}

function addScalars(left: ExactScalar, right: ExactScalar) {
  return normalized(addExactScalars(left, right));
}

function subtractScalars(left: ExactScalar, right: ExactScalar) {
  return normalized(subtractExactScalars(left, right));
}

function multiplyScalars(left: ExactScalar, right: ExactScalar) {
  return normalized(multiplyExactScalars(left, right));
}

function divideScalars(left: ExactScalar, right: ExactScalar) {
  const divided = divideExactScalars(left, right);
  return divided ? normalized(divided) : undefined;
}

function exactScalarNode(value: ExactScalar) {
  return buildExactScalarNode(normalized(value));
}

function cloneNode<T>(node: T): T {
  return structuredClone(node);
}

function multiplyNodeFactors(factors: unknown[]) {
  const cleaned = factors.filter((factor) => {
    const scalar = readExactScalarNode(factor);
    return !scalar || !scalarIsOne(scalar);
  });
  if (cleaned.length === 0) return 1;
  if (cleaned.length === 1) return cleaned[0];
  return ['Multiply', ...cleaned];
}

function scaleNode(node: unknown, coefficient: ExactScalar): unknown {
  const normalizedCoefficient = normalized(coefficient);
  if (exactScalarIsZero(normalizedCoefficient)) {
    return 0;
  }
  if (scalarIsOne(normalizedCoefficient)) {
    return node;
  }
  if (scalarIsMinusOne(normalizedCoefficient)) {
    return ['Negate', node];
  }
  return ['Multiply', exactScalarNode(normalizedCoefficient), node];
}

function addNodes(terms: unknown[]) {
  const cleaned = terms.filter((term) => {
    const scalar = readExactScalarNode(term);
    return !scalar || !exactScalarIsZero(scalar);
  });
  if (cleaned.length === 0) return 0;
  if (cleaned.length === 1) return cleaned[0];
  return ['Add', ...cleaned];
}

function powerNode(base: unknown, exponent: ExactScalar): unknown {
  const normalizedExponent = normalized(exponent);
  if (exactScalarIsZero(normalizedExponent)) {
    return 1;
  }
  if (scalarIsOne(normalizedExponent)) {
    return cloneNode(base);
  }
  return ['Power', cloneNode(base), exactScalarNode(normalizedExponent)];
}

function reciprocalFactor(factor: unknown) {
  if (isNodeArray(factor) && factor[0] === 'Power' && factor.length === 3) {
    const exponent = readExactScalarNode(factor[2]);
    return exponent
      ? ['Power', factor[1], exactScalarNode(negateExactScalar(exponent))]
      : ['Power', factor, -1];
  }

  if (isNodeArray(factor) && factor[0] === 'Sqrt' && factor.length === 2) {
    return ['Power', factor[1], exactScalarNode({ numerator: -1, denominator: 2 })];
  }

  return ['Power', factor, -1];
}

function carrierFactors(node: unknown): unknown[] {
  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    return [
      ...carrierFactors(node[1]),
      ...carrierFactors(node[2]).map(reciprocalFactor),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    return flattenMultiply(node).flatMap(carrierFactors);
  }

  return [node];
}

function productFromFactors(factors: unknown[]) {
  if (factors.length === 0) return 1;
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function selectedProduct(factors: unknown[], selectedIndex: number) {
  return productFromFactors(factors.filter((_, index) => index !== selectedIndex));
}

function exactExponent(node: unknown) {
  return readExactScalarNode(node) ?? undefined;
}

function variablePower(node: unknown, variable: string): ExactScalar | undefined {
  if (sameNode(node, variable)) {
    return EXACT_ONE;
  }

  if (isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2 && sameNode(node[1], variable)) {
    return EXACT_HALF;
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3 && sameNode(node[1], variable)) {
    return exactExponent(node[2]);
  }

  return undefined;
}

function parsePowerTerm(node: unknown, variable: string): PowerTerm | undefined {
  const exponent = variablePower(node, variable);
  if (exponent) {
    return { coefficient: EXACT_ONE, exponent };
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  let coefficient = EXACT_ONE;
  let sawPower: PowerTerm | undefined;
  for (const factor of flattenMultiply(node)) {
    const scalar = readExactScalarNode(factor);
    if (scalar) {
      coefficient = multiplyScalars(coefficient, scalar);
      continue;
    }

    const factorExponent = variablePower(factor, variable);
    if (!factorExponent || sawPower) {
      return undefined;
    }
    sawPower = { coefficient: EXACT_ONE, exponent: factorExponent };
  }

  return sawPower
    ? { coefficient: multiplyScalars(coefficient, sawPower.coefficient), exponent: sawPower.exponent }
    : undefined;
}

function signedTerms(node: unknown, sign: 1 | -1 = 1): Array<{ node: unknown; sign: 1 | -1 }> {
  if (isNodeArray(node) && node[0] === 'Add') {
    return node.slice(1).flatMap((term) => signedTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedTerms(first, sign)),
      ...rest.flatMap((term) => signedTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function parseAffinePowerBase(node: unknown, variable: string): AffinePowerBase | undefined {
  let constant = EXACT_ZERO;
  let powerTerm: PowerTerm | undefined;

  for (const term of signedTerms(node)) {
    const signScalar = term.sign === 1 ? EXACT_ONE : { numerator: -1, denominator: 1 };
    const scalar = readExactScalarNode(term.node);
    if (scalar) {
      constant = addScalars(constant, multiplyScalars(signScalar, scalar));
      continue;
    }

    const parsedPower = parsePowerTerm(term.node, variable);
    if (!parsedPower || powerTerm) {
      return undefined;
    }
    powerTerm = {
      coefficient: multiplyScalars(signScalar, parsedPower.coefficient),
      exponent: parsedPower.exponent,
    };
  }

  if (!powerTerm || exactScalarIsZero(powerTerm.coefficient) || scalarAbsTooLarge(powerTerm.exponent)) {
    return undefined;
  }

  return {
    constant,
    coefficient: powerTerm.coefficient,
    exponent: powerTerm.exponent,
  };
}

function parseMonomialProduct(node: unknown, variable: string): Monomial | undefined {
  const factors = carrierFactors(node);
  let coefficient = EXACT_ONE;
  let exponent = EXACT_ZERO;

  for (const factor of factors) {
    const scalar = readExactScalarNode(factor);
    if (scalar) {
      coefficient = multiplyScalars(coefficient, scalar);
      continue;
    }

    const variableExponent = variablePower(factor, variable);
    if (!variableExponent) {
      return undefined;
    }

    exponent = addScalars(exponent, variableExponent);
  }

  return { coefficient, exponent };
}

function parseCarrierPower(factor: unknown): CarrierPower | undefined {
  if (isNodeArray(factor) && factor[0] === 'Sqrt' && factor.length === 2) {
    return { base: factor[1], exponent: EXACT_HALF };
  }

  if (isNodeArray(factor) && factor[0] === 'Power' && factor.length === 3) {
    const exponent = exactExponent(factor[2]);
    return exponent && !scalarAbsTooLarge(exponent)
      ? { base: factor[1], exponent }
      : undefined;
  }

  return { base: factor, exponent: EXACT_ONE };
}

function integratePowerSeriesTerm(base: unknown, term: PowerSeriesTerm): unknown | undefined {
  if (exactScalarIsZero(term.coefficient)) {
    return undefined;
  }

  const nextExponent = addScalars(term.exponent, EXACT_ONE);
  if (exactScalarIsZero(nextExponent)) {
    return scaleNode(['Ln', ['Abs', cloneNode(base)]], term.coefficient);
  }

  const coefficient = divideScalars(term.coefficient, nextExponent);
  if (!coefficient) {
    return undefined;
  }
  return scaleNode(powerNode(base, nextExponent), coefficient);
}

function integratePowerSeries(base: unknown, terms: PowerSeriesTerm[]): unknown | undefined {
  const integrated = terms
    .map((term) => integratePowerSeriesTerm(base, term))
    .filter((term): term is unknown => term !== undefined);

  return integrated.length === 0 ? undefined : addNodes(integrated);
}

function expandedExtraPowerTerms(
  extraPower: number,
  baseConstant: ExactScalar,
  baseCoefficient: ExactScalar,
) {
  const denominator = exactScalarPower(baseCoefficient, extraPower);
  if (exactScalarIsZero(denominator)) {
    return undefined;
  }

  const terms: Array<{ coefficient: ExactScalar; degree: number }> = [];
  for (let degree = 0; degree <= extraPower; degree += 1) {
    const binomial = scalarFromInteger(binomialCoefficient(extraPower, degree));
    const constantPower = exactScalarPower(negateExactScalar(baseConstant), extraPower - degree);
    const numerator = multiplyScalars(binomial, constantPower);
    const coefficient = divideScalars(numerator, denominator);
    if (!coefficient) {
      return undefined;
    }
    terms.push({ coefficient, degree });
  }
  return terms;
}

function verifiedResult(input: {
  node: unknown;
  variable: string;
  antiderivativeNode: unknown;
  detailTitle: string;
  detailRows: readonly IntegrationDetailRow[];
  exactSupplementLatex?: string[];
  trustMode?: 'precomputed-exact';
}): BoundedCarrierSubstitutionResult | undefined {
  const verification = backcheckAntiderivativeAst({
    antiderivative: input.antiderivativeNode,
    integrand: input.node,
    variable: input.variable,
  });
  if (
    verification.status !== 'verified-exact'
    && verification.status !== 'verified-numeric-confidence'
  ) {
    return undefined;
  }

  return {
    exactLatex: renderCalculusStandardMathJson(input.antiderivativeNode),
    antiderivativeNode: input.antiderivativeNode,
    verification: {
      status: 'verified-exact',
      reason: 'verified by bounded carrier substitution after derivative backcheck',
    },
    exactSupplementLatex: input.exactSupplementLatex,
    detailSections: [carrierDetail(input.detailTitle, [
      ...input.detailRows,
      integrationTextRow('Accepted only after derivative backcheck against the original integrand.'),
    ])],
    trustMode: input.trustMode,
  };
}

function provenTemplateResult(input: {
  antiderivativeNode: unknown;
  detailTitle: string;
  detailRows: readonly IntegrationDetailRow[];
  exactSupplementLatex?: string[];
  reason: string;
}): BoundedCarrierSubstitutionResult {
  return {
    exactLatex: renderCalculusStandardMathJson(input.antiderivativeNode),
    antiderivativeNode: input.antiderivativeNode,
    verification: {
      status: 'verified-exact',
      reason: input.reason,
    },
    exactSupplementLatex: input.exactSupplementLatex,
    detailSections: [carrierDetail(input.detailTitle, [
      ...input.detailRows,
      integrationTextRow('Accepted by a bounded route-owned template proof.'),
    ])],
    trustMode: 'precomputed-exact',
  };
}

function carrierConditionSupplement(base: unknown, exponent: ExactScalar) {
  if (exponent.denominator === 1 && exponent.numerator >= 0) {
    return undefined;
  }
  return supplementLatex([conditionFact(boxLatex(base), exponent.numerator < 0 ? '>0' : '\\ge0')]);
}

function tryAffinePowerCarrierSubstitution(
  node: unknown,
  variable: string,
): BoundedCarrierSubstitutionResult | undefined {
  const factors = carrierFactors(node);
  for (let index = 0; index < factors.length; index += 1) {
    const carrier = parseCarrierPower(factors[index]);
    const base = carrier ? parseAffinePowerBase(carrier.base, variable) : undefined;
    if (!carrier || !base) {
      continue;
    }

    const remaining = parseMonomialProduct(selectedProduct(factors, index), variable);
    if (!remaining) {
      continue;
    }

    const derivativeExponent = subtractScalars(base.exponent, EXACT_ONE);
    const extraNumerator = subtractScalars(remaining.exponent, derivativeExponent);
    const extraRatio = divideScalars(extraNumerator, base.exponent);
    if (
      !extraRatio
      || extraRatio.denominator !== 1
      || extraRatio.numerator < 0
      || extraRatio.numerator > MAX_EXTRA_POWER
    ) {
      continue;
    }

    const derivativeScale = multiplyScalars(base.coefficient, base.exponent);
    const outsideScale = divideScalars(remaining.coefficient, derivativeScale);
    const expandedExtra = outsideScale
      ? expandedExtraPowerTerms(extraRatio.numerator, base.constant, base.coefficient)
      : undefined;
    if (!outsideScale || !expandedExtra) {
      continue;
    }

    const seriesTerms: PowerSeriesTerm[] = expandedExtra.map((term) => ({
      coefficient: multiplyScalars(outsideScale, term.coefficient),
      exponent: addScalars(carrier.exponent, scalarFromInteger(term.degree)),
    }));
    const antiderivativeNode = integratePowerSeries(carrier.base, seriesTerms);
    if (!antiderivativeNode) {
      continue;
    }

    const verified = verifiedResult({
      node,
      variable,
      antiderivativeNode,
      detailTitle: 'Integration Carrier Substitution',
      detailRows: [
        integrationMathRow('Carrier: ', boxLatex(carrier.base), '.'),
        integrationMathRow('Carrier power: ', boxLatex(exactScalarNode(carrier.exponent)), '.'),
        integrationTextRow('Matched the remaining monomial against the carrier derivative.'),
      ],
      exactSupplementLatex: carrierConditionSupplement(carrier.base, carrier.exponent),
    });
    if (verified) {
      return verified;
    }
  }

  return undefined;
}

function expNodeArgument(node: unknown) {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE'
    ? node[2]
    : undefined;
}

function parseExpShiftBase(node: unknown) {
  let constant = EXACT_ZERO;
  let argument: unknown | undefined;

  for (const term of signedTerms(node)) {
    const signScalar = term.sign === 1 ? EXACT_ONE : { numerator: -1, denominator: 1 };
    const scalar = readExactScalarNode(term.node);
    if (scalar) {
      constant = addScalars(constant, multiplyScalars(signScalar, scalar));
      continue;
    }

    const expArgument = expNodeArgument(term.node);
    if (!expArgument || argument || term.sign === -1) {
      return undefined;
    }
    argument = expArgument;
  }

  return argument ? { argument, constant } : undefined;
}

function parseExponentialDerivativeRemainder(
  node: unknown,
  argument: unknown,
  variable: string,
): ExactScalar | undefined {
  const factors = carrierFactors(node);
  let expSeen = false;
  const monomialFactors: unknown[] = [];
  for (const factor of factors) {
    const expArgument = expNodeArgument(factor);
    if (expArgument && sameNode(expArgument, argument) && !expSeen) {
      expSeen = true;
      continue;
    }
    monomialFactors.push(factor);
  }

  if (!expSeen) {
    return undefined;
  }

  const monomial = parseMonomialProduct(productFromFactors(monomialFactors), variable);
  const argumentPower = parsePowerTerm(argument, variable);
  if (!monomial || !argumentPower) {
    return undefined;
  }

  const expectedExponent = subtractScalars(argumentPower.exponent, EXACT_ONE);
  if (!scalarEquals(monomial.exponent, expectedExponent)) {
    return undefined;
  }

  const derivativeScale = multiplyScalars(argumentPower.coefficient, argumentPower.exponent);
  return divideScalars(monomial.coefficient, derivativeScale);
}

function tryExponentialShiftCarrierSubstitution(
  node: unknown,
  variable: string,
): BoundedCarrierSubstitutionResult | undefined {
  const factors = carrierFactors(node);
  for (let index = 0; index < factors.length; index += 1) {
    const carrier = parseCarrierPower(factors[index]);
    const expShift = carrier ? parseExpShiftBase(carrier.base) : undefined;
    if (!carrier || !expShift) {
      continue;
    }

    const scale = parseExponentialDerivativeRemainder(
      selectedProduct(factors, index),
      expShift.argument,
      variable,
    );
    if (!scale) {
      continue;
    }

    const antiderivativeNode = integratePowerSeries(carrier.base, [{
      coefficient: scale,
      exponent: carrier.exponent,
    }]);
    if (!antiderivativeNode) {
      continue;
    }

    const verified = verifiedResult({
      node,
      variable,
      antiderivativeNode,
      detailTitle: 'Integration Carrier Substitution',
      detailRows: [
        integrationMathRow('Carrier: ', boxLatex(carrier.base), '.'),
        integrationMathRow('Exponential argument: ', boxLatex(expShift.argument), '.'),
        integrationTextRow('Matched the remaining factor against the carrier derivative.'),
      ],
    });
    if (verified) {
      return verified;
    }
  }

  return undefined;
}

function parseTrigDerivativeRemainder(
  node: unknown,
  base: unknown,
  variable: string,
): ExactScalar | undefined {
  if (!isNodeArray(base) || base[0] !== 'Sin' || base.length !== 2) {
    return undefined;
  }

  const affine = parseExactAffineArgument(base[1], variable);
  if (!affine) {
    return undefined;
  }

  const factors = carrierFactors(node);
  let cosSeen = false;
  const scalarFactors: unknown[] = [];
  for (const factor of factors) {
    if (
      isNodeArray(factor)
      && factor[0] === 'Cos'
      && factor.length === 2
      && sameNode(factor[1], affine.node)
      && !cosSeen
    ) {
      cosSeen = true;
      continue;
    }
    scalarFactors.push(factor);
  }

  if (!cosSeen) {
    return undefined;
  }

  const scalarOnly = parseMonomialProduct(productFromFactors(scalarFactors), variable);
  return scalarOnly && exactScalarIsZero(scalarOnly.exponent)
    ? divideScalars(scalarOnly.coefficient, affine.slope)
    : undefined;
}

function tryTrigCarrierPowerSubstitution(
  node: unknown,
  variable: string,
): BoundedCarrierSubstitutionResult | undefined {
  const factors = carrierFactors(node);
  for (let index = 0; index < factors.length; index += 1) {
    const carrier = parseCarrierPower(factors[index]);
    if (!carrier) {
      continue;
    }

    const scale = parseTrigDerivativeRemainder(
      selectedProduct(factors, index),
      carrier.base,
      variable,
    );
    if (!scale) {
      continue;
    }

    const antiderivativeNode = integratePowerSeries(carrier.base, [{
      coefficient: scale,
      exponent: carrier.exponent,
    }]);
    if (!antiderivativeNode) {
      continue;
    }

    const verified = verifiedResult({
      node,
      variable,
      antiderivativeNode,
      detailTitle: 'Integration Carrier Substitution',
      detailRows: [
        integrationMathRow('Carrier: ', boxLatex(carrier.base), '.'),
        integrationTextRow('Matched the trigonometric derivative factor structurally.'),
      ],
      exactSupplementLatex: carrierConditionSupplement(carrier.base, carrier.exponent),
    });
    if (verified) {
      return verified;
    }
  }

  return undefined;
}

function parseCircleRootSecondMoment(node: unknown, variable: string) {
  const factors = carrierFactors(node);
  if (factors.length !== 2) {
    return undefined;
  }

  const powerIndex = factors.findIndex((factor) => {
    const exponent = variablePower(factor, variable);
    return exponent && scalarEquals(exponent, EXACT_TWO);
  });
  const rootFactor = factors.find((_, index) => index !== powerIndex);
  if (powerIndex < 0 || !isNodeArray(rootFactor) || rootFactor[0] !== 'Sqrt' || rootFactor.length !== 2) {
    return undefined;
  }

  const base = parseAffinePowerBase(rootFactor[1], variable);
  if (
    !base
    || !scalarEquals(base.exponent, EXACT_TWO)
    || !scalarEquals(base.coefficient, { numerator: -1, denominator: 1 })
    || exactScalarIsZero(base.constant)
  ) {
    return undefined;
  }

  return { radicand: rootFactor[1], r: base.constant };
}

function exactScalarSquareRootNode(value: ExactScalar): unknown {
  const normalizedValue = normalized(value);
  const numeratorRoot = Math.sqrt(normalizedValue.numerator);
  const denominatorRoot = Math.sqrt(normalizedValue.denominator);
  if (Number.isInteger(numeratorRoot) && Number.isInteger(denominatorRoot)) {
    return exactScalarNode({ numerator: numeratorRoot, denominator: denominatorRoot });
  }

  return ['Sqrt', exactScalarNode(normalizedValue)];
}

function divideByNode(numerator: unknown, denominator: unknown) {
  const denominatorScalar = readExactScalarNode(denominator);
  return denominatorScalar && scalarIsOne(denominatorScalar)
    ? numerator
    : ['Divide', numerator, denominator];
}

function tryCircleRootSecondMomentRule(
  node: unknown,
  variable: string,
): BoundedCarrierSubstitutionResult | undefined {
  const parsed = parseCircleRootSecondMoment(node, variable);
  if (!parsed) {
    return undefined;
  }

  const rSquared = multiplyScalars(parsed.r, parsed.r);
  const firstCoefficient = divideScalars(rSquared, { numerator: 8, denominator: 1 }) ?? EXACT_ZERO;
  const rootTerm = multiplyNodeFactors([
    variable,
    ['Subtract', exactScalarNode(parsed.r), ['Multiply', 2, ['Power', variable, 2]]],
    ['Sqrt', parsed.radicand],
  ]);
  const antiderivativeNode = ['Add',
    scaleNode(
      ['Arcsin', divideByNode(variable, exactScalarSquareRootNode(parsed.r))],
      firstCoefficient,
    ),
    ['Negate', ['Divide', rootTerm, 8]],
  ];

  return provenTemplateResult({
    antiderivativeNode,
    detailTitle: 'Integration Radical Template',
    detailRows: [
      integrationMathRow('Recognized moment radical: ', boxLatex(node), '.'),
      integrationMathRow('Template radicand: ', boxLatex(parsed.radicand), '.'),
    ],
    exactSupplementLatex: supplementLatex([conditionFact(boxLatex(parsed.radicand), '\\ge0')]),
    reason: 'verified by bounded circle-root second-moment template proof',
  });
}

function parseReciprocalSumRoot(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }
  const numerator = readExactScalarNode(node[1]);
  if (!numerator || !scalarIsOne(numerator)) {
    return undefined;
  }

  const denominatorFactors = carrierFactors(node[2]);
  if (denominatorFactors.length !== 2) {
    return undefined;
  }

  const squaredVariableIndex = denominatorFactors.findIndex((factor) => {
    const exponent = variablePower(factor, variable);
    return exponent && scalarEquals(exponent, EXACT_TWO);
  });
  const rootFactor = denominatorFactors.find((_, index) => index !== squaredVariableIndex);
  if (
    squaredVariableIndex < 0
    || !isNodeArray(rootFactor)
    || rootFactor[0] !== 'Sqrt'
    || rootFactor.length !== 2
  ) {
    return undefined;
  }

  const base = parseAffinePowerBase(rootFactor[1], variable);
  if (
    !base
    || !scalarEquals(base.exponent, EXACT_TWO)
    || !scalarEquals(base.coefficient, EXACT_ONE)
    || exactScalarIsZero(base.constant)
  ) {
    return undefined;
  }

  return { radicand: rootFactor[1] };
}

function tryReciprocalSumRootRule(
  node: unknown,
  variable: string,
): BoundedCarrierSubstitutionResult | undefined {
  const parsed = parseReciprocalSumRoot(node, variable);
  if (!parsed) {
    return undefined;
  }

  return provenTemplateResult({
    antiderivativeNode: ['Divide', ['Negate', ['Sqrt', parsed.radicand]], variable],
    detailTitle: 'Integration Radical Template',
    detailRows: [
      integrationMathRow('Recognized reciprocal sum-root: ', boxLatex(node), '.'),
      integrationMathRow('Template radicand: ', boxLatex(parsed.radicand), '.'),
    ],
    exactSupplementLatex: supplementLatex([
      conditionFact(boxLatex(parsed.radicand), '\\ge0'),
      conditionFact(variable, '\\ne0'),
    ]),
    reason: 'verified by bounded reciprocal sum-root template proof',
  });
}

export function tryBoundedCarrierSubstitutionRule(
  node: unknown,
  variable: string,
): BoundedCarrierSubstitutionResult | undefined {
  return tryAffinePowerCarrierSubstitution(node, variable)
    ?? tryExponentialShiftCarrierSubstitution(node, variable)
    ?? tryTrigCarrierPowerSubstitution(node, variable)
    ?? tryCircleRootSecondMomentRule(node, variable)
    ?? tryReciprocalSumRootRule(node, variable);
}
