import {
  buildCalculusFiniteLimitLatex,
  buildCalculusInfiniteLimitLatex,
} from '../../lib/calculus/workspace/examples';
import type { GuideExample } from '../../types/calculator';
import type { CalculusMenuSelectionState } from './workspace-surface-state';

export function defaultCalculusMenuSelection(): CalculusMenuSelectionState {
  return {
    home: 0,
    derivativesHome: 0,
    integralsHome: 0,
    limitsHome: 0,
    seriesHome: 0,
    partialsHome: 0,
    odeHome: 0,
  };
}

export function copyCalculusMenuSelection(selection: CalculusMenuSelectionState) {
  return { ...selection };
}

export function calculusLimitRequestFromSeed(
  seed: GuideExample['launch']['calculusSeed'],
  fallback: string,
) {
  if (!seed) {
    return fallback;
  }
  if (typeof seed.requestLatex === 'string') {
    return seed.requestLatex;
  }
  const bodyLatex = seed.bodyLatex?.trim();
  if (!bodyLatex) {
    return fallback;
  }

  if (seed.targetKind === 'posInfinity' || seed.targetKind === 'negInfinity') {
    return buildCalculusInfiniteLimitLatex({
      bodyLatex,
      targetKind: seed.targetKind,
      variable: seed.variable,
    });
  }

  return buildCalculusFiniteLimitLatex({
    bodyLatex,
    target: seed.target ?? '0',
    direction: seed.direction ?? 'two-sided',
    variable: seed.variable,
  });
}
