import { requireField, type ExactField } from './field';
import {demand,type ExecutionContext} from './execution';
import { solveArithmeticLinearSystem, verifyArithmeticLinearSolution, type LinearSystem, type LinearSolution } from './arithmetic-linear';
export type { LinearSystem, LinearSolution, RowOperation } from './arithmetic-linear';

/** Existing characteristic-zero entry points and certificate formats stay fixed. */
export function solveLinearSystem<E>(ctx: ExecutionContext, field: ExactField<E>, system: LinearSystem<E>): LinearSolution<E> {
  requireField(field);demand(field.characteristic===0,'domain-mismatch','characteristic-zero linear entry point');return solveArithmeticLinearSystem(ctx, field, system);
}
export function verifyLinearSolution<E>(ctx: ExecutionContext, field: ExactField<E>, system: LinearSystem<E>, result: LinearSolution<E>): void {
  requireField(field);demand(field.characteristic===0,'domain-mismatch','characteristic-zero linear entry point');verifyArithmeticLinearSolution(ctx, field, system, result);
}
