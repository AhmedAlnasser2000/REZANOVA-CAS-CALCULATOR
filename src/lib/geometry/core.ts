import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayOutcome,
  DisplayOutcomeAction,
  GeometryParseResult,
  GeometryRequest,
  GeometryScreen,
} from '../../types/calculator';
import { formatNumber, latexToApproxText } from '../format';
import { solveCircle, solveArcSector } from './circles';
import {
  solveDistance,
  solveLineEquation,
  solveMidpoint,
  solveSlope,
} from './coordinate';
import { parseGeometryDraft } from './parser';
import {
  solveCone,
  solveCube,
  solveCuboid,
  solveCylinder,
  solveRectangle,
  solveSphere,
  solveSquare,
} from './shapes';
import { solveTriangleArea, solveTriangleHeron } from './triangles';
import type { GeometryEvaluation } from './shared';

type BoxedLike = {
  json: unknown;
  latex: string;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
};

const ce = new ComputeEngine();

function requestTitle(request: GeometryRequest) {
  switch (request.kind) {
    case 'square':
      return 'Square';
    case 'rectangle':
      return 'Rectangle';
    case 'circle':
      return 'Circle';
    case 'arcSector':
      return 'Arc and Sector';
    case 'cube':
      return 'Cube';
    case 'cuboid':
      return 'Cuboid';
    case 'cylinder':
      return 'Cylinder';
    case 'cone':
      return 'Cone';
    case 'sphere':
      return 'Sphere';
    case 'triangleArea':
      return 'Triangle Area';
    case 'triangleHeron':
      return 'Heron';
    case 'distance':
      return 'Distance';
    case 'midpoint':
      return 'Midpoint';
    case 'slope':
      return 'Slope';
    case 'lineEquation':
      return 'Line Equation';
  }
}

function toOutcome(parseResult: GeometryParseResult, title = 'Geometry'): DisplayOutcome {
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

function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();
  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof (numeric.json as { num: unknown }).num === 'string'
  ) {
    const parsed = Number((numeric.json as { num: string }).num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const approx = latexToApproxText(numeric.latex);
  if (!approx) {
    return undefined;
  }

  const parsed = Number(approx);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveScalar(latex: string, label: string) {
  const trimmed = latex.trim();
  if (!trimmed || trimmed === '?') {
    return { ok: false as const, error: `Enter ${label} before evaluating.` };
  }

  try {
    const boxed = ce.parse(trimmed) as BoxedLike;
    const value = boxedToFiniteNumber(boxed);
    if (value === undefined) {
      return {
        ok: false as const,
        error: `${label} must evaluate to a finite numeric value.`,
      };
    }

    return {
      ok: true as const,
      value,
      normalizedLatex: formatNumber(value),
    };
  } catch {
    return {
      ok: false as const,
      error: `${label} could not be parsed as a Geometry value.`,
    };
  }
}

function resolvePositiveScalar(latex: string, label: string) {
  const resolved = resolveScalar(latex, label);
  if (!resolved.ok) {
    return resolved;
  }
  if (!(resolved.value > 0)) {
    return {
      ok: false as const,
      error: `${label} must evaluate to a positive numeric value.`,
    };
  }
  return resolved;
}

function resolvePoint(
  point: { xLatex: string; yLatex: string },
  label: string,
) {
  const x = resolveScalar(point.xLatex, `${label} x-coordinate`);
  if (!x.ok) {
    return x;
  }

  const y = resolveScalar(point.yLatex, `${label} y-coordinate`);
  if (!y.ok) {
    return y;
  }

  return {
    ok: true as const,
    point: {
      x: x.normalizedLatex,
      y: y.normalizedLatex,
    },
  };
}

function evaluationToOutcome(
  title: string,
  evaluation: GeometryEvaluation,
  actions?: DisplayOutcomeAction[],
): DisplayOutcome {
  if (evaluation.error) {
    return {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      approxText: evaluation.approxText,
      actions,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
    resultOrigin: evaluation.resultOrigin,
    actions,
  };
}

function runGeometryRequest(request: GeometryRequest): DisplayOutcome {
  const title = requestTitle(request);

  switch (request.kind) {
    case 'square': {
      const side = resolvePositiveScalar(request.sideLatex, 'Square side');
      return side.ok
        ? evaluationToOutcome(title, solveSquare({ side: side.normalizedLatex }))
        : { kind: 'error', title, error: side.error, warnings: [] };
    }
    case 'rectangle': {
      const width = resolvePositiveScalar(request.widthLatex, 'Rectangle width');
      if (!width.ok) {
        return { kind: 'error', title, error: width.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Rectangle height');
      return height.ok
        ? evaluationToOutcome(title, solveRectangle({ width: width.normalizedLatex, height: height.normalizedLatex }))
        : { kind: 'error', title, error: height.error, warnings: [] };
    }
    case 'circle': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Circle radius');
      return radius.ok
        ? evaluationToOutcome(title, solveCircle({ radius: radius.normalizedLatex }))
        : { kind: 'error', title, error: radius.error, warnings: [] };
    }
    case 'arcSector': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Sector radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      const angle = resolvePositiveScalar(request.angleLatex, 'Central angle');
      return angle.ok
        ? evaluationToOutcome(title, solveArcSector({
          radius: radius.normalizedLatex,
          angle: angle.normalizedLatex,
          angleUnit: request.angleUnit,
        }))
        : { kind: 'error', title, error: angle.error, warnings: [] };
    }
    case 'distance': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      return p2.ok
        ? evaluationToOutcome(title, solveDistance({ p1: p1.point, p2: p2.point }))
        : { kind: 'error', title, error: p2.error, warnings: [] };
    }
    case 'midpoint': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      return p2.ok
        ? evaluationToOutcome(title, solveMidpoint({ p1: p1.point, p2: p2.point }))
        : { kind: 'error', title, error: p2.error, warnings: [] };
    }
    case 'slope': {
      const p1 = resolvePoint(request.p1, 'P1');
      if (!p1.ok) {
        return { kind: 'error', title, error: p1.error, warnings: [] };
      }
      const p2 = resolvePoint(request.p2, 'P2');
      return p2.ok
        ? evaluationToOutcome(title, solveSlope({ p1: p1.point, p2: p2.point }))
        : { kind: 'error', title, error: p2.error, warnings: [] };
    }
    case 'cube': {
      const side = resolvePositiveScalar(request.sideLatex, 'Cube side');
      return side.ok
        ? evaluationToOutcome(title, solveCube({ side: side.normalizedLatex }))
        : { kind: 'error', title, error: side.error, warnings: [] };
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
      return height.ok
        ? evaluationToOutcome(title, solveCuboid({
          length: length.normalizedLatex,
          width: width.normalizedLatex,
          height: height.normalizedLatex,
        }))
        : { kind: 'error', title, error: height.error, warnings: [] };
    }
    case 'cylinder': {
      const radius = resolvePositiveScalar(request.radiusLatex, 'Cylinder radius');
      if (!radius.ok) {
        return { kind: 'error', title, error: radius.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Cylinder height');
      return height.ok
        ? evaluationToOutcome(title, solveCylinder({
          radius: radius.normalizedLatex,
          height: height.normalizedLatex,
        }))
        : { kind: 'error', title, error: height.error, warnings: [] };
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
      return radius.ok
        ? evaluationToOutcome(title, solveSphere({ radius: radius.normalizedLatex }))
        : { kind: 'error', title, error: radius.error, warnings: [] };
    }
    case 'triangleArea': {
      const base = resolvePositiveScalar(request.baseLatex, 'Triangle base');
      if (!base.ok) {
        return { kind: 'error', title, error: base.error, warnings: [] };
      }
      const height = resolvePositiveScalar(request.heightLatex, 'Triangle height');
      return height.ok
        ? evaluationToOutcome(title, solveTriangleArea({
          base: base.normalizedLatex,
          height: height.normalizedLatex,
        }))
        : { kind: 'error', title, error: height.error, warnings: [] };
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
      return c.ok
        ? evaluationToOutcome(title, solveTriangleHeron({
          a: a.normalizedLatex,
          b: b.normalizedLatex,
          c: c.normalizedLatex,
        }))
        : { kind: 'error', title, error: c.error, warnings: [] };
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
    };
  }

  return {
    outcome: runGeometryRequest(parsed.request),
    parsed,
  };
}
