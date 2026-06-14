import type { EvaluateResponse } from '../../../types/calculator';
import { executePreparedExpressionAction } from './expression-execution';
import type {
  ExpressionActionContext,
  ExpressionActionDescriptor,
} from './types';

const EXPRESSION_ACTION_DESCRIPTORS: ExpressionActionDescriptor[] = [
  {
    id: 'evaluate',
    label: 'Evaluate',
    publicCapabilityId: 'expression.evaluate',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'simplify',
    label: 'Simplify',
    publicCapabilityId: 'expression.simplify',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'factor',
    label: 'Factor',
    publicCapabilityId: 'expression.factor',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'expand',
    label: 'Expand',
    publicCapabilityId: 'expression.expand',
    execute: executePreparedExpressionAction,
  },
  {
    id: 'solve',
    label: 'Solve',
    execute: executePreparedExpressionAction,
  },
];

export function listExpressionActionDescriptors(): ExpressionActionDescriptor[] {
  return EXPRESSION_ACTION_DESCRIPTORS;
}

export function runExpressionActionHost(
  context: ExpressionActionContext,
): EvaluateResponse {
  const descriptor = EXPRESSION_ACTION_DESCRIPTORS.find((entry) => entry.id === context.action);
  if (!descriptor) {
    return {
      warnings: [],
      error: 'Expression action is not supported by the shared runtime host.',
    };
  }

  return descriptor.execute(context);
}
