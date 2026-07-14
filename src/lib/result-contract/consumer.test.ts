import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import { buildCanonicalResultDocumentFromProducer, canonicalMathValue } from './producer';
import { resolveCanonicalResultForConsumer } from './consumer';
import {
  canonicalRuntimeResultV2Fixture,
  standardV2MathValue,
} from '../../test-utils/canonical-result-v2-fixture';

describe('canonical result consumer resolution', () => {
  it('returns validated native canonical truth', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Canonical',
      primaryMath: canonicalMathValue('x=1'),
      warnings: ['Canonical warning'],
    });

    expect(resolveCanonicalResultForConsumer({ kind: 'success', canonicalResult })).toMatchObject({
      ok: true,
      source: 'native',
      sourceVersion: 1,
      rawDocument: canonicalResult,
      presentation: {
        outcomeKind: 'success',
        title: 'Canonical',
        primaryLatex: 'x=1',
        warnings: ['Canonical warning'],
      },
      semantics: {
        primary: { kind: 'math', value: { canonicalLatex: 'x=1' } },
      },
    });
  });

  it('normalizes V2 typed semantics while preserving adapter-owned presentation', () => {
    const x = standardV2MathValue('x', 'x');
    const one = standardV2MathValue('1', 1);
    const outcome = canonicalRuntimeResultV2Fixture({
      outcomeKind: 'success',
      title: 'Typed derivative',
      primary: { kind: 'math', value: one },
      request: {
        kind: 'derivative-at-point',
        presentationLatex: '\\left.\\frac{d}{dx}(x)\\right|_{x=1}',
        body: x,
        appliedVariablePath: [x],
        point: one,
      },
      supplements: [{
        role: 'condition',
        presentationLatex: 'x>0',
        math: standardV2MathValue('x>0', ['Greater', 'x', 0]),
      }],
      warnings: [],
    });

    expect(resolveCanonicalResultForConsumer(outcome)).toMatchObject({
      ok: true,
      sourceVersion: 2,
      presentation: {
        primaryLatex: '1',
        requestLatex: '\\left.\\frac{d}{dx}(x)\\right|_{x=1}',
        supplements: ['x>0'],
      },
      semantics: {
        request: {
          kind: 'derivative-at-point',
          body: { canonicalLatex: 'x', mathJson: 'x' },
          point: { canonicalLatex: '1', mathJson: 1 },
        },
        supplements: [{ role: 'condition', math: { canonicalLatex: 'x>0' } }],
      },
    });
  });

  it('does not manufacture V2-only request, supplement-role, or undefined-cell semantics for V1', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Legacy table',
      primaryMath: canonicalMathValue('1', 1),
      supplements: ['x>0'],
      table: {
        headers: ['x', 'f(x)'],
        rows: [{ x: canonicalMathValue('0', 0), primary: canonicalMathValue('1', 1) }],
      },
      metadata: { resolvedInput: canonicalMathValue('f(0)') },
      warnings: [],
    });
    const resolution = resolveCanonicalResultForConsumer({ kind: 'success', canonicalResult });
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) return;
    expect(resolution.semantics.request).toBeUndefined();
    expect(resolution.semantics.supplements).toEqual([{ math: { canonicalLatex: 'x>0' } }]);
    expect(resolution.semantics.table?.rows[0]?.primary).toEqual({
      kind: 'legacy',
      value: { canonicalLatex: '1', mathJson: 1 },
    });
  });

  it('rejects prompt control outcomes', () => {
    expect(resolveCanonicalResultForConsumer({
      kind: 'prompt',
      title: 'Choose a target',
      message: 'Select a variable.',
      targetMode: 'equation',
      carryLatex: 'x+y=1',
      warnings: [],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'prompt-outcome' },
    });
  });

  it('fails closed on an invalid native document', () => {
    const outcome = {
      kind: 'success',
      canonicalResult: { version: 1 },
    } as unknown as CanonicalRuntimeOutcome;
    expect(resolveCanonicalResultForConsumer(outcome)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-document' },
    });
  });

  it('fails closed when runtime and document outcome kinds disagree', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'error',
      title: 'Controlled stop',
      error: 'No real solution.',
      warnings: [],
    });

    expect(resolveCanonicalResultForConsumer({
      kind: 'success',
      canonicalResult,
    } as unknown as CanonicalRuntimeOutcome)).toMatchObject({
      ok: false,
      failure: {
        reason: 'invalid-document',
        message: 'Runtime kind must match the canonical result document outcome kind.',
      },
    });
  });
});
