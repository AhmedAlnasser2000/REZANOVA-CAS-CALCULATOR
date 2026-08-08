import { z } from 'zod';
import type {
  CanonicalResultBranchReadbackV1,
  CanonicalResultDocumentV1,
} from '../../../types/calculator';
import {
  inspectJsonCompatibleStructuredValue,
  validateCanonicalResultDocument,
} from '../../result-contract';
import {
  EQUATION_SOLVE_RESULT_MAX_ANALYSIS_EVIDENCE,
  EQUATION_SOLVE_RESULT_MAX_BYTES,
  EQUATION_SOLVE_RESULT_MAX_CANDIDATES,
  EQUATION_SOLVE_RESULT_MAX_DEPTH,
  EQUATION_SOLVE_RESULT_MAX_NODES,
  EQUATION_SOLVE_RESULT_MAX_VALIDATIONS,
  type EquationSolveResultContractV1,
} from './contract';

export type EquationSolveResultValidationFailure = {
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
    | 'invalid-document'
    | 'status-mismatch'
    | 'evidence-mismatch';
  message: string;
  path?: string;
};

export type ValidatedEquationSolveResultContract = {
  value: EquationSolveResultContractV1;
  nodeCount: number;
  depth: number;
  byteLength: number;
};

export type EquationSolveResultValidation =
  | { ok: true; validated: ValidatedEquationSolveResultContract }
  | { ok: false; failure: EquationSolveResultValidationFailure };

const finiteNumber = z.number().finite();
const nonEmptyString = z.string().refine((value) => value.trim().length > 0);
const candidateValidationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('accepted'), value: finiteNumber, residual: finiteNumber }).strict(),
  z.object({ kind: z.literal('rejected'), value: finiteNumber, reason: nonEmptyString }).strict(),
]);
const candidateEvidenceSchema = z.object({
  acceptedValues: z.array(finiteNumber).max(EQUATION_SOLVE_RESULT_MAX_CANDIDATES).optional(),
  rejectedCount: z.number().int().nonnegative().optional(),
  validation: z.array(candidateValidationSchema).max(EQUATION_SOLVE_RESULT_MAX_VALIDATIONS).optional(),
}).strict().refine(
  (value) => value.acceptedValues !== undefined
    || value.rejectedCount !== undefined
    || value.validation !== undefined,
  { message: 'Candidate evidence must contain at least one evidence field.' },
);
const evidenceIntervalSchema = z.object({
  start: z.string(),
  end: z.string(),
  subdivisions: z.number().int().nonnegative().optional(),
  local: z.boolean().optional(),
}).strict();
const evidencePointSchema = z.object({
  value: finiteNumber,
  latex: z.string().optional(),
  role: z.enum(['root', 'extraneous', 'boundary', 'singularity', 'sample']).optional(),
}).strict();
const supplementEvidenceSchema = z.object({
  role: z.enum(['exclusion', 'condition']),
  expressionLatex: z.string().optional(),
  canonicalLatex: nonEmptyString,
  mathJson: z.unknown(),
}).strict();
const analysisEvidenceSchema = z.object({
  id: nonEmptyString,
  target: nonEmptyString,
  sourceRoute: nonEmptyString,
  category: z.enum([
    'route',
    'domain',
    'periodicity',
    'interval-validity',
    'singularity',
    'root',
    'candidate',
    'range-behavior',
    'trust',
    'diagnostic',
  ]),
  confidence: z.enum([
    'certified',
    'validated',
    'proven',
    'reported',
    'candidate',
    'heuristic',
    'unknown',
  ]),
  classification: z.string().optional(),
  latex: z.string().optional(),
  text: z.string().optional(),
  interval: evidenceIntervalSchema.optional(),
  point: evidencePointSchema.optional(),
  supplementEvidence: supplementEvidenceSchema.optional(),
}).strict();
const diagnosticsSchema = z.object({
  substitutionDiagnostics: z.unknown().optional(),
  numericMethod: z.string().optional(),
  analysisEvidence: z.array(analysisEvidenceSchema).max(
    EQUATION_SOLVE_RESULT_MAX_ANALYSIS_EVIDENCE,
  ),
}).strict();
const stopSchema = z.object({
  code: nonEmptyString,
  message: nonEmptyString,
  source: z.literal('producer'),
  stageId: nonEmptyString.optional(),
}).strict();
const carrierSchema = z.object({
  version: z.literal(1),
  status: z.enum(['solved', 'controlled-stop']),
  document: z.unknown(),
  candidates: candidateEvidenceSchema.optional(),
  branchEvidence: z.unknown().optional(),
  badges: z.object({
    planner: z.array(z.string()),
    solve: z.array(z.string()),
  }).strict(),
  diagnostics: diagnosticsSchema,
  stop: stopSchema.optional(),
}).strict();

function fail(
  reason: EquationSolveResultValidationFailure['reason'],
  message: string,
  path?: string,
): EquationSolveResultValidation {
  return { ok: false, failure: { reason, message, ...(path ? { path } : {}) } };
}

function jsonEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameOptionalValue(left: unknown, right: unknown) {
  return left === undefined && right === undefined
    ? true
    : jsonEqual(left, right);
}

function validateMirroredEvidence(
  carrier: EquationSolveResultContractV1,
  document: CanonicalResultDocumentV1,
): EquationSolveResultValidation | null {
  const metadata = document.metadata;
  if (!sameOptionalValue(carrier.branchEvidence, document.branchReadback)) {
    return fail('evidence-mismatch', 'Equation branch evidence must match the canonical document.');
  }
  if (!jsonEqual(carrier.badges.planner, metadata?.plannerBadges ?? [])) {
    return fail('evidence-mismatch', 'Equation planner badges must match the canonical document.');
  }
  if (!jsonEqual(carrier.badges.solve, metadata?.solveBadges ?? [])) {
    return fail('evidence-mismatch', 'Equation solve badges must match the canonical document.');
  }
  if (!sameOptionalValue(carrier.candidates?.acceptedValues, metadata?.candidateValues)) {
    return fail('evidence-mismatch', 'Equation accepted candidates must match the canonical document.');
  }
  if (!sameOptionalValue(carrier.candidates?.rejectedCount, metadata?.rejectedCandidateCount)) {
    return fail('evidence-mismatch', 'Equation rejected-candidate count must match the canonical document.');
  }
  if (!sameOptionalValue(
    carrier.diagnostics.substitutionDiagnostics,
    metadata?.substitutionDiagnostics,
  )) {
    return fail('evidence-mismatch', 'Equation substitution diagnostics must match the canonical document.');
  }
  if (!sameOptionalValue(carrier.diagnostics.numericMethod, metadata?.numericMethod)) {
    return fail('evidence-mismatch', 'Equation numeric method must match the canonical document.');
  }
  const ids = carrier.diagnostics.analysisEvidence.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    return fail('evidence-mismatch', 'Equation analysis evidence ids must be unique.');
  }
  return null;
}

export function validateEquationSolveResultContract(
  input: unknown,
): EquationSolveResultValidation {
  const inspection = inspectJsonCompatibleStructuredValue(input, {
    label: 'Equation solve result',
    maxNodes: EQUATION_SOLVE_RESULT_MAX_NODES,
    maxDepth: EQUATION_SOLVE_RESULT_MAX_DEPTH,
    maxBytes: EQUATION_SOLVE_RESULT_MAX_BYTES,
  });
  if (!inspection.ok) return { ok: false, failure: inspection.failure };

  const parsed = carrierSchema.safeParse(JSON.parse(inspection.serialized));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(
      'invalid-shape',
      issue?.message ?? 'Equation solve result shape is invalid.',
      issue?.path.length ? `$.${issue.path.join('.')}` : '$',
    );
  }

  const documentValidation = validateCanonicalResultDocument(parsed.data.document);
  if (!documentValidation.ok) {
    return fail(
      'invalid-document',
      documentValidation.failure.message,
      documentValidation.failure.path,
    );
  }
  const document = documentValidation.validated.value;
  const candidate = {
    ...parsed.data,
    document,
    ...(parsed.data.branchEvidence !== undefined
      ? {
          branchEvidence: parsed.data.branchEvidence as CanonicalResultBranchReadbackV1,
        }
      : {}),
  } as EquationSolveResultContractV1;

  if (candidate.status === 'solved') {
    if (document.outcomeKind !== 'success' || candidate.stop !== undefined) {
      return fail('status-mismatch', 'Solved Equation carriers require a success document and no stop.');
    }
  } else if (
    document.outcomeKind !== 'error'
    || candidate.stop === undefined
    || candidate.stop.message !== document.error
  ) {
    return fail(
      'status-mismatch',
      'Controlled Equation stops require a matching error document and stop message.',
    );
  }

  const evidenceFailure = validateMirroredEvidence(candidate, document);
  if (evidenceFailure) return evidenceFailure;

  return {
    ok: true,
    validated: {
      value: candidate,
      nodeCount: inspection.nodeCount,
      depth: inspection.depth,
      byteLength: inspection.byteLength,
    },
  };
}
