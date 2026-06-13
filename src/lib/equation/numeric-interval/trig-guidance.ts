import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit } from '../../../types/calculator';
import { formatApproxNumber, formatNumber } from '../../display/format';
import { convertAngle } from '../../trigonometry/angles';
import { dedupeNumericRoots } from '../candidate-validation';
import { evaluateLatexAt, readNumericNode } from '../domain-guards';
import {
  EPSILON,
  MIN_SUBDIVISIONS,
  type AffineModel,
  type DirectTrigEquationInfo,
  type SampledImage,
} from './types';

const ce = new ComputeEngine();

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function parseNumericNode(node: unknown) {
  const numeric = evaluateRealNode(node);
  if (numeric === null || !Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
}

function evaluateRealNode(node: unknown) {
  const boxed = ce.box(node as Parameters<typeof ce.box>[0]).evaluate();
  const numeric = boxed.N?.() ?? boxed;
  const direct = readNumericNode(numeric.json);
  if (direct !== null) {
    return direct;
  }
  return readNumericNode(boxed.json);
}

function parseDirectTrigEquation(equationLatex: string): DirectTrigEquationInfo | null {
  const parsed = ce.parse(equationLatex);
  const json = parsed.json;
  if (!isNodeArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  const matchSide = (candidate: unknown, other: unknown): DirectTrigEquationInfo | null => {
    if (!isNodeArray(candidate) || candidate.length !== 2 || typeof candidate[0] !== 'string') {
      return null;
    }

    const kind =
      candidate[0] === 'Sin'
        ? 'sin'
        : candidate[0] === 'Cos'
          ? 'cos'
          : candidate[0] === 'Tan'
            ? 'tan'
            : null;

    if (!kind) {
      return null;
    }

    const targetValue = parseNumericNode(other);
    if (targetValue === null) {
      return null;
    }

    return {
      kind,
      innerNode: candidate[1],
      innerLatex: boxLatex(candidate[1]),
      targetValue,
      targetLatex: boxLatex(other),
    };
  };

  return matchSide(json[1], json[2]) ?? matchSide(json[2], json[1]);
}

function sampleInnerImage(
  innerLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
): SampledImage | null {
  const sampleCount = Math.max(MIN_SUBDIVISIONS, Math.min(subdivisions, 128));
  const step = (end - start) / sampleCount;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let finiteCount = 0;
  let sawUndefined = false;

  for (let index = 0; index <= sampleCount; index += 1) {
    const x = start + step * index;
    const value = evaluateLatexAt(innerLatex, x, angleUnit).value;
    if (value === null || !Number.isFinite(value)) {
      sawUndefined = true;
      continue;
    }
    finiteCount += 1;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (finiteCount === 0) {
    return null;
  }

  return { min, max, sawUndefined };
}

function trigValue(kind: 'sin' | 'cos' | 'tan', valueRad: number) {
  if (kind === 'sin') {
    return Math.sin(valueRad);
  }
  if (kind === 'cos') {
    return Math.cos(valueRad);
  }
  return Math.tan(valueRad);
}

function criticalAngles(kind: 'sin' | 'cos', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const base = kind === 'sin' ? Math.PI / 2 : 0;
  const period = Math.PI;
  const points: number[] = [];
  const startK = Math.ceil((lower - base) / period - EPSILON);
  const endK = Math.floor((upper - base) / period + EPSILON);
  for (let k = startK; k <= endK; k += 1) {
    const point = base + k * period;
    if (point >= lower - EPSILON && point <= upper + EPSILON) {
      points.push(point);
    }
  }
  return points;
}

function composeTrigImage(kind: 'sin' | 'cos' | 'tan', intervalMin: number, intervalMax: number, angleUnit: AngleUnit) {
  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const samplePoints = [lower, upper];

  if (kind === 'sin' || kind === 'cos') {
    samplePoints.push(...criticalAngles(kind, intervalMin, intervalMax, angleUnit));
  } else {
    const asymptoteBase = Math.PI / 2;
    const period = Math.PI;
    const startK = Math.ceil((lower - asymptoteBase) / period - EPSILON);
    const endK = Math.floor((upper - asymptoteBase) / period + EPSILON);
    if (startK <= endK) {
      return null;
    }
  }

  const values = samplePoints.map((point) => trigValue(kind, point));
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function solveTrigOnInterval(
  kind: 'sin' | 'cos' | 'tan',
  target: number,
  intervalMin: number,
  intervalMax: number,
  angleUnit: AngleUnit,
): number[] | null {
  if (!Number.isFinite(intervalMin) || !Number.isFinite(intervalMax)) {
    return null;
  }

  if ((kind === 'sin' || kind === 'cos') && (target < -1 - EPSILON || target > 1 + EPSILON)) {
    return [];
  }

  const minRad = convertAngle(intervalMin, angleUnit, 'rad');
  const maxRad = convertAngle(intervalMax, angleUnit, 'rad');
  const lower = Math.min(minRad, maxRad);
  const upper = Math.max(minRad, maxRad);
  const period = kind === 'tan' ? Math.PI : Math.PI * 2;
  const bases =
    kind === 'sin'
      ? [Math.asin(target), Math.PI - Math.asin(target)]
      : kind === 'cos'
        ? [Math.acos(target), -Math.acos(target)]
        : [Math.atan(target)];

  const solutions = new Set<number>();
  for (const base of bases) {
    if (!Number.isFinite(base)) {
      continue;
    }

    const startK = Math.ceil((lower - base) / period - EPSILON);
    const endK = Math.floor((upper - base) / period + EPSILON);
    for (let k = startK; k <= endK; k += 1) {
      const valueRad = base + k * period;
      if (valueRad < lower - EPSILON || valueRad > upper + EPSILON) {
        continue;
      }
      solutions.add(convertAngle(valueRad, 'rad', angleUnit));
      if (solutions.size > 12) {
        return null;
      }
    }
  }

  return dedupeNumericRoots([...solutions]);
}

function formatApproxInterval(min: number, max: number) {
  return `[${formatApproxNumber(min)}, ${formatApproxNumber(max)}]`;
}

function formatAngleValueText(value: number, unit: AngleUnit) {
  return `${formatNumber(value)} ${unit}`;
}

function formatTrigBranchFamily(kind: 'sin' | 'cos' | 'tan', target: number, angleUnit: AngleUnit) {
  const principal = principalTrigBranches(kind, target, angleUnit);
  if (!principal || principal.length === 0) {
    return null;
  }
  const periodText = formatAngleValueText(
    kind === 'tan'
      ? angleUnit === 'deg'
        ? 180
        : angleUnit === 'grad'
          ? 200
          : Math.PI
      : angleUnit === 'deg'
        ? 360
        : angleUnit === 'grad'
          ? 400
          : Math.PI * 2,
    angleUnit,
  );

  if (kind === 'tan') {
    return `${formatAngleValueText(principal[0], angleUnit)} + ${periodText} * k`;
  }

  if (kind === 'sin' && principal.length >= 2) {
    return `${formatAngleValueText(principal[0], angleUnit)} + ${periodText} * k or ${formatAngleValueText(principal[1], angleUnit)} + ${periodText} * k`;
  }

  if (kind === 'cos' && principal.length >= 2) {
    return `${formatAngleValueText(principal[0], angleUnit)} + ${periodText} * k or ${formatAngleValueText(principal[1], angleUnit)} + ${periodText} * k`;
  }

  return formatAngleValueText(principal[0], angleUnit);
}

function parseAffine(node: unknown): AffineModel | null {
  if (node === 'x') {
    return { coefficient: 1, offset: 0 };
  }
  if (isNodeArray(node) && node.length === 2 && node[0] === 'Negate' && node[1] === 'x') {
    return { coefficient: -1, offset: 0 };
  }
  if (isNodeArray(node) && node.length === 3 && node[0] === 'Multiply') {
    if (node[1] === 'x') {
      const coefficient = parseNumericNode(node[2]);
      return coefficient === null ? null : { coefficient, offset: 0 };
    }
    if (node[2] === 'x') {
      const coefficient = parseNumericNode(node[1]);
      return coefficient === null ? null : { coefficient, offset: 0 };
    }
  }
  if (isNodeArray(node) && node.length === 3 && (node[0] === 'Add' || node[0] === 'Subtract')) {
    const left = parseAffine(node[1]);
    const right = parseAffine(node[2]);
    const leftConstant = parseNumericNode(node[1]);
    const rightConstant = parseNumericNode(node[2]);

    if (left && rightConstant !== null) {
      return {
        coefficient: left.coefficient,
        offset: node[0] === 'Add' ? left.offset + rightConstant : left.offset - rightConstant,
      };
    }
    if (right && leftConstant !== null) {
      return {
        coefficient: node[0] === 'Add' ? right.coefficient : -right.coefficient,
        offset: node[0] === 'Add' ? right.offset + leftConstant : leftConstant - right.offset,
      };
    }
  }
  return null;
}

function estimateBranchX(innerNode: unknown, branchValue: number): number | null {
  const affine = parseAffine(innerNode);
  if (affine && Math.abs(affine.coefficient) > EPSILON) {
    return (branchValue - affine.offset) / affine.coefficient;
  }

  if (isNodeArray(innerNode) && innerNode.length === 2 && innerNode[0] === 'Ln') {
    const innerAffine = parseAffine(innerNode[1]);
    if (innerAffine && Math.abs(innerAffine.coefficient) > EPSILON) {
      return (Math.exp(branchValue) - innerAffine.offset) / innerAffine.coefficient;
    }
  }

  if (isNodeArray(innerNode) && innerNode.length === 2 && innerNode[0] === 'Exp') {
    const innerAffine = parseAffine(innerNode[1]);
    if (innerAffine && Math.abs(innerAffine.coefficient) > EPSILON && branchValue > 0) {
      return (Math.log(branchValue) - innerAffine.offset) / innerAffine.coefficient;
    }
  }

  return null;
}

function principalTrigBranches(kind: 'sin' | 'cos' | 'tan', target: number, angleUnit: AngleUnit) {
  const fullPeriod = kind === 'tan'
    ? angleUnit === 'deg'
      ? 180
      : angleUnit === 'grad'
        ? 200
        : Math.PI
    : angleUnit === 'deg'
      ? 360
      : angleUnit === 'grad'
        ? 400
        : Math.PI * 2;
  return solveTrigOnInterval(kind, target, 0, fullPeriod, angleUnit);
}

export function buildTrigNoRootGuidance(
  equationLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) {
  const trigInfo = parseDirectTrigEquation(equationLatex);
  if (!trigInfo) {
    return null;
  }

  const sampledImage = sampleInnerImage(trigInfo.innerLatex, start, end, subdivisions, angleUnit);
  const branchFamily = formatTrigBranchFamily(trigInfo.kind, trigInfo.targetValue, angleUnit);

  if (!sampledImage) {
    const branchText = branchFamily
      ? ` ${trigInfo.kind}(${trigInfo.innerLatex}) = ${trigInfo.targetLatex} needs ${trigInfo.innerLatex} near ${branchFamily}.`
      : '';
    return `The chosen interval did not produce any finite values for ${trigInfo.innerLatex}; the real-domain requirement may be excluding this entire interval.${branchText}`;
  }

  const outerImage = composeTrigImage(trigInfo.kind, sampledImage.min, sampledImage.max, angleUnit);
  const branchValues = solveTrigOnInterval(trigInfo.kind, trigInfo.targetValue, sampledImage.min, sampledImage.max, angleUnit);
  const sampledImageText = `${trigInfo.innerLatex} stays about in ${formatApproxInterval(sampledImage.min, sampledImage.max)} over [${formatApproxNumber(start)}, ${formatApproxNumber(end)}]`;
  const principalBranches = principalTrigBranches(trigInfo.kind, trigInfo.targetValue, angleUnit);

  if (branchValues && branchValues.length === 0) {
    const branchText = branchFamily
      ? `${trigInfo.kind}(${trigInfo.innerLatex}) = ${trigInfo.targetLatex} in ${angleUnit.toUpperCase()} needs ${trigInfo.innerLatex} near ${branchFamily}.`
      : '';
    const estimate = principalBranches && principalBranches.length > 0
      ? estimateBranchX(trigInfo.innerNode, principalBranches[0])
      : null;
    const estimateText = estimate !== null && Number.isFinite(estimate)
      ? ` A first branch estimate is x ≈ ${formatApproxNumber(estimate)}.`
      : '';
    const outerText = outerImage
      ? ` ${trigInfo.kind}(${trigInfo.innerLatex}) therefore stays about in ${formatApproxInterval(outerImage.min, outerImage.max)} on this interval.`
      : '';
    return `${sampledImageText}, so this interval misses the needed ${trigInfo.kind} branch values. ${branchText}${outerText}${estimateText}`.trim();
  }

  if (sampledImage.sawUndefined) {
    return `${sampledImageText}, but parts of the interval leave the real domain. Narrow the interval to a domain-valid slice before retrying.`;
  }

  return `${sampledImageText}. ${branchFamily ? `${trigInfo.kind}(${trigInfo.innerLatex}) = ${trigInfo.targetLatex} in ${angleUnit.toUpperCase()} needs ${trigInfo.innerLatex} near ${branchFamily}.` : ''}`.trim();
}
