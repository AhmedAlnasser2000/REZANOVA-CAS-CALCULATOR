import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DerivativeVariable,
  FactoringStrategy,
  NormalizedExpression,
  PartialDerivativeRequest,
  SymbolicOperation,
} from '../../types/calculator';
import { factorAst } from './factoring';
import { differentiateAst } from './differentiation';
import { resolveSymbolicIntegralFromAst } from './integration';
import { normalizeLatex, normalizeNode } from './normalize';
import { resolvePartialDerivative } from './partials';

const ce = new ComputeEngine();

export type SymbolicEngineOutcome =
  | {
      kind: 'success';
      operation: SymbolicOperation;
      normalized: NormalizedExpression;
      exactLatex: string;
      origin: string;
      strategy?: FactoringStrategy;
    }
  | {
      kind: 'error';
      operation: SymbolicOperation;
      normalized?: NormalizedExpression;
      error: string;
    };

export function normalizeExpression(latex: string) {
  return normalizeLatex(latex);
}

export function runFactoringEngine(latex: string): SymbolicEngineOutcome {
  const normalized = normalizeLatex(latex);
  const result = factorAst(normalized.ast);
  return {
    kind: 'success',
    operation: 'factor',
    normalized,
    exactLatex: ce.box(result.node as Parameters<typeof ce.box>[0]).latex,
    origin: result.strategy === 'none' ? 'compute-engine' : 'symbolic-engine',
    strategy: result.strategy,
  };
}

export function runDerivativeEngine(latex: string, variable: DerivativeVariable = 'x'): SymbolicEngineOutcome {
  const normalized = normalizeLatex(latex);
  const exactAst = differentiateAst(normalized.ast, variable);
  return {
    kind: 'success',
    operation: 'differentiate',
    normalized,
    exactLatex: ce.box(exactAst as Parameters<typeof ce.box>[0]).latex,
    origin: 'symbolic-engine',
  };
}

export function runIntegralEngine(latex: string, variable: DerivativeVariable = 'x'): SymbolicEngineOutcome {
  const normalized = normalizeLatex(latex);
  const result = resolveSymbolicIntegralFromAst(normalized.ast, variable);
  if (result.kind === 'error') {
    return {
      kind: 'error',
      operation: 'integrate',
      normalized,
      error: result.error,
    };
  }

  return {
    kind: 'success',
    operation: 'integrate',
    normalized,
    exactLatex: result.exactLatex,
    origin: result.origin,
  };
}

export function runPartialDerivativeEngine(
  request: PartialDerivativeRequest,
): SymbolicEngineOutcome {
  const normalized = normalizeLatex(request.bodyLatex);
  const result = resolvePartialDerivative(request);
  if (result.kind === 'error') {
    return {
      kind: 'error',
      operation: 'partialDifferentiate',
      normalized,
      error: result.error,
    };
  }

  return {
    kind: 'success',
    operation: 'partialDifferentiate',
    normalized,
    exactLatex: result.exactLatex,
    origin: 'symbolic-engine',
  };
}

export function normalizeExpressionNode(node: unknown) {
  return normalizeNode(node);
}
