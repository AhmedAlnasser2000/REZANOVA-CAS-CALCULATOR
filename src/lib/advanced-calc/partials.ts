import { resolvePartialDerivative } from '../symbolic-engine/partials';
import type {
  AdvancedCalcResultOrigin,
  PartialDerivativeWorkbenchState,
} from '../../types/calculator';

export type AdvancedPartialEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: AdvancedCalcResultOrigin;
};

export function evaluateAdvancedPartialDerivative(
  state: PartialDerivativeWorkbenchState,
): AdvancedPartialEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Enter a multivariable expression before taking a partial derivative.',
    };
  }

  const resolved = resolvePartialDerivative({
    bodyLatex,
    variable: state.variable,
  });

  if (resolved.kind === 'error') {
    return {
      warnings: [],
      error: resolved.error,
    };
  }

  return {
    exactLatex: resolved.exactLatex,
    warnings: [],
    resultOrigin: 'symbolic',
  };
}
