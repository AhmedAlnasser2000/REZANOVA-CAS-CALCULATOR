import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { compileGraphExpression } from '../../evaluator';
import { translateGraphRealPlan } from '../gpu/real-program';
import { createGraphGpuSurface } from './gpu-surface';

function program() {
  const compiled = compileGraphExpression({ planId: 'wave', sourceRevision: 3, expression: {
    mathJson: ['Multiply', 'a', ['Sin', 'x'], ['Cos', 'y']], freeSymbols: ['a', 'x', 'y'] } });
  if (!compiled.ok) throw new Error(compiled.stopReason.detailCode);
  const translated = translateGraphRealPlan(compiled.plan);
  if (!('kind' in translated)) throw new Error(translated.reason);
  return translated;
}

function compiledShader(surface: ReturnType<typeof createGraphGpuSurface>) {
  const shader = {
    uniforms: {} as Record<string, { value: unknown }>,
    vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',
    fragmentShader: '#include <common>\n#include <color_fragment>\n#include <opaque_fragment>',
  };
  surface.mesh.material.onBeforeCompile(shader as never, undefined as never);
  return shader;
}

describe('Graph GPU surfaces (Three)', () => {
  it('evaluates the program per vertex over a unit grid and never takes picks', () => {
    const surface = createGraphGpuSurface({ itemId: 'wave', marker: 's1', program: program(), resolution: 64 });
    expect(surface.key).toBe('wave@3');
    expect(surface.mesh.geometry.getAttribute('position').count).toBe(64 * 64);
    expect(surface.mesh.geometry.getIndex()!.count).toBe(63 * 63 * 6);
    expect(surface.mesh.frustumCulled).toBe(false);
    const hits: THREE.Intersection[] = [];
    surface.mesh.raycast(new THREE.Raycaster(new THREE.Vector3(0.5, 0.5, 5), new THREE.Vector3(0, 0, -1)), hits);
    expect(hits).toEqual([]);
    const shader = compiledShader(surface);
    expect(shader.vertexShader).toContain('// graph-surface:s1');
    expect(shader.vertexShader).toContain('float graphReal(vec2 p, out bool ok)');
    expect(shader.vertexShader).toContain('vec3 transformed = vec3(graphPoint, graphOk ? graphZ : 0.0);');
    expect(shader.fragmentShader).toContain('if (vGraphOk < 0.999) discard;');
    expect(surface.mesh.material.customProgramCacheKey()).toBe('graph-surface:wave@3');
  });

  it('moves domain, parameters, range, and grid through uniforms and geometry only', () => {
    const surface = createGraphGpuSurface({ itemId: 'wave', marker: 's1', program: program(), resolution: 65 });
    const shader = compiledShader(surface);
    surface.update({ domain: { xMin: -4, xMax: 4, yMin: -2, yMax: 2 }, parameters: [1.5], range: { minimum: -1.5, maximum: 1.5 } });
    expect(Array.from(shader.uniforms.uGraphParameters!.value as Float32Array).slice(0, 2)).toEqual([1.5, 0]);
    expect((shader.uniforms.uGraphDomain!.value as THREE.Vector4).toArray()).toEqual([-4, 4, -2, 2]);
    expect((shader.uniforms.uGraphStep!.value as THREE.Vector2).toArray()).toEqual([8 / 64 / 2, 4 / 64 / 2]);
    expect((shader.uniforms.uGraphRange!.value as THREE.Vector2).toArray()).toEqual([-1.5, 1.5]);
    // Same 1/2/5 contour step as the CPU contour lines: span 3 -> 0.5.
    expect(shader.uniforms.uGraphContourStep!.value).toBe(0.5);
    const material = surface.mesh.material;
    surface.setResolution(33);
    expect(surface.mesh.material).toBe(material);
    expect(surface.mesh.geometry.getAttribute('position').count).toBe(33 * 33);
    expect((shader.uniforms.uGraphStep!.value as THREE.Vector2).toArray()).toEqual([8 / 32 / 2, 4 / 32 / 2]);
    surface.setContourStyle({ color: new THREE.Color(0.2, 0.4, 0.8), widthPixels: 4.5, opacity: 0.7 });
    expect((shader.uniforms.uGraphContourColor!.value as THREE.Vector3).toArray()).toEqual([0.2, 0.4, 0.8]);
    expect(shader.uniforms.uGraphContourWidth!.value).toBe(4.5);
  });
});
