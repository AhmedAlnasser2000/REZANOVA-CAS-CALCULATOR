import type {
  CanonicalMathValueV1,
  CanonicalResultDetailPartV1,
  CanonicalResultDocumentV1,
} from '../../types/calculator';
import { executeHistoryReplayRequest } from '../history-replay/native-execution';
import { HISTORY_REPLAY_FIXTURES } from '../history-replay/fixtures';
import { resolveCanonicalResultForConsumer } from './consumer';
import {
  MATHJSON_COVERAGE_EXEMPTIONS,
  MATHJSON_ROUTE_REGISTRY,
  type CanonicalMathLeafPath,
  type MathJsonRouteId,
} from './mathjson-route-registry';

export type CanonicalMathLeafReference = {
  path: string;
  leafPath: CanonicalMathLeafPath;
  value: CanonicalMathValueV1;
};

export type MathJsonCoverageRouteSummary = {
  fixtures: number;
  bytes: number;
  maxBytes: number;
  leaves: number;
  proven: number;
  exempt: number;
  missing: number;
};

export type MathJsonCoverageGap = {
  fixtureId: string;
  routeId: MathJsonRouteId;
  path: string;
  leafPath: CanonicalMathLeafPath;
  canonicalLatex: string;
};

export type MathJsonCoverageReport = {
  version: 1;
  fixtureCount: number;
  routeCount: number;
  exemptionIds: string[];
  totals: Omit<MathJsonCoverageRouteSummary, 'fixtures' | 'maxBytes'> & {
    fixtures: number;
    maxBytes: number;
  };
  routes: Record<MathJsonRouteId, MathJsonCoverageRouteSummary>;
  gaps: MathJsonCoverageGap[];
};

function add(
  references: CanonicalMathLeafReference[],
  value: CanonicalMathValueV1 | undefined,
  path: string,
  leafPath: CanonicalMathLeafPath,
) {
  if (value) references.push({ path, leafPath, value });
}

function addParts(
  references: CanonicalMathLeafReference[],
  parts: CanonicalResultDetailPartV1[][] | undefined,
  path: string,
  leafPath: CanonicalMathLeafPath,
) {
  parts?.forEach((line, lineIndex) => line.forEach((part, partIndex) => {
    if (part.kind === 'math') {
      add(references, part.math, `${path}[${lineIndex}][${partIndex}].math`, leafPath);
    }
  }));
}

export function collectCanonicalMathLeaves(
  document: CanonicalResultDocumentV1,
): CanonicalMathLeafReference[] {
  const references: CanonicalMathLeafReference[] = [];
  add(references, document.primaryMath, 'primaryMath', 'primaryMath');
  document.answerRows?.rows.forEach((row, index) => add(
    references, row.math, `answerRows.rows[${index}].math`, 'answerRows.rows[*].math',
  ));
  add(references, document.branchReadback?.target, 'branchReadback.target', 'branchReadback.target');
  document.branchReadback?.branches.forEach((value, index) => add(
    references, value, `branchReadback.branches[${index}]`, 'branchReadback.branches[*]',
  ));
  document.systemReadback?.variables.forEach((value, index) => add(
    references, value, `systemReadback.variables[${index}]`, 'systemReadback.variables[*]',
  ));
  document.systemReadback?.rows.forEach((row, rowIndex) => row.values.forEach((value, valueIndex) => add(
    references,
    value,
    `systemReadback.rows[${rowIndex}].values[${valueIndex}]`,
    'systemReadback.rows[*].values[*]',
  )));

  const periodic = document.periodicFamily;
  add(references, periodic?.carrier, 'periodicFamily.carrier', 'periodicFamily.carrier');
  add(references, periodic?.parameter, 'periodicFamily.parameter', 'periodicFamily.parameter');
  periodic?.parameterConstraints?.forEach((value, index) => add(
    references, value, `periodicFamily.parameterConstraints[${index}]`, 'periodicFamily.parameterConstraints[*]',
  ));
  periodic?.branches.forEach((value, index) => add(
    references, value, `periodicFamily.branches[${index}]`, 'periodicFamily.branches[*]',
  ));
  periodic?.discoveredFamilies?.forEach((value, index) => add(
    references, value, `periodicFamily.discoveredFamilies[${index}]`, 'periodicFamily.discoveredFamilies[*]',
  ));
  periodic?.representatives?.forEach((value, index) => add(
    references, value.exact, `periodicFamily.representatives[${index}].exact`, 'periodicFamily.representatives[*].exact',
  ));
  periodic?.suggestedIntervals?.forEach((value, index) => {
    add(references, value.start, `periodicFamily.suggestedIntervals[${index}].start`, 'periodicFamily.suggestedIntervals[*].start');
    add(references, value.end, `periodicFamily.suggestedIntervals[${index}].end`, 'periodicFamily.suggestedIntervals[*].end');
  });
  periodic?.piecewiseBranches?.forEach((value, index) => {
    add(references, value.condition, `periodicFamily.piecewiseBranches[${index}].condition`, 'periodicFamily.piecewiseBranches[*].condition');
    add(references, value.result, `periodicFamily.piecewiseBranches[${index}].result`, 'periodicFamily.piecewiseBranches[*].result');
  });
  add(references, periodic?.principalRange, 'periodicFamily.principalRange', 'periodicFamily.principalRange');
  add(references, periodic?.reducedCarrier, 'periodicFamily.reducedCarrier', 'periodicFamily.reducedCarrier');

  document.supplements?.forEach((value, index) => add(
    references, value, `supplements[${index}]`, 'supplements[*]',
  ));
  document.details?.forEach((section, sectionIndex) => addParts(
    references, section.lines, `details[${sectionIndex}].lines`, 'details[*].lines[*][*].math',
  ));
  addParts(references, document.summaries?.solve, 'summaries.solve', 'summaries.solve[*][*].math');
  add(references, document.summaries?.transform?.math, 'summaries.transform.math', 'summaries.transform.math');
  add(references, document.metadata?.resolvedInput, 'metadata.resolvedInput', 'metadata.resolvedInput');
  document.metadata?.variableSubstitutions?.forEach((value, index) => add(
    references, value.value, `metadata.variableSubstitutions[${index}].value`, 'metadata.variableSubstitutions[*].value',
  ));
  document.table?.rows.forEach((row, index) => {
    add(references, row.x, `table.rows[${index}].x`, 'table.rows[*].x');
    add(references, row.primary, `table.rows[${index}].primary`, 'table.rows[*].primary');
    add(references, row.secondary, `table.rows[${index}].secondary`, 'table.rows[*].secondary');
  });
  return references;
}

function emptySummary(): MathJsonCoverageRouteSummary {
  return { fixtures: 0, bytes: 0, maxBytes: 0, leaves: 0, proven: 0, exempt: 0, missing: 0 };
}

export async function buildMathJsonCoverageReport(): Promise<MathJsonCoverageReport> {
  const routeIds = Object.keys(MATHJSON_ROUTE_REGISTRY).sort() as MathJsonRouteId[];
  const routes = Object.fromEntries(routeIds.map((routeId) => [routeId, emptySummary()])) as Record<
    MathJsonRouteId,
    MathJsonCoverageRouteSummary
  >;
  const gaps: MathJsonCoverageGap[] = [];

  for (const fixture of HISTORY_REPLAY_FIXTURES) {
    const routeId = `${fixture.workspace}.${fixture.family}` as MathJsonRouteId;
    const policy = MATHJSON_ROUTE_REGISTRY[routeId];
    if (!policy) throw new Error(`Unregistered MathJSON route ${routeId} for ${fixture.id}.`);
    const execution = await executeHistoryReplayRequest(fixture.workspace, fixture.request);
    if (execution.outcome.kind === 'prompt') {
      throw new Error(`MathJSON probe ${fixture.id} produced a prompt instead of a canonical result.`);
    }
    const resolution = resolveCanonicalResultForConsumer(execution.outcome);
    if (!resolution.ok || resolution.source !== 'native') {
      throw new Error(`MathJSON probe ${fixture.id} did not resolve a native canonical result.`);
    }
    const document = resolution.document;
    const leaves = collectCanonicalMathLeaves(document);
    const bytes = new TextEncoder().encode(JSON.stringify(document)).byteLength;
    const summary = routes[routeId];
    summary.fixtures += 1;
    summary.bytes += bytes;
    summary.maxBytes = Math.max(summary.maxBytes, bytes);
    summary.leaves += leaves.length;

    for (const leaf of leaves) {
      if (leaf.value.mathJson !== undefined) {
        summary.proven += 1;
        continue;
      }
      const exemption = MATHJSON_COVERAGE_EXEMPTIONS.find((candidate) =>
        candidate.routeId === routeId
        && candidate.leafPath === leaf.leafPath
        && candidate.fixtureId === fixture.id);
      if (exemption) {
        summary.exempt += 1;
      } else {
        summary.missing += 1;
        gaps.push({
          fixtureId: fixture.id,
          routeId,
          path: leaf.path,
          leafPath: leaf.leafPath,
          canonicalLatex: leaf.value.canonicalLatex,
        });
      }
    }
  }

  const summaries = Object.values(routes);
  return {
    version: 1,
    fixtureCount: HISTORY_REPLAY_FIXTURES.length,
    routeCount: routeIds.length,
    exemptionIds: MATHJSON_COVERAGE_EXEMPTIONS.map((entry) => entry.id).sort(),
    totals: {
      fixtures: summaries.reduce((sum, entry) => sum + entry.fixtures, 0),
      bytes: summaries.reduce((sum, entry) => sum + entry.bytes, 0),
      maxBytes: Math.max(...summaries.map((entry) => entry.maxBytes)),
      leaves: summaries.reduce((sum, entry) => sum + entry.leaves, 0),
      proven: summaries.reduce((sum, entry) => sum + entry.proven, 0),
      exempt: summaries.reduce((sum, entry) => sum + entry.exempt, 0),
      missing: summaries.reduce((sum, entry) => sum + entry.missing, 0),
    },
    routes,
    gaps: gaps.sort((left, right) =>
      left.routeId.localeCompare(right.routeId)
      || left.fixtureId.localeCompare(right.fixtureId)
      || left.path.localeCompare(right.path)),
  };
}
