import { finishScalarMultipleRetry, splitScalarMultiple } from './scalar-multiple';
import type { IntegralResolution } from './types';

type RetryRoute = (
  node: unknown,
  variable: string,
  recognitionGates: boolean,
  allowNormalForm: boolean,
  allowTrigRewrite: boolean,
  allowScalarMultiple?: boolean,
) => IntegralResolution;

export function tryScalarMultipleRetry(
  node: unknown,
  variable: string,
  recognitionGates: boolean,
  allowNormalForm: boolean,
  allowTrigRewrite: boolean,
  retryRoute: RetryRoute,
): IntegralResolution | undefined {
  const split = splitScalarMultiple(node, variable);
  if (!split) {
    return undefined;
  }

  const retried = retryRoute(
    split.body,
    variable,
    recognitionGates,
    allowNormalForm,
    allowTrigRewrite,
    false,
  );
  if (retried.kind !== 'success') {
    return undefined;
  }

  return finishScalarMultipleRetry(node, variable, split, retried);
}
