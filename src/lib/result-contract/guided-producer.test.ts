import { describe, expect, it } from 'vitest';
import { buildGeometryModeRunPayload } from '../geometry/runtime-run';
import {
  buildCancelledTableModeResult,
  runTableMode,
} from '../modes/table-core';
import { buildStatisticsModeRunPayload } from '../statistics/runtime-run';
import { buildTrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import { resolveCanonicalResultForStorage } from './storage';

describe('guided-domain canonical result producers', () => {
  it('re-owns Trigonometry equation truth after the Equation handoff boundary', () => {
    const result = buildTrigonometryModeRunPayload({
      inputLatex: '\\sin(x)=\\frac{1}{2}',
      screenHint: 'equationSolve',
      angleUnit: 'deg',
    });

    expect(result.outcome.title).toBe('Trig Equation');
    if (result.outcome.kind === 'prompt') throw new Error('Expected Trigonometry result.');
    expect(resolveCanonicalResultForStorage(result.outcome))
      .toMatchObject({ ok: true, source: 'native' });
    expect(JSON.stringify(result.outcome.canonicalResult)).not.toContain('actions');
  });

  it('keeps Geometry transfer actions transient while storing native math', () => {
    const result = buildGeometryModeRunPayload({
      inputLatex: 'lineEquation(p1=(1,2), p2=(3,6), form=standard)',
      screenHint: 'lineEquation',
    });

    expect(result.outcome.kind).toBe('success');
    if (result.outcome.kind !== 'success') throw new Error('Expected Geometry success.');
    expect(result.outcome.actions?.[0]?.kind).toBe('send');
    expect(resolveCanonicalResultForStorage(result.outcome))
      .toMatchObject({ ok: true, source: 'native' });
    expect(JSON.stringify(result.outcome.canonicalResult)).not.toContain('actions');
  });

  it('stores Statistics quality evidence through its owner boundary', () => {
    const result = buildStatisticsModeRunPayload({
      inputLatex: 'regression(points={(1,2),(2,4),(3,6)})',
      screenHint: 'regression',
      workingSourceHint: 'dataset',
    });

    expect(result.outcome.kind).toBe('success');
    if (result.outcome.kind !== 'success') throw new Error('Expected Statistics success.');
    expect(result.outcome.detailSections?.[0]?.title).toBe('Quality Summary');
    expect(resolveCanonicalResultForStorage(result.outcome))
      .toMatchObject({ ok: true, source: 'native' });
  });

  it('stores exact Table headers and rows while leaving cancellation control-only', () => {
    const result = runTableMode({
      primaryLatex: '\\sqrt{x}',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -1,
      end: 1,
      step: 1,
    });

    if (result.outcome.kind === 'prompt') throw new Error('Expected Table result.');
    expect(resolveCanonicalResultForStorage(result.outcome, { tableResponse: result.response }))
      .toMatchObject({ ok: true, source: 'native' });
    expect(result.outcome.canonicalResult?.table).toEqual({
      headers: ['x', '\\sqrt{x}'],
      rows: [
        {
          x: { canonicalLatex: '-1' },
          primary: { canonicalLatex: 'undefined' },
        },
        {
          x: { canonicalLatex: '0' },
          primary: { canonicalLatex: '0' },
        },
        {
          x: { canonicalLatex: '1' },
          primary: { canonicalLatex: '1' },
        },
      ],
    });

    const cancelled = buildCancelledTableModeResult();
    expect(cancelled.runtimeStatus).toBe('cancelled');
    if (cancelled.outcome.kind === 'prompt') throw new Error('Expected Table cancellation result.');
    expect(cancelled.outcome.canonicalResult).toBeUndefined();
  });
});
