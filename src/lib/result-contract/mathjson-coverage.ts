import type {
  CanonicalResultDocument,
} from '../../types/calculator';
import { goldenCases } from '../__golden__/golden-cases';
import { runGoldenCase } from '../__golden__/golden-execution';
import { executeHistoryReplayRequest } from '../history-replay/native-execution';
import { HISTORY_REPLAY_FIXTURES } from '../history-replay/fixtures';
import { resolveCanonicalResultForConsumer } from './consumer';
import type {
  CanonicalResultSemantics,
  NormalizedCanonicalResult,
} from './normalized-result';
import { normalizeCanonicalResultDocument } from './normalized-result';
import {
  MATHJSON_COVERAGE_EXEMPTIONS,
  MATHJSON_ROUTE_REGISTRY,
  mathJsonRouteForGoldenCase,
  type CanonicalMathLeafPath,
  type MathJsonRouteId,
} from './mathjson-route-registry';

type SemanticDetailLines = NonNullable<CanonicalResultSemantics['details']>[number]['lines'];

export type CanonicalMathLeafReference = {
  path: string;
  leafPath: CanonicalMathLeafPath;
  value: { canonicalLatex: string; mathJson?: unknown };
};

export type MathJsonCoverageRouteSummary = {
  evidence: number;
  replayFixtures: number;
  goldenCases: number;
  bytes: number;
  maxBytes: number;
  leaves: number;
  proven: number;
  exempt: number;
  missing: number;
};

export type MathJsonCoverageGap = {
  evidenceKind: 'replay-fixture' | 'golden-case';
  evidenceId: string;
  routeId: MathJsonRouteId;
  path: string;
  leafPath: CanonicalMathLeafPath;
  canonicalLatex: string;
};

export type MathJsonCoverageReport = {
  version: 2;
  evidenceCount: number;
  replayFixtureCount: number;
  goldenCaseCount: number;
  routeCount: number;
  exemptionIds: string[];
  totals: MathJsonCoverageRouteSummary;
  routes: Record<MathJsonRouteId, MathJsonCoverageRouteSummary>;
  gaps: MathJsonCoverageGap[];
};

function add(
  references: CanonicalMathLeafReference[],
  value: { canonicalLatex: string; mathJson?: unknown } | undefined,
  path: string,
  leafPath: CanonicalMathLeafPath,
) {
  if (value) references.push({ path, leafPath, value });
}

function addParts(
  references: CanonicalMathLeafReference[],
  parts: SemanticDetailLines | undefined,
  path: string,
  mathLeafPath: CanonicalMathLeafPath,
  operationLeafPath: CanonicalMathLeafPath,
) {
  parts?.forEach((line, lineIndex) => line.forEach((part, partIndex) => {
    if (part.kind === 'math') {
      add(references, part.math, `${path}[${lineIndex}][${partIndex}].math`, mathLeafPath);
    } else if (part.kind === 'row-operation' && 'factor' in part.operation) {
      add(
        references,
        part.operation.factor,
        `${path}[${lineIndex}][${partIndex}].operation.factor`,
        operationLeafPath,
      );
    }
  }));
}

export function collectCanonicalMathLeaves(
  input: CanonicalResultDocument | Pick<NormalizedCanonicalResult, 'sourceVersion' | 'semantics'>,
): CanonicalMathLeafReference[] {
  const result = 'semantics' in input ? input : normalizeCanonicalResultDocument(input);
  const { semantics } = result;
  const references: CanonicalMathLeafReference[] = [];
  const primary = semantics.primary;
  if (primary?.kind === 'math') {
    add(
      references,
      primary.value,
      result.sourceVersion === 1 ? 'primaryMath' : 'primary.value',
      result.sourceVersion === 1 ? 'primaryMath' : 'primary.value',
    );
  } else if (primary?.kind === 'period-phase') {
    add(references, primary.normalizedEquation, 'primary.normalizedEquation', 'primary.normalizedEquation');
    add(references, primary.period, 'primary.period', 'primary.period');
    add(references, primary.phaseShift, 'primary.phaseShift', 'primary.phaseShift');
  } else if (primary?.kind === 'linear-map-profile') {
    add(references, primary.operand, 'primary.operand', 'primary.operand');
  } else if (primary?.kind === 'linear-independence') {
    primary.operandVectors.forEach((value, index) => add(
      references, value, `primary.operandVectors[${index}]`, 'primary.operandVectors[*]',
    ));
  }

  const request = semantics.request;
  if (request?.kind === 'math') {
    add(references, request.value, 'request.value', 'request.value');
  } else if (request?.kind === 'derivative-at-point') {
    add(references, request.body, 'request.body', 'request.body');
    request.appliedVariablePath.forEach((value, index) => add(
      references, value, `request.appliedVariablePath[${index}]`, 'request.appliedVariablePath[*]',
    ));
    add(references, request.point, 'request.point', 'request.point');
  } else if (request?.kind === 'angle-conversion') {
    add(references, request.value, 'request.value', 'request.value');
  } else if (request?.kind === 'right-triangle') {
    request.knownQuantities.forEach((quantity, index) => add(
      references,
      quantity.value,
      `request.knownQuantities[${index}].value`,
      'request.knownQuantities[*].value',
    ));
  }

  semantics.answerRows?.rows.forEach((row, index) => add(
    references, row.math, `answerRows.rows[${index}].math`, 'answerRows.rows[*].math',
  ));
  add(references, semantics.branchReadback?.target, 'branchReadback.target', 'branchReadback.target');
  semantics.branchReadback?.branches.forEach((value, index) => add(
    references, value, `branchReadback.branches[${index}]`, 'branchReadback.branches[*]',
  ));
  semantics.systemReadback?.variables.forEach((value, index) => add(
    references, value, `systemReadback.variables[${index}]`, 'systemReadback.variables[*]',
  ));
  semantics.systemReadback?.rows.forEach((row, rowIndex) => row.values.forEach((value, valueIndex) => add(
    references,
    value,
    `systemReadback.rows[${rowIndex}].values[${valueIndex}]`,
    'systemReadback.rows[*].values[*]',
  )));

  const periodic = semantics.periodicFamily;
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

  semantics.supplements?.forEach((value, index) => add(
    references,
    value.math,
    result.sourceVersion === 1 ? `supplements[${index}]` : `supplements[${index}].math`,
    result.sourceVersion === 1 ? 'supplements[*]' : 'supplements[*].math',
  ));
  semantics.details?.forEach((section, sectionIndex) => addParts(
    references,
    section.lines,
    `details[${sectionIndex}].lines`,
    'details[*].lines[*][*].math',
    'details[*].lines[*][*].operation.factor',
  ));
  addParts(
    references,
    semantics.summaries?.solve,
    'summaries.solve',
    'summaries.solve[*][*].math',
    'summaries.solve[*][*].operation.factor',
  );
  add(references, semantics.summaries?.transform?.math, 'summaries.transform.math', 'summaries.transform.math');
  add(references, semantics.metadata?.resolvedInput, 'metadata.resolvedInput', 'metadata.resolvedInput');
  semantics.metadata?.variableSubstitutions?.forEach((value, index) => add(
    references, value.value, `metadata.variableSubstitutions[${index}].value`, 'metadata.variableSubstitutions[*].value',
  ));
  semantics.table?.rows.forEach((row, index) => {
    add(references, row.x, `table.rows[${index}].x`, 'table.rows[*].x');
    if (row.primary.kind !== 'undefined') {
      add(
        references,
        row.primary.value,
        result.sourceVersion === 1
          ? `table.rows[${index}].primary`
          : `table.rows[${index}].primary.value`,
        result.sourceVersion === 1
          ? 'table.rows[*].primary'
          : 'table.rows[*].primary.value',
      );
    }
    if (row.secondary && row.secondary.kind !== 'undefined') {
      add(
        references,
        row.secondary.value,
        result.sourceVersion === 1
          ? `table.rows[${index}].secondary`
          : `table.rows[${index}].secondary.value`,
        result.sourceVersion === 1
          ? 'table.rows[*].secondary'
          : 'table.rows[*].secondary.value',
      );
    }
  });
  return references;
}

function emptySummary(): MathJsonCoverageRouteSummary {
  return {
    evidence: 0,
    replayFixtures: 0,
    goldenCases: 0,
    bytes: 0,
    maxBytes: 0,
    leaves: 0,
    proven: 0,
    exempt: 0,
    missing: 0,
  };
}

function recordDocumentCoverage(input: {
  result: NormalizedCanonicalResult;
  evidenceKind: MathJsonCoverageGap['evidenceKind'];
  evidenceId: string;
  routeId: MathJsonRouteId;
  summary: MathJsonCoverageRouteSummary;
  gaps: MathJsonCoverageGap[];
}) {
  const leaves = collectCanonicalMathLeaves(input.result);
  const bytes = new TextEncoder().encode(JSON.stringify(input.result.rawDocument)).byteLength;
  input.summary.evidence += 1;
  if (input.evidenceKind === 'replay-fixture') input.summary.replayFixtures += 1;
  else input.summary.goldenCases += 1;
  input.summary.bytes += bytes;
  input.summary.maxBytes = Math.max(input.summary.maxBytes, bytes);
  input.summary.leaves += leaves.length;

  for (const leaf of leaves) {
    if (leaf.value.mathJson !== undefined) {
      input.summary.proven += 1;
      continue;
    }
    const exemption = MATHJSON_COVERAGE_EXEMPTIONS.find((candidate) =>
      candidate.routeId === input.routeId
      && candidate.leafPath === leaf.leafPath
      && candidate.fixtureId === input.evidenceId);
    if (exemption) {
      input.summary.exempt += 1;
    } else {
      input.summary.missing += 1;
      input.gaps.push({
        evidenceKind: input.evidenceKind,
        evidenceId: input.evidenceId,
        routeId: input.routeId,
        path: leaf.path,
        leafPath: leaf.leafPath,
        canonicalLatex: leaf.value.canonicalLatex,
      });
    }
  }
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
    recordDocumentCoverage({
      result: resolution,
      evidenceKind: 'replay-fixture',
      evidenceId: fixture.id,
      routeId,
      summary: routes[routeId],
      gaps,
    });
  }

  for (const goldenCase of goldenCases) {
    const routeId = mathJsonRouteForGoldenCase(goldenCase.id);
    if (!routeId) throw new Error(`Unregistered golden MathJSON case ${goldenCase.id}.`);
    const policy = MATHJSON_ROUTE_REGISTRY[routeId];
    if (!policy || policy.owner !== goldenCase.mode) {
      throw new Error(`Golden MathJSON case ${goldenCase.id} has mismatched route ownership.`);
    }
    const execution = await runGoldenCase(goldenCase);
    if (execution.outcome.kind === 'prompt') {
      throw new Error(`Golden MathJSON case ${goldenCase.id} produced a prompt instead of a canonical result.`);
    }
    const resolution = resolveCanonicalResultForConsumer(execution.outcome);
    if (!resolution.ok || resolution.source !== 'native') {
      throw new Error(`Golden MathJSON case ${goldenCase.id} did not resolve a native canonical result.`);
    }
    recordDocumentCoverage({
      result: resolution,
      evidenceKind: 'golden-case',
      evidenceId: goldenCase.id,
      routeId,
      summary: routes[routeId],
      gaps,
    });
  }

  const summaries = Object.values(routes);
  return {
    version: 2,
    evidenceCount: HISTORY_REPLAY_FIXTURES.length + goldenCases.length,
    replayFixtureCount: HISTORY_REPLAY_FIXTURES.length,
    goldenCaseCount: goldenCases.length,
    routeCount: routeIds.length,
    exemptionIds: MATHJSON_COVERAGE_EXEMPTIONS.map((entry) => entry.id).sort(),
    totals: {
      evidence: summaries.reduce((sum, entry) => sum + entry.evidence, 0),
      replayFixtures: summaries.reduce((sum, entry) => sum + entry.replayFixtures, 0),
      goldenCases: summaries.reduce((sum, entry) => sum + entry.goldenCases, 0),
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
      || left.evidenceKind.localeCompare(right.evidenceKind)
      || left.evidenceId.localeCompare(right.evidenceId)
      || left.path.localeCompare(right.path)),
  };
}
