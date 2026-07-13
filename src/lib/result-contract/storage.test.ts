import { describe, expect, it } from 'vitest';
import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import { projectDisplayOutcomeToCanonicalResult } from './projection';
import { resolveCanonicalResultForStorage } from './storage';

const TABLE_RESPONSE: TableResponse = {
  headers: ['x', 'f(x)'],
  rows: [
    { x: '-1', primary: 'undefined' },
    { x: '0', primary: '0' },
  ],
  warnings: ['One row is outside the real domain.'],
};

function outcome(): Extract<DisplayOutcome, { kind: 'success' }> {
  return {
    kind: 'success',
    title: 'Table',
    exactLatex: '\\operatorname{Table}(f)',
    detailSections: [{ title: 'Domain', lines: ['x\\ge 0'], lineKind: 'math' }],
    warnings: [...TABLE_RESPONSE.warnings],
  };
}

describe('canonical result storage resolution', () => {
  it('builds a validated compatibility document with exact Table rows', () => {
    const resolved = resolveCanonicalResultForStorage(outcome(), {
      tableResponse: TABLE_RESPONSE,
    });
    expect(resolved).toMatchObject({ ok: true, source: 'compatibility' });
    if (!resolved.ok) throw new Error(resolved.message);
    expect(resolved.document.table).toEqual({
      headers: TABLE_RESPONSE.headers,
      rows: [
        { x: { canonicalLatex: '-1' }, primary: { canonicalLatex: 'undefined' } },
        { x: { canonicalLatex: '0' }, primary: { canonicalLatex: '0' } },
      ],
    });
  });

  it('accepts a native document only when every stable compatibility field matches', () => {
    const displayOutcome = outcome();
    const projected = projectDisplayOutcomeToCanonicalResult(displayOutcome, {
      tableResponse: TABLE_RESPONSE,
    });
    if (!projected.ok) throw new Error(projected.failure.message);

    displayOutcome.canonicalResult = projected.document;
    expect(resolveCanonicalResultForStorage(displayOutcome, {
      tableResponse: TABLE_RESPONSE,
    })).toMatchObject({ ok: true, source: 'native' });

    displayOutcome.canonicalResult = { ...projected.document, title: 'Changed' };
    expect(resolveCanonicalResultForStorage(displayOutcome, {
      tableResponse: TABLE_RESPONSE,
    })).toMatchObject({ ok: false, omissionReason: 'invalid' });
  });

  it('allows producer-proven MathJSON where the legacy projection carries only LaTeX', () => {
    const displayOutcome = outcome();
    const projected = projectDisplayOutcomeToCanonicalResult(displayOutcome, {
      tableResponse: TABLE_RESPONSE,
    });
    if (!projected.ok) throw new Error(projected.failure.message);
    const document = structuredClone(projected.document);
    document.details![0].lines[0][0] = {
      kind: 'math',
      math: { canonicalLatex: 'x\\ge 0', mathJson: ['GreaterEqual', 'x', 0] },
    };
    document.table!.rows[1].primary.mathJson = 0;
    displayOutcome.canonicalResult = document;

    expect(resolveCanonicalResultForStorage(displayOutcome, {
      tableResponse: TABLE_RESPONSE,
    })).toMatchObject({ ok: true, source: 'native' });
  });

  it('still rejects conflicting MathJSON when compatibility carries the same leaf', () => {
    const displayOutcome = outcome();
    displayOutcome.canonicalMath = {
      version: 1,
      canonicalLatex: displayOutcome.exactLatex!,
      mathJson: ['Table', 'f'],
    };
    const projected = projectDisplayOutcomeToCanonicalResult(displayOutcome, {
      tableResponse: TABLE_RESPONSE,
    });
    if (!projected.ok) throw new Error(projected.failure.message);
    displayOutcome.canonicalResult = structuredClone(projected.document);
    displayOutcome.canonicalResult.primaryMath!.mathJson = ['Table', 'g'];

    expect(resolveCanonicalResultForStorage(displayOutcome, {
      tableResponse: TABLE_RESPONSE,
    })).toMatchObject({ ok: false, omissionReason: 'invalid' });
  });

  it('maps whole-document and nested MathJSON limits to durable over-size omission', () => {
    const oversizedDocument = projectDisplayOutcomeToCanonicalResult(outcome());
    if (!oversizedDocument.ok) throw new Error(oversizedDocument.failure.message);
    const displayOutcome = outcome();
    displayOutcome.canonicalResult = {
      ...oversizedDocument.document,
      warnings: ['x'.repeat(641_000)],
    };
    expect(resolveCanonicalResultForStorage(displayOutcome)).toMatchObject({
      ok: false,
      omissionReason: 'over-size',
    });

    displayOutcome.canonicalResult = {
      ...oversizedDocument.document,
      primaryMath: {
        canonicalLatex: 'x',
        mathJson: ['Symbol', 'x'.repeat(321_000)],
      },
    };
    expect(resolveCanonicalResultForStorage(displayOutcome)).toMatchObject({
      ok: false,
      omissionReason: 'over-size',
    });
  });
});
