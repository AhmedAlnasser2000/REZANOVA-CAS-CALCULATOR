import { buildOoeInputRevisionId } from '../ooe/job-launch/job-contract';
import type { RunMatrixModeRequest } from '../modes/matrix';
import type { RunVectorModeRequest } from '../modes/vector';

export function buildMatrixOoeSnapshot(request: RunMatrixModeRequest) {
  const matrixA = request.operandEncoding === 'scalar-v1' ? request.matrixA.resolved : request.matrixA;
  const matrixB = request.operandEncoding === 'scalar-v1' ? request.matrixB.resolved : request.matrixB;
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

export function buildVectorOoeSnapshot(request: RunVectorModeRequest) {
  const vectorA = request.operandEncoding === 'scalar-v1' ? request.vectorA.resolved : request.vectorA;
  const vectorB = request.operandEncoding === 'scalar-v1' ? request.vectorB.resolved : request.vectorB;
  return {
    kind: 'vector' as const,
    request: {
      operation: request.operation,
      lengthA: vectorA.length,
      lengthB: vectorB.length,
      angleUnit: request.angleUnit,
      approxDigits: request.approxDigits,
      operandEncoding: request.operandEncoding,
      vectorA: request.vectorA,
      vectorB: request.vectorB,
      exactVectorA: request.operandEncoding === 'scalar-v1' ? undefined : request.exactVectorA,
      exactVectorB: request.operandEncoding === 'scalar-v1' ? undefined : request.exactVectorB,
      editorExpressionLatex: request.editorExpressionLatex,
      vectorOperandLatexA: request.vectorOperandLatexA,
      vectorOperandLatexB: request.vectorOperandLatexB,
      vectorOperands: request.vectorOperands,
      exactVectorOperands: request.operandEncoding === 'scalar-v1' ? undefined : request.exactVectorOperands,
      vectorOperandLatexList: request.vectorOperandLatexList,
      vectorValues: request.vectorValues,
      activeVectorLeftId: request.activeVectorLeftId,
      activeVectorRightId: request.activeVectorRightId,
      domain: request.domain,
      substitutionMode: request.substitutionMode,
      substitutionSnapshot: request.substitutionSnapshot,
      protectedSubstitutionSnapshot: request.protectedSubstitutionSnapshot,
      complexExactForm: request.complexExactForm,
    },
  };
}

export function buildVectorOoeInputRevisionId(request: RunVectorModeRequest) {
  return buildOoeInputRevisionId('linearAlgebra.vector', buildVectorOoeSnapshot(request));
}
