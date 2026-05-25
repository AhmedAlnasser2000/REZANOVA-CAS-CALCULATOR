import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ParameterizedLinearStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-in-denominator'
  | 'target-power'
  | 'target-in-unsupported-operation'
  | 'nonlinear-target-product'
  | 'target-cancels'
  | 'identity-family';

export type ParameterizedLinearSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type ParameterizedLinearSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedLinearStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedLinearSolveResult =
  | ParameterizedLinearSolveSuccess
  | ParameterizedLinearSolveStop;

export type ParameterizedLinearSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

type AffineExpression = {
  coefficient: MathJson;
  constant: MathJson;
};

type AffineCollectResult =
  | { kind: 'ok'; affine: AffineExpression }
  | { kind: 'unsupported'; reason: ParameterizedLinearStopReason; message: string };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;

function unsupported(
  reason: ParameterizedLinearStopReason,
  message: string,
): AffineCollectResult {
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

function isNumericScalarNode(node: unknown) {
  return typeof node === 'number'
    || (
      isArrayNode(node)
      && node[0] === 'Rational'
      && typeof node[1] === 'number'
      && typeof node[2] === 'number'
    );
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

function addNodes(...nodes: MathJson[]): MathJson {
  const terms = flattenOperator('Add', nodes).filter((node) => !isZeroNode(node));
  if (terms.length === 0) {
    return ZERO;
  }
  if (terms.length === 1) {
    return terms[0];
  }
  return ['Add', ...terms] as MathJson;
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
  return ['Multiply', ...factors] as MathJson;
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
  return ['Negate', node] as MathJson;
}

function divideNodes(numerator: MathJson, denominator: MathJson): MathJson {
  if (isOneNode(denominator)) {
    return numerator;
  }
  if (isNegativeOneNode(denominator)) {
    return negateNode(numerator);
  }
  return ['Divide', numerator, denominator] as MathJson;
}

function addAffine(left: AffineExpression, right: AffineExpression): AffineExpression {
  return {
    coefficient: addNodes(left.coefficient, right.coefficient),
    constant: addNodes(left.constant, right.constant),
  };
}

function negateAffine(input: AffineExpression): AffineExpression {
  return {
    coefficient: negateNode(input.coefficient),
    constant: negateNode(input.constant),
  };
}

function subtractAffine(left: AffineExpression, right: AffineExpression): AffineExpression {
  return addAffine(left, negateAffine(right));
}

function isPureTargetAffine(affine: AffineExpression) {
  return isZeroNode(affine.constant);
}

function collectAffine(node: unknown, target: string): AffineCollectResult {
  if (typeof node === 'string') {
    return {
      kind: 'ok',
      affine: node === target
        ? { coefficient: ONE, constant: ZERO }
        : { coefficient: ZERO, constant: node as MathJson },
    };
  }

  if (typeof node === 'number') {
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson } };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target appears in an unsupported expression shape.',
      );
    }
    return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson } };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: AffineExpression = { coefficient: ZERO, constant: ZERO };
    for (const operand of operands) {
      const collected = collectAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      current = addAffine(current, collected.affine);
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectAffine(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectAffine(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return {
      kind: 'ok',
      affine: subtractAffine(leftCollected.affine, rightCollected.affine),
    };
  }

  if (operator === 'Negate') {
    const collected = collectAffine(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', affine: negateAffine(collected.affine) };
  }

  if (operator === 'Multiply') {
    const collectedFactors = operands.map((operand) => collectAffine(operand, target));
    const unsupportedFactor = collectedFactors.find((entry) => entry.kind === 'unsupported');
    if (unsupportedFactor?.kind === 'unsupported') {
      return unsupportedFactor;
    }

    const affineFactors = collectedFactors
      .filter((entry): entry is { kind: 'ok'; affine: AffineExpression } => entry.kind === 'ok')
      .map((entry) => entry.affine);
    const targetFactors = affineFactors.filter((entry) => !isZeroNode(entry.coefficient));

    if (targetFactors.length === 0) {
      return {
        kind: 'ok',
        affine: {
          coefficient: ZERO,
          constant: multiplyNodes(...affineFactors.map((entry) => entry.constant)),
        },
      };
    }

    if (targetFactors.length > 1) {
      return unsupported(
        'nonlinear-target-product',
        'This equation multiplies the selected target by another target-bearing expression.',
      );
    }

    const targetFactor = targetFactors[0];
    if (!isPureTargetAffine(targetFactor)) {
      return unsupported(
        'nonlinear-target-product',
        'This parameterized linear slice does not distribute products containing target sums yet.',
      );
    }

    const targetFreeFactors = affineFactors
      .filter((entry) => entry !== targetFactor)
      .map((entry) => entry.constant);

    return {
      kind: 'ok',
      affine: {
        coefficient: multiplyNodes(...targetFreeFactors, targetFactor.coefficient),
        constant: ZERO,
      },
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return unsupported(
        'target-in-denominator',
        'Rational equations with the selected target in a denominator are planned for EQUATION-PARAM3.',
      );
    }

    const collected = collectAffine(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }

    return {
      kind: 'ok',
      affine: {
        coefficient: divideNodes(collected.affine.coefficient, denominator as MathJson),
        constant: divideNodes(collected.affine.constant, denominator as MathJson),
      },
    };
  }

  if (operator === 'Power' && hasTarget(node, target)) {
    return unsupported(
      'target-power',
      'Polynomial-in-target parameter solving is planned for EQUATION-PARAM2.',
    );
  }

  if (hasTarget(node, target)) {
    return unsupported(
      'target-in-unsupported-operation',
      'This parameterized family is outside EQUATION-PARAM1 affine/linear solving.',
    );
  }

  return { kind: 'ok', affine: { coefficient: ZERO, constant: node as MathJson } };
}

function latexForNode(node: MathJson) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function stripLeadingNegation(node: MathJson): MathJson {
  const simplified = node;
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

function coefficientNeedsNonzeroFact(coefficient: MathJson) {
  if (
    isNumericScalarNode(coefficient)
    || isOneNode(coefficient)
    || isNegativeOneNode(coefficient)
    || isZeroNode(coefficient)
  ) {
    return false;
  }

  const unsignedCoefficient = stripLeadingNegation(coefficient);
  if (
    isArrayNode(unsignedCoefficient)
    && unsignedCoefficient[0] === 'Power'
    && unsignedCoefficient[1] === 'ExponentialE'
  ) {
    return false;
  }

  return analyzeVariablesFromLatex(latexForNode(coefficient), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

function nonzeroFactLatexForCoefficient(coefficient: MathJson) {
  const latex = latexForNode(stripLeadingNegation(coefficient));
  return `${latex.startsWith('-') ? latex.slice(1) : latex}\\ne0`;
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
  reason: ParameterizedLinearStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedLinearSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

export function solveParameterizedLinearEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedLinearSolveOptions = {},
): ParameterizedLinearSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractAffine(left.affine, right.affine);
  if (isZeroNode(normalized.coefficient)) {
    return stop(
      isZeroNode(normalized.constant) ? 'identity-family' : 'target-cancels',
      isZeroNode(normalized.constant)
        ? 'The selected target cancels out; this identity-style parameterized family is not solved in EQUATION-PARAM1.'
        : 'The selected target cancels out before isolation.',
      target,
      parameterNames,
    );
  }

  const solution = divideNodes(negateNode(normalized.constant), normalized.coefficient);
  const exactLatex = `${target}=${latexForNode(solution)}`;
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(coefficientNeedsNonzeroFact(normalized.coefficient)
    ? [nonzeroFactLatexForCoefficient(normalized.coefficient)]
    : undefined);
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Linear Solve',
    familyLines: [
      `Collected the equation as A*${target}+B=0 and isolated ${target}.`,
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
