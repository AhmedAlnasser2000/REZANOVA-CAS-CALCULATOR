import type {
  GraphGridPolicyV1,
  GraphGridSceneV2,
  GraphSceneLabelV1,
  GraphViewportV1,
} from '../contracts';

type GridInput = {
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  policy: GraphGridPolicyV1;
  previousHysteresisKey?: string;
};

function niceStep(span: number, pixels: number, targetPixels = 88, previous?: number) {
  const target = span / Math.max(2, pixels / targetPixels);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(Number.MIN_VALUE, target)));
  const normalized = target / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const candidate = multiplier * magnitude;
  if (!previous || !Number.isFinite(previous) || previous <= 0 || candidate === previous) {
    return candidate;
  }
  if (candidate > previous && target < previous * 1.15) return previous;
  if (candidate < previous && target > candidate * 0.85) return previous;
  return candidate;
}

function previousSteps(key: string | undefined, kind: 'cartesian' | 'polar') {
  if (!key?.startsWith(kind + ':')) return [];
  return key.slice(kind.length + 1).split(':').map(Number).filter(Number.isFinite);
}

function values(minimum: number, maximum: number, step: number, limit = 80) {
  const output: number[] = [];
  const first = Math.ceil(minimum / step) * step;
  for (let value = first; value <= maximum + step * 1e-8 && output.length < limit; value += step) {
    output.push(Math.abs(value) < step * 1e-8 ? 0 : value);
  }
  return output;
}

function line(
  output: GraphGridSceneV2['lines'],
  lineId: string,
  role: GraphGridSceneV2['lines'][number]['role'],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  output.push({ lineId, role, x1, y1, x2, y2 });
}

function formatNumber(value: number, step: number) {
  if (value === 0) return '0';
  const decimals = Math.max(0, Math.min(5, -Math.floor(Math.log10(step))));
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals).replace(/\.?0+$/u, '');
}

function cartesianGrid(input: GridInput): GraphGridSceneV2 {
  const { viewport, cssSize, policy } = input;
  const previous = previousSteps(input.previousHysteresisKey, 'cartesian');
  const xStep = niceStep(viewport.xMax - viewport.xMin, cssSize.width, 88, previous[0]);
  const yStep = niceStep(viewport.yMax - viewport.yMin, cssSize.height, 88, previous[1]);
  const lines: GraphGridSceneV2['lines'] = [];
  const labels: GraphSceneLabelV1[] = [];
  const xValues = values(viewport.xMin, viewport.xMax, xStep);
  const yValues = values(viewport.yMin, viewport.yMax, yStep);
  if (policy.major) {
    xValues.forEach((x) => line(lines, `grid-major-x:${x}`, x === 0 ? 'axis' : 'major', x, viewport.yMin, x, viewport.yMax));
    yValues.forEach((y) => line(lines, `grid-major-y:${y}`, y === 0 ? 'axis' : 'major', viewport.xMin, y, viewport.xMax, y));
  }
  if (policy.minor) {
    values(viewport.xMin, viewport.xMax, xStep / 5).filter((x) => (
      Math.abs(x / xStep - Math.round(x / xStep)) > 1e-7
    )).forEach((x) => line(lines, `grid-minor-x:${x}`, 'minor', x, viewport.yMin, x, viewport.yMax));
    values(viewport.yMin, viewport.yMax, yStep / 5).filter((y) => (
      Math.abs(y / yStep - Math.round(y / yStep)) > 1e-7
    )).forEach((y) => line(lines, `grid-minor-y:${y}`, 'minor', viewport.xMin, y, viewport.xMax, y));
  }
  if (policy.axisNumbers) {
    const xLabelY = Math.max(viewport.yMin, Math.min(viewport.yMax, 0));
    const yLabelX = Math.max(viewport.xMin, Math.min(viewport.xMax, 0));
    xValues.filter((x) => x !== 0).forEach((x, index) => {
      if (index % 2 === 0 || xValues.length <= 12) labels.push({
        labelId: `grid:x:${x}`,
        role: 'tick',
        anchor: { x, y: xLabelY },
        priority: 20,
        plainText: formatNumber(x, xStep),
      });
    });
    yValues.filter((y) => y !== 0).forEach((y, index) => {
      if (index % 2 === 0 || yValues.length <= 10) labels.push({
        labelId: `grid:y:${y}`,
        role: 'tick',
        anchor: { x: yLabelX, y },
        priority: 20,
        plainText: formatNumber(y, yStep),
      });
    });
  }
  return {
    version: 2,
    kind: 'cartesian',
    lines,
    circles: [],
    labels: labels.slice(0, 28),
    hysteresisKey: `cartesian:${xStep}:${yStep}`,
  };
}

const ANGLE_LABELS: Array<[number, string]> = [
  [0, '0'], [Math.PI / 6, 'pi/6'], [Math.PI / 3, 'pi/3'], [Math.PI / 2, 'pi/2'],
  [2 * Math.PI / 3, '2pi/3'], [5 * Math.PI / 6, '5pi/6'], [Math.PI, 'pi'],
  [7 * Math.PI / 6, '7pi/6'], [4 * Math.PI / 3, '4pi/3'], [3 * Math.PI / 2, '3pi/2'],
  [5 * Math.PI / 3, '5pi/3'], [11 * Math.PI / 6, '11pi/6'],
];

function polarGrid(input: GridInput): GraphGridSceneV2 {
  const { viewport, cssSize, policy } = input;
  const radius = Math.max(
    Math.hypot(viewport.xMin, viewport.yMin), Math.hypot(viewport.xMin, viewport.yMax),
    Math.hypot(viewport.xMax, viewport.yMin), Math.hypot(viewport.xMax, viewport.yMax),
  );
  const previous = previousSteps(input.previousHysteresisKey, 'polar');
  const radiusStep = niceStep(radius, Math.min(cssSize.width, cssSize.height) / 2, 72, previous[0]);
  const lines: GraphGridSceneV2['lines'] = [];
  const circles: GraphGridSceneV2['circles'] = [];
  const labels: GraphSceneLabelV1[] = [];
  const rings = values(radiusStep, radius, radiusStep, 16);
  if (policy.major) rings.forEach((value) => circles.push({
    circleId: `grid-ring-major:${value}`, role: 'major', center: { x: 0, y: 0 }, radius: value,
  }));
  if (policy.minor) values(radiusStep / 2, radius, radiusStep / 2, 24)
    .filter((value) => Math.abs(value / radiusStep - Math.round(value / radiusStep)) > 1e-7)
    .forEach((value) => circles.push({
      circleId: `grid-ring-minor:${value}`, role: 'minor', center: { x: 0, y: 0 }, radius: value,
    }));
  const spokeStep = Math.min(cssSize.width, cssSize.height) < 520 ? Math.PI / 4 : Math.PI / 6;
  for (let angle = 0; angle < Math.PI * 2 - 1e-8; angle += spokeStep) {
    line(lines, `grid-spoke:${angle}`, 'spoke', 0, 0, radius * Math.cos(angle), radius * Math.sin(angle));
  }
  if (policy.axisNumbers) rings.slice(0, 8).forEach((value) => labels.push({
    labelId: `grid:r:${value}`,
    role: 'tick',
    anchor: { x: value, y: 0 },
    priority: 18,
    plainText: formatNumber(value, radiusStep),
  }));
  if (policy.angleLabels) {
    const nearestVisibleRadius = Math.max(radiusStep, Math.min(radius * 0.9, Math.hypot(
      Math.max(viewport.xMin, Math.min(0, viewport.xMax)),
      Math.max(viewport.yMin, Math.min(0, viewport.yMax)),
    ) + radiusStep));
    const labelRadius = nearestVisibleRadius;
    ANGLE_LABELS.filter(([angle]) => Math.abs(angle / spokeStep - Math.round(angle / spokeStep)) < 1e-7)
      .forEach(([angle, text]) => labels.push({
        labelId: `grid:theta:${angle}`,
        role: 'tick',
        anchor: { x: labelRadius * Math.cos(angle), y: labelRadius * Math.sin(angle) },
        priority: 24,
        plainText: text,
      }));
  }
  return {
    version: 2,
    kind: 'polar',
    lines,
    circles,
    labels: labels.slice(0, 28),
    hysteresisKey: `polar:${radiusStep}:${spokeStep}`,
  };
}

export function buildGraphGridScene(input: GridInput): GraphGridSceneV2 {
  if (input.policy.kind === 'none') {
    return { version: 2, kind: 'none', lines: [], circles: [], labels: [], hysteresisKey: 'none:v2' };
  }
  return input.policy.kind === 'polar' ? polarGrid(input) : cartesianGrid(input);
}
