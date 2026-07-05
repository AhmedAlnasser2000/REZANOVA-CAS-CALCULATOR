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
  runLinearAlgebraModeViaIsolatedWorker,
  type CreateLinearAlgebraWorker,
} from './worker-clients/linear-algebra-worker-client';
import type {
  AngleUnit,
  DisplayOutcome,
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
    default:
      return 'Vector';
  }
}

function vectorResultTitle(request: RunVectorModeRequest) {
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

export function runVectorMode(request: RunVectorModeRequest): DisplayOutcome {
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
    createWorker?: CreateLinearAlgebraWorker;
  },
) {
  let hostExecution: LinearAlgebraHostExecution | undefined;
  const routeSnapshot = buildVectorOoeSnapshot(request);
  return runLinearAlgebraWithOoePilot(
    'vector',
    async (control) => {
      const result = await runLinearAlgebraModeViaIsolatedWorker(
        {
          kind: 'vector',
          request,
        },
        control,
        {
          createWorker: options?.createWorker,
          fallback: () => runVectorMode(request),
        },
      );
      hostExecution = result.hostExecution;
      return result.payload;
    },
    routeSnapshot,
    options,
    () => hostExecution,
  );
}
