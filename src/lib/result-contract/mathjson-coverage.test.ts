import { describe, expect, it } from 'vitest';
import type { CanonicalResultDocumentV1 } from '../../types/calculator';
import { HISTORY_REPLAY_FIXTURES } from '../history-replay/fixtures';
import {
  buildMathJsonCoverageReport,
  collectCanonicalMathLeaves,
  type MathJsonCoverageReport,
} from './mathjson-coverage';
import {
  createMathJsonCoverageBaseline,
  validateMathJsonCoverageBaseline,
} from './mathjson-coverage-ratchet';
import {
  CANONICAL_MATH_LEAF_PATHS,
  MATHJSON_COVERAGE_EXEMPTIONS,
  MATHJSON_ROUTE_REGISTRY,
} from './mathjson-route-registry';

const math = (canonicalLatex: string) => ({ canonicalLatex });

function completeDocument(): CanonicalResultDocumentV1 {
  return {
    version: 1,
    outcomeKind: 'success',
    title: 'Complete',
    primaryMath: math('p'),
    answerRows: { rows: [{ math: math('a') }] },
    branchReadback: { target: math('t'), relation: '=', branches: [math('b')] },
    systemReadback: { variables: [math('x')], rows: [{ values: [math('1')] }] },
    periodicFamily: {
      carrier: math('c'),
      parameter: math('n'),
      parameterConstraints: [math('n\\in\\mathbb{Z}')],
      branches: [math('x=2n')],
      discoveredFamilies: [math('x=2n+1')],
      representatives: [{ label: 'r', exact: math('0') }],
      suggestedIntervals: [{ label: 'i', start: math('-1'), end: math('1') }],
      piecewiseBranches: [{ condition: math('x>0'), result: math('x') }],
      principalRange: math('[-1,1]'),
      reducedCarrier: math('sin(x)'),
    },
    supplements: [math('s')],
    details: [{ title: 'D', lines: [[{ kind: 'math', math: math('d') }]] }],
    summaries: {
      solve: [[{ kind: 'math', math: math('q') }]],
      transform: { math: math('u') },
    },
    metadata: {
      resolvedInput: math('r'),
      variableSubstitutions: [{ name: 'k', value: math('2'), numericValue: 2 }],
    },
    table: { headers: ['x', 'f(x)'], rows: [{ x: math('0'), primary: math('1'), secondary: math('2') }] },
    warnings: [],
  };
}

describe('MathJSON coverage registry', () => {
  it('enumerates every canonical math leaf path exactly once', () => {
    const paths = collectCanonicalMathLeaves(completeDocument()).map((entry) => entry.leafPath);
    expect([...new Set(paths)].sort()).toEqual([...CANONICAL_MATH_LEAF_PATHS].sort());
  });

  it('has exact route-family parity and native executable probes', () => {
    const fixtureRouteIds = [...new Set(HISTORY_REPLAY_FIXTURES.map(
      (fixture) => `${fixture.workspace}.${fixture.family}`,
    ))].sort();
    expect(Object.keys(MATHJSON_ROUTE_REGISTRY).sort()).toEqual(fixtureRouteIds);
    const fixtureById = new Map(HISTORY_REPLAY_FIXTURES.map((fixture) => [fixture.id, fixture]));
    for (const [routeId, policy] of Object.entries(MATHJSON_ROUTE_REGISTRY)) {
      expect(policy.probeFixtureIds.length, routeId).toBeGreaterThan(0);
      for (const fixtureId of policy.probeFixtureIds) {
        const fixture = fixtureById.get(fixtureId);
        expect(fixture, fixtureId).toBeDefined();
        expect(`${fixture?.workspace}.${fixture?.family}`).toBe(routeId);
        expect(policy.owner).toBe(fixture?.workspace);
      }
    }
  });

  it('executes all 100 native probes and reports current debt without exemptions', async () => {
    const report = await buildMathJsonCoverageReport();
    expect(report.fixtureCount).toBe(100);
    expect(report.routeCount).toBe(Object.keys(MATHJSON_ROUTE_REGISTRY).length);
    expect(report.totals.leaves).toBeGreaterThan(0);
    expect(report.totals.proven).toBeGreaterThan(0);
    expect(report.totals.missing).toBe(report.gaps.length);
    expect(report.exemptionIds).toEqual(MATHJSON_COVERAGE_EXEMPTIONS.map((entry) => entry.id));
  }, 30_000);

  it('rejects debt, coverage, payload, route, and exemption regressions', () => {
    const report: MathJsonCoverageReport = {
      version: 1 as const,
      fixtureCount: 1,
      routeCount: 1,
      exemptionIds: [],
      totals: { fixtures: 1, bytes: 10, maxBytes: 10, leaves: 1, proven: 0, exempt: 0, missing: 1 },
      routes: {
        'calculate.arithmetic': {
          fixtures: 1, bytes: 10, maxBytes: 10, leaves: 1, proven: 0, exempt: 0, missing: 1,
        },
      } as MathJsonCoverageReport['routes'],
      gaps: [],
    };
    const baseline = createMathJsonCoverageBaseline(report, 'initial');
    const regressed = structuredClone(report);
    regressed.routes['calculate.arithmetic'].fixtures = 2;
    regressed.routes['calculate.arithmetic'].leaves = 2;
    regressed.routes['calculate.arithmetic'].missing = 2;
    regressed.routes['calculate.arithmetic'].maxBytes = 11;
    regressed.exemptionIds = ['new-exemption'];
    const validation = validateMathJsonCoverageBaseline(regressed, baseline);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join('\n')).toMatch(/fixture count|leaf count|missing MathJSON|payload|exemption/u);
  });
});
