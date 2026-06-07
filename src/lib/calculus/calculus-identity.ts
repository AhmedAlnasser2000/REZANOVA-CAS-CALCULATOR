import type { ModeId } from '../../types/calculator';

export const CALCULUS_MODE_ID = 'calculus' as const;
export const LEGACY_ADVANCED_CALCULUS_MODE_ID = 'advancedCalculus' as const;

export type CalculusModeId =
  | typeof CALCULUS_MODE_ID
  | typeof LEGACY_ADVANCED_CALCULUS_MODE_ID;

export function isCalculusMode(mode: ModeId | string | null | undefined): mode is CalculusModeId {
  return mode === CALCULUS_MODE_ID || mode === LEGACY_ADVANCED_CALCULUS_MODE_ID;
}

export function canonicalizeCalculusMode(mode: ModeId): ModeId {
  return mode === LEGACY_ADVANCED_CALCULUS_MODE_ID ? CALCULUS_MODE_ID : mode;
}

