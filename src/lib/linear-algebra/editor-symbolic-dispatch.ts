import type { LinearAlgebraMatrixNamedValue } from './named-values';
import type { MatrixEditorDispatchInput } from './editor-dispatch';
import { dispatchSymbolicMatrixEditorLatex } from './symbolic-matrix-editor';

export function dispatchSymbolicMatrixInput(
  input: MatrixEditorDispatchInput,
  matrixValues: readonly LinearAlgebraMatrixNamedValue[],
) {
  return dispatchSymbolicMatrixEditorLatex({
    latex: input.latex,
    matrixValues,
    activeMatrixLeftId: input.activeMatrixLeftId,
    activeMatrixRightId: input.activeMatrixRightId,
    domain: input.domain ?? 'real',
    substitutionMode: input.substitutionMode ?? 'symbolic',
    storedVariables: input.storedVariables ?? [],
    complexExactForm: input.complexExactForm ?? 'rectangular',
  });
}
