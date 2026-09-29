# GRAPHING-COMPLEX-LOCI1

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

- Date: 2026-09-29. User-approved plan (loci and roots in the Complex view on an Argand plane; roots exact whenever possible, not limited to degree 4; ℂ trace labelled "Complex part" plus the full value; `z = 1+i` is a point, `z = 2` stays a surface). Root-only (DIRECT), on `main`, no push. Codex's concurrent Integration and new-integration work was left unstaged.
- Gate type: ui. Outcome: **verified**.

## Delivered

- **Complex loci** (`complex-locus`): z-only relations whose z-dependent sides are real-valued (`|z-1|=2`, `|z-1|=|z+i|`, `\operatorname{Re}(z^2)=1`, `\arg(z)=\pi/4`, `|z|<2`, chains).
  - Classified by `parser/complex-relation.ts`, with operator aliases (Re/Im/arg/overline/conj) added in the MathJSON adapter.
  - Sampled by the existing implicit sampler through new prebuilt z = x + iy clauses. A slope-based jump check stops `arg` drawing a false edge along its cut.
- **Root points** (`complex-roots`): z-only equations with complex sides, plus `z = c` for non-real constants.
  - `sampling/complex-roots.ts` (with `complex-polynomial.ts`, exact BigInt Gaussian rationals): written factors, rational and small Gaussian roots, `z^n = c` for any n, quadratics with surd labels.
  - Every root of a polynomial is found; the part without an exact form uses Aberth iteration. Other equations use Newton search in view, marked incomplete.
  - Analyze reports exact roots as exact-proved (exact form in the method) and numeric ones as numeric-validated.
- **Fast complex evaluator** (`evaluator/complex-plan.ts`): closures matching the public evaluator's semantics, parity-tested on 18 expressions.
- **Complex pane**:
  - an Argand plane (grid, Re/Im axes, i-suffixed ticks) when no z-map colours it;
  - loci as curves and regions, and roots as dots (exact filled, numeric rings);
  - root hover readout such as "z = e^(2πi/3) · exact", and a status like "1 locus; 3 root points · all exact".
  - Both mode shows loci in the Real pane.
  - Auto-switch covers loci and roots.
- **Fixes:**
  - The ℂ overlay uses the real curve's log₁₀ convention and draws only where the real curve is undefined (no extra lines for real odd roots).
  - The ℂ Re/Im paths are traceable, with the two-line callout "Complex part · Im f(x) = …" and "f(x) = a + bi", evaluated exactly.
  - WebGL contexts are released on dispose (field layer, Three via forceContextLoss, probe error path).
  - The auto-switch notice replaces the context chip while shown.

## Deviations and findings

- **Not done:** GPU drawing of loci. Loci are CPU-sampled on settle and move with the live viewport during gestures. Left for the GPU closeout move and recorded as an open question.
- **Not added:** a unit test for context release. It is covered by the new 30-toggle 3D e2e instead.
- **Observed:** the Argand plane is not aspect-locked, so circles look oval in wide panes (the viewport is shared with the Real pane).
- **Limitation:** non-holomorphic root equations (e.g. `\overline{z}=z^2`) rely on Newton without derivatives and may find few roots.
