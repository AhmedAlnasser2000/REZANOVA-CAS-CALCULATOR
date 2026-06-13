import type { SolveDomainConstraint } from '../../../types/calculator';
import type { Monomial } from '../../algebra/radical-core';
import { needsEvenRootConstraint } from '../../algebra/radical-core';
import type { RadicalNormalizationMode } from './types';
import { boxLatex } from '../patterns';
import {
  buildAbsPowerNode,
  buildMonomialNode,
  buildPowerNode,
  buildProductNode,
  buildSimpleRootFromMonomial,
  composeQuotient,
  extractIntegerPerfectPower,
} from './nodes';

export function normalizeMonomialRoot(
  monomial: Monomial,
  index: number,
  mode: RadicalNormalizationMode,
): { node: unknown; conditionConstraints: SolveDomainConstraint[] } | null {
  if (monomial.scalar.numerator === 0) {
    return {
      node: 0,
      conditionConstraints: [],
    };
  }

  const scalarExtraction = extractIntegerPerfectPower(monomial.scalar.numerator, index);
  const denominatorExtraction = extractIntegerPerfectPower(monomial.scalar.denominator, index);
  if (!scalarExtraction || !denominatorExtraction) {
    return null;
  }

  const evenRoot = index % 2 === 0;
  const numeratorParts: unknown[] = [];
  const denominatorParts: unknown[] = [];
  const constraints: SolveDomainConstraint[] = [];

  if (monomial.variable && monomial.exponent < 0) {
    constraints.push({
      kind: 'nonzero',
      expressionLatex: monomial.variable,
    });
  }

  if (scalarExtraction.outside !== 1) {
    numeratorParts.push(scalarExtraction.outside);
  }

  if (denominatorExtraction.outside !== 1) {
    denominatorParts.push(denominatorExtraction.outside);
  }

  let numeratorResidualExponent = 0;
  let denominatorResidualExponent = 0;

  if (monomial.variable && monomial.exponent !== 0) {
    if (evenRoot && mode === 'equation') {
      if (monomial.exponent > 0) {
        numeratorResidualExponent = monomial.exponent;
      } else {
        denominatorResidualExponent = -monomial.exponent;
      }
    } else if (monomial.exponent > 0) {
      const outsideExponent = Math.floor(monomial.exponent / index);
      const residualExponent = monomial.exponent % index;
      if (outsideExponent > 0) {
        numeratorParts.push(evenRoot
          ? buildAbsPowerNode(monomial.variable, outsideExponent)
          : buildPowerNode(monomial.variable, outsideExponent));
      }
      numeratorResidualExponent = residualExponent;
    } else {
      const absoluteExponent = -monomial.exponent;
      const outsideExponent = Math.floor(absoluteExponent / index);
      const residualExponent = absoluteExponent % index;
      if (outsideExponent > 0) {
        denominatorParts.push(evenRoot
          ? buildAbsPowerNode(monomial.variable, outsideExponent)
          : buildPowerNode(monomial.variable, outsideExponent));
      }
      denominatorResidualExponent = residualExponent;
    }
  }

  const numeratorResidual: Monomial = {
    scalar: { numerator: scalarExtraction.residual, denominator: 1 },
    variable: monomial.variable,
    exponent: numeratorResidualExponent,
  };
  const denominatorResidual: Monomial = {
    scalar: { numerator: denominatorExtraction.residual, denominator: 1 },
    variable: monomial.variable,
    exponent: denominatorResidualExponent,
  };

  if (evenRoot) {
    const numeratorResidualNode = buildMonomialNode(numeratorResidual);
    if (needsEvenRootConstraint(numeratorResidualNode)) {
      constraints.push({
        kind: 'nonnegative',
        expressionLatex: boxLatex(numeratorResidualNode),
      });
    }

    const denominatorResidualNode = buildMonomialNode(denominatorResidual);
    if (needsEvenRootConstraint(denominatorResidualNode)) {
      constraints.push({
        kind: 'nonnegative',
        expressionLatex: boxLatex(denominatorResidualNode),
      });
    }
  }

  if (!(numeratorResidual.scalar.numerator === 1 && numeratorResidual.exponent === 0)) {
    numeratorParts.push(buildSimpleRootFromMonomial(numeratorResidual, index));
  }

  if (!(denominatorResidual.scalar.numerator === 1 && denominatorResidual.exponent === 0)) {
    denominatorParts.push(buildSimpleRootFromMonomial(denominatorResidual, index));
  }

  const numeratorNode = buildProductNode(numeratorParts);
  const denominatorNode = buildProductNode(denominatorParts);

  return {
    node: denominatorNode === 1
      ? numeratorNode
      : composeQuotient(numeratorNode, denominatorNode),
    conditionConstraints: constraints,
  };
}
