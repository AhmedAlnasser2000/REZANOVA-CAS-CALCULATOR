import { createComplexNumericEvaluator } from '../../equation/complex-domain-public';
import { complex, complexAbs, complexArg } from '../../numeric/complex';
import { clipGraphComplexBranchRay, graphComplexBranchGeometry } from './complex-branch-geometry';
import { graphRealLogConvention } from './real-log-convention';
import type {
  GraphComplexDomainTileRuntimeV1,
  GraphRelationIR,
  GraphSamplingQualityV3,
  GraphViewportV1,
} from '../contracts';

type ComplexMapping = Extract<GraphRelationIR, { kind: 'complex-mapping' }>;
type ComplexTrajectory = Extract<GraphRelationIR, { kind: 'complex-trajectory' }>;

function operators(node: unknown, output = new Set<string>()) {
  if (!Array.isArray(node)) return output;
  if (typeof node[0] === 'string') output.add(node[0]);
  node.slice(1).forEach((child) => operators(child, output));
  return output;
}

function hueToRgb(hue: number, saturation: number, lightness: number) {
  const channel = (offset: number) => {
    const k = (offset + hue * 12) % 12;
    return lightness - saturation * Math.min(lightness, 1 - lightness)
      * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)].map((value) => Math.round(value * 255));
}

function phaseColor(phase: number, magnitude: number) {
  const hue = (phase / (Math.PI * 2) + 1) % 1;
  const rings = 0.08 * Math.cos(Math.log2(1 + magnitude) * Math.PI * 2);
  return hueToRgb(hue, 0.78, Math.max(0.24, Math.min(0.72, 0.5 + rings)));
}

function branchGeometry(node: unknown, viewport: GraphViewportV1, parameters: Record<string, number>) {
  const geometry = graphComplexBranchGeometry(node, 'z', parameters);
  const branchCuts: GraphComplexDomainTileRuntimeV1['branchCuts'] = [];
  for (const ray of geometry.rays) {
    const segment = clipGraphComplexBranchRay(ray, viewport);
    if (segment) branchCuts.push({ family: ray.family, ...segment });
  }
  const branchPoints: GraphComplexDomainTileRuntimeV1['branchPoints'] = geometry.points
    .map((point) => ({ family: point.family, z: point.z }));
  return { branchCuts, branchPoints, unresolved: geometry.unresolvedOperators.length > 0 };
}

export function sampleComplexMapping(input: {
  itemId: string;
  relation: ComplexMapping;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  quality: GraphSamplingQualityV3;
  parameters: Record<string, number>;
  isCancelled: () => boolean;
}) {
  const scale = input.quality === 'preview' ? 0.08 : input.quality === 'settled' ? 0.12 : 0.16;
  const width = Math.max(48, Math.min(180, Math.round(input.cssSize.width * scale)));
  const height = Math.max(36, Math.min(140, Math.round(input.cssSize.height * scale)));
  const rgba = new Uint8Array(width * height * 4);
  const values = new Float32Array(width * height * 4);
  const evaluator = createComplexNumericEvaluator({ expressionMathJson: input.relation.expression.mathJson,
    target: 'z', parameters: input.parameters });
  let sampleCount = 0;
  let invalidCount = 0;
  for (let row = 0; row < height; row += 1) {
    if (input.isCancelled()) break;
    const im = input.viewport.yMax - (row + 0.5) / height * (input.viewport.yMax - input.viewport.yMin);
    for (let column = 0; column < width; column += 1) {
      const re = input.viewport.xMin + (column + 0.5) / width * (input.viewport.xMax - input.viewport.xMin);
      const result = evaluator.evaluateAt(complex(re, im));
      const offset = (row * width + column) * 4;
      sampleCount += 1;
      if (result.status !== 'finite' || !result.value) {
        invalidCount += 1; rgba.set([8, 17, 20, 255], offset);
        values.set([Number.NaN, Number.NaN, Number.NaN, Number.NaN], offset);
        continue;
      }
      const magnitude = complexAbs(result.value); const phase = complexArg(result.value);
      const color = phaseColor(phase, magnitude);
      rgba.set([color[0]!, color[1]!, color[2]!, 255], offset);
      values.set([result.value.re, result.value.im, magnitude, phase], offset);
    }
  }
  const kinds = operators(input.relation.expression.mathJson);
  const nonHolomorphic = ['Abs', 'Arg', 'Conjugate', 'ImaginaryPart', 'Real', 'RealPart']
    .some((operator) => kinds.has(operator));
  const { unresolved, ...branch } = branchGeometry(input.relation.expression.mathJson, input.viewport, input.parameters);
  const tile: GraphComplexDomainTileRuntimeV1 = {
    tileId: `${input.itemId}:complex:0`, itemId: input.itemId, width, height,
    bounds: { reMin: input.viewport.xMin, reMax: input.viewport.xMax,
      imMin: input.viewport.yMin, imMax: input.viewport.yMax },
    rgba, values, analyticity: nonHolomorphic ? 'non-holomorphic' : unresolved ? 'unknown' : 'holomorphic',
    ...branch, truncated: input.isCancelled(),
  };
  const slice = realAxisSlice(evaluator, input.viewport, Math.min(320, width * 2));
  return { tile, slice, sampleCount, invalidCount };
}

export type GraphRealAxisSlice = {
  re: Float64Array; im: Float64Array; segmentOffsets: Uint32Array; sampleCount: number;
};

/**
 * Re f(x) and Im f(x) along the real axis, principal branch. Undefined points
 * break the segment, and so do points `skip` rejects.
 */
function realAxisSlice(evaluator: ReturnType<typeof createComplexNumericEvaluator>, viewport: GraphViewportV1,
  steps: number, skip?: (x: number) => boolean): GraphRealAxisSlice {
  const re: number[] = []; const im: number[] = []; const offsets: number[] = [];
  let open = false;
  for (let index = 0; index <= steps; index += 1) {
    const x = viewport.xMin + index / steps * (viewport.xMax - viewport.xMin);
    const result = evaluator.evaluateAt(complex(x, 0));
    const value = result.status === 'finite' ? result.value : undefined;
    const keep = value && Number.isFinite(value.re) && Number.isFinite(value.im) && !skip?.(x);
    if (!keep) { open = false; continue; }
    if (!open) { offsets.push(re.length / 2); open = true; }
    re.push(x, value.re); im.push(x, value.im);
  }
  return { re: new Float64Array(re), im: new Float64Array(im), segmentOffsets: new Uint32Array(offsets),
    sampleCount: steps + 1 };
}

/**
 * Opt-in complex values of a real explicit curve y = f(x), only where the real
 * curve itself is undefined (`realDefined` false): a real odd root such as
 * the cube root of -8 stays the real curve's, never a second Re/Im pair.
 */
export function sampleGraphComplexValues(input: {
  mathJson: unknown; viewport: GraphViewportV1; cssWidth: number; parameters: Record<string, number>;
  realDefined: (x: number) => boolean;
}): GraphRealAxisSlice | null {
  try {
    const evaluator = createComplexNumericEvaluator({ expressionMathJson: graphRealLogConvention(input.mathJson),
      target: 'x', parameters: input.parameters });
    return realAxisSlice(evaluator, input.viewport, Math.max(64, Math.min(1200, Math.round(input.cssWidth))),
      input.realDefined);
  } catch {
    // Operators outside the complex evaluator: the real curve stands alone.
    return null;
  }
}

export function sampleComplexTrajectory(input: {
  itemId: string;
  relation: ComplexTrajectory;
  viewport: GraphViewportV1;
  quality: GraphSamplingQualityV3;
  parameters: Record<string, number>;
  isCancelled: () => boolean;
}) {
  const maximumSamples = input.quality === 'preview' ? 120 : input.quality === 'settled' ? 320 : 640;
  const evaluator = createComplexNumericEvaluator({
    expressionMathJson: input.relation.value.mathJson,
    target: input.relation.parameterSymbol,
    parameters: input.parameters,
  });
  const coordinates: number[] = [];
  const independentValues: number[] = [];
  const segmentOffsets: number[] = [];
  let activeSegment = false;
  let evaluatedSamples = 0;
  for (let index = 0; index <= maximumSamples; index += 1) {
    if (input.isCancelled()) break;
    const parameter = input.viewport.xMin + index / maximumSamples
      * (input.viewport.xMax - input.viewport.xMin);
    const result = evaluator.evaluateAt(complex(parameter, 0));
    evaluatedSamples += 1;
    if (result.status !== 'finite' || !result.value) {
      activeSegment = false;
      continue;
    }
    if (!activeSegment) {
      segmentOffsets.push(coordinates.length / 2);
      activeSegment = true;
    }
    coordinates.push(result.value.re, result.value.im);
    independentValues.push(parameter);
  }
  return {
    coordinates: new Float64Array(coordinates),
    independentValues: new Float64Array(independentValues),
    segmentOffsets: new Uint32Array(segmentOffsets),
    evaluatedSamples,
    truncated: input.isCancelled(),
  };
}
