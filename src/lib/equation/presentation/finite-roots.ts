import { ComputeEngine } from '@cortex-js/compute-engine';
import type { ComplexExactForm, DisplayBranchReadback } from '../../../types/calculator';
import type { VariableAnalysis } from '../../algebra/variable-core/types';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { simplifyMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/simplification/simplification';
import { sortEquationBranchLatex } from '../equation-branch-readback';
import type { MathJson } from '../parameterized/math-json';
import {
  normalizeExactReadbackExpression,
  type EquationReadbackDomainIntent,
  type ExactReadbackNormalizationContext,
} from '../readback/normalization';
import { renderComplexPrincipalRootBranchNode } from '../roots/complex-principal-roots';
import { renderCubicCardanoBranchNode } from '../roots/cubic-cardano-roots';

const ce = new ComputeEngine();

export type EquationPresentationContext = {
  target: string;
  variableAnalysis?: VariableAnalysis;
  domainIntent?: EquationReadbackDomainIntent;
  complexExactForm?: ComplexExactForm;
  reservedIdentifiers?: readonly string[];
  source?: string;
};

export type EquationFiniteRootPresentation = {
  target: string;
  fallbackLatex: string;
  node?: unknown;
  source?: string;
  branchReference?: string;
  factReferences?: readonly string[];
};

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
  presentationContext?: Pick<EquationPresentationContext, 'complexExactForm'>;
};

function normalizationContextFromPresentation(
  context: EquationPresentationContext,
): ExactReadbackNormalizationContext {
  return {
    target: context.target,
    validatedRootExpression: true,
    allowPlainImaginaryUnit: true,
    ...(context.variableAnalysis ? { variableAnalysis: context.variableAnalysis } : {}),
    ...(context.domainIntent ? { domainIntent: context.domainIntent } : {}),
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

function renderNodeLatex(node: unknown, context: EquationPresentationContext) {
  const cardanoLatex = renderCubicCardanoBranchNode(node, {
    complexExactForm: context.complexExactForm,
  });
  if (cardanoLatex) {
    return cardanoLatex;
  }

  const principalRootLatex = renderComplexPrincipalRootBranchNode(node, {
    complexExactForm: context.complexExactForm,
  });
  if (principalRootLatex) {
    return principalRootLatex;
  }

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

export function renderFiniteRootPresentation(
  root: EquationFiniteRootPresentation,
  context: EquationPresentationContext = { target: root.target },
) {
  const resolvedContext = { ...context, target: root.target };
  const nodeLatex = root.node === undefined ? null : renderNodeLatex(root.node, resolvedContext);
  return normalizeExactReadbackExpression(
    nodeLatex ?? root.fallbackLatex,
    normalizationContextFromPresentation(resolvedContext),
  ).latex;
}

export function normalizeFiniteBranchExpression({
  latex,
  node,
  target,
  context,
  presentationContext,
}: EquationFiniteBranchExpression & {
  target: string;
  context?: ExactReadbackNormalizationContext;
  presentationContext?: Pick<EquationPresentationContext, 'complexExactForm'>;
}) {
  return renderFiniteRootPresentation(
    {
      target,
      fallbackLatex: latex,
      ...(node !== undefined ? { node } : {}),
    },
    {
      target,
      ...(context?.variableAnalysis ? { variableAnalysis: context.variableAnalysis } : {}),
      ...(context?.domainIntent ? { domainIntent: context.domainIntent } : {}),
      ...(presentationContext?.complexExactForm ? { complexExactForm: presentationContext.complexExactForm } : {}),
    },
  );
}

export function normalizeFiniteBranchExpressions(
  branches: readonly EquationFiniteBranchExpression[],
  target: string,
  context?: ExactReadbackNormalizationContext,
  presentationContext?: Pick<EquationPresentationContext, 'complexExactForm'>,
) {
  return branches
    .map((branch) => normalizeFiniteBranchExpression({
      ...branch,
      target,
      context,
      presentationContext,
    }))
    .filter((branch) => branch.length > 0);
}

export function uniqueFiniteBranchExpressions({
  targetLatex,
  branches,
  preserveOrder,
  context,
  presentationContext,
}: Pick<FiniteBranchExpressionOptions, 'targetLatex' | 'branches' | 'preserveOrder' | 'context' | 'presentationContext'>) {
  const normalized = normalizeFiniteBranchExpressions(branches, targetLatex, context, presentationContext);
  return preserveOrder
    ? [...new Set(normalized)]
    : sortEquationBranchLatex([...new Set(normalized)]);
}

export function exactLatexForFiniteBranchExpressions(options: Pick<
  FiniteBranchExpressionOptions,
  'targetLatex' | 'branches' | 'preserveOrder' | 'context' | 'presentationContext' | 'setSeparator'
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

export function presentationBranchesFromFiniteRoots(
  roots: readonly EquationFiniteRootPresentation[],
): EquationFiniteBranchExpression[] {
  return roots.map((root) => ({
    latex: root.fallbackLatex,
    ...(root.node !== undefined ? { node: root.node } : {}),
  }));
}
