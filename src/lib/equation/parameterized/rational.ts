import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
  hasTarget,
  isArrayNode,
  latexForNode,
  type MathJson,
} from './math-json';
import {
  addSymbolicPolynomials,
  collectBoundedSymbolicTargetPolynomial,
  isOneSymbolicPolynomial,
  multiplySymbolicPolynomials,
  negateSymbolicPolynomial,
  oneSymbolicPolynomial,
  subtractSymbolicPolynomials,
  type SymbolicTargetPolynomial,
  symbolicPolynomialDegree,
  symbolicPolynomialNeedsExplicitLatex,
  symbolicPolynomialToExplicitLatex,
  symbolicPolynomialToNode,
  zeroSymbolicPolynomial,
} from './symbolic-polynomial';
import {
  createDenominatorExclusionFact,
  factsFromLegacySupplementLatex,
  mergeEquationBranchDomainFacts,
  renderRawSupplementLatexFromFacts,
  type EquationBranchDomainFact,
} from '../facts/branch-domain-facts';
import { exactRootsFromLatex } from '../roots/representation';
import { finiteBranchReadbackForNormalizedBranches } from '../readback/finite-branches';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
} from '../solution/finite-root-set';
import { profileEquationResult } from '../../display/printer';

const ce = new ComputeEngine();

export type ParameterizedRationalStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-in-unsupported-operation'
  | 'target-power'
  | 'cleared-degree-limit'
  | 'nested-denominator'
  | 'not-rational'
  | 'cleared-equation-unsupported';

export type ParameterizedRationalSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  clearedEquationLatex: string;
};

export type ParameterizedRationalSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedRationalStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedRationalSolveResult =
  | ParameterizedRationalSolveSuccess
  | ParameterizedRationalSolveStop;

export type ParameterizedRationalSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

type RationalExpression = {
  numerator: SymbolicTargetPolynomial;
  denominator: SymbolicTargetPolynomial;
  denominatorFacts: EquationBranchDomainFact[];
  sawDivision: boolean;
};

type CollectResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unsupported'; reason: ParameterizedRationalStopReason; message: string };

const RATIONAL_POLYNOMIAL_MESSAGES = {
  targetInDenominator: {
    reason: 'nested-denominator',
    message: 'This polynomial branch cannot consume target denominators before EQUATION-PARAM8 rational normalization.',
  },
  negativePower: {
    reason: 'nested-denominator',
    message: 'Negative target powers are outside EQUATION-PARAM8 rational normalization.',
  },
  degreeLimit: {
    reason: 'cleared-degree-limit',
    message: 'Clearing this rational equation would exceed the EQUATION-PARAM8 degree-2 cap.',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation',
    message: 'The selected target appears in an unsupported expression shape.',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-operation',
    message: 'This rational parameterized slice does not support the selected target in arbitrary powers.',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-operation',
    message: 'This parameterized family is outside EQUATION-PARAM8 rational target solving.',
  },
} as const;

const ZERO_POLYNOMIAL = zeroSymbolicPolynomial();
const ONE_POLYNOMIAL = oneSymbolicPolynomial();
const addPolynomials = addSymbolicPolynomials;
const negatePolynomial = negateSymbolicPolynomial;
const subtractPolynomials = subtractSymbolicPolynomials;
const polynomialDegree = symbolicPolynomialDegree;
const isOnePolynomial = isOneSymbolicPolynomial;
const polynomialToNode = symbolicPolynomialToNode;
const polynomialNeedsExplicitLatex = symbolicPolynomialNeedsExplicitLatex;
const polynomialToExplicitLatex = symbolicPolynomialToExplicitLatex;

function multiplyPolynomials(
  left: SymbolicTargetPolynomial,
  right: SymbolicTargetPolynomial,
): CollectResult<SymbolicTargetPolynomial> {
  const multiplied = multiplySymbolicPolynomials(
    left,
    right,
    RATIONAL_POLYNOMIAL_MESSAGES.degreeLimit,
  );
  return multiplied.kind === 'ok'
    ? { kind: 'ok', value: multiplied.polynomial }
    : multiplied;
}

function collectPolynomial(
  node: unknown,
  target: string,
): CollectResult<SymbolicTargetPolynomial> {
  const collected = collectBoundedSymbolicTargetPolynomial(
    node,
    target,
    RATIONAL_POLYNOMIAL_MESSAGES,
  );
  return collected.kind === 'ok'
    ? { kind: 'ok', value: collected.polynomial }
    : collected;
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
          numerator: addPolynomials(numeratorLeft.value, numeratorRight.value),
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
          numerator: negatePolynomial(collected.value.numerator),
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
          latexForNode(polynomialToNode(denominatorRational.value.numerator, target)),
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

function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) =>
      symbol.name !== target
      && (
        symbol.identifierKind === 'named-variable'
        || (symbol.identifierKind === 'single-symbol-variable' && /^[A-Za-z]$/.test(symbol.name))
      ))
    .map((symbol) => symbol.name);
}

function stop(
  reason: ParameterizedRationalStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedRationalSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function dedupeLatex(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function exactLatexForRoots(target: string, roots: string[]) {
  const renderedRoots = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: target,
      branches: roots,
      source: 'equation-parameterized-rational',
    }),
    { preserveOrder: true },
  );
  return renderedRoots.exactLatex ?? `${target}\\in\\left\\{\\right\\}`;
}

function numericValueOfLatex(latex: string, target: string, rootLatex: string) {
  try {
    const substituted = ce.parse(latex).subs({ [target]: ce.parse(rootLatex) });
    const numeric = substituted.N?.() ?? substituted.evaluate();
    const json = numeric.json;
    return typeof json === 'number' && Number.isFinite(json) ? json : null;
  } catch {
    return null;
  }
}

function rootViolatesExclusion(rootLatex: string, target: string, fact: EquationBranchDomainFact) {
  if (
    fact.entry.kind !== 'exclusion'
    || fact.entry.relation !== '\\ne0'
  ) {
    return false;
  }

  const value = numericValueOfLatex(fact.entry.expressionLatex, target, rootLatex);
  return value !== null && Math.abs(value) <= 1e-9;
}

function filterRootsByExclusions(exactLatex: string, target: string, facts: EquationBranchDomainFact[]) {
  const roots = exactRootsFromLatex(exactLatex, target);
  if (!roots) {
    return null;
  }

  const accepted = roots
    .filter((rootLatex) => !facts.some((fact) => rootViolatesExclusion(rootLatex, target, fact)));

  return accepted.length === roots.length ? null : accepted;
}

function conditionLatexForTargetFreeZero(node: MathJson) {
  const equality = equalityLatexFromDifference(node);
  return equality ?? `${latexForNode(node)}=0`;
}

function equalityLatexFromDifference(node: MathJson): string | null {
  if (isArrayNode(node) && node[0] === 'Negate') {
    return equalityLatexFromDifference(node[1] as MathJson);
  }

  if (isArrayNode(node) && node[0] === 'Subtract' && node.length === 3) {
    return `${latexForNode(node[1] as MathJson)}=${latexForNode(node[2] as MathJson)}`;
  }

  if (isArrayNode(node) && node[0] === 'Add' && node.length === 3) {
    const [, left, right] = node;
    if (isArrayNode(right) && right[0] === 'Negate') {
      return `${latexForNode(left as MathJson)}=${latexForNode(right[1] as MathJson)}`;
    }
    if (isArrayNode(left) && left[0] === 'Negate') {
      return `${latexForNode(right as MathJson)}=${latexForNode(left[1] as MathJson)}`;
    }
  }

  return null;
}

export function solveParameterizedRationalEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedRationalSolveOptions = {},
): ParameterizedRationalSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized rational solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized rational solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized rational solving.', target, parameterNames);
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
      'No rational denominator clearing was needed for this selected-target equation.',
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

  const cleared = subtractPolynomials(leftCleared.value, rightCleared.value);
  if (polynomialDegree(cleared) > 2) {
    return stop(
      'cleared-degree-limit',
      'Clearing this rational equation would exceed the EQUATION-PARAM8 degree-2 cap.',
      target,
      parameterNames,
    );
  }

  const clearedLatex = latexForNode(polynomialToNode(cleared, target));
  const clearedEquationLatex = `${
    polynomialNeedsExplicitLatex(cleared) || /\\exponentialE|\\ln|\\log/.test(clearedLatex)
      ? polynomialToExplicitLatex(cleared, target)
      : clearedLatex
  }=0`;
  const originalExclusionFacts = mergeEquationBranchDomainFacts(
    left.value.denominatorFacts,
    right.value.denominatorFacts,
  );
  const originalExclusions = renderRawSupplementLatexFromFacts(originalExclusionFacts);

  if (polynomialDegree(cleared) === 0) {
    const exactSupplementLatex = normalizeParameterizedSupplementLatex(originalExclusions);
    const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Parameterized Rational Solve',
      familyLines: [
        `Cleared denominator factors into ${clearedEquationLatex}.`,
        `The selected target cancels out, so PARAM8 returns the remaining parameter condition instead of inventing a ${target} value.`,
      ],
      extraSections: [{
        title: 'Conditional Target Family',
        lineKind: 'text',
        lines: [
          'Any selected-target value still has to satisfy the preserved denominator exclusions.',
        ],
      }],
    });

    return profileEquationResult({
      kind: 'success',
      target,
      parameterNames,
      exactLatex: conditionLatexForTargetFreeZero(cleared.terms[0]),
      exactSupplementLatex,
      detailSections,
      clearedEquationLatex,
    });
  }

  const delegateOptions = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(clearedEquationLatex, target, delegateOptions);
  const solved = linear.kind === 'success'
    ? linear
    : solveParameterizedPolynomialEquation(clearedEquationLatex, target, delegateOptions);

  if (solved.kind !== 'success') {
    return stop(
      'cleared-equation-unsupported',
      solved.message,
      target,
      parameterNames,
    );
  }

  const exactSupplementFacts = mergeEquationBranchDomainFacts(
    originalExclusionFacts,
    factsFromLegacySupplementLatex(solved.exactSupplementLatex),
  );
  const filteredRoots = filterRootsByExclusions(solved.exactLatex, target, exactSupplementFacts);
  if (filteredRoots?.length === 0) {
    return stop(
      'cleared-equation-unsupported',
      'All cleared-equation roots violate the preserved denominator exclusions.',
      target,
      parameterNames,
    );
  }
  const exactLatex = filteredRoots
    ? exactLatexForRoots(target, filteredRoots)
    : solved.exactLatex;
  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupeLatex(
    renderRawSupplementLatexFromFacts(exactSupplementFacts),
  ));
  const detailSections: DisplayDetailSection[] = normalizeParameterizedDetailSections([
    ...solved.detailSections,
    {
      title: 'Parameterized Rational Solve',
      lineKind: 'text',
      lines: [
        `Cleared denominator factors into ${clearedEquationLatex}.`,
        'Original denominator exclusions were preserved before solving the cleared equation.',
      ],
    },
  ]);

  const branchReadback = filteredRoots
    ? finiteBranchReadbackForNormalizedBranches({
        targetLatex: target,
        branchesLatex: filteredRoots,
        preserveOrder: true,
        source: 'equation-parameterized-rational',
      })
    : (solved as { branchReadback?: DisplayBranchReadback }).branchReadback;

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex,
    branchReadback,
    exactSupplementLatex,
    detailSections,
    clearedEquationLatex,
  };
}
