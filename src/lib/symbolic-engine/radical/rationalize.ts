import type { ExactScalar } from '../../algebra/polynomial-core';
import {
  buildSquareRootConjugateProfile,
  mergeSolveDomainConstraints as mergeConstraints,
  parseInteger,
  parseMonomial,
  type Monomial,
} from '../../algebra/radical-core';
import type { RadicalNormalizationMode, SquareRootRationalizedQuotient } from './types';
import { flattenMultiply, isNodeArray } from '../patterns';
import { normalizeAst } from '../normalize';
import { multiplyScalars, powerScalar, readExactScalar } from './scalars';
import {
  buildMonomialNode,
  buildProductNode,
  buildRootNode,
  buildScalarNode,
  composeQuotient,
  normalizeDivisionSign,
} from './nodes';

export function tryRationalizeMonomialDenominator(
  numerator: unknown,
  denominator: unknown,
  mode: RadicalNormalizationMode,
) {
  if (mode !== 'simplify') {
    return null;
  }

  const factors = flattenMultiply(denominator).map((factor) => normalizeAst(factor));
  let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
  const symbolicFactors: unknown[] = [];

  for (const factor of factors) {
    const exact = readExactScalar(factor);
    if (exact) {
      const nextScalar = multiplyScalars(scalarFactor, exact);
      if (!nextScalar) {
        return null;
      }
      scalarFactor = nextScalar;
    } else {
      symbolicFactors.push(factor);
    }
  }

  if (symbolicFactors.length !== 1) {
    return null;
  }

  const radicalFactor = symbolicFactors[0];
  const index = isNodeArray(radicalFactor) && radicalFactor[0] === 'Sqrt'
    ? 2
    : isNodeArray(radicalFactor) && radicalFactor[0] === 'Root' && radicalFactor.length === 3
      ? parseInteger(radicalFactor[2])
      : null;
  const radicand = isNodeArray(radicalFactor) && radicalFactor[0] === 'Sqrt'
    ? radicalFactor[1]
    : isNodeArray(radicalFactor) && radicalFactor[0] === 'Root'
      ? radicalFactor[1]
      : null;

  if (!index || !radicand) {
    return null;
  }

  const monomial = parseMonomial(radicand);
  if (!monomial) {
    return null;
  }

  const multiplierScalar = powerScalar(monomial.scalar, index - 1);
  if (!multiplierScalar) {
    return null;
  }

  const multiplierMonomial: Monomial = {
    scalar: multiplierScalar,
    variable: monomial.variable,
    exponent: monomial.exponent * (index - 1),
  };
  const multiplierRadicand = buildMonomialNode(multiplierMonomial);
  const multiplierNode = buildRootNode(index, multiplierRadicand);
  const newNumerator = buildProductNode([numerator, multiplierNode]);

  const denominatorMultiplier = buildMonomialNode(monomial);
  const newDenominator = buildProductNode([buildScalarNode(scalarFactor), denominatorMultiplier]);

  return {
    node: normalizeDivisionSign(composeQuotient(newNumerator, newDenominator)),
    rationalized: true,
  };
}

export function buildRationalizedSquareRootQuotient(
  numerator: unknown,
  denominator: unknown,
  variable: string | undefined,
) : SquareRootRationalizedQuotient | null {
  const profile = buildSquareRootConjugateProfile(denominator, variable);
  if (!profile) {
    return null;
  }

  let numeratorProduct = buildProductNode([numerator, profile.conjugateNode]);
  let denominatorNode = profile.denominatorProductNode;
  let conditionConstraints = profile.conditionConstraints;
  let usedResidualCleanup = false;

  if (profile.residualCleanupEligible) {
    const residualProfile = buildSquareRootConjugateProfile(denominatorNode, variable, false);
    if (!residualProfile) {
      return null;
    }

    numeratorProduct = buildProductNode([numeratorProduct, residualProfile.conjugateNode]);
    denominatorNode = residualProfile.denominatorProductNode;
    conditionConstraints = mergeConstraints(
      conditionConstraints,
      residualProfile.conditionConstraints,
    );
    usedResidualCleanup = true;
  }

  return {
    node: normalizeDivisionSign(composeQuotient(numeratorProduct, denominatorNode)),
    conditionConstraints,
    familyId: profile.familyId,
    usedResidualCleanup,
  };
}

export function tryRationalizeSquareRootDenominator(
  numerator: unknown,
  denominator: unknown,
  mode: RadicalNormalizationMode,
  variable: string | undefined,
) {
  if (mode !== 'simplify') {
    return null;
  }

  const rationalized = buildRationalizedSquareRootQuotient(numerator, denominator, variable);
  if (!rationalized) {
    return null;
  }

  return {
    node: rationalized.node,
    rationalized: true,
    conditionConstraints: rationalized.conditionConstraints,
    familyId: rationalized.familyId,
    usedResidualCleanup: rationalized.usedResidualCleanup,
  };
}

export function canApplyConjugateTransform(
  node: unknown,
  variable: string | undefined,
) {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized[0] !== 'Divide' || normalized.length !== 3) {
    return false;
  }

  return Boolean(buildSquareRootConjugateProfile(normalized[2], variable));
}
