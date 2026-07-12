import { describe, expect, it } from 'vitest';
import type { CanonicalResultDocumentV1 } from '../../types/calculator';
import {
  CANONICAL_RESULT_TABLE_MAX_ROWS,
  collectCanonicalResultMathValues,
  validateCanonicalResultDocument,
} from './validation';

function comprehensiveDocument(): CanonicalResultDocumentV1 {
  return {
    version: 1,
    outcomeKind: 'success',
    title: 'Solved system',
    primaryMath: {
      canonicalLatex: 'x=1',
      mathJson: ['Equal', 'x', 1],
    },
    answerRows: {
      label: 'Answers',
      rows: [{ math: { canonicalLatex: 'x=1' }, label: 'First' }],
    },
    branchReadback: {
      target: { canonicalLatex: 'x' },
      relation: '=',
      branches: [{ canonicalLatex: '1' }, { canonicalLatex: '2' }],
      countLabel: 'roots',
      source: 'polynomial',
    },
    systemReadback: {
      variables: [{ canonicalLatex: 'x' }, { canonicalLatex: 'y' }],
      rows: [{
        values: [{ canonicalLatex: '1' }, { canonicalLatex: '2' }],
        approxText: '(1.0, 2.0)',
      }],
    },
    periodicFamily: {
      carrier: { canonicalLatex: '\\sin(x)' },
      parameter: { canonicalLatex: 'n' },
      parameterConstraints: [{ canonicalLatex: 'n\\in\\mathbb{Z}' }],
      branches: [{ canonicalLatex: 'x=2n\\pi' }],
      discoveredFamilies: [{ canonicalLatex: 'x=(2n+1)\\pi' }],
      representatives: [{ label: 'Principal', exact: { canonicalLatex: '0' } }],
      suggestedIntervals: [{
        label: 'Cycle',
        start: { canonicalLatex: '0' },
        end: { canonicalLatex: '2\\pi' },
      }],
      piecewiseBranches: [{
        condition: { canonicalLatex: 'n>0' },
        result: { canonicalLatex: '2n\\pi' },
      }],
      principalRange: { canonicalLatex: '[-\\pi,\\pi]' },
      reducedCarrier: { canonicalLatex: '\\sin(x)' },
    },
    supplements: [{ canonicalLatex: 'x\\ne0' }],
    approximations: { primary: '1.000000' },
    details: [{
      title: 'Proof',
      lines: [[
        { kind: 'text', text: 'Substitute ' },
        { kind: 'math', math: { canonicalLatex: 'x=1' } },
      ]],
    }],
    summaries: {
      solve: [[{ kind: 'math', math: { canonicalLatex: 'x=1' } }]],
      transform: { text: 'Expanded', math: { canonicalLatex: '(x-1)(x-2)' } },
    },
    warnings: ['Example warning'],
    metadata: {
      answerMode: 'exact',
      answerDomain: 'real',
      solutionKind: 'exact-symbolic',
      resultOrigin: 'symbolic',
      calculusStrategy: 'direct-rule',
      calculusDerivativeStrategies: ['chain-rule'],
      plannerBadges: ['Canonicalized'],
      solveBadges: ['Candidate Checked'],
      transformBadges: ['Cancel Factors'],
      resolvedInput: { canonicalLatex: 'x^2-3x+2=0' },
      candidateValues: [1, 2],
      rejectedCandidateCount: 0,
      substitutionDiagnostics: {
        family: 'exp-polynomial',
        carrierKind: 'exp',
        polynomialDegree: 2,
        branchCount: 2,
        filteredBranchCount: 0,
      },
      numericMethod: 'Exact factorization',
      sourceMode: 'equation',
      variableSubstitutions: [{
        name: 'a',
        value: { canonicalLatex: '2' },
        numericValue: 2,
      }],
    },
    table: {
      headers: ['x', 'f(x)'],
      rows: [{
        x: { canonicalLatex: '0' },
        primary: { canonicalLatex: 'undefined' },
      }],
    },
  };
}

describe('CanonicalResultDocumentV1 validation', () => {
  it('accepts and detaches a comprehensive versioned document', () => {
    const input = comprehensiveDocument();
    const result = validateCanonicalResultDocument(input);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.validated.mathValueCount).toBeGreaterThan(20);
    expect(result.validated.nodeCount).toBeGreaterThan(result.validated.mathValueCount);
    expect(result.validated.byteLength).toBeGreaterThan(100);
    expect(result.validated.value).toEqual(input);
    expect(result.validated.value).not.toBe(input);
    expect(structuredClone(result.validated.value)).toEqual(result.validated.value);

    input.primaryMath!.canonicalLatex = 'changed';
    expect(result.validated.value.primaryMath?.canonicalLatex).toBe('x=1');
  });

  it('collects every typed math value without entering MathJSON internals', () => {
    const references = collectCanonicalResultMathValues(comprehensiveDocument());
    expect(references.map((reference) => reference.path)).toContain('$.primaryMath');
    expect(references.map((reference) => reference.path)).toContain('$.table.rows[0].primary');
    expect(references.some((reference) => reference.path.includes('mathJson'))).toBe(false);
  });

  it.each([
    ['future version', { ...comprehensiveDocument(), version: 2 }],
    ['executable actions', { ...comprehensiveDocument(), actions: [{ kind: 'send' }] }],
    ['runtime advisories', { ...comprehensiveDocument(), runtimeAdvisories: { stopReason: {} } }],
    ['settings', { ...comprehensiveDocument(), settings: { angleUnit: 'deg' } }],
    ['record identity', { ...comprehensiveDocument(), id: 'history.1' }],
    ['UI collapse state', { ...comprehensiveDocument(), collapsed: true }],
  ])('rejects prohibited or unknown %s fields', (_label, input) => {
    const result = validateCanonicalResultDocument(input);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected rejection');
    expect(result.failure.reason).toBe('invalid-shape');
  });

  it('rejects malformed MathJSON without rejecting canonical LaTeX-only values', () => {
    const invalid = comprehensiveDocument();
    invalid.primaryMath!.mathJson = { sym: 1 } as never;
    const invalidResult = validateCanonicalResultDocument(invalid);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect(invalidResult.failure).toMatchObject({
        reason: 'invalid-math-json',
        path: '$.primaryMath.mathJson',
      });
    }

    delete invalid.primaryMath!.mathJson;
    expect(validateCanonicalResultDocument(invalid).ok).toBe(true);
  });

  it('enforces the existing MathJSON node and byte bounds inside the larger document bound', () => {
    const wide = comprehensiveDocument();
    wide.primaryMath!.mathJson = [
      'Add',
      ...Array.from({ length: 2_000 }, () => 1),
    ];
    expect(validateCanonicalResultDocument(wide)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-math-json', path: '$.primaryMath.mathJson' },
    });

    const large = comprehensiveDocument();
    large.primaryMath!.mathJson = ['Symbol', 'x'.repeat(321_000)];
    expect(validateCanonicalResultDocument(large)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-math-json', path: '$.primaryMath.mathJson' },
    });
  });

  it('rejects unsupported, non-finite, cyclic, and non-plain data', () => {
    const withFunction = comprehensiveDocument() as unknown as Record<string, unknown>;
    withFunction.future = () => 1;
    expect(validateCanonicalResultDocument(withFunction)).toMatchObject({
      ok: false,
      failure: { reason: 'unsupported-value' },
    });

    const withNaN = comprehensiveDocument();
    withNaN.metadata!.candidateValues = [Number.NaN];
    expect(validateCanonicalResultDocument(withNaN)).toMatchObject({
      ok: false,
      failure: { reason: 'non-finite-number' },
    });

    const withDate = comprehensiveDocument() as unknown as Record<string, unknown>;
    withDate.future = new Date();
    expect(validateCanonicalResultDocument(withDate)).toMatchObject({
      ok: false,
      failure: { reason: 'non-plain-object' },
    });

    const cyclic = comprehensiveDocument() as CanonicalResultDocumentV1 & { self?: unknown };
    cyclic.self = cyclic;
    expect(validateCanonicalResultDocument(cyclic)).toMatchObject({
      ok: false,
      failure: { reason: 'cyclic-value' },
    });
  });

  it('rejects array gaps, accessors, symbols, and custom properties before cloning', () => {
    const withGap = comprehensiveDocument();
    withGap.warnings = new Array(1);
    expect(validateCanonicalResultDocument(withGap)).toMatchObject({
      ok: false,
      failure: { reason: 'unsupported-value', path: '$.warnings[0]' },
    });

    const withAccessor = comprehensiveDocument();
    Object.defineProperty(withAccessor.warnings, '0', {
      enumerable: true,
      get: () => 'computed',
    });
    expect(validateCanonicalResultDocument(withAccessor)).toMatchObject({
      ok: false,
      failure: { reason: 'unsupported-value', path: '$.warnings[0]' },
    });

    const withSymbol = comprehensiveDocument();
    Object.defineProperty(withSymbol.warnings, Symbol('hidden'), { value: 'hidden' });
    expect(validateCanonicalResultDocument(withSymbol)).toMatchObject({
      ok: false,
      failure: { reason: 'unsupported-value', path: '$.warnings' },
    });

    const withCustomProperty = comprehensiveDocument();
    Object.defineProperty(withCustomProperty.warnings, 'note', {
      enumerable: true,
      value: 'hidden from JSON',
    });
    expect(validateCanonicalResultDocument(withCustomProperty)).toMatchObject({
      ok: false,
      failure: { reason: 'unsupported-value', path: '$.warnings' },
    });
  });

  it('enforces whole-document node, depth, byte, and Table bounds', () => {
    const document = comprehensiveDocument();
    expect(validateCanonicalResultDocument(document, { maxNodes: 2 })).toMatchObject({
      ok: false,
      failure: { reason: 'node-limit' },
    });
    expect(validateCanonicalResultDocument(document, { maxDepth: 2 })).toMatchObject({
      ok: false,
      failure: { reason: 'depth-limit' },
    });
    expect(validateCanonicalResultDocument(document, { maxBytes: 50 })).toMatchObject({
      ok: false,
      failure: { reason: 'byte-limit' },
    });

    document.table!.rows = Array.from(
      { length: CANONICAL_RESULT_TABLE_MAX_ROWS + 1 },
      (_, index) => ({
        x: { canonicalLatex: String(index) },
        primary: { canonicalLatex: String(index * index) },
      }),
    );
    expect(validateCanonicalResultDocument(document)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape' },
    });
  });

  it('requires error text only for error documents', () => {
    expect(validateCanonicalResultDocument({
      version: 1,
      outcomeKind: 'error',
      title: 'Stopped',
      warnings: [],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-shape' } });

    expect(validateCanonicalResultDocument({
      version: 1,
      outcomeKind: 'success',
      title: 'Result',
      error: 'not allowed',
      warnings: [],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-shape' } });

    expect(validateCanonicalResultDocument({
      version: 1,
      outcomeKind: 'error',
      title: 'Stopped',
      error: '   ',
      warnings: [],
    })).toMatchObject({ ok: false, failure: { reason: 'invalid-shape' } });
  });
});
