import { z } from 'zod';
import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV2,
} from '../../types/calculator';
import {
  validateSerializableMathJson,
  type MathJsonValidationFailure,
} from '../display/printer/math-json';
import { findCustomMathJsonOperator } from './standard-mathjson-operators';
import { inspectJsonCompatibleStructuredValue } from './structured-value';
import {
  CANONICAL_RESULT_MAX_BYTES,
  CANONICAL_RESULT_MAX_DEPTH,
  CANONICAL_RESULT_MAX_NODES,
  CANONICAL_RESULT_TABLE_MAX_HEADERS,
  CANONICAL_RESULT_TABLE_MAX_ROWS,
  canonicalResultMetadataSchemaV1,
  type CanonicalResultValidationFailure,
  type CanonicalResultValidationLimits,
} from './validation';

export type CanonicalResultMathReferenceV2 = {
  path: string;
  value: CanonicalMathValueV2;
};

export type ValidatedCanonicalResultDocumentV2 = {
  value: CanonicalResultDocumentV2;
  nodeCount: number;
  depth: number;
  byteLength: number;
  mathValueCount: number;
};

export type CanonicalResultValidationResultV2 =
  | { ok: true; validated: ValidatedCanonicalResultDocumentV2 }
  | { ok: false; failure: CanonicalResultValidationFailure };

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);
const finiteNumber = z.number().finite();
const nonnegativeInteger = z.number().int().nonnegative();
const oneBasedRow = z.number().int().positive();
const canonicalMathSchemaV2 = z.object({
  canonicalLatex: nonEmptyString,
  mathJson: z.unknown().refine((value) => value !== undefined, {
    message: 'V2 math values require producer-proven MathJSON.',
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

const primarySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('math'),
    value: canonicalMathSchemaV2,
  }).strict(),
  z.object({
    kind: z.literal('period-phase'),
    presentation: compoundPresentationSchema,
    normalizedEquation: canonicalMathSchemaV2,
    period: canonicalMathSchemaV2,
    phaseShift: canonicalMathSchemaV2,
  }).strict(),
  z.object({
    kind: z.literal('linear-map-profile'),
    presentation: compoundPresentationSchema,
    operand: canonicalMathSchemaV2,
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
    operandVectors: z.array(canonicalMathSchemaV2).min(1),
    independent: z.boolean(),
  }).strict(),
]);

const angleUnitSchema = z.enum(['deg', 'rad', 'grad']);
const knownTriangleQuantitySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('side'),
    name: z.enum(['a', 'b', 'c']),
    value: canonicalMathSchemaV2,
  }).strict(),
  z.object({
    kind: z.literal('angle'),
    name: z.enum(['A', 'B']),
    value: canonicalMathSchemaV2,
  }).strict(),
]);

const requestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('math'),
    value: canonicalMathSchemaV2,
  }).strict(),
  z.object({
    kind: z.literal('derivative-at-point'),
    presentationLatex: nonEmptyString,
    body: canonicalMathSchemaV2,
    appliedVariablePath: z.array(canonicalMathSchemaV2).min(1),
    point: canonicalMathSchemaV2,
  }).strict(),
  z.object({
    kind: z.literal('angle-conversion'),
    presentationLatex: nonEmptyString,
    value: canonicalMathSchemaV2,
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
  math: canonicalMathSchemaV2,
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
    factor: canonicalMathSchemaV2,
  }).strict(),
  z.object({
    kind: z.literal('eliminate'),
    targetRow: oneBasedRow,
    sourceRow: oneBasedRow,
    factor: canonicalMathSchemaV2,
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
  z.object({ kind: z.literal('math'), math: canonicalMathSchemaV2 }).strict(),
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
    math: canonicalMathSchemaV2,
    label: z.string().optional(),
  }).strict()),
}).strict();
const branchReadbackSchema = z.object({
  target: canonicalMathSchemaV2,
  relation: z.enum(['=', '\\in', '\\approx']),
  branches: z.array(canonicalMathSchemaV2),
  countLabel: z.enum(['roots', 'candidateRoots']).optional(),
  label: z.string().optional(),
  source: z.string().optional(),
}).strict();
const systemReadbackSchema = z.object({
  variables: z.array(canonicalMathSchemaV2),
  rows: z.array(z.object({
    values: z.array(canonicalMathSchemaV2),
    approxText: z.string().optional(),
  }).strict()),
  label: z.string().optional(),
  source: z.string().optional(),
}).strict();
const periodicFamilySchema = z.object({
  carrier: canonicalMathSchemaV2,
  parameter: canonicalMathSchemaV2,
  parameterConstraints: z.array(canonicalMathSchemaV2).optional(),
  branches: z.array(canonicalMathSchemaV2),
  discoveredFamilies: z.array(canonicalMathSchemaV2).optional(),
  representatives: z.array(z.object({
    label: z.string(),
    exact: canonicalMathSchemaV2.optional(),
    approxText: z.string().optional(),
  }).strict()).optional(),
  suggestedIntervals: z.array(z.object({
    label: z.string(),
    start: canonicalMathSchemaV2,
    end: canonicalMathSchemaV2,
  }).strict()).optional(),
  piecewiseBranches: z.array(z.object({
    condition: canonicalMathSchemaV2,
    result: canonicalMathSchemaV2,
  }).strict()).optional(),
  principalRange: canonicalMathSchemaV2.optional(),
  reducedCarrier: canonicalMathSchemaV2.optional(),
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
    math: canonicalMathSchemaV2.optional(),
  }).strict().refine((summary) => summary.text !== undefined || summary.math !== undefined).optional(),
}).strict();

const metadataSchema = canonicalResultMetadataSchemaV1
  .omit({ resolvedInput: true, variableSubstitutions: true })
  .extend({
    resolvedInput: canonicalMathSchemaV2.optional(),
    variableSubstitutions: z.array(z.object({
      name: z.string(),
      value: canonicalMathSchemaV2,
      numericValue: finiteNumber,
    }).strict()).optional(),
  })
  .strict();

const tableCellSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('value'),
    value: canonicalMathSchemaV2,
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
    x: canonicalMathSchemaV2,
    primary: tableCellSchema,
    secondary: tableCellSchema.optional(),
  }).strict()).max(CANONICAL_RESULT_TABLE_MAX_ROWS),
}).strict();

const canonicalResultDocumentSchemaV2 = z.object({
  version: z.literal(2),
  outcomeKind: z.enum(['success', 'error']),
  title: nonEmptyString,
  error: nonEmptyString.optional(),
  primary: primarySchema.optional(),
  request: requestSchema.optional(),
  answerRows: answerRowsSchema.optional(),
  branchReadback: branchReadbackSchema.optional(),
  systemReadback: systemReadbackSchema.optional(),
  periodicFamily: periodicFamilySchema.optional(),
  supplements: z.array(supplementSchema).optional(),
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
  mathJsonFailure?: MathJsonValidationFailure,
): CanonicalResultValidationResultV2 {
  return {
    ok: false,
    failure: {
      reason,
      message,
      ...(path ? { path } : {}),
      ...(mathJsonFailure ? { mathJsonFailure } : {}),
    },
  };
}

export function collectCanonicalResultMathValuesV2(
  document: CanonicalResultDocumentV2,
): CanonicalResultMathReferenceV2[] {
  const references: CanonicalResultMathReferenceV2[] = [];
  const visit = (value: unknown, path: string) => {
    if (value === null || typeof value !== 'object') return;
    if (!Array.isArray(value) && 'canonicalLatex' in value) {
      references.push({ path, value: value as CanonicalMathValueV2 });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, path + '[' + index + ']'));
      return;
    }
    Object.entries(value).forEach(([key, entry]) => visit(entry, path + '.' + key));
  };
  visit(document, '$');
  return references;
}

export function validateCanonicalResultDocumentV2(
  input: unknown,
  limits: CanonicalResultValidationLimits = {},
): CanonicalResultValidationResultV2 {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Canonical result V2',
    maxNodes: limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES,
    maxDepth: limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH,
    maxBytes: limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const cloned = JSON.parse(inspection.serialized) as unknown;
  const parsed = canonicalResultDocumentSchemaV2.safeParse(cloned);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(
      'invalid-shape',
      issue?.message ?? 'Canonical result V2 shape is invalid.',
      issue?.path.length ? '$.' + issue.path.join('.') : '$',
    );
  }

  const document = parsed.data as CanonicalResultDocumentV2;
  const mathValues = collectCanonicalResultMathValuesV2(document);
  for (const reference of mathValues) {
    const mathValidation = validateSerializableMathJson(reference.value.mathJson);
    if (!mathValidation.ok) {
      return fail(
        'invalid-math-json',
        mathValidation.failure.message,
        reference.path + '.mathJson',
        mathValidation.failure,
      );
    }
    const customOperator = findCustomMathJsonOperator(mathValidation.validated.value);
    if (customOperator) {
      return fail(
        'custom-math-json-operator',
        'Canonical result V2 uses the non-standard MathJSON operator ' + customOperator + '.',
        reference.path + '.mathJson',
      );
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
