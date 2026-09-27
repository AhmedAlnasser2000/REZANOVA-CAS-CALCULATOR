// Browser-side instrumentation injected before any page script runs. It is
// renderer-agnostic so the same metrics stay meaningful before and after the
// GPU moves: SVG geometry rewrites, 2D-canvas image draws, WebGL draws, WebGL
// shader compiles, rAF frame intervals, and long tasks.
// Serialized with Function.prototype.toString; keep it free of module scope.

export function installGraphBenchInstrumentation() {
  const state = {
    svgGeometryWrites: [],
    canvasImageDraws: [],
    webglDraws: [],
    shaderCompiles: 0,
    longTasks: [],
    frames: null,
  };
  window.__graphBench = state;

  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function drawImage(...args) {
    if (this.canvas.isConnected) state.canvasImageDraws.push(performance.now());
    return originalDrawImage.apply(this, args);
  };
  for (const Context of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) {
    if (!Context) continue;
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = Context.prototype[method];
      if (!original) continue;
      Context.prototype[method] = function patchedDraw(...args) {
        state.webglDraws.push(performance.now());
        return original.apply(this, args);
      };
    }
    const originalCompile = Context.prototype.compileShader;
    Context.prototype.compileShader = function compileShader(...args) {
      state.shaderCompiles += 1;
      return originalCompile.apply(this, args);
    };
  }
  const observeGeometry = () => {
    new MutationObserver((records) => {
      const now = performance.now();
      for (const record of records) {
        // Only sampled Graph geometry counts; grid/tick redraws happen every
        // gesture frame and are not a resampled result.
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        if (!target?.closest('.graph-svg-sampled-geometry')) continue;
        if (record.attributeName === 'd' || record.type === 'childList') {
          state.svgGeometryWrites.push(now);
          break;
        }
      }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['d'] });
  };
  if (document.documentElement) observeGeometry();
  else document.addEventListener('DOMContentLoaded', observeGeometry, { once: true });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) state.longTasks.push({ time: entry.startTime, duration: entry.duration });
    }).observe({ entryTypes: ['longtask'] });
  } catch { /* longtask unsupported (WebKit) */ }

  window.__graphBenchStartFrames = () => {
    const record = { active: true, frames: [] };
    state.frames = record;
    const tick = (time) => {
      if (!record.active) return;
      record.frames.push(time);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.__graphBenchStopFrames = () => {
    if (state.frames) state.frames.active = false;
    return state.frames?.frames ?? [];
  };
  window.__graphBenchMark = () => ({
    time: performance.now(),
    svgGeometryWrites: state.svgGeometryWrites.length,
    canvasImageDraws: state.canvasImageDraws.length,
    webglDraws: state.webglDraws.length,
    shaderCompiles: state.shaderCompiles,
    longTasks: state.longTasks.length,
  });
  window.__graphBenchSince = (mark, inputEnd) => {
    const channel = (values, from) => {
      const times = values.slice(from);
      return {
        count: times.length,
        duringInput: times.filter((time) => time <= inputEnd).length,
        firstMs: times.length ? Number((times[0] - mark.time).toFixed(1)) : null,
        lastAfterInputMs: times.length ? Number((times.at(-1) - inputEnd).toFixed(1)) : null,
      };
    };
    const longTasks = state.longTasks.slice(mark.longTasks);
    return {
      svgGeometry: channel(state.svgGeometryWrites, mark.svgGeometryWrites),
      canvasImage: channel(state.canvasImageDraws, mark.canvasImageDraws),
      webgl: channel(state.webglDraws, mark.webglDraws),
      shaderCompiles: state.shaderCompiles - mark.shaderCompiles,
      longTaskCount: longTasks.length,
      longestTaskMs: Math.round(Math.max(0, ...longTasks.map((task) => task.duration))),
    };
  };
}
