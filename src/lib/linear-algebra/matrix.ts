import type {
  MatrixRequest,
  MatrixResponse,
} from '../../types/calculator';
import { formatApproxNumber, matrixToLatex, scalarToLatex } from '../display/format';
import {
  determinantExactMatrix,
  inverseExactMatrix,
  rrefExactMatrix,
} from './exact-matrix-core';
import {
  exactAddMatrices,
  exactMultiplyMatrices,
  exactSubtractMatrices,
  exactTransposeMatrix,
} from './matrix-exact-ops';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactScalarToLatex,
} from './exact-matrix-format';
import {
  runNumericMatrixOperation,
  solveNumericLinearSystem,
  type MatrixCoreResult,
  type MatrixCoreStopReason,
  type NumericMatrixRequest,
} from './matrix-core';
import { runMatrixBasis } from './matrix-basis';
import { runMatrixChangeOfBasis } from './matrix-change-of-basis';
import { runMatrixCoordinates } from './matrix-coordinates';
import { runMatrixDiagonalization, runMatrixSpectralPower } from './matrix-diagonalization';
import { runMatrixEigen } from './matrix-eigen';
import { runMatrixInvertibility } from './matrix-invertibility';
import { runMatrixLu, runMatrixLuSolve, runMatrixPlu, runMatrixPluSolve } from './matrix-lu';
import { runMatrixMultiRhsSolve } from './matrix-multi-rhs';
import { runMatrixColumnProjection, runMatrixLeastSquares, runMatrixQr } from './matrix-qr';
import { runMatrixSpaceOperation } from './matrix-spaces';
import { rowOperationDetailSection } from './row-operation-readback';

function matrixStopReasonToMessage(reason: MatrixCoreStopReason): string {
  switch (reason) {
    case 'matrix-a-incomplete':
      return 'Matrix A is incomplete.';
    case 'matrix-b-incomplete':
      return 'Matrix B is incomplete.';
    case 'add-subtract-dimension-mismatch':
      return 'Addition and subtraction require matching matrix dimensions.';
    case 'multiply-dimension-mismatch':
      return 'Matrix multiplication requires A columns to match B rows.';
    case 'det-a-non-square':
      return 'det(A) requires a square matrix.';
    case 'det-b-non-square':
      return 'det(B) requires a square Matrix B.';
    case 'inverse-a-singular-or-non-square':
      return 'Matrix A is singular or not square.';
    case 'inverse-b-singular-or-non-square':
      return 'Matrix B is singular or not square.';
    case 'unsupported-operation':
      return 'Unsupported matrix operation.';
  }
}

function exactMatrixReadback(req: MatrixRequest): string | null {
  const exactA = exactMatrixFromWire(req.exactMatrixA) ?? exactMatrixFromNumeric(req.matrixA);
  const exactB = req.matrixB
    ? exactMatrixFromWire(req.exactMatrixB) ?? exactMatrixFromNumeric(req.matrixB)
    : null;

  if (req.operation === 'add' || req.operation === 'subtract' || req.operation === 'multiply') {
    if (!exactA || !exactB) {
      return null;
    }
    const result = req.operation === 'add'
      ? exactAddMatrices(exactA, exactB)
      : req.operation === 'subtract'
        ? exactSubtractMatrices(exactA, exactB)
        : exactMultiplyMatrices(exactA, exactB);
    return result ? exactMatrixToLatex(result) : null;
  }

  if (req.operation === 'transposeA' || req.operation === 'transposeB') {
    const exactMatrix = req.operation === 'transposeA' ? exactA : exactB;
    if (!exactMatrix) {
      return null;
    }
    const result = exactTransposeMatrix(exactMatrix);
    return result ? exactMatrixToLatex(result) : null;
  }

  const exactMatrix =
    req.operation === 'detA' || req.operation === 'inverseA'
      ? exactA
      : req.operation === 'detB' || req.operation === 'inverseB'
        ? exactB
        : null;
  if (!exactMatrix) return null;

  if (req.operation === 'detA' || req.operation === 'detB') {
    const determinant = determinantExactMatrix(exactMatrix);
    return determinant.kind === 'success'
      ? exactScalarToLatex(determinant.determinant)
      : null;
  }

  if (req.operation === 'inverseA' || req.operation === 'inverseB') {
    const inverse = inverseExactMatrix(exactMatrix);
    return inverse.kind === 'success'
      ? exactMatrixToLatex(inverse.inverse)
      : null;
  }

  return null;
}

function matrixLabelA(req: MatrixRequest) {
  return req.matrixOperandLatexA ?? 'A';
}

function matrixLabelB(req: MatrixRequest) {
  return req.matrixOperandLatexB ?? 'B';
}

function exactRankRrefResponse(req: MatrixRequest): MatrixResponse | null {
  const targetMatrix =
    req.operation === 'rankA' || req.operation === 'rrefA'
      ? req.matrixA
      : req.operation === 'rankB' || req.operation === 'rrefB'
        ? req.matrixB
        : undefined;
  const targetExactMatrix =
    req.operation === 'rankA' || req.operation === 'rrefA'
      ? req.exactMatrixA
      : req.operation === 'rankB' || req.operation === 'rrefB'
        ? req.exactMatrixB
        : undefined;
  if (!targetMatrix) {
    return null;
  }

  const exactMatrix = exactMatrixFromWire(targetExactMatrix) ?? exactMatrixFromNumeric(targetMatrix);
  if (!exactMatrix) {
    return {
      warnings: [],
      error: 'Rank and RREF need exact Matrix entries in this move.',
    };
  }

  const reduced = rrefExactMatrix(exactMatrix);
  if (reduced.kind === 'stop') {
    return {
      warnings: [],
      error: reduced.reason === 'dimension-limit'
        ? 'Rank and RREF currently support matrices up to 6 by 6.'
        : 'Rank and RREF need a complete rectangular Matrix.',
    };
  }

  if (req.operation === 'rankA' || req.operation === 'rankB') {
    return {
      resultLatex: `${reduced.rank}`,
      approxText: formatApproxNumber(reduced.rank),
      warnings: [],
    };
  }

  return {
    resultLatex: exactMatrixToLatex(reduced.matrix),
    detailSections: [rowOperationDetailSection(reduced.rowOperations)],
    warnings: [],
  };
}

function exactSpaceResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'nullSpaceA' || req.operation === 'columnSpaceA') {
    return runMatrixSpaceOperation({
      kind: req.operation === 'nullSpaceA' ? 'nullSpace' : 'columnSpace',
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'nullSpaceB' || req.operation === 'columnSpaceB') {
    return req.matrixB
      ? runMatrixSpaceOperation({
          kind: req.operation === 'nullSpaceB' ? 'nullSpace' : 'columnSpace',
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactInvertibilityResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'invertibilityA') {
    return runMatrixInvertibility({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'invertibilityB') {
    return req.matrixB
      ? runMatrixInvertibility({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactBasisResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'basisA') {
    return runMatrixBasis({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'basisB') {
    return req.matrixB
      ? runMatrixBasis({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactCoordinatesResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'coordinatesA') {
    return runMatrixCoordinates({
      basisLabel: matrixLabelA(req),
      vectorLabel: req.coordinateVectorLatex ?? 'v',
      basisMatrix: req.matrixA,
      vector: req.coordinateVector ?? [],
      exactBasisMatrix: req.exactMatrixA,
      exactVector: req.exactCoordinateVector,
    });
  }

  if (req.operation === 'coordinatesB') {
    return req.matrixB
      ? runMatrixCoordinates({
          basisLabel: matrixLabelB(req),
          vectorLabel: req.coordinateVectorLatex ?? 'v',
          basisMatrix: req.matrixB,
          vector: req.coordinateVector ?? [],
          exactBasisMatrix: req.exactMatrixB,
          exactVector: req.exactCoordinateVector,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactChangeOfBasisResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation !== 'changeBasis') {
    return null;
  }

  return req.matrixB
    ? runMatrixChangeOfBasis({
        sourceLabel: matrixLabelA(req),
        targetLabel: matrixLabelB(req),
        sourceMatrix: req.matrixA,
        targetMatrix: req.matrixB,
        exactSourceMatrix: req.exactMatrixA,
        exactTargetMatrix: req.exactMatrixB,
      })
    : {
        warnings: [],
        error: 'Matrix B is incomplete.',
      };
}

function exactLuResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'luA') {
    return runMatrixLu({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'luB') {
    return req.matrixB
      ? runMatrixLu({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactPluResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'pluA') {
    return runMatrixPlu({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'pluB') {
    return req.matrixB
      ? runMatrixPlu({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactFactorSolveResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'luSolveA') {
    return runMatrixLuSolve({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
      rhs: req.systemRhs ?? [],
      exactRhs: req.exactSystemRhs,
      rhsLabel: req.systemRhsLatex ?? 'b',
    });
  }

  if (req.operation === 'luSolveB') {
    return req.matrixB
      ? runMatrixLuSolve({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
          rhs: req.systemRhs ?? [],
          exactRhs: req.exactSystemRhs,
          rhsLabel: req.systemRhsLatex ?? 'b',
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  if (req.operation === 'pluSolveA') {
    return runMatrixPluSolve({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
      rhs: req.systemRhs ?? [],
      exactRhs: req.exactSystemRhs,
      rhsLabel: req.systemRhsLatex ?? 'b',
    });
  }

  if (req.operation === 'pluSolveB') {
    return req.matrixB
      ? runMatrixPluSolve({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
          rhs: req.systemRhs ?? [],
          exactRhs: req.exactSystemRhs,
          rhsLabel: req.systemRhsLatex ?? 'b',
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactMultiRhsResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation !== 'multiRhsSolve') {
    return null;
  }

  return req.matrixB
    ? runMatrixMultiRhsSolve({
        coefficientLabel: matrixLabelA(req),
        rhsLabel: matrixLabelB(req),
        coefficients: req.matrixA,
        rhs: req.matrixB,
        exactCoefficients: req.exactMatrixA,
        exactRhs: req.exactMatrixB,
      })
    : {
        warnings: [],
        error: 'Multi-RHS solve needs a RHS matrix.',
      };
}

function exactQrResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'qrA') {
    return runMatrixQr({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'qrB') {
    return req.matrixB
      ? runMatrixQr({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactColumnProjectionResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'columnProjectionA') {
    return runMatrixColumnProjection({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
      vector: req.systemRhs ?? [],
      exactVector: req.exactSystemRhs,
      vectorLabel: req.systemRhsLatex ?? 'b',
    });
  }

  if (req.operation === 'columnProjectionB') {
    return req.matrixB
      ? runMatrixColumnProjection({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
          vector: req.systemRhs ?? [],
          exactVector: req.exactSystemRhs,
          vectorLabel: req.systemRhsLatex ?? 'b',
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactLeastSquaresResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'leastSquaresA') {
    return runMatrixLeastSquares({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
      vector: req.systemRhs ?? [],
      exactVector: req.exactSystemRhs,
      vectorLabel: req.systemRhsLatex ?? 'b',
    });
  }

  if (req.operation === 'leastSquaresB') {
    return req.matrixB
      ? runMatrixLeastSquares({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
          vector: req.systemRhs ?? [],
          exactVector: req.exactSystemRhs,
          vectorLabel: req.systemRhsLatex ?? 'b',
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactEigenResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'eigenA') {
    return runMatrixEigen({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'eigenB') {
    return req.matrixB
      ? runMatrixEigen({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactDiagonalizationResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'diagonalizeA') {
    return runMatrixDiagonalization({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
    });
  }

  if (req.operation === 'diagonalizeB') {
    return req.matrixB
      ? runMatrixDiagonalization({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function exactSpectralPowerResponse(req: MatrixRequest): MatrixResponse | null {
  if (req.operation === 'spectralPowerA') {
    return runMatrixSpectralPower({
      label: matrixLabelA(req),
      matrix: req.matrixA,
      exactMatrix: req.exactMatrixA,
      exponent: req.matrixPowerExponent ?? Number.NaN,
    });
  }

  if (req.operation === 'spectralPowerB') {
    return req.matrixB
      ? runMatrixSpectralPower({
          label: matrixLabelB(req),
          matrix: req.matrixB,
          exactMatrix: req.exactMatrixB,
          exponent: req.matrixPowerExponent ?? Number.NaN,
        })
      : {
          warnings: [],
          error: 'Matrix B is incomplete.',
        };
  }

  return null;
}

function matrixCoreResultToResponse(req: MatrixRequest, result: MatrixCoreResult): MatrixResponse {
  if (result.kind === 'error') {
    return {
      warnings: [],
      error: matrixStopReasonToMessage(result.reason),
    };
  }

  if (result.kind === 'scalar') {
    return {
      resultLatex: exactMatrixReadback(req) ?? scalarToLatex(result.value),
      approxText: formatApproxNumber(result.value),
      warnings: [],
    };
  }

  return {
    resultLatex: exactMatrixReadback(req) ?? matrixToLatex(result.value),
    warnings: [],
  };
}

export function solveLinearSystem(coefficients: number[][], constants: number[]) {
  return solveNumericLinearSystem(coefficients, constants);
}

export function runMatrixOperation(req: MatrixRequest): MatrixResponse {
  if (req.operation === 'linearSystem') {
    return {
      warnings: [],
      error: 'Structured Matrix systems run through the Matrix editor.',
    };
  }

  const exactResponse = exactRankRrefResponse(req);
  if (exactResponse) {
    return exactResponse;
  }

  const spaceResponse = exactSpaceResponse(req);
  if (spaceResponse) {
    return spaceResponse;
  }

  const invertibilityResponse = exactInvertibilityResponse(req);
  if (invertibilityResponse) {
    return invertibilityResponse;
  }

  const basisResponse = exactBasisResponse(req);
  if (basisResponse) {
    return basisResponse;
  }

  const coordinatesResponse = exactCoordinatesResponse(req);
  if (coordinatesResponse) {
    return coordinatesResponse;
  }

  const changeOfBasisResponse = exactChangeOfBasisResponse(req);
  if (changeOfBasisResponse) {
    return changeOfBasisResponse;
  }

  const luResponse = exactLuResponse(req);
  if (luResponse) {
    return luResponse;
  }

  const pluResponse = exactPluResponse(req);
  if (pluResponse) {
    return pluResponse;
  }

  const factorSolveResponse = exactFactorSolveResponse(req);
  if (factorSolveResponse) {
    return factorSolveResponse;
  }

  const multiRhsResponse = exactMultiRhsResponse(req);
  if (multiRhsResponse) {
    return multiRhsResponse;
  }

  const qrResponse = exactQrResponse(req);
  if (qrResponse) {
    return qrResponse;
  }

  const columnProjectionResponse = exactColumnProjectionResponse(req);
  if (columnProjectionResponse) {
    return columnProjectionResponse;
  }

  const leastSquaresResponse = exactLeastSquaresResponse(req);
  if (leastSquaresResponse) {
    return leastSquaresResponse;
  }

  const eigenResponse = exactEigenResponse(req);
  if (eigenResponse) {
    return eigenResponse;
  }

  const diagonalizationResponse = exactDiagonalizationResponse(req);
  if (diagonalizationResponse) {
    return diagonalizationResponse;
  }

  const spectralPowerResponse = exactSpectralPowerResponse(req);
  if (spectralPowerResponse) {
    return spectralPowerResponse;
  }

  const numericRequest: NumericMatrixRequest = {
    operation: req.operation as NumericMatrixRequest['operation'],
    matrixA: req.matrixA,
    matrixB: req.matrixB,
  };
  return matrixCoreResultToResponse(req, runNumericMatrixOperation(numericRequest));
}
