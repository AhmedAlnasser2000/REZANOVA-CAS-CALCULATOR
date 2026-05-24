import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  type CompositionCarrier,
  type CompositionMathJson,
  compositionLatexForNode,
  simplifyCompositionNode,
} from './composition-core';
import { solveParameterizedFactorablePolynomialEquation } from './equation-parameterized-factorable-polynomial';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from './equation-parameterized-rational';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();
const MAX_MIXED_CARRIERS = 2;
const MAX_GENERATED_BRANCHES = 8;

type MathJson = CompositionMathJson;
type AlgebraicCarrierKind = 'absolute-value' | 'square-root' | 'square-power';

export type ParameterizedMixedAlgebraicStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-mixed-algebraic'
  | 'mixed-carriers'
  | 'target-outside-carrier'
  | 'branch-limit'
  | 'unsupported-branch';

export type ParameterizedMixedAlgebraicSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  generatedEquationLatex: string[];
};

export type ParameterizedMixedAlgebraicSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedMixedAlgebraicStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedMixedAlgebraicSolveResult =
  | ParameterizedMixedAlgebraicSolveSuccess
  | ParameterizedMixedAlgebraicSolveStop;

type AlgebraicCarrier = CompositionCarrier & {
  kind: AlgebraicCarrierKind;
};

type CarrierTerm = {
  carrier: AlgebraicCarrier;
  coefficient: MathJson;
};

type MixedAffine = {
  constant: MathJson;
  terms: CarrierTerm[];
  facts: string[];
};

type CollectResult =
  | { kind: 'ok'; value: MixedAffine }
  | { kind: 'unsupported'; reason: ParameterizedMixedAlgebraicStopReason; message: string };

type BranchSolveResult =
  | { kind: 'success'; exactLatex: string; exactSupplementLatex?: string[] }
  | { kind: 'unsupported'; reason: ParameterizedMixedAlgebraicStopReason; message: string };

type SolveCarrierResult =
  | { kind: 'success'; solutions: string[]; supplements: string[]; generatedEquations: string[] }
  | { kind: 'unsupported'; reason: ParameterizedMixedAlgebraicStopReason; message: string };

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
  return simplifyCompositionNode(node);
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

function subtractNodes(left: MathJson, right: MathJson) {
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

function squareNode(node: MathJson): MathJson {
  return simplifyNode(['Power', node, 2] as MathJson);
}

function expandedProduct(left: MathJson, right: MathJson): MathJson {
  const expandedLeft = expandAlgebraicNode(left);
  const expandedRight = expandAlgebraicNode(right);
  if (isArrayNode(expandedLeft) && expandedLeft[0] === 'Add') {
    return addNodes(...expandedLeft.slice(1).map((term) =>
      expandedProduct(term as MathJson, expandedRight)));
  }
  if (isArrayNode(expandedRight) && expandedRight[0] === 'Add') {
    return addNodes(...expandedRight.slice(1).map((term) =>
      expandedProduct(expandedLeft, term as MathJson)));
  }
  return multiplyNodes(expandedLeft, expandedRight);
}

function expandAlgebraicNode(node: MathJson): MathJson {
  if (!isArrayNode(node)) {
    return node;
  }
  const [operator, ...operands] = node;
  if (operator === 'Add') {
    return addNodes(...operands.map((operand) => expandAlgebraicNode(operand as MathJson)));
  }
  if (operator === 'Subtract') {
    return subtractNodes(
      expandAlgebraicNode(operands[0] as MathJson),
      expandAlgebraicNode(operands[1] as MathJson),
    );
  }
  if (operator === 'Negate') {
    return negateNode(expandAlgebraicNode(operands[0] as MathJson));
  }
  if (operator === 'Multiply') {
    return operands.reduce<MathJson>(
      (current, operand) => expandedProduct(current, operand as MathJson),
      ONE,
    );
  }
  if (operator === 'Power' && operands.length === 2 && operands[1] === 2) {
    const base = expandAlgebraicNode(operands[0] as MathJson);
    return expandedProduct(base, base);
  }
  return simplifyNode([operator as string, ...operands.map((operand) =>
    expandAlgebraicNode(operand as MathJson))] as MathJson);
}

function expandedSquareNode(node: MathJson): MathJson {
  return expandAlgebraicNode(['Power', node, 2] as MathJson);
}

function latexForNode(node: MathJson) {
  return compositionLatexForNode(node);
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
  reason: ParameterizedMixedAlgebraicStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedMixedAlgebraicSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function unsupported(
  reason: ParameterizedMixedAlgebraicStopReason,
  message: string,
): CollectResult {
  return { kind: 'unsupported', reason, message };
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
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

function nonzeroFactForNode(node: MathJson): string | null {
  if (isOneNode(node) || isNegativeOneNode(node) || !nodeHasSymbol(node)) {
    return null;
  }
  return `${signlessLatexForNode(node)}\\ne0`;
}

function nonnegativeFactForNode(node: MathJson): string | null {
  if (!nodeHasSymbol(node)) {
    return null;
  }
  return `${latexForNode(node)}\\ge0`;
}

function carrierKey(carrier: AlgebraicCarrier) {
  return `${carrier.kind}:${latexForNode(carrier.node)}`;
}

function mergeTerms(terms: CarrierTerm[]) {
  const merged = new Map<string, CarrierTerm>();
  for (const term of terms) {
    const key = carrierKey(term.carrier);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, term);
      continue;
    }
    merged.set(key, {
      carrier: existing.carrier,
      coefficient: addNodes(existing.coefficient, term.coefficient),
    });
  }
  return [...merged.values()].filter((term) => !isZeroNode(term.coefficient));
}

function addAffine(left: MixedAffine, right: MixedAffine): CollectResult {
  const terms = mergeTerms([...left.terms, ...right.terms]);
  if (terms.length > MAX_MIXED_CARRIERS) {
    return unsupported(
      'branch-limit',
      'This algebraic mixed-carrier equation has more independent carriers than the supported cap.',
    );
  }
  return {
      kind: 'ok',
      value: {
        constant: addNodes(left.constant, right.constant),
        terms,
        facts: dedupe([...left.facts, ...right.facts]),
      },
    };
}

function negateAffine(affine: MixedAffine): MixedAffine {
  return {
    constant: negateNode(affine.constant),
    terms: affine.terms.map((term) => ({
      carrier: term.carrier,
      coefficient: negateNode(term.coefficient),
    })),
    facts: affine.facts,
  };
}

function subtractAffine(left: MixedAffine, right: MixedAffine): CollectResult {
  return addAffine(left, negateAffine(right));
}

function hasAlgebraicCarrier(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  return Boolean(matchAlgebraicCarrier(node, target))
    || node.slice(1).some((entry) => hasAlgebraicCarrier(entry, target));
}

function hasTargetInUnsupportedTranscendental(node: unknown, target: string): boolean {
  if (!isArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (
    (
      operator === 'Sin'
      || operator === 'Cos'
      || operator === 'Tan'
      || operator === 'Exp'
      || operator === 'Log'
      || operator === 'Ln'
    )
    && operands.some((operand) => hasTarget(operand, target))
  ) {
    return true;
  }
  return operands.some((operand) => hasTargetInUnsupportedTranscendental(operand, target));
}

function matchAlgebraicCarrier(node: unknown, target: string): AlgebraicCarrier | null {
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

function collectMixedAffine(node: unknown, target: string): CollectResult {
  const carrier = matchAlgebraicCarrier(node, target);
  if (carrier) {
    if (hasAlgebraicCarrier(carrier.inner, target)) {
      return unsupported(
        'unsupported-branch',
        'This algebraic mixed-carrier equation needs deeper nested carrier handling.',
      );
    }
    return {
      kind: 'ok',
      value: {
        constant: ZERO,
        terms: [{ carrier, coefficient: ONE }],
        facts: [],
      },
    };
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return { kind: 'ok', value: { constant: node as MathJson, terms: [], facts: [] } };
  }

  if (!isArrayNode(node)) {
    return { kind: 'ok', value: { constant: node as MathJson, terms: [], facts: [] } };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add') {
    let current: MixedAffine = { constant: ZERO, terms: [], facts: [] };
    for (const operand of operands) {
      const collected = collectMixedAffine(operand, target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      const next = addAffine(current, collected.value);
      if (next.kind === 'unsupported') {
        return next;
      }
      current = next.value;
    }
    return { kind: 'ok', value: current };
  }

  if (operator === 'Subtract') {
    const [left, right] = operands;
    const leftCollected = collectMixedAffine(left, target);
    if (leftCollected.kind === 'unsupported') {
      return leftCollected;
    }
    const rightCollected = collectMixedAffine(right, target);
    if (rightCollected.kind === 'unsupported') {
      return rightCollected;
    }
    return subtractAffine(leftCollected.value, rightCollected.value);
  }

  if (operator === 'Negate') {
    const collected = collectMixedAffine(operands[0], target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    return { kind: 'ok', value: negateAffine(collected.value) };
  }

  if (operator === 'Multiply') {
    const collected = operands.map((operand) => collectMixedAffine(operand, target));
    const failed = collected.find((entry) => entry.kind === 'unsupported');
    if (failed?.kind === 'unsupported') {
      return failed;
    }
    const affines = collected
      .filter((entry): entry is { kind: 'ok'; value: MixedAffine } => entry.kind === 'ok')
      .map((entry) => entry.value);
    const carrierAffines = affines.filter((entry) => entry.terms.length > 0);
    if (carrierAffines.length === 0) {
      return {
        kind: 'ok',
        value: {
          constant: multiplyNodes(...affines.map((entry) => entry.constant)),
          terms: [],
          facts: dedupe(affines.flatMap((entry) => entry.facts)),
        },
      };
    }
    if (
      carrierAffines.length > 1
      || carrierAffines[0].terms.length !== 1
      || !isZeroNode(carrierAffines[0].constant)
    ) {
      return unsupported(
        'target-outside-carrier',
        'The selected target appears in a product that is outside bounded algebraic mixed-carrier solving.',
      );
    }
    const targetFreeFactors = affines
      .filter((entry) => entry !== carrierAffines[0])
      .map((entry) => entry.constant);
    if (targetFreeFactors.some((factor) => hasTarget(factor, target))) {
      return unsupported(
        'target-outside-carrier',
        'Carrier coefficients must be target-free in bounded algebraic mixed-carrier solving.',
      );
    }
    return {
      kind: 'ok',
      value: {
        constant: ZERO,
        terms: [{
          carrier: carrierAffines[0].terms[0].carrier,
          coefficient: multiplyNodes(...targetFreeFactors, carrierAffines[0].terms[0].coefficient),
        }],
        facts: dedupe(affines.flatMap((entry) => entry.facts)),
      },
    };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasAlgebraicCarrier(denominator, target)) {
      return unsupported(
        'unsupported-branch',
        'Algebraic mixed-carrier denominators are outside this bounded exact pass.',
      );
    }
    const collected = collectMixedAffine(numerator, target);
    if (collected.kind === 'unsupported') {
      return collected;
    }
    const denominatorFact = nodeHasSymbol(denominator as MathJson)
      ? `${latexForNode(denominator as MathJson)}\\ne0`
      : null;
    if (collected.value.terms.length === 0) {
      return {
        kind: 'ok',
        value: {
          constant: divideNodes(collected.value.constant, denominator as MathJson),
          terms: [],
          facts: dedupe([
            ...collected.value.facts,
            denominatorFact,
          ].filter((entry): entry is string => Boolean(entry))),
        },
      };
    }
    if (hasTarget(denominator, target)) {
      return unsupported(
        'target-outside-carrier',
        'Carrier denominators must be target-free in bounded algebraic mixed-carrier solving.',
      );
    }
    return {
      kind: 'ok',
      value: {
        constant: divideNodes(collected.value.constant, denominator as MathJson),
        terms: collected.value.terms.map((term) => ({
          carrier: term.carrier,
          coefficient: divideNodes(term.coefficient, denominator as MathJson),
        })),
        facts: dedupe([
          ...collected.value.facts,
          denominatorFact,
        ].filter((entry): entry is string => Boolean(entry))),
      },
    };
  }

  if (hasAlgebraicCarrier(node, target)) {
    return unsupported(
      'unsupported-branch',
      'This algebraic mixed-carrier expression is nested too deeply for the bounded pass.',
    );
  }

  if (hasTargetInUnsupportedTranscendental(node, target)) {
    return unsupported(
      'mixed-carriers',
      'Independent transcendental and algebraic selected-target carriers are not handled by this exact algebraic pass.',
    );
  }

  return { kind: 'ok', value: { constant: node as MathJson, terms: [], facts: [] } };
}

function branchEquationsForCarrier(carrier: AlgebraicCarrier, value: MathJson) {
  const innerLatex = latexForNode(carrier.inner);
  const valueLatex = latexForNode(value);
  if (carrier.kind === 'square-root') {
    return [`${innerLatex}=${latexForNode(expandedSquareNode(value))}`];
  }
  if (carrier.kind === 'square-power') {
    return [
      `${innerLatex}=\\sqrt{${valueLatex}}`,
      `${innerLatex}=-\\sqrt{${valueLatex}}`,
    ];
  }
  return [
    `${innerLatex}=${valueLatex}`,
    `${innerLatex}=${latexForNode(negateNode(value))}`,
  ];
}

function squareEquivalentForCarrier(carrier: AlgebraicCarrier): MathJson | null {
  if (carrier.kind === 'square-root') {
    return carrier.inner;
  }
  if (carrier.kind === 'absolute-value') {
    return squareNode(carrier.inner);
  }
  return null;
}

function solutionExpressionsFromExactLatex(exactLatex: string, target: string) {
  if (exactLatex.includes('\\tilde\\infty')) {
    return [];
  }

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

function solveGeneratedEquation(equationLatex: string, target: string): BranchSolveResult {
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

  const factorable = solveParameterizedFactorablePolynomialEquation(equationLatex, target);
  if (factorable.kind === 'success') {
    return factorable;
  }

  return {
    kind: 'unsupported',
    reason: 'unsupported-branch',
    message: rational.reason === 'not-rational' ? polynomial.message : rational.message,
  };
}

function solveSingleCarrierAffine(
  carrier: AlgebraicCarrier,
  coefficient: MathJson,
  constant: MathJson,
  target: string,
  extraFacts: string[] = [],
): SolveCarrierResult {
  if (isZeroNode(coefficient)) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: 'The algebraic carrier cancels before isolation.',
    };
  }

  const value = divideNodes(negateNode(constant), coefficient);
  const branchEquations = branchEquationsForCarrier(carrier, value);
  if (branchEquations.length > MAX_GENERATED_BRANCHES) {
    return {
      kind: 'unsupported',
      reason: 'branch-limit',
      message: 'Algebraic mixed-carrier branch generation exceeded the supported cap.',
    };
  }

  const solvedBranches = branchEquations.map((equationLatex) => solveGeneratedEquation(equationLatex, target));
  const failedBranch = solvedBranches.find((entry) => entry.kind === 'unsupported');
  if (failedBranch?.kind === 'unsupported') {
    return failedBranch;
  }

  const successfulBranches = solvedBranches.filter(
    (entry): entry is Extract<BranchSolveResult, { kind: 'success' }> => entry.kind === 'success',
  );
  const solutions = successfulBranches.flatMap((branch) =>
    solutionExpressionsFromExactLatex(branch.exactLatex, target));
  const supplements = dedupe([
    nonzeroFactForNode(coefficient),
    carrier.kind === 'square-root' || carrier.kind === 'absolute-value' || carrier.kind === 'square-power'
      ? nonnegativeFactForNode(value)
      : null,
    ...extraFacts,
    ...successfulBranches.flatMap((branch) => branch.exactSupplementLatex ?? []),
  ].filter((entry): entry is string => Boolean(entry)));

  return {
    kind: 'success',
    solutions,
    supplements,
    generatedEquations: branchEquations,
  };
}

function solveTwoCarrierAffine(
  affine: MixedAffine,
  target: string,
): SolveCarrierResult {
  const [first, second] = affine.terms;
  if (!first || !second) {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: 'Two algebraic carriers were expected before branch generation.',
    };
  }

  if (first.carrier.kind === 'square-power') {
    return {
      kind: 'unsupported',
      reason: 'unsupported-branch',
      message: 'Square-power mixed-carrier branches need a simpler companion before this exact pass can solve them.',
    };
  }

  const p = divideNodes(negateNode(affine.constant), first.coefficient);
  const q = divideNodes(negateNode(second.coefficient), first.coefficient);
  const isolatedFirstFact = nonnegativeFactForNode(addNodes(p, multiplyNodes(q, second.carrier.node)));
  const firstCoefficientFact = nonzeroFactForNode(first.coefficient);
  const inheritedFacts = affine.facts;

  if (first.carrier.kind === 'square-root') {
    const secondSquare = squareEquivalentForCarrier(second.carrier);
    if (!secondSquare) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-branch',
        message: 'This square-root mixed-carrier branch would introduce a nested carrier outside the supported pass.',
      };
    }

    const coefficient = multiplyNodes(2, p, q);
    if (isZeroNode(coefficient)) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-branch',
        message: 'The mixed square-root branch cancels before a bounded second-carrier isolation.',
      };
    }

    const constant = subtractNodes(
      addNodes(expandedSquareNode(p), multiplyNodes(expandedSquareNode(q), secondSquare)),
      first.carrier.inner,
    );
    const solved = solveSingleCarrierAffine(
      second.carrier,
      coefficient,
      constant,
      target,
      [
        ...inheritedFacts,
        firstCoefficientFact,
        isolatedFirstFact,
      ].filter((entry): entry is string => Boolean(entry)),
    );
    if (solved.kind === 'unsupported') {
      return solved;
    }
    return {
      ...solved,
      generatedEquations: [
        `${latexForNode(first.carrier.inner)}=${latexForNode(expandedSquareNode(addNodes(p, multiplyNodes(q, second.carrier.node))))}`,
        ...solved.generatedEquations,
      ],
    };
  }

  const branchAffines = [
    {
      coefficient: negateNode(q),
      constant: subtractNodes(first.carrier.inner, p),
    },
    {
      coefficient: q,
      constant: addNodes(first.carrier.inner, p),
    },
  ];
  const branchResults = branchAffines.map((branch) =>
    solveSingleCarrierAffine(
      second.carrier,
      branch.coefficient,
      branch.constant,
      target,
      [
        ...inheritedFacts,
        firstCoefficientFact,
        isolatedFirstFact,
      ].filter((entry): entry is string => Boolean(entry)),
    ));
  const failedBranch = branchResults.find((entry) => entry.kind === 'unsupported');
  if (failedBranch?.kind === 'unsupported') {
    return failedBranch;
  }
  const successes = branchResults.filter(
    (entry): entry is Extract<SolveCarrierResult, { kind: 'success' }> => entry.kind === 'success',
  );
  const generatedEquations = successes.flatMap((entry) => entry.generatedEquations);
  if (generatedEquations.length > MAX_GENERATED_BRANCHES) {
    return {
      kind: 'unsupported',
      reason: 'branch-limit',
      message: 'Algebraic mixed-carrier branch generation exceeded the supported cap.',
    };
  }
  return {
    kind: 'success',
    solutions: successes.flatMap((entry) => entry.solutions),
    supplements: dedupe(successes.flatMap((entry) => entry.supplements)),
    generatedEquations,
  };
}

function solveMixedAffine(affine: MixedAffine, target: string): SolveCarrierResult {
  if (affine.terms.length === 1) {
    const [term] = affine.terms;
    return solveSingleCarrierAffine(term.carrier, term.coefficient, affine.constant, target, affine.facts);
  }

  if (affine.terms.length === 2) {
    return solveTwoCarrierAffine(affine, target);
  }

  return {
    kind: 'unsupported',
    reason: 'no-mixed-algebraic',
    message: 'No additive algebraic selected-target carriers were found.',
  };
}

export function solveParameterizedMixedAlgebraicEquation(
  equationLatex: string,
  target: string,
): ParameterizedMixedAlgebraicSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before algebraic mixed-carrier solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for algebraic mixed-carrier solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before algebraic mixed-carrier solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectMixedAffine(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }
  const right = collectMixedAffine(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  const normalized = subtractAffine(left.value, right.value);
  if (normalized.kind === 'unsupported') {
    return stop(normalized.reason, normalized.message, target, parameterNames);
  }

  if (normalized.value.terms.length === 0) {
    return stop(
      'no-mixed-algebraic',
      'No additive algebraic selected-target carriers were found.',
      target,
      parameterNames,
    );
  }

  if (
    normalized.value.terms.length === 1
    && isZeroNode(normalized.value.constant)
  ) {
    return stop(
      'no-mixed-algebraic',
      'This is a direct algebraic carrier equation, not an additive mixed-carrier equation.',
      target,
      parameterNames,
    );
  }

  const solved = solveMixedAffine(normalized.value, target);
  if (solved.kind === 'unsupported') {
    return stop(solved.reason, solved.message, target, parameterNames);
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex(solved.supplements);
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Mixed Algebraic Solve',
    familyLines: [
      `Collected ${normalized.value.terms.length} algebraic carrier${normalized.value.terms.length === 1 ? '' : 's'} and generated bounded branch equations.`,
      'Conditional branch facts are shown explicitly; they are not simplified into hidden parameter assumptions.',
    ],
    extraSections: [{
      title: 'Branch Conditions',
      lines: [
        ...(exactSupplementLatex ?? []),
        ...solved.generatedEquations.map((entry) => `Generated: ${entry}`),
      ],
    }],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solved.solutions),
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex: solved.generatedEquations,
  };
}
