# Vector Geometric Measures Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Vector provides exact parallelism, distance, two area measures, and 3D volume with bounded geometric interpretation.
- Exact answers remain canonical, copyable, replayable, and readable.

## Manual App Steps

1. In Vector, define `p=[1,0,0]`, `q=[0,2,0]`, and `r=[0,0,3]`.
2. Open the Ctrl keypad layer and confirm `parallel`, `distance`, `area`, `triArea`, and `volume` templates.
3. Run `parallelogramArea(p,q)` and confirm `2`; run `triangleArea(p,q)` and confirm `1`.
4. Run `volume(p,q,r)`, expand `3D Geometry`, and confirm answer `6`, normal `[0,0,2]`, signed triple `6`, and positive right-handed orientation.
5. Copy the result, collapse and reopen the details, then replay it from History.
6. Run `volume([1,0],[0,1],[1,1])` and confirm the controlled 3D-only error.

## Expected Results

- Exact results and copy remain unchanged after History replay.
- Only 3D results claim a normal or orientation.
- The answer, evidence, error, and History cards remain readable without horizontal overflow.
