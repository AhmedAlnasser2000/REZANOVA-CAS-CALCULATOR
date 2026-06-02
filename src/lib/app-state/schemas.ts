import { z } from 'zod';
import type { LauncherCategory, LauncherLaunchTarget, MenuNode } from '../../types/calculator';

export const modeIdSchema = z.enum([
  'calculate',
  'equation',
  'matrix',
  'vector',
  'table',
  'guide',
  'advancedCalculus',
  'trigonometry',
  'statistics',
  'geometry',
  'labs',
]);

export const angleUnitSchema = z.enum(['deg', 'rad', 'grad']);
export const outputStyleSchema = z.enum(['exact', 'decimal', 'both']);
export const equationAnswerModeSchema = z.enum(['exact', 'approximate', 'isolate']);
export const equationDomainIntentSchema = z.enum(['real', 'complex']);
export const mathNotationDisplaySchema = z.enum(['rendered', 'plainText', 'latex']);
export const numericNotationModeSchema = z.enum(['decimal', 'scientific', 'auto']);
export const scientificNotationStyleSchema = z.enum(['times10', 'e']);
export const calculatorMemoryAutosaveModeSchema = z.enum(['settled', 'interval']);

export const settingsSchema = z.object({
  angleUnit: angleUnitSchema,
  outputStyle: outputStyleSchema,
  equationAnswerMode: equationAnswerModeSchema.default('exact'),
  equationDomainIntent: equationDomainIntentSchema.default('real'),
  mathNotationDisplay: mathNotationDisplaySchema.default('rendered'),
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
const advancedCalcScreenSchema = z.enum([
  'home',
  'integralsHome',
  'indefiniteIntegral',
  'definiteIntegral',
  'improperIntegral',
  'limitsHome',
  'finiteLimit',
  'infiniteLimit',
  'seriesHome',
  'maclaurin',
  'taylor',
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
  'specialAngles',
]);
const statisticsScreenSchema = z.enum([
  'home',
  'dataEntry',
  'descriptive',
  'frequency',
  'probabilityHome',
  'binomial',
  'normal',
  'poisson',
  'regression',
  'correlation',
]);
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

export const storedVariableValueSchema = z.object({
  name: z.string(),
  valueLatex: z.string(),
  numericValue: z.number().finite(),
  updatedAt: z.string().optional(),
});

export const variableSubstitutionSnapshotSchema = z.object({
  name: z.string(),
  valueLatex: z.string(),
  numericValue: z.number().finite(),
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
const advancedCalcSeedSchema = z.object({
  bodyLatex: z.string().optional(),
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
  variable: z.enum(['x', 'y', 'z']).optional(),
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
  z.object({ mode: z.literal('advancedCalculus'), advancedCalcScreen: advancedCalcScreenSchema.optional() }),
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
      'advancedCalculus',
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
  resolvedInputLatex: z.string().optional(),
  resultLatex: z.string().optional(),
  exactSupplementLatex: z.array(z.string()).optional(),
  approxText: z.string().optional(),
  calculateScreen: calculateScreenSchema.optional(),
  calculateSeed: calculateSeedSchema.optional(),
  advancedCalcScreen: advancedCalcScreenSchema.optional(),
  advancedCalcSeed: advancedCalcSeedSchema.optional(),
  geometryScreen: geometryScreenSchema.optional(),
  trigScreen: trigScreenSchema.optional(),
  statisticsScreen: statisticsScreenSchema.optional(),
  equationSolveTarget: z.string().optional(),
  equationAnswerMode: equationAnswerModeSchema.optional(),
  equationDomainIntent: equationDomainIntentSchema.optional(),
  numericInterval: numericSolveIntervalSchema.optional(),
  variableSubstitutions: z.array(variableSubstitutionSnapshotSchema).optional(),
  timestamp: z.string(),
});

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
