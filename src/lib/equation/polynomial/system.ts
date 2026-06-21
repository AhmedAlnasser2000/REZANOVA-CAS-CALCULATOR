import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  type BivariateResultantSuccess,
  projectBivariateResultant,
} from '../../algebra/polynomial-bivariate-elimination';
import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToNode,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  type ExactPolynomial,
} from '../../algebra/polynomial-core';
import { solveBoundedPolynomialEquationAst } from '../../algebra/polynomial-factor-solve';
import { normalizeExplicitNamedVariablesInLatex } from '../../algebra/named-variable';
import { storedValueReadbackSections } from '../../algebra/variable-memory';
import { trimHarmlessTrailingMathSpacing } from '../../input/input-canonicalization';
import type { DisplayDetailSection, DisplayOutcome, VariableSubstitutionSnapshot } from '../../../types/calculator';
import {
  errorOutcome,
  pairApproxText,
  pairExactLatex,
  projectionStopOutcome,
} from './system-outcome';
import type {
  CandidatePair,
  CandidateRoot,
  PolynomialSystem2x2Options,
  ProjectionSolveResult,
  ZeroFormResult,
} from './system-types';

const ce = new ComputeEngine();

const DEFAULT_MAX_CANDIDATE_PAIRS = 24;
const DEFAULT_VALIDATION_TOLERANCE = 1e-7;
const FRONTIER_PROJECTED_POLYNOMIAL_MAX_DEGREE = 12;
export type { PolynomialSystem2x2Options } from './system-types';

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function zeroFormFromLatex(latex: string): ZeroFormResult {
  const normalizedLatex = trimHarmlessTrailingMathSpacing(
    normalizeExplicitNamedVariablesInLatex(latex.trim()).latex,
  );
  if (!normalizedLatex) {
    return { kind: 'stop', reason: 'missing-equation' };
  }

  let parsed: unknown;
  try {
    parsed = ce.parse(normalizedLatex).json;
  } catch {
    return { kind: 'stop', reason: 'parse-error' };
  }

  if (isNodeArray(parsed) && parsed[0] === 'Equal') {
    if (parsed.length !== 3) {
      return { kind: 'stop', reason: 'unsupported-relation' };
    }
    const zeroNode = ['Subtract', parsed[1], parsed[2]] as Parameters<typeof ce.box>[0];
    return { kind: 'success', zeroLatex: ce.box(zeroNode).latex, zeroNode };
  }

  if (
    isNodeArray(parsed)
    && typeof parsed[0] === 'string'
    && ['Less', 'LessEqual', 'Greater', 'GreaterEqual', 'NotEqual'].includes(parsed[0])
  ) {
    return { kind: 'stop', reason: 'unsupported-relation' };
  }

  return { kind: 'success', zeroLatex: ce.box(parsed as Parameters<typeof ce.box>[0]).latex, zeroNode: parsed };
}

function solveProjectedPolynomial(projection: BivariateResultantSuccess, variable: 'x' | 'y'): ProjectionSolveResult {
  return solveExactPolynomialRoots(projection.projectedPolynomial, variable, FRONTIER_PROJECTED_POLYNOMIAL_MAX_DEGREE);
}

function nodeContainsSymbol(node: unknown, symbol: string): boolean {
  if (typeof node === 'string') {
    return node === symbol;
  }

  if (Array.isArray(node)) {
    return node.some((entry) => nodeContainsSymbol(entry, symbol));
  }

  if (node && typeof node === 'object') {
    return Object.values(node).some((value) => nodeContainsSymbol(value, symbol));
  }

  return false;
}

function solveExactPolynomialRoots(
  polynomial: ExactPolynomial,
  variable: 'x' | 'y',
  maxDegree = FRONTIER_PROJECTED_POLYNOMIAL_MAX_DEGREE,
): ProjectionSolveResult {
  const degree = exactPolynomialDegree(polynomial);

  if (degree === 1) {
    const root = divideExactScalars(
      negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
      getExactPolynomialCoefficient(polynomial, 1),
    );
    if (!root) {
      return { kind: 'stop', reason: 'projection-roots-unavailable' };
    }
    const node = buildExactScalarNode(root);
    return {
      kind: 'success',
      roots: [{
        latex: nodeLatex(node),
        numeric: exactScalarToNumber(root),
        node,
      }],
    };
  }

  if (degree === 2) {
    return solveQuadraticExactPolynomial(polynomial);
  }

  const solved = solveBoundedPolynomialEquationAst(
    ['Equal', exactPolynomialToNode(polynomial), 0],
    variable,
    { maxDegree },
  );
  if (!solved || solved.exactSolutions.length !== solved.approxSolutions.length) {
    return { kind: 'stop', reason: 'projection-roots-unavailable' };
  }

  return {
    kind: 'success',
    roots: solved.exactSolutions.map((latex, index) => {
      let node: unknown;
      try {
        node = ce.parse(latex).json;
      } catch {
        node = ['Error', latex];
      }
      return {
        latex,
        numeric: solved.approxSolutions[index],
        node,
      };
    }),
  };
}

function nodeLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function simplifyNode(node: unknown) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json;
  } catch {
    return node;
  }
}

function solveQuadraticExactPolynomial(polynomial: ExactPolynomial): ProjectionSolveResult {
  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return { kind: 'stop', reason: 'projection-roots-unavailable' };
  }
  const discriminantValue = exactScalarToNumber(discriminant);
  if (discriminantValue < -DEFAULT_VALIDATION_TOLERANCE) {
    return { kind: 'success', roots: [] };
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const denominator = multiplyExactScalars({ numerator: 2, denominator: 1 }, a);
  const negativeBNode = buildExactScalarNode(negateExactScalar(b));
  const denominatorNode = buildExactScalarNode(denominator);

  if (Math.abs(discriminantValue) <= DEFAULT_VALIDATION_TOLERANCE) {
    const root = divideExactScalars(negateExactScalar(b), denominator);
    if (!root) {
      return { kind: 'stop', reason: 'projection-roots-unavailable' };
    }
    const node = buildExactScalarNode(root);
    return {
      kind: 'success',
      roots: [{
        latex: nodeLatex(node),
        numeric: exactScalarToNumber(root),
        node,
      }],
    };
  }

  const sqrtNode = ['Sqrt', buildExactScalarNode(discriminant)];
  const roots = [
    ['Divide', ['Subtract', negativeBNode, sqrtNode], denominatorNode],
    ['Divide', ['Add', negativeBNode, sqrtNode], denominatorNode],
  ];

  return {
    kind: 'success',
    roots: roots.map((rootNode) => {
      const simplified = simplifyNode(rootNode);
      const numeric = numericValueForNode(simplified);
      if (numeric === null) {
        return null;
      }
      return {
        latex: nodeLatex(simplified),
        numeric,
        node: simplified,
      };
    }).filter((root): root is CandidateRoot => root !== null),
  };
}

function substituteSymbolNode(node: unknown, symbol: string, replacement: unknown): unknown {
  if (typeof node === 'string') {
    return node === symbol ? replacement : node;
  }

  if (Array.isArray(node)) {
    return node.map((entry) => substituteSymbolNode(entry, symbol, replacement));
  }

  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, substituteSymbolNode(value, symbol, replacement)]),
    );
  }

  return node;
}

function solveEliminatedRootsForRetainedRoot(
  retainedRoot: CandidateRoot,
  zeroNodes: readonly [unknown, unknown],
): ProjectionSolveResult {
  for (const zeroNode of zeroNodes) {
    const substituted = simplifyNode(substituteSymbolNode(zeroNode, 'x', retainedRoot.node));
    const polynomial = parseExactPolynomial(substituted, 'y', FRONTIER_PROJECTED_POLYNOMIAL_MAX_DEGREE);
    if (!polynomial) {
      return { kind: 'stop', reason: 'projection-roots-unavailable' };
    }

    if (exactPolynomialDegree(polynomial) === 0) {
      if (exactPolynomialIsZero(polynomial)) {
        continue;
      }
      return { kind: 'success', roots: [] };
    }

    return solveExactPolynomialRoots(polynomial, 'y');
  }

  return { kind: 'success', roots: [] };
}

function substituteNumericPair(node: unknown, pair: CandidatePair): unknown {
  if (typeof node === 'string') {
    if (node === 'x') {
      return pair.x.numeric;
    }
    if (node === 'y') {
      return pair.y.numeric;
    }
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((entry) => substituteNumericPair(entry, pair));
  }

  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, substituteNumericPair(value, pair)]),
    );
  }

  return node;
}

function numericValueForNode(node: unknown): number | null {
  try {
    const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const json = numeric.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (typeof json === 'object' && json !== null && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

function parseValidationZeroNodes(leftLatex: string, rightLatex: string): readonly [unknown, unknown] | null {
  try {
    return [
      ce.parse(leftLatex).json,
      ce.parse(rightLatex).json,
    ];
  } catch {
    return null;
  }
}

function validatesPair(pair: CandidatePair, zeroNodes: readonly [unknown, unknown], tolerance: number) {
  return zeroNodes.every((node) => {
    const numeric = numericValueForNode(substituteNumericPair(node, pair));
    return numeric !== null && Math.abs(numeric) <= tolerance;
  });
}

function pairKey(pair: CandidatePair) {
  return `${pair.x.numeric.toFixed(10)}:${pair.y.numeric.toFixed(10)}`;
}

function pairSort(left: CandidatePair, right: CandidatePair) {
  if (Math.abs(left.x.numeric - right.x.numeric) > DEFAULT_VALIDATION_TOLERANCE) {
    return left.x.numeric - right.x.numeric;
  }
  return left.y.numeric - right.y.numeric;
}

function candidatePairs(xRoots: readonly CandidateRoot[], yRoots: readonly CandidateRoot[]) {
  const pairs: CandidatePair[] = [];
  for (const x of xRoots) {
    for (const y of yRoots) {
      pairs.push({ x, y });
    }
  }
  return pairs;
}

function uniqueValidatedPairs(pairs: readonly CandidatePair[]) {
  const byKey = new Map<string, CandidatePair>();
  for (const pair of pairs.slice().sort(pairSort)) {
    byKey.set(pairKey(pair), pair);
  }
  return [...byKey.values()].sort(pairSort);
}

function combineSubstitutions(
  ...groups: Array<readonly VariableSubstitutionSnapshot[]>
) {
  const byName = new Map<string, VariableSubstitutionSnapshot>();
  for (const group of groups) {
    for (const entry of group) {
      byName.set(entry.name, entry);
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function buildBivariateOptions(options: PolynomialSystem2x2Options) {
  return {
    maxRetainedDegree: FRONTIER_PROJECTED_POLYNOMIAL_MAX_DEGREE,
    ...options.bivariateOptions,
    storedVariables: options.storedVariables,
  };
}

export function solvePolynomialSystem2x2(
  equations: readonly [string, string],
  options: PolynomialSystem2x2Options = {},
): DisplayOutcome {
  const zeroForms = equations.map(zeroFormFromLatex) as [ZeroFormResult, ZeroFormResult];
  const firstStop = zeroForms.find((entry): entry is Extract<ZeroFormResult, { kind: 'stop' }> =>
    entry.kind === 'stop');
  if (firstStop) {
    return errorOutcome(firstStop.reason);
  }

  const [leftZero, rightZero] = zeroForms as [
    Extract<ZeroFormResult, { kind: 'success' }>,
    Extract<ZeroFormResult, { kind: 'success' }>,
  ];
  const missingSystemVariables = (['x', 'y'] as const).filter((symbol) =>
    !zeroForms.some((entry) =>
      entry.kind === 'success' && nodeContainsSymbol(entry.zeroNode, symbol)),
  );
  if (missingSystemVariables.length > 0) {
    return errorOutcome('missing-system-variable', {
      symbols: missingSystemVariables,
      detailSections: [{
        title: 'Polynomial System',
        lines: [
          'Use two equations in the fixed variables x and y.',
          'For curve intersections, write equations like y=x^2+4x and y=1+5x.',
        ],
      }],
    });
  }
  const bivariateOptions = buildBivariateOptions(options);
  const xProjection = projectBivariateResultant(leftZero.zeroLatex, rightZero.zeroLatex, 'x', 'y', bivariateOptions);
  if (xProjection.kind === 'stop') {
    return projectionStopOutcome(xProjection);
  }

  const yProjection = projectBivariateResultant(leftZero.zeroLatex, rightZero.zeroLatex, 'y', 'x', bivariateOptions);

  const xRoots = solveProjectedPolynomial(xProjection, 'x');
  if (xRoots.kind === 'stop') {
    return errorOutcome(xRoots.reason);
  }
  if (xRoots.roots.length === 0) {
    return errorOutcome('no-real-roots');
  }

  const validationZeroNodes = parseValidationZeroNodes(
    xProjection.substitutedLeftLatex,
    xProjection.substitutedRightLatex,
  );
  if (!validationZeroNodes) {
    return errorOutcome('parse-error');
  }
  const pairs: CandidatePair[] = [];
  for (const xRoot of xRoots.roots) {
    const yRoots = solveEliminatedRootsForRetainedRoot(xRoot, validationZeroNodes);
    if (yRoots.kind === 'stop') {
      return errorOutcome(yRoots.reason);
    }
    pairs.push(...candidatePairs([xRoot], yRoots.roots));
  }
  if (pairs.length === 0) {
    return errorOutcome('no-real-roots');
  }
  const maxCandidatePairs = options.maxCandidatePairs ?? DEFAULT_MAX_CANDIDATE_PAIRS;
  if (pairs.length > maxCandidatePairs) {
    return errorOutcome('candidate-limit', {
      detailSections: [{
        title: 'Candidate Check',
        lines: [`Projected roots produced ${pairs.length} candidate pairs; cap is ${maxCandidatePairs}.`],
      }],
    });
  }

  const validationTolerance = options.validationTolerance ?? DEFAULT_VALIDATION_TOLERANCE;
  const validated = uniqueValidatedPairs(
    pairs.filter((pair) =>
      validatesPair(pair, validationZeroNodes, validationTolerance)),
  );
  const rejectedCandidateCount = pairs.length - validated.length;
  if (validated.length === 0) {
    return errorOutcome('no-validated-pairs', {
      rejectedCandidateCount,
      detailSections: [{
        title: 'Candidate Check',
        lines: [`Checked ${pairs.length} candidate pairs; none validated in both equations.`],
      }],
    });
  }

  const substitutions = combineSubstitutions(
    xProjection.substitutions,
    yProjection.kind === 'success' ? yProjection.substitutions : [],
  );
  const protectedSubstitutions = combineSubstitutions(
    xProjection.protectedSubstitutions,
    yProjection.kind === 'success' ? yProjection.protectedSubstitutions : [],
  );
  const effectiveLatex = `${xProjection.substitutedLeftLatex}=0; ${xProjection.substitutedRightLatex}=0`;
  const detailSections: DisplayDetailSection[] = [
    ...storedValueReadbackSections({
      substitutions,
      protectedSubstitutions,
      protectedNameDescriptions: {
        x: 'a polynomial-system variable',
        y: 'a polynomial-system variable',
      },
      originalLatex: `${equations[0]}; ${equations[1]}`,
      effectiveLatex,
      effectiveLabel: 'Effective system',
    }),
    {
      title: 'Polynomial System',
      lines: [
        'Variables: x, y.',
        `Equation 1 zero form: ${xProjection.substitutedLeftLatex}=0.`,
        `Equation 2 zero form: ${xProjection.substitutedRightLatex}=0.`,
      ],
    },
    {
      title: 'Resultant Projection',
      lines: [
        `Eliminated y to project onto x: ${xProjection.projectedLatex}=0.`,
        yProjection.kind === 'success'
          ? `Eliminated x to project onto y: ${yProjection.projectedLatex}=0.`
          : `Direct y projection stopped at ${yProjection.reason}; y roots were recovered by back-substitution.`,
        yProjection.kind === 'success'
          ? `Sylvester dimensions: ${xProjection.sylvesterDimension} and ${yProjection.sylvesterDimension}.`
          : `Sylvester dimension: ${xProjection.sylvesterDimension}.`,
      ],
    },
    {
      title: 'Candidate Check',
      lines: [
        `Checked ${pairs.length} candidate pairs; accepted ${validated.length} and rejected ${rejectedCandidateCount}.`,
      ],
    },
  ];

  return {
    kind: 'success',
    title: 'Polynomial 2x2',
    exactLatex: `\\left(x,y\\right)\\in\\left\\{${validated.map(pairExactLatex).join(',\\ ')}\\right\\}`,
    approxText: validated.map(pairApproxText).join('; '),
    warnings: [],
    resultOrigin: 'rule-based-symbolic',
    detailSections,
    variableSubstitutions: substitutions.length > 0 ? substitutions : undefined,
    rejectedCandidateCount,
  };
}
