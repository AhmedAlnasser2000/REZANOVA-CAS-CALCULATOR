import type {
  CanonicalMathValueV1,
  CanonicalRuntimeActionV1,
  CanonicalRuntimeOutcome,
  PromptOutcome,
  RuntimeAdvisories,
} from '../../types/calculator';
import {
  CANONICAL_RESULT_MAX_BYTES,
  CANONICAL_RESULT_MAX_DEPTH,
  CANONICAL_RESULT_MAX_NODES,
  validateCanonicalResultDocument,
  type CanonicalResultValidationFailure,
} from './validation';
import {
  inspectJsonCompatibleStructuredValue,
  type StructuredValueInspectionFailure,
} from './structured-value';

export const CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS = 64;
export const CANONICAL_RUNTIME_OUTCOME_MAX_NODES = CANONICAL_RESULT_MAX_NODES + 1_024;
export const CANONICAL_RUNTIME_OUTCOME_MAX_DEPTH = CANONICAL_RESULT_MAX_DEPTH + 1;
export const CANONICAL_RUNTIME_OUTCOME_MAX_BYTES = CANONICAL_RESULT_MAX_BYTES + 64_000;

const MODE_IDS = new Set([
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
const TRANSFER_TARGETS = new Set(['calculate', 'equation']);
const CORE_DRAFT_MODES = new Set(['geometry', 'trigonometry', 'statistics']);

export type CanonicalRuntimeOutcomeValidationFailure = {
  reason: 'invalid-outcome' | 'invalid-document' | 'invalid-action' | 'invalid-advisories'
    | StructuredValueInspectionFailure['reason'];
  message: string;
  path?: string;
  documentFailure?: CanonicalResultValidationFailure;
};

export type ValidatedCanonicalRuntimeOutcome = {
  value: CanonicalRuntimeOutcome;
  nodeCount: number;
  depth: number;
  byteLength: number;
};

export type CanonicalRuntimeOutcomeValidation =
  | { ok: true; validated: ValidatedCanonicalRuntimeOutcome }
  | { ok: false; failure: CanonicalRuntimeOutcomeValidationFailure };
type CanonicalRuntimeOutcomeValidationFailureResult = Extract<
  CanonicalRuntimeOutcomeValidation,
  { ok: false }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function fail(
  reason: CanonicalRuntimeOutcomeValidationFailure['reason'],
  message: string,
  path?: string,
): CanonicalRuntimeOutcomeValidationFailureResult {
  return { ok: false, failure: { reason, message, ...(path ? { path } : {}) } };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function validateAdvisories(value: unknown): value is RuntimeAdvisories {
  if (!isRecord(value) || !hasOnlyKeys(value, ['stopReason', 'equationNumericSolve'])) {
    return false;
  }
  if (value.stopReason !== undefined) {
    if (
      !isRecord(value.stopReason)
      || !hasOnlyKeys(value.stopReason, ['kind', 'source'])
      || !['invalid-request', 'planner-hard-stop', 'range-guard', 'unsupported-family']
        .includes(String(value.stopReason.kind))
      || !['planner', 'host', 'stage'].includes(String(value.stopReason.source))
    ) {
      return false;
    }
  }
  if (value.equationNumericSolve !== undefined) {
    const advisory = value.equationNumericSolve;
    if (!isRecord(advisory) || typeof advisory.kind !== 'string') return false;
    if (advisory.kind === 'blocked') {
      if (
        !hasOnlyKeys(advisory, ['kind', 'reason'])
        || !['range-guard', 'invalid-request'].includes(String(advisory.reason))
      ) {
        return false;
      }
    } else if (
      !['manual-only', 'suggest-on-error'].includes(advisory.kind)
      || !hasOnlyKeys(advisory, ['kind'])
    ) {
      return false;
    }
  }
  return true;
}

function validateActionMath(
  value: unknown,
  path: string,
): { ok: true; value: CanonicalMathValueV1 } | CanonicalRuntimeOutcomeValidationFailureResult {
  const validation = validateCanonicalResultDocument({
    version: 1,
    outcomeKind: 'success',
    title: 'Runtime action',
    primaryMath: value,
    warnings: [],
  });
  if (!validation.ok || !validation.validated.value.primaryMath) {
    return fail(
      'invalid-action',
      validation.ok ? 'Runtime action math is missing.' : validation.failure.message,
      path,
    );
  }
  return { ok: true, value: validation.validated.value.primaryMath };
}

function validateAction(
  value: unknown,
  index: number,
): { ok: true; value: CanonicalRuntimeActionV1 } | CanonicalRuntimeOutcomeValidationFailureResult {
  const path = `$.actions[${index}]`;
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return fail('invalid-action', 'Runtime actions must be typed plain objects.', path);
  }
  if (value.kind === 'send') {
    if (!hasOnlyKeys(value, ['kind', 'target', 'math']) || !TRANSFER_TARGETS.has(String(value.target))) {
      return fail('invalid-action', 'Send actions require a supported target and canonical math.', path);
    }
    const math = validateActionMath(value.math, `${path}.math`);
    if (!math.ok) return math;
    return {
      ok: true,
      value: {
        kind: 'send',
        target: value.target as 'calculate' | 'equation',
        math: math.value,
      },
    };
  }
  if (value.kind === 'load-core-draft') {
    if (!hasOnlyKeys(value, ['kind', 'mode', 'math']) || !CORE_DRAFT_MODES.has(String(value.mode))) {
      return fail('invalid-action', 'Core-draft actions require a supported mode and canonical math.', path);
    }
    const math = validateActionMath(value.math, `${path}.math`);
    if (!math.ok) return math;
    return {
      ok: true,
      value: {
        kind: 'load-core-draft',
        mode: value.mode as 'geometry' | 'trigonometry' | 'statistics',
        math: math.value,
      },
    };
  }
  return fail('invalid-action', `Unsupported runtime action kind: ${value.kind}.`, `${path}.kind`);
}

function validatePrompt(value: Record<string, unknown>): CanonicalRuntimeOutcomeValidation {
  if (!hasOnlyKeys(value, [
    'kind',
    'title',
    'message',
    'targetMode',
    'carryLatex',
    'warnings',
    'runtimeAdvisories',
  ])) {
    return fail('invalid-outcome', 'Prompt outcomes contain only declared control fields.', '$');
  }
  if (
    typeof value.title !== 'string'
    || value.title.trim().length === 0
    || typeof value.message !== 'string'
    || typeof value.carryLatex !== 'string'
    || !MODE_IDS.has(String(value.targetMode))
    || !isStringArray(value.warnings)
  ) {
    return fail('invalid-outcome', 'Prompt outcome shape is invalid.', '$');
  }
  if (value.runtimeAdvisories !== undefined && !validateAdvisories(value.runtimeAdvisories)) {
    return fail('invalid-advisories', 'Prompt runtime advisories are invalid.', '$.runtimeAdvisories');
  }
  return {
    ok: true,
    validated: {
      value: value as PromptOutcome,
      nodeCount: 0,
      depth: 0,
      byteLength: 0,
    },
  };
}

export function validateCanonicalRuntimeOutcome(
  input: unknown,
): CanonicalRuntimeOutcomeValidation {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Canonical runtime outcome',
    maxNodes: CANONICAL_RUNTIME_OUTCOME_MAX_NODES,
    maxDepth: CANONICAL_RUNTIME_OUTCOME_MAX_DEPTH,
    maxBytes: CANONICAL_RUNTIME_OUTCOME_MAX_BYTES,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const value = JSON.parse(inspection.serialized) as unknown;
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return fail('invalid-outcome', 'Canonical runtime outcome shape is invalid.', '$');
  }
  if (value.kind === 'prompt') {
    const prompt = validatePrompt(value);
    if (!prompt.ok) return prompt;
    return {
      ok: true,
      validated: { ...prompt.validated, ...inspection },
    };
  }
  if (
    !['success', 'error'].includes(value.kind)
    || !hasOnlyKeys(value, ['kind', 'canonicalResult', 'actions', 'runtimeAdvisories'])
  ) {
    return fail('invalid-outcome', 'Result outcomes contain only canonical result authority and transient runtime fields.', '$');
  }

  const document = validateCanonicalResultDocument(value.canonicalResult);
  if (!document.ok) {
    return {
      ok: false,
      failure: {
        reason: 'invalid-document',
        message: document.failure.message,
        path: document.failure.path
          ? `$.canonicalResult${document.failure.path.slice(1)}`
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
  if (value.runtimeAdvisories !== undefined && !validateAdvisories(value.runtimeAdvisories)) {
    return fail('invalid-advisories', 'Runtime advisories are invalid.', '$.runtimeAdvisories');
  }

  let actions: CanonicalRuntimeActionV1[] | undefined;
  if (value.actions !== undefined) {
    if (!Array.isArray(value.actions) || value.actions.length > CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS) {
      return fail(
        'invalid-action',
        `Runtime outcomes support at most ${CANONICAL_RUNTIME_OUTCOME_MAX_ACTIONS} actions.`,
        '$.actions',
      );
    }
    actions = [];
    for (const [index, action] of value.actions.entries()) {
      const validation = validateAction(action, index);
      if (!validation.ok) return validation;
      actions.push(validation.value);
    }
  }

  return {
    ok: true,
    validated: {
      value: {
        kind: value.kind as 'success' | 'error',
        canonicalResult: document.validated.value,
        ...(actions ? { actions } : {}),
        ...(value.runtimeAdvisories
          ? { runtimeAdvisories: value.runtimeAdvisories as RuntimeAdvisories }
          : {}),
      },
      nodeCount: inspection.nodeCount,
      depth: inspection.depth,
      byteLength: inspection.byteLength,
    },
  };
}

export function requireCanonicalRuntimeOutcome(input: unknown): CanonicalRuntimeOutcome {
  const validation = validateCanonicalRuntimeOutcome(input);
  if (!validation.ok) {
    throw new Error(
      `Canonical runtime outcome rejected ${validation.failure.reason}: ${validation.failure.message}`,
    );
  }
  return validation.validated.value;
}
