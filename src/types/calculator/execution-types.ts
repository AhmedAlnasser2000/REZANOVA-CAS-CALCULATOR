import type { AngleUnit, LimitDirection, LimitTargetKind, ModeId, OutputStyle } from './mode-types';

export type ExpressionKind = 'empty' | 'expression' | 'equation' | 'invalid';
export type CalculusResultKind = 'symbolic' | 'numeric-fallback' | 'rule-based-symbolic';

export type AdvancedCalcResultOrigin =
  | 'symbolic'
  | 'rule-based-symbolic'
  | 'heuristic-symbolic'
  | 'numeric-fallback';

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
  | AdvancedCalcResultOrigin
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
  | 'delimiter-normalization';

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

export type DerivativeVariable = 'x' | 'y' | 'z';

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
  exactSupplementLatex?: string[];
  approxText?: string;
  normalizedMathJson?: unknown;
  rawSolutions?: unknown[];
  rawSolutionLatex?: string[];
  numericSolutions?: (number | null)[];
  warnings: string[];
  error?: string;
  resultOrigin?: ResultOrigin;
};
