import { ComputeEngine } from '@cortex-js/compute-engine';
import { matchSupportedRationalPower } from '../../../algebra/radical-core';
import { normalizeAst } from '../../../symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from '../../../symbolic-engine/patterns';
import type { GuardedSolveRequest } from '../../../../types/calculator';
import { equationStateKey } from '../state-key';
import type { AlgebraTransform, RadicalTarget } from './types';
import {
  buildQuotientNode,
  buildScalarNode,
  getSolveVariable,
  mergePolynomialCarrierHints,
} from './math-json';
import {
  buildIsolatedExpression,
  buildLiftedPowerTransform,
  buildRadicalPowerTransform,
  isRecognizedPolynomialSink,
  parseRadicalIndex,
} from './radicals';

const ce = new ComputeEngine();

function countEquationRadicalTargets(
  leftNode: unknown,
  rightNode: unknown,
  variable: string,
) {
  return collectRepeatedClearingTargets(leftNode, variable).length + collectRepeatedClearingTargets(rightNode, variable).length;
}

function isRepeatedClearingSupportedTarget(target: RadicalTarget) {
  if (target.kind === 'power') {
    return target.power.denominator === 2 || target.power.denominator % 2 === 1;
  }

  return target.root.index === 2 || target.root.index % 2 === 1;
}

function collectRepeatedClearingTargets(node: unknown, variable: string, targets: RadicalTarget[] = []) {
  const normalized = normalizeAst(node);
  if (isNodeArray(normalized) && normalized.length > 0) {
    if (normalized[0] === 'Sqrt' && normalized.length === 2) {
      targets.push({
        kind: 'root',
        targetNode: normalized,
        root: {
          node: normalized,
          radicand: normalized[1],
          index: 2,
        },
      });
    } else if (normalized[0] === 'Root' && normalized.length === 3) {
      const index = parseRadicalIndex(normalized[2]);
      if (index !== null) {
        targets.push({
          kind: 'root',
          targetNode: normalized,
          root: {
            node: normalized,
            radicand: normalized[1],
            index,
          },
        });
      }
    } else {
      const power = matchSupportedRationalPower(normalized, variable);
      if (power) {
        targets.push({
          kind: 'power',
          targetNode: normalized,
          power,
        });
      }
    }
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return targets;
  }

  for (const child of normalized.slice(1)) {
    collectRepeatedClearingTargets(child, variable, targets);
  }

  return targets;
}

function buildRepeatedClearingHints(target: RadicalTarget) {
  if (target.kind === 'power') {
    return [target.power.base];
  }

  return [target.root.radicand];
}

function buildRepeatedClearingTransform(
  target: RadicalTarget,
  structuredIsolated: unknown,
): AlgebraTransform {
  if (target.kind === 'power') {
    const transform = buildLiftedPowerTransform(target.power, structuredIsolated);
    return {
      ...transform,
      radicalStepCost: 0,
      repeatedClearingStepCost: 1,
      polynomialCarrierHints: buildRepeatedClearingHints(target),
    };
  }

  if (target.kind === 'root') {
    const transform = buildRadicalPowerTransform(target.root, structuredIsolated, [], true);
    return {
      ...transform,
      radicalStepCost: 0,
      repeatedClearingStepCost: 1,
      polynomialCarrierHints: buildRepeatedClearingHints(target),
    };
  }

  const radicalExpression = buildQuotientNode(
    buildScalarNode(target.numeratorScalar),
    structuredIsolated,
  );
  const transform = buildRadicalPowerTransform(target.root, radicalExpression, [{
    kind: 'nonzero',
    expressionLatex: boxLatex(structuredIsolated),
  }], true);

  return {
    ...transform,
    radicalStepCost: 0,
    repeatedClearingStepCost: 1,
    polynomialCarrierHints: buildRepeatedClearingHints(target),
  };
}

function matchRepeatedClearingTransform(request: GuardedSolveRequest): AlgebraTransform | null {
  const parsed = ce.parse(request.resolvedLatex).json;
  if (!isNodeArray(parsed) || parsed[0] !== 'Equal' || parsed.length !== 3) {
    return null;
  }

  const leftNode = normalizeAst(parsed[1]);
  const rightNode = normalizeAst(parsed[2]);
  const variable = getSolveVariable(leftNode, rightNode);
  const currentTargetCount = countEquationRadicalTargets(leftNode, rightNode, variable);
  if (currentTargetCount === 0) {
    return null;
  }

  const attempts: Array<{ targetSide: unknown; otherSide: unknown }> = [
    { targetSide: leftNode, otherSide: rightNode },
    { targetSide: rightNode, otherSide: leftNode },
  ];

  for (const attempt of attempts) {
    const candidates = collectRepeatedClearingTargets(attempt.targetSide, variable)
      .filter((target) => isRepeatedClearingSupportedTarget(target));

    for (const candidate of candidates) {
      const isolatedBase = buildIsolatedExpression(
        attempt.targetSide,
        attempt.otherSide,
        termKey(candidate.targetNode),
      );
      if (!isolatedBase) {
        continue;
      }

      const transform = buildRepeatedClearingTransform(
        candidate,
        isolatedBase.structuredIsolated,
      );
      if (equationStateKey(transform.equationLatex) === equationStateKey(request.resolvedLatex)) {
        continue;
      }

      const transformedParsed = ce.parse(transform.equationLatex).json;
      if (!isNodeArray(transformedParsed) || transformedParsed[0] !== 'Equal' || transformedParsed.length !== 3) {
        continue;
      }

      const nextLeftNode = normalizeAst(transformedParsed[1]);
      const nextRightNode = normalizeAst(transformedParsed[2]);
      const nextTargetCount = countEquationRadicalTargets(nextLeftNode, nextRightNode, variable);
      const carrierHints = mergePolynomialCarrierHints(
        request.polynomialCarrierHints,
        transform.polynomialCarrierHints,
      );

      if (isRecognizedPolynomialSink(transformedParsed, carrierHints)) {
        return {
          ...transform,
          polynomialCarrierHints: carrierHints,
        };
      }

      if (nextTargetCount > 0 && nextTargetCount < currentTargetCount) {
        return {
          ...transform,
          polynomialCarrierHints: carrierHints,
        };
      }
    }
  }

  return null;
}

export {
  countEquationRadicalTargets,
  matchRepeatedClearingTransform,
};
