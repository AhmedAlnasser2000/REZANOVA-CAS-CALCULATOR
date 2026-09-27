# GRAPHING-GPU-FOUNDATION1 (Graphing Move 29)

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and outcome

- Date: 2026-09-27. Third move of the user-approved GPU visual-evaluation program. Root-only, directly on `main`, committed under the standing per-move authorization. No push.
- Gate type: backend. Outcome: **verified**. The foundation is in place; no Graph route draws with the GPU yet.

## Delivered

- Authority amendment in `graph-arc-authority-v1.md` ("GPU visual evaluation"):
  - defines visual evaluation;
  - adds the field-frame input and the parity chain;
  - sets the authority boundary (no trace, Analyze, export, cache, sampling, or evidence from pixels);
  - lists the fallback conditions;
  - adds the gesture uniform-update rule and the scoped Move 31 lane exception;
  - fixes code placement.
- `contracts/gpu-types.ts`:
  - serializable real/complex GPU program and op types;
  - `GraphRendererFieldFrameV1` and `InteractiveGraphFieldRenderer`;
  - a strict zod validator enforcing route/program agreement, parameter bounds, identifier-safe names, and GLSL size.
  - `rendererId` gains `gpu-field-webgl` in both the type and the schema.
- `renderers/gpu/real-program.ts`: compiled RPN plan → op list → GLSL (`graphReal`) plus a float32 interpreter. It covers all 34 real evaluator operators, with explicit guards for JavaScript `Math.pow` negative bases, `oddIntegerRoot`, JavaScript `%`, `Math.round`, logs, reciprocal trig, inverse domains, and the float32 finite limit. Unknown operators are refused.
- `renderers/gpu/complex-program.ts`: whitelisted MathJSON → op list → GLSL (`graphComplex`) plus a float32 interpreter. It mirrors the public complex evaluator's principal formulas, 1e-10 snapping, division/pole thresholds, integer powers by squaring, and principal roots. The op list is dimension-neutral so Move 35 can reuse it.
- `renderers/gpu/field-layer.ts`:
  - WebGL2 fullscreen-triangle field layer with a 32-entry LRU program cache keyed by program and shading;
  - uniform-only viewport/parameter updates;
  - synchronous context-loss detection (the lost event is async), float read-back for tests, and deterministic disposal.
- `renderers/gpu/policy.ts`:
  - `graphGpuViewportIsFloat32Safe` (8 float32 steps per pixel);
  - `nextGraphGpuRenderScale` (adaptive resolution: 0.8x on slow frames, 1.1x recovery, full scale when settled, minimum 0.35).
- `renderers/gpu-loader.ts`: `loadGraphGpuModule` via dynamic import; the gpu barrel is a lazy chunk.
- Ratchet: WebGL/GLSL only under `renderers/gpu|three`; GPU code only via the loader or type imports; `three/` may reuse only the pure translator and policy modules. Tests added.
- Setting `graphGpuRendering: 'auto' | 'off'` (default `auto`) wired through:
  - the TS `Settings` type and defaults;
  - the zod schema;
  - the feature-probe registry (26 keys, `shell-accessibility`);
  - Rust `Settings`/`Default`/`SettingsPatch`/sanitize/patch-apply, with a Rust unit test.
  - UI: a new Settings **Graphing** category (`GraphingSettingsPanel`) holding the toggle and the Graphics Diagnostics card, which moved from Runtime. No route consumes the setting until Move 30.
- `test:graph-gpu` script; the `e2e/graphing-gpu-parity.spec.ts` driver-parity spec (esbuild-bundled field layer in a blank page; opt-in `GRAPH_GPU_CHROME` hardware run).

## Findings

- The public complex evaluator returns `unsupported` for complex literals with non-integer parts (for example `["Complex",0.5,0.25]`), which the GPU translator would evaluate. Move 30 must enable the GPU complex route only where the CPU authority supports the expression.
- Pre-existing and out of scope: Notebook preferences are not part of the Rust `Settings` struct, so desktop `save_settings` likely drops them (recorded as an open question).
- `mod` with a modulus near 0 oscillates many times within one pixel; no driver can match pixel-for-pixel there. Node semantic parity covers variable moduli, and the browser spec uses a fixed modulus.
