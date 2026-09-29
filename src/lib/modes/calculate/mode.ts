import type { VersionedResultProducerDraft } from '../../../types/calculator';
import { runCalculateInlineLinearAlgebra } from './inline-linear-algebra';
import { runCalculateMode as runStandardCalculateMode } from './standard';
import type { RunCalculateModeRequest } from './types';

/** Calculate entry point: typed matrix/vector literals first, then the frozen standard producer. */
export function runCalculateMode(request: RunCalculateModeRequest): VersionedResultProducerDraft {
  return runCalculateInlineLinearAlgebra(request) ?? runStandardCalculateMode(request);
}
