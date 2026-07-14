import type {
  CandidateValidationResult,
  DisplayBranchReadback,
  CanonicalMathValueV1,
  SerializableMathJson,
} from '../../../types/calculator';
import {
  profileDomainMathValue,
} from '../../display/printer';
import {
  exactLatexForFiniteBranchExpressions,
  finiteBranchReadbackForFiniteBranchExpressions,
  normalizeFiniteBranchExpression,
  uniqueFiniteBranchExpressions,
  type EquationFiniteBranchExpression,
  type EquationPresentationContext,
} from '../presentation/finite-roots';
import type { ExactReadbackNormalizationContext } from '../readback/normalization';

export type FiniteRootCandidateValidationState =
  | { kind: 'unchecked' }
  | { kind: 'accepted'; evidence?: CandidateValidationResult }
  | { kind: 'rejected'; reason: string; evidence?: CandidateValidationResult };

export type FiniteRootBranch = {
  latex: string;
  node?: unknown;
  source?: string;
  validation?: FiniteRootCandidateValidationState;
};

export type FiniteRootSet = {
  kind: 'finite-root-set';
  targetLatex: string;
  branches: FiniteRootBranch[];
  source: string;
};

export type FiniteRootSetRenderOptions = {
  preserveOrder?: boolean;
  setSeparator?: string;
  relationLatex?: DisplayBranchReadback['relationLatex'];
  label?: DisplayBranchReadback['label'];
  context?: ExactReadbackNormalizationContext;
  presentationContext?: Pick<EquationPresentationContext, 'complexExactForm'>;
};

export type FiniteRootSetRender = {
  exactLatex?: string;
  primaryMath?: CanonicalMathValueV1;
  branchReadback?: DisplayBranchReadback;
  branchesLatex: string[];
  rejectedBranches: FiniteRootBranch[];
};

function profiledFiniteRootMath(
  rootSet: FiniteRootSet,
  branchesLatex: readonly string[],
  exactLatex: string,
  options: FiniteRootSetRenderOptions,
) {
  if (!/^[A-Za-z]$/.test(rootSet.targetLatex)) {
    return { exactLatex };
  }

  const nodeByLatex = new Map<string, SerializableMathJson>();
  for (const branch of visibleFiniteRootBranches(rootSet)) {
    if (branch.node === undefined) continue;
    const normalizedLatex = normalizeFiniteBranchExpression({
      latex: branch.latex,
      node: branch.node,
      target: rootSet.targetLatex,
      ...(options.context ? { context: options.context } : {}),
      ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
    });
    if (!nodeByLatex.has(normalizedLatex)) {
      nodeByLatex.set(normalizedLatex, branch.node as SerializableMathJson);
    }
  }

  if (branchesLatex.some((branchLatex) => !nodeByLatex.has(branchLatex))) {
    return { exactLatex };
  }

  const nodes = branchesLatex.map((branchLatex) => nodeByLatex.get(branchLatex)!);
  const answerNode: SerializableMathJson = nodes.length === 1
    ? ['Equal', rootSet.targetLatex, nodes[0]]
    : ['Element', rootSet.targetLatex, ['Set', ...nodes]];
  const profiled = profileDomainMathValue(exactLatex, answerNode);
  return profiled
    ? { exactLatex: profiled.canonicalLatex, primaryMath: profiled.primaryMath }
    : { exactLatex };
}

export function createFiniteRootBranch(
  latex: string,
  options: Omit<FiniteRootBranch, 'latex'> = {},
): FiniteRootBranch {
  return {
    latex,
    ...options,
  };
}

export function createFiniteRootSet(input: {
  targetLatex: string;
  branches: readonly (string | FiniteRootBranch)[];
  source: string;
}): FiniteRootSet {
  return {
    kind: 'finite-root-set',
    targetLatex: input.targetLatex,
    source: input.source,
    branches: input.branches.map((branch) =>
      typeof branch === 'string' ? createFiniteRootBranch(branch, { source: input.source }) : branch),
  };
}

export function visibleFiniteRootBranches(rootSet: FiniteRootSet): FiniteRootBranch[] {
  return rootSet.branches.filter((branch) => branch.validation?.kind !== 'rejected');
}

export function finiteRootBranchExpressions(rootSet: FiniteRootSet): EquationFiniteBranchExpression[] {
  return visibleFiniteRootBranches(rootSet).map((branch) => ({
    latex: branch.latex,
    ...(branch.node !== undefined ? { node: branch.node } : {}),
  }));
}

export function uniqueFiniteRootSetBranchLatex(
  rootSet: FiniteRootSet,
  options: Pick<FiniteRootSetRenderOptions, 'preserveOrder' | 'context' | 'presentationContext'> = {},
) {
  return uniqueFiniteBranchExpressions({
    targetLatex: rootSet.targetLatex,
    branches: finiteRootBranchExpressions(rootSet),
    preserveOrder: options.preserveOrder,
    ...(options.context ? { context: options.context } : {}),
    ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
  });
}

export function renderFiniteRootSet(
  rootSet: FiniteRootSet,
  options: FiniteRootSetRenderOptions = {},
): FiniteRootSetRender {
  const branches = finiteRootBranchExpressions(rootSet);
  const branchesLatex = uniqueFiniteBranchExpressions({
    targetLatex: rootSet.targetLatex,
    branches,
    preserveOrder: options.preserveOrder,
    ...(options.context ? { context: options.context } : {}),
    ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
  });
  const rejectedBranches = rootSet.branches.filter((branch) => branch.validation?.kind === 'rejected');

  if (branchesLatex.length === 0) {
    return {
      branchesLatex,
      rejectedBranches,
    };
  }

  const exactLatex = exactLatexForFiniteBranchExpressions({
      targetLatex: rootSet.targetLatex,
      branches,
      preserveOrder: options.preserveOrder,
      ...(options.setSeparator ? { setSeparator: options.setSeparator } : {}),
      ...(options.context ? { context: options.context } : {}),
    ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
  });
  const profiledMath = profiledFiniteRootMath(rootSet, branchesLatex, exactLatex, options);

  return {
    exactLatex: profiledMath.exactLatex,
    ...(profiledMath.primaryMath ? { primaryMath: profiledMath.primaryMath } : {}),
    branchReadback: finiteBranchReadbackForFiniteBranchExpressions({
      targetLatex: rootSet.targetLatex,
      branches,
      source: rootSet.source,
      preserveOrder: options.preserveOrder,
      ...(options.context ? { context: options.context } : {}),
      ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
      ...(options.relationLatex ? { relationLatex: options.relationLatex } : {}),
      ...(options.label ? { label: options.label } : {}),
    }),
    branchesLatex,
    rejectedBranches,
  };
}
