import type { RegressionPoint } from '../../types/calculator';
import type { RegressionDiagnostics, RegressionFitSummary } from './quality-readback';
import { parseNumericDraft } from './shared';

export type StatisticsNumericPoint = {
  x: number;
  y: number;
};

export function parseStatisticsRelationshipPoints(points: readonly RegressionPoint[]):
  | { ok: true; points: StatisticsNumericPoint[] }
  | { ok: false; error: string } {
  const numericPoints: StatisticsNumericPoint[] = [];
  for (const point of points) {
    const x = point.x.trim();
    const y = point.y.trim();
    if (!x && !y) continue;
    if (!x || !y) {
      return { ok: false, error: 'Each point needs both x and y values.' };
    }
    const parsedX = parseNumericDraft(x);
    const parsedY = parseNumericDraft(y);
    if (parsedX === null || parsedY === null) {
      return { ok: false, error: `Point (${x}, ${y}) must use finite numeric values.` };
    }
    numericPoints.push({ x: parsedX, y: parsedY });
  }
  return numericPoints.length >= 2
    ? { ok: true, points: numericPoints }
    : { ok: false, error: 'Enter at least two valid points before evaluating this Statistics request.' };
}
export function statisticsRelationshipSummary(points: readonly StatisticsNumericPoint[]):
  | { ok: true; summary: RegressionFitSummary }
  | { ok: false; error: string } {
  const count = points.length;
  const meanX = points.reduce((total, point) => total + point.x, 0) / count;
  const meanY = points.reduce((total, point) => total + point.y, 0) / count;
  const sxx = points.reduce((total, point) => total + ((point.x - meanX) ** 2), 0);
  const syy = points.reduce((total, point) => total + ((point.y - meanY) ** 2), 0);
  const sxy = points.reduce(
    (total, point) => total + ((point.x - meanX) * (point.y - meanY)),
    0,
  );
  if (sxx === 0) return { ok: false, error: 'Regression needs non-zero spread in x.' };
  if (syy === 0) {
    return {
      ok: false,
      error: 'Regression needs non-zero spread in y to compute correlation strength.',
    };
  }
  const slope = sxy / sxx;
  const intercept = meanY - (slope * meanX);
  const r = sxy / Math.sqrt(sxx * syy);
  return {
    ok: true,
    summary: { count, slope, intercept, r, rSquared: r ** 2 },
  };
}

export function statisticsRegressionDiagnostics(
  points: readonly StatisticsNumericPoint[],
  summary: RegressionFitSummary,
): RegressionDiagnostics {
  const sse = points.reduce((total, point) => {
    const residual = point.y - ((summary.slope * point.x) + summary.intercept);
    return total + (residual ** 2);
  }, 0);
  if (summary.count < 3) return { sse, mse: null, residualStandardError: null };
  const mse = sse / (summary.count - 2);
  return { sse, mse, residualStandardError: Math.sqrt(mse) };
}

export function prepareStatisticsRelationshipCalculation(points: readonly RegressionPoint[]) {
  const parsed = parseStatisticsRelationshipPoints(points);
  if (!parsed.ok) return parsed;
  const fitted = statisticsRelationshipSummary(parsed.points);
  if (!fitted.ok) return fitted;
  return {
    ok: true as const,
    points: parsed.points,
    summary: fitted.summary,
    diagnostics: statisticsRegressionDiagnostics(parsed.points, fitted.summary),
  };
}
