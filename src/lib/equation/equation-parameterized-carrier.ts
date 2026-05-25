import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from './equation-parameterized-rational';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ParameterizedCarrierStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-carrier'
  | 'multiple-carriers'
  | 'nested-carrier'
  | 'unsupported-shell'
  | 'target-in-unsupported-operation'
  | 'branch-unsupported';

export type ParameterizedCarrierSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  branchEquations: string[];
};

export type ParameterizedCarrierSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedCarrierStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedCarrierSolveResult =
  | ParameterizedCarrierSolveSuccess
  | ParameterizedCarrierSolveStop;

export type ParameterizedCarrierSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

type CarrierKind = 'absolute-value' | 'square-root' | 'square-power';

type CarrierProfile = {
  kind: CarrierKind;
  node: MathJson;
  inner: MathJson;
  labelLatex: string;
};

type CarrierAffine = {
  coefficient: MathJson;
  constant: MathJson;
  carrier: CarrierProfile | null;
};

type CollectResult =
  | { kind: 'ok'; affine: CarrierAffine }
  | { kind: 'unsupported'; reason: ParameterizedCarrierStopReason; message: string };

type BranchSolveResult =
  | { kind: 'success'; exactLatex: string; exactSupplementLatex?: string[] }
  | { kind: 'unsupported'; message: string };

const ZERO: MathJson = 0;
const ONE: MathJson = 1;

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
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
    return -node as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Negate') {
    return node[1] as MathJson;
  }
  if (isArrayNode(node) && node[0] === 'Add') {
    return addNodes(...node.slice(1).map((term) => negateNode(term as MathJson)));
  }
  return simplifyNode(['Negate', node] as MathJson);
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

function subtractAffine(left: CarrierAffine, right: CarrierAffine): CollectResult {
  return addAffine(left, {
    coefficient: negateNode(right.coefficient),
    constant: negateNode(right.constant),
    carrier: right.carrier,
  });
}

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

function carrierKey(carrier: CarrierProfile) {
  return `${carrier.kind}:${latexForNode(carrier.node)}`;
}

function unsupported(
  reason: ParameterizedCarrierStopReason,
  message: string,
): CollectResult {
  return { kind: 'unsupported', reason, message };
}

function containsSelectedCarrier(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (
    (operator === 'Abs' || operator === 'Sqrt')
    && operands.some((operand) => hasTarget(operand, target))
  ) {
    return true;
  }
  if (
    operator === 'Power'
    && operands.length === 2
    && typeof operands[1] === 'number'
    && Number.isInteger(operands[1])
    && operands[1] === 2
    && hasTarget(operands[0], target)
  ) {
    return true;
  }
  return operands.some((operand) => containsSelectedCarrier(operand, target));
}

function matchCarrier(node: unknown, target: string): CarrierProfile | null {
  if (!isArrayNode(node)) {
    return null;
  }

  const [operator, ...operands] = node;
  if ((operator === 'Abs' || operator === 'Sqrt') && operands.length === 1) {
    const inner = operands[0] as MathJson;
    if (!hasTarget(inner, target)) {
      return null;
    }
    return {
      kind: operator === 'Abs' ? 'absolute-value' : 'square-root',
      node: node as MathJson,
      inner,
      labelLatex: latexForNode(node as MathJson),
    };
  }

  if (
    operator === 'Power'
    && operands.length === 2
    && operands[1] === 2
    && hasTarget(operands[0], target)
  ) {
    return {
      kind: 'square-power',
      node: node as MathJson,
      inner: operands[0] as MathJson,
      labelLatex: latexForNode(node as MathJson),
    };
  }

  return null;
}

function mergeCarriers(left: CarrierProfile | null, right: CarrierProfile | null): CarrierProfile | null | 'multiple' {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return carrierKey(left) === carrierKey(right) ? left : 'multiple';
}

function addAffine(left: CarrierAffine, right: CarrierAffine): CollectResult {
  const carrier = mergeCarriers(left.carrier, right.carrier);
  if (carrier === 'multiple') {
    return unsupported(
      'multiple-carriers',
      'EQUATION-PARAM4 supports one selected-target nonperiodic carrier at a time.',
    );
  }
  return {
    kind: 'ok',
    affine: {
      coefficient: addNodes(left.coefficient, right.coefficient),
      constant: addNodes(left.constant, right.constant),
      carrier,
    },
  };
}

function collectCarrierAffine(node: unknown, target: string): CollectResult {
  const carrier = matchCarrier(node, target);
  if (carrier) {
    if (containsSelectedCarrier(carrier.inner, target)) {
      return unsupported(
        'nested-carrier',
        'Nested selected-target carriers are outside EQUATION-PARAM4 nonperiodic carrier solving.',
      );
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: ONE,
        constant: ZERO,
        carrier,
      },
    };
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return {
      kind: 'ok',
      affine: {
        coefficient: ZERO,
        constant: node as MathJson,
        carrier: null,
      },
    };
  }

  if (!isArrayNode(node)) {
    if (hasTarget(node, target)) {
      return unsupported(
        'target-in-unsupported-operation',
        'The selected target appears in an unsupported nonperiodic carrier shape.',
      );
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: ZERO,
        constant: node as MathJson,
        carrier: null,
      },
    };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: CarrierAffine = { coefficient: ZERO, constant: ZERO, carrier: null };
    for (const operand of operands) {
      const collected = collectCarrierAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const next = addAffine(current, collected.affine);
      if (next.kind === 'unsupported') {
        return next;
      }
      current = next.affine;
    }
    return { kind: 'ok', affine: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectCarrierAffine(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectCarrierAffine(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return subtractAffine(leftCollected.affine, rightCollected.affine);
  }

  if (operator === 'Negate') {
    const collected = collectCarrierAffine(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return {
      kind: 'ok',
      affine: {
        coefficient: negateNode(collected.affine.coefficient),
        constant: negateNode(collected.affine.constant),
        carrier: collected.affine.carrier,
      },
    };
  }

  if (operator === 'Multiply') {
    const collected = operands.map((operand) => collectCarrierAffine(operand, target));
    const unsupportedEntry = collected.find((entry) => entry.kind === 'unsupported');
    if (unsupportedEntry?.kind === 'unsupported') {
      return unsupportedEntry;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; affine: CarrierAffine } => entry.kind === 'ok')
      .map((entry) => entry.affine);
    const carrierFactors = affines.filter((entry) => entry.carrier);
    if (carrierFactors.length === 0) {
      return {
        kind: 'ok',
        affine: {
          coefficient: ZERO,
          constant: multiplyNodes(...affines.map((entry) => entry.constant)),
          carrier: null,
        },
      };
    }
    if (
      carrierFactors.length > 1
      || !isZeroNode(carrierFactors[0].constant)
    ) {
      return unsupported(
        'unsupported-shell',
        'EQUATION-PARAM4 only supports affine shells around one selected-target carrier.',
      );
    }
    const targetFreeFactors = affines
      .filter((entry) => entry !== carrierFactors[0])
      .map((entry) => entry.constant);
    return {
      kind: 'ok',
      affine: {
        coefficient: multiplyNodes(...targetFreeFactors, carrierFactors[0].coefficient),
        constant: ZERO,
        carrier: carrierFactors[0].carrier,
      },
    };
  }

  if (hasTarget(node, target)) {
    return unsupported(
      'target-in-unsupported-operation',
      'This selected-target expression is outside EQUATION-PARAM4 nonperiodic carrier solving.',
    );
  }

  return {
    kind: 'ok',
    affine: {
      coefficient: ZERO,
      constant: node as MathJson,
      carrier: null,
    },
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

function nodeHasSymbol(node: MathJson) {
  return analyzeVariablesFromLatex(latexForNode(node), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

function signlessLatexForNode(node: MathJson) {
  const latex = latexForNode(node);
  return latex.startsWith('-') ? latex.slice(1) : latex;
}

function nonzeroFactForCoefficient(coefficient: MathJson): string | null {
  if (!nodeHasSymbol(coefficient)) {
    return null;
  }
  return `${signlessLatexForNode(coefficient)}\\ne0`;
}

function nonnegativeFactForValue(value: MathJson): string | null {
  if (!nodeHasSymbol(value)) {
    return null;
  }
  return `${latexForNode(value)}\\ge0`;
}

function stop(
  reason: ParameterizedCarrierStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedCarrierSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function branchEquationsForCarrier(carrier: CarrierProfile, value: MathJson) {
  if (carrier.kind === 'square-root') {
    return [latexForNode(carrier.inner) + '=' + latexForNode(simplifyNode(['Power', value, 2] as MathJson))];
  }

  if (carrier.kind === 'square-power') {
    const sqrtValue = simplifyNode(['Sqrt', value] as MathJson);
    return [
      latexForNode(carrier.inner) + '=' + latexForNode(sqrtValue),
      latexForNode(carrier.inner) + '=' + latexForNode(negateNode(sqrtValue)),
    ];
  }

  return [
    latexForNode(carrier.inner) + '=' + latexForNode(value),
    latexForNode(carrier.inner) + '=' + latexForNode(negateNode(value)),
  ];
}

function solveBranchEquation(equationLatex: string, target: string): BranchSolveResult {
  const options = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(equationLatex, target, options);
  if (linear.kind === 'success') {
    return linear;
  }

  const polynomial = solveParameterizedPolynomialEquation(equationLatex, target, options);
  if (polynomial.kind === 'success') {
    return polynomial;
  }

  const rational = solveParameterizedRationalEquation(equationLatex, target, options);
  if (rational.kind === 'success') {
    return rational;
  }

  return {
    kind: 'unsupported',
    message: rational.reason === 'not-rational' ? polynomial.message : rational.message,
  };
}

function solutionExpressionsFromExactLatex(exactLatex: string, target: string) {
  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith('\\right\\}')) {
    return exactLatex
      .slice(setPrefix.length, -'\\right\\}'.length)
      .split(/,\\\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [exactLatex];
}

function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  const unique = dedupe(solutionExpressions);
  if (unique.length === 1) {
    return `${target}=${unique[0]}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

export function solveParameterizedCarrierEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedCarrierSolveOptions = {},
): ParameterizedCarrierSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized carrier solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized carrier solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized carrier solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectCarrierAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectCarrierAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractAffine(left.affine, right.affine);
  if (normalized.kind === 'unsupported') {
    return stop(normalized.reason, normalized.message, target, parameterNames);
  }

  const carrier = normalized.affine.carrier;
  if (!carrier) {
    return stop(
      'no-carrier',
      'No supported nonperiodic carrier was found for EQUATION-PARAM4.',
      target,
      parameterNames,
    );
  }

  if (isZeroNode(normalized.affine.coefficient)) {
    return stop(
      'unsupported-shell',
      'The selected-target carrier cancels before isolation.',
      target,
      parameterNames,
    );
  }

  const carrierValue = divideNodes(negateNode(normalized.affine.constant), normalized.affine.coefficient);
  const branchEquations = dedupe(branchEquationsForCarrier(carrier, carrierValue));
  const solvedBranches = branchEquations.map((branchLatex) => solveBranchEquation(branchLatex, target));
  const failedBranch = solvedBranches.find((entry) => entry.kind === 'unsupported');
  if (failedBranch?.kind === 'unsupported') {
    return stop(
      'branch-unsupported',
      `A generated nonperiodic carrier branch is outside current selected-target parameter solvers. ${failedBranch.message}`,
      target,
      parameterNames,
    );
  }

  const successfulBranches = solvedBranches.filter(
    (entry): entry is Extract<BranchSolveResult, { kind: 'success' }> => entry.kind === 'success',
  );
  const solutionExpressions = successfulBranches.flatMap((branch) =>
    solutionExpressionsFromExactLatex(branch.exactLatex, target));
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    nonzeroFactForCoefficient(normalized.affine.coefficient),
    nonnegativeFactForValue(carrierValue),
    ...successfulBranches.flatMap((branch) => branch.exactSupplementLatex ?? []),
  ].filter((entry): entry is string => Boolean(entry))));
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Carrier Solve',
    familyLines: [
      `Isolated ${carrier.labelLatex}=${latexForNode(carrierValue)} using a bounded nonperiodic carrier rule.`,
      `Generated ${branchEquations.length} branch equation${branchEquations.length === 1 ? '' : 's'} and solved them through existing selected-target parameter solvers.`,
    ],
    extraSections: [{
      title: 'Carrier Branches',
      lines: branchEquations,
    }],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solutionExpressions),
    exactSupplementLatex,
    detailSections,
    branchEquations,
  };
}
