import type { LinearAlgebraScalarDomain } from '../../types/calculator';
import type {
  MatrixEditorDispatchInput,
  VectorEditorDispatchInput,
} from './editor-dispatch';

export async function dispatchMatrixEditorLatex(input: MatrixEditorDispatchInput) {
  const runtime = await import('./editor-dispatch');
  return runtime.dispatchMatrixEditorLatex(input);
}

export async function dispatchVectorEditorLatex(input: VectorEditorDispatchInput) {
  const runtime = await import('./editor-dispatch');
  return runtime.dispatchVectorEditorLatex(input);
}

export async function parseLinearAlgebraScalarWire(
  latex: string,
  domain: LinearAlgebraScalarDomain,
) {
  const runtime = await import('./scalar-wire');
  return runtime.parseLinearAlgebraScalarWire(latex, domain);
}
