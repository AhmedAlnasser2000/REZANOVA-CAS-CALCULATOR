import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import { buildAbsoluteValueNonnegativeConstraint as buildSharedAbsNonnegativeConstraint } from '../../../algebra/abs-core';
import {
  isSupportedRadicand,
  matchSupportedRadical,
  matchSupportedRationalPower,
  type SupportedRadical,
  type SupportedRationalPower,
} from '../../../algebra/radical-core';
import { createBranchSet } from '../../../algebra/branch-core';
import { parseExactPolynomial } from '../../../algebra/polynomial-core';
import { recognizeBoundedPolynomialEquationAst } from '../../../algebra/polynomial-factor-solve';
import { solveBoundedPolynomialCarrierEquationAst } from '../../polynomial-carrier-follow-on';
import { normalizeAst } from '../../../symbolic-engine/normalize';
import { boxLatex, dependsOnVariable, isNodeArray, termKey } from '../../../symbolic-engine/patterns';
import type {
  GuardedSolveRequest,
  SerializableMathJson,
  SolveDomainConstraint,
} from '../../../../types/calculator';
import { equationStateKey } from '../state-key';
import type { AlgebraTransform, RadicalTarget } from './types';
import {
  buildDifferenceNode,
  buildNegatedNode,
  buildPowerNode,
  buildPoweredNode,
  buildQuotientNode,
  buildScalarNode,
  buildStructuredDifferenceNode,
  buildStructuredQuotientNode,
  expressionHasVariable,
  getSolveVariable,
  isZeroScalar,
  normalizeScalar,
  parseLinearPlaceholder,
  PLACEHOLDER_SYMBOL,
  readExactScalar,
  replaceFirstMatch,
} from './math-json';
import { proseSolveSummary } from '../../../display/result-detail-lines';

const ce = new ComputeEngine();

function buildNonnegativeConstraint(expression: unknown): SolveDomainConstraint {
  return buildSharedAbsNonnegativeConstraint(expression);
}

function parseRadicalIndex(node: unknown): number | null {
  return typeof node === 'number' && Number.isInteger(node) && node >= 2
    ? node
    : null;
}

function isEquationSupportedQuadraticRadicand(node: unknown, variable: string) {
  const polynomial = parseExactPolynomial(normalizeAst(node), variable, 2);
  return Boolean(polynomial && Math.max(...polynomial.terms.keys(), 0) === 2);
}

function isSupportedVariableFreeExpression(node: unknown, variable: string): boolean {
  const normalized = normalizeAst(node);
  if (dependsOnVariable(normalized, variable)) {
    return false;
  }

  if (readExactScalar(normalized)) {
    return true;
  }

  if (typeof normalized === 'string') {
    return normalized === 'Pi' || normalized === 'ExponentialE';
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return false;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    return isSupportedVariableFreeExpression(normalized[1], variable);
  }

  if ((normalized[0] === 'Add' || normalized[0] === 'Multiply') && normalized.length > 1) {
    return normalized.slice(1).every((child) => isSupportedVariableFreeExpression(child, variable));
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    return (
      isSupportedVariableFreeExpression(normalized[1], variable)
      && isSupportedVariableFreeExpression(normalized[2], variable)
    );
  }

  if (normalized[0] === 'Power' && normalized.length === 3) {
    return (
      isSupportedVariableFreeExpression(normalized[1], variable)
      && isSupportedVariableFreeExpression(normalized[2], variable)
    );
  }

  if (
    (normalized[0] === 'Ln' || normalized[0] === 'Sqrt' || normalized[0] === 'Sin' || normalized[0] === 'Cos'
      || normalized[0] === 'Tan' || normalized[0] === 'Arcsin' || normalized[0] === 'Arccos'
      || normalized[0] === 'Arctan')
    && normalized.length === 2
  ) {
    return isSupportedVariableFreeExpression(normalized[1], variable);
  }

  if (normalized[0] === 'Root' && normalized.length === 3) {
    return (
      isSupportedVariableFreeExpression(normalized[1], variable)
      && isSupportedVariableFreeExpression(normalized[2], variable)
    );
  }

  if (normalized[0] === 'Log' && normalized.length === 3) {
    return (
      isSupportedVariableFreeExpression(normalized[1], variable)
      && isSupportedVariableFreeExpression(normalized[2], variable)
    );
  }

  return false;
}

function matchEquationSupportedRadical(node: unknown, variable: string): SupportedRadical | null {
  const shared = matchSupportedRadical(node, variable);
  if (shared) {
    return shared;
  }

  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (
    normalized[0] === 'Sqrt'
    && normalized.length === 2
    && isEquationSupportedQuadraticRadicand(normalized[1], variable)
  ) {
    return {
      node: normalized,
      radicand: normalized[1],
      index: 2,
    };
  }

  if (
    normalized[0] === 'Root'
    && normalized.length === 3
    && isEquationSupportedQuadraticRadicand(normalized[1], variable)
  ) {
    const index = parseRadicalIndex(normalized[2]);
    if (index !== null) {
      return {
        node: normalized,
        radicand: normalized[1],
        index,
      };
    }
  }

  return null;
}

function matchEquationSupportedIntegerPower(node: unknown, variable: string): SupportedRationalPower | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length !== 3 || normalized[0] !== 'Power') {
    return null;
  }

  if (!isEquationSupportedQuadraticRadicand(normalized[1], variable) && !isSupportedRadicand(normalized[1], variable)) {
    return null;
  }

  const exponent = readExactScalar(normalized[2]);
  if (!exponent || exponent.denominator !== 1 || exponent.numerator <= 1) {
    return null;
  }

  if (!expressionHasVariable(normalized[1])) {
    return null;
  }

  return {
    node: normalized,
    base: normalized[1],
    numerator: exponent.numerator,
    denominator: 1,
  };
}

function collectSupportedRoots(node: unknown, variable: string, roots: SupportedRadical[] = []) {
  const radical = matchEquationSupportedRadical(node, variable);
  if (radical) {
    roots.push(radical);
  }

  if (!isNodeArray(node) || node.length === 0) {
    return roots;
  }

  for (const child of node.slice(1)) {
    collectSupportedRoots(child, variable, roots);
  }

  return roots;
}

function collectRadicalTargets(node: unknown, variable: string, targets: RadicalTarget[] = []) {
  const normalized = normalizeAst(node);
  const root = matchEquationSupportedRadical(normalized, variable);
  if (root) {
    targets.push({
      kind: 'root',
      targetNode: normalized,
      root,
    });
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Divide'
    && normalized.length === 3
  ) {
    const numeratorScalar = readExactScalar(normalized[1]);
    const denominatorRoot = matchEquationSupportedRadical(normalized[2], variable);
    if (numeratorScalar && denominatorRoot) {
      targets.push({
        kind: 'reciprocal-root',
        targetNode: normalized,
        root: denominatorRoot,
        numeratorScalar,
      });
    }
  }

  const power = matchSupportedRationalPower(normalized, variable);
  if (power) {
    targets.push({
      kind: 'power',
      targetNode: normalized,
      power,
    });
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectRadicalTargets(child, variable, targets);
  }

  return targets;
}

function isSupportedRightSideExpression(node: unknown, variable: string): boolean {
  const normalized = normalizeAst(node);
  if (
    readExactScalar(normalized)
    || isSupportedVariableFreeExpression(normalized, variable)
    || isSupportedRadicand(normalized, variable)
    || isEquationSupportedQuadraticRadicand(normalized, variable)
  ) {
    return true;
  }

  if (matchSupportedRadical(normalized, variable)) {
    return true;
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return false;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    return isSupportedRightSideExpression(normalized[1], variable);
  }

  if (normalized[0] === 'Add') {
    return (
      collectSupportedRoots(normalized, variable).length <= 1
      && normalized.slice(1).every((child) => isSupportedRightSideExpression(child, variable))
    );
  }

  if (normalized[0] === 'Multiply') {
    return (
      collectSupportedRoots(normalized, variable).length <= 1
      && normalized.slice(1).every((child) =>
        Boolean(readExactScalar(child) || isSupportedRightSideExpression(child, variable)))
    );
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    return Boolean(
      readExactScalar(normalized[2])
      && isSupportedRightSideExpression(normalized[1], variable)
    );
  }

  return false;
}

function isRecognizedPolynomialSink(
  parsedEquation: unknown,
  carrierHints: unknown[] = [],
) {
  if (recognizeBoundedPolynomialEquationAst(parsedEquation, 'x')) {
    return true;
  }

  return solveBoundedPolynomialCarrierEquationAst(parsedEquation, carrierHints).kind !== 'none';
}

function buildIsolatedExpression(
  targetSide: unknown,
  otherSide: unknown,
  targetKey: string,
): { isolated: unknown; structuredIsolated: unknown } | null {
  const replaced = replaceFirstMatch(targetSide, targetKey, PLACEHOLDER_SYMBOL);
  if (!replaced.replaced) {
    return null;
  }

  const linear = parseLinearPlaceholder(replaced.node, PLACEHOLDER_SYMBOL);
  if (!linear || isZeroScalar(linear.a)) {
    return null;
  }

  const numerator = buildDifferenceNode(otherSide, linear.remainder);
  const structuredNumerator = buildStructuredDifferenceNode(otherSide, linear.remainder);
  const denominatorNode = buildScalarNode(linear.a);
  const isolated = buildQuotientNode(numerator, buildScalarNode(linear.a));
  const structuredIsolated = buildStructuredQuotientNode(structuredNumerator, denominatorNode);
  return {
    isolated,
    structuredIsolated,
  };
}

function buildRadicalPowerTransform(
  root: SupportedRadical,
  isolated: unknown,
  extraConstraints: SolveDomainConstraint[] = [],
  preserveSquareStructure = false,
): AlgebraTransform {
  const powered = root.index === 2
    ? preserveSquareStructure
      ? normalizeAst(buildPowerNode(isolated, 2))
      : normalizeAst((expand(ce.box(['Power', isolated, 2] as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json)
    : buildPowerNode(isolated, root.index);
  const equationLatex = `${boxLatex(root.radicand)}=${boxLatex(powered)}`;
  const domainConstraints = [...extraConstraints];

  if (root.index % 2 === 0) {
    domainConstraints.push(buildNonnegativeConstraint(root.radicand));
    domainConstraints.push(buildNonnegativeConstraint(isolated));
  }

  return {
    equationLatex,
    domainConstraints,
    solveBadges: ['Radical Isolation', 'Root Isolation', 'Power Lift'],
    ...proseSolveSummary('Isolated a root and applied an exact power lift'),
    unresolvedError: 'This recognized radical family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    radicalStepCost: 1,
  };
}

function buildLiftedPowerTransform(
  power: SupportedRationalPower,
  isolated: unknown,
): AlgebraTransform {
  const inverseExponent = normalizeScalar(power.denominator, power.numerator);
  const domainConstraints: SolveDomainConstraint[] = [];
  if (!inverseExponent) {
    return {
      equationLatex: `${boxLatex(power.node)}=${boxLatex(isolated)}`,
      solveBadges: ['Power Lift'],
      ...proseSolveSummary('Isolated a rational power and applied an exact lift'),
      unresolvedError: 'This recognized rational-power family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
    };
  }

  if (power.denominator % 2 === 0) {
    domainConstraints.push(buildNonnegativeConstraint(power.base));
    domainConstraints.push(buildNonnegativeConstraint(isolated));
  }

  if (power.denominator % 2 !== 0 && power.numerator % 2 === 0) {
    domainConstraints.push(buildNonnegativeConstraint(isolated));
  }

  const solvedMagnitude = buildPoweredNode(isolated, inverseExponent);
  const branchNodes = [solvedMagnitude];
  if (power.denominator % 2 !== 0 && power.numerator % 2 === 0) {
    branchNodes.push(buildNegatedNode(solvedMagnitude));
  }

  const branchEquations = createBranchSet({
    equations: branchNodes.map((branchNode) => `${boxLatex(power.base)}=${boxLatex(branchNode)}`),
    constraints: domainConstraints,
    provenance: 'guarded-algebra-stage',
  });

  return {
    equationLatex: branchEquations.equations[0],
    branchEquations: branchEquations.equations,
    domainConstraints: branchEquations.constraints ?? domainConstraints,
    solveBadges: ['Power Lift'],
    ...proseSolveSummary('Isolated a rational power and applied an exact lift'),
    unresolvedError: 'This recognized rational-power family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.',
  };
}

function matchDirectRationalPowerTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const attempts: Array<{ target: unknown; other: unknown }> = [
    { target: leftNode, other: rightNode },
    { target: rightNode, other: leftNode },
  ];

  for (const attempt of attempts) {
    const power =
      matchSupportedRationalPower(attempt.target, variable)
      ?? (
        (request.compositionInversionDepth ?? 0) > 0
          ? matchEquationSupportedIntegerPower(attempt.target, variable)
          : null
      );
    if (!power || !isSupportedRightSideExpression(attempt.other, variable)) {
      continue;
    }
    const normalizedTarget = normalizeAst(attempt.target);
    if (
      isNodeArray(normalizedTarget)
      && (normalizedTarget[0] === 'Sqrt' || normalizedTarget[0] === 'Root')
      && power.numerator === 1
    ) {
      continue;
    }

    const transform = buildLiftedPowerTransform(power, attempt.other);
    if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
      return transform;
    }
  }

  return null;
}

function matchRadicalIsolationTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }
  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);

  const supportedRoots = [
    ...collectSupportedRoots(leftNode, variable),
    ...collectSupportedRoots(rightNode, variable),
  ];
  const supportedTargets = [
    ...collectRadicalTargets(leftNode, variable),
    ...collectRadicalTargets(rightNode, variable),
  ];

  if (supportedTargets.length === 0) {
    return null;
  }

  if (supportedRoots.length > 2) {
    return null;
  }

  if (supportedRoots.length > 1 && supportedRoots.some((root) => root.index !== 2)) {
    return null;
  }

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const candidates = collectRadicalTargets(attempt.targetSide, variable).sort((left, right) => {
      const priority = (target: RadicalTarget) => {
        if (target.kind === 'reciprocal-root') {
          return 0;
        }
        if (target.kind === 'root') {
          return 1;
        }
        return 2;
      };
      return priority(left) - priority(right);
    });

    for (const candidate of candidates) {
      const isolatedBase = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(candidate.targetNode),
      );
      if (!isolatedBase) {
        continue;
      }
      const allowsPolynomialIsolation =
        (request.repeatedClearingDepth ?? 0) > 0
        || (request.polynomialCarrierHints?.length ?? 0) > 0;
      if (
        !isSupportedRightSideExpression(isolatedBase.isolated, variable)
        && !isSupportedRightSideExpression(isolatedBase.structuredIsolated, variable)
        && !(
          allowsPolynomialIsolation
          && (
            parseExactPolynomial(normalizeAst(isolatedBase.isolated), variable, 4)
            || parseExactPolynomial(normalizeAst(isolatedBase.structuredIsolated), variable, 4)
          )
        )
      ) {
        continue;
      }

      if (candidate.kind === 'power') {
        const useStructuredIsolation =
          (request.repeatedClearingDepth ?? 0) > 0
          || (request.polynomialCarrierHints?.length ?? 0) > 0;
        const transform = buildLiftedPowerTransform(
          candidate.power,
          useStructuredIsolation ? isolatedBase.structuredIsolated : isolatedBase.isolated,
        );
        if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
          return transform;
        }
        continue;
      }

      if (candidate.kind === 'root') {
        const useStructuredIsolation =
          (request.repeatedClearingDepth ?? 0) > 0
          || (request.polynomialCarrierHints?.length ?? 0) > 0;
        const transform = buildRadicalPowerTransform(
          candidate.root,
          useStructuredIsolation ? isolatedBase.structuredIsolated : isolatedBase.isolated,
          [],
          useStructuredIsolation,
        );
        if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
          return transform;
        }
        continue;
      }

      const radicalExpression = buildQuotientNode(
        buildScalarNode(candidate.numeratorScalar),
        isolatedBase.isolated,
      );
      const transform = buildRadicalPowerTransform(candidate.root, radicalExpression, [{
        kind: 'nonzero',
        expressionLatex: boxLatex(isolatedBase.isolated),
        expressionMathJson: isolatedBase.isolated as SerializableMathJson,
      }]);
      if (equationStateKey(transform.equationLatex) !== equationStateKey(request.resolvedLatex)) {
        return transform;
      }
    }
  }

  return null;
}

export {
  buildIsolatedExpression,
  buildLiftedPowerTransform,
  buildRadicalPowerTransform,
  collectRadicalTargets,
  collectSupportedRoots,
  isEquationSupportedQuadraticRadicand,
  isRecognizedPolynomialSink,
  isSupportedRightSideExpression,
  matchDirectRationalPowerTransform,
  matchEquationSupportedRadical,
  matchEquationSupportedIntegerPower,
  matchRadicalIsolationTransform,
  parseRadicalIndex,
};
