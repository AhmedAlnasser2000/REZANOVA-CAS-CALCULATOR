import type { GraphInequalityComparator } from '../../contracts';
import { graphSurfaceContourStep } from '../../sampling/surface-contours';
import type { CompiledGraphExpressionPlan } from '../../evaluator/types';
import type { GraphGpuShading } from './field-layer';
import { translateGraphRealPlan, type GraphGpuRealProgramV1, type GraphGpuTranslationRefusal } from './real-program';

// Real 2D fields on the GPU: implicit equalities, inequalities, and chained
// inequalities. Pass 1 writes each clause's normalised difference (inside is
// <= 0, exactly as the CPU implicit sampler) into a float target; pass 2
// draws a boundary only where a finite neighbour shows a real sign change,
// anti-aliased by |F| / |grad F|, so near-zero fields never become false
// bands. Undefined points (the CPU evaluator's non-finite results) are a
// sentinel that never forms a crossing. Display only.

export const GRAPH_GPU_MAX_FIELD_CLAUSES = 4;
const UNDEFINED = '1e30';

export type GraphGpuRealFieldClauseInput = {
  left: CompiledGraphExpressionPlan;
  right: CompiledGraphExpressionPlan;
  operator: GraphInequalityComparator | '=';
};

export type GraphGpuRealFieldProgram = GraphGpuRealProgramV1 & {
  clauseCount: number;
  strict: boolean[];
  fillsRegion: boolean;
};

export function buildGraphGpuRealFieldProgram(
  clauses: GraphGpuRealFieldClauseInput[],
  options: { key: string; fillsRegion: boolean },
): GraphGpuRealFieldProgram | GraphGpuTranslationRefusal {
  if (clauses.length === 0) return { ok: false, reason: 'no-clauses' };
  if (clauses.length > GRAPH_GPU_MAX_FIELD_CLAUSES) return { ok: false, reason: 'too-many-clauses' };
  const parameterNames: string[] = [];
  const sources: string[] = [];
  const ops: GraphGpuRealProgramV1['ops'] = [];
  for (const [index, clause] of clauses.entries()) {
    const left = translateGraphRealPlan(clause.left, { x: 'x', y: 'y' }, { functionName: `graphLeft${index}`, parameterNames });
    if (!('kind' in left)) return left;
    const right = translateGraphRealPlan(clause.right, { x: 'x', y: 'y' }, { functionName: `graphRight${index}`, parameterNames });
    if (!('kind' in right)) return right;
    ops.push(...left.ops, ...right.ops);
    const reversed = clause.operator === '>' || clause.operator === '>=';
    sources.push(left.glsl, right.glsl, `float graphClause${index}(vec2 p, out bool ok) {
  bool leftOk; bool rightOk;
  float l = graphLeft${index}(p, leftOk);
  float r = graphRight${index}(p, rightOk);
  ok = leftOk && rightOk;
  return ${reversed ? 'r - l' : 'l - r'};
}
`);
  }
  sources.push('float graphReal(vec2 p, out bool ok) { return graphClause0(p, ok); }\n');
  return {
    kind: 'real',
    key: options.key,
    ops,
    parameterNames,
    glsl: sources.join('\n'),
    clauseCount: clauses.length,
    strict: clauses.map((clause) => clause.operator === '<' || clause.operator === '>'),
    fillsRegion: options.fillsRegion,
  };
}

/** Pass 1: clause values into RGBA (unused channels 0), undefined as a sentinel. */
export function graphGpuRealFieldValueShading(clauseCount: number): GraphGpuShading {
  const channels = Array.from({ length: 4 }, (_, index) => (index < clauseCount
    ? `graphOk${index} ? clamp(graphValue${index}, -1e29, 1e29) : ${UNDEFINED}` : '0.0'));
  const evaluations = Array.from({ length: clauseCount }, (_, index) => (
    `  bool graphOk${index}; float graphValue${index} = graphClause${index}(graphPoint, graphOk${index});`)).join('\n');
  return {
    id: `real-field-values-${clauseCount}`,
    body: `${evaluations}\n  outColor = vec4(${channels.join(', ')});`,
  };
}

/**
 * Pass 2: region fill and sign-change boundaries from the pass-1 target.
 * Uniforms: uField (sampler), uClauseCount, uStrict (per clause 0/1),
 * uFillRegion, uColor (rgb 0..1), uStrokeOpacity, uRegionOpacity,
 * uLineWidth / uPixelRatio (backing pixels), uStrokeStyle (0 solid,
 * 1 dashed, 2 dotted), uHalo (0/1).
 */
export const GRAPH_GPU_REAL_FIELD_SHADING: GraphGpuShading = {
  id: 'real-field-composite-v1',
  declarations: `
uniform highp sampler2D uField;
uniform int uClauseCount;
uniform vec4 uStrict;
uniform int uFillRegion;
uniform vec3 uColor;
uniform float uStrokeOpacity;
uniform float uRegionOpacity;
uniform float uLineWidth;
uniform float uPixelRatio;
uniform int uStrokeStyle;
uniform int uHalo;
bool graphDefined(float value) { return abs(value) < 1e29 + 1e28; }
vec4 graphFetch(ivec2 pixel, ivec2 size) { return texelFetch(uField, clamp(pixel, ivec2(0), size - 1), 0); }
`,
  body: `
  ivec2 size = textureSize(uField, 0);
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  vec4 center = graphFetch(pixel, size);
  float regionAlpha = 0.0;
  if (uFillRegion == 1) {
    bool inside = true;
    for (int i = 0; i < 4; i += 1) {
      if (i >= uClauseCount) break;
      float value = center[i];
      if (!graphDefined(value) || value > 0.0) inside = false;
    }
    regionAlpha = inside ? uRegionOpacity : 0.0;
  }
  float lineAlpha = 0.0;
  float haloAlpha = 0.0;
  float halfWidth = uLineWidth * 0.5;
  float reach = halfWidth + (uHalo == 1 ? 4.0 * uPixelRatio : 0.5);
  int radius = int(ceil(halfWidth + (uHalo == 1 ? 4.0 * uPixelRatio : 0.0))) + 1;
  for (int i = 0; i < 4; i += 1) {
    if (i >= uClauseCount) break;
    float value = center[i];
    if (!graphDefined(value)) continue;
    float east = graphFetch(pixel + ivec2(1, 0), size)[i];
    float west = graphFetch(pixel - ivec2(1, 0), size)[i];
    float north = graphFetch(pixel + ivec2(0, 1), size)[i];
    float south = graphFetch(pixel - ivec2(0, 1), size)[i];
    vec2 gradient = vec2(
      graphDefined(east) && graphDefined(west) ? (east - west) * 0.5 : graphDefined(east) ? east - value : value - west,
      graphDefined(north) && graphDefined(south) ? (north - south) * 0.5 : graphDefined(north) ? north - value : value - south);
    float distance = abs(value) / max(length(gradient), 1e-20);
    // Pixels beyond the stroke and halo would get zero alpha below; skipping
    // the neighbourhood search for them keeps the output identical and makes
    // most of the frame cost four fetches per clause.
    if (distance >= reach) continue;
    // A crossing needs strictly negative and strictly positive values nearby: a field that only touches
    // zero ((x - y)^2 = 0, exactly 0 where a pixel centre lies on the curve) has none, and is drawn by its
    // CPU touching path instead of as blobs at those pixels (GRAPHING-PERF1).
    bool negative = value < 0.0;
    bool positive = value > 0.0;
    for (int k = 1; k <= 12; k += 1) {
      if (k > radius) break;
      ivec2 offsets[8] = ivec2[8](ivec2(k, 0), ivec2(-k, 0), ivec2(0, k), ivec2(0, -k),
        ivec2(k, k), ivec2(-k, k), ivec2(k, -k), ivec2(-k, -k));
      for (int o = 0; o < 8; o += 1) {
        float neighbour = graphFetch(pixel + offsets[o], size)[i];
        if (!graphDefined(neighbour)) continue;
        if (neighbour < 0.0) negative = true; else if (neighbour > 0.0) positive = true;
      }
    }
    if (!(negative && positive)) continue;
    // Two-scale consistency: at a genuine root the field is locally linear,
    // so slopes over +-1 px and +-2 px agree. Across a pole (1/x, tan) the
    // sign also flips but the slopes disagree sharply; reject that crossing.
    bool consistent = false;
    for (int axisIndex = 0; axisIndex < 2; axisIndex += 1) {
      ivec2 axis = axisIndex == 0 ? ivec2(1, 0) : ivec2(0, 1);
      float near1 = axisIndex == 0 ? gradient.x : gradient.y;
      if (abs(near1) < 0.1 * length(gradient)) continue;
      float far1 = graphFetch(pixel + 2 * axis, size)[i];
      float far2 = graphFetch(pixel - 2 * axis, size)[i];
      if (!graphDefined(far1) || !graphDefined(far2)) continue;
      float ratio = (far1 - far2) * 0.25 / near1;
      if (ratio > 0.5 && ratio < 2.0) consistent = true;
    }
    if (!consistent) continue;
    // Chained clauses: a boundary piece counts only where the other clauses hold.
    bool othersHold = true;
    for (int j = 0; j < 4; j += 1) {
      if (j >= uClauseCount || j == i) continue;
      float other = center[j];
      if (!graphDefined(other) || other > 0.0) othersHold = false;
    }
    if (!othersHold) continue;
    float alpha = clamp(halfWidth + 0.5 - distance, 0.0, 1.0);
    bool dashed = uStrict[i] > 0.5 || uStrokeStyle == 1;
    if (dashed || uStrokeStyle == 2) {
      vec2 tangent = length(gradient) > 0.0 ? normalize(vec2(-gradient.y, gradient.x)) : vec2(1.0, 0.0);
      float phase = abs(dot(gl_FragCoord.xy, tangent)) / uPixelRatio;
      alpha *= dashed ? step(mod(phase, 14.0), 8.0) : step(mod(phase, 7.0), 2.0);
    }
    lineAlpha = max(lineAlpha, alpha);
    if (uHalo == 1) haloAlpha = max(haloAlpha, 0.28 * clamp(halfWidth + 4.0 * uPixelRatio - distance, 0.0, 1.0));
  }
  float stroke = max(lineAlpha * uStrokeOpacity, haloAlpha);
  float alpha = stroke + regionAlpha * (1.0 - stroke);
  outColor = vec4(uColor * alpha, alpha);`,
};

/**
 * Pass 2 for a real surface z = f(x, y) seen from above: the 3D surface's
 * height ramp over the CPU mesh's z range, with light iso-contours (as the
 * SVG fallback draws them) at the CPU contour step. Pass 1 is the one-clause value shading of
 * z - 0, so undefined points stay transparent. Uniforms: uField, uRange
 * (min, max), uContourStep (0 disables), uBounds (xMin, xMax, yMin, yMax of the
 * sampled domain), uOpacity, uPixelRatio.
 */
export const GRAPH_GPU_SURFACE_HEAT_SHADING: GraphGpuShading = {
  id: 'surface-heat-composite-v1',
  declarations: `
uniform highp sampler2D uField;
uniform vec2 uRange;
uniform float uContourStep;
uniform vec4 uBounds;
uniform float uOpacity;
uniform float uPixelRatio;
float graphHue(float low, float high, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return low + (high - low) * 6.0 * t;
  if (t < 0.5) return high;
  if (t < 2.0 / 3.0) return low + (high - low) * 6.0 * (2.0 / 3.0 - t);
  return low;
}
vec3 graphHsl(float h, float s, float l) {
  h = h - floor(h);
  float high = l <= 0.5 ? l * (1.0 + s) : l + s - l * s;
  float low = 2.0 * l - high;
  return vec3(graphHue(low, high, h + 1.0 / 3.0), graphHue(low, high, h), graphHue(low, high, h - 1.0 / 3.0));
}
`,
  body: `
  float value = texelFetch(uField, ivec2(gl_FragCoord.xy), 0).r;
  bool outside = graphPoint.x < uBounds.x || graphPoint.x > uBounds.y || graphPoint.y < uBounds.z || graphPoint.y > uBounds.w;
  if (outside || abs(value) >= 1e29 + 1e28) { outColor = vec4(0.0); return; }
  float ratio = clamp((value - uRange.x) / max(uRange.y - uRange.x, 1e-30), 0.0, 1.0);
  vec3 color = graphHsl(0.62 - ratio * 0.52, 0.76, 0.5);
  if (uContourStep > 0.0) {
    float band = value / uContourStep;
    float distance = abs(fract(band + 0.5) - 0.5) / max(fwidth(band), 1e-6);
    float line = 1.0 - clamp(distance - (0.75 * uPixelRatio - 0.5), 0.0, 1.0);
    color = mix(color, vec3(1.0), 0.55 * line);
  }
  outColor = vec4(color * uOpacity, uOpacity);`,
};

/** Heat-map uniforms from the CPU mesh's z range, so 2D and 3D share ramp and contour levels. */
export function graphGpuSurfaceHeatUniforms(range: { minimum: number; maximum: number }) {
  return {
    uRange: [range.minimum, range.maximum] as const,
    uContourStep: range.maximum > range.minimum ? graphSurfaceContourStep(range.minimum, range.maximum) : 0,
  };
}
