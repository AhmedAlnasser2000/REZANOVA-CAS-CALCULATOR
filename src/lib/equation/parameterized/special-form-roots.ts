import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import {
  buildExactPolynomialFromCoefficients,
  exactPolynomialDegree,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  parseExactPolynomial,
  type ExactPolynomial,
} from '../../algebra/polynomial-core';
import { quadraticRootNodes } from '../../algebra/polynomial-factor/quadratic';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
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
  const carrierRoots = quadraticRootNodes(quadratic);
  if (carrierRoots.kind !== 'real') {
    return stop(
      'no-real-roots',
      'The carrier quadratic has no real carrier roots.',
      target,
      parameterNames,
    );
  }

  const rootLatex = carrierRoots.roots.flatMap((root) =>
    carrierRootBranches(root, carrierDegree));
  const uniqueRootLatex = [...new Set(rootLatex)];
  if (uniqueRootLatex.length === 0) {
    return stop(
      'no-real-roots',
      'The carrier roots do not produce real selected-target roots.',
      target,
      parameterNames,
    );
  }

  const rootSet = createRootSet({
    target,
    source: SOURCE,
    entries: uniqueRootLatex.map((latex) => createExactFiniteRoot(latex, { source: SOURCE })),
  });
  const readback = buildCompactRootReadback(rootSet);
  if (readback.kind !== 'visible-exact') {
    return stop(
      'unsupported-carrier-shape',
      'Could not render the special-form carrier roots compactly.',
      target,
      parameterNames,
    );
  }

  const carrierLatex = `${target}^{${carrierDegree}}`;
  const detailSections = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Special-Form Root Solve',
    familyLines: [
      `Detected an exact-rational quadratic in the pure carrier u=${carrierLatex}.`,
      `Solved the carrier quadratic, then solved ${carrierLatex}=u for real ${target} branches.`,
      `Total selected-target degree: ${carrierDegree * 2}.`,
    ],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: readback.exactLatex,
    branchReadback: readback.branchReadback,
    exactSupplementLatex: normalizeParameterizedSupplementLatex(readback.exactSupplementLatex),
    detailSections,
  };
}
