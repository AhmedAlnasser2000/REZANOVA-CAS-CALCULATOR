import type {
  ResultProducerDraft,
  ResultProducerActionDraft,
  GeometryParseResult,
  GeometryRequest,
  GeometryScreen,
} from '../../types/calculator';
import { solveCircle, solveArcSector } from './circles';
import {
  solveDistance,
  solveLineEquation,
  solveMidpoint,
  solveSlope,
} from './coordinate';
import { parseGeometryDraft } from './parser';
import { resolvePoint, resolvePositiveScalar } from './resolvers';
import {
  solveCone,
  solveCube,
  solveCuboid,
  solveCylinder,
  solveRectangle,
  solveSphere,
  solveSquare,
} from './shapes';
import {
  solveArcSectorMissing,
  solveCircleMissing,
  solveConeMissing,
  solveCuboidMissing,
  solveCubeMissing,
  solveCylinderMissing,
  solveDistanceMissing,
  solveMidpointMissing,
  solveRectangleMissing,
  solveSlopeMissing,
  solveSphereMissing,
  solveSquareMissing,
  solveTriangleAreaMissing,
  solveTriangleHeronMissing,
} from './solve-missing';
import type { SolveMissingResult } from './solve-missing/shared';
import { solveTriangleArea, solveTriangleHeron } from './triangles';
import {
  type GeometryEvaluation,
} from './shared';
import type { GeometryOwnedMathJsonLeaf } from './math-values';

const ownedMathJsonByOutcome = new WeakMap<object, readonly GeometryOwnedMathJsonLeaf[]>();

function requestTitle(request: GeometryRequest): string {
  switch (request.kind) {
    case 'square':
    case 'squareSolveMissing':
      return 'Square';
    case 'rectangle':
    case 'rectangleSolveMissing':
      return 'Rectangle';
    case 'circle':
    case 'circleSolveMissing':
      return 'Circle';
    case 'arcSector':
    case 'arcSectorSolveMissing':
      return 'Arc and Sector';
    case 'cube':
    case 'cubeSolveMissing':
      return 'Cube';
    case 'cuboid':
    case 'cuboidSolveMissing':
      return 'Cuboid';
    case 'cylinder':
    case 'cylinderSolveMissing':
      return 'Cylinder';
    case 'cone':
    case 'coneSolveMissing':
      return 'Cone';
    case 'sphere':
    case 'sphereSolveMissing':
      return 'Sphere';
    case 'triangleArea':
    case 'triangleAreaSolveMissing':
      return 'Triangle Area';
    case 'triangleHeron':
    case 'triangleHeronSolveMissing':
      return 'Heron';
    case 'distance':
    case 'distanceSolveMissing':
      return 'Distance';
    case 'midpoint':
    case 'midpointSolveMissing':
      return 'Midpoint';
    case 'slope':
    case 'slopeSolveMissing':
      return 'Slope';
    case 'lineEquation':
      return 'Line Equation';
    default:
      return 'Geometry';
  }
}

function toOutcome(parseResult: GeometryParseResult, title = 'Geometry'): ResultProducerDraft {
  if (parseResult.ok) {
    return {
      kind: 'error',
      title,
      error: 'Unsupported Geometry state.',
      warnings: [],
    };
  }

  return {
    kind: 'error',
    title,
    error: parseResult.error,
    warnings: [],
  };
}

function evaluationToOutcome(
  title: string,
  evaluation: GeometryEvaluation,
  actions?: ResultProducerActionDraft[],
): ResultProducerDraft {
  let outcome: ResultProducerDraft;
  if (evaluation.error) {
    outcome = {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      branchReadback: evaluation.branchReadback,
      approxText: evaluation.approxText,
      actions,
    };
  } else {
    outcome = {
      kind: 'success',
      title,
      exactLatex: evaluation.exactLatex,
      branchReadback: evaluation.branchReadback,
      approxText: evaluation.approxText,
      warnings: evaluation.warnings,
      resultOrigin: evaluation.resultOrigin,
      actions,
    };
  }
  if (evaluation.mathJsonLeaves?.length) {
    ownedMathJsonByOutcome.set(outcome, evaluation.mathJsonLeaves);
  }
  return outcome;
}

function solveMissingToOutcome(
  title: string,
  solved: SolveMissingResult,
) {
  const actions =
    solved.handoffEquationLatex && solved.evaluation.error
      ? [{ kind: 'send', target: 'equation', latex: solved.handoffEquationLatex } satisfies ResultProducerActionDraft]
      : undefined;
  const evaluation =
    solved.handoffWarning
      ? {
          ...solved.evaluation,
          warnings: (solved.evaluation.warnings ?? []).includes(solved.handoffWarning)
            ? (solved.evaluation.warnings ?? [])
            : [...(solved.evaluation.warnings ?? []), solved.handoffWarning],
        }
      : solved.evaluation;
  return evaluationToOutcome(title, evaluation, actions);
}

function runGeometryRequest(request: GeometryRequest): ResultProducerDraft {
  const title = requestTitle(request);

  switch (request.kind) {
    case 'square': {
      const side = resolvePositiveScalar(request.sideLatex, 'Square side');
      if (!side.ok) {
        return { kind: 'error', title, error: side.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveSquare({ side: side.normalizedLatex }));
    }
    case 'rectangle': {
      const width = resolvePositiveScalar(request.widthLatex, 'Rectangle width');
      if (!width.ok) {
        return { kind: 'error', title, error: width.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Rectangle height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveRectangle({ width: width.normalizedLatex, height: height.normalizedLatex }));
    }
    case 'circle': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Circle radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCircle({ radius: radius.normalizedLatex }));
    }
    case 'arcSector': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Sector radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      const angle = resolvePositiveScalar(request.angleLatex, 'Central angle');
      if (!angle.ok) {
        return { kind: 'error', title, error: angle.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveArcSector({
        radius: radius.normalizedLatex,
        angle: angle.normalizedLatex,
        angleUnit: request.angleUnit,
      }));
    }
    case 'distance': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveDistance({ p1: p1.point, p2: p2.point }));
    }
    case 'midpoint': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveMidpoint({ p1: p1.point, p2: p2.point }));
    }
    case 'slope': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveSlope({ p1: p1.point, p2: p2.point }));
    }
    case 'cube': {
      const side = resolvePositiveScalar(request.sideLatex, 'Cube side');
      if (!side.ok) {
        return { kind: 'error', title, error: side.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCube({ side: side.normalizedLatex }));
    }
    case 'cuboid': {
      const length = resolvePositiveScalar(request.lengthLatex, 'Cuboid length');
      if (!length.ok) {
        return { kind: 'error', title, error: length.error, warnings: [] };
      }
      const width = resolvePositiveScalar(request.widthLatex, 'Cuboid width');
      if (!width.ok) {
        return { kind: 'error', title, error: width.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Cuboid height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCuboid({
        length: length.normalizedLatex,
        width: width.normalizedLatex,
        height: height.normalizedLatex,
      }));
    }
    case 'cylinder': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Cylinder radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Cylinder height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveCylinder({
        radius: radius.normalizedLatex,
        height: height.normalizedLatex,
      }));
    }
    case 'cone': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Cone radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }

      const height =
        request.heightLatex?.trim()
          ? resolvePositiveScalar(request.heightLatex, 'Cone height')
          : null;
      if (height && !height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }

      const slantHeight =
        request.slantHeightLatex?.trim()
          ? resolvePositiveScalar(request.slantHeightLatex, 'Cone slant height')
          : null;
      if (slantHeight && !slantHeight.ok) {
        return { kind: 'error', title, error: slantHeight.error, warnings: [] };
      }

      return evaluationToOutcome(title, solveCone({
        radius: radius.normalizedLatex,
        height: height?.normalizedLatex ?? '',
        slantHeight: slantHeight?.normalizedLatex ?? '',
      }));
    }
    case 'sphere': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Sphere radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveSphere({ radius: radius.normalizedLatex }));
    }
    case 'triangleArea': {
      const base = resolvePositiveScalar(request.baseLatex, 'Triangle base');
      if (!base.ok) {
        return { kind: 'error', title, error: base.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Triangle height');
      if (!height.ok) {
        return { kind: 'error', title, error: height.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveTriangleArea({
        base: base.normalizedLatex,
        height: height.normalizedLatex,
      }));
    }
    case 'triangleHeron': {
      const a = resolvePositiveScalar(request.aLatex, 'Triangle side a');
      if (!a.ok) {
        return { kind: 'error', title, error: a.error, warnings: [] };
      }
      const b = resolvePositiveScalar(request.bLatex, 'Triangle side b');
      if (!b.ok) {
        return { kind: 'error', title, error: b.error, warnings: [] };
      }
      const c = resolvePositiveScalar(request.cLatex, 'Triangle side c');
      if (!c.ok) {
        return { kind: 'error', title, error: c.error, warnings: [] };
      }
      return evaluationToOutcome(title, solveTriangleHeron({
        a: a.normalizedLatex,
        b: b.normalizedLatex,
        c: c.normalizedLatex,
      }));
    }
    case 'lineEquation': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      if (!p2.ok) {
        return { kind: 'error', title, error: p2.error, warnings: [] };
      }
      const evaluation = solveLineEquation({ p1: p1.point, p2: p2.point, form: request.form });
      return evaluationToOutcome(
        title,
        evaluation,
        evaluation.exactLatex
          ? [{ kind: 'send', target: 'equation', latex: evaluation.exactLatex }]
          : undefined,
      );
    }
    case 'squareSolveMissing':
      return solveMissingToOutcome(title, solveSquareMissing(request));
    case 'circleSolveMissing':
      return solveMissingToOutcome(title, solveCircleMissing(request));
    case 'arcSectorSolveMissing':
      return solveMissingToOutcome(title, solveArcSectorMissing(request));
    case 'cubeSolveMissing':
      return solveMissingToOutcome(title, solveCubeMissing(request));
    case 'cuboidSolveMissing':
      return solveMissingToOutcome(title, solveCuboidMissing(request));
    case 'sphereSolveMissing':
      return solveMissingToOutcome(title, solveSphereMissing(request));
    case 'coneSolveMissing':
      return solveMissingToOutcome(title, solveConeMissing(request));
    case 'triangleAreaSolveMissing':
      return solveMissingToOutcome(title, solveTriangleAreaMissing(request));
    case 'triangleHeronSolveMissing':
      return solveMissingToOutcome(title, solveTriangleHeronMissing(request));
    case 'rectangleSolveMissing':
      return solveMissingToOutcome(title, solveRectangleMissing(request));
    case 'cylinderSolveMissing':
      return solveMissingToOutcome(title, solveCylinderMissing(request));
    case 'distanceSolveMissing':
      return solveMissingToOutcome(title, solveDistanceMissing(request));
    case 'midpointSolveMissing':
      return solveMissingToOutcome(title, solveMidpointMissing(request));
    case 'slopeSolveMissing':
      return solveMissingToOutcome(title, solveSlopeMissing(request));
  }
}

export function runGeometryCoreDraft(
  rawLatex: string,
  screenHint?: GeometryScreen,
) {
  const parsed = parseGeometryDraft(rawLatex, { screenHint });
  if (!parsed.ok) {
    return {
      outcome: toOutcome(parsed),
      parsed,
      mathJsonLeaves: [],
    };
  }

  const outcome = runGeometryRequest(parsed.request);
  return {
    outcome,
    parsed,
    mathJsonLeaves: ownedMathJsonByOutcome.get(outcome) ?? [],
  };
}
