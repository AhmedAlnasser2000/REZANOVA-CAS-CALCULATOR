# TRACK-PGL-VIS1 Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now
- `PGL-VIS1` adds a developer-only interactive Labs console behind `VITE_SHOW_LABS=1` and `VITE_ENABLE_LAB_RUNNERS=1`.
- Labs can run approved local runners through the Vite dev bridge without stable `src/` importing `playground/` code.
- First runners:
  - `sym-search-planner-ordering` for equation and corpus-case comparison.
  - `expression-baseline-probe` for expression-shaped visual runner proof over stable Calculate behavior.
- Results are labeled experimental and stay separate from normal calculator history/provenance.

## Manual App Steps
- Launch:
  - `VITE_SHOW_LABS=1 VITE_ENABLE_LAB_RUNNERS=1 npm run tauri:dev`
- Open `Labs`.
- Confirm catalog details still show the one-way boundary and inert Playground paths.
- In `Interactive Runner`, select `Symbolic Search Planner Ordering`.
- Run the default corpus case and one custom equation such as `\sin\left(x^2+x\right)=\frac{1}{2}`.
- Select `Expression Baseline Probe`.
- Run an expression such as `\frac{1}{3}+\frac{1}{6}`.
- Confirm results show experimental/developer-only framing and do not enter normal calculator history.

## Expected Results
- Labs remains hidden unless `VITE_SHOW_LABS=1`.
- Runner controls remain hidden unless `VITE_ENABLE_LAB_RUNNERS=1`.
- Equation/corpus runner shows planner comparison rows, classifications, winning stages, and attempt counts.
- Expression runner shows the stable Calculate probe result, including `\frac{1}{2}` for the default expression.
- Unsupported input kinds are disabled per selected runner.
- Release builds still compile without enabling Playground execution.

## Verification Commands
- `npm run test:labs-catalog`
- `npm run test:playground`
- `npm run test:unit -- src/lib/labs/runner-registry.test.ts src/lib/labs/catalog.test.ts`
- `npm run test:ui -- src/components/LabsPanel.ui.test.tsx`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`

## Dev Bridge Smoke
- `VITE_SHOW_LABS=1 VITE_ENABLE_LAB_RUNNERS=1 npm run dev`
- `curl -s http://127.0.0.1:1420/__calcwiz_labs/runners`
- `curl -s -X POST http://127.0.0.1:1420/__calcwiz_labs/run -H 'Content-Type: application/json' --data '{"runnerId":"expression-baseline-probe","inputKind":"expression","latex":"\\frac{1}{3}+\\frac{1}{6}"}'`
- `curl -s -X POST http://127.0.0.1:1420/__calcwiz_labs/run -H 'Content-Type: application/json' --data '{"runnerId":"sym-search-planner-ordering","inputKind":"equation","latex":"\\sin\\left(x^2+x\\right)=\\frac{1}{2}"}'`
