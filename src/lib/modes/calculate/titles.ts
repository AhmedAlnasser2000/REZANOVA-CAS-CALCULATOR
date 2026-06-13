import type {
  CalculateAction,
  CalculusDerivativeStrategy,
} from '../../../types/calculator';

export function actionTitle(action: CalculateAction) {
  switch (action) {
    case 'evaluate':
      return 'Numeric';
    case 'simplify':
      return 'Simplify';
    case 'factor':
      return 'Factor';
    case 'expand':
      return 'Expand';
    default:
      return 'Calculate';
  }
}

export function responseTitle(
  action: CalculateAction,
  resolvedLatex: string,
  sourceLatex = resolvedLatex,
) {
  if (action !== 'evaluate') {
    return actionTitle(action);
  }

  if (resolvedLatex.includes('\\int') || sourceLatex.includes('\\int')) {
    return 'Integral';
  }

  if (resolvedLatex.includes('\\lim') || sourceLatex.includes('\\lim')) {
    return 'Limit';
  }

  if (
    resolvedLatex.includes('\\frac{d}')
    || resolvedLatex.includes('\\frac{\\mathrm{d}}')
    || sourceLatex.includes('\\frac{d}')
    || sourceLatex.includes('\\frac{\\mathrm{d}}')
  ) {
    return 'Derivative';
  }

  return actionTitle(action);
}

export function mergeDerivativeStrategies(
  ...strategyLists: Array<readonly CalculusDerivativeStrategy[] | undefined>
) {
  const merged = strategyLists.flatMap((strategies) => strategies ?? []);
  return merged.length > 0 ? Array.from(new Set(merged)) : undefined;
}
