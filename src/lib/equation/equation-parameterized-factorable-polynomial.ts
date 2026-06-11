import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback, DisplayDetailSection } from '../../types/calculator';
import { solveBoundedPolynomialEquationAst } from '../algebra/polynomial-factor-solve';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import { finiteBranchReadbackMetadata } from '../display/branch-readback';
import { mathDetailSection } from '../display/result-detail-lines';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';

const ce = new ComputeEngine();
const MAX_FACTORABLE_DEGREE = 4;

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

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
  | { kind: 'success'; roots: string[]; supplements: string[]; detailLines: string[] }
  | { kind: 'unsupported'; message: string };

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function hasTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }

  if (isArrayNode(node)) {
    return node.some((entry) => hasTarget(entry, target));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasTarget(entry, target));
  }

  return false;
}

function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function latexForNode(node: MathJson) {
  return ce.box(simplifyNode(node) as Parameters<typeof ce.box>[0]).latex;
}

function isZeroExpression(node: unknown) {
  if (typeof node === 'number') {
    return Object.is(node, 0);
  }
  const simplified = simplifyNode(node as MathJson);
  return typeof simplified === 'number' && Object.is(simplified, 0);
}

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

function flattenMultiply(node: MathJson): MathJson[] {
  return isArrayNode(node) && node[0] === 'Multiply'
    ? node.slice(1) as MathJson[]
    : [node];
}

function integerExponent(node: unknown) {
  return typeof node === 'number' && Number.isInteger(node) ? node : null;
}

function targetPolynomialDegree(node: MathJson, target: string): DegreeResult {
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
      const child = targetPolynomialDegree(operand as MathJson, target);
      if (child.kind === 'unsupported') {
        return child;
      }
      degree = Math.max(degree, child.degree);
    }
    return { kind: 'ok', degree };
  }

  if (operator === 'Negate') {
    return targetPolynomialDegree(operands[0] as MathJson, target);
  }

  if (operator === 'Multiply') {
    let degree = 0;
    for (const operand of operands) {
      const child = targetPolynomialDegree(operand as MathJson, target);
      if (child.kind === 'unsupported') {
        return child;
      }
      degree += child.degree;
      if (degree > MAX_FACTORABLE_DEGREE) {
        return {
          kind: 'unsupported',
          reason: 'degree-limit',
          message: `Parameterized factorable polynomial solving is capped at degree ${MAX_FACTORABLE_DEGREE}.`,
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
    return targetPolynomialDegree(numerator as MathJson, target);
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
    const baseDegree = targetPolynomialDegree(base as MathJson, target);
    if (baseDegree.kind === 'unsupported') {
      return baseDegree;
    }
    const degree = baseDegree.degree * exponent;
    if (degree > MAX_FACTORABLE_DEGREE) {
      return {
        kind: 'unsupported',
        reason: 'degree-limit',
        message: `Parameterized factorable polynomial solving is capped at degree ${MAX_FACTORABLE_DEGREE}.`,
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

function extractFactorEntry(node: MathJson, target: string): FactorEntryResult {
  if (isArrayNode(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = integerExponent(node[2]);
    if (exponent === null || exponent < 1) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-factor',
        message: 'PARAM9 supports only positive integer powers in explicit zero-product factors.',
      };
    }
    const degree = targetPolynomialDegree(node[1] as MathJson, target);
    if (degree.kind === 'unsupported') {
      return degree;
    }
    if (degree.degree * exponent > MAX_FACTORABLE_DEGREE) {
      return {
        kind: 'unsupported',
        reason: 'degree-limit',
        message: `Parameterized factorable polynomial solving is capped at degree ${MAX_FACTORABLE_DEGREE}.`,
      };
    }
    return {
      kind: 'factor',
      factor: {
        node: node[1] as MathJson,
        multiplicity: exponent,
        degree: degree.degree,
        latex: latexForNode(node[1] as MathJson),
      },
    };
  }

  const degree = targetPolynomialDegree(node, target);
  if (degree.kind === 'unsupported') {
    return degree;
  }
  return {
    kind: 'factor',
    factor: {
      node,
      multiplicity: 1,
      degree: degree.degree,
      latex: latexForNode(node),
    },
  };
}

function targetFreeFactorIsSafeConstant(node: MathJson) {
  const numeric = numericValueForNode(node);
  return numeric !== null && numeric !== 0;
}

function rootsFromExactLatex(exactLatex: string, target: string) {
  const assignmentPrefix = `${target}=`;
  if (exactLatex.startsWith(assignmentPrefix)) {
    return [exactLatex.slice(assignmentPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  const setSuffix = '\\right\\}';
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith(setSuffix)) {
    const content = exactLatex.slice(setPrefix.length, -setSuffix.length);
    return content
      .split(/,\\\s*|,\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return null;
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function solveFactorBranch(factor: ExplicitFactor, target: string): BranchSolveResult {
  const equationLatex = `${factor.latex}=0`;
  const delegateOptions = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(equationLatex, target, delegateOptions);
  const solved = linear.kind === 'success'
    ? linear
    : solveParameterizedPolynomialEquation(equationLatex, target, delegateOptions);

  if (solved.kind !== 'success') {
    return {
      kind: 'unsupported',
      message: `Unsupported target-containing factor: ${factor.latex}.`,
    };
  }

  const roots = rootsFromExactLatex(solved.exactLatex, target);
  if (!roots) {
    return {
      kind: 'unsupported',
      message: `Could not read selected-target roots from factor ${factor.latex}.`,
    };
  }

  return {
    kind: 'success',
    roots,
    supplements: solved.exactSupplementLatex ?? [],
    detailLines: [
      factor.multiplicity > 1
        ? `Factor ${factor.latex}=0 has multiplicity ${factor.multiplicity}.`
        : `Solved factor ${factor.latex}=0.`,
    ],
  };
}

function buildSolutionsLatex(target: string, roots: string[]) {
  const uniqueRoots = dedupe(roots);
  return uniqueRoots.length === 1
    ? `${target}=${uniqueRoots[0]}`
    : `${target}\\in\\left\\{${uniqueRoots.join(',\\ ')}\\right\\}`;
}

function buildSolutionsBranchReadback(target: string, roots: string[]) {
  return finiteBranchReadbackMetadata({
    targetLatex: target,
    branchesLatex: dedupe(roots),
    source: 'equation-parameterized-factorable-polynomial',
  });
}

function solveExplicitZeroProduct(
  productNode: MathJson,
  target: string,
  parameterNames: string[],
): ParameterizedFactorablePolynomialSolveResult | null {
  if (!isArrayNode(productNode) || (productNode[0] !== 'Multiply' && productNode[0] !== 'Power')) {
    return null;
  }

  const rawFactors = flattenMultiply(productNode);
  const factors: ExplicitFactor[] = [];
  let totalDegree = 0;

  for (const rawFactor of rawFactors) {
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
    if (totalDegree > MAX_FACTORABLE_DEGREE) {
      return stop(
        'degree-limit',
        `Parameterized factorable polynomial solving is capped at degree ${MAX_FACTORABLE_DEGREE}.`,
        target,
        parameterNames,
      );
    }
    factors.push(factor);
  }

  if (totalDegree < 3 || factors.length === 0) {
    return null;
  }

  const roots: string[] = [];
  const supplements: string[] = [];
  const branchLines: string[] = [];
  for (const factor of factors) {
    const solved = solveFactorBranch(factor, target);
    if (solved.kind === 'unsupported') {
      return stop('unsupported-factor', solved.message, target, parameterNames);
    }
    roots.push(...solved.roots);
    supplements.push(...solved.supplements);
    branchLines.push(...solved.detailLines);
  }

  const detailSections = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Factorable Polynomial Solve',
    familyLines: [
      `Detected an explicit zero product of degree ${totalDegree} in ${target}.`,
      'Solved each supported target-containing factor and merged duplicate roots.',
    ],
    extraSections: [{
      title: 'Factor Branches',
      lines: branchLines,
    }],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: buildSolutionsLatex(target, roots),
    branchReadback: buildSolutionsBranchReadback(target, roots),
    exactSupplementLatex: normalizeParameterizedSupplementLatex(supplements),
    detailSections,
  };
}

function explicitProductNodeFromEquation(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  if (isZeroExpression(json[2])) {
    return json[1] as MathJson;
  }

  if (isZeroExpression(json[1])) {
    return json[2] as MathJson;
  }

  return null;
}

function zeroFormNode(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  return simplifyNode(['Subtract', json[1], json[2]] as MathJson);
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

  const explicitProduct = explicitProductNodeFromEquation(json);
  if (explicitProduct) {
    const solvedExplicit = solveExplicitZeroProduct(explicitProduct, target, parameterNames);
    if (solvedExplicit) {
      return solvedExplicit;
    }
  }

  const exactFactored = solveBoundedPolynomialEquationAst(json, target);
  if (exactFactored) {
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
      exactLatex: exactFactored.exactLatex,
      branchReadback: finiteBranchReadbackMetadata({
        targetLatex: target,
        branchesLatex: rootsFromExactLatex(exactFactored.exactLatex, target) ?? [],
        source: 'equation-parameterized-factorable-polynomial',
      }),
      detailSections,
    };
  }

  const zeroForm = zeroFormNode(json);
  if (zeroForm) {
    const degree = targetPolynomialDegree(zeroForm, target);
    if (degree.kind === 'unsupported') {
      return stop(degree.reason, degree.message, target, parameterNames);
    }
    if (degree.degree > MAX_FACTORABLE_DEGREE) {
      return stop(
        'degree-limit',
        `Parameterized factorable polynomial solving is capped at degree ${MAX_FACTORABLE_DEGREE}.`,
        target,
        parameterNames,
      );
    }
    if (degree.degree >= 3) {
      return stop(
        'unsupported-expanded-polynomial',
        'PARAM9 supports higher-degree selected-target polynomials only when they are explicit zero products or exact-rational factorable cubics/quartics.',
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
