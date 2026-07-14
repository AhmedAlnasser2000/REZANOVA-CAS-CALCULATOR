import { z } from 'zod';
import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV3,
} from '../../types/calculator';
import { inspectJsonCompatibleStructuredValue } from './structured-value';
import {
  CANONICAL_RESULT_MAX_BYTES,
  CANONICAL_RESULT_MAX_DEPTH,
  CANONICAL_RESULT_MAX_NODES,
  type CanonicalResultValidationFailure,
  type CanonicalResultValidationLimits,
} from './validation';
import { validateCanonicalResultDocumentV2 } from './validation-v2';

export type CanonicalResultMathReferenceV3 = {
  path: string;
  value: CanonicalMathValueV2;
};

export type ValidatedCanonicalResultDocumentV3 = {
  value: CanonicalResultDocumentV3;
  nodeCount: number;
  depth: number;
  byteLength: number;
  mathValueCount: number;
};

export type CanonicalResultValidationResultV3 =
  | { ok: true; validated: ValidatedCanonicalResultDocumentV3 }
  | { ok: false; failure: CanonicalResultValidationFailure };

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);
const canonicalMathShape = z.object({
  canonicalLatex: nonEmptyString,
  mathJson: z.unknown().refine((value) => value !== undefined, {
    message: 'V3 math values require producer-proven MathJSON.',
  }),
}).strict();
const presentationAnswerRowsShape = z.object({
  label: z.string().optional(),
  rows: z.array(z.object({
    latex: nonEmptyString,
    label: z.string().optional(),
  }).strict()),
}).strict();
const angleQuantityPrimaryShape = z.object({
  kind: z.literal('angle-quantity'),
  presentation: z.object({
    primaryLatex: nonEmptyString,
    answerRows: presentationAnswerRowsShape.optional(),
  }).strict(),
  magnitude: canonicalMathShape,
  unit: z.enum(['deg', 'rad', 'grad']),
}).strict();

function fail(
  reason: CanonicalResultValidationFailure['reason'],
  message: string,
  path?: string,
): CanonicalResultValidationResultV3 {
  return {
    ok: false,
    failure: { reason, message, ...(path ? { path } : {}) },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function v3FailurePath(path: string | undefined, angleQuantity: boolean) {
  if (!angleQuantity || !path) return path;
  return path.replace('$.primary.value', '$.primary.magnitude');
}

export function collectCanonicalResultMathValuesV3(
  document: CanonicalResultDocumentV3,
): CanonicalResultMathReferenceV3[] {
  const references: CanonicalResultMathReferenceV3[] = [];
  const visit = (value: unknown, path: string) => {
    if (value === null || typeof value !== 'object') return;
    if (!Array.isArray(value) && 'canonicalLatex' in value) {
      references.push({ path, value: value as CanonicalMathValueV2 });
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

export function validateCanonicalResultDocumentV3(
  input: unknown,
  limits: CanonicalResultValidationLimits = {},
): CanonicalResultValidationResultV3 {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Canonical result V3',
    maxNodes: limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES,
    maxDepth: limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH,
    maxBytes: limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const cloned = JSON.parse(inspection.serialized) as unknown;
  if (!isRecord(cloned) || cloned.version !== 3) {
    return fail('invalid-shape', 'Canonical result V3 requires version 3.', '$.version');
  }

  const primary = cloned.primary;
  const isAngleQuantity = isRecord(primary) && primary.kind === 'angle-quantity';
  let v2Primary = primary;
  if (isAngleQuantity) {
    const parsedPrimary = angleQuantityPrimaryShape.safeParse(primary);
    if (!parsedPrimary.success) {
      const issue = parsedPrimary.error.issues[0];
      return fail(
        'invalid-shape',
        issue?.message ?? 'Canonical angle quantity shape is invalid.',
        issue?.path.length ? `$.primary.${issue.path.join('.')}` : '$.primary',
      );
    }
    v2Primary = { kind: 'math', value: parsedPrimary.data.magnitude };
  }

  const v2Candidate = {
    ...cloned,
    version: 2,
    ...(primary === undefined ? {} : { primary: v2Primary }),
  };
  const commonValidation = validateCanonicalResultDocumentV2(v2Candidate, limits);
  if (!commonValidation.ok) {
    return {
      ok: false,
      failure: {
        ...commonValidation.failure,
        ...(commonValidation.failure.path
          ? { path: v3FailurePath(commonValidation.failure.path, isAngleQuantity) }
          : {}),
      },
    };
  }

  const document = cloned as CanonicalResultDocumentV3;
  return {
    ok: true,
    validated: {
      value: document,
      nodeCount: inspection.nodeCount,
      depth: inspection.depth,
      byteLength: inspection.byteLength,
      mathValueCount: collectCanonicalResultMathValuesV3(document).length,
    },
  };
}
