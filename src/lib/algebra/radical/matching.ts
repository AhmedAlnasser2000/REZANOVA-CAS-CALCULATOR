import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray } from '../../symbolic-engine/patterns';
import {
  expressionHasVariable,
  parseInteger,
  parsePositiveRational,
} from './math-json';
import {
  isProvablyNonnegativeMonomial,
  isSupportedRadicand,
  monomialDependsOnVariable,
  parseMonomial,
  parseSupportedBinomial,
} from './parsing';
import type { SupportedRadical, SupportedRationalPower } from './types';

const ce = new ComputeEngine();

export function needsEvenRootConstraint(node: unknown) {
  const monomial = parseMonomial(node);
  if (monomial) {
    return monomialDependsOnVariable(monomial) && !isProvablyNonnegativeMonomial(monomial);
  }

  return Boolean(parseSupportedBinomial(node) && expressionHasVariable(node));
}

export function buildEvenRootConditionConstraints(node: unknown) {
  return needsEvenRootConstraint(node)
    ? [{
        kind: 'nonnegative' as const,
        expressionLatex: ce.box(node as Parameters<typeof ce.box>[0]).latex,
      }]
    : [];
}

export function matchSupportedRadical(node: unknown, variable: string): SupportedRadical | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Sqrt' && normalized.length === 2 && isSupportedRadicand(normalized[1], variable)) {
    return {
      node: normalized,
      radicand: normalized[1],
      index: 2,
    };
  }

  if (normalized[0] === 'Root' && normalized.length === 3) {
    const index = parseInteger(normalized[2]);
    if (index !== null && index >= 2 && isSupportedRadicand(normalized[1], variable)) {
      return {
        node: normalized,
        radicand: normalized[1],
        index,
      };
    }
  }

  return null;
}

export function matchSupportedRationalPower(node: unknown, variable: string): SupportedRationalPower | null {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Power' && normalized.length === 3) {
    const exponent = parsePositiveRational(normalized[2]);
    if (exponent && exponent.denominator > 1 && isSupportedRadicand(normalized[1], variable)) {
      if (!expressionHasVariable(normalized[1])) {
        return null;
      }
      return {
        node: normalized,
        base: normalized[1],
        numerator: exponent.numerator,
        denominator: exponent.denominator,
      };
    }

    if (!isSupportedRadicand(normalized[1], variable)) {
      const radicalBase = matchSupportedRadical(normalized[1], variable);
      const integerExponent = parseInteger(normalized[2]);
      if (!radicalBase || integerExponent === null || integerExponent <= 0) {
        return null;
      }
      if (!expressionHasVariable(radicalBase.radicand)) {
        return null;
      }

      return {
        node: normalized,
        base: radicalBase.radicand,
        numerator: integerExponent,
        denominator: radicalBase.index,
      };
    }

    return null;
  }

  const radical = matchSupportedRadical(normalized, variable);
  if (radical && expressionHasVariable(radical.radicand)) {
    if (
      isNodeArray(radical.radicand)
      && radical.radicand[0] === 'Power'
      && radical.radicand.length === 3
      && isSupportedRadicand(radical.radicand[1], variable)
    ) {
      const numerator = parseInteger(radical.radicand[2]);
      if (numerator !== null && numerator > 0) {
        return {
          node: normalized,
          base: radical.radicand[1],
          numerator,
          denominator: radical.index,
        };
      }
    }

    return {
      node: normalized,
      base: radical.radicand,
      numerator: 1,
      denominator: radical.index,
    };
  }

  return null;
}
