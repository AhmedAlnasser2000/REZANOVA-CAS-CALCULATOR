import type { DisplayDetailSection } from '../../types/calculator';

export function buildNumericConfidenceSection(lines: readonly string[]): DisplayDetailSection | null {
  const uniqueLines = [...new Set(lines.filter((line) => line.trim().length > 0))];
  return uniqueLines.length > 0
    ? {
        title: 'Numeric Confidence',
        lines: uniqueLines,
      }
    : null;
}
