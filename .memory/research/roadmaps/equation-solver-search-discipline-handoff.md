# Equation Solver Search Discipline Handoff

Date: 2026-06-19

## Attribution

- primary_agent: claude
- primary_agent_model: claude-unknown
- contributors: codex
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: mixed

## Source

- External handoff reviewed: `/home/ahmed/Downloads/codex-handoff-solver-phase.md`
- Purpose of this preserved copy: keep the valuable solver-phase direction while correcting stale or overstated claims against the live Calcwiz repo.

## What To Preserve

- Search discipline comes before new heavy algorithms. Calcwiz should not add Cardano, Ferrari, factoring breadth, integration rule libraries, step-by-step output, or graphing on top of a router/search layer that still wastes time or sends cases through the wrong families.
- The reference "s" problem remains a useful stress case:

```text
sqrt(cv) * (11 / d^(3+s^2)) = 4x + y^(j-8o) + t^(3+p^2)
```

- The important product lesson is real: a solvable symbolic case can feel blocked if the strategy search explores expensive dead ends before reaching the right family.
- The long-term shape-indexing idea is sound. Solver search should move toward cheap expression-shape profiling, routing evidence, and bounded candidate selection before expensive verification.
- Step-by-step remains downstream of solver maturity. It should explain the chosen correct path, not expose immature or accidental solver behavior.
- Graphing remains deferred until solver/domain/branch/discontinuity facts are trustworthy enough to drive a scene/runtime surface.
- The Rust boundary remains conservative: move tight measured loops over flat homogeneous data only after evidence; do not send expression trees or symbolic dispatch through Tauri IPC prematurely.

## Corrections Against The Live Repo

- The handoff's phrase "semantic-planner.ts strategy router" is too broad for the current bug class. `src/lib/engine/semantic-planner.ts` is now a public facade for `planMathExecution`; it performs lightweight planning/canonicalization, not the selected-target family router.
- The live Equation route for these cases is `src/lib/modes/equation/symbolic.ts` -> `runParameterizedUnsupportedRoute` in `src/lib/modes/equation/parameterized.ts` -> selected-target and parameterized family solvers under `src/lib/equation/`.
- The slow reference behavior is not mainly caused by early failed families in `runParameterizedUnsupportedRoute`. Local timing showed early parameterized families reject quickly for the `s` case; the expensive path is selected-target isolation/delegation and exp/log generated-equation handoff into symbolic polynomial solving.
- The existing flat exact polynomial representation is already present. `src/lib/algebra/polynomial-core/` exposes map-based `ExactPolynomial` plus arithmetic/parser helpers, and many solver districts already consume it. Therefore "build flat polynomial representation" should be corrected to "align or extend the symbolic-coefficient parameterized polynomial path with existing polynomial-core where appropriate."
- The current parameterized symbolic polynomial/rational paths still have local fixed-degree `TargetPolynomial` representations with `MathJson` coefficients in `src/lib/equation/parameterized/polynomial.ts` and `src/lib/equation/parameterized/rational.ts`. That is the live seam to audit before any broad polynomial rewrite.
- The golden math regression corpus is deliberately not a benchmark suite. Performance protection should use a small focused perf sentinel or harness, not broad wall-clock assertions inside the golden corpus.
- "Full symbolic differentiation is easy, always terminates" should be softened. Differentiation may be more structurally bounded than integration, but simplification, display size, branch/domain facts, vector calculus, and higher-order output growth still need caps and readback discipline.
- Durand-Kerner numeric fallback is not "add any time" in product terms. It must be clearly marked numeric, gated by answer-mode/display/readback contracts, and kept separate from exact symbolic promises.
- A full profiling system remains deferred, but a tiny developer-only benchmark/sentinel for solver routing is useful now if it protects the search-discipline work.

## Corrected Dependency Order

1. `EQUATION-SEARCH-DISCIPLINE-AUDIT0`: map current selected-target and generated-equation search behavior, identify live expensive routes, and define the narrow next implementation seam.
2. `EQUATION-TARGET-SHAPE-PROFILE1`: add a cheap target-occurrence/shape profile that can classify target-in-exponent, target-in-denominator, target-under-radical, linear, polynomial, trig-argument, and mixed families without committing to a broad planner rewrite.
3. `EQUATION-SELECTED-TARGET-ROUTER-PERF1`: use the profile to avoid expensive impossible delegated attempts in selected-target isolation and generated exp/log handoffs while preserving existing successes, stops, OOE semantics, history, and readback.
4. `POLYNOMIAL-SYMBOLIC-COEFF-SEAM1`: audit and, if justified, align the parameterized `MathJson` coefficient polynomial collectors with existing `polynomial-core` concepts without breaking symbolic-parameter output.
5. Cap recalibration: tune depth/term/degree limits only after search and representation work changes the bottleneck.
6. New algorithms: Cardano, Ferrari, special forms, factoring, broader integration, and numeric root fallback come after the router/search substrate proves stable.

## Working Rule

Preserve the handoff's discipline, not its stale implementation pointers. The next solver phase should be search-first, evidence-driven, and bounded: no god solver, no infinite recursion, no graphing detour, no step-engine detour, and no premature Rust migration.
