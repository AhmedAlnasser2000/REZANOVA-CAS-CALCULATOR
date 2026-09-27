import type { GraphGpuShading } from './field-layer';

// Complex-plane shading for GPU domain coloring and the 2x2 component maps.
// Colours reproduce the CPU tile palettes (`sampling/complex.ts` phaseColor
// and the viewport's accessible/scalar palettes) so switching renderers never
// changes what a colour means. Uniforms:
//   uMode 0 = domain colouring, 1 = components; uPalette 0 = standard,
//   1 = colour-vision-friendly; uComponentScale = (|Re|max, |Im|max, |f|max)
//   from the last CPU tile (display normalisation only).

export const GRAPH_GPU_COMPLEX_SHADING: GraphGpuShading = {
  id: 'complex-domain-v1',
  declarations: `
uniform int uMode;
uniform int uPalette;
uniform vec3 uComponentScale;
`,
  body: `
  vec2 unit = gl_FragCoord.xy / uSize;
  vec2 local = unit;
  int quadrant = 0;
  if (uMode == 1) {
    local = fract(unit * 2.0);
    quadrant = (unit.x >= 0.5 ? 1 : 0) + (unit.y >= 0.5 ? 0 : 2);
  }
  vec2 point = vec2(mix(uViewport.x, uViewport.y, local.x), mix(uViewport.z, uViewport.w, local.y));
  bool ok;
  vec2 w = graphComplex(point, ok);
  vec3 undefinedColor = vec3(8.0, 17.0, 20.0) / 255.0;
  if (!ok) { outColor = vec4(undefinedColor, 1.0); return; }
  float magnitude = length(w);
  float phase = (w.x == 0.0 && w.y == 0.0) ? 0.0 : atan(w.y, w.x);
  const float TAU = 6.28318530718;
  if (uMode == 0) {
    float hue = fract(phase / TAU + 1.0);
    if (uPalette == 1) {
      float triangular = 1.0 - abs(hue * 2.0 - 1.0);
      float ring = 0.78 + 0.18 * cos(log2(1.0 + magnitude) * TAU);
      outColor = vec4(vec3(28.0 + 218.0 * hue, 74.0 + 126.0 * triangular, 208.0 - 152.0 * hue) * ring / 255.0, 1.0);
      return;
    }
    float lightness = clamp(0.5 + 0.08 * cos(log2(1.0 + magnitude) * TAU), 0.24, 0.72);
    float saturation = 0.78;
    vec3 k = mod(vec3(0.0, 8.0, 4.0) + hue * 12.0, 12.0);
    vec3 rgb = lightness - saturation * min(lightness, 1.0 - lightness)
      * max(vec3(-1.0), min(min(k - 3.0, 9.0 - k), vec3(1.0)));
    outColor = vec4(floor(rgb * 255.0 + 0.5) / 255.0, 1.0);
    return;
  }
  float value = quadrant == 0 ? w.x : quadrant == 1 ? w.y : quadrant == 2 ? magnitude : phase;
  if (quadrant == 3) {
    float angle = fract(value / TAU + 1.0) * TAU;
    outColor = vec4((cos(vec3(angle, angle - 2.094, angle + 2.094)) + 1.0) * 127.5 / 255.0, 1.0);
    return;
  }
  float scale = max(1e-6, quadrant == 0 ? uComponentScale.x : quadrant == 1 ? uComponentScale.y : uComponentScale.z);
  float n = clamp(value / scale, -1.0, 1.0);
  vec3 color = n >= 0.0
    ? vec3(40.0 + n * 215.0, 70.0 + n * 120.0, 110.0 - n * 70.0)
    : vec3(40.0 - n * 50.0, 70.0 - n * 100.0, 110.0 - n * 145.0);
  outColor = vec4(color / 255.0, 1.0);`,
};
