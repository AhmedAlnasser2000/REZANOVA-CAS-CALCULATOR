import type { AdvancedCalcResultOrigin } from '../../types/calculator';

export type ProvenanceBadge = {
  label: string;
  variant: 'symbolic' | 'rule' | 'heuristic' | 'numeric';
};

export function getAdvancedCalcProvenanceBadge(
  origin?: AdvancedCalcResultOrigin,
): ProvenanceBadge | undefined {
  switch (origin) {
    case 'symbolic':
      return { label: 'Symbolic', variant: 'symbolic' };
    case 'rule-based-symbolic':
      return { label: 'Rule-based symbolic', variant: 'rule' };
    case 'heuristic-symbolic':
      return { label: 'Heuristic symbolic', variant: 'heuristic' };
    case 'numeric-fallback':
      return { label: 'Numeric fallback', variant: 'numeric' };
    default:
      return undefined;
  }
}
