import type { HistoryReplayWorkspace } from '../history-replay/fixture-contract';

export const CANONICAL_MATH_LEAF_PATHS = [
  'primaryMath',
  'answerRows.rows[*].math',
  'branchReadback.target',
  'branchReadback.branches[*]',
  'systemReadback.variables[*]',
  'systemReadback.rows[*].values[*]',
  'periodicFamily.carrier',
  'periodicFamily.parameter',
  'periodicFamily.parameterConstraints[*]',
  'periodicFamily.branches[*]',
  'periodicFamily.discoveredFamilies[*]',
  'periodicFamily.representatives[*].exact',
  'periodicFamily.suggestedIntervals[*].start',
  'periodicFamily.suggestedIntervals[*].end',
  'periodicFamily.piecewiseBranches[*].condition',
  'periodicFamily.piecewiseBranches[*].result',
  'periodicFamily.principalRange',
  'periodicFamily.reducedCarrier',
  'supplements[*]',
  'details[*].lines[*][*].math',
  'summaries.solve[*][*].math',
  'summaries.transform.math',
  'metadata.resolvedInput',
  'metadata.variableSubstitutions[*].value',
  'table.rows[*].x',
  'table.rows[*].primary',
  'table.rows[*].secondary',
] as const;

export type CanonicalMathLeafPath = typeof CANONICAL_MATH_LEAF_PATHS[number];

export type MathJsonRoutePolicy = {
  owner: HistoryReplayWorkspace;
  probeFixtureIds: readonly [string, ...string[]];
  leafPolicy: 'required-when-present';
};

const route = (
  owner: HistoryReplayWorkspace,
  ...probeFixtureIds: [string, ...string[]]
): MathJsonRoutePolicy => ({ owner, probeFixtureIds, leafPolicy: 'required-when-present' });

export const MATHJSON_ROUTE_REGISTRY = {
  'calculate.arithmetic': route('calculate', 'calculate-arithmetic-add'),
  'calculate.exact-forms': route('calculate', 'calculate-exact-radical'),
  'calculate.trigonometry': route('calculate', 'calculate-trig-sine-deg'),
  'calculate.inverse-trigonometry': route('calculate', 'calculate-inverse-sine-deg'),
  'calculate.transforms': route('calculate', 'calculate-simplify-like-terms'),
  'calculate.ans': route('calculate', 'calculate-ans-addition'),
  'calculate.numeric-format': route('calculate', 'calculate-decimal-output'),
  'equation.linear': route('equation', 'equation-linear-basic'),
  'equation.polynomial': route('equation', 'equation-quadratic-factor'),
  'equation.rational-radical': route('equation', 'equation-rational-simple'),
  'equation.absolute-value': route('equation', 'equation-absolute-basic'),
  'equation.trig-exp-log': route('equation', 'equation-trig-sine'),
  'equation.domain-boundary': route('equation', 'equation-real-no-solution'),
  'equation.answer-mode': route('equation', 'equation-isolate-mode'),
  'equation.numeric-boundary': route('equation', 'equation-numeric-interval'),
  'calculus.derivatives': route('calculus', 'calculus-derivative-polynomial'),
  'calculus.integrals': route('calculus', 'calculus-indefinite-power'),
  'calculus.limits': route('calculus', 'calculus-finite-sinc'),
  'calculus.series-transforms': route('calculus', 'calculus-maclaurin-exp'),
  'calculus.partials': route('calculus', 'calculus-partial-polynomial'),
  'calculus.ode-ivp': route('calculus', 'calculus-ode-separable'),
  'trigonometry.function': route('trigonometry', 'trigonometry-function'),
  'trigonometry.identity': route('trigonometry', 'trigonometry-identity'),
  'trigonometry.equation': route('trigonometry', 'trigonometry-equation'),
  'trigonometry.right-triangle': route('trigonometry', 'trigonometry-triangle'),
  'trigonometry.angle-conversion': route('trigonometry', 'trigonometry-convert'),
  'geometry.shape-2d': route('geometry', 'geometry-square'),
  'geometry.coordinate-distance': route('geometry', 'geometry-distance'),
  'geometry.circle': route('geometry', 'geometry-circle'),
  'geometry.triangle': route('geometry', 'geometry-triangle'),
  'geometry.line-equation': route('geometry', 'geometry-line'),
  'statistics.descriptive': route('statistics', 'statistics-descriptive'),
  'statistics.frequency': route('statistics', 'statistics-frequency'),
  'statistics.probability': route('statistics', 'statistics-binomial'),
  'statistics.relationship': route('statistics', 'statistics-regression'),
  'statistics.inference': route('statistics', 'statistics-mean-inference'),
  'matrix.matrix-arithmetic': route('matrix', 'matrix-add'),
  'matrix.determinant': route('matrix', 'matrix-determinant'),
  'matrix.inverse': route('matrix', 'matrix-inverse'),
  'matrix.rank': route('matrix', 'matrix-rank'),
  'matrix.linear-system': route('matrix', 'matrix-linear-system'),
  'vector.dot-product': route('vector', 'vector-dot'),
  'vector.cross-product': route('vector', 'vector-cross'),
  'vector.norm': route('vector', 'vector-norm'),
  'vector.angle': route('vector', 'vector-angle'),
  'vector.orthogonalization': route('vector', 'vector-gram-schmidt'),
  'table.single-function': route('table', 'table-polynomial'),
  'table.two-functions': route('table', 'table-two-functions'),
  'table.domain-boundary': route('table', 'table-partial-domain'),
  'table.rational-function': route('table', 'table-reciprocal'),
  'table.trigonometric-function': route('table', 'table-trigonometric'),
} as const satisfies Record<string, MathJsonRoutePolicy>;

export type MathJsonRouteId = keyof typeof MATHJSON_ROUTE_REGISTRY;

export type MathJsonCoverageExemption = {
  id: string;
  routeId: MathJsonRouteId;
  leafPath: CanonicalMathLeafPath;
  fixtureId: string;
  owner: HistoryReplayWorkspace;
  reason: 'standard-mathjson-unrepresentable' | 'committed-bound-exceeded';
  rationale: string;
};

export const MATHJSON_COVERAGE_EXEMPTIONS: readonly MathJsonCoverageExemption[] = [];
