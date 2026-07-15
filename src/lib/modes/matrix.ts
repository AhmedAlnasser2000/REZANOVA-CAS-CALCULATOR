import { runMatrixOperationWithEvidence } from '../linear-algebra/matrix';
import { runMatrixLinearSystemWithEvidence } from '../linear-algebra/matrix-system';
import type { LinearAlgebraCanonicalEvidence } from '../linear-algebra/canonical-evidence';
import { linearAlgebraDecimalReadback } from '../linear-algebra/decimal-readback';
import {
  buildOoeInputRevisionId,
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
  MatrixOperation,
  MatrixSystemForm,
  ScalarMatrixRequestV1,
} from '../../types/calculator';

export type RunMatrixModeRequest =
  | (MatrixRequest & { matrixB: number[][] })
  | (ScalarMatrixRequestV1 & { matrixB: NonNullable<ScalarMatrixRequestV1['matrixB']> });

export function matrixOperationLabel(operation: MatrixOperation, form?: MatrixSystemForm) {
  switch (operation) {
    case 'add':
      return 'A+B';
    case 'subtract':
      return 'A-B';
    case 'multiply':
      return 'A×B';
    case 'transposeA':
      return 'Transpose A';
    case 'transposeB':
      return 'Transpose B';
    case 'adjointA':
      return 'Adjoint A';
    case 'adjointB':
      return 'Adjoint B';
    case 'detA':
      return 'det(A)';
    case 'detB':
      return 'det(B)';
    case 'inverseA':
      return 'Inverse A';
    case 'inverseB':
      return 'Inverse B';
    case 'rankA':
      return 'rank(A)';
    case 'rankB':
      return 'rank(B)';
    case 'rrefA':
      return 'rref(A)';
    case 'rrefB':
      return 'rref(B)';
    case 'nullSpaceA':
      return 'null(A)';
    case 'nullSpaceB':
      return 'null(B)';
    case 'columnSpaceA':
      return 'col(A)';
    case 'columnSpaceB':
      return 'col(B)';
    case 'basisA':
      return 'basis(A)';
    case 'basisB':
      return 'basis(B)';
    case 'coordinatesA':
      return 'coords(A, v)';
    case 'coordinatesB':
      return 'coords(B, v)';
    case 'changeBasis':
      return 'change(A,B)';
    case 'luA':
      return 'lu(A)';
    case 'luB':
      return 'lu(B)';
    case 'pluA':
      return 'plu(A)';
    case 'pluB':
      return 'plu(B)';
    case 'luSolveA':
      return 'lusolve(A,b)';
    case 'luSolveB':
      return 'lusolve(B,b)';
    case 'pluSolveA':
      return 'plusolve(A,b)';
    case 'pluSolveB':
      return 'plusolve(B,b)';
    case 'multiRhsSolve':
      return 'AX=B';
    case 'qrA':
      return 'qr(A)';
    case 'qrB':
      return 'qr(B)';
    case 'columnProjectionA':
      return 'projCol(A,b)';
    case 'columnProjectionB':
      return 'projCol(B,b)';
    case 'leastSquaresA':
      return 'ls(A,b)';
    case 'leastSquaresB':
      return 'ls(B,b)';
    case 'invertibilityA':
      return 'invertible(A)';
    case 'invertibilityB':
      return 'invertible(B)';
    case 'profileA':
      return 'profile(A)';
    case 'profileB':
      return 'profile(B)';
    case 'definiteA':
      return 'definite(A)';
    case 'definiteB':
      return 'definite(B)';
    case 'svdA':
      return 'svd(A)';
    case 'svdB':
      return 'svd(B)';
    case 'pinvA':
      return 'pinv(A)';
    case 'pinvB':
      return 'pinv(B)';
    case 'condA':
      return 'cond(A)';
    case 'condB':
      return 'cond(B)';
    case 'nrankA':
      return 'nrank(A)';
    case 'nrankB':
      return 'nrank(B)';
    case 'charpolyA':
      return 'charpoly(A)';
    case 'charpolyB':
      return 'charpoly(B)';
    case 'eigenA':
      return 'eigen(A)';
    case 'eigenB':
      return 'eigen(B)';
    case 'diagonalizeA':
      return 'diag(A)';
    case 'diagonalizeB':
      return 'diag(B)';
    case 'spectralPowerA':
      return 'mpow(A,n)';
    case 'spectralPowerB':
      return 'mpow(B,n)';
    case 'linearSystem':
      return form === 'Ax+b=0' ? 'Ax+b=0' : 'Ax=b';
    default:
      return 'Matrix';
  }
}

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

export function buildMatrixOoeSnapshot(request: RunMatrixModeRequest) {
  const matrixA = request.operandEncoding === 'scalar-v1'
    ? request.matrixA.resolved
    : request.matrixA;
  const matrixB = request.operandEncoding === 'scalar-v1'
    ? request.matrixB.resolved
    : request.matrixB;
  return {
    kind: 'matrix' as const,
    request: {
      operation: request.operation,
      rowsA: matrixA.length,
      rowsB: matrixB.length,
      operandEncoding: request.operandEncoding,
      matrixA: request.matrixA,
      matrixB: request.matrixB,
      approxDigits: request.approxDigits,
      systemRhs: request.systemRhs,
      coordinateVector: request.coordinateVector,
      matrixPowerExponent: request.matrixPowerExponent,
      systemForm: request.systemForm,
      exactMatrixA: request.operandEncoding === 'scalar-v1' ? undefined : request.exactMatrixA,
      exactMatrixB: request.operandEncoding === 'scalar-v1' ? undefined : request.exactMatrixB,
      exactSystemRhs: request.operandEncoding === 'scalar-v1' ? undefined : request.exactSystemRhs,
      exactCoordinateVector: request.operandEncoding === 'scalar-v1' ? undefined : request.exactCoordinateVector,
      editorExpressionLatex: request.editorExpressionLatex,
      matrixOperandLatexA: request.matrixOperandLatexA,
      matrixOperandLatexB: request.matrixOperandLatexB,
      systemRhsLatex: request.systemRhsLatex,
      systemUnknowns: request.systemUnknowns,
      systemUnknownVectorName: request.systemUnknownVectorName,
      coordinateVectorLatex: request.coordinateVectorLatex,
      matrixPowerExponentLatex: request.matrixPowerExponentLatex,
      matrixValues: request.matrixValues,
      activeMatrixLeftId: request.activeMatrixLeftId,
      activeMatrixRightId: request.activeMatrixRightId,
      domain: request.domain,
      substitutionMode: request.substitutionMode,
      substitutionSnapshot: request.substitutionSnapshot,
      protectedSubstitutionSnapshot: request.protectedSubstitutionSnapshot,
      complexExactForm: request.complexExactForm,
    },
  };
}

export function buildMatrixOoeInputRevisionId(request: RunMatrixModeRequest) {
  return buildOoeInputRevisionId('linearAlgebra.matrix', buildMatrixOoeSnapshot(request));
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
