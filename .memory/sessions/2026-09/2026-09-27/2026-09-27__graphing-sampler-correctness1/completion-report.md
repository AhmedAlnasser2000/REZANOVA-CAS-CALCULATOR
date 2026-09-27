# GRAPHING-SAMPLER-CORRECTNESS1 (Graphing Move 28)

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

- Date: 2026-09-27. Second move of the user-approved GPU visual-evaluation program (plan in `2026-09-27__graphing-gpu-feasibility1/program-plan.md`). Root-only, directly on `main`, committed per the user's standing "don't stop at each gate" authorization. No push.
- Gate type: ui. Outcome: **verified**. The CPU authority that later GPU moves compare against no longer makes false branch claims, no longer blanks on budget exhaustion, and no longer drops domain-edge contours.

## Delivered

- `sampling/complex-branch-geometry.ts`: one shared extractor for arguments affine in z (`a*z+b` over Add/Subtract/Negate/Multiply/Divide/Complex/Rational/numeric/parameter leaves). It places principal log/root/power points and cuts at `-b/a` with the cut rotated by `1/a`, plus arcsin/arccos and arctan cuts. A viewport ray clip is included. Non-affine and unmodelled (Arsinh/Arcosh/Artanh) arguments are reported as unresolved.
- `sampling/complex.ts`: tiles use that geometry; unresolved branch geometry marks `analyticity: 'unknown'` instead of `holomorphic`.
- `analysis/analyze.ts`: the operator-name `branchPointsFor` is removed. Only affine-located points are `exact-proved`; unresolved arguments emit `inconclusive` with `branch-geometry-non-affine-argument`. Before this, `log(z-1)` "proved" a branch point at 0.
- `sampling/implicit.ts`: breadth-first refinement queue. Refinement gets 85% of the sample/time budget and extraction keeps the rest. Budget exhaustion keeps unrefined cells as coarse leaves, extraction falls back to sign-bracketed linear roots, and vertex-budget overflow keeps emitted geometry. Partial results return `budget-exhausted` geometry instead of nothing. Mixed finite/non-finite cells subdivide to the boundary target; only mixed cells unresolved at target size raise `region-topology-inconclusive`, and fully undefined cells no longer do.
- `GraphComplexViewport.tsx`: SVG-style live viewport. Gestures re-place the last tile each animation frame at its true bounds, commit on pointer release or `WHEEL_SETTLE_MS` (shared `graph-gesture-timing.ts`), trace maps through the live viewport and quadrant, tile rasters are memoized, and `data-tile-bounds` marks committed tiles. The status reads "N branch cut(s) in view" or "branch geometry not determined".
- `tools/graph-bench`: a new `complexTiles` channel, since repaints now use `drawImage` during gestures.
- `e2e/graphing-sampler-correctness.spec.ts` plus unit tests.

## Findings

- Wide `x*y^(sin x - cos x) = y^(3x)` (x in [-20,20]) at the settled budget: 0 vertices before, 129 now, spread from x≈0.2 to 20. At the preview budget: none before, partial now.
- `sin(ln(cos y + x)) = 0` row coverage on 800 px: branch k=0 100%; branch k=-1 (`x+cos y=e^-pi`, ~4 px from the undefined region) 98.5% versus ~3% before. Refining domain-edge cells finer only added the invisible k=-2 branch at +80% samples, so it was rejected.
- On ordinary implicit items the sample counts are identical and timing is within ~10%.
- Pre-existing, unrelated to this move (fail identically on `1a8c1d7b` without these changes): `graphing-performance.spec.ts` first preview ≈233-255 ms against the 150 ms budget under 4x throttle, and the `graphing-minimum-visible.spec.ts:599` piecewise Add Item focus assertion. Recorded as an open question.
