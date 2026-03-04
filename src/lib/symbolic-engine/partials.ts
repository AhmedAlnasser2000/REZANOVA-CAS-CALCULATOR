import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DerivativeVariable, PartialDerivativeRequest } from '../../types/calculator';
import { differentiateAst } from './differentiation';

const ce = new ComputeEngine();

export type PartialDerivativeResolution =
  | {
      kind: 'success';
      exactLatex: string;
      variable: DerivativeVariable;
    }
  | {
      kind: 'error';
      error: string;
      variable: DerivativeVariable;
    };

const PARTIAL_PATTERN = /^\\frac\{\\partial\}\{\\partial\s*([xyz])\}\\left\((.*)\\right\)$/s;

export function parsePartialDerivativeLatex(latex: string): PartialDerivativeRequest | undefined {
  const trimmed = latex.trim();
  const match = trimmed.match(PARTIAL_PATTERN);
  if (!match) {
    return undefined;
  }

  return {
    variable: match[1] as DerivativeVariable,
    bodyLatex: match[2].trim(),
  };
}

export function resolvePartialDerivative(
  request: PartialDerivativeRequest,
): PartialDerivativeResolution {
  const bodyLatex = request.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      kind: 'error',
      variable: request.variable,
      error: 'Enter an expression before taking a partial derivative.',
    };
  }

  try {
    const parsed = ce.parse(bodyLatex);
    const differentiated = differentiateAst(parsed.json, request.variable);
    return {
      kind: 'success',
      variable: request.variable,
      exactLatex: ce.box(differentiated as Parameters<typeof ce.box>[0]).latex,
    };
  } catch {
    return {
      kind: 'error',
      variable: request.variable,
      error: `This partial derivative in ${request.variable} is outside the supported symbolic rules.`,
    };
  }
}
