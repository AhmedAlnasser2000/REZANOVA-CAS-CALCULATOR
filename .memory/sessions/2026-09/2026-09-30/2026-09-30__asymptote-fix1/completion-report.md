# ASYMPTOTE-FIX1

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

- Date: 2026-09-30. The user found that `tan x` drew no asymptotes after PTX2 and asked for the asymptote equation labels to stop using the curve colour. First of three approved moves (ASYMPTOTE-FIX1, PTX3, PTX-ENGINE1), one commit each, no push. Root-only (DIRECT), on `main`.
- Outcome: **verified** (backend + ui).

## Delivered

- **Root cause:** discontinuity candidates came only from written denominators (`a/b`, negative powers) and from grid gaps 20× larger than their neighbours. `tan x` has no written denominator, and near its poles every grid gap is large, so no candidate was found.
- **Fix** (`ptx/features.ts`): tan and sec count as ÷cos, cot and csc as ÷sin (hidden denominators); plus a general pole search for any function: a sign flip between values with |f| > 1 (bisected), and a spike in |f| over its neighbours (ternary search). Every candidate still has to pass `ptxGrowsToward`, so roots, smooth peaks and steps are not reported as poles.
- **Labels:** equations name exact multiples of π (`x = π/2`, `x = −3π/2`) on the graph and on Analyze cards (`asymptoteLabelNumber`); the text is neutral (`--graph-text`, falling back to `#eef7f1`) with the existing dark halo, the dashed line keeps the curve colour; a vertical label near the right edge moves to the line's left so it is never cut off.

## Deviations and findings

- A browser probe step failed only because the probe had opened the Analyze panel over the point it then clicked; not an app bug.
- Found while testing: Analyze already requests all asymptote features, and now lists tan's vertical asymptotes, poles and domain boundaries.
