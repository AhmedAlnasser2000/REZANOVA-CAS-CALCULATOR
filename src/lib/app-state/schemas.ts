import { z } from 'zod';
import type {
  CanonicalResultDocument,
  LauncherCategory,
  LauncherLaunchTarget,
  MenuNode,
} from '../../types/calculator';
import {
  DEFAULT_LANGUAGE_CODE,
  resolveLanguageCode,
} from '../language';
import { parseDerivativeVariable } from '../calculus/derivative-target';
import { validateCanonicalResultDocumentVersioned } from '../result-contract';
import {
  matrixReplaySeedSchema,
  vectorReplaySeedSchema,
} from './linear-algebra-history-schema';

export { variableSubstitutionSnapshotSchema } from './linear-algebra-history-schema';

export const modeIdSchema = z.enum([
  'calculate',
  'equation',
  'matrix',
  'vector',
  'table',
  'guide',
  'calculus',
  'trigonometry',
  'statistics',
  'geometry',
  'labs',
]);

export const angleUnitSchema = z.enum(['deg', 'rad', 'grad']);
export const outputStyleSchema = z.enum(['exact', 'decimal', 'both']);
export const equationAnswerModeSchema = z.preprocess(
  (value) => (value === 'isolate' ? 'isolate' : 'exact'),
  z.enum(['exact', 'isolate']),
);
export const legacyEquationAnswerModeSchema = z.enum(['exact', 'approximate', 'isolate']);
export const equationDomainIntentSchema = z.enum(['real', 'complex']);
export const complexExactFormSchema = z.enum(['rectangular', 'polar', 'cis']);
export const answerDomainSchema = z.enum(['real', 'complex', 'conditional-real', 'unknown-domain']);
export const solutionKindSchema = z.enum([
  'exact-symbolic',
  'approximate-numeric',
  'isolate-formula',
  'inequality-solution-set',
  'condition-fact-only-stop',
]);
export const mathNotationDisplaySchema = z.enum(['rendered', 'plainText', 'latex']);
export const numericNotationModeSchema = z.enum(['decimal', 'scientific', 'auto']);
export const scientificNotationStyleSchema = z.enum(['times10', 'e']);
export const calculatorMemoryAutosaveModeSchema = z.enum(['settled', 'interval']);
export const languageCodeSchema = z.preprocess(
  (value) => resolveLanguageCode(value),
  z.literal(DEFAULT_LANGUAGE_CODE),
);

export const settingsSchema = z.object({
  languageCode: languageCodeSchema.default(DEFAULT_LANGUAGE_CODE),
  angleUnit: angleUnitSchema,
  outputStyle: outputStyleSchema,
  equationAnswerMode: equationAnswerModeSchema.default('exact'),
  equationDomainIntent: equationDomainIntentSchema.default('real'),
  complexExactForm: complexExactFormSchema.default('rectangular'),
  mathNotationDisplay: mathNotationDisplaySchema.default('rendered'),
  historyInspectorNotationMode: mathNotationDisplaySchema.default('rendered'),
  historyPageNotationMode: mathNotationDisplaySchema.default('latex'),
  historyEnabled: z.boolean(),
  calculatorMemoryEnabled: z.boolean().default(true),
  calculatorMemoryAutosaveMode: calculatorMemoryAutosaveModeSchema.default('settled'),
  calculatorMemoryAutosaveIntervalSeconds: z.preprocess(
    (value) =>
      typeof value === 'number'
        ? Math.max(20, Math.trunc(value))
        : value,
    z.number().int().default(20),
  ),
  autoSwitchToEquation: z.boolean().default(false),
  uiScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(145)]).default(100),
  mathScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(145)]).default(100),
  resultScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(145)]).default(100),
  highContrast: z.boolean().default(false),
  symbolicDisplayMode: z.enum(['roots', 'powers', 'auto']).default('auto'),
  flattenNestedRootsWhenSafe: z.boolean().default(true),
  approxDigits: z.preprocess(
    (value) =>
      typeof value === 'number'
        ? Math.min(20, Math.max(0, Math.trunc(value)))
        : value,
    z.number().int().default(6),
  ),
  numericNotationMode: numericNotationModeSchema.default('decimal'),
  scientificNotationStyle: scientificNotationStyleSchema.default('times10'),
  detailedFactsEnabled: z.boolean().default(false),
});

export const menuNodeSchema: z.ZodType<MenuNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    hotkey: z.string().optional(),
    children: z.array(menuNodeSchema).optional(),
  }),
);

const calculateScreenSchema = z.enum(['standard', 'calculusHome', 'derivative', 'derivativePoint', 'integral', 'limit']);
const calculusScreenSchema = z.enum([
  'home',
  'derivativesHome',
  'derivative',
  'derivativePoint',
  'implicitDerivative',
  'integralsHome',
  'indefiniteIntegral',
  'definiteIntegral',
  'improperIntegral',
  'limitsHome',
  'limit',
  'finiteLimit',
  'infiniteLimit',
  'seriesHome',
  'maclaurin',
  'taylor',
  'laplace',
  'partialsHome',
  'partialDerivative',
  'odeHome',
  'odeFirstOrder',
  'odeSecondOrder',
  'odeNumericIvp',
]);
const trigScreenSchema = z.enum([
  'home',
  'functions',
  'identitiesHome',
  'identitySimplify',
  'identityConvert',
  'equationsHome',
  'equationSolve',
  'trianglesHome',
  'rightTriangle',
  'sineRule',
  'cosineRule',
  'angleConvert',
  'periodPhase',
  'specialAngles',
]);
const statisticsScreenSchema = z.enum([
  'home',
  'dataEntry',
  'descriptive',
  'frequency',
  'probabilityHome',
  'inferenceHome',
  'binomial',
  'normal',
  'poisson',
  'meanInference',
  'regression',
  'correlation',
]);
const statisticsWorkingSourceSchema = z.enum(['dataset', 'frequencyTable']);
const statisticsFrequencyRowSchema = z.object({
  value: z.string(),
  frequency: z.string(),
});
const statisticsRegressionPointSchema = z.object({
  x: z.string(),
  y: z.string(),
});
const statisticsProbabilityEventSchema = z.enum([
  'exactly',
  'density',
  'lessThan',
  'atMost',
  'moreThan',
  'atLeast',
  'between',
]);
const statisticsProbabilityBoundSchema = z.enum(['inclusive', 'exclusive']);
const statisticsProbabilityEventFields = {
  x: z.string().optional(),
  event: statisticsProbabilityEventSchema.optional(),
  lower: z.string().optional(),
  upper: z.string().optional(),
  lowerBound: statisticsProbabilityBoundSchema.optional(),
  upperBound: statisticsProbabilityBoundSchema.optional(),
};
const statisticsRequestSchema = z.union([
  z.object({
    kind: z.literal('dataset'),
    values: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('descriptive'),
    source: z.literal('dataset'),
    values: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('descriptive'),
    source: z.literal('frequencyTable'),
    rows: z.array(statisticsFrequencyRowSchema),
  }),
  z.object({
    kind: z.literal('frequency'),
    source: z.literal('dataset'),
    values: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('frequency'),
    source: z.literal('frequencyTable'),
    rows: z.array(statisticsFrequencyRowSchema),
  }),
  z.object({
    kind: z.literal('binomial'),
    n: z.string(),
    p: z.string(),
    ...statisticsProbabilityEventFields,
    mode: z.enum(['pmf', 'cdf']).optional(),
  }),
  z.object({
    kind: z.literal('normal'),
    mean: z.string(),
    standardDeviation: z.string(),
    ...statisticsProbabilityEventFields,
    mode: z.enum(['pdf', 'cdf']).optional(),
  }),
  z.object({
    kind: z.literal('poisson'),
    lambda: z.string(),
    ...statisticsProbabilityEventFields,
    mode: z.enum(['pmf', 'cdf']).optional(),
  }),
  z.object({
    kind: z.literal('meanInference'),
    source: z.literal('dataset'),
    values: z.array(z.string()),
    mode: z.enum(['ci', 'test']),
    level: z.string(),
    mu0: z.string().optional(),
    alternative: z.enum(['twoSided', 'less', 'greater']).optional(),
  }),
  z.object({
    kind: z.literal('meanInference'),
    source: z.literal('frequencyTable'),
    rows: z.array(statisticsFrequencyRowSchema),
    mode: z.enum(['ci', 'test']),
    level: z.string(),
    mu0: z.string().optional(),
    alternative: z.enum(['twoSided', 'less', 'greater']).optional(),
  }),
  z.object({
    kind: z.literal('regression'),
    points: z.array(statisticsRegressionPointSchema),
  }),
  z.object({
    kind: z.literal('correlation'),
    points: z.array(statisticsRegressionPointSchema),
  }),
]);
const statisticsReplaySeedSchema = z.object({
  screen: statisticsScreenSchema,
  request: statisticsRequestSchema,
  workingSource: statisticsWorkingSourceSchema,
});
const trigRequestSchema = z.union([
  z.object({
    kind: z.literal('function'),
    expressionLatex: z.string(),
  }),
  z.object({
    kind: z.literal('identitySimplify'),
    expressionLatex: z.string(),
  }),
  z.object({
    kind: z.literal('identityConvert'),
    expressionLatex: z.string(),
    targetForm: z.enum(['simplified', 'productToSum', 'sumToProduct', 'doubleAngle', 'halfAngle']),
  }),
  z.object({
    kind: z.literal('equationSolve'),
    equationLatex: z.string(),
    variable: z.literal('x'),
  }),
  z.object({
    kind: z.literal('rightTriangle'),
    knownSideA: z.string().optional(),
    knownSideB: z.string().optional(),
    knownSideC: z.string().optional(),
    knownAngleA: z.string().optional(),
    knownAngleB: z.string().optional(),
  }),
  z.object({
    kind: z.literal('sineRule'),
    sideA: z.string().optional(),
    sideB: z.string().optional(),
    sideC: z.string().optional(),
    angleA: z.string().optional(),
    angleB: z.string().optional(),
    angleC: z.string().optional(),
  }),
  z.object({
    kind: z.literal('cosineRule'),
    sideA: z.string().optional(),
    sideB: z.string().optional(),
    sideC: z.string().optional(),
    angleA: z.string().optional(),
    angleB: z.string().optional(),
    angleC: z.string().optional(),
  }),
  z.object({
    kind: z.literal('angleConvert'),
    valueLatex: z.string(),
    from: angleUnitSchema,
    to: angleUnitSchema,
  }),
  z.object({
    kind: z.literal('periodPhase'),
    expressionLatex: z.string(),
    variable: z.literal('x'),
    angleUnit: angleUnitSchema.optional(),
  }),
]);
const trigReplaySeedSchema = z.object({
  screen: trigScreenSchema,
  request: trigRequestSchema,
});
const geometryScreenSchema = z.enum([
  'home',
  'shapes2dHome',
  'shapes3dHome',
  'triangleHome',
  'circleHome',
  'coordinateHome',
  'triangleArea',
  'triangleHeron',
  'rectangle',
  'square',
  'circle',
  'arcSector',
  'cube',
  'cuboid',
  'cylinder',
  'cone',
  'sphere',
  'distance',
  'midpoint',
  'slope',
  'lineEquation',
]);
const geometryPointSchema = z.object({
  xLatex: z.string(),
  yLatex: z.string(),
});
const geometryRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('square'), sideLatex: z.string() }),
  z.object({ kind: z.literal('rectangle'), widthLatex: z.string(), heightLatex: z.string() }),
  z.object({ kind: z.literal('circle'), radiusLatex: z.string() }),
  z.object({ kind: z.literal('arcSector'), radiusLatex: z.string(), angleLatex: z.string(), angleUnit: angleUnitSchema }),
  z.object({ kind: z.literal('cube'), sideLatex: z.string() }),
  z.object({ kind: z.literal('cuboid'), lengthLatex: z.string(), widthLatex: z.string(), heightLatex: z.string() }),
  z.object({ kind: z.literal('cylinder'), radiusLatex: z.string(), heightLatex: z.string() }),
  z.object({ kind: z.literal('cone'), radiusLatex: z.string(), heightLatex: z.string().optional(), slantHeightLatex: z.string().optional() }),
  z.object({ kind: z.literal('sphere'), radiusLatex: z.string() }),
  z.object({ kind: z.literal('triangleArea'), baseLatex: z.string(), heightLatex: z.string() }),
  z.object({ kind: z.literal('triangleHeron'), aLatex: z.string(), bLatex: z.string(), cLatex: z.string() }),
  z.object({ kind: z.literal('distance'), p1: geometryPointSchema, p2: geometryPointSchema }),
  z.object({ kind: z.literal('midpoint'), p1: geometryPointSchema, p2: geometryPointSchema }),
  z.object({ kind: z.literal('slope'), p1: geometryPointSchema, p2: geometryPointSchema }),
  z.object({
    kind: z.literal('lineEquation'),
    p1: geometryPointSchema,
    p2: geometryPointSchema,
    form: z.enum(['slope-intercept', 'point-slope', 'standard']),
  }),
  z.object({
    kind: z.literal('squareSolveMissing'),
    sideLatex: z.string(),
    areaLatex: z.string().optional(),
    perimeterLatex: z.string().optional(),
    diagonalLatex: z.string().optional(),
  }),
  z.object({
    kind: z.literal('circleSolveMissing'),
    radiusLatex: z.string(),
    diameterLatex: z.string().optional(),
    circumferenceLatex: z.string().optional(),
    areaLatex: z.string().optional(),
  }),
  z.object({
    kind: z.literal('cubeSolveMissing'),
    sideLatex: z.string(),
    volumeLatex: z.string().optional(),
    surfaceAreaLatex: z.string().optional(),
    diagonalLatex: z.string().optional(),
  }),
  z.object({
    kind: z.literal('sphereSolveMissing'),
    radiusLatex: z.string(),
    volumeLatex: z.string().optional(),
    surfaceAreaLatex: z.string().optional(),
  }),
  z.object({
    kind: z.literal('triangleAreaSolveMissing'),
    baseLatex: z.string(),
    heightLatex: z.string(),
    areaLatex: z.string(),
    unknown: z.enum(['base', 'height']),
  }),
  z.object({
    kind: z.literal('rectangleSolveMissing'),
    widthLatex: z.string(),
    heightLatex: z.string(),
    areaLatex: z.string().optional(),
    perimeterLatex: z.string().optional(),
    diagonalLatex: z.string().optional(),
    unknown: z.enum(['width', 'height']),
  }),
  z.object({
    kind: z.literal('cylinderSolveMissing'),
    radiusLatex: z.string(),
    heightLatex: z.string(),
    volumeLatex: z.string(),
    unknown: z.enum(['radius', 'height']),
  }),
  z.object({
    kind: z.literal('coneSolveMissing'),
    radiusLatex: z.string(),
    heightLatex: z.string(),
    slantHeightLatex: z.string(),
    volumeLatex: z.string().optional(),
    unknown: z.enum(['radius', 'height', 'slantHeight']),
  }),
  z.object({
    kind: z.literal('cuboidSolveMissing'),
    lengthLatex: z.string(),
    widthLatex: z.string(),
    heightLatex: z.string(),
    volumeLatex: z.string().optional(),
    diagonalLatex: z.string().optional(),
    unknown: z.enum(['length', 'width', 'height']),
  }),
  z.object({
    kind: z.literal('arcSectorSolveMissing'),
    radiusLatex: z.string(),
    angleLatex: z.string(),
    angleUnit: angleUnitSchema,
    arcLatex: z.string().optional(),
    sectorLatex: z.string().optional(),
    unknown: z.enum(['radius', 'angle']),
  }),
  z.object({
    kind: z.literal('triangleHeronSolveMissing'),
    aLatex: z.string(),
    bLatex: z.string(),
    cLatex: z.string(),
    areaLatex: z.string(),
    unknown: z.enum(['a', 'b', 'c']),
  }),
  z.object({
    kind: z.literal('distanceSolveMissing'),
    p1: geometryPointSchema,
    p2: geometryPointSchema,
    distanceLatex: z.string(),
  }),
  z.object({
    kind: z.literal('midpointSolveMissing'),
    p1: geometryPointSchema,
    p2: geometryPointSchema,
    mid: geometryPointSchema,
  }),
  z.object({
    kind: z.literal('slopeSolveMissing'),
    p1: geometryPointSchema,
    p2: geometryPointSchema,
    slopeLatex: z.string(),
  }),
]);
const geometryReplaySeedSchema = z.object({
  screen: geometryScreenSchema,
  request: geometryRequestSchema,
});
const equationScreenSchema = z.enum([
  'home',
  'symbolic',
  'polynomialMenu',
  'quadratic',
  'cubic',
  'quartic',
  'simultaneousMenu',
  'linear2',
  'linear3',
  'polynomialSystem2',
]);
const numericSolveIntervalSchema = z.object({
  start: z.string(),
  end: z.string(),
  subdivisions: z.number(),
});
const complexSolveRegionSchema = z.object({
  reMin: z.string(),
  reMax: z.string(),
  imMin: z.string(),
  imMax: z.string(),
  gridSize: z.number().optional(),
  randomSeedCount: z.number().optional(),
  samplesPerEdge: z.number().optional(),
  subdivisionDepth: z.number().optional(),
  cellBudget: z.number().optional(),
});
const equationReplaySeedSchema = z.union([
  z.object({
    screen: z.literal('symbolic'),
    equationLatex: z.string(),
    equationSolveTarget: z.string().nullable().optional(),
    complexRegion: complexSolveRegionSchema.optional(),
    numericInterval: numericSolveIntervalSchema.optional(),
  }),
  z.object({
    screen: z.enum(['quadratic', 'cubic', 'quartic']),
    coefficients: z.array(z.number().finite()),
    equationLatex: z.string(),
  }),
  z.object({
    screen: z.enum(['linear2', 'linear3']),
    equationLatex: z.string(),
    system: z.array(z.array(z.number().finite())),
  }),
  z.object({
    screen: z.literal('polynomialSystem2'),
    equationLatex: z.string(),
    polynomialSystem2Latex: z.tuple([z.string(), z.string()]),
  }),
]);

export const storedVariableValueSchema = z.object({
  name: z.string(),
  valueLatex: z.string(),
  numericValue: z.number().finite(),
  updatedAt: z.string().optional(),
});

const calculateSeedSchema = z.object({
  bodyLatex: z.string().optional(),
  point: z.string().optional(),
  kind: z.enum(['indefinite', 'definite']).optional(),
  lower: z.string().optional(),
  upper: z.string().optional(),
  target: z.string().optional(),
  direction: z.enum(['two-sided', 'left', 'right']).optional(),
  targetKind: z.enum(['finite', 'posInfinity', 'negInfinity']).optional(),
});
const derivativeVariableSchema = z.string().transform((value, ctx) => {
  const parsed = parseDerivativeVariable(value);
  if (parsed.ok) {
    return parsed.variable;
  }
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
  return z.NEVER;
});
const calculusSeedSchema = z.object({
  requestLatex: z.string().optional(),
  bodyLatex: z.string().optional(),
  point: z.string().optional(),
  lower: z.string().optional(),
  upper: z.string().optional(),
  lowerKind: z.enum(['finite', 'negInfinity']).optional(),
  upperKind: z.enum(['finite', 'posInfinity']).optional(),
  target: z.string().optional(),
  direction: z.enum(['two-sided', 'left', 'right']).optional(),
  targetKind: z.enum(['posInfinity', 'negInfinity']).optional(),
  kind: z.enum(['maclaurin', 'taylor']).optional(),
  center: z.string().optional(),
  order: z.number().optional(),
  variable: derivativeVariableSchema.optional(),
  independentVariable: derivativeVariableSchema.optional(),
  dependentVariable: derivativeVariableSchema.optional(),
  relationLatex: z.string().optional(),
  operatorLatex: z.string().optional(),
  lhsLatex: z.string().optional(),
  rhsLatex: z.string().optional(),
  classification: z.enum(['separable', 'linear', 'exact']).optional(),
  a2: z.string().optional(),
  a1: z.string().optional(),
  a0: z.string().optional(),
  forcingLatex: z.string().optional(),
  x0: z.string().optional(),
  y0: z.string().optional(),
  xEnd: z.string().optional(),
  step: z.string().optional(),
  method: z.enum(['rk4', 'rk45']).optional(),
});

export const launcherLaunchTargetSchema: z.ZodType<LauncherLaunchTarget> = z.union([
  z.object({ mode: z.literal('calculate'), calculateScreen: calculateScreenSchema.optional() }),
  z.object({ mode: z.literal('equation'), equationScreen: equationScreenSchema.optional() }),
  z.object({ mode: z.literal('matrix') }),
  z.object({ mode: z.literal('vector') }),
  z.object({ mode: z.literal('table') }),
  z.object({ mode: z.literal('calculus'), calculusScreen: calculusScreenSchema.optional() }),
  z.object({ mode: z.literal('trigonometry'), trigScreen: trigScreenSchema.optional() }),
  z.object({ mode: z.literal('statistics'), statisticsScreen: statisticsScreenSchema.optional() }),
  z.object({ mode: z.literal('geometry'), geometryScreen: geometryScreenSchema.optional() }),
  z.object({ mode: z.literal('labs') }),
]);

export const launcherCategorySchema: z.ZodType<LauncherCategory> = z.object({
  id: z.enum(['core', 'linear', 'calculus', 'shapeMath', 'data', 'labs']),
  label: z.string(),
  description: z.string(),
  hotkey: z.string(),
  entries: z.array(z.object({
    id: z.enum([
      'calculate',
      'equation',
      'matrix',
      'vector',
      'table',
      'calculus',
      'trigonometry',
      'statistics',
      'geometry',
      'labs',
    ]),
    label: z.string(),
    description: z.string(),
    hotkey: z.string(),
    launch: launcherLaunchTargetSchema,
  })),
});

export const historyEntrySchema = z.object({
  id: z.string(),
  mode: modeIdSchema,
  inputLatex: z.string(),
  calculateScreen: calculateScreenSchema.optional(),
  calculateSeed: calculateSeedSchema.optional(),
  calculusScreen: calculusScreenSchema.optional(),
  calculusSeed: calculusSeedSchema.optional(),
  geometryScreen: geometryScreenSchema.optional(),
  geometrySeed: geometryReplaySeedSchema.optional(),
  trigScreen: trigScreenSchema.optional(),
  trigSeed: trigReplaySeedSchema.optional(),
  statisticsScreen: statisticsScreenSchema.optional(),
  statisticsSeed: statisticsReplaySeedSchema.optional(),
  matrixSeed: matrixReplaySeedSchema.optional(),
  vectorSeed: vectorReplaySeedSchema.optional(),
  equationScreen: equationScreenSchema.optional(),
  equationSeed: equationReplaySeedSchema.optional(),
  equationSolveTarget: z.string().optional(),
  equationAnswerMode: legacyEquationAnswerModeSchema.optional(),
  equationDomainIntent: equationDomainIntentSchema.optional(),
  complexExactForm: complexExactFormSchema.optional(),
  numericInterval: numericSolveIntervalSchema.optional(),
  historyLaunchOrder: z.number().finite().optional(),
  runtimeElapsedMs: z.number().int().nonnegative().optional(),
  replaySnapshot: z.object({
    version: z.literal(1),
    ansLatex: z.string(),
    angleUnit: angleUnitSchema,
    outputStyle: outputStyleSchema,
    equationAnswerMode: equationAnswerModeSchema,
    equationDomainIntent: equationDomainIntentSchema,
    complexExactForm: complexExactFormSchema,
    mathNotationDisplay: mathNotationDisplaySchema,
    historyInspectorNotationMode: mathNotationDisplaySchema,
    historyPageNotationMode: mathNotationDisplaySchema,
    symbolicDisplayMode: z.enum(['roots', 'powers', 'auto']),
    flattenNestedRootsWhenSafe: z.boolean(),
    approxDigits: z.number().int().min(0).max(20),
    numericNotationMode: numericNotationModeSchema,
    scientificNotationStyle: scientificNotationStyleSchema,
    detailedFactsEnabled: z.boolean(),
  }).optional(),
  resultDocument: z.custom<CanonicalResultDocument>((value) => {
    const validation = validateCanonicalResultDocumentVersioned(value);
    return validation.ok && validation.validated.value.outcomeKind === 'success';
  }, 'Expected a valid success CanonicalResultDocumentV1, V2, or V3'),
  resultStorageMode: z.literal('canonical-only-fallback').optional(),
  timestamp: z.string(),
}).passthrough().superRefine((entry, context) => {
  if (entry.resultDocument.version !== 1 && entry.resultStorageMode) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['resultStorageMode'],
      message: 'Canonical-only History fallback is limited to V1 documents.',
    });
  }
  for (const field of [
    'resolvedInputLatex',
    'resultLatex',
    'exactSupplementLatex',
    'approxText',
    'detailSections',
    'systemReadback',
    'answerDomain',
    'solutionKind',
    'variableSubstitutions',
    'resultDocumentOmissionReason',
  ] as const) {
    if (Object.prototype.hasOwnProperty.call(entry, field)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `History result field ${field} has been removed.`,
      });
    }
  }
});

export function hasValidHistoryResultDocument(entry: unknown) {
  if (entry === null || typeof entry !== 'object') return false;
  const document = (entry as Record<string, unknown>).resultDocument;
  const validation = validateCanonicalResultDocumentVersioned(document);
  return validation.ok && validation.validated.value.outcomeKind === 'success';
}

export const appBootstrapSchema = z.object({
  currentMode: modeIdSchema,
  settings: settingsSchema,
  modeTree: z.array(menuNodeSchema),
  historyCount: z.number(),
  variableMemory: z.array(storedVariableValueSchema).default([]),
  version: z.string(),
});

export const modeStateSchema = z.object({
  activeMode: modeIdSchema,
  menu: z.array(menuNodeSchema),
});

export const calculatorMemorySnapshotSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  currentMode: modeIdSchema,
  previousNonGuideMode: modeIdSchema.exclude(['guide']).optional(),
  settings: settingsSchema,
  history: z.array(historyEntrySchema).default([]),
  variableMemory: z.array(storedVariableValueSchema).default([]),
  ansLatex: z.string().default('0'),
  displayOutcome: z.unknown().nullable().optional(),
  session: z.record(z.string(), z.unknown()).default({}),
});
