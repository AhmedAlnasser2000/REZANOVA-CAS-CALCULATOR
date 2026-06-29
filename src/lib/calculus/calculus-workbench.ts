import {
  DEFAULT_DERIVATIVE_VARIABLE,
  derivativeVariableLatex,
  parseDerivativeVariable,
} from './derivative-target';
import {
  formatSignedNumberInput,
  parseSignedNumberInput,
} from '../numeric/signed-number';
import {
  finiteLimitTargetDirection,
  finiteLimitTargetLatex,
  parseFiniteLimitTargetDraft,
} from './engine/finite-limit-target';
import type {
  CalculateScreen,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  IntegralKind,
  IntegralWorkbenchState,
  LimitDirection,
  LimitTargetKind,
  LimitWorkbenchState,
} from '../../types/calculator';

type BuiltWorkbenchExpression = {
  latex: string;
  limitDirection?: LimitDirection;
};

export const DEFAULT_DERIVATIVE_WORKBENCH: DerivativeWorkbenchState = {
  bodyLatex: '',
  variable: DEFAULT_DERIVATIVE_VARIABLE,
};

export const DEFAULT_DERIVATIVE_POINT_WORKBENCH: DerivativePointWorkbenchState = {
  bodyLatex: '',
  point: '',
  variable: DEFAULT_DERIVATIVE_VARIABLE,
};

export const DEFAULT_INTEGRAL_WORKBENCH: IntegralWorkbenchState = {
  kind: 'indefinite',
  bodyLatex: '',
  lower: '0',
  upper: '1',
};

export const DEFAULT_LIMIT_WORKBENCH: LimitWorkbenchState = {
  bodyLatex: '',
  target: '0',
  direction: 'two-sided',
  targetKind: 'finite',
};

function trimmedBody(bodyLatex: string) {
  return bodyLatex.trim();
}

function normalizeNumberDraft(value: string) {
  const parsed = parseSignedNumberInput(value);
  return parsed === null ? undefined : formatSignedNumberInput(parsed);
}

export function applyFiniteLimitTargetDraft(
  state: LimitWorkbenchState,
  targetDraft: string,
): LimitWorkbenchState {
  const parsed = parseFiniteLimitTargetDraft(targetDraft);
  if (parsed?.directionOverride) {
    return {
      ...state,
      target: parsed.normalizedTargetLatex,
      direction: parsed.directionOverride,
    };
  }

  return {
    ...state,
    target: targetDraft,
  };
}

function derivativeVariableForBuilder(variable: string | undefined) {
  const parsed = parseDerivativeVariable(variable ?? DEFAULT_DERIVATIVE_VARIABLE);
  return parsed.ok ? parsed.variable : null;
}

export function buildDerivativeLatex(
  bodyLatex: string,
  variable?: string,
) {
  const body = trimmedBody(bodyLatex);
  const target = derivativeVariableForBuilder(variable);
  if (!body || !target) {
    return '';
  }

  const targetLatex = derivativeVariableLatex(target);
  return `\\frac{d}{d${targetLatex}}\\left(${body}\\right)`;
}

export function buildDerivativeAtPointLatex(
  bodyLatex: string,
  point: string,
  variable?: string,
) {
  const body = trimmedBody(bodyLatex);
  const normalizedPoint = normalizeNumberDraft(point);
  const target = derivativeVariableForBuilder(variable);
  if (!body || !normalizedPoint || !target) {
    return '';
  }

  const targetLatex = derivativeVariableLatex(target);
  return `\\left.\\frac{d}{d${targetLatex}}\\left(${body}\\right)\\right|_{${targetLatex}=${normalizedPoint}}`;
}

export function buildIntegralLatex(state: IntegralWorkbenchState) {
  const body = trimmedBody(state.bodyLatex);
  if (!body) {
    return '';
  }

  if (state.kind === 'indefinite') {
    return `\\int ${body}\\,dx`;
  }

  const lower = normalizeNumberDraft(state.lower);
  const upper = normalizeNumberDraft(state.upper);
  if (!lower || !upper) {
    return '';
  }

  return `\\int_{${lower}}^{${upper}} ${body}\\,dx`;
}

export function buildLimitLatex(state: LimitWorkbenchState) {
  const body = trimmedBody(state.bodyLatex);
  if (!body) {
    return '';
  }

  let target = '';
  if (state.targetKind === 'finite') {
    target = finiteLimitTargetLatex(state.target, state.direction);
  } else {
    target = state.targetKind === 'posInfinity' ? '\\infty' : '-\\infty';
  }

  if (!target) {
    return '';
  }

  return `\\lim_{x\\to ${target}}\\left(${body}\\right)`;
}

export function buildWorkbenchExpression(
  screen: CalculateScreen,
  derivativeState: DerivativeWorkbenchState,
  derivativePointState: DerivativePointWorkbenchState,
  integralState: IntegralWorkbenchState,
  limitState: LimitWorkbenchState,
): BuiltWorkbenchExpression {
  if (screen === 'derivative') {
    return { latex: buildDerivativeLatex(derivativeState.bodyLatex, derivativeState.variable) };
  }

  if (screen === 'derivativePoint') {
    return {
      latex: buildDerivativeAtPointLatex(
        derivativePointState.bodyLatex,
        derivativePointState.point,
        derivativePointState.variable,
      ),
    };
  }

  if (screen === 'integral') {
    return { latex: buildIntegralLatex(integralState) };
  }

  if (screen === 'limit') {
    return {
      latex: buildLimitLatex(limitState),
      limitDirection: limitState.targetKind === 'finite'
        ? finiteLimitTargetDirection(limitState.target, limitState.direction)
        : limitState.direction,
    };
  }

  return { latex: '' };
}

export function cycleIntegralKind(kind: IntegralKind): IntegralKind {
  return kind === 'indefinite' ? 'definite' : 'indefinite';
}

export function cycleLimitDirection(direction: LimitDirection): LimitDirection {
  if (direction === 'two-sided') {
    return 'left';
  }

  if (direction === 'left') {
    return 'right';
  }

  return 'two-sided';
}

export function cycleLimitTargetKind(targetKind: LimitTargetKind): LimitTargetKind {
  if (targetKind === 'finite') {
    return 'posInfinity';
  }

  if (targetKind === 'posInfinity') {
    return 'negInfinity';
  }

  return 'finite';
}
