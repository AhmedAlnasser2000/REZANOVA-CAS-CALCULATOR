import { describe, expect, it } from 'vitest';
import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../result-contract';
import baseline from '../__golden__/print-hygiene-baseline.json';
import { buildPrintHygieneBaseline } from '../__golden__/print-hygiene-baseline';
import { parsePrintHygieneUpdateArgs } from '../__golden__/print-hygiene-update-policy';
import {
  collectDisplayOutcomeMathFragments,
  collectTableResponseMathFragments,
  findMalformedMathFragments,
  normalizePrintHygieneValue,
} from './print-hygiene';

describe('print hygiene fragment collection', () => {
  it('collects stable typed paths across every mathematical DisplayOutcome surface', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Coverage',
      exactLatex: '(x+1)',
      canonicalMath: {
        version: 1,
        canonicalLatex: '(x+1)',
        mathJson: ['Add', 'x', 1],
      },
      answerRows: { rows: [{ latex: 'x=1' }] },
      branchReadback: { targetLatex: 'x', relationLatex: '=', branchesLatex: ['1', '-1'] },
      systemReadback: { variablesLatex: ['x', 'y'], rows: [{ valuesLatex: ['1', '2'] }] },
      periodicFamily: {
        carrierLatex: '\\sin(x)',
        parameterLatex: 'n',
        parameterConstraintLatex: ['n\\in\\mathbb{Z}'],
        branchesLatex: ['x=2\\pi n'],
        representatives: [{ label: 'principal', exactLatex: '0' }],
        suggestedIntervals: [{ label: 'cycle', start: '0', end: '2\\pi' }],
        piecewiseBranches: [{ conditionLatex: 'n>0', resultLatex: '2\\pi n' }],
        principalRangeLatex: '[-\\pi,\\pi]',
        reducedCarrierLatex: '\\sin(x)=0',
      },
      exactSupplementLatex: ['x\\ne0'],
      detailSections: [
        { title: 'Math', lines: ['x^2'], lineKind: 'math' },
        {
          title: 'Mixed',
          lines: ['Root: x=1'],
          lineParts: [[{ kind: 'text', text: 'Root: ' }, { kind: 'math', latex: 'x=1' }]],
        },
        { title: 'Prose', lines: ['NaN is a token name in this explanation.'], lineKind: 'text' },
      ],
      solveSummaryParts: [[
        { kind: 'text', text: 'Reduced carrier: ' },
        { kind: 'math', latex: 'x^2=1' },
      ]],
      actions: [{ kind: 'send', target: 'equation', latex: 'x=1' }],
      transformSummaryLatex: 'x\\mapsto x+1',
      resolvedInputLatex: 'x^2=1',
      variableSubstitutions: [{ name: 'a', valueLatex: '\\frac{1}{2}', numericValue: 0.5 }],
      warnings: [],
      canonicalResult: buildCanonicalResultDocumentFromProducer({
        outcomeKind: 'success',
        title: 'Coverage',
        primaryMath: canonicalMathValue('(x+1)', ['Add', 'x', 1]),
        answerRows: { rows: [{ latex: 'x=1' }] },
        branchReadback: { targetLatex: 'x', relationLatex: '=', branchesLatex: ['1', '-1'] },
        systemReadback: { variablesLatex: ['x', 'y'], rows: [{ valuesLatex: ['1', '2'] }] },
        periodicFamily: {
          carrierLatex: '\\sin(x)',
          parameterLatex: 'n',
          parameterConstraintLatex: ['n\\in\\mathbb{Z}'],
          branchesLatex: ['x=2\\pi n'],
          representatives: [{ label: 'principal', exactLatex: '0' }],
          suggestedIntervals: [{ label: 'cycle', start: '0', end: '2\\pi' }],
          piecewiseBranches: [{ conditionLatex: 'n>0', resultLatex: '2\\pi n' }],
          principalRangeLatex: '[-\\pi,\\pi]',
          reducedCarrierLatex: '\\sin(x)=0',
        },
        supplements: ['x\\ne0'],
        detailSections: [
          { title: 'Math', lines: ['x^2'], lineKind: 'math' },
          {
            title: 'Mixed',
            lines: ['Root: x=1'],
            lineParts: [[{ kind: 'text', text: 'Root: ' }, { kind: 'math', latex: 'x=1' }]],
          },
          { title: 'Prose', lines: ['NaN is a token name in this explanation.'], lineKind: 'text' },
        ],
        solveSummaryParts: [[
          { kind: 'text', text: 'Reduced carrier: ' },
          { kind: 'math', latex: 'x^2=1' },
        ]],
        transformSummaryLatex: 'x\\mapsto x+1',
        warnings: [],
        metadata: {
          resolvedInput: canonicalMathValue('x^2=1'),
          variableSubstitutions: [{
            name: 'a',
            value: canonicalMathValue('\\frac{1}{2}'),
            numericValue: 0.5,
          }],
        },
      }),
    };

    const fragments = collectDisplayOutcomeMathFragments(outcome);
    expect(fragments).toContainEqual({ path: 'exactLatex', kind: 'primary-answer', value: '(x+1)' });
    expect(fragments).toContainEqual({
      path: 'canonicalMath.canonicalLatex',
      kind: 'canonical-payload',
      value: '(x+1)',
    });
    expect(fragments).toContainEqual({
      path: 'detailSections[1].lineParts[0][1].latex',
      kind: 'detail-math-part',
      value: 'x=1',
    });
    expect(fragments).toContainEqual({
      path: 'solveSummaryParts[0][1].latex',
      kind: 'solve-summary-math-part',
      value: 'x^2=1',
    });
    expect(fragments.map((fragment) => fragment.value)).not.toContain('NaN is a token name in this explanation.');
    expect(new Set(fragments.map((fragment) => fragment.kind)).size).toBe(25);
  });

  it('collects prompt carry math without treating its prose as math', () => {
    const outcome: DisplayOutcome = {
      kind: 'prompt',
      title: 'Route',
      message: 'Internal error is prose here.',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    };
    expect(collectDisplayOutcomeMathFragments(outcome)).toEqual([
      { path: 'carryLatex', kind: 'prompt-carry', value: 'x=1' },
    ]);
  });

  it('finds bounded malformed markers without matching longer identifiers', () => {
    const fragments = [
      { path: 'a', kind: 'primary-answer' as const, value: 'NaN+undefined' },
      { path: 'b', kind: 'primary-answer' as const, value: '[object Object]' },
      { path: 'c', kind: 'primary-answer' as const, value: 'solver_internal-error' },
      { path: 'c2', kind: 'primary-answer' as const, value: 'InternalError' },
      { path: 'd', kind: 'primary-answer' as const, value: 'undefinedVariable+isNaNValue' },
    ];
    expect(findMalformedMathFragments(fragments).map((item) => item.marker)).toEqual([
      'nan',
      'undefined',
      'object-object',
      'internal-error',
      'internal-error',
    ]);
  });

  it('allows literal undefined Table cells while checking other Table corruption', () => {
    const response: TableResponse = {
      headers: ['x', 'f(x)'],
      rows: [
        { x: '-1', primary: 'undefined' },
        { x: '0', primary: '[object Object]' },
      ],
      warnings: [],
    };
    const fragments = collectTableResponseMathFragments(response);
    expect(findMalformedMathFragments(fragments)).toEqual([
      expect.objectContaining({ path: 'tableResponse.rows[1].primary', marker: 'object-object' }),
    ]);
  });

  it('normalizes whitespace without stripping pedagogical parentheses', () => {
    expect(normalizePrintHygieneValue('  (x + 1)\n  = 2  ')).toBe('(x + 1) = 2');
  });
});

describe('print hygiene baseline', () => {
  it('matches all 43 golden executions and keeps two successful cases per workspace', async () => {
    const generated = await buildPrintHygieneBaseline(baseline.acceptedReason);
    expect(generated).toEqual(baseline);
    expect(generated.caseCount).toBe(43);
    expect(Object.values(generated.successfulWorkspaceCounts).every((count) => count >= 2)).toBe(true);
  });

  it('requires explicit acceptance and a durable reason for updates', () => {
    expect(() => parsePrintHygieneUpdateArgs([])).toThrow('--accept');
    expect(() => parsePrintHygieneUpdateArgs(['--accept'])).toThrow('non-empty --reason');
    expect(() => parsePrintHygieneUpdateArgs(['-u', '--accept', '--reason', 'no'])).toThrow('not supported');
    expect(parsePrintHygieneUpdateArgs(['--accept', '--reason', 'Initial curated baseline'])).toEqual({
      accepted: true,
      reason: 'Initial curated baseline',
    });
  });
});
