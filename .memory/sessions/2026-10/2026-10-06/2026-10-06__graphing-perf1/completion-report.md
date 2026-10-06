# GRAPHING-PERF1: touching curves always visible, timings restored

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

- Date: 2026-10-06. First gate of the approved plan GRAPHING-PERF1 → GRAPHING-UI1 → PTX4 → Move 33. The user reported (x − y)² = 0 and x² + y² = 0 invisible in their app (`npm run dev`, Chrome, real GPU) and asked for proof by pixel check and screenshots; performance target: the pre-PTX-ENGINE1 timings with every proof kept (the old 150 ms first-preview budget miss stays open). One commit, no push.
- Outcome: **verified** (backend + ui).

## Delivered

- **Touching curves never hidden.** Root cause: while the GPU field draws an implicit item, the SVG renderer hid every CPU path of that item, and the shader draws only sign changes. Touching curves are now their own path `:touching:N` (chained in curve order by `chainTouchingPoints`, near-duplicate corner points walked through but not drawn) that GPU suppression skips; a single point with no neighbour is an isolated point, emitted as a filled point batch `:isolated:N` (dot name "Point").
- **GPU shader:** a crossing now needs strictly negative and strictly positive values nearby. Pixel centres exactly on y = x (F = 0 in fp32) used to count as a sign change, so the GPU painted (x − y)² = 0 by luck and beaded the CPU line.
- **The slow mode was a scheduling bug, not the mathematics.** The controller sampled one request at a time with a one-entry queue: (1) a flush's settled request overwrote the queued preview, so no preview was drawn; (2) flushes and re-scheduling cleared the active input revision while a same-revision preview was in flight, so OOE judged it `staleDrop` and `clearStaleScene` blanked the graph (a visible flash while typing); (3) stale settled/polish passes for older revisions ran to completion ahead of the new preview; (4) duplicate settled passes ran back to back. Fixed by `graph-sample-queue.ts` (preview first, covered requests dropped, stale refinement and stale-document previews superseded cooperatively through the new `supersedeActive`; view and slider previews always finish), an active-revision resolver that accepts a run whose revisions still match and nothing newer started, and a cancelled-with-work-waiting run counted as superseded.
- **Points-of-interest analysis** works out only focused items' own features (`focusItemIds`: the selected item and items whose asymptotes show); other items are still intersected with them.

## Deviations and findings

- Plan items B1–B4 (fast Float64Array interval path, discontinuity cache, windowed column check, verdict reuse) were not needed: the target was met by the scheduling fixes; recorded as optional future work.
- The analysis job still marks the tab "running" for ~270 ms after the scene settles (counted by the spec only when preview and settled coalesced, which no longer happens).
- Editor feedback stays borderline at the 4× throttle (44.8–51.7 ms against 50 ms; two runs in seventeen over), as before PTX-ENGINE1.
