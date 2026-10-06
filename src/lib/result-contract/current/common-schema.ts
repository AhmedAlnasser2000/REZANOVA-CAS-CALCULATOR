import { z } from 'zod';
import { checkSpecialExpression } from './special-schema';
import { CANONICAL_RESULT_TABLE_MAX_HEADERS, CANONICAL_RESULT_TABLE_MAX_ROWS } from '../limits';

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);
const finiteNumber = z.number().finite();
const nonnegativeInteger = z.number().int().nonnegative();
const oneBasedRow = z.number().int().positive();
export const canonicalMathSchema = z.object({
  canonicalLatex: nonEmptyString,
  mathJson: z.unknown().refine((value) => value !== undefined, {
    message: 'Math values require producer-proven MathJSON.',
  }),
}).strict();

const presentationAnswerRowsSchema = z.object({
  label: z.string().optional(),
  rows: z.array(z.object({
    latex: nonEmptyString,
    label: z.string().optional(),
  }).strict()),
}).strict();

const compoundPresentationSchema = z.object({
  primaryLatex: nonEmptyString,
  answerRows: presentationAnswerRowsSchema.optional(),
}).strict();

export const ordinaryPrimarySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('math'),
    value: canonicalMathSchema,
  }).strict(),
  z.object({
    kind: z.literal('period-phase'),
    presentation: compoundPresentationSchema,
    normalizedEquation: canonicalMathSchema,
    period: canonicalMathSchema,
    phaseShift: canonicalMathSchema,
  }).strict(),
  z.object({
    kind: z.literal('linear-map-profile'),
    presentation: compoundPresentationSchema,
    operand: canonicalMathSchema,
    domainDimension: nonnegativeInteger,
    codomainDimension: nonnegativeInteger,
    rank: nonnegativeInteger,
    nullity: nonnegativeInteger,
  }).strict().superRefine((profile, context) => {
    if (profile.rank > Math.min(profile.domainDimension, profile.codomainDimension)) {
      context.addIssue({
        code: 'custom',
        path: ['rank'],
        message: 'Linear-map rank cannot exceed either dimension.',
      });
    }
    if (profile.nullity !== profile.domainDimension - profile.rank) {
      context.addIssue({
        code: 'custom',
        path: ['nullity'],
        message: 'Linear-map nullity must satisfy rank-nullity.',
      });
    }
  }),
  z.object({
    kind: z.literal('linear-independence'),
    presentation: compoundPresentationSchema,
    operandVectors: z.array(canonicalMathSchema).min(1),
    independent: z.boolean(),
  }).strict(),
]);

const angleUnitSchema = z.enum(['deg', 'rad', 'grad']);
const knownTriangleQuantitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('side'),
    name: z.enum(['a', 'b', 'c']),
    value: canonicalMathSchema,
  }).strict(),
  z.object({
    kind: z.literal('angle'),
    name: z.enum(['A', 'B']),
    value: canonicalMathSchema,
  }).strict(),
]);

const requestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('math'),
    value: canonicalMathSchema,
  }).strict(),
  z.object({
    kind: z.literal('derivative-at-point'),
    presentationLatex: nonEmptyString,
    body: canonicalMathSchema,
    appliedVariablePath: z.array(canonicalMathSchema).min(1),
    point: canonicalMathSchema,
  }).strict(),
  z.object({
    kind: z.literal('angle-conversion'),
    presentationLatex: nonEmptyString,
    value: canonicalMathSchema,
    fromUnit: angleUnitSchema,
    toUnit: angleUnitSchema,
  }).strict().superRefine((conversion, context) => {
    if (conversion.fromUnit === conversion.toUnit) {
      context.addIssue({
        code: 'custom',
        path: ['toUnit'],
        message: 'Angle conversion units must differ.',
      });
    }
  }),
  z.object({
    kind: z.literal('right-triangle'),
    presentationLatex: nonEmptyString,
    angleUnit: angleUnitSchema,
    knownQuantities: z.array(knownTriangleQuantitySchema).min(2).max(5),
  }).strict().superRefine((request, context) => {
    const names = request.knownQuantities.map((quantity) => quantity.name);
    if (new Set(names).size !== names.length) {
      context.addIssue({
        code: 'custom',
        path: ['knownQuantities'],
        message: 'Right-triangle known quantities must be unique.',
      });
    }
  }),
]);

const supplementSchema = z.object({
  role: z.enum(['general', 'exclusion', 'condition', 'parameter-constraint']),
  presentationLatex: nonEmptyString,
  math: canonicalMathSchema,
}).strict();

const rowOperationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('swap'),
    firstRow: oneBasedRow,
    secondRow: oneBasedRow,
  }).strict().superRefine((operation, context) => {
    if (operation.firstRow === operation.secondRow) {
      context.addIssue({
        code: 'custom',
        path: ['secondRow'],
        message: 'A row swap requires two distinct rows.',
      });
    }
  }),
  z.object({
    kind: z.literal('scale'),
    row: oneBasedRow,
    factor: canonicalMathSchema,
  }).strict(),
  z.object({
    kind: z.literal('eliminate'),
    targetRow: oneBasedRow,
    sourceRow: oneBasedRow,
    factor: canonicalMathSchema,
  }).strict().superRefine((operation, context) => {
    if (operation.targetRow === operation.sourceRow) {
      context.addIssue({
        code: 'custom',
        path: ['sourceRow'],
        message: 'Row elimination requires distinct source and target rows.',
      });
    }
  }),
]);

const detailPartSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string() }).strict(),
  z.object({ kind: z.literal('math'), math: canonicalMathSchema }).strict(),
  z.object({ kind: z.literal('special-function'), expression: z.unknown().superRefine((value, ctx) => {
    try { checkSpecialExpression(value, '$.details.expression'); }
    catch { ctx.addIssue({ code: 'custom', message: 'Invalid typed special-function detail.' }); }
  }) }).strict(),
  z.object({
    kind: z.literal('row-operation'),
    presentationLatex: nonEmptyString,
    operation: rowOperationSchema,
  }).strict(),
]);
const detailLinesSchema = z.array(z.array(detailPartSchema).min(1));
const detailSectionSchema = z.object({
  title: nonEmptyString,
  lines: detailLinesSchema,
}).strict();
const answerRowsSchema = z.object({
  label: z.string().optional(),
  rows: z.array(z.object({
    math: canonicalMathSchema,
    label: z.string().optional(),
  }).strict()),
}).strict();
const branchReadbackSchema = z.object({
  target: canonicalMathSchema,
  relation: z.enum(['=', '\\in', '\\approx']),
  branches: z.array(canonicalMathSchema),
  countLabel: z.enum(['roots', 'candidateRoots']).optional(),
  label: z.string().optional(),
  source: z.string().optional(),
}).strict();
const systemReadbackSchema = z.object({
  variables: z.array(canonicalMathSchema),
  rows: z.array(z.object({
    values: z.array(canonicalMathSchema),
    approxText: z.string().optional(),
  }).strict()),
  label: z.string().optional(),
  source: z.string().optional(),
}).strict();
const periodicFamilySchema = z.object({
  carrier: canonicalMathSchema,
  parameter: canonicalMathSchema,
  parameterConstraints: z.array(canonicalMathSchema).optional(),
  branches: z.array(canonicalMathSchema),
  discoveredFamilies: z.array(canonicalMathSchema).optional(),
  representatives: z.array(z.object({
    label: z.string(),
    exact: canonicalMathSchema.optional(),
    approxText: z.string().optional(),
  }).strict()).optional(),
  suggestedIntervals: z.array(z.object({
    label: z.string(),
    start: canonicalMathSchema,
    end: canonicalMathSchema,
  }).strict()).optional(),
  piecewiseBranches: z.array(z.object({
    condition: canonicalMathSchema,
    result: canonicalMathSchema,
  }).strict()).optional(),
  principalRange: canonicalMathSchema.optional(),
  reducedCarrier: canonicalMathSchema.optional(),
  structuredStopReason: z.enum([
    'second-periodic-parameter',
    'outside-principal-range',
    'unsupported-sawtooth-closure',
    'multi-parameter-periodic-family',
    'periodic-depth-cap',
    'unmerged-periodic-branches',
  ]).optional(),
}).strict();
const summariesSchema = z.object({
  solve: detailLinesSchema.optional(),
  transform: z.object({
    text: z.string().optional(),
    math: canonicalMathSchema.optional(),
  }).strict().refine((summary) => summary.text !== undefined || summary.math !== undefined).optional(),
}).strict();

const substitutionDiagnosticsSchema = z.object({
  family: z.enum([
    'trig-polynomial',
    'exp-polynomial',
    'inverse-isolation',
    'same-base-equality',
    'log-same-base',
    'log-quotient',
    'log-mixed-base',
    'log-mixed-base-rational',
    'trig-sum-product',
  ]),
  carrierKind: z.enum(['sin', 'cos', 'tan', 'exp', 'power', 'ln', 'log']),
  polynomialDegree: z.union([z.literal(1), z.literal(2)]).optional(),
  branchCount: z.number().int().nonnegative(),
  filteredBranchCount: z.number().int().nonnegative(),
}).strict();
const trustEvidenceSchema = z.object({
  classification: z.enum([
    'certified-polynomial-roots',
    'local-numeric-roots',
    'bounded-search-approximate-roots',
    'global-complex-polynomial-roots',
    'global-complex-rational-roots',
    'region-local-complex-roots',
  ]),
  text: nonEmptyString,
  interval: z.object({
    start: nonEmptyString,
    end: nonEmptyString,
  }).strict().optional(),
}).strict();
const metadataSchema = z.object({
  answerMode: z.enum(['exact', 'approximate', 'isolate']).optional(),
  answerDomain: z.enum(['real', 'complex', 'conditional-real', 'unknown-domain']).optional(),
  solutionKind: z.enum([
    'exact-symbolic',
    'approximate-numeric',
    'isolate-formula',
    'inequality-solution-set',
    'condition-fact-only-stop',
  ]).optional(),
  resultOrigin: z.enum([
    'symbolic',
    'numeric-fallback',
    'rule-based-symbolic',
    'heuristic-symbolic',
    'symbolic-engine',
    'compute-engine',
    'exact-special-angle',
    'numeric',
    'triangle-solver',
    'geometry-formula',
    'geometry-coordinate',
  ]).optional(),
  calculusStrategy: z.enum([
    'direct-rule',
    'inverse-trig',
    'derivative-ratio',
    'partial-fractions',
    'u-substitution',
    'integration-by-parts',
    'affine-linear',
    'compute-engine',
  ]).optional(),
  calculusDerivativeStrategies: z.array(z.enum([
    'direct-rule',
    'chain-rule',
    'product-rule',
    'quotient-rule',
    'general-power',
    'function-power',
    'inverse-trig',
    'inverse-hyperbolic',
    'compute-engine',
  ])).optional(),
  plannerBadges: z.array(z.enum([
    'Canonicalized',
    'Reduced Derivative',
    'Reduced Partial',
    'Reduced Numeric Operator',
    'Compacted Repeated Factors',
    'Trig Solve Backend',
    'Hard Stop',
  ])).optional(),
  solveBadges: z.array(z.enum([
    'Reciprocal Rewrite',
    'Principal Range',
    'Outer Inversion',
    'Composition Branch',
    'Nested Recursion',
    'Periodic Family',
    'Parameterized Family',
    'Trig Rewrite',
    'Trig Square Split',
    'Trig Sum-Product',
    'Log Combine',
    'Log Quotient',
    'Log Base Normalize',
    'Same-Base Equality',
    'LCD Clear',
    'Radical Isolation',
    'Root Isolation',
    'Power Lift',
    'Conjugate Transform',
    'Symbolic Substitution',
    'Inverse Isolation',
    'Numeric Interval',
    'Candidate Checked',
    'Range Guard',
  ])).optional(),
  transformBadges: z.array(z.enum([
    'Rewrite as Root',
    'Rewrite as Power',
    'Change Base',
    'Combine Fractions',
    'Cancel Factors',
    'Use LCD',
    'Rationalize',
    'Conjugate',
  ])).optional(),
  resolvedInput: canonicalMathSchema.optional(),
  candidateValues: z.array(finiteNumber).optional(),
  rejectedCandidateCount: z.number().int().nonnegative().optional(),
  substitutionDiagnostics: substitutionDiagnosticsSchema.optional(),
  numericMethod: z.string().optional(),
  trustEvidence: z.array(trustEvidenceSchema).max(16).optional(),
  sourceMode: z.enum([
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
  ]).optional(),
  variableSubstitutions: z.array(z.object({
    name: z.string(),
    value: canonicalMathSchema,
    numericValue: finiteNumber,
  }).strict()).optional(),
}).strict();
const tableCellSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('value'),
    value: canonicalMathSchema,
  }).strict(),
  z.object({
    kind: z.literal('undefined'),
    reason: z.enum(['outside-real-domain', 'pole']),
    presentationLatex: nonEmptyString,
  }).strict(),
]);
const tableSchema = z.object({
  headers: z.array(z.string()).max(CANONICAL_RESULT_TABLE_MAX_HEADERS),
  rows: z.array(z.object({
    x: canonicalMathSchema,
    primary: tableCellSchema,
    secondary: tableCellSchema.optional(),
  }).strict()).max(CANONICAL_RESULT_TABLE_MAX_ROWS),
}).strict();

export const canonicalResultEnvelopeSchema = z.object({
  version: z.literal(7),
  outcomeKind: z.enum(['success', 'error']),
  title: nonEmptyString,
  error: nonEmptyString.optional(),
  primary: z.unknown().optional(),
  request: requestSchema.optional(),
  answerRows: answerRowsSchema.optional(),
  branchReadback: branchReadbackSchema.optional(),
  systemReadback: systemReadbackSchema.optional(),
  periodicFamily: periodicFamilySchema.optional(),
  supplements: z.array(supplementSchema).optional(),
  integrationRestrictions: z.unknown().optional(),
  approximations: z.object({ primary: z.string().optional() }).strict().optional(),
  details: z.array(detailSectionSchema).optional(),
  summaries: summariesSchema.optional(),
  warnings: z.array(z.string()),
  metadata: metadataSchema.optional(),
  table: tableSchema.optional(),
}).strict().superRefine((document, context) => {
  if (document.outcomeKind === 'error' && document.error === undefined) {
    context.addIssue({ code: 'custom', path: ['error'], message: 'Error documents require error text.' });
  }
  if (document.outcomeKind === 'success' && document.error !== undefined) {
    context.addIssue({ code: 'custom', path: ['error'], message: 'Success documents cannot carry error text.' });
  }
});
