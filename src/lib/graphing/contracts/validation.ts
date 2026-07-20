import { z } from 'zod';
import {
  MATH_JSON_MAX_BYTES,
  MATH_JSON_MAX_DEPTH,
  MATH_JSON_MAX_NODES,
  validateSerializableMathJson,
} from '../../display/printer/math-json';
import {
  inspectJsonCompatibleStructuredValue,
  type StructuredValueInspectionFailure,
} from '../../result-contract/structured-value';
import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import type {
  GraphConditionIR,
  GraphDocumentV1,
  GraphDocumentV2,
  GraphExpressionIR,
  GraphItemPresentation,
  GraphItemPresentationV1,
  GraphItemPresentationV2,
  GraphParameterSpecV1,
  GraphPiecewiseSpecV1,
  GraphRelationIR,
  GraphRenderPolicy,
  GraphRendererCapabilities,
  GraphRevisionSetV2,
  GraphSampleRequestV4,
  GraphSourceV1,
  GraphStopReason,
  GraphSurfaceStateV1,
  GraphSurfaceStateV2,
  GraphViewportV1,
  SampledSceneSnapshotV2,
} from './types';

export const GRAPH_DOCUMENT_MAX_ITEMS = 100;
export const GRAPH_POINT_SET_MAX_POINTS = 2_000;
export const GRAPH_PIECEWISE_MAX_BRANCHES = 32;
export const GRAPH_CONDITION_MAX_CLAUSES = 64;
export const GRAPH_CONDITION_MAX_DEPTH = 16;
export const GRAPH_FREE_SYMBOL_MAX_COUNT = 64;
export const GRAPH_NOTE_MAX_CHARACTERS = 16_384;

const idSchema = z.string().trim().min(1).max(160);
const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const finiteSchema = z.number().finite();
const expressionSchema = z.custom<GraphExpressionIR>((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Reflect.ownKeys(record).some((key) => key !== 'mathJson' && key !== 'freeSymbols')) {
    return false;
  }
  const symbols = record.freeSymbols;
  return Array.isArray(symbols)
    && symbols.length <= GRAPH_FREE_SYMBOL_MAX_COUNT
    && new Set(symbols).size === symbols.length
    && symbols.every((symbol) => typeof symbol === 'string' && symbol.length > 0 && symbol.length <= 80)
    && validateSerializableMathJson(record.mathJson, {
      maxNodes: MATH_JSON_MAX_NODES,
      maxDepth: MATH_JSON_MAX_DEPTH,
      maxBytes: MATH_JSON_MAX_BYTES,
    }).ok;
}, 'bounded standard MathJSON expression');

const comparatorSchema = z.enum(['<', '<=', '=', '>=', '>']);
const inequalityComparatorSchema = z.enum(['<', '<=', '>=', '>']);

const conditionSchema: z.ZodType<GraphConditionIR> = z.lazy(() => z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('comparison'),
    left: expressionSchema,
    operator: comparatorSchema,
    right: expressionSchema,
  }),
  z.strictObject({
    kind: z.literal('chain'),
    operands: z.array(expressionSchema).min(2).max(GRAPH_CONDITION_MAX_CLAUSES + 1),
    operators: z.array(inequalityComparatorSchema).min(1).max(GRAPH_CONDITION_MAX_CLAUSES),
  }).refine((value) => value.operators.length === value.operands.length - 1, {
    message: 'Condition chain operator count must be one less than operand count.',
  }),
  z.strictObject({
    kind: z.literal('and'),
    clauses: z.array(conditionSchema).min(1).max(GRAPH_CONDITION_MAX_CLAUSES),
  }),
  z.strictObject({
    kind: z.literal('interval-membership'),
    value: expressionSchema,
    minimum: expressionSchema.optional(),
    maximum: expressionSchema.optional(),
    minimumInclusive: z.boolean(),
    maximumInclusive: z.boolean(),
  }).refine((value) => value.minimum !== undefined || value.maximum !== undefined, {
    message: 'Interval membership needs at least one bound.',
  }),
  z.strictObject({ kind: z.literal('constant'), value: z.boolean() }),
]));

const relationSchema: z.ZodType<GraphRelationIR> = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('explicit-y'),
    rhs: expressionSchema,
    origin: z.enum(['authored-relation', 'bare-expression']),
  }),
  z.strictObject({ kind: z.literal('explicit-x'), rhs: expressionSchema }),
  z.strictObject({
    kind: z.literal('implicit-equality'),
    left: expressionSchema,
    right: expressionSchema,
  }),
  z.strictObject({
    kind: z.literal('inequality'),
    left: expressionSchema,
    operator: inequalityComparatorSchema,
    right: expressionSchema,
  }),
  z.strictObject({
    kind: z.literal('chained-inequality'),
    operands: z.array(expressionSchema).min(2).max(GRAPH_CONDITION_MAX_CLAUSES + 1),
    operators: z.array(inequalityComparatorSchema).min(1).max(GRAPH_CONDITION_MAX_CLAUSES),
  }).refine((value) => value.operators.length === value.operands.length - 1, {
    message: 'Relation chain operator count must be one less than operand count.',
  }),
  z.strictObject({
    kind: z.literal('polar-radius'),
    radius: expressionSchema,
    angleSymbol: z.literal('theta'),
    domain: conditionSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('parametric-curve'),
    parameterSymbol: idSchema,
    x: expressionSchema,
    y: expressionSchema,
    domain: conditionSchema.optional(),
  }),
]);

const sourceSchema: z.ZodType<GraphSourceV1> = z.strictObject({
  sourceKind: z.literal('mathlive-latex'),
  sourceLatex: z.string().max(32_000),
  sourceRevision: revisionSchema,
});

const stopReasonSchema: z.ZodType<GraphStopReason> = z.strictObject({
  code: z.enum([
    'ambiguous-bare-expression', 'unsupported-relation', 'unsupported-operator',
    'expression-budget-exceeded', 'unsafe-expression', 'invalid-condition',
    'condition-budget-exceeded', 'invalid-parameter', 'cyclic-parameter',
    'coordinate-parameter-conflict', 'sampling-budget-exceeded', 'sampling-cancelled',
    'region-topology-inconclusive', 'analysis-unsupported', 'analysis-inconclusive',
    'complex-interpretation-unsupported', 'renderer-capability-unavailable',
    'export-budget-exceeded',
  ]),
  path: z.string().max(500).optional(),
  detailCode: z.string().max(160).optional(),
});

const presentationV1Schema: z.ZodType<GraphItemPresentationV1> = z.strictObject({
  version: z.literal(1),
  colorToken: idSchema,
  stroke: z.enum(['solid', 'dashed']),
  strokeWidth: z.enum(['thin', 'normal', 'strong']),
  fillOpacity: finiteSchema.min(0).max(1),
  label: z.enum(['auto', 'always', 'never']),
});

const presentationV2Schema: z.ZodType<GraphItemPresentationV2> = z.strictObject({
  version: z.literal(2),
  color: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('token'), token: idSchema }),
    z.strictObject({ kind: z.literal('custom'), value: z.string().regex(/^#[0-9a-fA-F]{6}$/u) }),
  ]),
  stroke: z.enum(['solid', 'dashed', 'dotted']),
  strokeWidth: z.enum(['thin', 'normal', 'strong']),
  strokeOpacity: finiteSchema.min(0.15).max(1),
  regionOpacity: finiteSchema.min(0).max(0.8),
  halo: z.enum(['none', 'soft']),
  markers: z.enum(['semantic', 'none']),
  label: z.enum(['auto', 'always', 'never']),
});

const presentationSchema: z.ZodType<GraphItemPresentation> = z.union([
  presentationV1Schema,
  presentationV2Schema,
]);

const parameterSchema: z.ZodType<GraphParameterSpecV1> = z.strictObject({
  version: z.literal(1),
  parameterId: idSchema,
  symbol: idSchema,
  origin: z.enum(['authored-definition', 'slider-created']),
  source: sourceSchema.optional(),
  value: finiteSchema,
  minimum: finiteSchema,
  maximum: finiteSchema,
  step: finiteSchema.positive(),
  animation: z.strictObject({
    enabled: z.boolean(),
    direction: z.enum(['forward', 'reverse', 'alternate']),
    periodMs: finiteSchema.positive().max(3_600_000),
  }).optional(),
}).refine((value) => value.minimum <= value.maximum, {
  message: 'Parameter minimum must not exceed maximum.',
}).refine((value) => value.value >= value.minimum && value.value <= value.maximum, {
  message: 'Parameter value must lie within its bounds.',
}).refine((value) => value.origin !== 'authored-definition' || value.source !== undefined, {
  message: 'Authored parameters require source provenance.',
});

const piecewiseSchema: z.ZodType<GraphPiecewiseSpecV1> = z.strictObject({
  version: z.literal(1),
  branches: z.array(z.strictObject({
    branchId: idSchema,
    relation: relationSchema,
    condition: conditionSchema,
  })).min(1).max(GRAPH_PIECEWISE_MAX_BRANCHES),
  otherwise: relationSchema.optional(),
}).refine((value) => new Set(value.branches.map((branch) => branch.branchId)).size === value.branches.length, {
  message: 'Piecewise branch IDs must be unique.',
});

const pointSchema = z.strictObject({
  x: z.custom<SerializableMathJson>((value) => validateSerializableMathJson(value).ok),
  y: z.custom<SerializableMathJson>((value) => validateSerializableMathJson(value).ok),
});

const itemSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    version: z.literal(1), kind: z.literal('relation'), itemId: idSchema,
    source: sourceSchema, relation: relationSchema, visible: z.boolean(),
    presentation: presentationSchema,
  }),
  z.strictObject({
    version: z.literal(1), kind: z.literal('invalid-relation-draft'), itemId: idSchema,
    source: sourceSchema, parseStop: stopReasonSchema, visible: z.boolean(),
    presentation: presentationSchema,
  }),
  z.strictObject({
    version: z.literal(1), kind: z.literal('piecewise'), itemId: idSchema,
    source: sourceSchema, piecewise: piecewiseSchema, visible: z.boolean(),
    presentation: presentationSchema,
  }),
  z.strictObject({
    version: z.literal(1), kind: z.literal('parameter'), itemId: idSchema,
    parameter: parameterSchema, visible: z.boolean(),
  }),
  z.strictObject({
    version: z.literal(1), kind: z.literal('point-set'), itemId: idSchema,
    source: sourceSchema, points: z.array(pointSchema).max(GRAPH_POINT_SET_MAX_POINTS),
    visible: z.boolean(), presentation: presentationSchema,
  }),
]);

const noteSchema = z.strictObject({
  version: z.literal(1), kind: z.literal('note'), itemId: idSchema,
  text: z.string().max(GRAPH_NOTE_MAX_CHARACTERS),
});

const itemV2Schema = z.union([itemSchema, noteSchema]);

const samplingItemSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    version: z.literal(1), kind: z.literal('relation'), itemId: idSchema,
    source: sourceSchema, relation: relationSchema, visible: z.boolean(),
  }),
  z.strictObject({
    version: z.literal(1), kind: z.literal('piecewise'), itemId: idSchema,
    source: sourceSchema, piecewise: piecewiseSchema, visible: z.boolean(),
  }),
  z.strictObject({
    version: z.literal(1), kind: z.literal('point-set'), itemId: idSchema,
    source: sourceSchema, points: z.array(pointSchema).max(GRAPH_POINT_SET_MAX_POINTS),
    visible: z.boolean(),
  }),
]);

const viewportSchema: z.ZodType<GraphViewportV1> = z.strictObject({
  coordinateSystem: z.enum(['cartesian', 'polar', 'argand']),
  xMin: finiteSchema,
  xMax: finiteSchema,
  yMin: finiteSchema,
  yMax: finiteSchema,
}).refine((value) => value.xMin < value.xMax && value.yMin < value.yMax, {
  message: 'Viewport minimums must be less than maximums.',
});

const gridPolicySchema = z.strictObject({
  kind: z.enum(['cartesian', 'polar', 'none']),
  major: z.boolean(), minor: z.boolean(), axisNumbers: z.boolean(),
  angleLabels: z.boolean(), unitCircle: z.boolean(),
});

const revisionsSchema: z.ZodType<GraphRevisionSetV2> = z.strictObject({
  mathematics: revisionSchema,
  viewport: revisionSchema,
  parameter: revisionSchema,
});

const sampleRequestRevisionsSchema = z.strictObject({
  scene: revisionSchema,
  mathematics: revisionSchema,
  viewport: revisionSchema,
  parameter: revisionSchema,
});

const documentV1Schema = z.strictObject({
  version: z.literal(1),
  documentId: idSchema,
  title: z.string().trim().min(1).max(240),
  documentRevision: revisionSchema,
  items: z.array(itemSchema).max(GRAPH_DOCUMENT_MAX_ITEMS),
}).refine((value) => new Set(value.items.map((item) => item.itemId)).size === value.items.length, {
  message: 'Graph item IDs must be unique.',
}) as z.ZodType<GraphDocumentV1>;

const documentSchema = z.strictObject({
  version: z.literal(2),
  documentId: idSchema,
  title: z.string().trim().min(1).max(240),
  contentRevision: revisionSchema,
  mathematicsRevision: revisionSchema,
  items: z.array(itemV2Schema).max(GRAPH_DOCUMENT_MAX_ITEMS),
}).refine((value) => new Set(value.items.map((item) => item.itemId)).size === value.items.length, {
  message: 'Graph item IDs must be unique.',
}) as z.ZodType<GraphDocumentV2>;

const surfaceV1Schema: z.ZodType<GraphSurfaceStateV1> = z.strictObject({
  version: z.literal(1),
  viewport: viewportSchema,
  viewportRevision: revisionSchema,
  parameterRevision: revisionSchema,
  viewPolicy: z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('real') }),
    z.strictObject({
      mode: z.literal('complex'),
      interpretation: z.literal('real-parameterized-argand-trajectory'),
    }),
    z.strictObject({
      mode: z.literal('both'),
      interpretation: z.literal('real-parameterized-argand-trajectory'),
      layout: z.literal('synchronized-split'),
    }),
  ]),
  grid: gridPolicySchema,
  expressionRailCollapsed: z.boolean(),
  analyzeOpen: z.boolean(),
  selectedItemId: idSchema.nullable(),
  presentationMode: z.boolean(),
});

const surfaceSchema: z.ZodType<GraphSurfaceStateV2> = z.strictObject({
  version: z.literal(2),
  viewport: viewportSchema,
  viewportRevision: revisionSchema,
  parameterRevision: revisionSchema,
  viewPolicy: z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('real') }),
    z.strictObject({
      mode: z.literal('complex'),
      interpretation: z.literal('real-parameterized-argand-trajectory'),
    }),
    z.strictObject({
      mode: z.literal('both'),
      interpretation: z.literal('real-parameterized-argand-trajectory'),
      layout: z.literal('synchronized-split'),
    }),
  ]),
  grid: gridPolicySchema,
  expressionRailCollapsed: z.boolean(),
  analyzeOpen: z.boolean(),
  selectedItemId: idSchema.nullable(),
  presentationMode: z.boolean(),
  appearance: z.strictObject({
    theme: z.enum(['technical', 'paper', 'aurora', 'luminous']),
    colorVisionMode: z.enum(['standard', 'color-vision-friendly']),
  }),
});

const rendererCapabilitiesSchema: z.ZodType<GraphRendererCapabilities> = z.strictObject({
  rendererId: z.enum(['headless', 'svg', 'three-webgl']),
  interactive: z.boolean(), hitTesting: z.boolean(), regionFill: z.boolean(),
  polarGrid: z.boolean(), contextRecovery: z.boolean(),
  maximumVertices: z.number().int().positive().max(10_000_000),
});

const renderPolicySchema: z.ZodType<GraphRenderPolicy> = z.strictObject({
  quality: z.enum(['interactive-preview', 'settled', 'export']),
  reducedMotion: z.boolean(),
  maximumVertices: z.number().int().positive().max(10_000_000),
  maximumLabels: z.number().int().nonnegative().max(10_000),
  pixelRatioCap: finiteSchema.positive().max(8),
});

const sampleRequestSchema = z.strictObject({
  version: z.literal(4), requestId: idSchema, workspaceInstanceId: idSchema,
  documentId: idSchema, revisions: sampleRequestRevisionsSchema,
  items: z.array(samplingItemSchema).max(GRAPH_DOCUMENT_MAX_ITEMS),
  parameterEnvironment: z.record(idSchema, finiteSchema),
  viewport: viewportSchema,
  cssSize: z.strictObject({
    width: z.number().int().positive().max(16_384),
    height: z.number().int().positive().max(16_384),
  }),
  overlays: z.strictObject({ unitCircle: z.boolean() }),
  quality: z.enum(['preview', 'settled', 'polish']),
  priority: z.strictObject({
    activeItemId: idSchema.optional(),
    dependentItemIds: z.array(idSchema).max(GRAPH_DOCUMENT_MAX_ITEMS),
  }),
  movement: z.strictObject({
    panVelocityX: finiteSchema,
    panVelocityY: finiteSchema,
    zoomRatio: finiteSchema.positive().max(100),
  }),
}) as unknown as z.ZodType<GraphSampleRequestV4>;

export type GraphContractValidationFailure = {
  reason: 'structure' | 'condition-depth' | 'condition-clause-limit';
  message: string;
  path?: string;
};

export type GraphContractValidationResult<T> =
  | { ok: true; validated: { value: T; nodeCount: number; depth: number; byteLength: number } }
  | { ok: false; failure: GraphContractValidationFailure | StructuredValueInspectionFailure };

function conditionMetrics(condition: GraphConditionIR): { depth: number; clauses: number } {
  if (condition.kind !== 'and') return { depth: 1, clauses: 1 };
  const children = condition.clauses.map(conditionMetrics);
  return {
    depth: 1 + Math.max(0, ...children.map((child) => child.depth)),
    clauses: children.reduce((sum, child) => sum + child.clauses, 0),
  };
}

function collectConditions(value: unknown, output: GraphConditionIR[] = []): GraphConditionIR[] {
  if (!value || typeof value !== 'object') return output;
  if ('kind' in value && ['comparison', 'chain', 'and', 'interval-membership', 'constant'].includes(String(value.kind))) {
    output.push(value as GraphConditionIR);
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((entry) => collectConditions(entry, output));
    else collectConditions(child, output);
  }
  return output;
}

function validateJsonContract<T>(
  input: unknown,
  label: string,
  schema: z.ZodType<T>,
  limits: { maxNodes: number; maxDepth: number; maxBytes: number },
): GraphContractValidationResult<T> {
  const inspection = inspectJsonCompatibleStructuredValue(input, { label, ...limits });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      failure: {
        reason: 'structure',
        message: issue?.message ?? `${label} is invalid.`,
        ...(issue?.path.length ? { path: `$.${issue.path.join('.')}` } : {}),
      },
    };
  }
  for (const condition of collectConditions(parsed.data)) {
    const metrics = conditionMetrics(condition);
    if (metrics.depth > GRAPH_CONDITION_MAX_DEPTH) {
      return { ok: false, failure: { reason: 'condition-depth', message: `Graph conditions exceed depth ${GRAPH_CONDITION_MAX_DEPTH}.` } };
    }
    if (metrics.clauses > GRAPH_CONDITION_MAX_CLAUSES) {
      return { ok: false, failure: { reason: 'condition-clause-limit', message: `Graph conditions exceed ${GRAPH_CONDITION_MAX_CLAUSES} clauses.` } };
    }
  }
  return {
    ok: true,
    validated: {
      value: JSON.parse(inspection.serialized) as T,
      nodeCount: inspection.nodeCount,
      depth: inspection.depth,
      byteLength: inspection.byteLength,
    },
  };
}

const standardLimits = { maxNodes: 50_000, maxDepth: 96, maxBytes: 2_000_000 };

export const validateGraphDocument = (input: unknown) =>
  validateJsonContract(input, 'Graph document', documentSchema, standardLimits);
export const validateGraphDocumentV1 = (input: unknown) =>
  validateJsonContract(input, 'Graph V1 document', documentV1Schema, standardLimits);
export const validateGraphSource = (input: unknown) =>
  validateJsonContract(input, 'Graph source', sourceSchema, standardLimits);
export const validateGraphExpression = (input: unknown) =>
  validateJsonContract(input, 'Graph expression', expressionSchema, standardLimits);
export const validateGraphCondition = (input: unknown) =>
  validateJsonContract(input, 'Graph condition', conditionSchema, standardLimits);
export const validateGraphRelation = (input: unknown) =>
  validateJsonContract(input, 'Graph relation', relationSchema, standardLimits);
export const validateGraphPiecewise = (input: unknown) =>
  validateJsonContract(input, 'Graph piecewise', piecewiseSchema, standardLimits);
export const validateGraphParameter = (input: unknown) =>
  validateJsonContract(input, 'Graph parameter', parameterSchema, standardLimits);
export const validateGraphStopReason = (input: unknown) =>
  validateJsonContract(input, 'Graph stop reason', stopReasonSchema, standardLimits);
export const validateGraphViewport = (input: unknown) =>
  validateJsonContract(input, 'Graph viewport', viewportSchema, standardLimits);
export const validateGraphSurfaceState = (input: unknown) =>
  validateJsonContract(input, 'Graph surface state', surfaceSchema, standardLimits);
export const validateGraphSurfaceStateV1 = (input: unknown) =>
  validateJsonContract(input, 'Graph V1 surface state', surfaceV1Schema, standardLimits);
export const validateGraphRevisionSet = (input: unknown) =>
  validateJsonContract(input, 'Graph revision set', revisionsSchema, standardLimits);
export const validateGraphRendererCapabilities = (input: unknown) =>
  validateJsonContract(input, 'Graph renderer capabilities', rendererCapabilitiesSchema, standardLimits);
export const validateGraphRenderPolicy = (input: unknown) =>
  validateJsonContract(input, 'Graph render policy', renderPolicySchema, standardLimits);
export const validateGraphSampleRequest = (input: unknown) =>
  validateJsonContract(input, 'Graph sample request', sampleRequestSchema, standardLimits);

export const graphContractSchemas = {
  condition: conditionSchema,
  document: documentSchema,
  expression: expressionSchema,
  parameter: parameterSchema,
  piecewise: piecewiseSchema,
  relation: relationSchema,
  renderPolicy: renderPolicySchema,
  rendererCapabilities: rendererCapabilitiesSchema,
  revisions: revisionsSchema,
  sampleRequest: sampleRequestSchema,
  source: sourceSchema,
  stopReason: stopReasonSchema,
  surface: surfaceSchema,
  viewport: viewportSchema,
};

export type { SampledSceneSnapshotV2 };
