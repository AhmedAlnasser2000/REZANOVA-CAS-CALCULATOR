import { formatApproxNumber, solutionsToLatex } from '../../display/format';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  getExactPolynomialCoefficient,
  negateExactScalar,
  parseExactPolynomial,
} from '../polynomial-core';
import { factorBoundedPolynomial } from './factorization';
import {
  collectPolynomialSymbols,
  containsPolynomialVariable,
  isNodeArray,
  nodeLatex,
  numericValueForNode,
  simplifyNode,
  sortAndDedupeApprox,
} from './math-json';
import { quadraticRootNodes } from './quadratic';
import {
  ROOT_TOLERANCE,
  type BoundedPolynomialFactor,
  type BoundedPolynomialFactorOptions,
  type BoundedPolynomialSolveResult,
  type QuadraticExactRoots,
  type RecognizedPolynomialEquation,
} from './types';
import { profileSharedAlgebraResult } from '../../display/printer';

export function recognizeBoundedPolynomialEquationAst(
  node: unknown,
  variable = 'x',
  options: BoundedPolynomialFactorOptions = {},
): RecognizedPolynomialEquation | null {
  const maxDegree = options.maxDegree ?? 4;
  const normalized = normalizeAst(node);
  const zeroForm = isNodeArray(normalized) && normalized[0] === 'Equal' && normalized.length === 3
    ? normalizeAst(['Subtract', normalized[1], normalized[2]])
    : normalized;
  const polynomial = parseExactPolynomial(zeroForm, variable, maxDegree);
  if (!polynomial) {
    return null;
  }
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 3 || degree > maxDegree) {
    return null;
  }

  return {
    variable,
    polynomial,
  };
}

function quadraticRootsFromFactor(
  factor: BoundedPolynomialFactor,
  variable: string,
): QuadraticExactRoots {
  const polynomial = parseExactPolynomial(normalizeAst(factor.node), variable, 2);
  if (polynomial && exactPolynomialDegree(polynomial) === 2) {
    return quadraticRootNodes(polynomial);
  }

  const normalized = normalizeAst(factor.node);
  if (
    isNodeArray(normalized)
    && normalized[0] === 'Power'
    && normalized.length === 3
    && normalized[1] === variable
    && normalized[2] === 2
  ) {
    return {
      kind: 'real',
      roots: [{ node: 0, latex: '0', numeric: 0 }],
    };
  }

  const terms = isNodeArray(normalized) && normalized[0] === 'Add' ? normalized.slice(1) : [normalized];
  const squareTerms = terms.filter((term) =>
    isNodeArray(term)
    && term[0] === 'Power'
    && term.length === 3
    && term[1] === variable
    && term[2] === 2);
  if (squareTerms.length !== 1) {
    return { kind: 'complex' };
  }

  const otherTerms = terms.filter((term) => term !== squareTerms[0]);
  if (otherTerms.some((term) => containsPolynomialVariable(term, variable))) {
    return { kind: 'complex' };
  }

  const constantNode = otherTerms.length === 0
    ? 0
    : simplifyNode(otherTerms.length === 1 ? otherTerms[0] : ['Add', ...otherTerms]);
  const targetNode = simplifyNode(['Negate', constantNode]);

  const targetValue = numericValueForNode(targetNode);
  if (targetValue === null || targetValue < -ROOT_TOLERANCE) {
    return { kind: 'complex' };
  }

  if (Math.abs(targetValue) <= ROOT_TOLERANCE) {
    return {
      kind: 'real',
      roots: [{ node: 0, latex: '0', numeric: 0 }],
    };
  }

  const positive = simplifyNode(['Sqrt', targetNode]);
  const negative = simplifyNode(['Negate', positive]);
  const positiveNumeric = numericValueForNode(positive);
  const negativeNumeric = numericValueForNode(negative);
  if (positiveNumeric === null || negativeNumeric === null) {
    return { kind: 'complex' };
  }

  return {
    kind: 'real',
    roots: [
      { node: positive, latex: nodeLatex(positive), numeric: positiveNumeric },
      { node: negative, latex: nodeLatex(negative), numeric: negativeNumeric },
    ],
  };
}

export function solveBoundedPolynomialEquationAst(
  node: unknown,
  variable = 'x',
  options: BoundedPolynomialFactorOptions = {},
): BoundedPolynomialSolveResult | null {
  const recognized = recognizeBoundedPolynomialEquationAst(node, variable, options);
  if (!recognized) {
    return null;
  }

  const factorization = factorBoundedPolynomial(recognized.polynomial, options);
  if (!factorization) {
    return null;
  }

  const roots: Array<{ latex: string; numeric: number; node?: unknown }> = [];

  for (const factor of factorization.factors) {
    if (factor.degree === 1) {
      const normalized = normalizeAst(factor.node);
      const polynomial = parseExactPolynomial(normalized, variable, 1);
      if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
        return null;
      }
      const root = divideExactScalars(
        negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
        getExactPolynomialCoefficient(polynomial, 1),
      );
      if (!root) {
        return null;
      }
      const rootNode = simplifyNode(buildExactScalarNode(root));
      const numeric = numericValueForNode(rootNode);
      if (numeric === null) {
        return null;
      }
      roots.push({ latex: nodeLatex(rootNode), numeric, node: rootNode });
      continue;
    }

    if (factor.degree === 2) {
      const quadraticRoots = quadraticRootsFromFactor(factor, variable);
      if (quadraticRoots.kind !== 'real') {
        continue;
      }
      roots.push(...quadraticRoots.roots.map((root) => ({
        latex: root.latex,
        numeric: root.numeric,
        node: root.node,
      })));
      continue;
    }

    return null;
  }

  if (roots.length === 0) {
    return null;
  }

  const uniqueApproximations = sortAndDedupeApprox(roots.map((root) => root.numeric));
  const uniqueRoots = roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ROOT_TOLERANCE)
    .map((root) => ({
      latex: root.latex,
      numeric: root.numeric,
      ...(root.node !== undefined ? { node: root.node } : {}),
    }));
  const exactSolutions = uniqueRoots.map((root) => root.latex);

  return profileSharedAlgebraResult({
    variable,
    exactLatex: solutionsToLatex(variable, exactSolutions),
    approxText: uniqueApproximations.length === 1
      ? `${variable} ~= ${formatApproxNumber(uniqueApproximations[0])}`
      : `${variable} ~= ${uniqueApproximations.map((value) => formatApproxNumber(value)).join(', ')}`,
    exactSolutions,
    exactSolutionBranches: uniqueRoots,
    approxSolutions: uniqueApproximations,
    factorization,
  });
}

export function factorBoundedPolynomialAst(
  ast: unknown,
  variable?: string,
  options: BoundedPolynomialFactorOptions = {},
) {
  const maxDegree = options.maxDegree ?? 4;
  const normalized = normalizeAst(ast);
  const resolvedVariable = variable
    ?? (() => {
      const symbols = [...collectPolynomialSymbols(normalized)].filter((symbol) => symbol !== 'Pi' && symbol !== 'ExponentialE');
      return symbols.length === 1 ? symbols[0] : null;
    })();
  if (!resolvedVariable) {
    return null;
  }

  const polynomial = parseExactPolynomial(normalized, resolvedVariable, maxDegree);
  if (!polynomial) {
    return null;
  }
  const degree = exactPolynomialDegree(polynomial);
  if (degree < 3 || degree > maxDegree) {
    return null;
  }

  return factorBoundedPolynomial(polynomial, options);
}
