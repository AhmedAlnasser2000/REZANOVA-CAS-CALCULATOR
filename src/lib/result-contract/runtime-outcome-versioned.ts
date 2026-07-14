import type {
  CanonicalMathValueV1,
  CanonicalMathValueV2,
  CanonicalRuntimeActionV1,
  CanonicalRuntimeActionV2,
  CanonicalRuntimeVersionedResultOutcome,
  RuntimeAdvisories,
} from '../../types/calculator';
import {
  CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS,
  CANONICAL_RUNTIME_OUTCOME_MAX_BYTES,
  CANONICAL_RUNTIME_OUTCOME_MAX_DEPTH,
  CANONICAL_RUNTIME_OUTCOME_MAX_NODES,
  validateRuntimeAdvisories,
} from './runtime-outcome-common';
import {
  inspectJsonCompatibleStructuredValue,
  type StructuredValueInspectionFailure,
} from './structured-value';
import {
  validateCanonicalResultDocumentV1,
  type CanonicalResultValidationFailure,
} from './validation';
import { validateCanonicalResultDocumentV2 } from './validation-v2';
import { validateCanonicalResultDocumentVersioned } from './validation-router';

const TRANSFER_TARGETS = new Set(['calculate', 'equation']);
const CORE_DRAFT_MODES = new Set(['geometry', 'trigonometry', 'statistics']);

export type CanonicalRuntimeVersionedValidationFailure = {
  reason:
    | 'invalid-outcome'
    | 'invalid-document'
    | 'invalid-action'
    | 'action-version-mismatch'
    | 'invalid-advisories'
    | StructuredValueInspectionFailure['reason'];
  message: string;
  path?: string;
  documentFailure?: CanonicalResultValidationFailure;
};

export type CanonicalRuntimeVersionedValidation =
  | {
      ok: true;
      validated: {
        value: CanonicalRuntimeVersionedResultOutcome;
        nodeCount: number;
        depth: number;
        byteLength: number;
      };
    }
  | { ok: false; failure: CanonicalRuntimeVersionedValidationFailure };

type Failure = Extract<CanonicalRuntimeVersionedValidation, { ok: false }>;

function fail(
  reason: CanonicalRuntimeVersionedValidationFailure['reason'],
  message: string,
  path?: string,
): Failure {
  return { ok: false, failure: { reason, message, ...(path ? { path } : {}) } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validateActionShape(value: Record<string, unknown>, path: string): Failure | undefined {
  if (value.kind === 'send') {
    if (!TRANSFER_TARGETS.has(String(value.target))) {
      return fail('invalid-action', 'Send actions require a supported target.', path + '.target');
    }
    return undefined;
  }
  if (value.kind === 'load-core-draft') {
    if (!CORE_DRAFT_MODES.has(String(value.mode))) {
      return fail('invalid-action', 'Core-draft actions require a supported mode.', path + '.mode');
    }
    return undefined;
  }
  return fail('invalid-action', 'Unsupported runtime action kind: ' + String(value.kind) + '.', path + '.kind');
}

function validateActionV1(
  value: unknown,
  index: number,
): { ok: true; value: CanonicalRuntimeActionV1 } | Failure {
  const path = '$.actions[' + index + ']';
  if (!isRecord(value)) {
    return fail('invalid-action', 'V1 runtime actions must be typed plain objects.', path);
  }
  if ('version' in value) {
    return fail(
      'action-version-mismatch',
      'V1 canonical documents require V1 runtime actions.',
      path + '.version',
    );
  }
  const keys = value.kind === 'send'
    ? ['kind', 'target', 'math']
    : ['kind', 'mode', 'math'];
  if (!hasOnlyKeys(value, keys)) {
    return fail('invalid-action', 'V1 runtime action shape is invalid.', path);
  }
  const shapeFailure = validateActionShape(value, path);
  if (shapeFailure) return shapeFailure;
  const mathValidation = validateCanonicalResultDocumentV1({
    version: 1,
    outcomeKind: 'success',
    title: 'Runtime action',
    primaryMath: value.math,
    warnings: [],
  });
  if (!mathValidation.ok || !mathValidation.validated.value.primaryMath) {
    return fail(
      'invalid-action',
      mathValidation.ok ? 'V1 runtime action math is missing.' : mathValidation.failure.message,
      path + '.math',
    );
  }
  const math = mathValidation.validated.value.primaryMath as CanonicalMathValueV1;
  return value.kind === 'send'
    ? {
        ok: true,
        value: {
          kind: 'send',
          target: value.target as 'calculate' | 'equation',
          math,
        },
      }
    : {
        ok: true,
        value: {
          kind: 'load-core-draft',
          mode: value.mode as 'geometry' | 'trigonometry' | 'statistics',
          math,
        },
      };
}

function validateActionV2(
  value: unknown,
  index: number,
): { ok: true; value: CanonicalRuntimeActionV2 } | Failure {
  const path = '$.actions[' + index + ']';
  if (!isRecord(value)) {
    return fail('invalid-action', 'V2 runtime actions must be typed plain objects.', path);
  }
  if (value.version !== 2) {
    return fail(
      'action-version-mismatch',
      'V2 canonical documents require explicitly versioned V2 runtime actions.',
      path + '.version',
    );
  }
  const keys = value.kind === 'send'
    ? ['version', 'kind', 'target', 'math']
    : ['version', 'kind', 'mode', 'math'];
  if (!hasOnlyKeys(value, keys)) {
    return fail('invalid-action', 'V2 runtime action shape is invalid.', path);
  }
  const shapeFailure = validateActionShape(value, path);
  if (shapeFailure) return shapeFailure;
  const mathValidation = validateCanonicalResultDocumentV2({
    version: 2,
    outcomeKind: 'success',
    title: 'Runtime action',
    primary: { kind: 'math', value: value.math },
    warnings: [],
  });
  const primary = mathValidation.ok ? mathValidation.validated.value.primary : undefined;
  if (!mathValidation.ok || primary?.kind !== 'math') {
    return fail(
      'invalid-action',
      mathValidation.ok ? 'V2 runtime action math is missing.' : mathValidation.failure.message,
      path + '.math',
    );
  }
  const math = primary.value as CanonicalMathValueV2;
  return value.kind === 'send'
    ? {
        ok: true,
        value: {
          version: 2,
          kind: 'send',
          target: value.target as 'calculate' | 'equation',
          math,
        },
      }
    : {
        ok: true,
        value: {
          version: 2,
          kind: 'load-core-draft',
          mode: value.mode as 'geometry' | 'trigonometry' | 'statistics',
          math,
        },
      };
}

export function validateCanonicalRuntimeVersionedResultOutcome(
  input: unknown,
): CanonicalRuntimeVersionedValidation {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Versioned canonical runtime result',
    maxNodes: CANONICAL_RUNTIME_OUTCOME_MAX_NODES,
    maxDepth: CANONICAL_RUNTIME_OUTCOME_MAX_DEPTH,
    maxBytes: CANONICAL_RUNTIME_OUTCOME_MAX_BYTES,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const value = JSON.parse(inspection.serialized) as unknown;
  if (
    !isRecord(value)
    || !['success', 'error'].includes(String(value.kind))
    || !hasOnlyKeys(value, ['kind', 'canonicalResult', 'actions', 'runtimeAdvisories'])
  ) {
    return fail('invalid-outcome', 'Versioned runtime result shape is invalid.', '$');
  }
  const document = validateCanonicalResultDocumentVersioned(value.canonicalResult);
  if (!document.ok) {
    return {
      ok: false,
      failure: {
        reason: 'invalid-document',
        message: document.failure.message,
        path: document.failure.path
          ? '$.canonicalResult' + document.failure.path.slice(1)
          : '$.canonicalResult',
        documentFailure: document.failure,
      },
    };
  }
  if (document.validated.value.outcomeKind !== value.kind) {
    return fail(
      'invalid-outcome',
      'Runtime kind must match the canonical result document outcome kind.',
      '$.kind',
    );
  }
  if (
    value.runtimeAdvisories !== undefined
    && !validateRuntimeAdvisories(value.runtimeAdvisories)
  ) {
    return fail('invalid-advisories', 'Runtime advisories are invalid.', '$.runtimeAdvisories');
  }

  let actions: Array<CanonicalRuntimeActionV1 | CanonicalRuntimeActionV2> | undefined;
  if (value.actions !== undefined) {
    if (!Array.isArray(value.actions) || value.actions.length > CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS) {
      return fail(
        'invalid-action',
        'Runtime outcomes support at most ' + CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS + ' actions.',
        '$.actions',
      );
    }
    actions = [];
    for (const [index, action] of value.actions.entries()) {
      const actionValidation = document.validated.value.version === 1
        ? validateActionV1(action, index)
        : validateActionV2(action, index);
      if (!actionValidation.ok) return actionValidation;
      actions.push(actionValidation.value);
    }
  }

  const runtimeAdvisories = value.runtimeAdvisories as RuntimeAdvisories | undefined;
  const normalized = {
    kind: value.kind as 'success' | 'error',
    canonicalResult: document.validated.value,
    ...(actions ? { actions } : {}),
    ...(runtimeAdvisories ? { runtimeAdvisories } : {}),
  } as CanonicalRuntimeVersionedResultOutcome;
  return {
    ok: true,
    validated: {
      value: normalized,
      nodeCount: inspection.nodeCount,
      depth: inspection.depth,
      byteLength: inspection.byteLength,
    },
  };
}
