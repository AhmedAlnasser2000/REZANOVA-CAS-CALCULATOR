import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import {
  addExactScalars,
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  exactPolynomialDegree,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  readExactScalarNode,
  parseExactPolynomial,
  type ExactScalar,
  type ExactPolynomial,
} from '../../algebra/polynomial-core';
import { quadraticRootNodes } from '../../algebra/polynomial-factor/quadratic';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import { solveSymbolicCarrierCoefficientSpecialForm } from './special-form-symbolic-carrier';
import {
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isOneNode,
  isZeroNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from './math-json';
import {
  createExactFiniteRoot,
  createRootSet,
} from '../roots/representation';
import { buildCompactRootReadback } from '../roots/readback';

const ce = new ComputeEngine();
const MAX_SPECIAL_FORM_TOTAL_DEGREE = 12;
const SOURCE = 'equation-special-form-roots';
const EXACT_ZERO = { numerator: 0, denominator: 1 };
const EXACT_ONE = { numerator: 1, denominator: 1 };

const {
  addNodes,
} = createArithmeticHelpers(simplifyNode);

export type ParameterizedSpecialFormRootsStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-special-form'
  | 'total-degree-limit'
  | 'symbolic-carrier-coefficients'
  | 'unsupported-carrier-shape'
  | 'no-real-roots';

export type ParameterizedSpecialFormRootsSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type ParameterizedSpecialFormRootsStop = {
  kind: 'unsupported';
  reason: ParameterizedSpecialFormRootsStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedSpecialFormRootsResult =
  | ParameterizedSpecialFormRootsSuccess
  | ParameterizedSpecialFormRootsStop;

export type ParameterizedSpecialFormRootsOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

function stop(
  reason: ParameterizedSpecialFormRootsStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedSpecialFormRootsStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) =>
      symbol.name !== target
      && (
        symbol.identifierKind === 'named-variable'
        || (symbol.identifierKind === 'single-symbol-variable' && /^[A-Za-z]$/.test(symbol.name))
      ))
    .map((symbol) => symbol.name);
}

function zeroFormNode(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  return simplifyNode(['Subtract', json[1], json[2]] as MathJson);
}

function nonzeroDegrees(polynomial: ExactPolynomial) {
  return [...polynomial.terms.entries()]
    .filter(([, coefficient]) => !exactScalarIsZero(coefficient))
    .map(([degree]) => degree)
    .sort((left, right) => left - right);
}

function carrierDegreeFromExactPolynomial(polynomial: ExactPolynomial) {
  const degree = exactPolynomialDegree(polynomial);
  if (
    degree < 6
    || degree > MAX_SPECIAL_FORM_TOTAL_DEGREE
    || degree % 2 !== 0
  ) {
    return null;
  }

  const carrierDegree = degree / 2;
  if (carrierDegree < 3) {
    return null;
  }

  const allowed = new Set([0, carrierDegree, degree]);
  return nonzeroDegrees(polynomial).every((entry) => allowed.has(entry))
    ? carrierDegree
    : null;
}

function quadraticInCarrierPolynomial(polynomial: ExactPolynomial, carrierDegree: number) {
  return buildExactPolynomialFromCoefficients('u', [
    getExactPolynomialCoefficient(polynomial, carrierDegree * 2),
    getExactPolynomialCoefficient(polynomial, carrierDegree),
    getExactPolynomialCoefficient(polynomial, 0),
  ]);
}

function nthRootLatex(node: MathJson, degree: number) {
  const simplified = simplifyNode(node);
  if (isZeroNode(simplified)) {
    return '0';
  }
  if (isOneNode(simplified)) {
    return '1';
  }
  return latexForNode(['Power', simplified, ['Rational', 1, degree]] as MathJson);
}

function negateLatex(latex: string) {
  if (latex === '0') {
    return '0';
  }
  return latex.startsWith('-') ? latex.slice(1) : `-${latex}`;
}

function integerTargetPower(node: MathJson, target: string) {
  if (node === target) {
    return 1;
  }
  if (
    isArrayNode(node)
    && node[0] === 'Power'
    && node[1] === target
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] >= 0
  ) {
    return node[2];
  }
  return null;
}

function symbolicCarrierTermDegree(node: MathJson, target: string): number | null {
  const simplified = simplifyNode(node);
  if (!hasTarget(simplified, target)) {
    return 0;
  }

  const direct = integerTargetPower(simplified, target);
  if (direct !== null) {
    return direct;
  }

  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    return symbolicCarrierTermDegree(simplified[1] as MathJson, target);
  }

  if (isArrayNode(simplified) && simplified[0] === 'Multiply') {
    let degree: number | null = null;
    for (const factor of simplified.slice(1) as MathJson[]) {
      if (!hasTarget(factor, target)) {
        continue;
      }
      const factorDegree = integerTargetPower(factor, target);
      if (factorDegree === null || degree !== null) {
        return null;
      }
      degree = factorDegree;
    }
    return degree;
  }

  return null;
}

function carrierRootBranches(root: { node: unknown; numeric: number }, carrierDegree: number) {
  if (Math.abs(root.numeric) <= 1e-10) {
    return ['0'];
  }

  if (root.numeric < 0) {
    if (carrierDegree % 2 === 0) {
      return [] as string[];
    }
    const positiveRadicand = simplifyNode(['Negate', root.node] as MathJson);
    return [negateLatex(nthRootLatex(positiveRadicand, carrierDegree))];
  }

  const positive = nthRootLatex(root.node as MathJson, carrierDegree);
  return carrierDegree % 2 === 0 ? [negateLatex(positive), positive] : [positive];
}

type AffineCarrierBase = {
  base: MathJson;
  coefficient: ExactScalar;
  offset: MathJson;
  key: string;
};

type AffineCarrierTerm =
  | {
      kind: 'exact';
      coefficient: ExactScalar;
      exponent: number;
      carrier: AffineCarrierBase;
    }
  | {
      kind: 'symbolic-coefficient';
      exponent: number;
      carrier: AffineCarrierBase;
    }
  | { kind: 'exact-constant'; coefficient: ExactScalar }
  | { kind: 'symbolic-constant' }
  | { kind: 'unsupported-carrier' };

type AffineCarrierCollectResult =
  | {
      kind: 'ok';
      carrier: AffineCarrierBase;
      carrierDegree: number;
      totalDegree: number;
      quadratic: ExactPolynomial;
    }
  | { kind: 'symbolic-coefficients' }
  | { kind: 'degree-limit' }
  | { kind: 'unsupported-carrier' }
  | { kind: 'no-special-form' };

function exactScalarNode(value: ExactScalar): MathJson {
  return buildExactScalarNode(value) as MathJson;
}

function exactScalarLatex(value: ExactScalar) {
  return latexForNode(exactScalarNode(value));
}

function exactScalarIsOne(value: ExactScalar) {
  return value.numerator === 1 && value.denominator === 1;
}

function multiplyExactCoefficient(left: ExactScalar, right: ExactScalar) {
  return multiplyExactScalars(left, right);
}

function exactScalarKey(value: ExactScalar) {
  return `${value.numerator}/${value.denominator}`;
}

function affineCarrierKey(coefficient: ExactScalar, offset: MathJson) {
  return `${exactScalarKey(coefficient)}|${JSON.stringify(simplifyNode(offset))}`;
}

function addExactCoefficient(
  coefficients: Map<number, ExactScalar>,
  degree: number,
  coefficient: ExactScalar,
) {
  const previous = coefficients.get(degree) ?? EXACT_ZERO;
  coefficients.set(degree, addExactScalars(previous, coefficient));
}

function splitTerms(node: MathJson) {
  const simplified = simplifyNode(node);
  return isArrayNode(simplified) && simplified[0] === 'Add'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
}

function parsePowerFactor(node: MathJson): { base: MathJson; exponent: number } | null {
  if (
    isArrayNode(node)
    && node[0] === 'Power'
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] > 0
  ) {
    return { base: node[1] as MathJson, exponent: node[2] };
  }

  return null;
}

function readLinearTargetTerm(node: MathJson, target: string): ExactScalar | null {
  if (node === target) {
    return EXACT_ONE;
  }

  if (isArrayNode(node) && node[0] === 'Negate' && node[1] === target) {
    return { numerator: -1, denominator: 1 };
  }

  if (!isArrayNode(node) || node[0] !== 'Multiply') {
    return null;
  }

  let coefficient = EXACT_ONE;
  let targetCount = 0;
  for (const factor of node.slice(1) as MathJson[]) {
    const exact = readExactScalarNode(factor);
    if (exact) {
      coefficient = multiplyExactCoefficient(coefficient, exact);
      continue;
    }
    if (factor === target) {
      targetCount += 1;
      continue;
    }
    return null;
  }

  return targetCount === 1 ? coefficient : null;
}

function readAffineCarrierBase(node: MathJson, target: string): AffineCarrierBase | null {
  const simplified = simplifyNode(node);
  if (simplified === target) {
    return {
      base: simplified,
      coefficient: EXACT_ONE,
      offset: 0,
      key: affineCarrierKey(EXACT_ONE, 0),
    };
  }

  const terms = splitTerms(simplified);
  let coefficient = EXACT_ZERO;
  const offsetTerms: MathJson[] = [];
  for (const term of terms) {
    if (!hasTarget(term, target)) {
      offsetTerms.push(term);
      continue;
    }

    const targetCoefficient = readLinearTargetTerm(term, target);
    if (!targetCoefficient) {
      return null;
    }
    coefficient = addExactScalars(coefficient, targetCoefficient);
  }

  if (exactScalarIsZero(coefficient)) {
    return null;
  }

  const offset = offsetTerms.length === 0 ? 0 : addNodes(...offsetTerms);
  return {
    base: simplified,
    coefficient,
    offset,
    key: affineCarrierKey(coefficient, offset),
  };
}

function readAffineCarrierTerm(term: MathJson, target: string): AffineCarrierTerm {
  const simplified = simplifyNode(term);
  const scalar = readExactScalarNode(simplified);
  if (scalar) {
    return { kind: 'exact-constant', coefficient: scalar };
  }

  const rawFactors = isArrayNode(simplified) && simplified[0] === 'Multiply'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
  let coefficient = EXACT_ONE;
  const targetFreeFactors: MathJson[] = [];
  let carrierPower: { base: MathJson; exponent: number } | null = null;

  for (const factor of rawFactors) {
    const exact = readExactScalarNode(factor);
    if (exact) {
      coefficient = multiplyExactCoefficient(coefficient, exact);
      continue;
    }

    if (!hasTarget(factor, target)) {
      targetFreeFactors.push(factor);
      continue;
    }

    const power = parsePowerFactor(factor);
    if (!power || carrierPower) {
      return { kind: 'unsupported-carrier' };
    }
    carrierPower = power;
  }

  if (!carrierPower) {
    return { kind: 'symbolic-constant' };
  }

  const carrier = readAffineCarrierBase(carrierPower.base, target);
  if (!carrier) {
    return { kind: 'unsupported-carrier' };
  }

  if (targetFreeFactors.length > 0) {
    return {
      kind: 'symbolic-coefficient',
      exponent: carrierPower.exponent,
      carrier,
    };
  }

  return {
    kind: 'exact',
    coefficient,
    exponent: carrierPower.exponent,
    carrier,
  };
}

function collectAffineCarrierQuadratic(
  node: MathJson,
  target: string,
): AffineCarrierCollectResult {
  const exactCoefficients = new Map<number, ExactScalar>();
  const positiveExponents = new Set<number>();
  let carrier: AffineCarrierBase | null = null;
  let sawSymbolicCoefficient = false;
  let sawSymbolicConstant = false;
  let sawUnsupportedCarrier = false;

  for (const term of splitTerms(node)) {
    const parsed = readAffineCarrierTerm(term, target);
    if (parsed.kind === 'unsupported-carrier') {
      sawUnsupportedCarrier = true;
      continue;
    }
    if (parsed.kind === 'symbolic-constant') {
      sawSymbolicConstant = true;
      continue;
    }
    if (parsed.kind === 'exact-constant') {
      addExactCoefficient(exactCoefficients, 0, parsed.coefficient);
      continue;
    }

    if (carrier && parsed.carrier.key !== carrier.key) {
      return { kind: 'unsupported-carrier' };
    }
    carrier = parsed.carrier;
    positiveExponents.add(parsed.exponent);

    if (parsed.exponent > MAX_SPECIAL_FORM_TOTAL_DEGREE) {
      return { kind: 'degree-limit' };
    }

    if (parsed.kind === 'symbolic-coefficient') {
      sawSymbolicCoefficient = true;
      continue;
    }

    addExactCoefficient(exactCoefficients, parsed.exponent, parsed.coefficient);
  }

  if (!carrier || positiveExponents.size < 2) {
    return { kind: 'no-special-form' };
  }

  if (sawUnsupportedCarrier) {
    return { kind: 'unsupported-carrier' };
  }

  const exponents = [...positiveExponents].sort((left, right) => left - right);
  const totalDegree = exponents[exponents.length - 1];
  if (totalDegree > MAX_SPECIAL_FORM_TOTAL_DEGREE) {
    return { kind: 'degree-limit' };
  }
  if (totalDegree < 6 || totalDegree % 2 !== 0 || exponents.some((degree) =>
    degree !== totalDegree / 2 && degree !== totalDegree)) {
    return { kind: 'no-special-form' };
  }

  if (sawSymbolicCoefficient || sawSymbolicConstant) {
    return { kind: 'symbolic-coefficients' };
  }

  const carrierDegree = totalDegree / 2;
  const leading = exactCoefficients.get(totalDegree) ?? EXACT_ZERO;
  if (exactScalarIsZero(leading)) {
    return { kind: 'no-special-form' };
  }

  return {
    kind: 'ok',
    carrier,
    carrierDegree,
    totalDegree,
    quadratic: buildExactPolynomialFromCoefficients('u', [
      leading,
      exactCoefficients.get(carrierDegree) ?? EXACT_ZERO,
      exactCoefficients.get(0) ?? EXACT_ZERO,
    ]),
  };
}

function subtractOffsetLatex(valueLatex: string, offset: MathJson) {
  const simplifiedOffset = simplifyNode(offset);
  if (isZeroNode(simplifiedOffset)) {
    return valueLatex;
  }

  const offsetLatex = latexForNode(simplifiedOffset);
  if (offsetLatex.startsWith('-')) {
    return `${valueLatex}+${offsetLatex.slice(1)}`;
  }

  return `${valueLatex}-${offsetLatex}`;
}

function rootsForAffineCarrierBranch(
  carrier: AffineCarrierBase,
  carrierValueLatex: string,
) {
  const numerator = subtractOffsetLatex(carrierValueLatex, carrier.offset);
  if (exactScalarIsOne(carrier.coefficient)) {
    return numerator;
  }

  return `\\frac{${numerator}}{${exactScalarLatex(carrier.coefficient)}}`;
}

function buildCarrierQuadraticSuccess(options: {
  quadratic: ExactPolynomial;
  carrierDegree: number;
  totalDegree: number;
  carrierLatex: string;
  carrierKind: 'pure' | 'affine';
  target: string;
  parameterNames: string[];
  rootsForCarrierRoot: (root: { node: unknown; numeric: number }) => string[];
}): ParameterizedSpecialFormRootsResult {
  const carrierRoots = quadraticRootNodes(options.quadratic);
  if (carrierRoots.kind !== 'real') {
    return stop(
      'no-real-roots',
      'The carrier quadratic has no real carrier roots.',
      options.target,
      options.parameterNames,
    );
  }

  const rootLatex = carrierRoots.roots.flatMap(options.rootsForCarrierRoot);
  const uniqueRootLatex = [...new Set(rootLatex)];
  if (uniqueRootLatex.length === 0) {
    return stop(
      'no-real-roots',
      'The carrier roots do not produce real selected-target roots.',
      options.target,
      options.parameterNames,
    );
  }

  const rootSet = createRootSet({
    target: options.target,
    source: SOURCE,
    entries: uniqueRootLatex.map((latex) => createExactFiniteRoot(latex, { source: SOURCE })),
  });
  const readback = buildCompactRootReadback(rootSet);
  if (readback.kind !== 'visible-exact') {
    return stop(
      'unsupported-carrier-shape',
      'Could not render the special-form carrier roots compactly.',
      options.target,
      options.parameterNames,
    );
  }

  const detailSections = buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: 'Special-Form Root Solve',
    familyLines: [
      `Detected an exact-rational quadratic in the ${options.carrierKind} carrier u=${options.carrierLatex}.`,
      `Solved the carrier quadratic, then solved ${options.carrierLatex}=u for real ${options.target} branches.`,
      `Total selected-target degree: ${options.totalDegree}.`,
    ],
  });

  return {
    kind: 'success',
    target: options.target,
    parameterNames: options.parameterNames,
    exactLatex: readback.exactLatex,
    branchReadback: readback.branchReadback,
    exactSupplementLatex: normalizeParameterizedSupplementLatex(readback.exactSupplementLatex),
    detailSections,
  };
}

function purePowerCarrierShapeDegrees(node: MathJson, target: string) {
  const simplified = simplifyNode(node);
  const terms = isArrayNode(simplified) && simplified[0] === 'Add'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
  const degrees = terms.map((term) => symbolicCarrierTermDegree(term, target));
  if (degrees.some((degree) => degree === null)) {
    return null;
  }

  return degrees
    .filter((degree): degree is number => typeof degree === 'number' && degree > 0)
    .sort((left, right) => left - right);
}

function looksLikePurePowerCarrierQuadratic(node: MathJson, target: string) {
  const targetDegrees = purePowerCarrierShapeDegrees(node, target);
  if (!targetDegrees) {
    return false;
  }
  if (targetDegrees.length === 0) {
    return false;
  }

  const totalDegree = targetDegrees[targetDegrees.length - 1];
  return totalDegree >= 6
    && totalDegree % 2 === 0
    && targetDegrees.every((degree) => degree === totalDegree / 2 || degree === totalDegree);
}

export function solveParameterizedSpecialFormRootsEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedSpecialFormRootsOptions = {},
): ParameterizedSpecialFormRootsResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before special-form root solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for special-form root solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before special-form root solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const zeroForm = zeroFormNode(json);
  if (!zeroForm) {
    return stop('no-special-form', 'No exact-rational special-form root structure was detected.', target, parameterNames);
  }

  const polynomial = parseExactPolynomial(zeroForm, target, MAX_SPECIAL_FORM_TOTAL_DEGREE);
  if (!polynomial) {
    const affineCarrier = collectAffineCarrierQuadratic(zeroForm, target);
    if (affineCarrier.kind === 'ok') {
      const carrierLatex = latexForNode(['Power', affineCarrier.carrier.base, affineCarrier.carrierDegree] as MathJson);
      return buildCarrierQuadraticSuccess({
        quadratic: affineCarrier.quadratic,
        carrierDegree: affineCarrier.carrierDegree,
        totalDegree: affineCarrier.totalDegree,
        carrierLatex,
        carrierKind: 'affine',
        target,
        parameterNames,
        rootsForCarrierRoot: (root) =>
          carrierRootBranches(root, affineCarrier.carrierDegree)
            .map((branch) => rootsForAffineCarrierBranch(affineCarrier.carrier, branch)),
      });
    }

    if (affineCarrier.kind === 'degree-limit') {
      return stop(
        'total-degree-limit',
        `Special-form root solving is capped at total target degree ${MAX_SPECIAL_FORM_TOTAL_DEGREE}.`,
        target,
        parameterNames,
      );
    }

    if (affineCarrier.kind === 'symbolic-coefficients') {
      const symbolicCarrier = solveSymbolicCarrierCoefficientSpecialForm({
        zeroForm,
        target,
        parameterNames,
        maxTotalDegree: MAX_SPECIAL_FORM_TOTAL_DEGREE,
      });
      if (symbolicCarrier.kind === 'success') {
        return symbolicCarrier;
      }
      if (symbolicCarrier.reason === 'degree-limit') {
        return stop(
          'total-degree-limit',
          `Special-form root solving is capped at total target degree ${MAX_SPECIAL_FORM_TOTAL_DEGREE}.`,
          target,
          parameterNames,
        );
      }
      if (symbolicCarrier.reason === 'unsupported-carrier-shape') {
        return stop(
          'unsupported-carrier-shape',
          'Special-form carrier roots currently require a pure or affine selected-target carrier with exact-rational target coefficient.',
          target,
          parameterNames,
        );
      }
    }

    if (affineCarrier.kind === 'unsupported-carrier') {
      return stop(
        'unsupported-carrier-shape',
        'Special-form carrier roots currently require a pure or affine selected-target carrier with exact-rational target coefficient.',
        target,
        parameterNames,
      );
    }

    const symbolicCarrier = solveSymbolicCarrierCoefficientSpecialForm({
      zeroForm,
      target,
      parameterNames,
      maxTotalDegree: MAX_SPECIAL_FORM_TOTAL_DEGREE,
    });
    if (symbolicCarrier.kind === 'success') {
      return symbolicCarrier;
    }
    if (symbolicCarrier.kind === 'unsupported' && symbolicCarrier.reason === 'degree-limit') {
      return stop(
        'total-degree-limit',
        `Special-form root solving is capped at total target degree ${MAX_SPECIAL_FORM_TOTAL_DEGREE}.`,
        target,
        parameterNames,
      );
    }

    if (looksLikePurePowerCarrierQuadratic(zeroForm, target)) {
      const targetDegrees = purePowerCarrierShapeDegrees(zeroForm, target) ?? [];
      const totalDegree = targetDegrees[targetDegrees.length - 1] ?? 0;
      if (totalDegree > MAX_SPECIAL_FORM_TOTAL_DEGREE) {
        return stop(
          'total-degree-limit',
          `Special-form root solving is capped at total target degree ${MAX_SPECIAL_FORM_TOTAL_DEGREE}.`,
          target,
          parameterNames,
        );
      }
    }

    return looksLikePurePowerCarrierQuadratic(zeroForm, target)
      ? stop(
        'symbolic-carrier-coefficients',
        'Special-form carrier roots currently require exact-rational outer coefficients; symbolic carrier coefficients are deferred.',
        target,
        parameterNames,
      )
      : stop('no-special-form', 'No exact-rational special-form root structure was detected.', target, parameterNames);
  }

  const totalDegree = exactPolynomialDegree(polynomial);
  if (totalDegree > MAX_SPECIAL_FORM_TOTAL_DEGREE) {
    return stop(
      'total-degree-limit',
      `Special-form root solving is capped at total target degree ${MAX_SPECIAL_FORM_TOTAL_DEGREE}.`,
      target,
      parameterNames,
    );
  }

  const carrierDegree = carrierDegreeFromExactPolynomial(polynomial);
  if (!carrierDegree) {
    return stop(
      'no-special-form',
      'This equation is not an exact-rational quadratic in a pure selected-target power carrier.',
      target,
      parameterNames,
    );
  }

  const quadratic = quadraticInCarrierPolynomial(polynomial, carrierDegree);
  const carrierLatex = `${target}^{${carrierDegree}}`;
  return buildCarrierQuadraticSuccess({
    quadratic,
    carrierDegree,
    totalDegree: carrierDegree * 2,
    carrierLatex,
    carrierKind: 'pure',
    target,
    parameterNames,
    rootsForCarrierRoot: (root) => carrierRootBranches(root, carrierDegree),
  });
}
