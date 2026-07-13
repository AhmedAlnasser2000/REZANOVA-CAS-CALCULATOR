import type { AngleUnit, LimitDirection, LimitTargetKind, ModeId, OutputStyle } from './mode-types';

export type ExpressionKind = 'empty' | 'expression' | 'equation' | 'invalid';
export type CalculusResultKind = 'symbolic' | 'numeric-fallback' | 'rule-based-symbolic';

export type CalculusResultOrigin =
  | 'symbolic'
  | 'rule-based-symbolic'
  | 'heuristic-symbolic'
  | 'numeric-fallback';

export type CalculusIntegrationStrategy =
  | 'direct-rule'
  | 'inverse-trig'
  | 'derivative-ratio'
  | 'partial-fractions'
  | 'u-substitution'
  | 'integration-by-parts'
  | 'affine-linear'
  | 'compute-engine';

export type CalculusDerivativeStrategy =
  | 'direct-rule'
  | 'chain-rule'
  | 'product-rule'
  | 'quotient-rule'
  | 'general-power'
  | 'function-power'
  | 'inverse-trig'
  | 'inverse-hyperbolic'
  | 'compute-engine';

export type EvaluateDetailSection = {
  title: string;
  lines: string[];
};

export type EvaluateAnswerRowsReadback = {
  label?: string;
  rows: Array<{
    latex: string;
    label?: string;
  }>;
};

export type TrigResultOrigin =
  | 'symbolic'
  | 'exact-special-angle'
  | 'numeric'
  | 'triangle-solver';

export type GeometryResultOrigin =
  | 'geometry-formula'
  | 'geometry-coordinate';

export type SymbolicResultOrigin =
  | 'symbolic-engine'
  | 'rule-based-symbolic'
  | 'compute-engine'
  | 'heuristic-symbolic'
  | 'numeric-fallback';

export type ResultOrigin =
  | CalculusResultKind
  | CalculusResultOrigin
  | SymbolicResultOrigin
  | TrigResultOrigin
  | GeometryResultOrigin;

export type CoreDraftStyle = 'structured' | 'shorthand';
export type CoreDraftSource = 'manual' | 'guided' | 'legacy-preview';
export type TransferTarget = 'calculate' | 'equation';

export type ExecutionIntent =
  | 'calculate-evaluate'
  | 'calculate-simplify'
  | 'calculate-factor'
  | 'calculate-expand'
  | 'equation-solve'
  | 'table-build'
  | 'trig-evaluate'
  | 'geometry-evaluate'
  | 'statistics-evaluate';

export type CanonicalizationChangeKind =
  | 'function-token'
  | 'constant-token'
  | 'derivative-token'
  | 'delimiter-normalization'
  | 'integral-bounds-token'
  | 'operator-token';

export type CanonicalizationChange = {
  kind: CanonicalizationChangeKind;
  before: string;
  after: string;
};

export type CanonicalizationResult =
  | {
      ok: true;
      originalLatex: string;
      canonicalLatex: string;
      changes: CanonicalizationChange[];
    }
  | {
      ok: false;
      originalLatex: string;
      error: string;
    };

export type MathDocument = {
  latex: string;
  mathJson?: unknown;
};

export type MathAnalysis = {
  kind: ExpressionKind;
  containsSymbolX: boolean;
  topLevelOperator?: string;
  symbols?: string[];
  reservedIdentifiers?: string[];
  variableRoleStops?: string[];
};

export type CalculateAction = 'evaluate' | 'simplify' | 'factor' | 'expand';
export type EquationAction = 'solve';

export type SymbolicOperation =
  | 'simplify'
  | 'factor'
  | 'expand'
  | 'evaluate'
  | 'solve'
  | 'differentiate'
  | 'integrate'
  | 'limit'
  | 'partialDifferentiate';

export type PrecedenceClass =
  | 'grouping'
  | 'power'
  | 'unary'
  | 'multiply-divide'
  | 'add-subtract'
  | 'relations';

export type DerivativeVariable = string;

export type PartialDerivativeRequest = {
  bodyLatex: string;
  variable: DerivativeVariable;
};

export type FactoringStrategy =
  | 'symbolic-like-terms'
  | 'symbolic-common-factor'
  | 'numeric-gcd'
  | 'algebraic-identity'
  | 'polynomial-factorization'
  | 'mixed-carrier-factorization'
  | 'none';

export type NormalizedExpression = {
  ast: unknown;
  latex: string;
  precedenceTrace: string[];
};

export type EvaluateRequest = {
  mode: ModeId;
  document: MathDocument;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  variables: Record<string, string>;
  calculusOptions?: {
    limitDirection?: LimitDirection;
    limitTargetKind?: LimitTargetKind;
  };
};

export type EvaluateResponse = {
  exactLatex?: string;
  answerMathJson?: import('./math-payload-types').SerializableMathJson;
  answerRows?: EvaluateAnswerRowsReadback;
  exactSupplementLatex?: string[];
  approxText?: string;
  normalizedMathJson?: unknown;
  rawSolutions?: unknown[];
  rawSolutionLatex?: string[];
  numericSolutions?: (number | null)[];
  warnings: string[];
  error?: string;
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  calculusDerivativeStrategies?: CalculusDerivativeStrategy[];
  detailSections?: EvaluateDetailSection[];
  mathJsonLeaves?: Array<{
    canonicalLatex: string;
    mathJson: unknown;
    source: string;
  }>;
};
