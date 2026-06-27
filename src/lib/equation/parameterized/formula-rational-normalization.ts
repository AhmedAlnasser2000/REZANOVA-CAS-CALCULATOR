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
  addNDegreeSymbolicPolynomials,
  collectBoundedNDegreeSymbolicTargetPolynomial,
  multiplyNDegreeSymbolicPolynomials,
  nDegreeSymbolicPolynomialDegree,
  nDegreeSymbolicPolynomialNeedsExplicitLatex,
  nDegreeSymbolicPolynomialToExplicitLatex,
  nDegreeSymbolicPolynomialToNode,
  negateNDegreeSymbolicPolynomial,
  oneNDegreeSymbolicPolynomial,
  subtractNDegreeSymbolicPolynomials,
  zeroNDegreeSymbolicPolynomial,
  type NDegreeSymbolicTargetPolynomial,
} from './n-degree-symbolic-polynomial';
import { hasAmbiguousAdjacentProduct, parameterNamesFromLatex } from './target-context';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import { hasTarget, isArrayNode, isOneNode, latexForNode } from './math-json';
import {
  solveParameterizedCubicCardanoEquation,
  solveParameterizedRealCubicCardanoEquation,
  type ParameterizedCubicCardanoOptions,
  type ParameterizedCubicCardanoResult,
  type ParameterizedCubicCardanoStop,
  type ParameterizedCubicCardanoStopReason,
  type ParameterizedCubicCardanoSuccess,
} from './cubic-cardano';
import {
  solveParameterizedQuarticFerrariEquation,
  solveParameterizedRealQuarticFerrariEquation,
  type ParameterizedQuarticFerrariOptions,
  type ParameterizedQuarticFerrariResult,
  type ParameterizedQuarticFerrariStop,
  type ParameterizedQuarticFerrariStopReason,
  type ParameterizedQuarticFerrariSuccess,
} from './quartic-ferrari';
import { disambiguateFormulaFunctionProducts } from './formula-readback-polish';

const ce = new ComputeEngine();
const MAX_RATIONAL_FORMULA_DEGREE = 4;

type FormulaDomain = 'complex' | 'real';
type FormulaRationalCollectStopReason =
  | 'target-in-denominator'
  | 'degree-limit'
  | 'target-in-unsupported-operation'
  | 'target-in-unsupported-power'
  | 'target-in-unsupported-family';
type FormulaRationalStopReason =
  | FormulaRationalCollectStopReason
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'not-rational';

type RationalCubicCardanoStopReason =
  | ParameterizedCubicCardanoStopReason
  | 'not-rational'
  | 'cleared-equation-unsupported';
type RationalQuarticFerrariStopReason =
  | ParameterizedQuarticFerrariStopReason
  | 'not-rational'
  | 'cleared-equation-unsupported';

type RationalCubicCardanoStop = Omit<ParameterizedCubicCardanoStop, 'reason'> & {
  reason: RationalCubicCardanoStopReason;
};
type RationalQuarticFerrariStop = Omit<ParameterizedQuarticFerrariStop, 'reason'> & {
  reason: RationalQuarticFerrariStopReason;
};

export type ParameterizedRationalCubicCardanoSuccess = ParameterizedCubicCardanoSuccess & {
  clearedEquationLatex: string;
};
export type ParameterizedRationalQuarticFerrariSuccess = ParameterizedQuarticFerrariSuccess & {
  clearedEquationLatex: string;
};
export type ParameterizedRationalCubicCardanoResult =
  | ParameterizedRationalCubicCardanoSuccess
  | RationalCubicCardanoStop;
export type ParameterizedRationalQuarticFerrariResult =
  | ParameterizedRationalQuarticFerrariSuccess
  | RationalQuarticFerrariStop;
export type ParameterizedRationalCubicCardanoOptions = ParameterizedCubicCardanoOptions & {
  domain: FormulaDomain;
};
export type ParameterizedRationalQuarticFerrariOptions = ParameterizedQuarticFerrariOptions & {
  domain: FormulaDomain;
};

type RationalExpression = {
  numerator: NDegreeSymbolicTargetPolynomial;
  denominator: NDegreeSymbolicTargetPolynomial;
  denominatorFacts: EquationBranchDomainFact[];
  sawDivision: boolean;
};
type CollectResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unsupported'; reason: FormulaRationalCollectStopReason; message: string };
type FormulaRationalEquationStop = {
  kind: 'unsupported';
  reason: FormulaRationalStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};
type ClearedFormulaRationalEquation = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  cleared: NDegreeSymbolicTargetPolynomial;
  degree: number;
  clearedEquationLatex: string;
  originalExclusionFacts: EquationBranchDomainFact[];
};

const RATIONAL_FORMULA_MESSAGES = {
  targetInDenominator: {
    reason: 'target-in-denominator',
    message: 'Formula rational normalization cannot consume this selected-target denominator shape.',
  },
  negativePower: {
    reason: 'target-in-denominator',
    message: 'Negative selected-target powers are outside formula rational normalization.',
  },
  degreeLimit: {
    reason: 'degree-limit',
    message: 'Clearing this rational equation would exceed the degree-4 Cardano/Ferrari inspection cap.',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation',
    message: 'The selected target appears in an unsupported formula rational expression shape.',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-power',
    message: 'Formula rational normalization only supports bounded selected-target powers.',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-family',
    message: 'This selected-target family is outside top-level formula rational normalization.',
  },
} as const;

const ZERO_POLYNOMIAL = zeroNDegreeSymbolicPolynomial(MAX_RATIONAL_FORMULA_DEGREE);
const ONE_POLYNOMIAL = oneNDegreeSymbolicPolynomial(MAX_RATIONAL_FORMULA_DEGREE);

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
    RATIONAL_FORMULA_MESSAGES.degreeLimit,
  );
  return multiplied.kind === 'ok'
    ? { kind: 'ok', value: multiplied.polynomial }
    : multiplied;
}

function collectPolynomial(node: unknown, target: string): CollectResult<NDegreeSymbolicTargetPolynomial> {
  const collected = collectBoundedNDegreeSymbolicTargetPolynomial(
    node,
    target,
    MAX_RATIONAL_FORMULA_DEGREE,
    RATIONAL_FORMULA_MESSAGES,
  );
  return collected.kind === 'ok'
    ? { kind: 'ok', value: collected.polynomial }
    : collected;
}

function polynomialLatex(polynomial: NDegreeSymbolicTargetPolynomial, target: string) {
  const nodeLatex = latexForNode(nDegreeSymbolicPolynomialToNode(polynomial, target));
  const latex = nDegreeSymbolicPolynomialNeedsExplicitLatex(polynomial) || /\\exponentialE|\\ln|\\log/.test(nodeLatex)
    ? nDegreeSymbolicPolynomialToExplicitLatex(polynomial, target)
    : nodeLatex;
  return disambiguateFormulaFunctionProducts(latex);
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
        if (collected.kind === 'unsupported') return collected;
        const numeratorLeft = multiplyPolynomials(current.numerator, collected.value.denominator);
        if (numeratorLeft.kind === 'unsupported') return numeratorLeft;
        const numeratorRight = multiplyPolynomials(collected.value.numerator, current.denominator);
        if (numeratorRight.kind === 'unsupported') return numeratorRight;
        const denominator = multiplyPolynomials(current.denominator, collected.value.denominator);
        if (denominator.kind === 'unsupported') return denominator;
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
      if (collected.kind === 'unsupported') return collected;
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
        if (collected.kind === 'unsupported') return collected;
        const numerator = multiplyPolynomials(current.numerator, collected.value.numerator);
        if (numerator.kind === 'unsupported') return numerator;
        const denominator = multiplyPolynomials(current.denominator, collected.value.denominator);
        if (denominator.kind === 'unsupported') return denominator;
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
      if (numeratorRational.kind === 'unsupported') return numeratorRational;
      const denominatorRational = collectRational(denominator, target);
      if (denominatorRational.kind === 'unsupported') return denominatorRational;
      const combinedNumerator = multiplyPolynomials(
        numeratorRational.value.numerator,
        denominatorRational.value.denominator,
      );
      if (combinedNumerator.kind === 'unsupported') return combinedNumerator;
      const combinedDenominator = multiplyPolynomials(
        numeratorRational.value.denominator,
        denominatorRational.value.numerator,
      );
      if (combinedDenominator.kind === 'unsupported') return combinedDenominator;
      const denominatorNonzeroFacts: EquationBranchDomainFact[] = isOnePolynomial(
        denominatorRational.value.numerator,
      )
        ? []
        : [createDenominatorExclusionFact(polynomialLatex(denominatorRational.value.numerator, target))];
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
  return polynomial.kind === 'ok'
    ? {
      kind: 'ok',
      value: {
        numerator: polynomial.value,
        denominator: ONE_POLYNOMIAL,
        denominatorFacts: [],
        sawDivision: false,
      },
    }
    : polynomial;
}

function stop(
  reason: FormulaRationalStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): FormulaRationalEquationStop {
  return { kind: 'unsupported', reason, message, target, parameterNames };
}

function collectClearedFormulaRationalEquation(
  equationLatex: string,
  target: string,
  options: { allowGeneratedImplicitProducts?: boolean; routeName: string },
): ClearedFormulaRationalEquation | FormulaRationalEquationStop {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      `Adjacent letters must use explicit multiplication before ${options.routeName} rational normalization.`,
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', `The equation could not be parsed for ${options.routeName} rational normalization.`, target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', `Enter an = equation before ${options.routeName} rational normalization.`, target, parameterNames);
  }
  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const left = collectRational(json[1], target);
  if (left.kind === 'unsupported') return stop(left.reason, left.message, target, parameterNames);
  const right = collectRational(json[2], target);
  if (right.kind === 'unsupported') return stop(right.reason, right.message, target, parameterNames);
  if (!left.value.sawDivision && !right.value.sawDivision) {
    return stop('not-rational', `No rational denominator clearing was needed before ${options.routeName} solving.`, target, parameterNames);
  }

  const leftCleared = multiplyPolynomials(left.value.numerator, right.value.denominator);
  if (leftCleared.kind === 'unsupported') return stop(leftCleared.reason, leftCleared.message, target, parameterNames);
  const rightCleared = multiplyPolynomials(right.value.numerator, left.value.denominator);
  if (rightCleared.kind === 'unsupported') return stop(rightCleared.reason, rightCleared.message, target, parameterNames);

  const cleared = subtractNDegreeSymbolicPolynomials(leftCleared.value, rightCleared.value);
  return {
    kind: 'success',
    target,
    parameterNames,
    cleared,
    degree: nDegreeSymbolicPolynomialDegree(cleared),
    clearedEquationLatex: `${polynomialLatex(cleared, target)}=0`,
    originalExclusionFacts: mergeEquationBranchDomainFacts(
      left.value.denominatorFacts,
      right.value.denominatorFacts,
    ),
  };
}

function dedupeLatex(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function domainLabel(domain: FormulaDomain) {
  return domain === 'complex' ? 'Complex' : 'Real';
}

function mergedSupplementLatex(
  originalExclusionFacts: EquationBranchDomainFact[],
  solvedSupplementLatex?: string[],
) {
  const exactSupplementFacts = mergeEquationBranchDomainFacts(
    originalExclusionFacts,
    factsFromLegacySupplementLatex(solvedSupplementLatex),
  );
  return normalizeParameterizedSupplementLatex(dedupeLatex(
    renderRawSupplementLatexFromFacts(exactSupplementFacts),
  ));
}

function rationalDetailSections(options: {
  solvedSections: DisplayDetailSection[];
  target: string;
  parameterNames: string[];
  title: string;
  clearedEquationLatex: string;
  degreeName: string;
  algorithmName: string;
  domain: FormulaDomain;
}) {
  return normalizeParameterizedDetailSections([
    ...options.solvedSections,
    ...buildParameterizedDetailSections({
      target: options.target,
      parameterNames: options.parameterNames,
      familyTitle: options.title,
      familyLines: [
        `Cleared denominator factors into ${options.clearedEquationLatex}.`,
        `Delegated the cleared ${options.degreeName} to the ${domainLabel(options.domain)} Exact ${options.algorithmName} route.`,
        `Original denominator exclusions were preserved before applying ${options.algorithmName} facts.`,
      ],
    }),
  ]);
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

function solveClearedQuartic(
  clearedEquationLatex: string,
  target: string,
  options: ParameterizedRationalQuarticFerrariOptions,
): ParameterizedQuarticFerrariResult {
  return options.domain === 'complex'
    ? solveParameterizedQuarticFerrariEquation(clearedEquationLatex, target, {
      allowGeneratedImplicitProducts: true,
    })
    : solveParameterizedRealQuarticFerrariEquation(clearedEquationLatex, target, {
      allowGeneratedImplicitProducts: true,
    });
}

function cubicStop(
  reason: RationalCubicCardanoStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): RationalCubicCardanoStop {
  return { kind: 'unsupported', reason, message, target, parameterNames };
}

function quarticStop(
  reason: RationalQuarticFerrariStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): RationalQuarticFerrariStop {
  return { kind: 'unsupported', reason, message, target, parameterNames };
}

export function solveParameterizedRationalCubicCardanoEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedRationalCubicCardanoOptions,
): ParameterizedRationalCubicCardanoResult {
  const collected = collectClearedFormulaRationalEquation(equationLatex, target, {
    allowGeneratedImplicitProducts: options.allowGeneratedImplicitProducts,
    routeName: 'Cardano',
  });
  if (collected.kind === 'unsupported') {
    return cubicStop(collected.reason as RationalCubicCardanoStopReason, collected.message, target, collected.parameterNames);
  }
  if (collected.degree === 4) {
    return cubicStop(
      'ferrari-deferred',
      'Clearing this rational equation produces a quartic; quartic formula normalization is owned by the Ferrari route.',
      target,
      collected.parameterNames,
    );
  }
  if (collected.degree !== 3) {
    return cubicStop(
      collected.degree > 4 ? 'degree-limit' : 'not-cubic',
      collected.degree > 4
        ? 'Clearing this rational equation exceeds the degree-4 Cardano/Ferrari inspection cap.'
        : 'Rational Cardano normalization only applies when denominator clearing produces a direct cubic.',
      target,
      collected.parameterNames,
    );
  }

  const solved = solveClearedCubic(collected.clearedEquationLatex, target, options);
  if (solved.kind !== 'success') {
    return cubicStop('cleared-equation-unsupported', solved.message, target, collected.parameterNames);
  }
  return {
    kind: 'success',
    target,
    parameterNames: collected.parameterNames,
    exactLatex: solved.exactLatex,
    branchReadback: (solved as { branchReadback?: DisplayBranchReadback }).branchReadback,
    exactSupplementLatex: mergedSupplementLatex(collected.originalExclusionFacts, solved.exactSupplementLatex),
    detailSections: rationalDetailSections({
      solvedSections: solved.detailSections,
      target,
      parameterNames: collected.parameterNames,
      title: 'Cubic Rational Normalization',
      clearedEquationLatex: collected.clearedEquationLatex,
      degreeName: 'cubic',
      algorithmName: 'Cardano',
      domain: options.domain,
    }),
    clearedEquationLatex: collected.clearedEquationLatex,
  };
}

export function solveParameterizedRationalQuarticFerrariEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedRationalQuarticFerrariOptions,
): ParameterizedRationalQuarticFerrariResult {
  const collected = collectClearedFormulaRationalEquation(equationLatex, target, {
    allowGeneratedImplicitProducts: options.allowGeneratedImplicitProducts,
    routeName: 'Ferrari',
  });
  if (collected.kind === 'unsupported') {
    return quarticStop(collected.reason as RationalQuarticFerrariStopReason, collected.message, target, collected.parameterNames);
  }
  if (collected.degree !== 4) {
    return quarticStop(
      collected.degree > 4 ? 'degree-limit' : 'not-quartic',
      collected.degree > 4
        ? 'Clearing this rational equation exceeds the degree-4 Cardano/Ferrari inspection cap.'
        : 'Rational Ferrari normalization only applies when denominator clearing produces a direct quartic.',
      target,
      collected.parameterNames,
    );
  }

  const solved = solveClearedQuartic(collected.clearedEquationLatex, target, options);
  if (solved.kind !== 'success') {
    return quarticStop('cleared-equation-unsupported', solved.message, target, collected.parameterNames);
  }
  return {
    kind: 'success',
    target,
    parameterNames: collected.parameterNames,
    exactLatex: solved.exactLatex,
    branchReadback: (solved as { branchReadback?: DisplayBranchReadback }).branchReadback,
    exactSupplementLatex: mergedSupplementLatex(collected.originalExclusionFacts, solved.exactSupplementLatex),
    detailSections: rationalDetailSections({
      solvedSections: solved.detailSections,
      target,
      parameterNames: collected.parameterNames,
      title: 'Quartic Rational Normalization',
      clearedEquationLatex: collected.clearedEquationLatex,
      degreeName: 'quartic',
      algorithmName: 'Ferrari',
      domain: options.domain,
    }),
    clearedEquationLatex: collected.clearedEquationLatex,
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

export function solveParameterizedTopLevelQuarticFerrariEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedRationalQuarticFerrariOptions,
) {
  const directFerrari = options.domain === 'complex'
    ? solveParameterizedQuarticFerrariEquation(equationLatex, target, {
      allowGeneratedImplicitProducts: options.allowGeneratedImplicitProducts,
    })
    : solveParameterizedRealQuarticFerrariEquation(equationLatex, target, {
      allowGeneratedImplicitProducts: options.allowGeneratedImplicitProducts,
    });
  return directFerrari.kind === 'unsupported' && directFerrari.reason === 'target-in-denominator'
    ? solveParameterizedRationalQuarticFerrariEquation(equationLatex, target, options)
    : directFerrari;
}
