import type { ResultProducerDraft } from '../../../types/calculator';
import { proseSolveSummary } from '../../display/result-detail-lines';
import { attachRuntimeEnvelope } from '../../kernel/runtime-envelope';
import {
  inspectJsonCompatibleStructuredValue,
} from '../../result-contract';
import { attachEquationAnalysisEvidence } from '../analysis-evidence';
import {
  buildEquationSolveResultFromProducerDraft,
  type EquationSolveResultBuildFailure,
} from './producer-adapter';
import {
  EQUATION_SOLVE_RESULT_MAX_BYTES,
  EQUATION_SOLVE_RESULT_MAX_DEPTH,
  EQUATION_SOLVE_RESULT_MAX_NODES,
  type EquationSolveResultContractV1,
} from './contract';
import { validateEquationSolveResultContract } from './validation';
import { readEquationProducerDraftFromCanonicalResult } from './stage-carrier';

export const EQUATION_OUTCOME_BOUNDARY_VERSION = 1 as const;
export const EQUATION_OUTCOME_BOUNDARY_MAX_NODES = EQUATION_SOLVE_RESULT_MAX_NODES + 32;
export const EQUATION_OUTCOME_BOUNDARY_MAX_DEPTH = EQUATION_SOLVE_RESULT_MAX_DEPTH + 1;
export const EQUATION_OUTCOME_BOUNDARY_MAX_BYTES = EQUATION_SOLVE_RESULT_MAX_BYTES + 4_096;

export type EquationResultOutcomeBoundaryV1 = {
  version: typeof EQUATION_OUTCOME_BOUNDARY_VERSION;
  kind: 'result';
  result: EquationSolveResultContractV1;
  runtimeAdvisories?: ResultProducerDraft['runtimeAdvisories'];
};

export type EquationCancelledOutcomeBoundaryV1 = {
  version: typeof EQUATION_OUTCOME_BOUNDARY_VERSION;
  kind: 'cancelled';
  reason: string;
};

export type EquationOutcomeBoundaryV1 =
  | EquationResultOutcomeBoundaryV1
  | EquationCancelledOutcomeBoundaryV1;

export type EquationOutcomeBoundaryValidationFailure = {
  reason: 'invalid-boundary' | 'invalid-result';
  message: string;
  path?: string;
};

export type EquationOutcomeBoundaryValidation =
  | { ok: true; boundary: EquationOutcomeBoundaryV1 }
  | { ok: false; failure: EquationOutcomeBoundaryValidationFailure };

export type EquationOutcomeBoundaryProjectionFailure =
  | { reason: 'prompt-outcome'; message: string }
  | { reason: 'unsupported-action'; message: string }
  | {
      reason: 'solve-result';
      message: string;
      cause: EquationSolveResultBuildFailure;
    };

export type EquationOutcomeBoundaryProjection =
  | { ok: true; boundary: EquationResultOutcomeBoundaryV1 }
  | { ok: false; failure: EquationOutcomeBoundaryProjectionFailure };

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRuntimeAdvisories(value: unknown): value is NonNullable<ResultProducerDraft['runtimeAdvisories']> {
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
    if (!isRecord(advisory) || typeof advisory.kind !== 'string') {
      return false;
    }
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

function compactRuntimeAdvisories(
  advisories: NonNullable<ResultProducerDraft['runtimeAdvisories']>,
): NonNullable<ResultProducerDraft['runtimeAdvisories']> | undefined {
  const compacted: NonNullable<ResultProducerDraft['runtimeAdvisories']> = {
    ...(advisories.stopReason
      ? {
          stopReason: {
            kind: advisories.stopReason.kind,
            source: advisories.stopReason.source,
          },
        }
      : {}),
    ...(advisories.equationNumericSolve
      ? {
          equationNumericSolve: advisories.equationNumericSolve.kind === 'blocked'
            ? {
                kind: advisories.equationNumericSolve.kind,
                reason: advisories.equationNumericSolve.reason,
              }
            : { kind: advisories.equationNumericSolve.kind },
        }
      : {}),
  };
  return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function invalidBoundary(message: string, path?: string): EquationOutcomeBoundaryValidation {
  return {
    ok: false,
    failure: { reason: 'invalid-boundary', message, ...(path ? { path } : {}) },
  };
}

export function validateEquationOutcomeBoundary(
  input: unknown,
): EquationOutcomeBoundaryValidation {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Equation outcome boundary',
    maxNodes: EQUATION_OUTCOME_BOUNDARY_MAX_NODES,
    maxDepth: EQUATION_OUTCOME_BOUNDARY_MAX_DEPTH,
    maxBytes: EQUATION_OUTCOME_BOUNDARY_MAX_BYTES,
  });
  if (!inspection.ok) {
    return invalidBoundary(inspection.failure.message, inspection.failure.path);
  }

  const parsed = JSON.parse(inspection.serialized) as unknown;
  if (!isRecord(parsed) || parsed.version !== EQUATION_OUTCOME_BOUNDARY_VERSION) {
    return invalidBoundary('Equation outcome boundary version is invalid.', '$.version');
  }
  if (parsed.kind === 'cancelled') {
    if (
      !hasOnlyKeys(parsed, ['version', 'kind', 'reason'])
      || typeof parsed.reason !== 'string'
      || parsed.reason.trim().length === 0
      || parsed.reason.length > 4_096
    ) {
      return invalidBoundary('Equation cancellation boundary is invalid.', '$');
    }
    return { ok: true, boundary: parsed as EquationCancelledOutcomeBoundaryV1 };
  }
  if (
    parsed.kind !== 'result'
    || !hasOnlyKeys(parsed, ['version', 'kind', 'result', 'runtimeAdvisories'])
  ) {
    return invalidBoundary('Equation result boundary shape is invalid.', '$');
  }
  if (
    parsed.runtimeAdvisories !== undefined
    && !isRuntimeAdvisories(parsed.runtimeAdvisories)
  ) {
    return invalidBoundary('Equation runtime advisories are invalid.', '$.runtimeAdvisories');
  }

  const resultValidation = validateEquationSolveResultContract(parsed.result);
  if (!resultValidation.ok) {
    return {
      ok: false,
      failure: {
        reason: 'invalid-result',
        message: resultValidation.failure.message,
        ...(resultValidation.failure.path ? { path: resultValidation.failure.path } : {}),
      },
    };
  }
  return {
    ok: true,
    boundary: {
      version: EQUATION_OUTCOME_BOUNDARY_VERSION,
      kind: 'result',
      result: resultValidation.validated.value,
      ...(parsed.runtimeAdvisories
        ? { runtimeAdvisories: parsed.runtimeAdvisories }
        : {}),
    },
  };
}

export function validateEquationResultOutcomeBoundary(
  input: unknown,
):
  | { ok: true; boundary: EquationResultOutcomeBoundaryV1 }
  | { ok: false; failure: EquationOutcomeBoundaryValidationFailure } {
  const validation = validateEquationOutcomeBoundary(input);
  if (!validation.ok) return validation;
  if (validation.boundary.kind !== 'result') {
    return {
      ok: false,
      failure: {
        reason: 'invalid-boundary',
        message: 'A completed Equation worker message requires a result boundary.',
        path: '$.kind',
      },
    };
  }
  return { ok: true, boundary: validation.boundary };
}

export function buildEquationOutcomeBoundaryFromProducer(
  outcome: ResultProducerDraft,
): EquationOutcomeBoundaryProjection {
  if (outcome.kind === 'prompt') {
    return {
      ok: false,
      failure: {
        reason: 'prompt-outcome',
        message: 'Equation prompts are control flow and cannot cross the solve-result boundary.',
      },
    };
  }
  if (outcome.actions?.length) {
    return {
      ok: false,
      failure: {
        reason: 'unsupported-action',
        message: 'Equation result actions require an explicit transient boundary contract.',
      },
    };
  }

  const projected = buildEquationSolveResultFromProducerDraft(outcome);
  if (!projected.ok) {
    return {
      ok: false,
      failure: {
        reason: 'solve-result',
        message: projected.failure.message,
        cause: projected.failure,
      },
    };
  }
  const runtimeAdvisories = outcome.runtimeAdvisories
    ? compactRuntimeAdvisories(outcome.runtimeAdvisories)
    : undefined;

  return {
    ok: true,
    boundary: {
      version: EQUATION_OUTCOME_BOUNDARY_VERSION,
      kind: 'result',
      result: projected.result,
      ...(runtimeAdvisories
        ? { runtimeAdvisories }
        : {}),
    },
  };
}

export function buildEquationOutcomeBoundaryFromProducerOrThrow(
  outcome: ResultProducerDraft,
): EquationResultOutcomeBoundaryV1 {
  const projection = buildEquationOutcomeBoundaryFromProducer(outcome);
  if (!projection.ok) {
    throw new Error(
      `Equation outcome boundary rejected ${projection.failure.reason}: ${projection.failure.message}`,
    );
  }
  return projection.boundary;
}

export function buildEquationCancelledOutcomeBoundary(
  reason: string,
): EquationCancelledOutcomeBoundaryV1 {
  return {
    version: EQUATION_OUTCOME_BOUNDARY_VERSION,
    kind: 'cancelled',
    reason,
  };
}

export function readEquationOutcomeBoundary(
  boundary: EquationOutcomeBoundaryV1,
): ResultProducerDraft {
  if (boundary.kind === 'cancelled') {
    return {
      kind: 'error',
      title: 'Solve',
      error: boundary.reason,
      warnings: [],
      plannerBadges: [],
      ...proseSolveSummary(
        'Equation solve stopped after the Equation worker runtime was hard-stopped.',
      ),
    };
  }

  const outcome = attachEquationAnalysisEvidence(
    readEquationProducerDraftFromCanonicalResult(boundary.result.document),
    boundary.result.diagnostics.analysisEvidence,
  );
  return boundary.runtimeAdvisories
    ? attachRuntimeEnvelope(outcome, {
        originalLatex: '',
        resolvedLatex: '',
        plannerBadgeMode: 'merge',
        runtimeAdvisories: structuredClone(boundary.runtimeAdvisories),
      })
    : outcome;
}
