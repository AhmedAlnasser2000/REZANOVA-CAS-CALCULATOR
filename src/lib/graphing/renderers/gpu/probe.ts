// Self-contained WebGL2 capability probe for Graph GPU feasibility and the
// Settings graphics diagnostics readout. `runWebglProbe` is also serialized
// with `Function.prototype.toString` and injected into Chromium, WebKit, and
// the packaged Tauri webview by `tools/graph-gpu/`, so it must not close over
// module scope or import anything. Probe output is display/diagnostic
// evidence only; it never feeds Graph mathematics.

export type GraphWebglProbeResultV1 = {
  userAgent: string;
  webgl2: boolean;
  renderer: string | null;
  vendor: string | null;
  unmaskedRenderer: string | null;
  unmaskedVendor: string | null;
  software: boolean | null;
  extensions: Record<string, boolean>;
  highpFloat: { rangeMin: number; rangeMax: number; precision: number } | null;
  maxTextureSize: number | null;
  maxRenderbufferSize: number | null;
  fieldShader: {
    floatTarget: boolean;
    maxAbsError: number | null;
    samples: number;
    elapsedMs: number | null;
  } | null;
  error: string | null;
};

export function runWebglProbe(): GraphWebglProbeResultV1 {
  const result: GraphWebglProbeResultV1 = {
    userAgent: navigator.userAgent,
    webgl2: false,
    renderer: null,
    vendor: null,
    unmaskedRenderer: null,
    unmaskedVendor: null,
    software: null,
    extensions: {},
    highpFloat: null,
    maxTextureSize: null,
    maxRenderbufferSize: null,
    fieldShader: null,
    error: null,
  };
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) {
      result.error = 'webgl2-context-unavailable';
      return result;
    }
    result.webgl2 = true;
    result.renderer = gl.getParameter(gl.RENDERER);
    result.vendor = gl.getParameter(gl.VENDOR);
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      result.unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    }
    const rendererText = `${result.unmaskedRenderer ?? ''} ${result.renderer ?? ''}`.toLowerCase();
    // WebKit (including the packaged WebKitGTK webview) masks the renderer as a
    // generic string such as "Apple GPU"; hardware vs software is then unknown.
    const masked = !result.unmaskedRenderer || /^apple gpu$|^webkit webgl$/i.test(result.unmaskedRenderer.trim());
    result.software = /swiftshader|llvmpipe|softpipe|software|basic render/.test(rendererText)
      ? true
      : masked ? null : false;
    for (const name of [
      'EXT_color_buffer_float',
      'EXT_float_blend',
      'OES_texture_float_linear',
      'EXT_disjoint_timer_query_webgl2',
      'KHR_parallel_shader_compile',
    ]) {
      result.extensions[name] = Boolean(gl.getExtension(name));
    }
    const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    result.highpFloat = precision
      ? { rangeMin: precision.rangeMin, rangeMax: precision.rangeMax, precision: precision.precision }
      : null;
    result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    result.maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    // Field-shader smoke: evaluate f(x, y) = sin(3x) * cos(2y) + x*y per pixel
    // into an RGBA32F target and compare a few pixels with float64 JavaScript.
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('shader-create');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`shader-compile: ${gl.getShaderInfoLog(shader)}`);
      }
      return shader;
    };
    const program = gl.createProgram();
    if (!program) throw new Error('program-create');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float;
uniform vec4 uBounds;
uniform vec2 uSize;
out vec4 outValue;
void main() {
  vec2 t = gl_FragCoord.xy / uSize;
  float x = mix(uBounds.x, uBounds.y, t.x);
  float y = mix(uBounds.z, uBounds.w, t.y);
  outValue = vec4(sin(3.0 * x) * cos(2.0 * y) + x * y, x, y, 1.0);
}`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program-link: ${gl.getProgramInfoLog(program)}`);
    }
    const floatTargets = result.extensions.EXT_color_buffer_float === true;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, floatTargets ? gl.RGBA32F : gl.RGBA8, 64, 64, 0,
      gl.RGBA, floatTargets ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const location = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const bounds = [-2, 2, -2, 2];
    gl.uniform4f(gl.getUniformLocation(program, 'uBounds'), bounds[0]!, bounds[1]!, bounds[2]!, bounds[3]!);
    gl.uniform2f(gl.getUniformLocation(program, 'uSize'), 64, 64);
    gl.viewport(0, 0, 64, 64);
    const started = performance.now();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const field: NonNullable<GraphWebglProbeResultV1['fieldShader']> = { floatTarget: floatTargets && complete, maxAbsError: null, samples: 0, elapsedMs: null };
    if (floatTargets && complete) {
      const pixels = new Float32Array(64 * 64 * 4);
      gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.FLOAT, pixels);
      field.elapsedMs = performance.now() - started;
      let maxError = 0;
      for (const [column, row] of [[0, 0], [13, 41], [32, 32], [50, 7], [63, 63]]) {
        const x = bounds[0]! + (column + 0.5) / 64 * (bounds[1]! - bounds[0]!);
        const y = bounds[2]! + (row + 0.5) / 64 * (bounds[3]! - bounds[2]!);
        const expected = Math.sin(3 * x) * Math.cos(2 * y) + x * y;
        maxError = Math.max(maxError, Math.abs(pixels[(row * 64 + column) * 4]! - expected));
        field.samples += 1;
      }
      field.maxAbsError = maxError;
    }
    result.fieldShader = field;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  return result;
}
