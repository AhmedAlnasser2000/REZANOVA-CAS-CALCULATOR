import type { DisplayBranchReadback } from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { sortEquationBranchLatex } from '../equation-branch-readback';
import {
  normalizeExactReadbackExpression,
  type ExactReadbackNormalizationContext,
} from './normalization';

type FiniteBranchReadbackOptions = {
  targetLatex: string;
  branchesLatex: readonly string[];
  source: string;
  label?: DisplayBranchReadback['label'];
  relationLatex?: DisplayBranchReadback['relationLatex'];
  preserveOrder?: boolean;
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

export function normalizeFiniteBranchLatex(
  branchesLatex: readonly string[],
  target: string,
  context?: ExactReadbackNormalizationContext,
) {
  const resolvedContext = branchContext(target, context);
  return branchesLatex
    .map((branch) => normalizeExactReadbackExpression(branch, resolvedContext).latex)
    .filter((branch) => branch.length > 0);
}

export function uniqueFiniteBranchLatex({
  targetLatex,
  branchesLatex,
  preserveOrder,
  context,
}: Pick<FiniteBranchReadbackOptions, 'targetLatex' | 'branchesLatex' | 'preserveOrder' | 'context'>) {
  const normalized = normalizeFiniteBranchLatex(branchesLatex, targetLatex, context);
  return preserveOrder
    ? [...new Set(normalized)]
    : sortEquationBranchLatex([...new Set(normalized)]);
}

export function exactLatexForFiniteBranches(options: Pick<
  FiniteBranchReadbackOptions,
  'targetLatex' | 'branchesLatex' | 'preserveOrder' | 'context'
>) {
  const branches = uniqueFiniteBranchLatex(options);
  return branches.length === 1
    ? `${options.targetLatex}=${branches[0]}`
    : `${options.targetLatex}\\in\\left\\{${branches.join(',\\ ')}\\right\\}`;
}

export function finiteBranchReadbackForNormalizedBranches(options: FiniteBranchReadbackOptions) {
  const branchesLatex = uniqueFiniteBranchLatex(options);
  return finiteBranchReadbackMetadata({
    targetLatex: options.targetLatex,
    relationLatex: options.relationLatex,
    branchesLatex,
    source: options.source,
    ...(options.label ? { label: options.label } : {}),
  });
}
