import { GRAPH_GPU_FIELD_LIMITS, type GraphGpuProgramV1, type GraphViewportV1 } from '../../contracts';
import { GRAPH_GPU_COMPLEX_PRELUDE } from './complex-program';
import { GRAPH_GPU_REAL_PRELUDE } from './real-program';

// WebGL2 field layer: compiles translated Graph programs into fullscreen
// fragment shaders, caches them by program key and shading, and evaluates
// them per pixel. Viewport and parameters are uniforms, so pan, zoom, and
// slider changes never recompile. Pixels are visual evaluation only.

export const GRAPH_GPU_MAX_PARAMETERS = GRAPH_GPU_FIELD_LIMITS.maximumParameters;
const PROGRAM_CACHE_LIMIT = 32;

export type GraphGpuProgram = GraphGpuProgramV1;

/**
 * A shading body appended after the program: GLSL statements that read
 * `vec2 graphPoint` (world coordinates of the pixel centre) and write
 * `outColor`. `graphFieldValue` helpers are generated per program kind.
 */
export type GraphGpuShading = { id: string; body: string };

/** Writes raw values (real: value, ok; complex: re, im, ok) for read-back. */
export const GRAPH_GPU_RAW_SHADING: GraphGpuShading = {
  id: 'raw',
  body: `
  bool ok;
  vec4 raw = graphFieldRaw(graphPoint, ok);
  outColor = vec4(raw.xy, ok ? 1.0 : 0.0, 1.0);`,
};

export type GraphGpuFieldUniforms = {
  viewport: Pick<GraphViewportV1, 'xMin' | 'xMax' | 'yMin' | 'yMax'>;
  parameters: readonly number[];
  extra?: Record<string, number | readonly number[]>;
};

export type GraphGpuFieldLayer = {
  readonly gl: WebGL2RenderingContext;
  readonly floatTargets: boolean;
  compile(program: GraphGpuProgram, shading: GraphGpuShading): { ok: true } | { ok: false; reason: string };
  draw(program: GraphGpuProgram, shading: GraphGpuShading, uniforms: GraphGpuFieldUniforms,
    size: { width: number; height: number }): boolean;
  /** Test/diagnostic read-back of raw values into a float target; never math authority. */
  readRaw(program: GraphGpuProgram, uniforms: GraphGpuFieldUniforms,
    size: { width: number; height: number }): Float32Array | null;
  readonly compiledPrograms: number;
  isContextLost(): boolean;
  dispose(): void;
};

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

function fragmentSource(program: GraphGpuProgram, shading: GraphGpuShading) {
  const field = program.kind === 'real'
    ? `vec4 graphFieldRaw(vec2 point, out bool ok) { return vec4(graphReal(point, ok), 0.0, 0.0, 0.0); }`
    : `vec4 graphFieldRaw(vec2 point, out bool ok) { return vec4(graphComplex(point, ok), 0.0, 0.0); }`;
  return `#version 300 es
precision highp float;
uniform vec4 uViewport;
uniform vec2 uSize;
uniform float uGraphParameters[${GRAPH_GPU_MAX_PARAMETERS}];
out vec4 outColor;
${program.kind === 'real' ? GRAPH_GPU_REAL_PRELUDE : GRAPH_GPU_COMPLEX_PRELUDE}
${program.glsl}
${field}
void main() {
  vec2 graphUnit = gl_FragCoord.xy / uSize;
  vec2 graphPoint = vec2(mix(uViewport.x, uViewport.y, graphUnit.x), mix(uViewport.z, uViewport.w, graphUnit.y));
${shading.body}
}`;
}

export function createGraphGpuFieldLayer(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  callbacks: { onContextLost?: () => void; onContextRestored?: () => void } = {},
): GraphGpuFieldLayer | null {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false }) as WebGL2RenderingContext | null;
  if (!gl) return null;
  const floatTargets = Boolean(gl.getExtension('EXT_color_buffer_float'));
  const programs = new Map<string, { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation | null> }>();
  let buffer: WebGLBuffer | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;
  let lost = false;
  // The lost event arrives asynchronously; the context reports loss at once.
  const unavailable = () => lost || gl.isContextLost();
  const onLost = (event: Event) => { event.preventDefault(); lost = true; programs.clear(); buffer = null; vertexArray = null; callbacks.onContextLost?.(); };
  const onRestored = () => { lost = false; callbacks.onContextRestored?.(); };
  canvas.addEventListener('webglcontextlost', onLost as EventListener);
  canvas.addEventListener('webglcontextrestored', onRestored as EventListener);

  const geometry = () => {
    if (vertexArray) return vertexArray;
    buffer = gl.createBuffer();
    vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return vertexArray;
  };

  const compileEntry = (program: GraphGpuProgram, shading: GraphGpuShading) => {
    const key = `${program.kind}:${program.key}:${shading.id}`;
    const cached = programs.get(key);
    if (cached) {
      programs.delete(key); programs.set(key, cached);
      return { ok: true as const, entry: cached };
    }
    if (program.parameterNames.length > GRAPH_GPU_MAX_PARAMETERS) return { ok: false as const, reason: 'too-many-parameters' };
    const shader = (type: number, source: string) => {
      const handle = gl.createShader(type);
      if (!handle) return null;
      gl.shaderSource(handle, source);
      gl.compileShader(handle);
      return gl.getShaderParameter(handle, gl.COMPILE_STATUS) ? handle : null;
    };
    const vertex = shader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource(program, shading));
    if (!vertex || !fragment) return { ok: false as const, reason: 'shader-compile-failed' };
    const handle = gl.createProgram();
    if (!handle) return { ok: false as const, reason: 'program-create-failed' };
    gl.attachShader(handle, vertex); gl.attachShader(handle, fragment);
    gl.bindAttribLocation(handle, 0, 'aPosition');
    gl.linkProgram(handle);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) return { ok: false as const, reason: 'program-link-failed' };
    const entry = { program: handle, uniforms: new Map<string, WebGLUniformLocation | null>() };
    programs.set(key, entry);
    while (programs.size > PROGRAM_CACHE_LIMIT) {
      const oldest = programs.keys().next().value!;
      gl.deleteProgram(programs.get(oldest)!.program);
      programs.delete(oldest);
    }
    return { ok: true as const, entry };
  };

  const bind = (entry: { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation | null> },
    uniforms: GraphGpuFieldUniforms, size: { width: number; height: number }) => {
    const location = (name: string) => {
      if (!entry.uniforms.has(name)) entry.uniforms.set(name, gl.getUniformLocation(entry.program, name));
      return entry.uniforms.get(name)!;
    };
    gl.useProgram(entry.program);
    const { viewport } = uniforms;
    gl.uniform4f(location('uViewport'), viewport.xMin, viewport.xMax, viewport.yMin, viewport.yMax);
    gl.uniform2f(location('uSize'), size.width, size.height);
    const parameters = new Float32Array(GRAPH_GPU_MAX_PARAMETERS);
    parameters.set(uniforms.parameters.slice(0, GRAPH_GPU_MAX_PARAMETERS));
    gl.uniform1fv(location('uGraphParameters[0]'), parameters);
    for (const [name, value] of Object.entries(uniforms.extra ?? {})) {
      if (typeof value === 'number') gl.uniform1f(location(name), value);
      else if (value.length === 2) gl.uniform2f(location(name), value[0]!, value[1]!);
      else if (value.length === 3) gl.uniform3f(location(name), value[0]!, value[1]!, value[2]!);
      else if (value.length === 4) gl.uniform4f(location(name), value[0]!, value[1]!, value[2]!, value[3]!);
    }
    gl.bindVertexArray(geometry());
    gl.viewport(0, 0, size.width, size.height);
  };

  return {
    gl,
    floatTargets,
    compile(program, shading) {
      if (unavailable()) return { ok: false, reason: 'context-lost' };
      const compiled = compileEntry(program, shading);
      return compiled.ok ? { ok: true } : compiled;
    },
    draw(program, shading, uniforms, size) {
      if (unavailable()) return false;
      const compiled = compileEntry(program, shading);
      if (!compiled.ok) return false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      bind(compiled.entry, uniforms, size);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    },
    readRaw(program, uniforms, size) {
      if (unavailable() || !floatTargets) return null;
      const compiled = compileEntry(program, GRAPH_GPU_RAW_SHADING);
      if (!compiled.ok) return null;
      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size.width, size.height, 0, gl.RGBA, gl.FLOAT, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
        bind(compiled.entry, uniforms, size);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const pixels = new Float32Array(size.width * size.height * 4);
        gl.readPixels(0, 0, size.width, size.height, gl.RGBA, gl.FLOAT, pixels);
        return pixels;
      } finally {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(framebuffer);
        gl.deleteTexture(texture);
      }
    },
    get compiledPrograms() { return programs.size; },
    isContextLost: unavailable,
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost as EventListener);
      canvas.removeEventListener('webglcontextrestored', onRestored as EventListener);
      if (!lost) {
        programs.forEach((entry) => gl.deleteProgram(entry.program));
        if (buffer) gl.deleteBuffer(buffer);
        if (vertexArray) gl.deleteVertexArray(vertexArray);
      }
      programs.clear();
    },
  };
}
