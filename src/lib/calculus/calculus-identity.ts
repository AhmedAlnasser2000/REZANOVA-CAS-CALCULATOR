import type {
  CalculusScreen,
  CalculateScreen,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  IntegralWorkbenchState,
  LimitWorkbenchState,
  ModeId,
} from '../../types/calculator';

export const CALCULUS_MODE_ID = 'calculus' as const;
export const LEGACY_ADVANCED_CALCULUS_MODE_ID = 'calculus' as const;

export type CalculusModeId =
  | typeof CALCULUS_MODE_ID
  | typeof LEGACY_ADVANCED_CALCULUS_MODE_ID;

export function isCalculusMode(mode: ModeId | string | null | undefined): mode is CalculusModeId {
  return mode === CALCULUS_MODE_ID || mode === LEGACY_ADVANCED_CALCULUS_MODE_ID;
}

export function canonicalizeCalculusMode(mode: ModeId): ModeId {
  return mode === LEGACY_ADVANCED_CALCULUS_MODE_ID ? CALCULUS_MODE_ID : mode;
}

export type LegacyCalculateCalculusSeed = Partial<
  DerivativeWorkbenchState
  & DerivativePointWorkbenchState
  & IntegralWorkbenchState
  & LimitWorkbenchState
> | null | undefined;

export function mapLegacyCalculateScreenToCalculusScreen(
  screen: CalculateScreen | null | undefined,
  seed?: LegacyCalculateCalculusSeed,
): CalculusScreen | null {
  if (!screen || screen === 'standard') {
    return null;
  }

  if (screen === 'calculusHome') {
    return 'home';
  }

  if (screen === 'derivativesHome') {
    return 'derivativesHome';
  }

  if (screen === 'derivative' || screen === 'derivativePoint') {
    return screen;
  }

  if (screen === 'integral') {
    return seed && 'kind' in seed && seed.kind === 'definite'
      ? 'definiteIntegral'
      : 'indefiniteIntegral';
  }

  if (screen === 'limit') {
    return seed && 'targetKind' in seed && (seed.targetKind === 'posInfinity' || seed.targetKind === 'negInfinity')
      ? 'infiniteLimit'
      : 'finiteLimit';
  }

  return null;
}

export function isLegacyCalculateCalculusScreen(screen: CalculateScreen | null | undefined): boolean {
  return mapLegacyCalculateScreenToCalculusScreen(screen) !== null;
}
