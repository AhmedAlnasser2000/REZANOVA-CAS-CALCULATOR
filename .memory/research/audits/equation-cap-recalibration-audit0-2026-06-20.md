# EQUATION-CAP-RECALIBRATION-AUDIT0

Date: 2026-06-20

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Audit only.
- No cap changes and no `src/` edits.
- Classify existing Equation selected-target/parameterized caps after search discipline closeout.

## Current Cap Map

### Selected-Target Isolation

- `src/lib/equation/isolation/selected-target.ts`
  - `DEFAULT_MAX_PEELS = 6`
  - `DEFAULT_COMPACT_TARGET_MAX_LATEX_LENGTH = 220`
  - stop: `isolation-depth-limit`

Classification:

- `DEFAULT_MAX_PEELS` is a search-depth cap and is a plausible future recalibration candidate.
- Compact-target length is a readback/display safety cap, not a solver-search cap.

### Algebraic Isolation

- `src/lib/equation/isolation/algebraic-power.ts`
  - `MAX_ALGEBRAIC_POWER = 4`
- `src/lib/equation/isolation/algebraic.ts`
  - guarded cubic/quartic formula readback may stop with `formula-size-limit`

Classification:

- Degree 4 is an algorithm/readback boundary, not a simple performance knob.
- Raising this means adding or validating higher-degree algorithms, not just increasing a constant.
- Formula-size stops are truth/readback protection and should stay honest.

### Symbolic Polynomial And Rational

- `src/lib/equation/parameterized/symbolic-polynomial.ts`
  - shared degree-0/1/2 symbolic coefficient representation.
- `src/lib/equation/parameterized/polynomial.ts`
  - direct symbolic polynomial solving is currently quadratic-shaped.
- `src/lib/equation/parameterized/rational.ts`
  - rational clearing stops with `cleared-degree-limit` when the cleared target degree exceeds the current degree-2 cap.

Classification:

- Degree 2 is a solver algorithm boundary for current symbolic coefficients.
- It should not be raised until Cardano/Ferrari, factoring, or another validated higher-degree closure path exists.

### Factorable Polynomial

- `src/lib/equation/parameterized/factorable-polynomial.ts`
  - `MAX_FACTORABLE_DEGREE = 4`
  - stop: `degree-limit`

Classification:

- Degree 4 is a bounded factorable-polynomial capability boundary.
- It may be revisited after factoring/readback expansion, but should not be raised as a search-discipline cleanup.

### Mixed Algebraic

- `src/lib/equation/parameterized/mixed-algebraic.ts`
  - `MAX_MIXED_CARRIERS = 2`
  - stop: `branch-limit`
- `src/lib/equation/parameterized/mixed-algebraic-branches.ts`
  - `MAX_GENERATED_BRANCHES = 8`
  - stop: `branch-limit`

Classification:

- Carrier count is a semantic branch-complexity boundary.
- Generated branch count is a plausible future recalibration candidate only if route trace evidence shows useful branch growth with acceptable display/readback behavior.

### Composition

- `src/lib/equation/composition/core.ts`
  - one-layer and nested two-layer composition inversion.
  - branch-limit stops for generated branch count and independent periodic parameters.

Classification:

- Two-layer nesting is a semantic capability boundary.
- Independent periodic-parameter limits protect exactness and readability, not only runtime.
- Any expansion needs a composition capability milestone, not a generic cap raise.

## Findings

1. Search discipline is now strong enough to start cap analysis, but not enough to justify blind cap increases.
2. Most current caps are correctness/readback/algorithm boundaries, not mere performance limits.
3. The safest recalibration candidates are selected-target peel depth and generated branch counts, because they are search/branch breadth limits rather than new closed-form algorithms.
4. Degree caps should remain locked until higher-degree solving or factoring is deliberately added.
5. Cap-hit output should stay structured and user-facing. A cap raise is not a substitute for honest guidance.

## Recommended Next Shape

Before any cap implementation milestone, create a small cap-hit evidence set:

- examples that currently stop because of peel depth;
- examples that currently stop because of generated branch count;
- examples that should continue stopping because degree/algorithm/readback caps protect correctness;
- trace evidence showing attempted/skipped families for each case.

Then choose a narrow implementation, likely one of:

- `EQUATION-PEEL-DEPTH-RECALIBRATION1`
- `EQUATION-GENERATED-BRANCH-CAP-RECALIBRATION1`
- `EQUATION-CAP-HIT-EVIDENCE1`

The current recommendation is to start with evidence, not cap expansion.

## Non-Goals

- No cap constants changed.
- No new solver algorithms.
- No degree-3/4 symbolic coefficient solving.
- No Cardano/Ferrari, broad factoring, numeric root fallback, Lambert W, broader transcendental support, graphing, step-by-step, Rust migration, Display, History, OOE, app-state, Tauri, or UI changes.
