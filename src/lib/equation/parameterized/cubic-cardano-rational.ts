import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import {
  createDenominatorExclusionFact,
  factsFromLegacySupplementLatex,
  mergeEquationBranchDomainFacts,
  renderRawSupplementLatexFromFacts,
  type EquationBranchDomainFact,
} from '../facts/branch-domain-facts';
import {
  collectBoundedNDegreeSymbolicTargetPolynomial,
  multiplyNDegreeSymbolicPolynomials,
  nDegreeSymbolicPolynomialDegree,
  nDegreeSymbolicPolynomialNeedsExplicitLatex,
  nDegreeSymbolicPolynomialToExplicitLatex,
  nDegreeSymbolicPolynomialToNode,
  negateNDegreeSymbolicPolynomial,
  oneNDegreeSymbolicPolynomial,
  subtractNDegreeSymbolicPolynomials,
  addNDegreeSymbolicPolynomials,
  zeroNDegreeSymbolicPolynomial,
  type NDegreeSymbolicTargetPolynomial,
} from './n-degree-symbolic-polynomial';
import { hasAmbiguousAdjacentProduct, parameterNamesFromLatex } from './target-context';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
  hasTarget,
  isArrayNode,
  isOneNode,
  latexForNode,
} from './math-json';
import {
  solveParameterizedCubicCardanoEquation,
  solveParameterizedRealCubicCardanoEquation,
  type ParameterizedCubicCardanoOptions,
  type ParameterizedCubicCardanoResult,
  type ParameterizedCubicCardanoStop,
  type ParameterizedCubicCardanoStopReason,
  type ParameterizedCubicCardanoSuccess,
} from './cubic-cardano';

const ce = new ComputeEngine();
const MAX_RATIONAL_CARDANO_DEGREE = 4;

type RationalCubicCardanoStopReason =
  | ParameterizedCubicCardanoStopReason
  | 'not-rational'
  | 'cleared-equation-unsupported';

type RationalCubicCardanoStop = Omit<ParameterizedCubicCardanoStop, 'reason'> & {
  reason: RationalCubicCardanoStopReason;
};

export type ParameterizedRationalCubicCardanoSuccess = ParameterizedCubicCardanoSuccess & {
  clearedEquationLatex: string;
};

export type ParameterizedRationalCubicCardanoResult =
  | ParameterizedRationalCubicCardanoSuccess
  | RationalCubicCardanoStop;

export type ParameterizedRationalCubicCardanoOptions = ParameterizedCubicCardanoOptions & {
  domain: 'complex' | 'real';
};

type RationalExpression = {
  numerator: NDegreeSymbolicTargetPolynomial;
  denominator: NDegreeSymbolicTargetPolynomial;
  denominatorFacts: EquationBranchDomainFact[];
  sawDivision: boolean;
};

type CollectResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unsupported'; reason: RationalCubicCardanoStopReason; message: string };

const RATIONAL_CARDANO_MESSAGES = {
  targetInDenominator: {
    reason: 'target-in-denominator',
    message: 'Cubic rational Cardano normalization cannot consume this selected-target denominator shape.',
  },
  negativePower: {
    reason: 'target-in-denominator',
    message: 'Negative selected-target powers are outside cubic rational Cardano normalization.',
  },
  degreeLimit: {
    reason: 'degree-limit',
    message: 'Clearing this rational equation would exceed the degree-4 Cardano/Ferrari inspection cap.',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation',
    message: 'The selected target appears in an unsupported rational Cardano expression shape.',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-power',
    message: 'Cubic rational Cardano normalization only supports bounded selected-target powers.',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-family',
    message: 'This selected-target family is outside top-level rational Cardano normalization.',
  },
} as const;

const ZERO_POLYNOMIAL = zeroNDegreeSymbolicPolynomial(MAX_RATIONAL_CARDANO_DEGREE);
const ONE_POLYNOMIAL = oneNDegreeSymbolicPolynomial(MAX_RATIONAL_CARDANO_DEGREE);

function stop(
  reason: RationalCubicCardanoStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): RationalCubicCardanoStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function isSymbolicZeroNode(node: unknown) {
  return typeof node === 'number' && node === 0;
}

function isOnePolynomial(polynomial: NDegreeSymbolicTargetPolynomial) {
  return polynomial.terms.every((term, degree) =>
    degree === 0 ? isOneNode(term) : isSymbolicZeroNode(term));
}

function multiplyPolynomials(
  left: NDegreeSymbolicTargetPolynomial,
  right: NDegreeSymbolicTargetPolynomial,
): CollectResult<NDegreeSymbolicTargetPolynomial> {
  const multiplied = multiplyNDegreeSymbolicPolynomials(
    left,
    right,
    RATIONAL_CARDANO_MESSAGES.degreeLimit,
  );
  return multiplied.kind === 'ok'
    ? { kind: 'ok', value: multiplied.polynomial }
    : multiplied;
}

function collectPolynomial(
  node: unknown,
  target: string,
): CollectResult<NDegreeSymbolicTargetPolynomial> {
  const collected = collectBoundedNDegreeSymbolicTargetPolynomial(
    node,
    target,
    MAX_RATIONAL_CARDANO_DEGREE,
    RATIONAL_CARDANO_MESSAGES,
  );
  return collected.kind === 'ok'
    ? { kind: 'ok', value: collected.polynomial }
    : collected;
}

function polynomialLatex(polynomial: NDegreeSymbolicTargetPolynomial, target: string) {
  const nodeLatex = latexForNode(nDegreeSymbolicPolynomialToNode(polynomial, target));
  return nDegreeSymbolicPolynomialNeedsExplicitLatex(polynomial) || /\\exponentialE|\\ln|\\log/.test(nodeLatex)
    ? nDegreeSymbolicPolynomialToExplicitLatex(polynomial, target)
    : nodeLatex;
}

function collectRational(node: unknown, target: string): CollectResult<RationalExpression> {
  if (isArrayNode(node)) {
    const [operator, ...operands] = node;
    if (operator === 'Add') {
      let current: RationalExpression = {
        numerator: ZERO_POLYNOMIAL,
        denominator: ONE_POLYNOMIAL,
        denominatorFacts: [],
        sawDivision: false,
      };
      for (const operand of operands) {
        const collected = collectRational(operand, target);
        if (collected.kind === 'unsupported') {
          return collected;
        }
        const numeratorLeft = multiplyPolynomials(current.numerator, collected.value.denominator);
        if (numeratorLeft.kind === 'unsupported') {
          return numeratorLeft;
        }
        const numeratorRight = multiplyPolynomials(collected.value.numerator, current.denominator);
        if (numeratorRight.kind === 'unsupported') {
          return numeratorRight;
        }
        const denominator = multiplyPolynomials(current.denominator, collected.value.denominator);
        if (denominator.kind === 'unsupported') {
          return denominator;
        }
        current = {
          numerator: addNDegreeSymbolicPolynomials(numeratorLeft.value, numeratorRight.value),
          denominator: denominator.value,
          denominatorFacts: [...current.denominatorFacts, ...collected.value.denominatorFacts],
          sawDivision: current.sawDivision || collected.value.sawDivision,
        };
      }
      return { kind: 'ok', value: current };
    }

    if (operator === 'Subtract') {
      const [left, right] = operands;
      return collectRational(['Add', left, ['Negate', right]], target);
    }

    if (operator === 'Negate') {
      const collected = collectRational(operands[0], target);
      if (collected.kind === 'unsupported') {
        return collected;
      }
      return {
        kind: 'ok',
        value: {
          ...collected.value,
          numerator: negateNDegreeSymbolicPolynomial(collected.value.numerator),
        },
      };
    }

    if (operator === 'Multiply') {
      let current: RationalExpression = {
        numerator: ONE_POLYNOMIAL,
        denominator: ONE_POLYNOMIAL,
        denominatorFacts: [],
        sawDivision: false,
      };
      for (const operand of operands) {
        const collected = collectRational(operand, target);
        if (collected.kind === 'unsupported') {
          return collected;
        }
        const numerator = multiplyPolynomials(current.numerator, collected.value.numerator);
        if (numerator.kind === 'unsupported') {
          return numerator;
        }
        const denominator = multiplyPolynomials(current.denominator, collected.value.denominator);
        if (denominator.kind === 'unsupported') {
          return denominator;
        }
        current = {
          numerator: numerator.value,
          denominator: denominator.value,
          denominatorFacts: [...current.denominatorFacts, ...collected.value.denominatorFacts],
          sawDivision: current.sawDivision || collected.value.sawDivision,
        };
      }
      return { kind: 'ok', value: current };
    }

    if (operator === 'Divide') {
      const [numerator, denominator] = operands;
      const numeratorRational = collectRational(numerator, target);
      if (numeratorRational.kind === 'unsupported') {
        return numeratorRational;
      }
      const denominatorRational = collectRational(denominator, target);
      if (denominatorRational.kind === 'unsupported') {
        return denominatorRational;
      }
      const combinedNumerator = multiplyPolynomials(
        numeratorRational.value.numerator,
        denominatorRational.value.denominator,
      );
      if (combinedNumerator.kind === 'unsupported') {
        return combinedNumerator;
      }
      const combinedDenominator = multiplyPolynomials(
        numeratorRational.value.denominator,
        denominatorRational.value.numerator,
      );
      if (combinedDenominator.kind === 'unsupported') {
        return combinedDenominator;
      }
      const denominatorNonzeroFacts: EquationBranchDomainFact[] = isOnePolynomial(
        denominatorRational.value.numerator,
      )
        ? []
        : [createDenominatorExclusionFact(
          polynomialLatex(denominatorRational.value.numerator, target),
        )];
      return {
        kind: 'ok',
        value: {
          numerator: combinedNumerator.value,
          denominator: combinedDenominator.value,
          denominatorFacts: [
            ...numeratorRational.value.denominatorFacts,
            ...denominatorRational.value.denominatorFacts,
            ...denominatorNonzeroFacts,
          ],
          sawDivision: true,
        },
      };
    }
  }

  const polynomial = collectPolynomial(node, target);
  if (polynomial.kind === 'unsupported') {
    return polynomial;
  }

  return {
    kind: 'ok',
    value: {
      numerator: polynomial.value,
      denominator: ONE_POLYNOMIAL,
      denominatorFacts: [],
      sawDivision: false,
    },
  };
}

function dedupeLatex(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function cardanoDomainLabel(domain: 'complex' | 'real') {
  return domain === 'complex' ? 'Complex' : 'Real';
}

function solveClearedCubic(
  clearedEquationLatex: string,
  target: string,
  options: ParameterizedRationalCubicCardanoOptions,
): ParameterizedCubicCardanoResult {
  return options.domain === 'complex'
    ? solveParameterizedCubicCardanoEquation(clearedEquationLatex, target, {
      allowGeneratedImplicitProducts: true,
      complexExactForm: options.complexExactForm,
    })
    : solveParameterizedRealCubicCardanoEquation(clearedEquationLatex, target, {
      allowGeneratedImplicitProducts: true,
    });
}

export function solveParameterizedRationalCubicCardanoEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedRationalCubicCardanoOptions,
): ParameterizedRationalCubicCardanoResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before rational Cardano normalization.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for rational Cardano normalization.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before rational Cardano normalization.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectRational(json[1], target);
  if (left.kind === 'unsupported') {
    return stop(left.reason, left.message, target, parameterNames);
  }

  const right = collectRational(json[2], target);
  if (right.kind === 'unsupported') {
    return stop(right.reason, right.message, target, parameterNames);
  }

  if (!left.value.sawDivision && !right.value.sawDivision) {
    return stop(
      'not-rational',
      'No rational denominator clearing was needed before cubic Cardano solving.',
      target,
      parameterNames,
    );
  }

  const leftCleared = multiplyPolynomials(left.value.numerator, right.value.denominator);
  if (leftCleared.kind === 'unsupported') {
    return stop(leftCleared.reason, leftCleared.message, target, parameterNames);
  }
  const rightCleared = multiplyPolynomials(right.value.numerator, left.value.denominator);
  if (rightCleared.kind === 'unsupported') {
    return stop(rightCleared.reason, rightCleared.message, target, parameterNames);
  }

  const cleared = subtractNDegreeSymbolicPolynomials(leftCleared.value, rightCleared.value);
  const degree = nDegreeSymbolicPolynomialDegree(cleared);
  if (degree === 4) {
    return stop(
      'ferrari-deferred',
      'Clearing this rational equation produces a quartic; Ferrari output remains deferred.',
      target,
      parameterNames,
    );
  }
  if (degree !== 3) {
    return stop(
      degree > 4 ? 'degree-limit' : 'not-cubic',
      degree > 4
        ? 'Clearing this rational equation exceeds the degree-4 Cardano/Ferrari inspection cap.'
        : 'Rational Cardano normalization only applies when denominator clearing produces a direct cubic.',
      target,
      parameterNames,
    );
  }

  const clearedEquationLatex = `${polynomialLatex(cleared, target)}=0`;
  const solved = solveClearedCubic(clearedEquationLatex, target, options);
  if (solved.kind !== 'success') {
    return stop(
      'cleared-equation-unsupported',
      solved.message,
      target,
      parameterNames,
    );
  }

  const originalExclusionFacts = mergeEquationBranchDomainFacts(
    left.value.denominatorFacts,
    right.value.denominatorFacts,
  );
  const exactSupplementFacts = mergeEquationBranchDomainFacts(
    originalExclusionFacts,
    factsFromLegacySupplementLatex(solved.exactSupplementLatex),
  );
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupeLatex(
    renderRawSupplementLatexFromFacts(exactSupplementFacts),
  ));
  const detailSections: DisplayDetailSection[] = normalizeParameterizedDetailSections([
    ...solved.detailSections,
    ...buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Cubic Rational Normalization',
      familyLines: [
        `Cleared denominator factors into ${clearedEquationLatex}.`,
        `Delegated the cleared cubic to the ${cardanoDomainLabel(options.domain)} Exact Cardano route.`,
        'Original denominator exclusions were preserved before applying Cardano facts.',
      ],
    }),
  ]);

  const branchReadback = (solved as { branchReadback?: DisplayBranchReadback }).branchReadback;

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: solved.exactLatex,
    branchReadback,
    exactSupplementLatex,
    detailSections,
    clearedEquationLatex,
  };
}

export function solveParameterizedTopLevelCubicCardanoEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedRationalCubicCardanoOptions,
) {
  const directCardano = options.domain === 'complex'
    ? solveParameterizedCubicCardanoEquation(equationLatex, target, {
      allowGeneratedImplicitProducts: options.allowGeneratedImplicitProducts,
      complexExactForm: options.complexExactForm,
    })
    : solveParameterizedRealCubicCardanoEquation(equationLatex, target, {
      allowGeneratedImplicitProducts: options.allowGeneratedImplicitProducts,
    });

  return directCardano.kind === 'unsupported' && directCardano.reason === 'target-in-denominator'
    ? solveParameterizedRationalCubicCardanoEquation(equationLatex, target, options)
    : directCardano;
}
