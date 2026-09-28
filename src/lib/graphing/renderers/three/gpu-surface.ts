import * as THREE from 'three';
import { GRAPH_GPU_FIELD_LIMITS, type GraphGpuRealProgramV1, type GraphGpuSurfaceGridV1 } from '../../contracts';
import { graphSurfaceContourStep } from '../../sampling/surface-contours';
import { GRAPH_GPU_REAL_PRELUDE } from '../gpu/real-program';

// Vertex-shader real surfaces: a unit grid whose vertex shader evaluates
// z = f(x, y) from the translated Graph program, with finite-difference
// normals, the CPU mesh's height ramp, and 1 px iso-contours at the CPU
// contour levels. Domain and parameters are uniforms, so sliders never
// rebuild geometry or recompile. Display only: picking, trace, bounds, and
// export keep reading the CPU mesh.

const PARAMETERS = GRAPH_GPU_FIELD_LIMITS.maximumParameters;

export type GraphGpuSurfaceRange = { minimum: number; maximum: number };

export type GraphGpuSurface = {
  readonly itemId: string;
  /** Program identity; a different key needs a new surface. */
  readonly key: string;
  readonly resolution: number;
  /** Swaps the grid only; the compiled program is kept. */
  setResolution(resolution: number): void;
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  update(input: { domain: GraphGpuSurfaceGridV1['domain']; parameters: readonly number[]; range: GraphGpuSurfaceRange | null }): void;
  /** Contour lines follow the item's stroke, like the CPU contour lines. */
  setContourStyle(style: { color: THREE.Color; widthPixels: number; opacity: number }): void;
  dispose(): void;
};

export function graphGpuSurfaceKey(program: GraphGpuRealProgramV1) {
  return program.key;
}

function unitGrid(resolution: number) {
  const positions = new Float32Array(resolution * resolution * 3);
  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution; column += 1) {
      const offset = (row * resolution + column) * 3;
      positions[offset] = column / (resolution - 1);
      positions[offset + 1] = row / (resolution - 1);
    }
  }
  const indices = new Uint32Array((resolution - 1) * (resolution - 1) * 6);
  let cursor = 0;
  for (let row = 0; row + 1 < resolution; row += 1) {
    for (let column = 0; column + 1 < resolution; column += 1) {
      const corner = row * resolution + column;
      indices.set([corner, corner + 1, corner + resolution + 1, corner, corner + resolution + 1, corner + resolution], cursor);
      cursor += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

const VERTEX_DECLARATIONS = `
uniform float uGraphParameters[${PARAMETERS}];
uniform vec4 uGraphDomain;
uniform vec2 uGraphStep;
varying float vGraphZ;
varying float vGraphOk;
${GRAPH_GPU_REAL_PRELUDE}`;

const VERTEX_SURFACE = `
  vec2 graphPoint = vec2(mix(uGraphDomain.x, uGraphDomain.y, position.x), mix(uGraphDomain.z, uGraphDomain.w, position.y));
  bool graphOk;
  float graphZ = graphReal(graphPoint, graphOk);
  // The CPU sampler drops non-finite and |z| > 1e8 samples; so does the GPU.
  graphOk = graphOk && abs(graphZ) <= 1e8;
  bool graphOkE; bool graphOkW; bool graphOkN; bool graphOkS;
  float graphE = graphReal(graphPoint + vec2(uGraphStep.x, 0.0), graphOkE);
  float graphW = graphReal(graphPoint - vec2(uGraphStep.x, 0.0), graphOkW);
  float graphN = graphReal(graphPoint + vec2(0.0, uGraphStep.y), graphOkN);
  float graphS = graphReal(graphPoint - vec2(0.0, uGraphStep.y), graphOkS);
  float graphDx = graphOkE && graphOkW ? (graphE - graphW) / (2.0 * uGraphStep.x) : 0.0;
  float graphDy = graphOkN && graphOkS ? (graphN - graphS) / (2.0 * uGraphStep.y) : 0.0;
  vec3 objectNormal = normalize(vec3(-graphDx, -graphDy, 1.0));
  vGraphZ = graphZ;
  vGraphOk = graphOk ? 1.0 : 0.0;`;

// Matches THREE.Color.setHSL, which the CPU mesh uses for its vertex colours.
const FRAGMENT_DECLARATIONS = `
uniform vec2 uGraphRange;
uniform float uGraphContourStep;
uniform vec3 uGraphContourColor;
uniform float uGraphContourWidth;
uniform float uGraphContourOpacity;
varying float vGraphZ;
varying float vGraphOk;
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
}`;

const FRAGMENT_COLOR = `
  // Triangles touching an undefined vertex are domain breaks, as on the CPU.
  if (vGraphOk < 0.999) discard;
  float graphRatio = clamp((vGraphZ - uGraphRange.x) / max(uGraphRange.y - uGraphRange.x, 1e-30), 0.0, 1.0);
  diffuseColor.rgb *= graphHsl(0.62 - graphRatio * 0.52, 0.76, 0.5);`;

const FRAGMENT_CONTOUR = `
  if (uGraphContourStep > 0.0) {
    float graphBand = vGraphZ / uGraphContourStep;
    float graphDistance = abs(fract(graphBand + 0.5) - 0.5) / max(fwidth(graphBand), 1e-6);
    float graphLine = 1.0 - clamp(graphDistance - (uGraphContourWidth * 0.5 - 0.5), 0.0, 1.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uGraphContourColor, uGraphContourOpacity * graphLine);
  }`;

/**
 * Builds a GPU surface. `marker` tags the shader source so a compile error
 * reported by Three can be attributed back to this item.
 */
export function createGraphGpuSurface(input: {
  itemId: string;
  marker: string;
  program: GraphGpuRealProgramV1;
  resolution: number;
}): GraphGpuSurface {
  const { itemId, program } = input;
  let resolution = input.resolution;
  let domain: GraphGpuSurfaceGridV1['domain'] = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  const applyStep = () => uniforms.uGraphStep.value.set(
    (domain.xMax - domain.xMin) / (resolution - 1) / 2,
    (domain.yMax - domain.yMin) / (resolution - 1) / 2,
  );
  const uniforms = {
    uGraphParameters: { value: new Float32Array(PARAMETERS) },
    uGraphDomain: { value: new THREE.Vector4(-1, 1, -1, 1) },
    uGraphStep: { value: new THREE.Vector2(1e-3, 1e-3) },
    uGraphRange: { value: new THREE.Vector2(0, 1) },
    uGraphContourStep: { value: 0 },
    uGraphContourColor: { value: new THREE.Vector3(1, 1, 1) },
    uGraphContourWidth: { value: 1 },
    uGraphContourOpacity: { value: 0.62 },
  };
  const material = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n// graph-surface:${input.marker}\n${VERTEX_DECLARATIONS}\n${program.glsl}`)
      .replace('#include <beginnormal_vertex>', VERTEX_SURFACE)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(graphPoint, graphOk ? graphZ : 0.0);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_DECLARATIONS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>${FRAGMENT_COLOR}`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>${FRAGMENT_CONTOUR}`);
  };
  // Three reuses one compiled program per key: new domains, parameters, and
  // grids of the same program never recompile.
  material.customProgramCacheKey = () => `graph-surface:${program.key}`;
  const mesh = new THREE.Mesh(unitGrid(resolution), material);
  mesh.name = 'graph-gpu-surface';
  // The shader displaces a flat grid: bounds are unknown to Three, and picking
  // belongs to the CPU mesh.
  mesh.frustumCulled = false;
  mesh.raycast = () => undefined;
  return {
    itemId,
    key: graphGpuSurfaceKey(program),
    get resolution() { return resolution; },
    mesh,
    setResolution(next) {
      if (next === resolution) return;
      resolution = next;
      mesh.geometry.dispose();
      mesh.geometry = unitGrid(resolution);
      applyStep();
    },
    update({ domain: nextDomain, parameters, range }) {
      domain = nextDomain;
      uniforms.uGraphParameters.value.fill(0);
      uniforms.uGraphParameters.value.set(parameters.slice(0, PARAMETERS));
      uniforms.uGraphDomain.value.set(domain.xMin, domain.xMax, domain.yMin, domain.yMax);
      applyStep();
      if (range) {
        uniforms.uGraphRange.value.set(range.minimum, range.maximum);
        uniforms.uGraphContourStep.value = graphSurfaceContourStep(range.minimum, range.maximum);
      }
    },
    setContourStyle({ color, widthPixels, opacity }) {
      uniforms.uGraphContourColor.value.set(color.r, color.g, color.b);
      uniforms.uGraphContourWidth.value = widthPixels;
      uniforms.uGraphContourOpacity.value = opacity;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      mesh.removeFromParent();
    },
  };
}
