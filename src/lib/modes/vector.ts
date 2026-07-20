import { runVectorOperationWithEvidence } from '../linear-algebra/vector';
import { linearAlgebraDecimalReadback } from '../linear-algebra/decimal-readback';
import {
  type OoeJobContextOptions,
} from '../ooe/job-launch/job-contract';
import {
  runLinearAlgebraWithOoePilot,
  type LinearAlgebraHostExecution,
} from '../ooe/pilots/linear-algebra-pilot';
import {
  runVectorModeViaIsolatedWorker,
  type CreateVectorWorker,
} from './worker-clients/vector-worker-client';
import {
  createVectorAngleResultOutcomeV3,
  createVectorResultOutcomeV2,
} from './vector-result-document';
import {
  vectorMathJsonRouteForRequest,
  vectorV2MathResolverFromEvidence,
} from './vector-math-values';
import {
  canonicalResultVersionForProducer,
  finalizeCanonicalRuntimeOutcomeFromProducer,
  requireCanonicalResultAuthority,
} from '../result-contract';
import type {
  ScalarVectorRequestV1,
  VersionedResultProducerDraft,
  VectorRequest,
} from '../../types/calculator';
import { vectorOperationLabel } from '../linear-algebra/operation-labels';
import { buildVectorOoeSnapshot } from '../linear-algebra/runtime-revision';

export { vectorOperationLabel } from '../linear-algebra/operation-labels';
export {
  buildVectorOoeInputRevisionId,
  buildVectorOoeSnapshot,
} from '../linear-algebra/runtime-revision';

export type RunVectorModeRequest =
  | (VectorRequest & { vectorB: number[] })
  | (ScalarVectorRequestV1 & { vectorB: NonNullable<ScalarVectorRequestV1['vectorB']> });

function vectorResultTitle(request: RunVectorModeRequest) {
  if (request.domain === 'complex') {
    if (request.operation === 'angle') return 'Principal line angle';
    if (request.operation === 'cross') return 'Algebraic cross product';
    if (request.operation === 'parallelogramArea' || request.operation === 'triangleArea') {
      return 'Hermitian Gram area';
    }
    if (request.operation === 'volume') return 'Hermitian Gram volume';
  }
  if (
    (request.operation === 'span'
      || request.operation === 'independent'
      || request.operation === 'parallel'
      || request.operation === 'distance'
      || request.operation === 'parallelogramArea'
      || request.operation === 'triangleArea'
      || request.operation === 'volume'
      || (request.operation === 'gramSchmidtUV' && (request.vectorOperands?.length ?? 2) > 2))
    && request.editorExpressionLatex
  ) {
    return request.editorExpressionLatex;
  }
  const usesInlineOperand =
    (request.vectorOperandLatexA !== undefined && request.vectorOperandLatexA !== 'u')
    || (request.vectorOperandLatexB !== undefined && request.vectorOperandLatexB !== 'v');
  return usesInlineOperand && request.editorExpressionLatex
    ? request.editorExpressionLatex
    : vectorOperationLabel(request.operation);
}

function isNumericApproxText(text: string) {
  return /^[-+]?(?:(?:\d+(?:\.\d+)?)|(?:\.\d+))(?:\s*(?:e|E|×\s*10\^)[-+]?\d+)?$/.test(text.trim());
}

function vectorUserFacingApproxText(approxText?: string) {
  return approxText && isNumericApproxText(approxText) ? approxText : undefined;
}

function runVectorModeOutcome(request: RunVectorModeRequest) {
  const execution = runVectorOperationWithEvidence(request);
  const { response, evidence } = execution;
  const decimalReadback = linearAlgebraDecimalReadback(evidence.primary, request.approxDigits);
  const nativeNumericReadback = request.operandEncoding === 'scalar-v1'
    ? response.approxText
    : vectorUserFacingApproxText(response.approxText);
  if (response.error) {
    return {
      outcome: {
        kind: 'error' as const,
        title: vectorResultTitle(request),
        error: response.error,
        warnings: response.warnings,
        exactLatex: response.resultLatex,
        approxText: nativeNumericReadback ?? decimalReadback,
        exactSupplementLatex: response.exactSupplementLatex,
        detailSections: response.detailSections,
        sourceMode: 'vector' as const,
      },
      evidence,
    };
  }

  return {
    outcome: {
      kind: 'success' as const,
      title: vectorResultTitle(request),
      exactLatex: response.resultLatex,
      answerRows: response.answerRows,
      approxText: nativeNumericReadback ?? decimalReadback,
      exactSupplementLatex: response.exactSupplementLatex,
      detailSections: response.detailSections,
      warnings: response.warnings,
      sourceMode: 'vector' as const,
    },
    evidence,
  };
}

export function runVectorMode(request: RunVectorModeRequest): VersionedResultProducerDraft {
  const { outcome, evidence } = runVectorModeOutcome(request);
  const routeId = vectorMathJsonRouteForRequest(request);
  const version = canonicalResultVersionForProducer({
    routeId,
    selector: request.operation === 'angle'
      ? `angle:${request.angleUnit}`
      : request.operation,
  });
  const mathValue = vectorV2MathResolverFromEvidence({ routeId, evidence });
  return requireCanonicalResultAuthority(
    version === 3
      ? createVectorAngleResultOutcomeV3(outcome, { routeId, evidence, mathValue })
      : createVectorResultOutcomeV2(outcome, { routeId, evidence, mathValue }),
    'Vector',
  );
}

export async function runVectorModeWithOoePilot(
  request: RunVectorModeRequest,
  options?: OoeJobContextOptions & {
    createWorker?: CreateVectorWorker;
  },
) {
  let hostExecution: LinearAlgebraHostExecution | undefined;
  const routeSnapshot = buildVectorOoeSnapshot(request);
  const result = await runLinearAlgebraWithOoePilot(
    'vector',
    async (control) => {
      const result = await runVectorModeViaIsolatedWorker(
        request,
        control,
        {
          createWorker: options?.createWorker,
          fallback: () => finalizeCanonicalRuntimeOutcomeFromProducer(
            runVectorMode(request),
            'Vector fallback',
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
