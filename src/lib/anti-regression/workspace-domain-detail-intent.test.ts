import { describe, expect, it } from 'vitest';
import type { DisplayDetailSection } from '../../types/calculator';
import { detailLineIntentAt } from '../display/result-detail-lines';
import { buildCancelledTableModeResult } from '../modes/table-core';
import { runStatisticsCoreDraft } from '../statistics/core';

function partValue(part: NonNullable<DisplayDetailSection['lineParts']>[number][number]) {
  return part.kind === 'math' ? part.latex : part.text;
}

function expectDeclaredSection(section: DisplayDetailSection | undefined) {
  expect(section).toBeDefined();
  if (!section) throw new Error('Missing detail section');
  section.lines.forEach((_line, index) => {
    expect(detailLineIntentAt(section, index)).not.toBe('undeclared');
  });
  if (section.lineParts) {
    expect(section.lineParts.map((row) => row.map(partValue).join(''))).toEqual(section.lines);
  }
}

describe('workspace-domain detail intent', () => {
  it('types Statistics regression diagnostics and keeps correlation quality prose explicit', () => {
    const regression = runStatisticsCoreDraft(
      'regression(points={(1,2),(2,4),(3,6)})',
      { screenHint: 'regression' },
    ).outcome;
    const correlation = runStatisticsCoreDraft(
      'correlation(points={(1,2),(2,5),(3,7)})',
      { screenHint: 'correlation' },
    ).outcome;

    expect(regression.kind).toBe('success');
    expect(correlation.kind).toBe('success');
    if (regression.kind !== 'success' || correlation.kind !== 'success') {
      throw new Error('Expected Statistics quality outcomes');
    }
    expectDeclaredSection(regression.detailSections?.[0]);
    expectDeclaredSection(correlation.detailSections?.[0]);
    expect(regression.detailSections?.[0]?.lineParts?.flat().filter((part) => (
      part.kind === 'math'
    ))).toHaveLength(3);
    expect(correlation.detailSections?.[0]?.lineKind).toBe('text');
  });

  it('declares Table cancellation evidence as prose-only', () => {
    const cancelled = buildCancelledTableModeResult();
    expect(cancelled.outcome.kind).toBe('error');
    if (cancelled.outcome.kind !== 'error') throw new Error('Expected Table cancellation');
    const section = cancelled.outcome.detailSections?.[0];

    expectDeclaredSection(section);
    expect(section?.lineKind).toBe('text');
    expect(section?.lines).toEqual([
      'The active Table job observed a Stop request and exited before committing rows.',
    ]);
  });
});
