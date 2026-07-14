import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayBranchReadback,
  DisplayDetailSection,
  CanonicalMathValueV1,
} from '../../../types/calculator';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
} from '../solution/finite-root-set';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isNegativeOneNode,
  isZeroNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from './math-json';
import {
  collectDirectSymbolicTargetPolynomial,
  subtractSymbolicPolynomials,
} from './symbolic-polynomial';

const ce = new ComputeEngine();

const {
  addNodes,
  divideNodes,
  multiplyNodes,
  negateNode,
  subtractNodes,
} = createArithmeticHelpers(simplifyNode);

export type ParameterizedPolynomialStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-in-denominator'
  | 'target-power'
  | 'target-in-unsupported-operation'
  | 'not-quadratic'
  | 'no-real-roots';

export type ParameterizedPolynomialSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  primaryMath?: CanonicalMathValueV1;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type ParameterizedPolynomialSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedPolynomialStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedPolynomialSolveResult =
  | ParameterizedPolynomialSolveSuccess
  | ParameterizedPolynomialSolveStop;

export type ParameterizedPolynomialSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

const POLYNOMIAL_COLLECT_MESSAGES = {
  targetInDenominator: {
    reason: 'target-in-denominator',
    message: 'Rational equations with the selected target in a denominator are planned for EQUATION-PARAM3.',
  },
  degreeLimit: {
    reason: 'target-power',
    message: 'Parameterized polynomial solving above degree 2 is planned for a later Equation milestone.',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation',
    message: 'The selected target appears in an unsupported expression shape.',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-operation',
    message: 'This polynomial-in-target slice only supports direct selected-target powers.',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-operation',
    message: 'This parameterized family is outside EQUATION-PARAM2 quadratic target solving.',
  },
} as const;

function stripLeadingNegation(node: MathJson): MathJson {
  const simplified = simplifyNode(node);
  if (typeof simplified === 'number' && simplified < 0) {
    return Math.abs(simplified);
  }
  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    return simplified[1] as MathJson;
  }
  if (
    isArrayNode(simplified)
    && simplified[0] === 'Multiply'
    && isNegativeOneNode(simplified[1])
  ) {
    const factors = simplified.slice(2) as MathJson[];
    return factors.length === 1 ? factors[0] : multiplyNodes(...factors);
  }
  return simplified;
}

function nodeHasSymbol(node: MathJson) {
  return analyzeVariablesFromLatex(latexForNode(node), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

function containsPreservedTranscendental(node: unknown): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (operator === 'Ln' || operator === 'Log') {
    return true;
  }
  return operands.some(containsPreservedTranscendental);
}

function preservedLatexForNode(node: MathJson) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex.replace(/\\exponentialE/g, 'e');
}

function numericScalarValue(node: MathJson): number | null {
  if (typeof node === 'number') {
    return Number.isFinite(node) ? node : null;
  }
  if (
    isArrayNode(node)
    && node[0] === 'Rational'
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }
  return null;
}

function numericConstantValue(node: MathJson): number | null {
  if (nodeHasSymbol(node)) {
    return null;
  }

  const simplified = simplifyNode(node);
  const scalar = numericScalarValue(simplified);
  if (scalar !== null) {
    return scalar;
  }

  if (!isArrayNode(simplified)) {
    return null;
  }

  if (simplified[0] === 'Negate') {
    const value = numericConstantValue(simplified[1] as MathJson);
    return value === null ? null : -value;
  }

  if (simplified[0] === 'Add') {
    let sum = 0;
    for (const term of simplified.slice(1) as MathJson[]) {
      const value = numericConstantValue(term);
      if (value === null) {
        return null;
      }
      sum += value;
    }
    return Number.isFinite(sum) ? sum : null;
  }

  if (simplified[0] === 'Multiply') {
    let product = 1;
    for (const factor of simplified.slice(1) as MathJson[]) {
      const value = numericConstantValue(factor);
      if (value === null) {
        return null;
      }
      product *= value;
    }
    return Number.isFinite(product) ? product : null;
  }

  if (simplified[0] === 'Divide') {
    const numerator = numericConstantValue(simplified[1] as MathJson);
    const denominator = numericConstantValue(simplified[2] as MathJson);
    if (numerator === null || denominator === null || denominator === 0) {
      return null;
    }
    return numerator / denominator;
  }

  if (simplified[0] === 'Power') {
    const base = numericConstantValue(simplified[1] as MathJson);
    const exponent = numericConstantValue(simplified[2] as MathJson);
    if (base === null || exponent === null) {
      return null;
    }
    const value = Math.pow(base, exponent);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function stripNumericFactorForCondition(node: MathJson): { node: MathJson; relation: '\\ge0' | '\\le0' } {
  const simplified = simplifyNode(node);
  if (!isArrayNode(simplified) || simplified[0] !== 'Multiply') {
    return { node: simplified, relation: '\\ge0' };
  }

  let numericProduct = 1;
  const symbolicFactors: MathJson[] = [];
  for (const factor of simplified.slice(1) as MathJson[]) {
    const numeric = numericScalarValue(factor);
    if (numeric === null) {
      symbolicFactors.push(factor);
    } else {
      numericProduct *= numeric;
    }
  }

  if (symbolicFactors.length === 0 || numericProduct === 0) {
    return { node: simplified, relation: '\\ge0' };
  }

  return {
    node: multiplyNodes(...symbolicFactors),
    relation: numericProduct < 0 ? '\\le0' : '\\ge0',
  };
}

function nonzeroFactForLeadingCoefficient(coefficient: MathJson): string | null {
  if (!nodeHasSymbol(coefficient)) {
    return null;
  }
  const latex = latexForNode(stripLeadingNegation(coefficient));
  return `${latex.startsWith('-') ? latex.slice(1) : latex}\\ne0`;
}

function realDiscriminantFact(discriminant: MathJson): string | null {
  if (!nodeHasSymbol(discriminant) && !containsPreservedTranscendental(discriminant)) {
    return null;
  }
  if (containsPreservedTranscendental(discriminant) && !nodeHasSymbol(discriminant)) {
    return `${preservedLatexForNode(discriminant)}\\ge0`;
  }
  const condition = stripNumericFactorForCondition(discriminant);
  const conditionLatex = containsPreservedTranscendental(condition.node)
    ? preservedLatexForNode(condition.node)
    : latexForNode(condition.node);
  return `${conditionLatex}${condition.relation}`;
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

function stop(
  reason: ParameterizedPolynomialStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedPolynomialSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function quadraticDiscriminantNode(a: MathJson, b: MathJson, c: MathJson) {
  return subtractNodes(
    simplifyNode(['Power', b, 2] as MathJson),
    multiplyNodes(4, a, c),
  );
}

function buildPureSquareTranscendentalRoots(target: string, a: MathJson, b: MathJson, c: MathJson) {
  if (!isZeroNode(b)) {
    return null;
  }

  const payload = divideNodes(negateNode(c), a);
  if (!containsPreservedTranscendental(payload)) {
    return null;
  }

  const payloadLatex = preservedLatexForNode(payload);
  const roots = [
    { latex: `-\\sqrt{${payloadLatex}}` },
    { latex: `\\sqrt{${payloadLatex}}` },
  ];
  const renderedRoots = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: target,
      branches: roots,
      source: 'equation-parameterized-polynomial',
    }),
    { preserveOrder: true },
  );
  return {
    exactLatex: renderedRoots.exactLatex ?? `${target}\\in\\left\\{\\right\\}`,
    ...(renderedRoots.primaryMath ? { primaryMath: renderedRoots.primaryMath } : {}),
    branchReadback: renderedRoots.branchReadback,
  };
}

function buildQuadraticRootsLatex(target: string, a: MathJson, b: MathJson, c: MathJson) {
  const discriminant = quadraticDiscriminantNode(a, b, c);
  const pureSquare = buildPureSquareTranscendentalRoots(target, a, b, c);
  if (pureSquare) {
    return {
      discriminant,
      ...pureSquare,
    };
  }

  const denominator = multiplyNodes(2, a);
  const negativeB = negateNode(b);
  const sqrtDiscriminant = simplifyNode(['Sqrt', discriminant] as MathJson);
  const roots = [
    divideNodes(subtractNodes(negativeB, sqrtDiscriminant), denominator),
    divideNodes(addNodes(negativeB, sqrtDiscriminant), denominator),
  ].map((node) => ({
    node,
    latex: latexForNode(node),
  }));

  const renderedRoots = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: target,
      branches: roots,
      source: 'equation-parameterized-polynomial',
    }),
    { preserveOrder: true },
  );

  return {
    discriminant,
    exactLatex: renderedRoots.exactLatex ?? `${target}\\in\\left\\{\\right\\}`,
    ...(renderedRoots.primaryMath ? { primaryMath: renderedRoots.primaryMath } : {}),
    branchReadback: renderedRoots.branchReadback,
  };
}

export function solveParameterizedPolynomialEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedPolynomialSolveOptions = {},
): ParameterizedPolynomialSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized polynomial solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized polynomial solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized polynomial solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectDirectSymbolicTargetPolynomial(
    json[1],
    target,
    POLYNOMIAL_COLLECT_MESSAGES,
  );
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectDirectSymbolicTargetPolynomial(
    json[2],
    target,
    POLYNOMIAL_COLLECT_MESSAGES,
  );
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractSymbolicPolynomials(left.polynomial, right.polynomial);
  const [c, b, a] = normalized.terms;
  if (isZeroNode(a)) {
    return stop(
      'not-quadratic',
      'This equation is not a quadratic in the selected target after collection.',
      target,
      parameterNames,
    );
  }

  const discriminant = quadraticDiscriminantNode(a, b, c);
  const discriminantValue = numericConstantValue(discriminant);
  if (discriminantValue !== null && discriminantValue < 0) {
    return stop(
      'no-real-roots',
      'This real quadratic has no real roots. Turn Complex On to show the non-real roots.',
      target,
      parameterNames,
    );
  }

  const { branchReadback, primaryMath, exactLatex } = buildQuadraticRootsLatex(target, a, b, c);
  const exactSupplementLatex = normalizeParameterizedSupplementLatex([
    nonzeroFactForLeadingCoefficient(a),
    realDiscriminantFact(discriminant),
  ].filter((entry): entry is string => Boolean(entry)));
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Quadratic Solve',
    familyLines: [
      `Collected the equation as A*${target}^2+B*${target}+C=0 and applied the real quadratic formula.`,
      'Non-target symbols were preserved as symbolic parameters, not substituted values.',
    ],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex,
    ...(primaryMath ? { primaryMath } : {}),
    branchReadback,
    exactSupplementLatex,
    detailSections,
  };
}
