import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../display/result/result-detail-lines';

export type CalculusDetailRow = DisplayDetailLinePart[];

export function calculusTextPart(text: string): DisplayDetailLinePart {
  return textPart(text);
}

export function calculusMathPart(latex: string): DisplayDetailLinePart {
  return mathPart(latex);
}

export function calculusTextRow(text: string): CalculusDetailRow {
  return [calculusTextPart(text)];
}

export function calculusTextRows(lines: readonly string[]): CalculusDetailRow[] {
  return lines.map(calculusTextRow);
}

export function calculusMathValueRow(
  prefix: string,
  latex: string,
  suffix = '',
): CalculusDetailRow {
  return [
    calculusTextPart(prefix),
    calculusMathPart(latex),
    ...(suffix ? [calculusTextPart(suffix)] : []),
  ];
}

export function calculusDetailSection(
  title: string,
  rows: readonly (readonly DisplayDetailLinePart[])[],
): DisplayDetailSection {
  return mixedDetailSection(title, rows);
}
