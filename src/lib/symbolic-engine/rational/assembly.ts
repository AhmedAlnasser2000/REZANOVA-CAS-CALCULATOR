import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SerializableMathJson, SolveDomainConstraint } from '../../../types/calculator';
import {
  exactPolynomialDegree,
  exactPolynomialToNode,
  parseExactPolynomial,
} from '../../algebra/polynomial-core';
import { normalizeExactRationalFunctionNode } from '../../algebra/rational-function-core';
import { factorAst } from '../factoring';
import { normalizeAst } from '../normalize';
import {
  addTerms,
  boxLatex,
  buildTermNode,
  decomposeProduct,
  termKey,
  type FactorMap,
} from '../patterns';
import { buildFactorNodeWithCoefficient, cloneFactors, mergeFactors } from './factors';
import { gcd } from './scalars';
import type { RationalTerm } from './types';

const ce = new ComputeEngine();

function simplifyNode(node: unknown) {
  const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
  return normalizeAst(boxed.simplify().json);
}

function factorNode(node: unknown) {
  return normalizeAst(factorAst(normalizeAst(node)).node);
}

export function factorMapMaximum(terms: RationalTerm[]) {
  const result = new Map<string, { node: unknown; exponent: number }>();
  for (const term of terms) {
    for (const [key, value] of term.denominatorFactors.entries()) {
      const current = result.get(key);
      if (!current || value.exponent > current.exponent) {
        result.set(key, { node: value.node, exponent: value.exponent });
      }
    }
  }
  return result;
}

export function buildCombinedNumerator(terms: RationalTerm[], denominatorLcm: number, lcdFactors: FactorMap) {
  const numeratorTerms: unknown[] = [];

  for (const term of terms) {
    const coefficient = term.scalar.numerator * (denominatorLcm / term.scalar.denominator);
    if (coefficient === 0) {
      continue;
    }

    const factors = cloneFactors(term.numeratorFactors);
    for (const [key, value] of lcdFactors.entries()) {
      const currentExponent = term.denominatorFactors.get(key)?.exponent ?? 0;
      const exponent = value.exponent - currentExponent;
      if (exponent > 0) {
        mergeFactors(factors, new Map([[key, { node: value.node, exponent }]]));
      }
    }

    numeratorTerms.push(buildFactorNodeWithCoefficient(coefficient, factors));
  }

  return numeratorTerms.length === 0 ? 0 : simplifyNode(addTerms(numeratorTerms));
}

export function buildCombinedDenominator(denominatorLcm: number, lcdFactors: FactorMap) {
  if (denominatorLcm === 1 && lcdFactors.size === 0) {
    return undefined;
  }

  return normalizeAst(buildFactorNodeWithCoefficient(denominatorLcm, lcdFactors));
}

export function cancelCommonFactors(numeratorNode: unknown, denominatorNode: unknown | undefined) {
  if (!denominatorNode) {
    return {
      numeratorNode,
      denominatorNode: undefined,
    };
  }

  const polynomialCancellation = tryPolynomialRationalCancellation(numeratorNode, denominatorNode);
  if (polynomialCancellation) {
    return polynomialCancellation;
  }

  const numerator = decomposeProduct(factorNode(numeratorNode));
  const denominator = decomposeProduct(factorNode(denominatorNode));
  if (!numerator || !denominator) {
    return {
      numeratorNode,
      denominatorNode,
    };
  }

  const numeratorFactors = cloneFactors(numerator.factors);
  const denominatorFactors = cloneFactors(denominator.factors);

  for (const [key, value] of numeratorFactors.entries()) {
    const denominatorFactor = denominatorFactors.get(key);
    if (!denominatorFactor) {
      continue;
    }

    const sharedExponent = Math.min(value.exponent, denominatorFactor.exponent);
    if (sharedExponent > 0) {
      const updatedNumerator = value.exponent - sharedExponent;
      const updatedDenominator = denominatorFactor.exponent - sharedExponent;

      if (updatedNumerator > 0) {
        numeratorFactors.set(key, { node: value.node, exponent: updatedNumerator });
      } else {
        numeratorFactors.delete(key);
      }

      if (updatedDenominator > 0) {
        denominatorFactors.set(key, { node: denominatorFactor.node, exponent: updatedDenominator });
      } else {
        denominatorFactors.delete(key);
      }
    }
  }

  const coefficientGcd = gcd(numerator.coefficient, denominator.coefficient);
  let numeratorCoefficient = numerator.coefficient / coefficientGcd;
  let denominatorCoefficient = denominator.coefficient / coefficientGcd;

  if (denominatorCoefficient < 0) {
    numeratorCoefficient *= -1;
    denominatorCoefficient *= -1;
  }

  const simplifiedNumerator = normalizeAst(buildTermNode(numeratorCoefficient, numeratorFactors));
  const simplifiedDenominator =
    denominatorCoefficient === 1 && denominatorFactors.size === 0
      ? undefined
      : normalizeAst(buildTermNode(denominatorCoefficient, denominatorFactors));

  return {
    numeratorNode: simplifyNode(simplifiedNumerator),
    denominatorNode: simplifiedDenominator ? factorNode(simplifiedDenominator) : undefined,
  };
}

function tryPolynomialRationalCancellation(numeratorNode: unknown, denominatorNode: unknown) {
  const result = normalizeExactRationalFunctionNode(['Divide', numeratorNode, denominatorNode], {
    maxDegree: 8,
  });
  if (result.kind !== 'success') {
    return null;
  }

  const originalDenominator = parseExactPolynomial(
    denominatorNode,
    result.rational.variable,
    8,
  );
  if (!originalDenominator) {
    return null;
  }

  const originalDegree = exactPolynomialDegree(originalDenominator);
  const normalizedDegree = exactPolynomialDegree(result.rational.denominator);
  if (normalizedDegree >= originalDegree) {
    return null;
  }

  const denominatorIsConstant = normalizedDegree === 0;
  return {
    numeratorNode: simplifyNode(exactPolynomialToNode(result.rational.numerator)),
    denominatorNode: denominatorIsConstant
      ? undefined
      : factorNode(exactPolynomialToNode(result.rational.denominator)),
  };
}

function extractExclusionBases(terms: RationalTerm[]) {
  const bases = new Map<string, unknown>();
  for (const term of terms) {
    for (const entry of term.denominatorFactors.values()) {
      const factored = decomposeProduct(factorNode(entry.node));
      if (factored) {
        for (const factor of factored.factors.values()) {
          bases.set(termKey(factor.node), factor.node);
        }
        continue;
      }
      bases.set(termKey(entry.node), entry.node);
    }
  }
  return [...bases.values()].sort((left, right) => boxLatex(left).localeCompare(boxLatex(right)));
}

export function buildExclusionMetadata(terms: RationalTerm[]) {
  const bases = extractExclusionBases(terms);
  const constraints = bases.map<SolveDomainConstraint>((node) => ({
    kind: 'nonzero',
    expressionLatex: boxLatex(node),
    expressionMathJson: node as SerializableMathJson,
  }));

  if (constraints.length === 0) {
    return {
      exclusionConstraints: constraints,
      exactSupplementLatex: [] as string[],
    };
  }

  return {
    exclusionConstraints: constraints,
    exactSupplementLatex: [
      `\\text{Exclusions: } ${bases.map((node) => `${boxLatex(node)}\\ne0`).join(',\\;')}`,
    ],
  };
}

export function factorForMode(node: unknown) {
  return factorNode(node);
}
