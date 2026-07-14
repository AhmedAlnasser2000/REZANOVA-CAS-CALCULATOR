import { z } from 'zod';
import type {
  CanonicalMathValueV1,
  CanonicalResultDocumentV1,
} from '../../types/calculator';
import {
  validateSerializableMathJson,
  type MathJsonValidationFailure,
} from '../display/printer/math-json';
import { inspectJsonCompatibleStructuredValue } from './structured-value';

export const CANONICAL_RESULT_MAX_NODES = 10_000;
export const CANONICAL_RESULT_MAX_DEPTH = 64;
export const CANONICAL_RESULT_MAX_BYTES = 640_000;
export const CANONICAL_RESULT_TABLE_MAX_HEADERS = 16;
export const CANONICAL_RESULT_TABLE_MAX_ROWS = 100;

export type CanonicalResultValidationLimits = {
  maxNodes?: number;
  maxDepth?: number;
  maxBytes?: number;
};

export type CanonicalResultValidationFailure = {
  reason:
    | 'invalid-root'
    | 'unsupported-value'
    | 'non-finite-number'
    | 'non-plain-object'
    | 'cyclic-value'
    | 'node-limit'
    | 'depth-limit'
    | 'byte-limit'
    | 'invalid-shape'
    | 'invalid-math-json';
  message: string;
  path?: string;
  mathJsonFailure?: MathJsonValidationFailure;
};

export type ValidatedCanonicalResultDocument = {
  value: CanonicalResultDocumentV1;
  nodeCount: number;
  depth: number;
  byteLength: number;
  mathValueCount: number;
};

export type CanonicalResultValidationResult =
  | { ok: true; validated: ValidatedCanonicalResultDocument }
  | { ok: false; failure: CanonicalResultValidationFailure };

export type CanonicalResultMathReference = {
  path: string;
  value: CanonicalMathValueV1;
};

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);
const finiteNumber = z.number().finite();
const canonicalMathSchema = z.object({
  canonicalLatex: nonEmptyString,
  mathJson: z.unknown().optional(),
}).strict();
const detailPartSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string() }).strict(),
  z.object({ kind: z.literal('math'), math: canonicalMathSchema }).strict(),
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
const tableSchema = z.object({
  headers: z.array(z.string()).max(CANONICAL_RESULT_TABLE_MAX_HEADERS),
  rows: z.array(z.object({
    x: canonicalMathSchema,
    primary: canonicalMathSchema,
    secondary: canonicalMathSchema.optional(),
  }).strict()).max(CANONICAL_RESULT_TABLE_MAX_ROWS),
}).strict();

const canonicalResultDocumentSchema = z.object({
  version: z.literal(1),
  outcomeKind: z.enum(['success', 'error']),
  title: nonEmptyString,
  error: nonEmptyString.optional(),
  primaryMath: canonicalMathSchema.optional(),
  answerRows: answerRowsSchema.optional(),
  branchReadback: branchReadbackSchema.optional(),
  systemReadback: systemReadbackSchema.optional(),
  periodicFamily: periodicFamilySchema.optional(),
  supplements: z.array(canonicalMathSchema).optional(),
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

function fail(
  reason: CanonicalResultValidationFailure['reason'],
  message: string,
  path?: string,
): CanonicalResultValidationResult {
  return { ok: false, failure: { reason, message, ...(path ? { path } : {}) } };
}

export function collectCanonicalResultMathValues(
  document: CanonicalResultDocumentV1,
): CanonicalResultMathReference[] {
  const references: CanonicalResultMathReference[] = [];
  const visit = (value: unknown, path: string) => {
    if (value === null || typeof value !== 'object') return;
    if (!Array.isArray(value) && 'canonicalLatex' in value) {
      references.push({ path, value: value as CanonicalMathValueV1 });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    Object.entries(value).forEach(([key, entry]) => visit(entry, `${path}.${key}`));
  };
  visit(document, '$');
  return references;
}

export function validateCanonicalResultDocument(
  input: unknown,
  limits: CanonicalResultValidationLimits = {},
): CanonicalResultValidationResult {
  const resolvedLimits = {
    maxNodes: limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES,
    maxDepth: limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH,
    maxBytes: limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES,
  };
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Canonical result',
    ...resolvedLimits,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const cloned = JSON.parse(inspection.serialized) as unknown;
  const parsed = canonicalResultDocumentSchema.safeParse(cloned);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(
      'invalid-shape',
      issue?.message ?? 'Canonical result shape is invalid.',
      issue?.path.length ? `$.${issue.path.join('.')}` : '$',
    );
  }

  const document = parsed.data as CanonicalResultDocumentV1;
  const mathValues = collectCanonicalResultMathValues(document);
  for (const reference of mathValues) {
    if (reference.value.mathJson === undefined) continue;
    const mathValidation = validateSerializableMathJson(reference.value.mathJson);
    if (!mathValidation.ok) {
      return {
        ok: false,
        failure: {
          reason: 'invalid-math-json',
          message: mathValidation.failure.message,
          path: `${reference.path}.mathJson`,
          mathJsonFailure: mathValidation.failure,
        },
      };
    }
  }

  return {
    ok: true,
    validated: {
      value: document,
      nodeCount: inspection.nodeCount,
      depth: inspection.depth,
      byteLength: inspection.byteLength,
      mathValueCount: mathValues.length,
    },
  };
}
