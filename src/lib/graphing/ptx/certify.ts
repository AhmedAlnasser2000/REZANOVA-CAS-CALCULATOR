import type { PtxLevel, PtxPoint } from './types';

// Honest readouts: a number shows only the significant digits its error bound
// supports (never more than the usual six), and every point carries a badge.

const MAX_SIGNIFICANT = 6;

/** Significant digits that `errorBound` leaves reliable in `value`, between 1 and `maximum`. */
export function ptxSignificantDigits(value: number, errorBound: number, maximum = MAX_SIGNIFICANT) {
  if (!(errorBound > 0) || !Number.isFinite(errorBound) || value === 0) return maximum;
  const reliable = Math.floor(Math.log10(Math.abs(value))) - Math.floor(Math.log10(errorBound));
  return Math.max(1, Math.min(maximum, reliable));
}

/** A coordinate as text: "0" inside its error bound, otherwise the reliable digits. */
export function ptxNumber(value: number, errorBound = 0, maximum = MAX_SIGNIFICANT) {
  if (!Number.isFinite(value)) return 'undefined';
  if (Math.abs(value) < Math.max(1e-10, errorBound)) return '0';
  return String(Number(value.toPrecision(ptxSignificantDigits(value, errorBound, maximum))));
}

/** a + bi with true minus signs, each part to its reliable digits. */
export function ptxComplexText(re: number, im: number, errorBound = 0) {
  const real = ptxNumber(re, errorBound).replace('-', '−');
  const imaginary = ptxNumber(Math.abs(im), errorBound);
  if (imaginary === '0') return real;
  const imaginaryPart = `${imaginary === '1' ? '' : imaginary}i`;
  if (real === '0') return `${im < 0 ? '−' : ''}${imaginaryPart}`;
  return `${real} ${im < 0 ? '−' : '+'} ${imaginaryPart}`;
}

export type PtxBadge = 'exact' | 'verified' | 'numeric';

export function ptxBadge(level: PtxLevel): PtxBadge {
  return level === 'exact-proved' ? 'exact' : level === 'numeric-validated' ? 'verified' : 'numeric';
}

const BADGE_MEANING: Record<PtxBadge, string> = {
  exact: 'Exact: proved symbolically',
  verified: 'Verified: bracketed or bounded numerically',
  numeric: 'Numeric: converged, not bracketed',
};

/** Hover detail for a point: what the badge means, its residual and error bound. */
export function ptxPointDetail(point: Pick<PtxPoint, 'level' | 'residual' | 'errorBound' | 'warnings'>) {
  const parts = [BADGE_MEANING[ptxBadge(point.level)]];
  if (point.level !== 'exact-proved') {
    parts.push(`error ≤ ${point.errorBound.toPrecision(2)}`);
    if (point.residual > 0) parts.push(`residual ${point.residual.toPrecision(2)}`);
  }
  if (point.warnings.includes('near-branch-cut')) parts.push('near a branch cut: the value jumps across it');
  if (point.warnings.includes('near-pole')) parts.push('near a pole');
  return parts.join(' · ');
}
