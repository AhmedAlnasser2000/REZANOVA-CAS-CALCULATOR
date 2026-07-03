import type { DisplayBranchReadback } from '../../../types/calculator';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
  uniqueFiniteRootSetBranchLatex,
} from '../solution/finite-root-set';
import {
  type ExactReadbackNormalizationContext,
} from './normalization';

type FiniteBranchReadbackOptions = {
  targetLatex: string;
  branchesLatex: readonly string[];
  source: string;
  countLabel?: DisplayBranchReadback['countLabel'];
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

export function normalizeFiniteBranchLatex(
  branchesLatex: readonly string[],
  target: string,
  context?: ExactReadbackNormalizationContext,
) {
  return uniqueFiniteRootSetBranchLatex(
    createFiniteRootSet({
      targetLatex: target,
      branches: branchesLatex,
      source: 'equation-finite-branch-normalization',
    }),
    {
      preserveOrder: true,
      context: branchContext(target, context),
    },
  );
}

export function uniqueFiniteBranchLatex({
  targetLatex,
  branchesLatex,
  preserveOrder,
  context,
}: Pick<FiniteBranchReadbackOptions, 'targetLatex' | 'branchesLatex' | 'preserveOrder' | 'context'>) {
  return uniqueFiniteRootSetBranchLatex(
    createFiniteRootSet({
      targetLatex,
      branches: branchesLatex,
      source: 'equation-finite-branches',
    }),
    {
      preserveOrder,
      context: branchContext(targetLatex, context),
    },
  );
}

export function exactLatexForFiniteBranches(options: Pick<
  FiniteBranchReadbackOptions,
  'targetLatex' | 'branchesLatex' | 'preserveOrder' | 'context' | 'setSeparator'
>) {
  const rendered = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: options.targetLatex,
      branches: options.branchesLatex,
      source: 'equation-finite-branches',
    }),
    {
      preserveOrder: options.preserveOrder,
      context: branchContext(options.targetLatex, options.context),
      ...(options.setSeparator ? { setSeparator: options.setSeparator } : {}),
    },
  );
  return rendered.exactLatex ?? `${options.targetLatex}\\in\\left\\{\\right\\}`;
}

export function finiteBranchReadbackForNormalizedBranches(options: FiniteBranchReadbackOptions) {
  const rendered = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: options.targetLatex,
      branches: options.branchesLatex,
      source: options.source,
    }),
    {
      preserveOrder: options.preserveOrder,
      context: branchContext(options.targetLatex, options.context),
      ...(options.relationLatex ? { relationLatex: options.relationLatex } : {}),
      ...(options.label ? { label: options.label } : {}),
    },
  );
  if (!rendered.branchReadback) {
    return undefined;
  }
  return {
    ...rendered.branchReadback,
    ...(options.countLabel ? { countLabel: options.countLabel } : {}),
  };
}
