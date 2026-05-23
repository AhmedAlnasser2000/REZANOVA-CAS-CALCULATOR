import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

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

type TargetPolynomial = {
  terms: [MathJson, MathJson, MathJson];
};

type PolynomialCollectResult =
  | { kind: 'ok'; polynomial: TargetPolynomial }
  | { kind: 'unsupported'; reason: ParameterizedPolynomialStopReason; message: string };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;

function unsupported(
  reason: ParameterizedPolynomialStopReason,
  message: string,
): PolynomialCollectResult {
  return { kind: 'unsupported', reason, message };
}

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 0);
}

function isOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, 1);
}

function isNegativeOneNode(node: unknown) {
  return typeof node === 'number' && Object.is(node, -1);
}

function hasTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }

  if (isArrayNode(node)) {
    return node.some((entry) => hasTarget(entry, target));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasTarget(entry, target));
  }

  return false;
}

function flattenOperator(operator: string, nodes: MathJson[]) {
  return nodes.flatMap((node) =>
    isArrayNode(node) && node[0] === operator
      ? node.slice(1) as MathJson[]
      : [node],
  );
}

function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function addNodes(...nodes: MathJson[]): MathJson {
  const terms = flattenOperator('Add', nodes).filter((node) => !isZeroNode(node));
  if (terms.length === 0) {
    return ZERO;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return simplifyNode(['Add', ...terms] as MathJson);
}

function multiplyNodes(...nodes: MathJson[]): MathJson {
  const factors = flattenOperator('Multiply', nodes).filter((node) => !isOneNode(node));
  if (factors.some((node) => isZeroNode(node))) {
    return ZERO;
  }
  if (factors.length === 0) {
    return ONE;
  }
  if (factors.length === 1) {
    return factors[0];
  }
  return simplifyNode(['Multiply', ...factors] as MathJson);
}

function negateNode(node: MathJson): MathJson {
  if (typeof node === 'number') {
    return isZeroNode(node) ? ZERO : -node as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Negate') {
    return node[1] as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Add') {
    return addNodes(...node.slice(1).map((term) => negateNode(term as MathJson)));
  }
  return simplifyNode(['Negate', node] as MathJson);
}

function subtractNode(left: MathJson, right: MathJson) {
  return addNodes(left, negateNode(right));
}

function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
  if (isOneNode(denominator)) {
    return numerator;
  }
  if (isNegativeOneNode(denominator)) {
    return negateNode(numerator);
  }
  return simplifyNode(['Divide', numerator, denominator] as MathJson);
}

function polynomialFromDegree(degree: number, coefficient: MathJson): TargetPolynomial {
  const terms: [MathJson, MathJson, MathJson] = [ZERO, ZERO, ZERO];
  terms[degree] = coefficient;
  return { terms };
}

function addPolynomials(left: TargetPolynomial, right: TargetPolynomial): TargetPolynomial {
  return {
    terms: [
      addNodes(left.terms[0], right.terms[0]),
      addNodes(left.terms[1], right.terms[1]),
      addNodes(left.terms[2], right.terms[2]),
    ],
  };
}

function negatePolynomial(polynomial: TargetPolynomial): TargetPolynomial {
  return {
    terms: [
      negateNode(polynomial.terms[0]),
      negateNode(polynomial.terms[1]),
      negateNode(polynomial.terms[2]),
    ],
  };
}

function subtractPolynomials(left: TargetPolynomial, right: TargetPolynomial): TargetPolynomial {
  return addPolynomials(left, negatePolynomial(right));
}

function multiplyPolynomials(left: TargetPolynomial, right: TargetPolynomial): PolynomialCollectResult {
  const terms: [MathJson, MathJson, MathJson] = [ZERO, ZERO, ZERO];
  for (let leftDegree = 0; leftDegree <= 2; leftDegree += 1) {
    for (let rightDegree = 0; rightDegree <= 2; rightDegree += 1) {
      const coefficient = multiplyNodes(left.terms[leftDegree], right.terms[rightDegree]);
      if (isZeroNode(coefficient)) {
        continue;
      }
      const degree = leftDegree + rightDegree;
      if (degree > 2) {
        return unsupported(
          'target-power',
          'Parameterized polynomial solving above degree 2 is planned for a later Equation milestone.',
        );
      }
      terms[degree] = addNodes(terms[degree], coefficient);
    }
  }
  return { kind: 'ok', polynomial: { terms } };
}

function scalePolynomial(polynomial: TargetPolynomial, denominator: MathJson): TargetPolynomial {
  return {
    terms: [
      divideNodes(polynomial.terms[0], denominator),
      divideNodes(polynomial.terms[1], denominator),
      divideNodes(polynomial.terms[2], denominator),
    ],
  };
}

function collectPolynomial(node: unknown, target: string): PolynomialCollectResult {
  if (typeof node === 'string') {
    return {
      kind: 'ok',
      polynomial: node === target
        ? polynomialFromDegree(1, ONE)
        : polynomialFromDegree(0, node as MathJson),
    };
  }

  if (typeof node === 'number') {
    return { kind: 'ok', polynomial: polynomialFromDegree(0, node as MathJson) };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target appears in an unsupported expression shape.',
      );
    }
    return { kind: 'ok', polynomial: polynomialFromDegree(0, node as MathJson) };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current = polynomialFromDegree(0, ZERO);
    for (const operand of operands) {
      const collected = collectPolynomial(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      current = addPolynomials(current, collected.polynomial);
    }
    return { kind: 'ok', polynomial: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectPolynomial(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectPolynomial(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return {
      kind: 'ok',
      polynomial: subtractPolynomials(leftCollected.polynomial, rightCollected.polynomial),
    };
  }

  if (operator === 'Negate') {
    const collected = collectPolynomial(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', polynomial: negatePolynomial(collected.polynomial) };
  }

  if (operator === 'Multiply') {
    let current = polynomialFromDegree(0, ONE);
    for (const operand of operands) {
      const collected = collectPolynomial(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const multiplied = multiplyPolynomials(current, collected.polynomial);
      if (multiplied.kind === 'unsupported') {
        return multiplied;
      }
      current = multiplied.polynomial;
    }
    return { kind: 'ok', polynomial: current };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return unsupported(
        'target-in-denominator',
        'Rational equations with the selected target in a denominator are planned for EQUATION-PARAM3.',
      );
    }

    const collected = collectPolynomial(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }

    return {
      kind: 'ok',
      polynomial: scalePolynomial(collected.polynomial, denominator as MathJson),
    };
  }

  if (operator === 'Power') {
    const [base, exponent] = operands;
    if (base === target && typeof exponent === 'number' && Number.isInteger(exponent)) {
      if (exponent < 0) {
        return unsupported(
          'target-in-denominator',
          'Rational equations with the selected target in a denominator are planned for EQUATION-PARAM3.',
        );
      }
      if (exponent > 2) {
        return unsupported(
          'target-power',
          'Parameterized polynomial solving above degree 2 is planned for a later Equation milestone.',
        );
      }
      return { kind: 'ok', polynomial: polynomialFromDegree(exponent, ONE) };
    }

    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'This polynomial-in-target slice only supports direct selected-target powers.',
      );
    }
  }

  if (hasTarget(node, target)) {
    return unsupported(
      'target-in-unsupported-operation',
      'This parameterized family is outside EQUATION-PARAM2 quadratic target solving.',
    );
  }

  return { kind: 'ok', polynomial: polynomialFromDegree(0, node as MathJson) };
}

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

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
  if (!nodeHasSymbol(discriminant)) {
    return null;
  }
  const condition = stripNumericFactorForCondition(discriminant);
  return `${latexForNode(condition.node)}${condition.relation}`;
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
      && symbol.identifierKind === 'single-symbol-variable'
      && /^[A-Za-z]$/.test(symbol.name))
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

function buildQuadraticRootsLatex(target: string, a: MathJson, b: MathJson, c: MathJson) {
  const discriminant = subtractNode(
    simplifyNode(['Power', b, 2] as MathJson),
    multiplyNodes(4, a, c),
  );
  const denominator = multiplyNodes(2, a);
  const negativeB = negateNode(b);
  const sqrtDiscriminant = simplifyNode(['Sqrt', discriminant] as MathJson);
  const roots = [
    divideNodes(subtractNode(negativeB, sqrtDiscriminant), denominator),
    divideNodes(addNodes(negativeB, sqrtDiscriminant), denominator),
  ].map(latexForNode);
  const uniqueRoots = [...new Set(roots)];

  return {
    discriminant,
    exactLatex: `${target}\\in\\left\\{${uniqueRoots.join(',\\ ')}\\right\\}`,
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

  const left = collectPolynomial(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectPolynomial(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractPolynomials(left.polynomial, right.polynomial);
  const [c, b, a] = normalized.terms;
  if (isZeroNode(a)) {
    return stop(
      'not-quadratic',
      'This equation is not a quadratic in the selected target after collection.',
      target,
      parameterNames,
    );
  }

  const { discriminant, exactLatex } = buildQuadraticRootsLatex(target, a, b, c);
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
    exactSupplementLatex,
    detailSections,
  };
}
