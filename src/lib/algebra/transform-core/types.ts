import type {
  SerializableMathJson,
  SolveDomainConstraint,
  TransformBadge,
} from '../../../types/calculator';

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
  exactMathJson?: SerializableMathJson;
  exactSupplementLatex?: string[];
  domainConstraints?: SolveDomainConstraint[];
  transformBadges: TransformBadge[];
  transformSummaryText: string;
  transformSummaryLatex?: string;
  transformSummaryMathJson?: SerializableMathJson;
};

export type ParsedEquationNode = {
  left: unknown;
  right: unknown;
};

export type TransformSideResult = {
  latex: string;
  node: SerializableMathJson;
  supplement?: string[];
  constraints?: SolveDomainConstraint[];
};

export type TransformDescriptor = {
  action: AlgebraTransformAction;
  label: TransformBadge;
  sourceSupportsExplicitTransform: (latex: string) => boolean;
  applyExpression: (node: unknown) => AlgebraTransformResult | null;
  applyEquation: (left: unknown, right: unknown) => AlgebraTransformResult | null;
};
