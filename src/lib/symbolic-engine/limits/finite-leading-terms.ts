import {
  buildExactScalarNode,
  exactScalarToNumber,
  readExactScalarNode,
} from '../../algebra/polynomial-core';
import {
  addSymbolicCoefficients,
  divideSymbolicCoefficients,
  isSymbolicCoefficientZero,
  multiplySymbolicCoefficients,
  negateSymbolicCoefficient,
  parseSymbolicCoefficient,
  type SymbolicCoefficient,
} from '../primitives/coefficient-domain';
import {
  dependsOnVariable,
  isNodeArray,
} from '../patterns';
import {
  formatLimitNumberLatex,
  formatLimitValueLatex,
  limitMathPart,
  limitMathValueRow,
  limitMethodRowsSection,
  limitTextPart,
  limitTextRow,
  limitTextRows,
} from './detail-readback';
import {
  evaluateNodeAt,
  isInteger,
  isNonZeroish,
  isZeroish,
} from './evaluation';
import {
  matchExpMinusOne,
  matchFunctionMinusOne,
  matchOneMinusFunction,
  matchOnePlus,
} from './known-rules';
import type { FiniteLimitRuleSuccess, FiniteLimitRuleValue } from './types';
import type { LimitDirection } from '../../../types/calculator';
import {
  leadingTermFromLocalSeries,
  matchExpMinusOneMinusInner,
  matchLogOnePlusMinusInner,
} from './finite-local-series';

type RecursiveLeadingTerm = {
  coefficient: SymbolicCoefficient;
  order: number;
  reason: string;
  notes?: string[];
};

function coefficientFromNode(node: unknown, variable: string) {
  const parsed = parseSymbolicCoefficient(node, variable);
  return parsed.kind === 'success' ? parsed.coefficient : undefined;
}

function exactNodeFromNumber(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-10) {
    return rounded;
  }

  for (let denominator = 2; denominator <= 24; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < 1e-10) {
      return buildExactScalarNode({ numerator, denominator });
    }
  }

  return undefined;
}

function coefficientFromNumber(value: number, variable: string) {
  const exact = exactNodeFromNumber(value);
  return exact === undefined ? undefined : coefficientFromNode(exact, variable);
}

function oneCoefficient(variable: string) {
  return coefficientFromNumber(1, variable);
}

function halfCoefficient(variable: string) {
  return coefficientFromNode(['Rational', 1, 2], variable);
}

function combineNotes(...terms: (RecursiveLeadingTerm | undefined)[]) {
  return terms.flatMap((term) => term?.notes ?? []);
}

function multiplyTermCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  const result = multiplySymbolicCoefficients(left, right, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function divideTermCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  const result = divideSymbolicCoefficients(left, right, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function negateTermCoefficient(coefficient: SymbolicCoefficient, variable: string) {
  const result = negateSymbolicCoefficient(coefficient, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function addTermCoefficients(
  left: SymbolicCoefficient,
  right: SymbolicCoefficient,
  variable: string,
) {
  const result = addSymbolicCoefficients(left, right, variable);
  return result.kind === 'success' ? result.coefficient : undefined;
}

function squareCoefficient(coefficient: SymbolicCoefficient, variable: string) {
  return multiplyTermCoefficients(coefficient, coefficient, variable);
}

function scaleByHalf(coefficient: SymbolicCoefficient, variable: string) {
  const half = halfCoefficient(variable);
  return half ? multiplyTermCoefficients(coefficient, half, variable) : undefined;
}

function raiseCoefficient(
  coefficient: SymbolicCoefficient,
  exponent: number,
  variable: string,
) {
  if (exponent === 0) {
    return oneCoefficient(variable);
  }

  const absExponent = Math.abs(exponent);
  let result = oneCoefficient(variable);
  if (!result) {
    return undefined;
  }
  for (let index = 0; index < absExponent; index += 1) {
    const next = multiplyTermCoefficients(result, coefficient, variable);
    if (!next) {
      return undefined;
    }
    result = next;
  }

  if (exponent > 0) {
    return result;
  }

  const one = oneCoefficient(variable);
  return one ? divideTermCoefficients(one, result, variable) : undefined;
}

function exactNumberFromCoefficient(coefficient: SymbolicCoefficient) {
  const scalar = readExactScalarNode(coefficient.node);
  return scalar ? exactScalarToNumber(scalar) : undefined;
}

function leadingTerm(
  node: unknown,
  target: number,
  variable: string,
): RecursiveLeadingTerm | undefined {
  const direct = evaluateNodeAt(node, target, variable);
  if (direct !== undefined && isNonZeroish(direct)) {
    const coefficient = coefficientFromNumber(direct, variable);
    return coefficient
      ? {
          coefficient,
          order: 0,
          reason: 'factor has a finite nonzero target value',
        }
      : undefined;
  }

  if (!dependsOnVariable(node, variable)) {
    const coefficient = coefficientFromNode(node, variable);
    return coefficient
      ? {
          coefficient,
          order: 0,
          reason: 'target-free coefficient is constant for this limit',
        }
      : undefined;
  }

  if (target === 0 && node === variable && isZeroish(direct)) {
    const coefficient = oneCoefficient(variable);
    return coefficient
      ? {
          coefficient,
          order: 1,
          reason: `${variable} is the local target carrier`,
        }
      : undefined;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  const cosineInner = matchOneMinusFunction(node, 'Cos');
  if (cosineInner) {
    const inner = leadingTerm(cosineInner, target, variable);
    const squared = inner ? squareCoefficient(inner.coefficient, variable) : undefined;
    const coefficient = squared ? scaleByHalf(squared, variable) : undefined;
    if (inner && coefficient && inner.order > 0) {
      return {
        coefficient,
        order: inner.order * 2,
        reason: 'used local equivalent 1 - cos(u) ~ u^2/2',
        notes: combineNotes(inner),
      };
    }
  }

  const cosineMinusOneInner = matchFunctionMinusOne(node, 'Cos');
  if (cosineMinusOneInner) {
    const inner = leadingTerm(cosineMinusOneInner, target, variable);
    const squared = inner ? squareCoefficient(inner.coefficient, variable) : undefined;
    const half = squared ? scaleByHalf(squared, variable) : undefined;
    const coefficient = half ? negateTermCoefficient(half, variable) : undefined;
    if (inner && coefficient && inner.order > 0) {
      return {
        coefficient,
        order: inner.order * 2,
        reason: 'used local equivalent cos(u) - 1 ~ -u^2/2',
        notes: combineNotes(inner),
      };
    }
  }

  if ((node[0] === 'Ln' || node[0] === 'Log') && node.length === 2) {
    const cosineArgument = isNodeArray(node[1]) && node[1][0] === 'Cos' && node[1].length === 2
      ? node[1][1]
      : null;
    if (cosineArgument) {
      const inner = leadingTerm(cosineArgument, target, variable);
      const squared = inner ? squareCoefficient(inner.coefficient, variable) : undefined;
      const half = squared ? scaleByHalf(squared, variable) : undefined;
      const coefficient = half ? negateTermCoefficient(half, variable) : undefined;
      if (inner && coefficient && inner.order > 0) {
        return {
          coefficient,
          order: inner.order * 2,
          reason: 'used composed local equivalent ln(cos(u)) ~ -u^2/2',
          notes: [
            ...combineNotes(inner),
            'Recursive leading term: used composed local equivalent ln(cos(u)) ~ -u^2/2.',
          ],
        };
      }
    }

    const inner = matchOnePlus(node[1]);
    const equivalent = inner ? leadingTerm(inner, target, variable) : undefined;
    if (equivalent && equivalent.order > 0) {
      return {
        coefficient: equivalent.coefficient,
        order: equivalent.order,
        reason: 'used local equivalent ln(1 + u) ~ u',
        notes: equivalent.notes,
      };
    }
  }

  const expInner = matchExpMinusOne(node);
  if (expInner) {
    const inner = leadingTerm(expInner, target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient,
        order: inner.order,
        reason: 'used local equivalent e^u - 1 ~ u',
        notes: inner.notes,
      };
    }
  }

  const expMinusLinearInner = matchExpMinusOneMinusInner(node);
  if (expMinusLinearInner) {
    const inner = leadingTerm(expMinusLinearInner, target, variable);
    const squared = inner ? squareCoefficient(inner.coefficient, variable) : undefined;
    const coefficient = squared ? scaleByHalf(squared, variable) : undefined;
    if (inner && coefficient && inner.order > 0) {
      return {
        coefficient,
        order: inner.order * 2,
        reason: 'used local cancellation e^u - 1 - u ~ u^2/2',
        notes: [
          ...combineNotes(inner),
          'Recursive leading term: used symbolic cancellation e^u - 1 - u ~ u^2/2.',
        ],
      };
    }
  }

  const logMinusLinearInner = matchLogOnePlusMinusInner(node);
  if (logMinusLinearInner) {
    const inner = leadingTerm(logMinusLinearInner, target, variable);
    const squared = inner ? squareCoefficient(inner.coefficient, variable) : undefined;
    const half = squared ? scaleByHalf(squared, variable) : undefined;
    const coefficient = half ? negateTermCoefficient(half, variable) : undefined;
    if (inner && coefficient && inner.order > 0) {
      return {
        coefficient,
        order: inner.order * 2,
        reason: 'used local cancellation ln(1 + u) - u ~ -u^2/2',
        notes: [
          ...combineNotes(inner),
          'Recursive leading term: used symbolic cancellation ln(1 + u) - u ~ -u^2/2.',
        ],
      };
    }
  }

  if ((node[0] === 'Sin' || node[0] === 'Tan' || node[0] === 'Arcsin' || node[0] === 'Arctan') && node.length === 2) {
    const inner = leadingTerm(node[1], target, variable);
    if (inner && inner.order > 0) {
      return {
        coefficient: inner.coefficient,
        order: inner.order,
        reason: `used local equivalent ${node[0]}(u) ~ u`,
        notes: inner.notes,
      };
    }
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = leadingTerm(node[1], target, variable);
    const coefficient = child ? negateTermCoefficient(child.coefficient, variable) : undefined;
    return child && coefficient
      ? {
          coefficient,
          order: child.order,
          reason: child.reason,
          notes: child.notes,
        }
      : undefined;
  }

  if (node[0] === 'Multiply') {
    const factors = node.slice(1).map((child) => leadingTerm(child, target, variable));
    if (factors.every(Boolean)) {
      const equivalents = factors as RecursiveLeadingTerm[];
      let coefficient = oneCoefficient(variable);
      if (!coefficient) {
        return undefined;
      }
      for (const factor of equivalents) {
        const next = multiplyTermCoefficients(coefficient, factor.coefficient, variable);
        if (!next) {
          return undefined;
        }
        coefficient = next;
      }
      return {
        coefficient,
        order: equivalents.reduce((sum, factor) => sum + factor.order, 0),
        reason: 'combined recursive leading factors in a product',
        notes: combineNotes(...equivalents),
      };
    }
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = leadingTerm(node[1], target, variable);
    const denominator = leadingTerm(node[2], target, variable);
    const coefficient = numerator && denominator
      ? divideTermCoefficients(numerator.coefficient, denominator.coefficient, variable)
      : undefined;
    if (numerator && denominator && coefficient) {
      return {
        coefficient,
        order: numerator.order - denominator.order,
        reason: 'compared recursive leading orders in a quotient',
        notes: combineNotes(numerator, denominator),
      };
    }
  }

  if (node[0] === 'Power' && node.length === 3 && isInteger(node[2])) {
    const base = leadingTerm(node[1], target, variable);
    const coefficient = base ? raiseCoefficient(base.coefficient, node[2], variable) : undefined;
    if (base && coefficient) {
      return {
        coefficient,
        order: base.order * node[2],
        reason: 'raised a recursive leading factor to an integer power',
        notes: base.notes,
      };
    }
  }

  if (node[0] === 'Add') {
    const terms = node.slice(1).map((child) => leadingTerm(child, target, variable));
    if (terms.every(Boolean)) {
      const grouped = new Map<number, SymbolicCoefficient>();
      for (const term of terms as RecursiveLeadingTerm[]) {
        const existing = grouped.get(term.order);
        const next = existing
          ? addTermCoefficients(existing, term.coefficient, variable)
          : term.coefficient;
        if (!next) {
          return undefined;
        }
        grouped.set(term.order, next);
      }

      for (const order of [...grouped.keys()].sort((left, right) => left - right)) {
        const coefficient = grouped.get(order);
        if (coefficient && !isSymbolicCoefficientZero(coefficient)) {
          return {
            coefficient,
            order,
            reason: 'combined recursive same-order leading terms in a sum',
            notes: combineNotes(...(terms as RecursiveLeadingTerm[])),
          };
        }
      }
    }
  }

  return undefined;
}

function signedInfinityFromTerm(
  term: RecursiveLeadingTerm,
  direction: LimitDirection,
): FiniteLimitRuleValue | undefined {
  if (term.order >= 0) {
    return undefined;
  }

  const numericCoefficient = exactNumberFromCoefficient(term.coefficient);
  if (numericCoefficient === undefined || Math.abs(numericCoefficient) < 1e-12) {
    return undefined;
  }

  const signForSide = (side: Exclude<LimitDirection, 'two-sided'>) => {
    const sideSign = side === 'left' && Math.abs(term.order) % 2 === 1 ? -1 : 1;
    return numericCoefficient * sideSign > 0 ? 1 : -1;
  };

  if (direction === 'left' || direction === 'right') {
    return signForSide(direction) > 0 ? 'posInfinity' : 'negInfinity';
  }

  const left = signForSide('left');
  const right = signForSide('right');
  return left === right
    ? left > 0 ? 'posInfinity' : 'negInfinity'
    : undefined;
}

function limitSuccessFromTerm(
  term: RecursiveLeadingTerm,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  const numericCoefficient = exactNumberFromCoefficient(term.coefficient);
  const coefficientLatex = numericCoefficient === undefined
    ? term.coefficient.latex
    : formatLimitNumberLatex(numericCoefficient);
  const baseRows = [
    limitTextRow('Form detected: recursive finite leading-term comparison.'),
    limitTextRow('Rewrite/equivalent: built the first nonzero local term from constants, products, quotients, powers, sums, and standard compositions.'),
    ...limitTextRows(term.notes ?? []),
    [
      limitTextPart('Key calculation: coefficient '),
      limitMathPart(coefficientLatex),
      limitTextPart(' with net order '),
      limitMathPart(`${term.order}`),
      limitTextPart('.'),
    ],
    limitTextRow(`Reason: ${term.reason}.`),
  ];

  if (term.order === 0) {
    return numericCoefficient === undefined ? {
      kind: 'success',
      exactLatex: coefficientLatex,
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        ...baseRows,
        limitMathValueRow('Conclusion: final limit is ', coefficientLatex),
      ]),
    } : {
      kind: 'success',
      value: numericCoefficient,
      exactLatex: coefficientLatex,
      approxText: formatLimitNumberLatex(numericCoefficient),
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        ...baseRows,
        limitMathValueRow('Conclusion: final limit is ', coefficientLatex),
      ]),
    };
  }

  if (term.order > 0) {
    return {
      kind: 'success',
      value: 0,
      exactLatex: '0',
      approxText: '0',
      origin: 'rule-based-symbolic',
      detailSections: limitMethodRowsSection([
        ...baseRows,
        limitTextRow('Conclusion: positive net order means the expression tends to 0 at the target.'),
        limitMathValueRow('Conclusion: final limit is ', '0'),
      ]),
    };
  }

  const infinity = signedInfinityFromTerm(term, direction);
  return infinity
    ? {
        kind: 'success',
        value: infinity,
        exactLatex: formatLimitValueLatex(infinity),
        approxText: infinity === 'posInfinity' ? 'Infinity' : '-Infinity',
        origin: 'rule-based-symbolic',
        detailSections: limitMethodRowsSection([
          ...baseRows,
          limitTextRow('Conclusion: negative net order creates a pole; the requested direction determines the signed infinity when signs agree.'),
          limitMathValueRow('Conclusion: final limit is ', formatLimitValueLatex(infinity) ?? 'undefined'),
        ]),
      }
    : undefined;
}

export function resolveFiniteRecursiveLeadingTermLimit(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
): FiniteLimitRuleSuccess | undefined {
  const term = leadingTerm(node, target, variable);
  const resolved = term ? limitSuccessFromTerm(term, direction) : undefined;
  if (resolved) {
    return resolved;
  }

  const seriesTerm = leadingTermFromLocalSeries(node, target, variable);
  return seriesTerm ? limitSuccessFromTerm(seriesTerm, direction) : undefined;
}

export function hasFiniteRecursiveLeadingTermCandidate(
  node: unknown,
  target: number,
  variable: string,
  direction: LimitDirection,
) {
  return Boolean(resolveFiniteRecursiveLeadingTermLimit(node, target, variable, direction));
}
