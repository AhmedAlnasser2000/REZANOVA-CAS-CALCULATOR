import { describe, expect, it } from 'vitest';
import { buildGeometryModeRunPayload } from '../geometry/runtime-run';
import {
  buildCancelledTableModeResult,
  runTableMode,
} from '../modes/table-core';
import { buildStatisticsModeRunPayload } from '../statistics/runtime-run';
import { buildTrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import { requireCanonicalResultAuthority } from './native-result';

describe('guided-domain canonical result producers', () => {
  it('re-owns Trigonometry equation truth after the Equation handoff boundary', () => {
    const result = buildTrigonometryModeRunPayload({
      inputLatex: '\\sin(x)=\\frac{1}{2}',
      screenHint: 'equationSolve',
      angleUnit: 'deg',
    });

    expect(result.outcome.title).toBe('Trig Equation');
    if (result.outcome.kind === 'prompt') throw new Error('Expected Trigonometry result.');
    expect(requireCanonicalResultAuthority(result.outcome, 'Trigonometry test').canonicalResult)
      .toBeDefined();
    expect(result.outcome.canonicalResult?.branchReadback?.target.mathJson).toBe('x');
    expect(result.outcome.canonicalResult?.branchReadback?.branches
      .every((branch) => branch.mathJson !== undefined)).toBe(true);
    expect(result.outcome.canonicalResult?.supplements?.[0]?.mathJson)
      .toEqual(['Element', 'n', 'Integers']);
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
    expect(requireCanonicalResultAuthority(result.outcome, 'Geometry test').canonicalResult)
      .toBeDefined();
    expect(result.outcome.canonicalResult?.primaryMath?.mathJson).toBeDefined();
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
    expect(requireCanonicalResultAuthority(result.outcome, 'Statistics test').canonicalResult)
      .toBeDefined();
    expect(result.outcome.canonicalResult?.primaryMath?.mathJson).toBeDefined();
    expect(result.outcome.canonicalResult?.details?.[0]?.lines.slice(1)
      .every((line) => line.some((part) => part.kind === 'math' && part.math.mathJson !== undefined)))
      .toBe(true);
  });

  it('stores exact Table rows and canonical cancellation without partial values', () => {
    const result = runTableMode({
      primaryLatex: '\\sqrt{x}',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -1,
      end: 1,
      step: 1,
    });

    if (result.outcome.kind === 'prompt') throw new Error('Expected Table result.');
    expect(requireCanonicalResultAuthority(
      result.outcome,
      'Table test',
      { tableResponse: result.response },
    ).canonicalResult).toBeDefined();
    expect(result.outcome.canonicalResult?.table).toEqual({
      headers: ['x', '\\sqrt{x}'],
      rows: [
        {
          x: { canonicalLatex: '-1', mathJson: -1 },
          primary: { canonicalLatex: 'undefined' },
        },
        {
          x: { canonicalLatex: '0', mathJson: 0 },
          primary: { canonicalLatex: '0', mathJson: 0 },
        },
        {
          x: { canonicalLatex: '1', mathJson: 1 },
          primary: { canonicalLatex: '1', mathJson: 1 },
        },
      ],
    });

    const cancelled = buildCancelledTableModeResult();
    expect(cancelled.runtimeStatus).toBe('cancelled');
    if (cancelled.outcome.kind === 'prompt') throw new Error('Expected Table cancellation result.');
    expect(requireCanonicalResultAuthority(
      cancelled.outcome,
      'Table cancellation test',
      { tableResponse: cancelled.response },
    ).canonicalResult).toBeDefined();
    expect(cancelled.outcome.canonicalResult?.table).toEqual({ headers: [], rows: [] });
  });
});
