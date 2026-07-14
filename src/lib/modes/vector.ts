import { runVectorOperation } from '../linear-algebra/vector';
import {
  buildOoeInputRevisionId,
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
  createVectorIndependenceResultOutcomeV2,
  createVectorResultOutcome,
} from './vector-result-document';
import {
  vectorIndependenceV2EvidenceForRequest,
  vectorMathJsonRouteForRequest,
  vectorMathValuesFromOwnedLeaves,
  vectorOwnedMathJsonLeaves,
  vectorV2MathResolverFromOwnedLeaves,
} from './vector-math-values';
import {
  canonicalResultVersionForProducer,
  finalizeCanonicalRuntimeOutcomeFromProducer,
  requireCanonicalResultAuthority,
} from '../result-contract';
import type {
  AngleUnit,
  ResultProducerDraft,
  VersionedResultProducerDraft,
  ExactScalarWire,
  VectorOperation,
} from '../../types/calculator';

export type RunVectorModeRequest = {
  operation: VectorOperation;
  vectorA: number[];
  vectorB: number[];
  angleUnit: AngleUnit;
  exactVectorA?: ExactScalarWire[];
  exactVectorB?: ExactScalarWire[];
  editorExpressionLatex?: string;
  vectorOperandLatexA?: string;
  vectorOperandLatexB?: string;
  vectorOperands?: number[][];
  exactVectorOperands?: ExactScalarWire[][];
  vectorOperandLatexList?: string[];
  vectorValues?: { id: string; name: string; value: number[] }[];
  activeVectorLeftId?: string;
  activeVectorRightId?: string;
};

export function vectorOperationLabel(operation: VectorOperation) {
  switch (operation) {
    case 'dot':
      return 'u·v';
    case 'cross':
      return 'u×v';
    case 'normA':
      return '‖u‖';
    case 'normB':
      return '‖v‖';
    case 'angle':
      return '∠(u,v)';
    case 'add':
      return 'u+v';
    case 'subtract':
      return 'u-v';
    case 'projectionUofV':
      return 'proj_u(v)';
    case 'projectionVofU':
      return 'proj_v(u)';
    case 'orthogonalToU':
      return 'orth_u(v)';
    case 'orthogonalToV':
      return 'orth_v(u)';
    case 'unitA':
      return 'unit(u)';
    case 'unitB':
      return 'unit(v)';
    case 'orthogonalCheck':
      return 'orthogonal(u,v)';
    case 'gramSchmidtUV':
      return 'gram(u,v)';
    case 'linearCombination':
      return 'Vector combination';
    case 'span':
      return 'span(...)';
    case 'independent':
      return 'independent(...)';
    default:
      return 'Vector';
  }
}

function vectorResultTitle(request: RunVectorModeRequest) {
  if ((request.operation === 'span' || request.operation === 'independent') && request.editorExpressionLatex) {
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

function runVectorModeOutcome(request: RunVectorModeRequest): ResultProducerDraft {
  const {
    operation,
    vectorA,
    vectorB,
    angleUnit,
    exactVectorA,
    exactVectorB,
    editorExpressionLatex,
    vectorOperandLatexA,
    vectorOperandLatexB,
    vectorOperands,
    exactVectorOperands,
    vectorOperandLatexList,
  } = request;
  const response = runVectorOperation({
    operation,
    vectorA,
    vectorB,
    angleUnit,
    exactVectorA,
    exactVectorB,
    editorExpressionLatex,
    vectorOperandLatexA,
    vectorOperandLatexB,
    vectorOperands,
    exactVectorOperands,
    vectorOperandLatexList,
  });
  if (response.error) {
    return {
      kind: 'error',
      title: vectorResultTitle(request),
      error: response.error,
      warnings: response.warnings,
      exactLatex: response.resultLatex,
      approxText: vectorUserFacingApproxText(response.approxText),
      sourceMode: 'vector',
    };
  }

  return {
    kind: 'success',
    title: vectorResultTitle(request),
    exactLatex: response.resultLatex,
    answerRows: response.answerRows,
    approxText: vectorUserFacingApproxText(response.approxText),
    detailSections: response.detailSections,
    warnings: response.warnings,
    sourceMode: 'vector',
  };
}

export function runVectorMode(request: RunVectorModeRequest): VersionedResultProducerDraft {
  const outcome = runVectorModeOutcome(request);
  if (outcome.kind === 'prompt') return outcome;
  const routeId = vectorMathJsonRouteForRequest(request);
  const leaves = vectorOwnedMathJsonLeaves(request);
  const version = canonicalResultVersionForProducer({
    routeId,
    selector: request.operation,
  });
  return requireCanonicalResultAuthority(
    version === 2
      ? createVectorIndependenceResultOutcomeV2(outcome, {
          independence: vectorIndependenceV2EvidenceForRequest(request),
          mathValue: vectorV2MathResolverFromOwnedLeaves({ routeId, leaves }),
        })
      : createVectorResultOutcome(outcome, {
          mathValues: vectorMathValuesFromOwnedLeaves({
            outcome,
            routeId,
            leaves,
          }),
        }),
    'Vector',
  );
}

export function buildVectorOoeSnapshot(request: RunVectorModeRequest) {
  return {
    kind: 'vector' as const,
    request: {
      operation: request.operation,
      lengthA: request.vectorA.length,
      lengthB: request.vectorB.length,
      angleUnit: request.angleUnit,
      vectorA: request.vectorA,
      vectorB: request.vectorB,
      exactVectorA: request.exactVectorA,
      exactVectorB: request.exactVectorB,
      editorExpressionLatex: request.editorExpressionLatex,
      vectorOperandLatexA: request.vectorOperandLatexA,
      vectorOperandLatexB: request.vectorOperandLatexB,
      vectorOperands: request.vectorOperands,
      exactVectorOperands: request.exactVectorOperands,
      vectorOperandLatexList: request.vectorOperandLatexList,
      vectorValues: request.vectorValues,
      activeVectorLeftId: request.activeVectorLeftId,
      activeVectorRightId: request.activeVectorRightId,
    },
  };
}

export function buildVectorOoeInputRevisionId(request: RunVectorModeRequest) {
  return buildOoeInputRevisionId('linearAlgebra.vector', buildVectorOoeSnapshot(request));
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
