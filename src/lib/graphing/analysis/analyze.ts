import {
  createGraphExpressionEvaluator,
  GraphExpressionPlanCache,
} from '../evaluator';
import {
  createComplexNumericEvaluator,
  findComplexNewtonCandidates,
} from '../../equation/complex-domain-public';
import type {
  GraphAnalysisEvidenceV1,
  GraphAnalysisFeature,
  GraphAnalysisRequestV1,
  GraphAnalysisResultV1,
  GraphClassifiedItemSnapshotV2,
  GraphExpressionIR,
  GraphFeatureValueV1,
  GraphRelationIR,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import { graphComplexBranchGeometry } from '../sampling/complex-branch-geometry';
import { solveGraphComplexRoots } from '../sampling/complex-roots';
import { buildGraphAnalysisCanonicalResult, graphAnalysisExactValue } from './result-document';
import { defaultPtxSolverPort, ptxPlaneIntersections, ptxRealExtrema, ptxRealIntersections, ptxRealRoots } from '../ptx';
import type { PtxPlaneFunction } from '../ptx';
import { analyzeGraphPiecewise } from './piecewise-analysis';

export type GraphAnalysisControl = {
  isCancelled?: () => boolean;
  now?: () => number;
  yieldBetweenItems?: () => Promise<void>;
};

type Polynomial = [number, number, number];
type Evaluator = (x: number) => number | undefined;
type SurfaceEvaluator = (x: number, y: number) => number | undefined;

function complexPoint(value: { re: number; im: number }, error?: number) {
  return {
    x: error === undefined ? exact(value.re) : approximate(value.re, error),
    y: error === undefined ? exact(value.im) : approximate(value.im, error),
  };
}

function complexPoleExpression(node: unknown) {
  if (!Array.isArray(node) || typeof node[0] !== 'string') return undefined;
  if (node[0] === 'Divide' && node.length === 3) return node[2];
  if (node[0] === 'Power' && typeof node[2] === 'number' && node[2] < 0) return node[1];
  return undefined;
}

/**
 * Solutions of an equation in z, from the same solver that draws the root
 * points. Exact roots are proved (their exact form is in the method), numeric
 * ones validated by residual; only polynomials claim a complete list.
 */
function analyzeComplexRoots(
  request: GraphAnalysisRequestV1,
  itemId: string,
  relation: Extract<GraphRelationIR, { kind: 'complex-roots' }>,
  serial: () => number,
) {
  const viewport = request.numericWindow ?? { coordinateSystem: 'cartesian' as const, xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const solution = solveGraphComplexRoots({ left: relation.left, right: relation.right,
    parameters: request.parameterEnvironment, viewport });
  const findings = solution.roots.map((root) => evidence(request, 'complex-zero', [itemId],
    root.exact ? 'exact-proved' : 'numeric-validated', serial(), {
      coordinates: complexPoint(root, root.exact ? 1e-12 : 1e-9),
      basis: root.exact
        ? { source: 'graph-symbolic', validator: `exact root ${root.label ?? ''}${root.multiplicity > 1 ? ` (multiplicity ${root.multiplicity})` : ''}`.trim() }
        : { source: 'numeric-validator', validator: solution.complete ? 'polynomial root, Aberth iteration' : 'complex Newton search in view' },
    }));
  if (!solution.complete) {
    findings.push(evidence(request, 'complex-zero', [itemId], 'inconclusive', serial(), {
      basis: { source: 'numeric-validator', validator: 'roots found in the visible region only' },
      stopReason: { code: 'analysis-inconclusive', detailCode: 'bounded-complex-search-does-not-prove-global-completeness' },
    }));
  }
  return findings;
}

function exactZeroAtOrigin(node: unknown): boolean {
  if (node === 'z') return true;
  if (!Array.isArray(node) || typeof node[0] !== 'string') return false;
  if (node[0] === 'Power' && node[1] === 'z' && typeof node[2] === 'number' && node[2] > 0) return true;
  return node[0] === 'Multiply' && node.slice(1).some(exactZeroAtOrigin);
}


function analyzeComplexMapping(input: {
  request: GraphAnalysisRequestV1;
  item: Extract<GraphClassifiedItemSnapshotV2, { kind: 'relation' }>;
  relation: Extract<GraphRelationIR, { kind: 'complex-mapping' }>;
  requested: Set<GraphAnalysisFeature>;
  serial: () => number;
  onEvaluations: (count: number) => void;
}) {
  const findings: GraphAnalysisEvidenceV1[] = [];
  const region = input.request.complexSearchRegion ?? {
    reMin: input.request.numericWindow?.xMin ?? -10, reMax: input.request.numericWindow?.xMax ?? 10,
    imMin: input.request.numericWindow?.yMin ?? -10, imMax: input.request.numericWindow?.yMax ?? 10,
  };
  const expression = input.relation.expression.mathJson;
  const evaluator = createComplexNumericEvaluator({ expressionMathJson: expression, target: 'z',
    parameters: input.request.parameterEnvironment });
  if (input.requested.has('complex-zero')) {
    const originIsExact = exactZeroAtOrigin(expression) && region.reMin <= 0 && region.reMax >= 0
      && region.imMin <= 0 && region.imMax >= 0;
    if (originIsExact) findings.push(evidence(input.request, 'complex-zero', [input.item.itemId], 'exact-proved', input.serial(), {
      coordinates: complexPoint({ re: 0, im: 0 }), relationValue: exact(0),
      basis: { source: 'graph-symbolic', validator: 'structured zero factor identity' },
    }));
    const roots = findComplexNewtonCandidates({ evaluator, region, gridSize: 7, lowDiscrepancySeedCount: 8 });
    input.onEvaluations(roots.diagnostics.totalEvaluations);
    for (const candidate of roots.candidates) {
      if (originIsExact && Math.hypot(candidate.value.re, candidate.value.im) < 1e-7) continue;
      findings.push(evidence(input.request, 'complex-zero', [input.item.itemId], 'numeric-validated', input.serial(), {
        coordinates: complexPoint(candidate.value, Math.max(1e-10, candidate.residualNorm)),
        relationValue: approximate(0, candidate.residualNorm),
        basis: { source: 'numeric-validator', validator: `bounded complex Newton search in [${region.reMin}, ${region.reMax}] × [${region.imMin}, ${region.imMax}]`, residualBound: candidate.residualNorm },
      }));
    }
    findings.push(evidence(input.request, 'complex-zero', [input.item.itemId], 'inconclusive', input.serial(), {
      basis: { source: 'numeric-validator', validator: `bounded search region [${region.reMin}, ${region.reMax}] × [${region.imMin}, ${region.imMax}]` },
      stopReason: { code: 'analysis-inconclusive', detailCode: 'bounded-complex-search-does-not-prove-global-completeness' },
    }));
  }
  const poleExpression = complexPoleExpression(expression);
  if (input.requested.has('complex-pole')) {
    if (poleExpression === 'z' && region.reMin <= 0 && region.reMax >= 0 && region.imMin <= 0 && region.imMax >= 0) {
      findings.push(evidence(input.request, 'complex-pole', [input.item.itemId], 'exact-proved', input.serial(), {
        coordinates: complexPoint({ re: 0, im: 0 }),
        basis: { source: 'graph-symbolic', validator: 'structured denominator or negative-power exclusion' },
      }));
    } else if (poleExpression !== undefined) {
      const poleEvaluator = createComplexNumericEvaluator({ expressionMathJson: poleExpression, target: 'z',
        parameters: input.request.parameterEnvironment });
      const poles = findComplexNewtonCandidates({ evaluator: poleEvaluator, region, gridSize: 7, lowDiscrepancySeedCount: 8 });
      input.onEvaluations(poles.diagnostics.totalEvaluations);
      for (const candidate of poles.candidates) findings.push(evidence(
        input.request, 'complex-pole', [input.item.itemId], 'numeric-validated', input.serial(), {
          coordinates: complexPoint(candidate.value, Math.max(1e-10, candidate.residualNorm)),
          basis: { source: 'numeric-validator', validator: 'bounded denominator-zero search', residualBound: candidate.residualNorm },
        },
      ));
    }
  }
  if (input.requested.has('branch-point')) {
    // Points are proved only when the multivalued operator's argument is
    // affine in z; other arguments stay explicitly inconclusive.
    const branches = graphComplexBranchGeometry(expression, 'z', input.request.parameterEnvironment);
    for (const { family, z: point } of branches.points) {
      if (point.re < region.reMin || point.re > region.reMax || point.im < region.imMin || point.im > region.imMax) continue;
      findings.push(evidence(input.request, 'branch-point', [input.item.itemId], 'exact-proved', input.serial(), {
        coordinates: complexPoint(point),
        basis: { source: 'reviewed-public-fact', validator: `${family} of an affine argument` },
      }));
    }
    if (branches.unresolvedOperators.length > 0) {
      findings.push(evidence(input.request, 'branch-point', [input.item.itemId], 'inconclusive', input.serial(), {
        basis: { source: 'graph-symbolic', validator: `branch geometry of ${[...new Set(branches.unresolvedOperators)].join(', ')} with a non-affine argument` },
        stopReason: { code: 'analysis-inconclusive', detailCode: 'branch-geometry-non-affine-argument' },
      }));
    }
  }
  return findings;
}

function add(a: Polynomial, b: Polynomial): Polynomial {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a: Polynomial, factor: number): Polynomial {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}
function multiply(a: Polynomial, b: Polynomial): Polynomial | undefined {
  if ((a[2] !== 0 && (b[1] !== 0 || b[2] !== 0)) || (b[2] !== 0 && a[1] !== 0)) return undefined;
  return [a[0] * b[0], a[0] * b[1] + a[1] * b[0], a[0] * b[2] + a[1] * b[1] + a[2] * b[0]];
}
function polynomial(node: unknown): Polynomial | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) return [node, 0, 0];
  if (node === 'x') return [0, 1, 0];
  if (!Array.isArray(node) || typeof node[0] !== 'string') return undefined;
  const operands = node.slice(1);
  if (node[0] === 'Negate' && operands.length === 1) {
    const value = polynomial(operands[0]);
    return value && scale(value, -1);
  }
  if (node[0] === 'Add') {
    let value: Polynomial = [0, 0, 0];
    for (const operand of operands) {
      const term = polynomial(operand);
      if (!term) return undefined;
      value = add(value, term);
    }
    return value;
  }
  if (node[0] === 'Multiply') {
    let value: Polynomial = [1, 0, 0];
    for (const operand of operands) {
      const factor = polynomial(operand);
      if (!factor) return undefined;
      const next = multiply(value, factor);
      if (!next) return undefined;
      value = next;
    }
    return value;
  }
  if (node[0] === 'Power' && operands[0] === 'x' && operands[1] === 2) return [0, 0, 1];
  return undefined;
}

function polynomialRoots([c, b, a]: Polynomial) {
  if (a === 0) return b === 0 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  if (discriminant === 0) return [-b / (2 * a)];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

function approximate(value: number, errorBound?: number): GraphFeatureValueV1 {
  return { kind: 'approximate', value, ...(errorBound === undefined ? {} : { errorBound }) };
}
function exact(value: number): GraphFeatureValueV1 {
  return { kind: 'exact', value: graphAnalysisExactValue(value) };
}

function evidence(
  request: GraphAnalysisRequestV1,
  feature: GraphAnalysisFeature,
  itemIds: string[],
  level: GraphAnalysisEvidenceV1['level'],
  serial: number,
  extra: Partial<GraphAnalysisEvidenceV1> = {},
): GraphAnalysisEvidenceV1 {
  return {
    version: 1,
    evidenceId: `${request.requestId}.${feature}.${serial}`,
    documentId: request.documentId,
    revisions: { ...request.revisions },
    itemIds,
    feature,
    level,
    conditions: [],
    basis: { source: level === 'exact-proved' ? 'graph-symbolic' : 'numeric-validator' },
    ...extra,
  };
}

function evaluatorFor(
  expression: GraphExpressionIR,
  item: GraphClassifiedItemSnapshotV2,
  environment: Record<string, number>,
  cache: GraphExpressionPlanCache,
): Evaluator | undefined {
  const compiled = cache.getOrCompile({
    planId: `graph-analysis.${item.itemId}`,
    sourceRevision: item.kind === 'relation' || item.kind === 'piecewise' || item.kind === 'point-set'
      ? item.source.sourceRevision : 0,
    expression,
  });
  if (!compiled.ok) return undefined;
  const runner = createGraphExpressionEvaluator(compiled.plan);
  return (x) => {
    const result = runner.evaluate({ ...environment, x });
    return result.status === 'finite' ? result.value : undefined;
  };
}

/** A one-equation locus as a real function of (Re z, Im z); inequalities and chains have no single curve. */
function locusCurve(relation: Extract<GraphRelationIR, { kind: 'complex-locus' }>, parameters: Record<string, number>): PtxPlaneFunction | null {
  const [clause] = relation.clauses;
  if (relation.clauses.length !== 1 || clause!.operator !== '=') return null;
  const f = defaultPtxSolverPort().complexFunction(['Add', clause!.left.mathJson, ['Negate', clause!.right.mathJson]], parameters);
  if (!f) return null;
  return (x, y) => {
    const value = f({ re: x, im: y });
    return value && Math.abs(value.im) <= 1e-9 * Math.max(1, Math.abs(value.re)) ? value.re : undefined;
  };
}

function relationExpression(relation: GraphRelationIR) {
  return relation.kind === 'explicit-y' ? relation.rhs : undefined;
}

function surfaceEvaluatorFor(
  relation: Extract<GraphRelationIR, { kind: 'real-surface' }>,
  item: Extract<GraphClassifiedItemSnapshotV2, { kind: 'relation' }>,
  environment: Record<string, number>,
  cache: GraphExpressionPlanCache,
): SurfaceEvaluator | undefined {
  const compiled = cache.getOrCompile({
    planId: `graph-analysis.${item.itemId}.surface`, sourceRevision: item.source.sourceRevision,
    expression: relation.z,
  });
  if (!compiled.ok) return undefined;
  const runner = createGraphExpressionEvaluator(compiled.plan);
  return (x, y) => {
    const result = runner.evaluate({ ...environment, x, y });
    return result.status === 'finite' ? result.value : undefined;
  };
}

function analyzeSurface(input: {
  request: GraphAnalysisRequestV1;
  item: Extract<GraphClassifiedItemSnapshotV2, { kind: 'relation' }>;
  run: SurfaceEvaluator;
  window: GraphViewportV1;
  requested: Set<GraphAnalysisFeature>;
  serial: () => number;
  onEvaluation: () => void;
}) {
  const findings: GraphAnalysisEvidenceV1[] = [];
  const bounds = input.item.relation.kind === 'real-surface' && input.item.relation.bounds
    ? input.item.relation.bounds : input.window;
  const steps = 28;
  const dx = (bounds.xMax - bounds.xMin) / steps;
  const dy = (bounds.yMax - bounds.yMin) / steps;
  const values: Array<Array<number | undefined>> = [];
  for (let row = 0; row <= steps; row += 1) {
    const line: Array<number | undefined> = [];
    for (let column = 0; column <= steps; column += 1) {
      line.push(input.run(bounds.xMin + column * dx, bounds.yMin + row * dy)); input.onEvaluation();
    }
    values.push(line);
  }
  let boundaryCount = 0; let contourCount = 0; let stationaryCount = 0;
  for (let row = 1; row < steps; row += 1) for (let column = 1; column < steps; column += 1) {
    const z = values[row]![column];
    const neighbors = [values[row]![column - 1], values[row]![column + 1], values[row - 1]![column], values[row + 1]![column]];
    const x = bounds.xMin + column * dx; const y = bounds.yMin + row * dy;
    if (z === undefined) {
      if (input.requested.has('domain-boundary') && boundaryCount < 12 && neighbors.some((value) => value !== undefined)) {
        findings.push(evidence(input.request, 'domain-boundary', [input.item.itemId], 'sampled-estimate', input.serial(), {
          coordinates: { x: approximate(x, dx), y: approximate(y, dy) },
          basis: { source: 'sampler', validator: 'finite/non-finite surface cell boundary' },
        })); boundaryCount += 1;
      }
      continue;
    }
    if (input.requested.has('level-contour') && contourCount < 16
      && neighbors.some((value) => value !== undefined && (value < 0) !== (z < 0))) {
      findings.push(evidence(input.request, 'level-contour', [input.item.itemId], 'numeric-validated', input.serial(), {
        coordinates: { x: approximate(x, dx), y: approximate(y, dy), z: approximate(0, Math.abs(z)) },
        relationValue: approximate(0, Math.abs(z)),
        basis: { source: 'numeric-validator', validator: 'z=0 sign-change cell', residualBound: Math.abs(z) },
      })); contourCount += 1;
    }
    if ((!input.requested.has('stationary-point') && !input.requested.has('local-extremum')) || stationaryCount >= 10
      || neighbors.some((value) => value === undefined)) continue;
    const numericNeighbors = neighbors as [number, number, number, number];
    const [left, right, down, up] = numericNeighbors;
    const gx = (right - left) / (2 * dx); const gy = (up - down) / (2 * dy);
    const gradientBound = Math.hypot(gx, gy);
    const scale = Math.max(1, Math.abs(z));
    if (gradientBound > 0.04 * scale / Math.max(dx, dy)) continue;
    const localMinimum = numericNeighbors.every((value) => value >= z);
    const localMaximum = numericNeighbors.every((value) => value <= z);
    if (input.requested.has('stationary-point')) findings.push(evidence(
      input.request, 'stationary-point', [input.item.itemId], 'numeric-validated', input.serial(), {
        coordinates: { x: approximate(x, dx / 2), y: approximate(y, dy / 2), z: approximate(z, gradientBound * Math.max(dx, dy)) },
        basis: { source: 'numeric-validator', validator: 'central-difference gradient', residualBound: gradientBound },
      },
    ));
    if (input.requested.has('local-extremum') && (localMinimum || localMaximum)) findings.push(evidence(
      input.request, 'local-extremum', [input.item.itemId], 'numeric-validated', input.serial(), {
        coordinates: { x: approximate(x, dx / 2), y: approximate(y, dy / 2), z: approximate(z, gradientBound * Math.max(dx, dy)) },
        basis: { source: 'numeric-validator', validator: localMinimum ? 'local grid minimum' : 'local grid maximum', residualBound: gradientBound },
      },
    ));
    stationaryCount += 1;
  }
  return findings;
}

export async function runGraphAnalysisRequest(
  request: GraphAnalysisRequestV1,
  cache = new GraphExpressionPlanCache(100),
  control: GraphAnalysisControl = {},
): Promise<GraphAnalysisResultV1> {
  const now = control.now ?? (() => performance.now());
  const started = now();
  let evaluatedPointCount = 0;
  let serial = 0;
  const findings: GraphAnalysisEvidenceV1[] = [];
  const stopReasons: GraphStopReason[] = [];
  const window = request.numericWindow ?? { coordinateSystem: 'cartesian' as const, xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const requested = new Set(request.features);
  // y = f(x) curves (piecewise ones too, with no single expression) that can meet each other.
  const explicitItems: Array<{ item: GraphClassifiedItemSnapshotV2; run: Evaluator; expression: GraphExpressionIR | null }> = [];
  const locusItems: Array<{ itemId: string; curve: PtxPlaneFunction }> = [];
  const ptx = defaultPtxSolverPort();

  for (const snapshot of request.items) {
    if (control.isCancelled?.()) break;
    if (now() - started > request.maximumTimeMs) {
      stopReasons.push({ code: 'analysis-inconclusive', detailCode: 'time-budget-exceeded' });
      break;
    }
    if (snapshot.kind !== 'relation') {
      if (snapshot.kind === 'piecewise') {
        const piecewise = analyzeGraphPiecewise({
          snapshot, window, parameters: request.parameterEnvironment, requested,
          evidence: (feature, itemIds, level, extra) => evidence(request, feature, itemIds, level, serial++, extra),
          approximate, exact, finder: { isCancelled: control.isCancelled, onEvaluation: () => { evaluatedPointCount += 1; } },
        });
        findings.push(...piecewise.findings);
        if (piecewise.run) explicitItems.push({ item: snapshot, run: piecewise.run, expression: null });
      }
      await control.yieldBetweenItems?.();
      continue;
    }
    if (snapshot.relation.kind === 'real-surface') {
      const run = surfaceEvaluatorFor(snapshot.relation, snapshot, request.parameterEnvironment, cache);
      if (run) findings.push(...analyzeSurface({
        request, item: snapshot, run, window, requested, serial: () => serial++,
        onEvaluation: () => { evaluatedPointCount += 1; },
      }));
      await control.yieldBetweenItems?.();
      continue;
    }
    if (snapshot.relation.kind === 'complex-roots') {
      if (requested.has('complex-zero')) findings.push(...analyzeComplexRoots(request, snapshot.itemId, snapshot.relation, () => serial++));
      await control.yieldBetweenItems?.();
      continue;
    }
    if (snapshot.relation.kind === 'complex-mapping') {
      findings.push(...analyzeComplexMapping({
        request, item: snapshot, relation: snapshot.relation, requested,
        serial: () => serial++, onEvaluations: (count) => { evaluatedPointCount += count; },
      }));
      await control.yieldBetweenItems?.();
      continue;
    }
    if (snapshot.relation.kind === 'complex-locus') {
      const curve = locusCurve(snapshot.relation, request.parameterEnvironment);
      if (curve) locusItems.push({ itemId: snapshot.itemId, curve });
    }
    const expression = relationExpression(snapshot.relation);
    if (!expression) {
      for (const feature of request.features) {
        findings.push(evidence(request, feature, [snapshot.itemId], 'unsupported', serial++, {
          stopReason: { code: 'analysis-unsupported', detailCode: snapshot.relation.kind },
        }));
      }
      continue;
    }
    const run = evaluatorFor(expression, snapshot, request.parameterEnvironment, cache);
    if (!run) continue;
    explicitItems.push({ item: snapshot, run, expression });
    const coefficients = polynomial(expression.mathJson);
    const finder = { isCancelled: control.isCancelled, onEvaluation: () => { evaluatedPointCount += 1; } };
    if (requested.has('root') || requested.has('x-intercept')) {
      // PTX finders: exact polynomial roots of any degree the exact path splits; otherwise bracketed and touching roots.
      const roots = ptxRealRoots(run, window.xMin, window.xMax, finder,
        ptx.realPolynomialRoots(expression.mathJson, 'x', request.parameterEnvironment));
      for (const root of roots) {
        const proved = root.level === 'exact-proved';
        const x = proved ? exact(root.x) : approximate(root.x, root.errorBound);
        for (const feature of ['root', 'x-intercept'] as const) if (requested.has(feature)) {
          findings.push(evidence(request, feature, [snapshot.itemId], root.level, serial++, {
            coordinates: { x, y: proved ? exact(0) : approximate(0, root.residual || 1e-9) },
            relationValue: proved ? exact(0) : approximate(0, root.residual || 1e-9),
            basis: proved
              ? { source: 'graph-symbolic', validator: 'exact polynomial factorisation' }
              : { source: 'numeric-validator', validator: root.level === 'numeric-validated' ? 'bracketed bisection' : 'touching root: minimum of |f| at zero', residualBound: Math.max(root.residual, 1e-12) },
          }));
        }
      }
    }
    if (requested.has('y-intercept')) {
      const y = run(0); evaluatedPointCount += 1;
      if (y !== undefined) findings.push(evidence(request, 'y-intercept', [snapshot.itemId], coefficients ? 'exact-proved' : 'numeric-validated', serial++, {
        coordinates: { x: coefficients ? exact(0) : approximate(0), y: coefficients ? exact(y) : approximate(y, 1e-10) },
      }));
    }
    if (requested.has('extremum') && coefficients?.[2]) {
      const x = -coefficients[1] / (2 * coefficients[2]);
      const y = run(x); evaluatedPointCount += 1;
      if (y !== undefined) findings.push(evidence(request, 'extremum', [snapshot.itemId], 'exact-proved', serial++, {
        coordinates: { x: exact(x), y: exact(y) },
        basis: { source: 'graph-symbolic', validator: coefficients[2] > 0 ? 'quadratic local minimum' : 'quadratic local maximum' },
      }));
    } else if (requested.has('extremum')) {
      for (const extremum of ptxRealExtrema(run, window.xMin, window.xMax, finder)) {
        findings.push(evidence(request, 'extremum', [snapshot.itemId], extremum.level, serial++, {
          coordinates: { x: approximate(extremum.x, extremum.errorBound), y: approximate(extremum.y, 1e-12 * Math.max(1, Math.abs(extremum.y))) },
          basis: { source: 'numeric-validator', validator: `local ${extremum.kind}: slope sign change refined by golden-section search` },
        }));
      }
    }
    const node = expression.mathJson;
    if (Array.isArray(node) && node[0] === 'Divide') {
      const numerator = polynomial(node[1]); const denominator = polynomial(node[2]);
      if (denominator) for (const x of polynomialRoots(denominator)) {
        const numeratorValue = numerator ? numerator[0] + numerator[1] * x + numerator[2] * x * x : undefined;
        const removable = numeratorValue === 0;
        if (removable && requested.has('hole')) findings.push(evidence(request, 'hole', [snapshot.itemId], 'exact-proved', serial++, { coordinates: { x: exact(x) } }));
        if (!removable) for (const feature of ['pole', 'vertical-asymptote', 'domain-boundary'] as const) if (requested.has(feature)) {
          findings.push(evidence(request, feature, [snapshot.itemId], feature === 'domain-boundary' ? 'exact-proved' : 'numeric-validated', serial++, {
            coordinates: { x: exact(x) },
            basis: feature === 'domain-boundary'
              ? { source: 'graph-symbolic', validator: 'denominator exclusion' }
              : { source: 'numeric-validator', validator: 'nonzero numerator at denominator root', residualBound: 1e-8 },
          }));
        }
      }
      if (requested.has('horizontal-asymptote') && numerator && denominator) {
        const numeratorDegree = numerator[2] !== 0 ? 2 : numerator[1] !== 0 ? 1 : 0;
        const denominatorDegree = denominator[2] !== 0 ? 2 : denominator[1] !== 0 ? 1 : 0;
        if (numeratorDegree <= denominatorDegree) {
          const y = numeratorDegree < denominatorDegree ? 0 : numerator[numeratorDegree] / denominator[denominatorDegree];
          findings.push(evidence(request, 'horizontal-asymptote', [snapshot.itemId], 'exact-proved', serial++, { coordinates: { y: exact(y) } }));
        }
      }
    }
    if (Array.isArray(node) && (node[0] === 'Ln' || node[0] === 'Sqrt') && requested.has('domain-boundary')) {
      const argument = polynomial(node[1]);
      if (argument) for (const x of polynomialRoots(argument)) findings.push(evidence(request, 'domain-boundary', [snapshot.itemId], 'exact-proved', serial++, { coordinates: { x: exact(x) } }));
    }
    await control.yieldBetweenItems?.();
  }

  if (!control.isCancelled?.() && requested.has('intersection')) {
    const finder = { isCancelled: control.isCancelled, onEvaluation: () => { evaluatedPointCount += 2; } };
    for (let first = 0; first < explicitItems.length; first += 1) for (let second = first + 1; second < explicitItems.length; second += 1) {
      const a = explicitItems[first]; const b = explicitItems[second];
      const exactDifference = a.expression && b.expression
        ? ptx.realPolynomialRoots(['Add', a.expression.mathJson, ['Negate', b.expression.mathJson]], 'x', request.parameterEnvironment) : null;
      for (const point of ptxRealIntersections(a.run, b.run, window.xMin, window.xMax, finder, exactDifference)) {
        const proved = point.level === 'exact-proved';
        findings.push(evidence(request, 'intersection', [a.item.itemId, b.item.itemId], point.level, serial++, {
          coordinates: proved ? { x: exact(point.x), y: exact(point.y) }
            : { x: approximate(point.x, point.errorBound), y: approximate(point.y, Math.max(point.residual, 1e-12)) },
          basis: proved ? { source: 'graph-symbolic', validator: 'exact polynomial factorisation of the difference' }
            : { source: 'numeric-validator', validator: 'bracketed or touching root of the difference', residualBound: Math.max(point.residual, 1e-12) },
        }));
      }
    }
    // Complex loci meet where both clause functions vanish (two curves in the (Re z, Im z) plane).
    for (let first = 0; first < locusItems.length; first += 1) for (let second = first + 1; second < locusItems.length; second += 1) {
      const a = locusItems[first]!; const b = locusItems[second]!;
      for (const point of ptxPlaneIntersections(a.curve, b.curve, window, ptx)) {
        findings.push(evidence(request, 'intersection', [a.itemId, b.itemId], point.level, serial++, {
          coordinates: { x: approximate(point.x, point.errorBound), y: approximate(point.y, point.errorBound) },
          basis: { source: 'numeric-validator', validator: 'common zero of both loci, seeded Newton in the plane', residualBound: 1e-9 },
        }));
      }
    }
  }

  const cancelled = control.isCancelled?.() ?? false;
  const elapsedMs = Math.max(0, now() - started);
  const status = cancelled ? 'cancelled' : stopReasons.length ? 'partial' : 'complete';
  if (cancelled) stopReasons.push({ code: 'analysis-inconclusive', detailCode: 'cancelled' });
  return {
    version: 1,
    requestId: request.requestId,
    workspaceInstanceId: request.workspaceInstanceId,
    documentId: request.documentId,
    revisions: { ...request.revisions },
    status,
    evidence: findings,
    canonicalResult: buildGraphAnalysisCanonicalResult(request, findings),
    stopReasons,
    diagnostics: {
      elapsedMs,
      evaluatedPointCount,
      exactFindingCount: findings.filter((entry) => entry.level === 'exact-proved').length,
      validatedFindingCount: findings.filter((entry) => entry.level === 'numeric-validated').length,
      analysisRevision: request.revisions.mathematics,
    },
  };
}
