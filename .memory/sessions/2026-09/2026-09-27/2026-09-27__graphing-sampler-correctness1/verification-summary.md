# GRAPHING-SAMPLER-CORRECTNESS1 verification

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

## Checks

- Unit tests:
  - `complex-branch-geometry.test.ts` 6/6 (parser MathJSON shapes, shifted/rotated/negated cuts, inverse trig, powers, unresolved, clipping)
  - `implicit.test.ts` 10/10, including the new wide-budget partial-coverage and domain-edge coverage cases
  - `analyze.test.ts` 10/10, including the new shifted-log/non-affine case
  - `request.test.ts` 22/22 (cut family and point asserted)
- Graph test scripts:
  - `test:graph-contracts` 13/13
  - `test:graph-parser` 27/27
  - `test:graph-sampling` 65/65
  - `test:graph-scene` 11/11
  - `test:graph-ooe` 51/51
- `npx tsc -b`: pass. ESLint on every changed TS/MJS file: pass. `npm run test:file-sizes`: pass (`implicit.ts` 708 lines).
- Playwright chromium `e2e/graphing-sampler-correctness.spec.ts` 2/2. Screenshots were inspected:
  - the `log(z-1)` dashed cut starts at z=1 along the colour seam;
  - the mid-gesture tile follows the zoom at its true position, and `data-tile-bounds` is unchanged until settle;
  - the zoomed-out mixed-power graph is drawn with "Reduced detail" instead of blank or "Could not resolve";
  - the nested-log k=0 and k=1 waves are continuous, with an honest uncertainty status for the sub-pixel edge branch.
- Playwright chromium `graphing-minimum-visible.spec.ts` and `graphing-performance.spec.ts`: 28 passed, 2 failed. Both failures reproduce on the committed baseline with this move's changes stashed (see completion report).
- Benchmark (`test:graph-bench`, RTX, 1440x940), complex zoom:
  - 12-13 live repaints during input (first at 42-48 ms) and 0 new tiles mid-gesture;
  - the last tile arrives 260 ms (quadratic) / 334 ms (log-pole) after input, versus 756 / 1081 ms at baseline.
  - Real implicit resampling timing is unchanged (no gesture lane until Move 31).
- Implicit microbenchmark on the perf workload (1032x596): identical sample counts old versus new; best-of-5 time within ~10%.
- `npm run test:memory-protocol` and `git diff --check`: pass. Preview and Playwright processes were stopped.

## Durable memory updated

- `.memory/current-state.md`, `.memory/journal/2026-09/2026-09-27.md`, `.memory/decisions.md`, `.memory/open-questions.md`, and this dossier.
