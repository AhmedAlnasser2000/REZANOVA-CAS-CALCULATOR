import { describe, expect, it } from 'vitest';
import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import type { CanonicalResultDraft } from '../../../types/calculator/canonical-result-current';
import type { CanonicalExponentialPrimitivePrimary } from '../../../types/calculator/canonical-result-integration';
import { buildCanonicalResultDocument, collectCanonicalResultMathValues, requireCanonicalResultAuthority,
  resolveCanonicalResultForConsumer, validateCanonicalResultDocument } from './index';
import { exactIntegrationMathLatex } from './integration-schema';
import { equationFixtures } from './equation-fixtures.test-support';

const m = (mathJson: SerializableMathJson) => ({ mathJson, canonicalLatex: exactIntegrationMathLatex(mathJson) });
const draft = (primary?: CanonicalResultDraft['primary']): CanonicalResultDraft => ({ outcomeKind: 'success', title: 'Answer', warnings: [], ...(primary ? { primary } : {}) });
const exp = (): CanonicalExponentialPrimitivePrimary => ({
  kind: 'exponential-antiderivative', semantics: 'formal-local-complex', variable: 'x', integrationConstant: 'C',
  construction: { kind: 'rational-exponential', generator: 't', argument: m(['Add', 'x', 1]) },
  fieldPart: m(['Divide', 1, ['Add', 't', 'x']]), terms: [], restrictions: [],
});
const restriction = (tree: SerializableMathJson) => ({ kind: 'nonzero' as const, value: m(tree),
  origins: [{ category: 'source' as const, path: 'expression.denominator' }] });
const rootTerm = () => ({ rootVariable: 'a', modulus: m(['Add', 1, ['Power', 'a', 2]]), weight: m('a'),
  argument: m(['Add', 't', 'x', 'a']), norm: m(['Add', 1, ['Power', ['Add', 't', 'x'], 2]]) });

describe('current canonical result foundation', () => {
  it('owns the wire revision and round trips exact large coefficients without historical conversion', () => {
    const d = buildCanonicalResultDocument(draft({ kind: 'math', value: m({ num: '9007199254740993123456789' }) }));
    expect(d.version).toBe(7);
    expect(requireCanonicalResultAuthority(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(requireCanonicalResultAuthority(structuredClone(d))).toEqual(d);
    for (const version of [1, 2, 3, 4, 5, 6, 8]) {
      expect(validateCanonicalResultDocument({ ...d, version })).toMatchObject({ ok: false, failure: { reason: 'unsupported-version' } });
    }
  });

  it('rejects missing proof trees, custom heads, unknown fields and malformed error envelopes', () => {
    const d = buildCanonicalResultDocument(draft({ kind: 'math', value: m(2) }));
    for (const value of [{ canonicalLatex: '2' }, { ...m(2), mathJson: ['PrivateRoot', 2] }, { ...m(2), proof: true }]) {
      expect(validateCanonicalResultDocument({ ...d, primary: { kind: 'math', value } }).ok).toBe(false);
    }
    expect(validateCanonicalResultDocument({ ...d, outcomeKind: 'error' }).ok).toBe(false);
    expect(validateCanonicalResultDocument({ ...d, error: 'failure' }).ok).toBe(false);
    expect(validateCanonicalResultDocument({ ...d, verified: true }).ok).toBe(false);
  });

  it('preserves units, undefined table cells, branches, metadata and exact detail leaves', () => {
    const d = buildCanonicalResultDocument({ ...draft({ kind: 'angle-quantity', magnitude: m(90), unit: 'deg', presentation: { primaryLatex: '90^\\circ' } }),
      table: { headers: ['x', 'f'], rows: [{ x: m(0), primary: { kind: 'undefined', reason: 'pole', presentationLatex: '\\text{undefined}' }, secondary: { kind: 'value', value: m(1) } }] },
      branchReadback: { target: m('x'), relation: '=', branches: [m(1), m(-1)] },
      details: [{ title: 'Elimination', lines: [[{ kind: 'row-operation', presentationLatex: 'R_1/2', operation: { kind: 'scale', row: 1, factor: m(['Rational', 1, 2]) } }]] }],
      metadata: { variableSubstitutions: [{ name: 'a', value: m(2), numericValue: 2 }], answerDomain: 'real' },
    });
    expect(collectCanonicalResultMathValues(d).map(r => r.path)).toContain('$.details[0].lines[0][0].operation.factor');
    expect(collectCanonicalResultMathValues(d)).toHaveLength(8);
    expect(validateCanonicalResultDocument({ ...d, primary: { ...d.primary, unit: 'turn' } }).ok).toBe(false);
  });

  it('retains compound answers and their dimension invariants', () => {
    const p = { kind: 'linear-map-profile' as const, presentation: { primaryLatex: 'A' }, operand: m('A'), domainDimension: 3, codomainDimension: 2, rank: 2, nullity: 1 };
    expect(buildCanonicalResultDocument(draft(p)).primary).toEqual(p);
    expect(validateCanonicalResultDocument({ version: 7, ...draft({ ...p, nullity: 2 }) }).ok).toBe(false);
    expect(buildCanonicalResultDocument(draft({ kind: 'period-phase', presentation: { primaryLatex: 'f' }, normalizedEquation: m('x'), period: m(2), phaseShift: m(1) })).primary?.kind).toBe('period-phase');
  });

  it('preserves typed named functions without custom MathJSON operators', () => {
    const d = buildCanonicalResultDocument(draft({ kind: 'special-function-expression', expression: {
      kind: 'named-function', name: 'EllipticF', arguments: [{ kind: 'standard-math', value: m('x') }, { kind: 'standard-math', value: m(['Rational', 1, 2]) }],
    } }));
    expect(collectCanonicalResultMathValues(d)).toHaveLength(2);
    expect(validateCanonicalResultDocument({ ...d, primary: { kind: 'special-function-expression', expression: { kind: 'named-function', name: 'constructor', arguments: [] } } }).ok).toBe(false);
  });

  it('retains typed special-function detail mathematics and checks every nested leaf', () => {
    const expression = { kind: 'named-function' as const, name: 'erfi' as const,
      arguments: [{ kind: 'standard-math' as const, value: m('x') }] };
    const d = buildCanonicalResultDocument({ ...draft({ kind: 'math', value: m(1) }),
      details: [{ title: 'Formula', lines: [[{ kind: 'special-function', expression }]] }],
      summaries: { solve: [[{ kind: 'special-function', expression }]] },
    });
    expect(requireCanonicalResultAuthority(structuredClone(d))).toEqual(d);
    expect(collectCanonicalResultMathValues(d).map(r => r.path)).toEqual([
      '$.primary.value', '$.details[0].lines[0][0].expression.arguments[0].value',
      '$.summaries.solve[0][0].expression.arguments[0].value',
    ]);
    for (const invalid of [{ ...expression, name: 'unregistered' },
      { ...expression, arguments: [{ kind: 'standard-math', value: { canonicalLatex: 'x' } }] }]) {
      expect(validateCanonicalResultDocument({ ...d,
        details: [{ title: 'Formula', lines: [[{ kind: 'special-function', expression: invalid }]] }],
      }).ok).toBe(false);
    }
  });

  it.each(Object.entries(equationFixtures))('retains Equation %s semantics and traverses every math leaf', (_, d) => {
    const checked = validateCanonicalResultDocument(d);
    expect(checked.ok, !checked.ok ? checked.failure.message : '').toBe(true);
    expect(collectCanonicalResultMathValues(d).length).toBeGreaterThan(0);
    expect(requireCanonicalResultAuthority(structuredClone(d))).toEqual(d);
  });

  it('preserves Equation failure distinctions and binding checks', () => {
    const d = structuredClone(equationFixtures.finite);
    const first = d.primary.roots[0];
    if (first && first.kind !== 'isolated-real-point') first.symbol = 'x';
    expect(validateCanonicalResultDocument(d).ok).toBe(false);
    for (const outcome of [{ kind: 'empty' }, { kind: 'undecided', reason: 'unknown' },
      { kind: 'incomplete', owner: 'unassigned', reason: 'pending' }, { kind: 'unsupported', reason: 'outside class' }, { kind: 'stopped', stop: 'work' }] as const) {
      const answer = outcome.kind === 'empty';
      expect(validateCanonicalResultDocument({ ...equationFixtures.finite, outcomeKind: answer ? 'success' : 'error',
        ...(answer ? {} : { error: 'No completed decision' }), primary: { ...equationFixtures.finite.primary, outcome,
          provenance: { verification: answer ? 'independent' : 'not-applicable', rules: [] } } }).ok).toBe(true);
    }
  });

  it('supports a rational answer with restrictions from canceled exponential families', () => {
    const d = buildCanonicalResultDocument({ ...draft({ kind: 'math', value: m(['Add', ['Power', 'x', 2], 'C']) }),
      integrationRestrictions: { variable: 'x', entries: [restriction(['Add', ['Exp', 'x'], ['Exp', ['Power', 'x', 2]]])] } });
    expect(collectCanonicalResultMathValues(d)).toHaveLength(2);
    expect(requireCanonicalResultAuthority(d).integrationRestrictions).toEqual(d.integrationRestrictions);
  });

  it('retains exact generator arguments, logarithm binders and norm conditions', () => {
    const term = rootTerm();
    const p = { ...exp(), terms: [term], restrictions: [{ kind: 'nonzero' as const, value: term.norm, origins: [{ category: 'log-norm' as const, path: 'terms[0].norm' }] }] };
    const d = buildCanonicalResultDocument(draft(p));
    expect(collectCanonicalResultMathValues(d)).toHaveLength(7);
    expect(d.primary).toEqual(p);
    expect(validateCanonicalResultDocument({ ...d, primary: { ...p, restrictions: [] } }).ok).toBe(false);
    for (const rootVariable of ['x', 't', 'C']) {
      expect(validateCanonicalResultDocument({ ...d, primary: { ...p, terms: [{ ...term, rootVariable }] } }).ok).toBe(false);
    }
    expect(validateCanonicalResultDocument({ ...d, primary: { ...p, construction: { ...p.construction, generator: 'C' } } }).ok).toBe(false);
  });

  it('preserves rational all-roots primitives and rejects unreduced or rational-in-root arguments', () => {
    const term = { rootVariable: 'a_1', modulus: m(['Add', ['Rational', 1, 4], ['Power', 'a_1', 2]]),
      weight: m('a_1'), argument: m(['Add', 'x', ['Multiply', 2, 'a_1']]), norm: m(['Add', 1, ['Power', 'x', 2]]) };
    const p = { kind: 'rational-antiderivative' as const, semantics: 'formal-local-complex' as const, variable: 'x', integrationConstant: 'C_1',
      rationalPart: m(0), terms: [term], restrictions: [restriction('x'), {...restriction(term.norm.mathJson), origins: [{category: 'log-norm' as const, path: 'log.0'}]}] };
    const d = buildCanonicalResultDocument(draft(p));
    expect(collectCanonicalResultMathValues(d)).toHaveLength(7);
    for (const argument of [m(['Divide', 1, 'a_1']), m(['Power', 'a_1', 2]), m(['Divide', 'a_1', 'x'])]) {
      expect(validateCanonicalResultDocument({ ...d, primary: { ...p, terms: [{ ...term, argument }] } }).ok).toBe(false);
    }
    expect(validateCanonicalResultDocument({ ...d, primary: { ...p, restrictions: [{...restriction(1), origins: [{category: 'log-norm', path: 'log.0'}]}] } }).ok).toBe(false);
    expect(validateCanonicalResultDocument({ ...d, primary: { ...p, terms: [term, term] } }).ok).toBe(false);
  });

  it('represents completed negatives distinctly and requires explicit consumer support', () => {
    const p = exp();
    const d = buildCanonicalResultDocument(draft({ kind: 'non-elementary', variable: 'x', subject: m(['Divide', 1, ['Add', 't', 'x']]),
      supportedClass: 'rational-in-one-rational-exponential', construction: p.construction, obstruction: 'nonconstant-residue', restrictions: [] }));
    expect(d.outcomeKind).toBe('success');
    expect(resolveCanonicalResultForConsumer(d, { math: a => a.value })).toEqual({ ok: false, reason: 'unsupported-answer-kind', kind: 'non-elementary' });
    expect(resolveCanonicalResultForConsumer(d, { 'non-elementary': a => a.obstruction })).toEqual({ ok: true, value: 'nonconstant-residue' });
    expect(validateCanonicalResultDocument({ ...d, primary: { ...d.primary, obstruction: 'resource-exhausted' } }).ok).toBe(false);
  });

  it('rejects hidden captures, nested exponentials and malformed provenance', () => {
    const p = exp(), d = { version: 7, ...draft(p) };
    for (const fieldPart of [m('a'), m(['Exp', 'x']), { ...m(1), canonicalLatex: '2' }]) {
      expect(validateCanonicalResultDocument({ ...d, primary: { ...p, fieldPart } }).ok).toBe(false);
    }
    for (const r of [restriction(['Exp', ['Exp', 'x']]), { ...restriction('x'), origins: [] }, restriction('C')]) {
      expect(validateCanonicalResultDocument({ ...d, primary: { ...p, restrictions: [r] } }).ok).toBe(false);
    }
  });

  it('does not trust previous checks or mutate supplied values', () => {
    const input = { version: 7 as const, ...draft(exp()) }, original = structuredClone(input);
    const d = requireCanonicalResultAuthority(input);
    expect(d).not.toBe(input);
    expect(input).toEqual(original);
    if (d.primary?.kind === 'exponential-antiderivative') d.primary.integrationConstant = 'x';
    expect(() => requireCanonicalResultAuthority(d)).toThrow();
    expect(requireCanonicalResultAuthority(input)).toEqual(original);
  });

  it('bounds the whole document before specialized traversal', () => {
    const d = { version: 7, ...draft(exp()) };
    for (const limits of [{ maxNodes: 5 }, { maxDepth: 2 }, { maxBytes: 20 }, { maxNodes: Infinity }, { maxDepth: NaN }]) {
      expect(validateCanonicalResultDocument(d, limits).ok).toBe(false);
    }
    const cyclic: Record<string, unknown> = { ...d }; cyclic.other = cyclic;
    expect(validateCanonicalResultDocument(cyclic)).toMatchObject({ ok: false, failure: { reason: 'cyclic-value' } });
  });
});
