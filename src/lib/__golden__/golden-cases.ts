import type {
  CalculateAction,
  CalculusDerivativeStrategy,
  CalculusIntegrationStrategy,
  EquationScreen,
  ResultOrigin,
} from '../../types/calculator';

type GoldenBase = {
  id: string;
  lane: string;
  expected: GoldenExpectation;
  knownLimitationNote?: string;
};

export type GoldenCalculateCase = GoldenBase & {
  mode: 'calculate';
  action: CalculateAction;
  latex: string;
};

export type GoldenEquationCase = GoldenBase & {
  mode: 'equation';
  equationScreen?: EquationScreen;
  equationLatex: string;
};

export type GoldenCase = GoldenCalculateCase | GoldenEquationCase;

export type GoldenExpectation = {
  kind: 'success' | 'error' | 'prompt';
  title?: string;
  exactEquals?: string;
  exactIncludes?: string[];
  approxIncludes?: string[];
  resultOrigin?: ResultOrigin;
  calculusStrategy?: CalculusIntegrationStrategy;
  derivativeStrategiesInclude?: CalculusDerivativeStrategy[];
  detailTitlesInclude?: string[];
  errorIncludes?: string;
  warningIncludes?: string[];
  supplementIncludes?: string[];
  solveBadgesInclude?: string[];
  plannerBadgesInclude?: string[];
  rejectedCandidateCount?: number;
  runtimeStopReasonKind?: string;
};

export const goldenCases: GoldenCase[] = [
  {
    id: 'calculate-arithmetic-basic',
    lane: 'calculate',
    mode: 'calculate',
    action: 'evaluate',
    latex: '2+2',
    expected: {
      kind: 'success',
      title: 'Numeric',
      exactEquals: '4',
    },
  },
  {
    id: 'calculate-simplify-zero-polynomial-difference',
    lane: 'calculate',
    mode: 'calculate',
    action: 'simplify',
    latex: '(x+1)^2-(x^2+2x+1)',
    expected: {
      kind: 'success',
      title: 'Simplify',
      exactEquals: '0',
    },
  },
  {
    id: 'calculate-factor-perfect-square',
    lane: 'calculate',
    mode: 'calculate',
    action: 'factor',
    latex: 'x^2+2x+1',
    expected: {
      kind: 'success',
      title: 'Factor',
      exactIncludes: ['x+1'],
    },
  },
  {
    id: 'calculate-expand-affine-square',
    lane: 'calculate',
    mode: 'calculate',
    action: 'expand',
    latex: '\\left(x+1\\right)^2',
    expected: {
      kind: 'success',
      title: 'Expand',
      exactIncludes: ['x^2', '2x', '1'],
    },
  },
  {
    id: 'calculus-derivative-function-power',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\frac{d}{dx}\\sin^2\\left(\\cos^3\\left(x\\right)\\right)',
    expected: {
      kind: 'success',
      title: 'Derivative',
      exactIncludes: ['\\sin(x)', '\\cos(x)^2'],
      derivativeStrategiesInclude: ['function-power', 'chain-rule'],
    },
  },
  {
    id: 'calculus-derivative-general-power',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\frac{d}{dx}\\left(\\cos^{2x}\\left(x\\right)\\right)',
    expected: {
      kind: 'success',
      title: 'Derivative',
      exactIncludes: ['\\ln', '\\cos'],
      derivativeStrategiesInclude: ['function-power', 'general-power'],
    },
  },
  {
    id: 'calculus-derivative-known-inverse-trig',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\frac{d}{dx}\\arcsin\\left(x\\right)',
    expected: {
      kind: 'success',
      title: 'Derivative',
      exactIncludes: ['\\sqrt'],
      derivativeStrategiesInclude: ['inverse-trig'],
    },
  },
  {
    id: 'calculus-integral-inverse-trig',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int \\frac{1}{1+x^2}\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['\\arctan'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'inverse-trig',
    },
  },
  {
    id: 'calculus-integral-partial-fractions',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int \\frac{1}{x^2-1}\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['\\ln', 'x-1', 'x+1'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'partial-fractions',
    },
  },
  {
    id: 'calculus-integral-u-substitution-log',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int 2x\\ln\\left(x^2+1\\right)\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactIncludes: ['\\ln'],
      resultOrigin: 'rule-based-symbolic',
      calculusStrategy: 'u-substitution',
    },
  },
  {
    id: 'calculus-definite-integral-exact',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int_0^1 2x\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      exactEquals: '1',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Integral Method', 'Interval Safety'],
    },
  },
  {
    id: 'calculus-definite-integral-numeric-fallback',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int_0^1 \\sin\\left(x^2\\right)\\,dx',
    expected: {
      kind: 'success',
      title: 'Integral',
      resultOrigin: 'numeric-fallback',
      warningIncludes: ['Symbolic integral unavailable'],
      detailTitlesInclude: ['Integral Method', 'Interval Safety'],
    },
  },
  {
    id: 'calculus-definite-integral-unsafe-stop',
    lane: 'calculate-calculus',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\int_{-1}^{1}\\frac{1}{x}\\,dx',
    expected: {
      kind: 'error',
      title: 'Integral',
      errorIncludes: 'outside the real domain',
      detailTitlesInclude: ['Interval Safety'],
    },
  },
  {
    id: 'limit-known-form-sin-over-x',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0} \\frac{\\sin\\left(x\\right)}{x}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '1',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Limit Method'],
    },
  },
  {
    id: 'limit-directional-positive-pole',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0^+}\\frac{1}{x}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '\\infty',
      resultOrigin: 'rule-based-symbolic',
    },
  },
  {
    id: 'limit-directional-negative-pole',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0^-}\\frac{1}{x}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '-\\infty',
      resultOrigin: 'rule-based-symbolic',
    },
  },
  {
    id: 'limit-removable-rational-hole',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 1}\\frac{x^2-1}{x-1}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '2',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Limit Method'],
    },
  },
  {
    id: 'limit-local-equivalent-product',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0}\\frac{\\ln\\left(1+x\\right)\\sin\\left(x\\right)}{x^2}',
    expected: {
      kind: 'success',
      title: 'Limit',
      exactEquals: '1',
      resultOrigin: 'rule-based-symbolic',
      detailTitlesInclude: ['Limit Method'],
    },
  },
  {
    id: 'limit-one-sided-real-domain-stop',
    lane: 'limits',
    mode: 'calculate',
    action: 'evaluate',
    latex: '\\lim_{x\\to 0^-}\\sqrt{x}',
    expected: {
      kind: 'error',
      title: 'Limit',
      errorIncludes: 'outside the real domain',
    },
  },
  {
    id: 'equation-linear-symbolic',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '5x+6=3',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactIncludes: ['x=', '\\frac'],
      approxIncludes: ['x ~='],
      resultOrigin: 'symbolic',
    },
  },
  {
    id: 'equation-guided-quadratic-symbolic',
    lane: 'equation',
    mode: 'equation',
    equationScreen: 'quadratic',
    equationLatex: '',
    expected: {
      kind: 'success',
      title: 'Quadratic',
      exactIncludes: ['x\\in', '2', '3'],
      resultOrigin: 'symbolic',
    },
  },
  {
    id: 'equation-rational-exclusion',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\frac{1}{3}+\\frac{1}{6x}=1',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactIncludes: ['\\frac{1}{4}'],
      supplementIncludes: ['x\\ne0'],
    },
  },
  {
    id: 'equation-radical-candidate-rejection',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\sqrt{x+1}=x-1',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactEquals: 'x=3',
      rejectedCandidateCount: 1,
    },
  },
  {
    id: 'equation-absolute-value-bounded',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\left|x^2+x-2\\right|=3',
    expected: {
      kind: 'success',
      title: 'Solve',
      exactIncludes: ['\\sqrt{21}'],
    },
  },
  {
    id: 'equation-range-impossibility-stop',
    lane: 'equation',
    mode: 'equation',
    equationLatex: '\\sin\\left(x\\right)=2',
    expected: {
      kind: 'error',
      title: 'Solve',
      runtimeStopReasonKind: 'range-guard',
    },
  },
];
