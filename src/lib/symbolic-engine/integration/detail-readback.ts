import type { DisplayDetailLinePart, DisplayDetailSection } from '../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../display/result-detail-lines';

export type IntegrationDetailRow = DisplayDetailLinePart[];

export function integrationTextRow(text: string): IntegrationDetailRow {
  return [textPart(text)];
}

export function integrationMathRow(
  label: string,
  latex: string,
  suffix = '',
): IntegrationDetailRow {
  return [
    textPart(label),
    mathPart(latex),
    ...(suffix ? [textPart(suffix)] : []),
  ];
}

export function integrationDetailSection(
  title: string,
  rows: readonly (readonly DisplayDetailLinePart[])[],
): DisplayDetailSection {
  return mixedDetailSection(title, rows);
}
