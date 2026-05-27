import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  type BivariateResultantOptions,
  type BivariateResultantStop,
  type BivariateResultantSuccess,
  projectBivariateResultant,
} from '../algebra/polynomial-bivariate-elimination';
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
} from '../algebra/polynomial-core';
import { solveBoundedPolynomialEquationAst } from '../algebra/polynomial-factor-solve';
import { normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
import { storedValueReadbackSections } from '../algebra/variable-memory';
import { formatApproxNumber } from '../display/format';
import { trimHarmlessTrailingMathSpacing } from '../input/input-canonicalization';
import type {
  DisplayDetailSection,
  DisplayOutcome,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

const ce = new ComputeEngine();

const DEFAULT_MAX_CANDIDATE_PAIRS = 24;
const DEFAULT_VALIDATION_TOLERANCE = 1e-7;

type CandidateRoot = {
  latex: string;
  numeric: number;
  node: unknown;
};

type CandidatePair = {
  x: CandidateRoot;
  y: CandidateRoot;
};

type ZeroFormResult =
  | { kind: 'success'; zeroLatex: string; zeroNode: unknown }
  | { kind: 'stop'; reason: 'missing-equation' | 'parse-error' | 'unsupported-relation' };

type ProjectionSolveResult =
  | { kind: 'success'; roots: CandidateRoot[] }
  | { kind: 'stop'; reason: 'projection-roots-unavailable' };

type ZeroFormStopReason = Extract<ZeroFormResult, { kind: 'stop' }>['reason'];

type SolveStopReason =
  | ZeroFormStopReason
  | BivariateResultantStop['reason']
  | 'constant-resultant-no-solution'
  | 'missing-system-variable'
  | 'projection-roots-unavailable'
  | 'candidate-limit'
  | 'no-real-roots'
  | 'no-validated-pairs';

export type PolynomialSystem2x2Options = {
  storedVariables?: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  bivariateOptions?: Omit<BivariateResultantOptions, 'storedVariables'>;
  maxCandidatePairs?: number;
  validationTolerance?: number;
};

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
  return solveExactPolynomialRoots(projection.projectedPolynomial, variable);
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

function solveExactPolynomialRoots(polynomial: ExactPolynomial, variable: 'x' | 'y'): ProjectionSolveResult {
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
    const polynomial = parseExactPolynomial(substituted, 'y', 4);
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

function stopMessage(reason: SolveStopReason, symbols?: readonly string[]) {
  switch (reason) {
    case 'missing-equation':
      return 'Enter both polynomial equations before solving the system.';
    case 'parse-error':
      return 'One equation could not be parsed. Check the syntax and try again.';
    case 'unsupported-relation':
      return 'Polynomial 2x2 accepts equalities only. Inequalities are not part of this solver yet.';
    case 'missing-system-variable':
      return `Polynomial 2x2 needs equations that relate both x and y. ${
        symbols && symbols.length > 0
          ? `Your input is missing ${symbols.join(' and ')}.`
          : 'One system variable is missing.'
      }`;
    case 'unsupported-symbolic-parameter':
      return `Only x and y may stay symbolic in this solver. ${
        symbols && symbols.length > 0
          ? `Store numeric values for ${symbols.join(', ')} or remove them.`
          : 'Store numeric values for extra symbols or remove them.'
      }`;
    case 'non-polynomial-input':
      return 'Both equations must be polynomial in x and y after stored numeric constants are applied.';
    case 'degree-limit':
      return 'Projection stopped because the polynomial degree exceeded the bounded resultant cap.';
    case 'term-limit':
      return 'Projection stopped because the expanded polynomial exceeded the term cap.';
    case 'scalar-growth-limit':
    case 'stored-constant-unsafe':
      return 'Projection stopped because coefficients grew beyond the safe exact-arithmetic cap.';
    case 'zero-polynomial':
    case 'constant-polynomial':
    case 'projection-ambiguity':
      return 'Projection did not produce a unique finite polynomial system to solve.';
    case 'constant-resultant-no-solution':
      return 'The equations are inconsistent after projection; no real solution pairs were found.';
    case 'sylvester-dimension-limit':
      return 'Projection stopped because the Sylvester matrix exceeded the bounded dimension cap.';
    case 'projection-roots-unavailable':
      return 'The projected polynomial could not be solved by the bounded real factor solver.';
    case 'candidate-limit':
      return 'The projected roots produced too many candidate pairs for this bounded solver.';
    case 'no-real-roots':
      return 'The projected system did not produce real roots for both variables.';
    case 'no-validated-pairs':
      return 'Projection produced candidates, but none validated in both original equations.';
    default:
      return 'The polynomial system solver stopped before producing a bounded result.';
  }
}

function errorOutcome(
  reason: SolveStopReason,
  extra: {
    symbols?: readonly string[];
    detailSections?: DisplayDetailSection[];
    rejectedCandidateCount?: number;
  } = {},
): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Polynomial 2x2',
    error: stopMessage(reason, extra.symbols),
    warnings: [],
    detailSections: extra.detailSections,
    rejectedCandidateCount: extra.rejectedCandidateCount,
  };
}

function projectionStopOutcome(projection: BivariateResultantStop): DisplayOutcome {
  if (projection.reason === 'constant-polynomial' && projection.constantContext === 'resultant') {
    return errorOutcome('constant-resultant-no-solution', {
      detailSections: [{
        title: 'Resultant Projection',
        lines: [
          'Eliminating a system variable reduced the equations to a nonzero constant.',
          'That means the equations contradict each other, so no x/y pair can satisfy both.',
        ],
      }],
    });
  }

  return errorOutcome(projection.reason, { symbols: projection.symbols });
}

function pairExactLatex(pair: CandidatePair) {
  return `\\left(${pair.x.latex},${pair.y.latex}\\right)`;
}

function pairApproxText(pair: CandidatePair) {
  return `(x, y) ~= (${formatApproxNumber(pair.x.numeric)}, ${formatApproxNumber(pair.y.numeric)})`;
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
  const bivariateOptions = {
    ...options.bivariateOptions,
    storedVariables: options.storedVariables,
  };
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
