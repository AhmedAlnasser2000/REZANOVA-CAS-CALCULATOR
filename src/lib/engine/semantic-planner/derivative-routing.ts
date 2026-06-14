import {
  differentiateLatexWithMetadata,
} from '../../symbolic-engine/differentiation';
import { parsePartialDerivativeLatex, resolvePartialDerivative } from '../../symbolic-engine/partials';
import type { CalculusDerivativeStrategy, PlannerStep } from '../../../types/calculator';
import { collectDerivativeBody } from './latex-segments';

const DERIVATIVE_PREFIXES = [
  '\\frac{d}{dx}',
  '\\frac{d}{dy}',
  '\\frac{d}{dz}',
];
const PARTIAL_PREFIXES = [
  '\\frac{\\partial}{\\partial x}',
  '\\frac{\\partial}{\\partial y}',
  '\\frac{\\partial}{\\partial z}',
];

function mergeDerivativeStrategies(
  target: Set<CalculusDerivativeStrategy>,
  strategies: readonly CalculusDerivativeStrategy[],
) {
  for (const strategy of strategies) {
    target.add(strategy);
  }
}

export function replaceDifferentialSegments(
  source: string,
  steps: PlannerStep[],
  derivativeStrategies = new Set<CalculusDerivativeStrategy>(),
) {
  let current = source;
  let changed = true;

  while (changed) {
    changed = false;
    let rebuilt = '';
    let index = 0;

    while (index < current.length) {
      const derivativePrefix = DERIVATIVE_PREFIXES.find((prefix) => current.startsWith(prefix, index));
      const partialPrefix = PARTIAL_PREFIXES.find((prefix) => current.startsWith(prefix, index));
      if (!derivativePrefix && !partialPrefix) {
        rebuilt += current[index];
        index += 1;
        continue;
      }

      const prefix = derivativePrefix ?? partialPrefix!;
      const variable = prefix[prefix.length - 2];
      const body = collectDerivativeBody(current, index + prefix.length);
      if (!body) {
        return {
          ok: false as const,
          error: `This ${derivativePrefix ? 'derivative' : 'partial derivative'} could not be reduced safely before execution.`,
        };
      }

      const before = current.slice(index, body.nextIndex);
      try {
        const after = derivativePrefix
          ? (() => {
              const derivative = differentiateLatexWithMetadata(body.body, variable);
              mergeDerivativeStrategies(derivativeStrategies, derivative.strategies);
              return derivative.latex;
            })()
          : (() => {
              const partialRequest = parsePartialDerivativeLatex(`${prefix}${body.body}`);
              if (!partialRequest) {
                throw new Error('unsupported-partial');
              }
              const resolved = resolvePartialDerivative(partialRequest);
              if (resolved.kind === 'error') {
                throw new Error(resolved.error);
              }
              return resolved.exactLatex;
            })();

        steps.push({
          kind: derivativePrefix ? 'reduce-derivative' : 'reduce-partial',
          before,
          after,
        });
        rebuilt += after;
        index = body.nextIndex;
        changed = true;
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error && error.message
            ? error.message
            : `This ${derivativePrefix ? 'derivative' : 'partial derivative'} is outside the supported symbolic rules.`,
        };
      }
    }

    current = rebuilt;
  }

  return {
    ok: true as const,
    latex: current,
    derivativeStrategies: [...derivativeStrategies],
  };
}
