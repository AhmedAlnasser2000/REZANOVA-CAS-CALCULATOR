import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayBranchReadback } from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { simplifyMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/simplification/simplification';
import { sortEquationBranchLatex } from '../equation-branch-readback';
import type { MathJson } from '../parameterized/math-json';
import {
  normalizeExactReadbackExpression,
  type ExactReadbackNormalizationContext,
} from './normalization';

const ce = new ComputeEngine();

export type EquationFiniteBranchExpression = {
  latex: string;
  node?: unknown;
};

type FiniteBranchExpressionOptions = {
  targetLatex: string;
  branches: readonly EquationFiniteBranchExpression[];
  source: string;
  label?: DisplayBranchReadback['label'];
  relationLatex?: DisplayBranchReadback['relationLatex'];
  preserveOrder?: boolean;
  setSeparator?: string;
  context?: ExactReadbackNormalizationContext;
};

function branchContext(
  target: string,
  context: ExactReadbackNormalizationContext = {},
): ExactReadbackNormalizationContext {
  return {
    target,
    validatedRootExpression: true,
    allowPlainImaginaryUnit: true,
    ...context,
  };
}

function hasSymbol(node: unknown): boolean {
  if (typeof node === 'string') {
    return true;
  }
  if (Array.isArray(node)) {
    return node.slice(1).some(hasSymbol);
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some(hasSymbol);
  }
  return false;
}

function renderNodeLatex(node: unknown) {
  try {
    const simplified = simplifyMathJsonNodeOrOriginal(node) as MathJson;
    const renderNode = hasSymbol(simplified)
      ? simplified
      : ce.box(simplified as Parameters<typeof ce.box>[0]).evaluate().json;
    return ce.box(renderNode as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return null;
  }
}

export function normalizeFiniteBranchExpression({
  latex,
  node,
  target,
  context,
}: EquationFiniteBranchExpression & {
  target: string;
  context?: ExactReadbackNormalizationContext;
}) {
  const nodeLatex = node === undefined ? null : renderNodeLatex(node);
  return normalizeExactReadbackExpression(nodeLatex ?? latex, branchContext(target, context)).latex;
}

export function normalizeFiniteBranchExpressions(
  branches: readonly EquationFiniteBranchExpression[],
  target: string,
  context?: ExactReadbackNormalizationContext,
) {
  return branches
    .map((branch) => normalizeFiniteBranchExpression({
      ...branch,
      target,
      context,
    }))
    .filter((branch) => branch.length > 0);
}

export function uniqueFiniteBranchExpressions({
  targetLatex,
  branches,
  preserveOrder,
  context,
}: Pick<FiniteBranchExpressionOptions, 'targetLatex' | 'branches' | 'preserveOrder' | 'context'>) {
  const normalized = normalizeFiniteBranchExpressions(branches, targetLatex, context);
  return preserveOrder
    ? [...new Set(normalized)]
    : sortEquationBranchLatex([...new Set(normalized)]);
}

export function exactLatexForFiniteBranchExpressions(options: Pick<
  FiniteBranchExpressionOptions,
  'targetLatex' | 'branches' | 'preserveOrder' | 'context' | 'setSeparator'
>) {
  const branches = uniqueFiniteBranchExpressions(options);
  return branches.length === 1
    ? `${options.targetLatex}=${branches[0]}`
    : `${options.targetLatex}\\in\\left\\{${branches.join(options.setSeparator ?? ',\\ ')}\\right\\}`;
}

export function finiteBranchReadbackForFiniteBranchExpressions(options: FiniteBranchExpressionOptions) {
  const branchesLatex = uniqueFiniteBranchExpressions(options);
  return finiteBranchReadbackMetadata({
    targetLatex: options.targetLatex,
    relationLatex: options.relationLatex,
    branchesLatex,
    source: options.source,
    ...(options.label ? { label: options.label } : {}),
  });
}
