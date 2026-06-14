import type {
  EvaluateRequest,
  EvaluateResponse,
} from '../../../types/calculator';
import { getExpressionExecutionBudget } from '../../kernel/runtime-profile';
import { runExpressionActionHost } from './descriptors';
import {
  prepareExpressionRequest,
  prepareExpressionRuntime,
} from './expression-prep';
import type { SymbolicAction } from './types';

export { listExpressionActionDescriptors } from './descriptors';

export function runExpressionAction(
  request: EvaluateRequest,
  action: SymbolicAction,
): EvaluateResponse {
  const executionBudget = getExpressionExecutionBudget();
  const preparedRequest = prepareExpressionRequest(request, action);
  if (preparedRequest.kind === 'done') {
    return preparedRequest.response;
  }

  try {
    const preparedRuntime = prepareExpressionRuntime(request, action, preparedRequest.rawLatex);
    if (preparedRuntime.kind === 'done') {
      return preparedRuntime.response;
    }

    return runExpressionActionHost({
      request,
      action,
      executionBudget,
      preparedRequest,
      preparedRuntime,
    });
  } catch {
    return {
      warnings: [],
      error: 'Expression could not be parsed or evaluated.',
    };
  }
}
