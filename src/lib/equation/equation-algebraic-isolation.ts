import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AnswerDomain, DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import { normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';
import { solveParameterizedFactorablePolynomialEquation } from './equation-parameterized-factorable-polynomial';

const ce = new ComputeEngine();
const MAX_ALGEBRAIC_POWER = 4;

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type EquationAlgebraicIsolationStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-on-both-sides'
  | 'multiple-target-islands'
  | 'target-in-shell-factor'
  | 'target-in-denominator'
  | 'unsupported-shell'
  | 'unsupported-power-base'
  | 'unsupported-power-degree'
  | 'formula-size-limit'
  | 'no-algebraic-isolation';

export type EquationAlgebraicIsolationSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  generatedEquationLatex: string;
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  answerDomain?: AnswerDomain;
};

export type EquationAlgebraicIsolationStop = {
  kind: 'unsupported';
  reason: EquationAlgebraicIsolationStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type EquationAlgebraicIsolationResult =
  | EquationAlgebraicIsolationSuccess
  | EquationAlgebraicIsolationStop;

export type EquationAlgebraicIsolationOptions = {
  allowGeneratedImplicitProducts?: boolean;
  inheritedFacts?: string[];
  answerDomain?: AnswerDomain;
};

type PeelStep = {
  expression: MathJson;
  otherSide: MathJson;
  facts: string[];
  line: string;
};

type PeelResult =
  | { kind: 'ok'; step: PeelStep }
  | { kind: 'unsupported'; reason: EquationAlgebraicIsolationStopReason; message: string };

type AffineTarget = {
  coefficient: MathJson;
  constant: MathJson;
};

type DegreeResult = { kind: 'ok'; degree: number } | { kind: 'unsupported' };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;

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

function isNumericNonzeroNode(node: unknown) {
  return typeof node === 'number' && !Object.is(node, 0);
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

function flattenMultiply(nodes: MathJson[]) {
  return nodes.flatMap((node) =>
    isArrayNode(node) && (node[0] === 'Multiply' || node[0] === 'InvisibleOperator')
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
  const factors = flattenMultiply(nodes).filter((node) => !isOneNode(node));
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

function subtractNodes(left: MathJson, right: MathJson): MathJson {
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

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

function equationLatex(left: MathJson, right: MathJson) {
  return `${latexForNode(left)}=${latexForNode(right)}`;
}

function factNonzero(node: MathJson) {
  if (isNumericNonzeroNode(node) || isOneNode(node) || isNegativeOneNode(node)) {
    return null;
  }
  if (isArrayNode(node) && node[0] === 'Divide' && isOneNode(node[1])) {
    return factNonzero(node[2] as MathJson);
  }
  if (isArrayNode(node) && node[0] === 'Power' && node.length === 3 && isNegativeOneNode(node[2])) {
    return factNonzero(node[1] as MathJson);
  }
  return `${latexForNode(node)}\\ne0`;
}

function rootNode(value: MathJson, degree: number): MathJson {
  return simplifyNode(['Power', value, ['Rational', 1, degree]] as MathJson);
}

function exactLatexForSolutions(target: string, roots: string[]) {
  const uniqueRoots = [...new Set(roots.filter(Boolean))];
  return uniqueRoots.length === 1
    ? `${target}=${uniqueRoots[0]}`
    : `${target}\\in\\left\\{${uniqueRoots.join(',\\ ')}\\right\\}`;
}

function normalizeImaginaryLatex(latex: string) {
  return latex.replace(/\\imaginaryI/gu, 'i');
}

function negateLatex(latex: string) {
  const normalized = normalizeImaginaryLatex(latex);
  return normalized.startsWith('-') ? normalized.slice(1) : `-${normalized}`;
}

function groupedFactorLatex(latex: string) {
  return /^[A-Za-z0-9\\]+(?:\{[^{}]*\})?$/u.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

function signedRootFactor(latex: string): { sign: 1 | -1; magnitude: string } {
  return latex.startsWith('-')
    ? { sign: -1, magnitude: latex.slice(1) }
    : { sign: 1, magnitude: latex };
}

function halfFactorLatex(magnitude: string) {
  const numeric = Number(magnitude);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric % 2 === 0 ? `${numeric / 2}` : `\\frac{${numeric}}{2}`;
  }
  return magnitude === '1' ? '\\frac{1}{2}' : `\\frac{${magnitude}}{2}`;
}

function sqrtThreeHalfFactorLatex(magnitude: string) {
  const numeric = Number(magnitude);
  if (Number.isInteger(numeric) && numeric > 0) {
    if (numeric === 1) {
      return '\\frac{\\sqrt{3}}{2}';
    }
    if (numeric % 2 === 0) {
      const coefficient = numeric / 2;
      return coefficient === 1 ? '\\sqrt{3}' : `${coefficient}\\sqrt{3}`;
    }
    return `\\frac{${numeric}\\sqrt{3}}{2}`;
  }
  return magnitude === '1'
    ? '\\frac{\\sqrt{3}}{2}'
    : `\\frac{\\sqrt{3}${magnitude}}{2}`;
}

function signedTermLatex(magnitude: string, sign: 1 | -1, first = false) {
  return sign === -1 ? `-${magnitude}` : first ? magnitude : `+${magnitude}`;
}

function cubicRootOfUnityBranchLatex(rootSign: 1 | -1, magnitude: string, omegaImaginarySign: 1 | -1) {
  const realSign = rootSign === 1 ? -1 : 1;
  const imaginarySign = (rootSign * omegaImaginarySign) as 1 | -1;
  return `${signedTermLatex(halfFactorLatex(magnitude), realSign, true)}${signedTermLatex(
    sqrtThreeHalfFactorLatex(magnitude),
    imaginarySign,
  )}i`;
}

function complexPowerBranchLatex(rootLatex: string, degree: number) {
  const root = normalizeImaginaryLatex(rootLatex);
  if (degree === 2) {
    return [negateLatex(root), root];
  }

  const signedRoot = signedRootFactor(root);
  const groupedRoot = groupedFactorLatex(root);
  if (degree === 3) {
    return [
      root,
      cubicRootOfUnityBranchLatex(signedRoot.sign, signedRoot.magnitude, 1),
      cubicRootOfUnityBranchLatex(signedRoot.sign, signedRoot.magnitude, -1),
    ];
  }

  if (degree === 4) {
    const groupedMagnitude = groupedFactorLatex(signedRoot.magnitude);
    if (signedRoot.sign === -1) {
      return [
        root,
        signedRoot.magnitude,
        `-i${groupedMagnitude}`,
        `i${groupedMagnitude}`,
      ];
    }
    return [
      root,
      negateLatex(root),
      `i${groupedRoot}`,
      `-i${groupedRoot}`,
    ];
  }

  return [];
}

function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

function stop(
  reason: EquationAlgebraicIsolationStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): EquationAlgebraicIsolationStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function collectAffineTarget(node: MathJson, target: string): AffineTarget | null {
  if (typeof node === 'string') {
    return node === target
      ? { coefficient: ONE, constant: ZERO }
      : { coefficient: ZERO, constant: node };
  }

  if (typeof node === 'number' || typeof node === 'boolean' || node === null || !isArrayNode(node)) {
    return hasTarget(node, target)
      ? null
      : { coefficient: ZERO, constant: node };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let coefficient: MathJson = ZERO;
    let constant: MathJson = ZERO;
    for (const operand of operands) {
      const collected = collectAffineTarget(operand as MathJson, target);
      if (!collected) {
        return null;
      }
      coefficient = addNodes(coefficient, collected.coefficient);
      constant = addNodes(constant, collected.constant);
    }
    return { coefficient, constant };
  }

  if (operator === 'Subtract') {
    const left = collectAffineTarget(operands[0] as MathJson, target);
    const right = collectAffineTarget(operands[1] as MathJson, target);
    if (!left || !right) {
      return null;
    }
    return {
      coefficient: subtractNodes(left.coefficient, right.coefficient),
      constant: subtractNodes(left.constant, right.constant),
    };
  }

  if (operator === 'Negate') {
    const collected = collectAffineTarget(operands[0] as MathJson, target);
    return collected
      ? {
        coefficient: negateNode(collected.coefficient),
        constant: negateNode(collected.constant),
      }
      : null;
  }

  if (operator === 'Multiply' || operator === 'InvisibleOperator') {
    const factors = flattenMultiply(operands as MathJson[]);
    const targetFactors = factors.filter((factor) => hasTarget(factor, target));
    if (targetFactors.length > 1) {
      return null;
    }
    if (targetFactors.length === 0) {
      return { coefficient: ZERO, constant: multiplyNodes(...factors) };
    }
    const affine = collectAffineTarget(targetFactors[0], target);
    if (!affine) {
      return null;
    }
    const scale = multiplyNodes(...factors.filter((factor) => !hasTarget(factor, target)));
    return {
      coefficient: multiplyNodes(scale, affine.coefficient),
      constant: multiplyNodes(scale, affine.constant),
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands as MathJson[];
    if (hasTarget(denominator, target)) {
      return null;
    }
    const collected = collectAffineTarget(numerator, target);
    return collected
      ? {
        coefficient: divideNodes(collected.coefficient, denominator),
        constant: divideNodes(collected.constant, denominator),
      }
      : null;
  }

  if (hasTarget(node, target)) {
    return null;
  }

  return { coefficient: ZERO, constant: node };
}

function targetDegree(node: MathJson, target: string): DegreeResult {
  if (typeof node === 'string') {
    return { kind: 'ok', degree: node === target ? 1 : 0 };
  }

  if (typeof node === 'number' || typeof node === 'boolean' || node === null || !isArrayNode(node)) {
    return hasTarget(node, target) ? { kind: 'unsupported' } : { kind: 'ok', degree: 0 };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add' || operator === 'Subtract') {
    let degree = 0;
    for (const operand of operands) {
      const child = targetDegree(operand as MathJson, target);
      if (child.kind === 'unsupported') {
        return child;
      }
      degree = Math.max(degree, child.degree);
    }
    return { kind: 'ok', degree };
  }

  if (operator === 'Negate') {
    return targetDegree(operands[0] as MathJson, target);
  }

  if (operator === 'Multiply' || operator === 'InvisibleOperator') {
    let degree = 0;
    for (const operand of flattenMultiply(operands as MathJson[])) {
      const child = targetDegree(operand, target);
      if (child.kind === 'unsupported') {
        return child;
      }
      degree += child.degree;
      if (degree > MAX_ALGEBRAIC_POWER) {
        return { kind: 'ok', degree };
      }
    }
    return { kind: 'ok', degree };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands as MathJson[];
    if (hasTarget(denominator, target)) {
      return { kind: 'unsupported' };
    }
    return targetDegree(numerator, target);
  }

  if (operator === 'Power') {
    const [base, exponent] = operands as MathJson[];
    if (typeof exponent !== 'number' || !Number.isInteger(exponent) || exponent < 0) {
      return hasTarget(node, target) ? { kind: 'unsupported' } : { kind: 'ok', degree: 0 };
    }
    const baseDegree = targetDegree(base, target);
    return baseDegree.kind === 'unsupported'
      ? baseDegree
      : { kind: 'ok', degree: baseDegree.degree * exponent };
  }

  return hasTarget(node, target) ? { kind: 'unsupported' } : { kind: 'ok', degree: 0 };
}

function polynomialDegreeInEquation(json: MathJson, target: string) {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  const zeroForm = subtractNodes(json[1] as MathJson, json[2] as MathJson);
  const degree = targetDegree(zeroForm, target);
  return degree.kind === 'ok' ? degree.degree : null;
}

function peelAdd(node: MathJson[], otherSide: MathJson, target: string): PeelResult {
  const terms = node.slice(1) as MathJson[];
  const targetTerms = terms.filter((term) => hasTarget(term, target));
  if (targetTerms.length > 1) {
    return {
      kind: 'unsupported',
      reason: 'multiple-target-islands',
      message: 'The selected target appears in more than one algebraic island.',
    };
  }
  if (targetTerms.length === 0) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'No selected-target term was found in this algebraic shell.',
    };
  }

  const targetTerm = targetTerms[0];
  const targetFreeSum = addNodes(...terms.filter((term) => !hasTarget(term, target)));
  return {
    kind: 'ok',
    step: {
      expression: targetTerm,
      otherSide: subtractNodes(otherSide, targetFreeSum),
      facts: [],
      line: `Moved target-free additive terms away from ${latexForNode(targetTerm)}.`,
    },
  };
}

function peelMultiply(node: MathJson[], otherSide: MathJson, target: string): PeelResult {
  const factors = flattenMultiply(node.slice(1) as MathJson[]);
  const targetFactors = factors.filter((factor) => hasTarget(factor, target));
  if (targetFactors.length > 1) {
    return {
      kind: 'unsupported',
      reason: 'target-in-shell-factor',
      message: 'The selected target appears in more than one multiplicative factor.',
    };
  }
  if (targetFactors.length === 0) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'No selected-target factor was found in this algebraic shell.',
    };
  }

  const targetFreeProduct = multiplyNodes(...factors.filter((factor) => !hasTarget(factor, target)));
  const nonzeroFact = factNonzero(targetFreeProduct);
  return {
    kind: 'ok',
    step: {
      expression: targetFactors[0],
      otherSide: divideNodes(otherSide, targetFreeProduct),
      facts: nonzeroFact ? [nonzeroFact] : [],
      line: `Divided by the target-free factor ${latexForNode(targetFreeProduct)}.`,
    },
  };
}

function peelDivide(node: MathJson[], otherSide: MathJson, target: string): PeelResult {
  if (node.length !== 3) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'Only simple quotient shells are supported by algebraic isolation.',
    };
  }

  const numerator = node[1] as MathJson;
  const denominator = node[2] as MathJson;
  const numeratorHasTarget = hasTarget(numerator, target);
  const denominatorHasTarget = hasTarget(denominator, target);

  if (denominatorHasTarget) {
    return {
      kind: 'unsupported',
      reason: 'target-in-denominator',
      message: 'The selected target appears in a denominator shell.',
    };
  }

  if (!numeratorHasTarget) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-shell',
      message: 'No selected-target numerator was found in this quotient shell.',
    };
  }

  const nonzeroFact = factNonzero(denominator);
  return {
    kind: 'ok',
    step: {
      expression: numerator,
      otherSide: multiplyNodes(otherSide, denominator),
      facts: nonzeroFact ? [nonzeroFact] : [],
      line: `Multiplied by the target-free denominator ${latexForNode(denominator)}.`,
    },
  };
}

function peelOnce(expression: MathJson, otherSide: MathJson, target: string): PeelResult {
  if (!isArrayNode(expression)) {
    return {
      kind: 'unsupported',
      reason: 'no-algebraic-isolation',
      message: 'No algebraic power shell remains to isolate.',
    };
  }

  if (expression[0] === 'Add') {
    return peelAdd(expression as MathJson[], otherSide, target);
  }

  if (expression[0] === 'Multiply' || expression[0] === 'InvisibleOperator') {
    return peelMultiply(expression as MathJson[], otherSide, target);
  }

  if (expression[0] === 'Divide') {
    return peelDivide(expression as MathJson[], otherSide, target);
  }

  if (expression[0] === 'Negate' && expression.length === 2) {
    return {
      kind: 'ok',
      step: {
        expression: expression[1] as MathJson,
        otherSide: negateNode(otherSide),
        facts: [],
        line: 'Removed a leading negative sign from the selected-target expression.',
      },
    };
  }

  return {
    kind: 'unsupported',
    reason: 'no-algebraic-isolation',
    message: 'No algebraic power shell remains to isolate.',
  };
}

function solvePowerExpression({
  expression,
  otherSide,
  target,
  parameterNames,
  steps,
  facts,
  answerDomain,
}: {
  expression: MathJson;
  otherSide: MathJson;
  target: string;
  parameterNames: string[];
  steps: PeelStep[];
  facts: string[];
  answerDomain?: AnswerDomain;
}): EquationAlgebraicIsolationSuccess | EquationAlgebraicIsolationStop | null {
  if (!isArrayNode(expression) || expression[0] !== 'Power' || expression.length !== 3) {
    return null;
  }

  const degree = expression[2];
  if (typeof degree !== 'number' || !Number.isInteger(degree)) {
    return stop(
      'unsupported-power-degree',
      'Algebraic isolation only handles integer selected-target powers.',
      target,
      parameterNames,
    );
  }

  if (answerDomain === 'complex') {
    if (degree < 2 || degree > MAX_ALGEBRAIC_POWER) {
      return stop(
        'unsupported-power-degree',
        `Complex algebraic isolation is capped at selected-target powers 2 through ${MAX_ALGEBRAIC_POWER}.`,
        target,
        parameterNames,
      );
    }
  } else if (degree < 3 || degree > MAX_ALGEBRAIC_POWER) {
    return stop(
      'unsupported-power-degree',
      `Algebraic isolation is capped at selected-target powers 3 through ${MAX_ALGEBRAIC_POWER}.`,
      target,
      parameterNames,
    );
  }

  const affine = collectAffineTarget(expression[1] as MathJson, target);
  if (!affine || isZeroNode(simplifyNode(affine.coefficient))) {
    return stop(
      'unsupported-power-base',
      'The selected-target power base is not affine in the selected target.',
      target,
      parameterNames,
    );
  }

  const root = rootNode(otherSide, degree);
  if (answerDomain === 'complex') {
    if (!isOneNode(simplifyNode(affine.coefficient)) || !isZeroNode(simplifyNode(affine.constant))) {
      return stop(
        'unsupported-power-base',
        'Complex selected-target power isolation only handles direct selected-target bases in this bounded pass.',
        target,
        parameterNames,
      );
    }

    const generatedEquationLatex = equationLatex(expression, otherSide);
    const roots = complexPowerBranchLatex(latexForNode(root), degree);
    const detailSections = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Complex Algebraic Isolation',
      familyLines: [
        `Isolated a selected-target power of degree ${degree} over the complex domain.`,
        `Generated equation: ${generatedEquationLatex}`,
        ...steps.map((step) => step.line),
        'Returned bounded complex formula branches because Complex intent is enabled.',
      ],
    });

    return {
      kind: 'success',
      target,
      parameterNames,
      generatedEquationLatex,
      exactLatex: exactLatexForSolutions(target, roots),
      exactSupplementLatex: normalizeParameterizedSupplementLatex(facts),
      detailSections,
      answerDomain: 'complex',
    };
  }

  const baseBranches = degree % 2 === 0 ? [negateNode(root), root] : [root];
  const coefficientFact = factNonzero(affine.coefficient);
  const allFacts = [
    ...facts,
    ...(coefficientFact ? [coefficientFact] : []),
    ...(degree % 2 === 0 ? [`${latexForNode(otherSide)}\\ge0`] : []),
  ];
  const roots = baseBranches.map((branch) =>
    latexForNode(divideNodes(subtractNodes(branch, affine.constant), affine.coefficient)));
  const generatedEquationLatex = equationLatex(expression, otherSide);
  const detailSections = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Algebraic Isolation',
    familyLines: [
      `Isolated a selected-target power of degree ${degree}.`,
      `Generated equation: ${generatedEquationLatex}`,
      ...steps.map((step) => step.line),
      degree % 2 === 0
        ? 'Returned both real even-root branches under the displayed validity condition.'
        : 'Returned the real odd-root branch.',
    ],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    generatedEquationLatex,
    exactLatex: exactLatexForSolutions(target, roots),
    exactSupplementLatex: normalizeParameterizedSupplementLatex(allFacts),
    detailSections,
  };
}

export function solveEquationAlgebraicIsolation(
  equationLatex: string,
  target: string,
  options: EquationAlgebraicIsolationOptions = {},
): EquationAlgebraicIsolationResult {
  const normalized = normalizeExplicitNamedVariablesInLatex(equationLatex);
  const sourceLatex = normalized.latex;
  const parameterNames = parameterNamesFromLatex(sourceLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(sourceLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before algebraic selected-target isolation.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(sourceLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for algebraic selected-target isolation.', target, parameterNames);
  }

  const json = parsed.json as MathJson;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before algebraic selected-target isolation.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const factorable = solveParameterizedFactorablePolynomialEquation(sourceLatex, target, {
    allowGeneratedImplicitProducts: true,
  });
  if (factorable.kind === 'success') {
    return {
      kind: 'success',
      target,
      parameterNames,
      generatedEquationLatex: sourceLatex,
      exactLatex: factorable.exactLatex,
      exactSupplementLatex: factorable.exactSupplementLatex,
      detailSections: buildParameterizedDetailSections({
        target,
        parameterNames,
        familyTitle: 'Algebraic Isolation',
        familyLines: [
          'Delegated a bounded degree-3/4 factorable polynomial to the existing exact factor solver.',
          `Generated equation: ${sourceLatex}`,
        ],
        extraSections: factorable.detailSections.filter((section) => section.title !== 'Solve Target'),
      }),
    };
  }

  let expression = json[1] as MathJson;
  let otherSide = json[2] as MathJson;
  const leftHasTarget = hasTarget(expression, target);
  const rightHasTarget = hasTarget(otherSide, target);

  if (leftHasTarget && rightHasTarget) {
    const degree = polynomialDegreeInEquation(json, target);
    return degree && degree >= 3 && degree <= MAX_ALGEBRAIC_POWER
      ? stop(
        'formula-size-limit',
        'The guarded exact cubic/quartic formula exceeded the symbolic readback cap.',
        target,
        parameterNames,
      )
      : stop(
        'target-on-both-sides',
        'The selected target appears on both sides of the equation.',
        target,
        parameterNames,
      );
  }

  if (!leftHasTarget && rightHasTarget) {
    expression = json[2] as MathJson;
    otherSide = json[1] as MathJson;
  }

  const steps: PeelStep[] = [];
  const facts = [...(options.inheritedFacts ?? [])];

  for (let depth = 0; depth < 8; depth += 1) {
    const solved = solvePowerExpression({
      expression,
      otherSide,
      target,
      parameterNames,
      steps,
      facts,
      answerDomain: options.answerDomain,
    });
    if (solved) {
      return solved;
    }

    const peel = peelOnce(expression, otherSide, target);
    if (peel.kind === 'unsupported') {
      const degree = polynomialDegreeInEquation(json, target);
      if (degree && degree >= 3 && degree <= MAX_ALGEBRAIC_POWER) {
        return stop(
          'formula-size-limit',
          'The guarded exact cubic/quartic formula exceeded the symbolic readback cap.',
          target,
          parameterNames,
        );
      }
      return stop(peel.reason, peel.message, target, parameterNames);
    }

    steps.push(peel.step);
    facts.push(...peel.step.facts);
    expression = peel.step.expression;
    otherSide = peel.step.otherSide;
  }

  return stop(
    'unsupported-shell',
    'Algebraic selected-target isolation reached its shell depth cap.',
    target,
    parameterNames,
  );
}
