# GRAPHING-COMPLEX-FOLLOWUP1

## Attribution

- primary_agent: claude
- primary_agent_model: claude-sonnet-5-5
- primary_agent_family: sonnet-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-sonnet-5-5
- recorded_by_agent_family: sonnet-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-sonnet-5-5
- verified_by_agent_family: sonnet-5.5
- attribution_basis: live

## Authority and outcome

- Date: 2026-09-29. User-approved plan (equal axes on by default in Real and Complex with a switch to stretch; GPU loci in both panes; one move, three commits, no push). Root-only (DIRECT), on `main`. Codex's concurrent Integration work was left unstaged.
- Gate type: ui. Outcome: **verified**.

## Delivered

- **GRAPHING-CONJUGATE-ROOTS1** (`7eb8f8e2`): root equations that are not holomorphic in z (Conjugate, Re, Im, |.|, arg applied to something that depends on z) are solved as the real system (Re F, Im F) = 0 in (x, y). The solver is a finite-difference Newton with damping over a seed grid (`sampling/complex-plane-newton.ts`). `\overline{z}=z^2` now finds 0 and the three cube roots of 1. Results stay numeric and marked incomplete. Root hover text uses the true minus sign.
- **GRAPHING-EQUAL-AXES1** (`d8ed779e`): the shared viewport keeps square units in Real, Complex and Both, so circles are round. On a resize or mode change it keeps its centre and the coarser scale (a wider window shows more, nothing is cropped). A `1:1` toolbar switch turns it off. The choice is session-local UI state (default on, not saved). The Complex pane reports its own size so Complex-only mode squares against the pane that is showing. The Real pane exposes `data-viewport`; three tracing e2e tests read it instead of assuming -10..10 by -6..6.
- **GRAPHING-GPU-LOCI1** (this move's last commit): complex loci are drawn by the GPU in the Real pane (Both mode) and the Complex pane. Each clause is Re(left - right) at z = x + iy from the complex GLSL emitter (`gpu/complex-locus.ts`), fed to the existing two real-field passes. The Complex pane composites the GPU canvas into its 2-D canvas between the Argand plane and the root points. Refusals fall back to the CPU drawing. The CPU scene stays the authority for trace, Analyze and export.

## Deviations and findings

- **Dropped from the plan:** the `uJumpGuard` branch-cut guard for `arg`. A mutation check showed pass 2's existing two-scale consistency test already rejects the arg jump (no false edge with the guard off, including arg = 3 rad just above the cut), so the guard was removed as dead code. The no-false-edge cases stay as regression tests.
- **Found:** at a clean checkout of HEAD, `graphing-performance.spec.ts` fails its latency and sampling budgets, so that failure is environmental (machine load) and unrelated to these changes.
- **Found:** the earlier "tsc clean" checks in this session used `tsc --noEmit -p .`, which does nothing on this solution-style tsconfig; `tsc -b` is the real check. It exposed that `f1abd519` needed the versioned draft types Codex had already staged in its lane; Codex reported that resolved.
- **Not done:** persisting the Equal axes choice with the graph (would need a session schema bump). An exact elimination route for conjugate equations (`z̄ = z²` gives `z⁴ = z`) belongs to Codex's polynomial lane.
