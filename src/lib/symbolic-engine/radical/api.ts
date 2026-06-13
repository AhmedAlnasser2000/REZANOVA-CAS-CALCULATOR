import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../../types/calculator';
import type { ExactScalar } from '../../algebra/polynomial-core';
import {
  buildConditionSupplementLatex,
  detectSingleVariable,
  expressionHasVariable,
  mergeSolveDomainConstraints as mergeConstraints,
  needsEvenRootConstraint,
  parseInteger,
  parseMonomial,
  recognizePerfectSquareRadicand,
} from '../../algebra/radical-core';
import type {
  RadicalConjugateTransformResult,
  RadicalNormalizationMode,
  RadicalNormalizationResult,
  NormalizedNodeResult,
} from './types';
import { boxLatex, flattenMultiply, isNodeArray, termKey } from '../patterns';
import { normalizeAst } from '../normalize';
import { tryDenestConstantNestedSquareRoot } from './denest';
import { normalizeMonomialRoot } from './monomials';
import { combineAddTerms, multiplyChildren } from './additive';
import {
  multiplyScalars,
  readExactScalar,
} from './scalars';
import {
  buildScalarNode,
  composeQuotient,
  containsRadical,
  normalizeDivisionSign,
} from './nodes';
import {
  canApplyConjugateTransform,
  tryRationalizeMonomialDenominator,
  tryRationalizeSquareRootDenominator,
} from './rationalize';

const ce = new ComputeEngine();

function normalizeNode(
  node: unknown,
  mode: RadicalNormalizationMode,
  variable?: string,
): NormalizedNodeResult {
  if (!isNodeArray(node) || node.length === 0) {
    return {
      node,
      changed: false,
      conditionConstraints: [],
      rationalized: false,
    };
  }

  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return {
      node: normalized,
      changed: termKey(normalized) !== termKey(node),
      conditionConstraints: [],
      rationalized: false,
    };
  }

  const operator = normalized[0];
  const children = normalized.slice(1);

  if (operator === 'Sqrt' && children.length === 1) {
    const childResult = normalizeNode(children[0], mode, variable);
    const denested = tryDenestConstantNestedSquareRoot(
      childResult.node,
      mode,
      variable,
      (rootNode) => normalizeNode(rootNode, mode, variable).node,
    );
    if (denested) {
      return {
        node: denested,
        changed: true,
        conditionConstraints: childResult.conditionConstraints,
        rationalized: childResult.rationalized,
      };
    }
    const perfectSquare = mode !== 'equation'
      ? recognizePerfectSquareRadicand(childResult.node)
      : null;
    if (perfectSquare) {
      return {
        node: perfectSquare.normalizedNode,
        changed: true,
        conditionConstraints: childResult.conditionConstraints,
        rationalized: childResult.rationalized,
      };
    }

    const monomial = parseMonomial(childResult.node);
    const rootResult = monomial
      ? normalizeMonomialRoot(monomial, 2, mode)
      : null;
    if (rootResult) {
      return {
        node: rootResult.node,
        changed: childResult.changed || termKey(rootResult.node) !== termKey(normalized),
        conditionConstraints: mergeConstraints(childResult.conditionConstraints, rootResult.conditionConstraints),
        rationalized: childResult.rationalized,
      };
    }

    const conditionConstraints = needsEvenRootConstraint(childResult.node)
      ? mergeConstraints(childResult.conditionConstraints, [{
        kind: 'nonnegative',
        expressionLatex: boxLatex(childResult.node),
      }])
      : childResult.conditionConstraints;

    return {
      node: ['Sqrt', childResult.node],
      changed: childResult.changed,
      conditionConstraints,
      rationalized: childResult.rationalized,
    };
  }

  if (operator === 'Root' && children.length === 2) {
    const index = parseInteger(children[1]);
    if (index === null || Math.abs(index) < 2) {
      return {
        node: normalized,
        changed: false,
        conditionConstraints: [],
        rationalized: false,
      };
    }

    if (index < 0) {
      return normalizeNode(['Divide', 1, ['Root', children[0], -index]], mode, variable);
    }

    const childResult = normalizeNode(children[0], mode, variable);
    const perfectSquare = index === 2 && mode !== 'equation'
      ? recognizePerfectSquareRadicand(childResult.node)
      : null;
    if (perfectSquare) {
      return {
        node: perfectSquare.normalizedNode,
        changed: true,
        conditionConstraints: childResult.conditionConstraints,
        rationalized: childResult.rationalized,
      };
    }

    const monomial = parseMonomial(childResult.node);
    const rootResult = monomial
      ? normalizeMonomialRoot(monomial, index, mode)
      : null;
    if (rootResult) {
      return {
        node: rootResult.node,
        changed: childResult.changed || termKey(rootResult.node) !== termKey(normalized),
        conditionConstraints: mergeConstraints(childResult.conditionConstraints, rootResult.conditionConstraints),
        rationalized: childResult.rationalized,
      };
    }

    const conditionConstraints = index % 2 === 0 && needsEvenRootConstraint(childResult.node)
      ? mergeConstraints(childResult.conditionConstraints, [{
        kind: 'nonnegative',
        expressionLatex: boxLatex(childResult.node),
      }])
      : childResult.conditionConstraints;

    return {
      node: ['Root', childResult.node, index],
      changed: childResult.changed,
      conditionConstraints,
      rationalized: childResult.rationalized,
    };
  }

  if (operator === 'Add') {
    const childResults = children.map((child) => normalizeNode(child, mode, variable));
    const combined = combineAddTerms(childResults.map((child) => child.node));
    return {
      node: combined.node,
      changed: childResults.some((child) => child.changed) || combined.changed,
      conditionConstraints: childResults.reduce<SolveDomainConstraint[]>(
        (current, child) => mergeConstraints(current, child.conditionConstraints),
        [],
      ),
      rationalized: childResults.some((child) => child.rationalized),
    };
  }

  if (operator === 'Multiply') {
    const childResults = children.map((child) => normalizeNode(child, mode, variable));
    const scalarFactors: ExactScalar[] = [];
    const symbolicFactors: unknown[] = [];

    for (const child of childResults) {
      for (const factor of flattenMultiply(child.node)) {
        const scalar = readExactScalar(factor);
        if (scalar) {
          scalarFactors.push(scalar);
        } else {
          symbolicFactors.push(factor);
        }
      }
    }

    const combinedScalar = scalarFactors.reduce<ExactScalar>(
      (current, scalar) => multiplyScalars(current, scalar) ?? current,
      { numerator: 1, denominator: 1 },
    );
    const parts: unknown[] = [];
    if (combinedScalar.numerator !== 1 || combinedScalar.denominator !== 1 || symbolicFactors.length === 0) {
      parts.push(buildScalarNode(combinedScalar));
    }
    parts.push(...symbolicFactors);

    const rebuilt = multiplyChildren(parts);
    return {
      node: rebuilt,
      changed: childResults.some((child) => child.changed) || termKey(rebuilt) !== termKey(normalized),
      conditionConstraints: childResults.reduce<SolveDomainConstraint[]>(
        (current, child) => mergeConstraints(current, child.conditionConstraints),
        [],
      ),
      rationalized: childResults.some((child) => child.rationalized),
    };
  }

  if (operator === 'Divide' && children.length === 2) {
    const numeratorResult = normalizeNode(children[0], mode, variable);
    const denominatorResult = normalizeNode(children[1], mode, variable);
    const initialConstraints = mergeConstraints(
      numeratorResult.conditionConstraints,
      denominatorResult.conditionConstraints,
    );

    const denominatorHasRadical = containsRadical(children[1]) || containsRadical(denominatorResult.node);
    const denominatorCondition = denominatorHasRadical && expressionHasVariable(children[1])
      ? [{
          kind: 'nonzero' as const,
          expressionLatex: boxLatex(children[1]),
        }]
      : [];

    const monomialRationalized = tryRationalizeMonomialDenominator(
      numeratorResult.node,
      denominatorResult.node,
      mode,
    );
    if (monomialRationalized) {
      const rerun = normalizeNode(monomialRationalized.node, mode === 'simplify' ? 'factor' : mode, variable);
      return {
        node: rerun.node,
        changed: true,
        conditionConstraints: mergeConstraints(initialConstraints, mergeConstraints(denominatorCondition, rerun.conditionConstraints)),
        rationalized: true,
      };
    }

    const binomialRationalized = tryRationalizeSquareRootDenominator(
      numeratorResult.node,
      denominatorResult.node,
      mode,
      variable,
    );
    if (binomialRationalized) {
      const rerun = normalizeNode(binomialRationalized.node, mode === 'simplify' ? 'factor' : mode, variable);
      return {
        node: rerun.node,
        changed: true,
        conditionConstraints: mergeConstraints(
          initialConstraints,
          mergeConstraints(
            denominatorCondition,
            mergeConstraints(
              binomialRationalized.conditionConstraints,
              rerun.conditionConstraints,
            ),
          ),
        ),
        rationalized: true,
      };
    }

    return {
      node: normalizeDivisionSign(composeQuotient(numeratorResult.node, denominatorResult.node)),
      changed: numeratorResult.changed || denominatorResult.changed,
      conditionConstraints: mergeConstraints(initialConstraints, denominatorCondition),
      rationalized: numeratorResult.rationalized || denominatorResult.rationalized,
    };
  }

  const childResults = children.map((child) => normalizeNode(child, mode, variable));
  const rebuilt = [operator, ...childResults.map((child) => child.node)];
  return {
    node: rebuilt,
    changed: childResults.some((child) => child.changed) || termKey(rebuilt) !== termKey(normalized),
    conditionConstraints: childResults.reduce<SolveDomainConstraint[]>(
      (current, child) => mergeConstraints(current, child.conditionConstraints),
      [],
    ),
    rationalized: childResults.some((child) => child.rationalized),
  };
}

export function normalizeExactRadicalNode(
  node: unknown,
  mode: RadicalNormalizationMode,
): RadicalNormalizationResult | null {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return null;
  }
  const variable = detectedVariable ?? undefined;

  const normalized = normalizeNode(normalizeAst(node), mode, variable);
  const conditionConstraints = mergeConstraints(normalized.conditionConstraints);
  if (!normalized.changed && conditionConstraints.length === 0) {
    return null;
  }

  const normalizedNode = normalizeAst(normalized.node);
  return {
    changed: normalized.changed,
    normalizedNode,
    normalizedLatex: ce.box(normalizedNode as Parameters<typeof ce.box>[0]).latex,
    conditionConstraints,
    exactSupplementLatex: buildConditionSupplementLatex(conditionConstraints),
    rationalized: normalized.rationalized,
  };
}

export function normalizeExactRadicalLatex(
  latex: string,
  mode: RadicalNormalizationMode,
) {
  const parsed = ce.parse(latex);
  return normalizeExactRadicalNode(parsed.json, mode);
}

export function canApplyConjugateTransformNode(node: unknown) {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return false;
  }

  return canApplyConjugateTransform(node, detectedVariable ?? undefined);
}

export function applyConjugateTransformNode(
  node: unknown,
): RadicalConjugateTransformResult | null {
  const detectedVariable = detectSingleVariable(node);
  if (detectedVariable === null && expressionHasVariable(node)) {
    return null;
  }

  if (!canApplyConjugateTransform(node, detectedVariable ?? undefined)) {
    return null;
  }

  const normalized = normalizeExactRadicalNode(node, 'simplify');
  if (!normalized?.rationalized) {
    return null;
  }

  return {
    changed: normalized.changed,
    normalizedNode: normalized.normalizedNode,
    normalizedLatex: normalized.normalizedLatex,
    conditionConstraints: normalized.conditionConstraints,
    exactSupplementLatex: normalized.exactSupplementLatex,
  };
}

export function applyConjugateTransformLatex(latex: string) {
  const parsed = ce.parse(latex);
  return applyConjugateTransformNode(parsed.json);
}
