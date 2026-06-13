import type { TransformBadge } from '../../../types/calculator';

export type AlgebraTransformAction =
  | 'rewriteAsRoot'
  | 'rewriteAsPower'
  | 'changeBase'
  | 'combineFractions'
  | 'cancelFactors'
  | 'useLCD'
  | 'rationalize'
  | 'conjugate';

export type AlgebraTransformResult = {
  exactLatex: string;
  exactSupplementLatex?: string[];
  transformBadges: TransformBadge[];
  transformSummaryText: string;
  transformSummaryLatex?: string;
};

export type ParsedEquationNode = {
  left: unknown;
  right: unknown;
};

export type TransformSideResult = {
  latex: string;
  supplement?: string[];
};

export type TransformDescriptor = {
  action: AlgebraTransformAction;
  label: TransformBadge;
  sourceSupportsExplicitTransform: (latex: string) => boolean;
  applyExpression: (node: unknown) => AlgebraTransformResult | null;
  applyEquation: (left: unknown, right: unknown) => AlgebraTransformResult | null;
};
