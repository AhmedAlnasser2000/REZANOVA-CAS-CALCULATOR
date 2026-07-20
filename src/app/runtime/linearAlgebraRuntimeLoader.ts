import type { RunMatrixModeRequest } from '../../lib/modes/matrix';
import type { RunVectorModeRequest } from '../../lib/modes/vector';
import type { MatrixOperation, VectorOperation } from '../../types/calculator';
import type { MatrixActionRuntimeState } from './linearAlgebraMatrixActionRequest';
import type { VectorActionRuntimeState } from './linearAlgebraVectorActionRequest';

export async function runMatrixModeWithOoePilot(
  request: RunMatrixModeRequest,
  options?: Parameters<typeof import('../../lib/modes/matrix').runMatrixModeWithOoePilot>[1],
) {
  const runtime = await import('../../lib/modes/matrix');
  return runtime.runMatrixModeWithOoePilot(request, options);
}

export async function runVectorModeWithOoePilot(
  request: RunVectorModeRequest,
  options?: Parameters<typeof import('../../lib/modes/vector').runVectorModeWithOoePilot>[1],
) {
  const runtime = await import('../../lib/modes/vector');
  return runtime.runVectorModeWithOoePilot(request, options);
}

export async function buildMatrixActionRuntimeRequest(
  operation: MatrixOperation,
  state: MatrixActionRuntimeState,
) {
  const runtime = await import('./linearAlgebraMatrixActionRequest');
  return runtime.buildMatrixActionRuntimeRequest(operation, state);
}

export async function buildVectorActionRuntimeRequest(
  operation: VectorOperation,
  state: VectorActionRuntimeState,
) {
  const runtime = await import('./linearAlgebraVectorActionRequest');
  return runtime.buildVectorActionRuntimeRequest(operation, state);
}

export {
  dispatchMatrixEditorLatex,
  dispatchVectorEditorLatex,
  parseLinearAlgebraScalarWire,
} from '../../lib/linear-algebra/runtime-loader';
