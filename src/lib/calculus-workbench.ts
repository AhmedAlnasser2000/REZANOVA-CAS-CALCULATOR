import {
  formatSignedNumberInput,
  parseSignedNumberInput,
} from './signed-number';
import type {
  CalculateScreen,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  IntegralKind,
  IntegralWorkbenchState,
  LimitDirection,
  LimitTargetKind,
  LimitWorkbenchState,
} from '../types/calculator';

type BuiltWorkbenchExpression = {
  latex: string;
  limitDirection?: LimitDirection;
};

export const DEFAULT_DERIVATIVE_WORKBENCH: DerivativeWorkbenchState = {
  bodyLatex: '',
};

export const DEFAULT_DERIVATIVE_POINT_WORKBENCH: DerivativePointWorkbenchState = {
  bodyLatex: '',
  point: '',
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

export function buildDerivativeLatex(bodyLatex: string) {
  const body = trimmedBody(bodyLatex);
  if (!body) {
    return '';
  }

  return `\\frac{d}{dx}\\left(${body}\\right)`;
}

export function buildDerivativeAtPointLatex(bodyLatex: string, point: string) {
  const body = trimmedBody(bodyLatex);
  const normalizedPoint = normalizeNumberDraft(point);
  if (!body || !normalizedPoint) {
    return '';
  }

  return `\\left.\\frac{d}{dx}\\left(${body}\\right)\\right|_{x=${normalizedPoint}}`;
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
    target = normalizeNumberDraft(state.target) ?? '';
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
    return { latex: buildDerivativeLatex(derivativeState.bodyLatex) };
  }

  if (screen === 'derivativePoint') {
    return {
      latex: buildDerivativeAtPointLatex(
        derivativePointState.bodyLatex,
        derivativePointState.point,
      ),
    };
  }

  if (screen === 'integral') {
    return { latex: buildIntegralLatex(integralState) };
  }

  if (screen === 'limit') {
    return {
      latex: buildLimitLatex(limitState),
      limitDirection: limitState.direction,
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
