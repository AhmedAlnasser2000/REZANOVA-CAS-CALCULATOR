import { describe, expect, it } from 'vitest';
import coverageBaseline from '../../../tools/mathjson-coverage-baseline.json';
import type { CanonicalResultDocumentV1 } from '../../types/calculator';
import { goldenCases } from '../__golden__/golden-cases';
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
  GOLDEN_CASE_ROUTE_REGISTRY,
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
    const replayRouteIds = HISTORY_REPLAY_FIXTURES.map(
      (fixture) => `${fixture.workspace}.${fixture.family}`,
    );
    const goldenRouteIds = Object.values(GOLDEN_CASE_ROUTE_REGISTRY);
    const evidenceRouteIds = [...new Set([...replayRouteIds, ...goldenRouteIds])].sort();
    expect(Object.keys(MATHJSON_ROUTE_REGISTRY).sort()).toEqual(evidenceRouteIds);
    const fixtureById = new Map(HISTORY_REPLAY_FIXTURES.map((fixture) => [fixture.id, fixture]));
    for (const [routeId, policy] of Object.entries(MATHJSON_ROUTE_REGISTRY)) {
      const routeGoldenCases = Object.entries(GOLDEN_CASE_ROUTE_REGISTRY)
        .filter(([, goldenRouteId]) => goldenRouteId === routeId);
      expect(policy.replayFixtureIds.length + routeGoldenCases.length, routeId).toBeGreaterThan(0);
      for (const fixtureId of policy.replayFixtureIds) {
        const fixture = fixtureById.get(fixtureId);
        expect(fixture, fixtureId).toBeDefined();
        expect(`${fixture?.workspace}.${fixture?.family}`).toBe(routeId);
        expect(policy.owner).toBe(fixture?.workspace);
      }
    }
    expect(Object.keys(GOLDEN_CASE_ROUTE_REGISTRY).sort()).toEqual(
      goldenCases.map((goldenCase) => goldenCase.id).sort(),
    );
    const goldenCaseById = new Map(goldenCases.map((goldenCase) => [goldenCase.id, goldenCase]));
    for (const [goldenCaseId, routeId] of Object.entries(GOLDEN_CASE_ROUTE_REGISTRY)) {
      const goldenCase = goldenCaseById.get(goldenCaseId);
      expect(goldenCase, goldenCaseId).toBeDefined();
      expect(MATHJSON_ROUTE_REGISTRY[routeId].owner).toBe(goldenCase?.mode);
    }
  });

  it('executes all replay and golden native probes and reports classified coverage', async () => {
    const report = await buildMathJsonCoverageReport();
    expect(report.replayFixtureCount).toBe(100);
    expect(report.goldenCaseCount).toBe(43);
    expect(report.evidenceCount).toBe(143);
    expect(report.routeCount).toBe(Object.keys(MATHJSON_ROUTE_REGISTRY).length);
    expect(report.totals.leaves).toBeGreaterThan(0);
    expect(report.totals.proven).toBeGreaterThan(0);
    expect(report.totals.missing).toBe(report.gaps.length);
    expect(report.exemptionIds).toEqual(
      MATHJSON_COVERAGE_EXEMPTIONS.map((entry) => entry.id).sort(),
    );
    const baseline = coverageBaseline as Parameters<typeof validateMathJsonCoverageBaseline>[1];
    expect(validateMathJsonCoverageBaseline(report, baseline).errors).toEqual([]);
  }, 120_000);

  it('rejects debt, coverage, payload, route, and exemption regressions', () => {
    const report: MathJsonCoverageReport = {
      version: 2 as const,
      evidenceCount: 1,
      replayFixtureCount: 1,
      goldenCaseCount: 0,
      routeCount: 1,
      exemptionIds: [],
      totals: {
        evidence: 1,
        replayFixtures: 1,
        goldenCases: 0,
        bytes: 10,
        maxBytes: 10,
        leaves: 1,
        proven: 0,
        exempt: 0,
        missing: 1,
      },
      routes: {
        'calculate.arithmetic': {
          evidence: 1,
          replayFixtures: 1,
          goldenCases: 0,
          bytes: 10,
          maxBytes: 10,
          leaves: 1,
          proven: 0,
          exempt: 0,
          missing: 1,
        },
      } as MathJsonCoverageReport['routes'],
      gaps: [],
    };
    const baseline = createMathJsonCoverageBaseline(report, 'initial');
    const regressed = structuredClone(report);
    regressed.routes['calculate.arithmetic'].evidence = 2;
    regressed.routes['calculate.arithmetic'].replayFixtures = 2;
    regressed.routes['calculate.arithmetic'].leaves = 2;
    regressed.routes['calculate.arithmetic'].missing = 2;
    regressed.routes['calculate.arithmetic'].maxBytes = 11;
    regressed.exemptionIds = ['new-exemption'];
    const validation = validateMathJsonCoverageBaseline(regressed, baseline);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join('\n')).toMatch(/evidence count|fixture count|leaf count|missing MathJSON|payload|exemption/u);
  });
});
