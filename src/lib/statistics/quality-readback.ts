import {
  mathPart,
  mixedDetailSection,
  textDetailSection,
  textPart,
} from '../display/result/result-detail-lines';
import { formatStatisticsNumber } from './shared';

export type RegressionFitSummary = {
  count: number;
  slope: number;
  intercept: number;
  r: number;
  rSquared: number;
};

export type RegressionDiagnostics = {
  sse: number;
  mse: number | null;
  residualStandardError: number | null;
};

export function correlationStrength(r: number) {
  const magnitude = Math.abs(r);
  const direction = r > 0 ? 'positive' : r < 0 ? 'negative' : 'none';
  const strength =
    magnitude < 0.2
      ? 'negligible'
      : magnitude < 0.4
        ? 'weak'
        : magnitude < 0.7
          ? 'moderate'
          : magnitude < 0.9
            ? 'strong'
            : 'very strong';

  return direction === 'none' ? 'no linear direction' : `${strength} ${direction}`;
}

export function regressionQualitySection(
  summary: RegressionFitSummary,
  diagnostics: RegressionDiagnostics,
) {
  const rows = [
    [textPart(`Fit strength: ${correlationStrength(summary.r)} linear relationship.`)],
    [textPart('SSE = '), mathPart(formatStatisticsNumber(diagnostics.sse))],
  ];

  if (diagnostics.mse === null || diagnostics.residualStandardError === null) {
    rows.push([textPart('Residual variance and residual standard error need at least 3 points.')]);
  } else {
    rows.push([
      textPart('Residual variance (MSE) = '),
      mathPart(formatStatisticsNumber(diagnostics.mse)),
    ]);
    rows.push([
      textPart('Residual standard error = '),
      mathPart(formatStatisticsNumber(diagnostics.residualStandardError)),
    ]);
  }

  return mixedDetailSection('Quality Summary', rows);
}

export function correlationQualitySection(summary: RegressionFitSummary) {
  const magnitude = Math.abs(summary.r);
  const qualityNote =
    magnitude < 0.4
      ? 'Quality note: weak linear relationship in this sample.'
      : magnitude < 0.7
        ? 'Quality note: moderate linear relationship in this sample.'
        : 'Quality note: strong linear relationship in this sample.';

  return textDetailSection('Quality Summary', [
    `Strength: ${correlationStrength(summary.r)} linear relationship.`,
    qualityNote,
  ]);
}
