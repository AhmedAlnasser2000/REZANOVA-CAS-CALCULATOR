import { runMatrixOperationWithEvidence } from '../linear-algebra/matrix';
import { runMatrixLinearSystemWithEvidence } from '../linear-algebra/matrix-system';
import type { LinearAlgebraCanonicalEvidence } from '../linear-algebra/canonical-evidence';
import { linearAlgebraDecimalReadback } from '../linear-algebra/decimal-readback';
import {
  type OoeJobContextOptions,
} from '../ooe/job-launch/job-contract';
import {
  runLinearAlgebraWithOoePilot,
  type LinearAlgebraHostExecution,
} from '../ooe/pilots/linear-algebra-pilot';
import {
  runMatrixModeViaIsolatedWorker,
  type CreateMatrixWorker,
} from './worker-clients/matrix-worker-client';
import { createMatrixResultOutcomeV2 } from './matrix-result-document';
import {
  matrixMathJsonRouteForRequest,
  matrixV2MathResolverFromEvidence,
  proveMatrixCanonicalEvidence,
} from './matrix-math-values';
import {
  buildCanonicalRuntimeActionV2,
  canonicalResultVersionForProducer,
  finalizeCanonicalRuntimeOutcomeFromProducer,
  requireCanonicalResultAuthority,
} from '../result-contract';
import type {
  ResultProducerDraft,
  VersionedResultProducerDraft,
  MatrixRequest,
  ScalarMatrixRequestV1,
} from '../../types/calculator';
import { matrixOperationLabel } from '../linear-algebra/operation-labels';
import { buildMatrixOoeSnapshot } from '../linear-algebra/runtime-revision';

export { matrixOperationLabel } from '../linear-algebra/operation-labels';
export {
  buildMatrixOoeInputRevisionId,
  buildMatrixOoeSnapshot,
} from '../linear-algebra/runtime-revision';

export type RunMatrixModeRequest =
  | (MatrixRequest & { matrixB: number[][] })
  | (ScalarMatrixRequestV1 & { matrixB: NonNullable<ScalarMatrixRequestV1['matrixB']> });

function matrixResultTitle(request: RunMatrixModeRequest) {
  const usesInlineOperand =
    (request.matrixOperandLatexA !== undefined && request.matrixOperandLatexA !== 'A')
    || (request.matrixOperandLatexB !== undefined && request.matrixOperandLatexB !== 'B')
    || request.systemRhsLatex !== undefined
    || request.systemUnknowns !== undefined
    || (request.systemUnknownVectorName !== undefined && request.systemUnknownVectorName !== 'x')
    || request.coordinateVectorLatex !== undefined
    || request.matrixPowerExponentLatex !== undefined;
  return usesInlineOperand && request.editorExpressionLatex
    ? request.editorExpressionLatex
    : matrixOperationLabel(request.operation, request.systemForm);
}

function matrixUserFacingApproxText(
  evidence: LinearAlgebraCanonicalEvidence,
  approxDigits: number | undefined,
) {
  return linearAlgebraDecimalReadback(evidence.primary, approxDigits);
}

function runMatrixModeOutcome(request: RunMatrixModeRequest): {
  outcome: ResultProducerDraft;
  evidence: LinearAlgebraCanonicalEvidence;
} {
  if (request.operation === 'linearSystem' && request.operandEncoding !== 'scalar-v1') {
    return runMatrixLinearSystemWithEvidence({
      coefficients: request.matrixA,
      constants: request.systemRhs ?? [],
      form: request.systemForm ?? 'Ax=b',
      exactCoefficients: request.exactMatrixA,
      exactConstants: request.exactSystemRhs,
      editorExpressionLatex: request.editorExpressionLatex,
      coefficientMatrixLatex: request.matrixOperandLatexA,
      rhsVectorLatex: request.systemRhsLatex,
    });
  }

  const execution = runMatrixOperationWithEvidence(request);
  const { response, evidence } = execution;
  const actionEvidence = evidence.runtimeActions ?? [];
  if (response.handoffEquationLatex) {
    if (actionEvidence.length !== 1
      || actionEvidence[0]?.canonicalLatex !== response.handoffEquationLatex) {
      throw new Error('Matrix native Equation handoff is missing aligned canonical evidence.');
    }
  } else if (actionEvidence.length > 0) {
    throw new Error('Matrix canonical action evidence has no matching native handoff.');
  }
  if (response.error) {
    return { evidence, outcome: {
        kind: 'error',
        title: matrixResultTitle(request),
        error: response.error,
        warnings: response.warnings,
        exactLatex: response.resultLatex,
        approxText: request.operandEncoding === 'scalar-v1'
          ? response.approxText ?? matrixUserFacingApproxText(evidence, request.approxDigits)
          : matrixUserFacingApproxText(evidence, request.approxDigits),
        exactSupplementLatex: response.exactSupplementLatex,
        detailSections: response.detailSections,
        sourceMode: 'matrix',
      } };
  }

  return { evidence, outcome: {
      kind: 'success',
      title: matrixResultTitle(request),
      exactLatex: response.resultLatex,
      answerRows: response.answerRows,
      approxText: request.operandEncoding === 'scalar-v1'
        ? response.approxText ?? matrixUserFacingApproxText(evidence, request.approxDigits)
        : matrixUserFacingApproxText(evidence, request.approxDigits),
      exactSupplementLatex: response.exactSupplementLatex,
      detailSections: response.detailSections,
      warnings: response.warnings,
      sourceMode: 'matrix',
    } };
}

export function runMatrixMode(request: RunMatrixModeRequest): VersionedResultProducerDraft {
  const { outcome, evidence } = runMatrixModeOutcome(request);
  if (outcome.kind === 'prompt') return outcome;
  const routeId = matrixMathJsonRouteForRequest(request);
  const version = canonicalResultVersionForProducer({ routeId });
  if (version !== 2) {
    throw new Error(`Matrix route ${routeId} must select canonical result V2.`);
  }
  const canonical = createMatrixResultOutcomeV2(outcome, {
    routeId,
    evidence,
    mathValue: matrixV2MathResolverFromEvidence({ routeId, evidence }),
  });
  const actions = evidence.runtimeActions?.map((action, index) => buildCanonicalRuntimeActionV2({
    kind: 'send',
    target: 'equation',
    math: proveMatrixCanonicalEvidence(routeId, action, `actions[${index}].math`),
  }));
  return requireCanonicalResultAuthority(
    actions?.length ? { ...canonical, actions } : canonical,
    'Matrix',
  );
}

export async function runMatrixModeWithOoePilot(
  request: RunMatrixModeRequest,
  options?: OoeJobContextOptions & {
    createWorker?: CreateMatrixWorker;
  },
) {
  let hostExecution: LinearAlgebraHostExecution | undefined;
  const routeSnapshot = buildMatrixOoeSnapshot(request);
  const result = await runLinearAlgebraWithOoePilot(
    'matrix',
    async (control) => {
      const result = await runMatrixModeViaIsolatedWorker(
        request,
        control,
        {
          createWorker: options?.createWorker,
          fallback: () => finalizeCanonicalRuntimeOutcomeFromProducer(
            runMatrixMode(request),
            'Matrix fallback',
          ),
        },
      );
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
    (payload) => payload,
  );
  return {
    ...result,
    payload: result.payload,
  };
}
