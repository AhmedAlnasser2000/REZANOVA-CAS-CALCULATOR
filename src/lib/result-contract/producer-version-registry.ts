import {
  MATHJSON_ROUTE_REGISTRY,
  type MathJsonRouteId,
} from './mathjson-route-registry';

export type CanonicalResultProducerVersion = 1 | 2 | 3 | 4;

export type CanonicalResultProducerVersionPolicy = {
  defaultVersion: CanonicalResultProducerVersion;
  selectorVersions: Readonly<Record<string, CanonicalResultProducerVersion>>;
};

export const FROZEN_V1_PRODUCER_ROUTE_IDS = [
  'calculate.arithmetic',
  'calculate.exact-forms',
  'calculate.trigonometry',
  'calculate.inverse-trigonometry',
  'calculate.transforms',
  'calculate.ans',
  'calculate.numeric-format',
  'calculate.derivatives',
  'calculate.integrals',
  'calculate.limits',
  'equation.linear',
  'equation.polynomial',
  'equation.rational-radical',
  'equation.absolute-value',
  'equation.trig-exp-log',
  'equation.domain-boundary',
  'equation.answer-mode',
  'equation.numeric-boundary',
  'calculus.derivatives',
  'calculus.integrals',
  'calculus.limits',
  'calculus.series-transforms',
  'calculus.partials',
  'calculus.ode-ivp',
  'trigonometry.function',
  'trigonometry.identity',
  'trigonometry.equation',
  'trigonometry.right-triangle',
  'trigonometry.angle-conversion',
  'trigonometry.period-phase',
  'geometry.shape-2d',
  'geometry.coordinate-distance',
  'geometry.circle',
  'geometry.triangle',
  'geometry.line-equation',
  'statistics.descriptive',
  'statistics.frequency',
  'statistics.probability',
  'statistics.relationship',
  'statistics.inference',
  'matrix.matrix-arithmetic',
  'matrix.determinant',
  'matrix.inverse',
  'matrix.rank',
  'matrix.linear-system',
  'matrix.profile',
  'vector.dot-product',
  'vector.cross-product',
  'vector.norm',
  'vector.angle',
  'vector.orthogonalization',
  'vector.span-independence',
  'table.single-function',
  'table.two-functions',
  'table.domain-boundary',
  'table.rational-function',
  'table.trigonometric-function',
] as const satisfies readonly MathJsonRouteId[];

const frozenV1Routes = new Set<string>(FROZEN_V1_PRODUCER_ROUTE_IDS);

// Producer gates may add only the route defaults and selector overrides
// approved by a canonical-result milestone.
export const CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES = (
  [
    'trigonometry.angle-conversion',
    'trigonometry.period-phase',
    'table.domain-boundary',
    'table.rational-function',
    'statistics.descriptive',
    'statistics.frequency',
    'statistics.probability',
    'statistics.relationship',
    'statistics.inference',
    'matrix.matrix-arithmetic',
    'matrix.determinant',
    'matrix.inverse',
    'matrix.rank',
    'matrix.linear-system',
    'matrix.profile',
    'matrix.definiteness',
    'matrix.numeric-decomposition',
    'vector.dot-product',
    'vector.cross-product',
    'vector.norm',
    'vector.angle',
    'vector.orthogonalization',
    'vector.span-independence',
    'vector.geometric-measures',
  ] as const satisfies readonly MathJsonRouteId[]
);

export const CANONICAL_RESULT_V2_PRODUCER_SELECTORS = (
  {
    'calculus.derivatives': ['derivativePoint'],
    'calculus.integrals': ['indefiniteIntegral:standard', 'indefiniteIntegral:error'],
    'equation.domain-boundary': ['typedLabeledSupplement'],
    'equation.rational-radical': ['typedLabeledSupplement'],
    'trigonometry.right-triangle': ['rightTriangle'],
  } as const satisfies Partial<Record<MathJsonRouteId, readonly string[]>>
);

export const CANONICAL_RESULT_V3_PRODUCER_SELECTORS = (
  {
    'vector.angle': ['angle:grad'],
  } as const satisfies Partial<Record<MathJsonRouteId, readonly string[]>>
);

export const CANONICAL_RESULT_V4_PRODUCER_SELECTORS = (
  {
    'calculus.integrals': ['indefiniteIntegral:special-function'],
  } as const satisfies Partial<Record<MathJsonRouteId, readonly string[]>>
);

const v2DefaultRoutes = new Set<string>(CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES);
const v2Selectors = CANONICAL_RESULT_V2_PRODUCER_SELECTORS as Partial<
  Record<MathJsonRouteId, readonly string[]>
>;
const v3Selectors = CANONICAL_RESULT_V3_PRODUCER_SELECTORS as Partial<
  Record<MathJsonRouteId, readonly string[]>
>;
const v4Selectors = CANONICAL_RESULT_V4_PRODUCER_SELECTORS as Partial<
  Record<MathJsonRouteId, readonly string[]>
>;

export const CANONICAL_RESULT_PRODUCER_VERSION_REGISTRY = Object.freeze(
  Object.fromEntries(
    (Object.keys(MATHJSON_ROUTE_REGISTRY) as MathJsonRouteId[]).map((routeId) => [
      routeId,
      {
        defaultVersion: v2DefaultRoutes.has(routeId) || !frozenV1Routes.has(routeId)
          ? 2
          : 1,
        selectorVersions: Object.freeze(Object.fromEntries([
          ...(v2Selectors[routeId] ?? []).map((selector) => [selector, 2] as const),
          ...(v3Selectors[routeId] ?? []).map((selector) => [selector, 3] as const),
          ...(v4Selectors[routeId] ?? []).map((selector) => [selector, 4] as const),
        ])),
      },
    ]),
  ),
) as Readonly<Record<MathJsonRouteId, CanonicalResultProducerVersionPolicy>>;

export function canonicalResultVersionForProducer(input: {
  routeId: MathJsonRouteId;
  selector?: string;
}): CanonicalResultProducerVersion {
  const policy = CANONICAL_RESULT_PRODUCER_VERSION_REGISTRY[input.routeId];
  if (!policy) {
    throw new Error('Unknown canonical result producer route: ' + input.routeId + '.');
  }
  if (input.selector) {
    const selectedVersion = policy.selectorVersions[input.selector];
    if (selectedVersion !== undefined) return selectedVersion;
  }
  return policy.defaultVersion;
}
