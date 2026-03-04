import { parseSignedNumberInput } from '../signed-number';
import type {
  AdvancedDefiniteIntegralState,
  AdvancedFiniteLimitState,
  AdvancedImproperIntegralState,
  AdvancedInfiniteLimitState,
  AdvancedIndefiniteIntegralState,
  AdvancedIntegralKind,
  DerivativeVariable,
  NumericIvpState,
  FirstOrderOdeState,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesKind,
  SeriesState,
} from '../../types/calculator';

export const DEFAULT_ADVANCED_INDEFINITE_INTEGRAL_STATE: AdvancedIndefiniteIntegralState = {
  bodyLatex: '',
};

export const DEFAULT_ADVANCED_DEFINITE_INTEGRAL_STATE: AdvancedDefiniteIntegralState = {
  bodyLatex: '',
  lower: '0',
  upper: '1',
};

export const DEFAULT_ADVANCED_IMPROPER_INTEGRAL_STATE: AdvancedImproperIntegralState = {
  bodyLatex: '',
  lowerKind: 'finite',
  lower: '0',
  upperKind: 'posInfinity',
  upper: '1',
};

export const DEFAULT_ADVANCED_FINITE_LIMIT_STATE: AdvancedFiniteLimitState = {
  bodyLatex: '',
  target: '0',
  direction: 'two-sided',
};

export const DEFAULT_ADVANCED_INFINITE_LIMIT_STATE: AdvancedInfiniteLimitState = {
  bodyLatex: '',
  targetKind: 'posInfinity',
};

export const DEFAULT_MACLAURIN_STATE: SeriesState = {
  bodyLatex: '',
  kind: 'maclaurin',
  center: '0',
  order: 5,
};

export const DEFAULT_TAYLOR_STATE: SeriesState = {
  bodyLatex: '',
  kind: 'taylor',
  center: '1',
  order: 4,
};

export const DEFAULT_PARTIAL_DERIVATIVE_STATE: PartialDerivativeWorkbenchState = {
  bodyLatex: '',
  variable: 'x',
};

export const DEFAULT_FIRST_ORDER_ODE_STATE: FirstOrderOdeState = {
  lhsLatex: '\\frac{dy}{dx}',
  rhsLatex: 'xy',
  classification: 'separable',
};

export const DEFAULT_SECOND_ORDER_ODE_STATE: SecondOrderOdeState = {
  a2: '1',
  a1: '0',
  a0: '1',
  forcingLatex: '0',
};

export const DEFAULT_NUMERIC_IVP_STATE: NumericIvpState = {
  bodyLatex: 'x+y',
  x0: '0',
  y0: '1',
  xEnd: '1',
  step: '0.1',
  method: 'rk4',
};

function wrapBody(latex: string) {
  const trimmed = latex.trim();
  if (!trimmed) {
    return '';
  }

  return /^[-+]?[\w\\]+$/.test(trimmed) ? trimmed : `\\left(${trimmed}\\right)`;
}

function numericLatexOrEmpty(value: string) {
  const parsed = parseSignedNumberInput(value);
  return parsed === null ? '' : `${parsed}`;
}

export function buildAdvancedIntegralLatex(
  kind: AdvancedIntegralKind,
  indefiniteState: AdvancedIndefiniteIntegralState,
  definiteState: AdvancedDefiniteIntegralState,
  improperState: AdvancedImproperIntegralState,
) {
  if (kind === 'indefinite') {
    const body = indefiniteState.bodyLatex.trim();
    return body ? `\\int ${body}\\,dx` : '';
  }

  if (kind === 'definite') {
    const body = definiteState.bodyLatex.trim();
    const lower = numericLatexOrEmpty(definiteState.lower);
    const upper = numericLatexOrEmpty(definiteState.upper);
    return body && lower && upper ? `\\int_{${lower}}^{${upper}} ${body}\\,dx` : '';
  }

  const body = improperState.bodyLatex.trim();
  if (!body) {
    return '';
  }

  const lower =
    improperState.lowerKind === 'negInfinity'
      ? '-\\infty'
      : numericLatexOrEmpty(improperState.lower);
  const upper =
    improperState.upperKind === 'posInfinity'
      ? '\\infty'
      : numericLatexOrEmpty(improperState.upper);

  return lower && upper ? `\\int_{${lower}}^{${upper}} ${body}\\,dx` : '';
}

export function buildAdvancedFiniteLimitLatex(state: AdvancedFiniteLimitState) {
  const body = state.bodyLatex.trim();
  const target = numericLatexOrEmpty(state.target);
  return body && target ? `\\lim_{x\\to ${target}}${wrapBody(body)}` : '';
}

export function buildAdvancedInfiniteLimitLatex(state: AdvancedInfiniteLimitState) {
  const body = state.bodyLatex.trim();
  const target = state.targetKind === 'posInfinity' ? '\\infty' : '-\\infty';
  return body ? `\\lim_{x\\to ${target}}${wrapBody(body)}` : '';
}

export function buildSeriesPreviewLatex(state: SeriesState) {
  const body = state.bodyLatex.trim();
  if (!body) {
    return '';
  }

  if (state.kind === 'maclaurin') {
    return `\\text{Maclaurin}_{${state.order}}\\left(${body}\\right)`;
  }

  const center = numericLatexOrEmpty(state.center);
  return center ? `\\text{Taylor}_{${state.order},\\,x=${center}}\\left(${body}\\right)` : '';
}

export function buildFirstOrderOdeLatex(state: FirstOrderOdeState) {
  const lhs = state.lhsLatex.trim();
  const rhs = state.rhsLatex.trim();
  return lhs && rhs ? `${lhs}=${rhs}` : '';
}

export function buildSecondOrderOdeLatex(state: SecondOrderOdeState) {
  const a2 = numericLatexOrEmpty(state.a2);
  const a1 = numericLatexOrEmpty(state.a1);
  const a0 = numericLatexOrEmpty(state.a0);
  if (!a2 || !a1 || !a0) {
    return '';
  }

  const forcing = state.forcingLatex.trim() || '0';
  return `${a2}y''+${a1}y'+${a0}y=${forcing}`;
}

export function buildNumericIvpLatex(state: NumericIvpState) {
  const x0 = numericLatexOrEmpty(state.x0);
  const y0 = numericLatexOrEmpty(state.y0);
  const xEnd = numericLatexOrEmpty(state.xEnd);
  const step = numericLatexOrEmpty(state.step);
  const body = state.bodyLatex.trim();
  if (!x0 || !y0 || !xEnd || !step || !body) {
    return '';
  }

  return `y'=${body},\\ y(${x0})=${y0},\\ x\\in[${x0},${xEnd}],\\ h=${step}`;
}

export function buildPartialDerivativeLatex(state: PartialDerivativeWorkbenchState) {
  const body = state.bodyLatex.trim();
  const variable = state.variable.trim() as DerivativeVariable;
  if (!body || !['x', 'y', 'z'].includes(variable)) {
    return '';
  }

  return `\\frac{\\partial}{\\partial ${variable}}\\left(${body}\\right)`;
}

export function clampSeriesOrder(order: number) {
  return Math.min(Math.max(Math.round(order), 1), 8);
}

export function cycleSeriesKind(kind: SeriesKind): SeriesKind {
  return kind === 'maclaurin' ? 'taylor' : 'maclaurin';
}
