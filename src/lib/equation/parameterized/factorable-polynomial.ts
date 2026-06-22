import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import { solveBoundedPolynomialEquationAst } from '../../algebra/polynomial-factor-solve';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { mathDetailSection } from '../../display/result-detail-lines';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
  decomposeExplicitProductFactors,
  explicitProductNodeFromZeroEquation,
  type ProductFactor,
} from '../../symbolic-engine/primitives/factorization/factorization';
import {
  hasTarget,
  isArrayNode,
  isZeroNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from './math-json';
import { discoverSymbolicFactorPattern } from './symbolic-factor-patterns';
import {
  adaptBoundedPolynomialSolveResultToRootSet,
  createFactorDerivedRoot,
  createRootSet,
  exactRootsFromLatex,
  type EquationFactorDerivedRoot,
} from '../roots/representation';
import { buildCompactRootReadback } from '../roots/readback';
import { factsFromLegacySupplementLatex } from '../facts/branch-domain-facts';

const ce = new ComputeEngine();
const MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE = 12;
const MAX_EXPLICIT_PRODUCT_TARGET_DEGREE = 12;

export type ParameterizedFactorablePolynomialStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'degree-limit'
  | 'target-free-factor-condition'
  | 'unsupported-factor'
  | 'unsupported-expanded-polynomial'
  | 'not-factorable';

export type ParameterizedFactorablePolynomialSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type ParameterizedFactorablePolynomialSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedFactorablePolynomialStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedFactorablePolynomialSolveResult =
  | ParameterizedFactorablePolynomialSolveSuccess
  | ParameterizedFactorablePolynomialSolveStop;

export type ParameterizedFactorablePolynomialSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

type ExplicitFactor = {
  node: MathJson;
  multiplicity: number;
  degree: number;
  latex: string;
};

type DegreeResult =
  | { kind: 'ok'; degree: number }
  | {
    kind: 'unsupported';
    reason: Exclude<ParameterizedFactorablePolynomialStopReason, 'parse-error' | 'non-equation' | 'target-not-found' | 'ambiguous-adjacent-product' | 'not-factorable'>;
    message: string;
  };

type FactorEntryResult =
  | { kind: 'factor'; factor: ExplicitFactor }
  | Extract<DegreeResult, { kind: 'unsupported' }>;

type BranchSolveResult =
  | { kind: 'success'; rootEntry: EquationFactorDerivedRoot }
  | { kind: 'unsupported'; message: string };

function numericValueForNode(node: MathJson) {
  try {
    const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const json = numeric.json;
    return typeof json === 'number' && Number.isFinite(json) ? json : null;
  } catch {
    return null;
  }
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
  reason: ParameterizedFactorablePolynomialStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedFactorablePolynomialSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function integerExponent(node: unknown) {
  return typeof node === 'number' && Number.isInteger(node) ? node : null;
}

function targetPolynomialDegree(
  node: MathJson,
  target: string,
  options: { maxDegree?: number } = {},
): DegreeResult {
  const maxDegree = options.maxDegree ?? MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE;

  if (typeof node === 'string') {
    return { kind: 'ok', degree: node === target ? 1 : 0 };
  }

  if (typeof node === 'number' || typeof node === 'boolean' || node === null) {
    return { kind: 'ok', degree: 0 };
  }

  if (!isArrayNode(node)) {
    return hasTarget(node, target)
      ? {
        kind: 'unsupported',
        reason: 'unsupported-factor',
        message: 'The selected target appears in an unsupported factor shape.',
      }
      : { kind: 'ok', degree: 0 };
  }

  const [operator, ...operands] = node;

  if (operator === 'Add' || operator === 'Subtract') {
    let degree = 0;
    for (const operand of operands) {
      const child = targetPolynomialDegree(operand as MathJson, target, { maxDegree });
      if (child.kind === 'unsupported') {
        return child;
      }
      degree = Math.max(degree, child.degree);
    }
    return { kind: 'ok', degree };
  }

  if (operator === 'Negate') {
    return targetPolynomialDegree(operands[0] as MathJson, target, { maxDegree });
  }

  if (operator === 'Multiply') {
    let degree = 0;
    for (const operand of operands) {
      const child = targetPolynomialDegree(operand as MathJson, target, { maxDegree });
      if (child.kind === 'unsupported') {
        return child;
      }
      degree += child.degree;
      if (degree > maxDegree) {
        return {
          kind: 'unsupported',
          reason: 'degree-limit',
          message: `Parameterized factorable polynomial solving is capped at degree ${maxDegree}.`,
        };
      }
    }
    return { kind: 'ok', degree };
  }

  if (operator === 'Divide') {
    const [numerator, denominator] = operands;
    if (hasTarget(denominator, target)) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-factor',
        message: 'Factors with the selected target in a denominator belong to rational selected-target solving.',
      };
    }
    return targetPolynomialDegree(numerator as MathJson, target, { maxDegree });
  }

  if (operator === 'Power') {
    const [base, exponentNode] = operands;
    const exponent = integerExponent(exponentNode);
    if (exponent === null || exponent < 0) {
      return hasTarget(node, target)
        ? {
          kind: 'unsupported',
          reason: 'unsupported-factor',
          message: 'PARAM9 supports only nonnegative integer powers in factorable polynomial branches.',
        }
        : { kind: 'ok', degree: 0 };
    }
    const baseDegree = targetPolynomialDegree(base as MathJson, target, { maxDegree });
    if (baseDegree.kind === 'unsupported') {
      return baseDegree;
    }
    const degree = baseDegree.degree * exponent;
    if (degree > maxDegree) {
      return {
        kind: 'unsupported',
        reason: 'degree-limit',
        message: `Parameterized factorable polynomial solving is capped at degree ${maxDegree}.`,
      };
    }
    return { kind: 'ok', degree };
  }

  return hasTarget(node, target)
    ? {
      kind: 'unsupported',
      reason: 'unsupported-factor',
      message: 'PARAM9 does not solve target factors inside functions or unsupported carriers.',
    }
    : { kind: 'ok', degree: 0 };
}

function extractFactorEntry(productFactor: ProductFactor, target: string): FactorEntryResult {
  const degree = targetPolynomialDegree(productFactor.node, target, {
    maxDegree: MAX_EXPLICIT_PRODUCT_TARGET_DEGREE,
  });
  if (degree.kind === 'unsupported') {
    return degree;
  }
  if (degree.degree * productFactor.multiplicity > MAX_EXPLICIT_PRODUCT_TARGET_DEGREE) {
    return {
      kind: 'unsupported',
      reason: 'degree-limit',
      message: `Explicit zero-product factorable solving is capped at target degree ${MAX_EXPLICIT_PRODUCT_TARGET_DEGREE}.`,
    };
  }
  return {
    kind: 'factor',
    factor: {
      node: productFactor.node,
      multiplicity: productFactor.multiplicity,
      degree: degree.degree,
      latex: latexForNode(productFactor.node),
    },
  };
}

function targetFreeFactorIsSafeConstant(node: MathJson) {
  const numeric = numericValueForNode(node);
  return numeric !== null && numeric !== 0;
}

function solveFactorBranch(factor: ExplicitFactor, target: string): BranchSolveResult {
  const equationLatex = `${factor.latex}=0`;
  const delegateOptions = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(equationLatex, target, delegateOptions);
  const delegatedFamily = linear.kind === 'success' ? 'linear' : 'polynomial';
  const solved = linear.kind === 'success'
    ? linear
    : solveParameterizedPolynomialEquation(equationLatex, target, delegateOptions);

  if (solved.kind !== 'success') {
    return {
      kind: 'unsupported',
      message: `Unsupported target-containing factor: ${factor.latex}.`,
    };
  }

  const roots = exactRootsFromLatex(solved.exactLatex, target);
  if (!roots) {
    return {
      kind: 'unsupported',
      message: `Could not read selected-target roots from factor ${factor.latex}.`,
    };
  }

  return {
    kind: 'success',
    rootEntry: createFactorDerivedRoot({
      factorLatex: factor.latex,
      factorDegree: factor.degree,
      multiplicity: factor.multiplicity,
      delegatedFamily,
      source: 'equation-parameterized-factorable-polynomial',
      roots,
      facts: factsFromLegacySupplementLatex(solved.exactSupplementLatex, {
        attachment: { scope: 'root-group', ownerId: factor.latex },
      }),
      detailLines: [
        factor.multiplicity > 1
          ? `Factor ${factor.latex}=0 has multiplicity ${factor.multiplicity}.`
          : `Solved factor ${factor.latex}=0.`,
      ],
    }),
  };
}

function buildMergedFactorSolveResult(options: {
  factors: ExplicitFactor[];
  totalDegree: number;
  target: string;
  parameterNames: string[];
  familyLines: string[];
}): ParameterizedFactorablePolynomialSolveResult {
  const rootEntries: EquationFactorDerivedRoot[] = [];
  for (const factor of options.factors) {
    const solved = solveFactorBranch(factor, options.target);
    if (solved.kind === 'unsupported') {
      return stop('unsupported-factor', solved.message, options.target, options.parameterNames);
    }
    rootEntries.push(solved.rootEntry);
  }

  const rootSet = createRootSet({
    target: options.target,
    source: 'equation-parameterized-factorable-polynomial',
    entries: rootEntries,
  });
  const rootReadback = buildCompactRootReadback(rootSet);
  if (rootReadback.kind !== 'visible-exact') {
    return stop(
      'unsupported-factor',
      'Could not read selected-target roots from the factorable polynomial.',
      options.target,
      options.parameterNames,
    );
  }

  const detailSections = buildParameterizedDetailSections({
    target: options.target,
    parameterNames: options.parameterNames,
    familyTitle: 'Parameterized Factorable Polynomial Solve',
    familyLines: options.familyLines,
    extraSections: [{
      title: 'Factor Branches',
      lines: rootReadback.detailLines ?? [],
    }],
  });

  const exactSupplementLatex = normalizeParameterizedSupplementLatex(
    rootReadback.exactSupplementLatex,
  );

  return {
    kind: 'success',
    target: options.target,
    parameterNames: options.parameterNames,
    exactLatex: rootReadback.exactLatex,
    branchReadback: rootReadback.branchReadback,
    exactSupplementLatex,
    detailSections,
  };
}

function solveExplicitZeroProduct(
  productNode: MathJson,
  target: string,
  parameterNames: string[],
): ParameterizedFactorablePolynomialSolveResult | null {
  if (
    !isArrayNode(productNode)
    || (productNode[0] !== 'Multiply' && productNode[0] !== 'InvisibleOperator' && productNode[0] !== 'Power')
  ) {
    return null;
  }

  const decomposed = decomposeExplicitProductFactors(productNode, target);
  if (decomposed.kind === 'unsupported') {
    return stop('unsupported-factor', decomposed.message, target, parameterNames);
  }

  const factors: ExplicitFactor[] = [];
  let totalDegree = 0;

  for (const rawFactor of decomposed.factors) {
    const entry = extractFactorEntry(rawFactor, target);
    if (entry.kind === 'unsupported') {
      return stop(entry.reason, entry.message, target, parameterNames);
    }

    const factor = entry.factor;
    if (factor.degree === 0) {
      if (targetFreeFactorIsSafeConstant(factor.node)) {
        continue;
      }
      return stop(
        'target-free-factor-condition',
        'PARAM9 does not return conditional any-target families from target-free symbolic product factors.',
        target,
        parameterNames,
      );
    }

    if (factor.degree > 2) {
      return stop(
        'unsupported-factor',
        'Explicit PARAM9 factors must delegate to existing linear or quadratic selected-target solvers.',
        target,
        parameterNames,
      );
    }

    totalDegree += factor.degree * factor.multiplicity;
    if (totalDegree > MAX_EXPLICIT_PRODUCT_TARGET_DEGREE) {
      return stop(
        'degree-limit',
        `Explicit zero-product factorable solving is capped at target degree ${MAX_EXPLICIT_PRODUCT_TARGET_DEGREE}.`,
        target,
        parameterNames,
      );
    }
    factors.push(factor);
  }

  if (totalDegree < 3 || factors.length === 0) {
    return null;
  }

  return buildMergedFactorSolveResult({
    target,
    parameterNames,
    factors,
    totalDegree,
    familyLines: [
      `Detected an explicit zero product of degree ${totalDegree} in ${target}.`,
      'Solved each supported target-containing factor and merged duplicate roots.',
    ],
  });
}

function solveSymbolicFactorPattern(
  zeroForm: MathJson,
  target: string,
  parameterNames: string[],
): ParameterizedFactorablePolynomialSolveResult | null {
  const discovered = discoverSymbolicFactorPattern(
    zeroForm,
    target,
    MAX_EXPLICIT_PRODUCT_TARGET_DEGREE,
  );
  if (discovered.kind === 'no-special-form') {
    return null;
  }
  if (discovered.kind === 'unsupported') {
    return stop(discovered.reason, discovered.message, target, parameterNames);
  }

  return buildMergedFactorSolveResult({
    target,
    parameterNames,
    factors: discovered.factors,
    totalDegree: discovered.totalDegree,
    familyLines: discovered.familyLines,
  });
}

function zeroFormNode(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  return simplifyNode(['Subtract', json[1], json[2]] as MathJson);
}

function rawZeroSideNode(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  const [, left, right] = json;
  if (isZeroNode(right)) {
    return left as MathJson;
  }
  if (isZeroNode(left)) {
    return ['Negate', right] as MathJson;
  }
  return null;
}

export function solveParameterizedFactorablePolynomialEquation(
  equationLatex: string,
  target: string,
  options: ParameterizedFactorablePolynomialSolveOptions = {},
): ParameterizedFactorablePolynomialSolveResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized factorable polynomial solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized factorable polynomial solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized factorable polynomial solving.', target, parameterNames);
  }

  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const explicitProduct = explicitProductNodeFromZeroEquation(json);
  if (explicitProduct) {
    const solvedExplicit = solveExplicitZeroProduct(explicitProduct, target, parameterNames);
    if (solvedExplicit) {
      return solvedExplicit;
    }
  }

  const rawZeroSide = rawZeroSideNode(json);
  if (rawZeroSide) {
    const symbolicCommonFactor = solveSymbolicFactorPattern(rawZeroSide, target, parameterNames);
    if (symbolicCommonFactor) {
      return symbolicCommonFactor;
    }
  }

  const exactFactored = solveBoundedPolynomialEquationAst(json, target, {
    maxDegree: MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE,
  });
  if (exactFactored) {
    const rootSet = adaptBoundedPolynomialSolveResultToRootSet(exactFactored, {
      source: 'equation-parameterized-factorable-polynomial',
    });
    const rootReadback = buildCompactRootReadback(rootSet);
    if (rootReadback.kind !== 'visible-exact') {
      return stop(
        'unsupported-expanded-polynomial',
        'Could not render the exact-rational factor roots compactly.',
        target,
        parameterNames,
      );
    }
    const detailSections = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Parameterized Factorable Polynomial Solve',
      familyLines: [
        `Factored an exact-rational degree-${exactFactored.factorization.factors.reduce((sum, factor) => sum + factor.degree * factor.multiplicity, 0)} polynomial in ${target}.`,
        `Factorization strategy: ${exactFactored.factorization.strategy}.`,
      ],
      extraSections: [mathDetailSection('Factorization', [`${exactFactored.factorization.factorizedLatex}=0`])],
    });

    return {
      kind: 'success',
      target,
      parameterNames,
      exactLatex: rootReadback.exactLatex,
      branchReadback: rootReadback.branchReadback,
      detailSections,
    };
  }

  const zeroForm = zeroFormNode(json);
  if (zeroForm) {
    const degree = targetPolynomialDegree(zeroForm, target, {
      maxDegree: MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE,
    });
    if (degree.kind === 'unsupported') {
      return stop(degree.reason, degree.message, target, parameterNames);
    }
    if (degree.degree > MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE) {
      return stop(
        'degree-limit',
        `Parameterized factorable polynomial solving is capped at degree ${MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE}.`,
        target,
        parameterNames,
      );
    }
    if (degree.degree >= 3) {
      return stop(
        'unsupported-expanded-polynomial',
        `PARAM9 supports higher-degree selected-target polynomials only when they are explicit zero products or exact-rational factorable polynomials through degree ${MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE}.`,
        target,
        parameterNames,
      );
    }
  }

  return stop(
    'not-factorable',
    'No PARAM9 factorable polynomial structure was detected.',
    target,
    parameterNames,
  );
}
