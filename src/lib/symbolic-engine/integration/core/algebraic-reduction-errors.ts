/** Only failed good-reduction hypotheses may advance deterministic search.
 * Arithmetic exhaustion and evidence failures are never swallowed. */
export class RejectedAlgebraicReduction extends Error {}
export function requireGoodReduction(condition: boolean, reason: string): asserts condition { if (!condition) throw new RejectedAlgebraicReduction(reason); }
import {AlgebraError} from './execution';
export function verifyGoodReductionClaim<T>(run:()=>T):T{try{return run();}catch(error){if(error instanceof RejectedAlgebraicReduction)throw new AlgebraError('verification-failed',`claimed good reduction: ${error.message}`);throw error;}}
