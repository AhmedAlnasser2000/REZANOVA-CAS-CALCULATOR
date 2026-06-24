# EQUATION-POLYNOMIAL-ALGORITHM-PREREQ-AUDIT0

Date: 2026-06-24
Repo: `/home/ahmed/Downloads/Calculator`
Status: complete
Gate type: architecture prerequisite audit

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors:
  - claude
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: mixed

## Scope

Claude approved `EQUATION-POLYNOMIAL-ALGORITHM-PREREQ-AUDIT0` as the next move before any Cardano/Ferrari formula work. This audit checks the live repo against the algorithm prerequisite policy in `AGENTS.md`: representation, symbolic primitives, facts/assumptions, validation, route evidence, readback/presentation, and tests must already exist, be built in the same approved milestone, or block the algorithm.

No production source, tests, UI, Display, OOE, History, app-state, Tauri, graphing, step-by-step, Rust, or solver behavior changed in this gate.

## Short Verdict

Do not start Cardano or Ferrari formula code yet.

The live repo has enough search discipline, symbolic primitives, root-set readback, and finite-root presentation infrastructure to begin a substrate milestone, but not enough to safely land general cubic/quartic formula output. The next implementation should be representation/substrate work, not formula work:

`EQUATION-POLYNOMIAL-N_DEGREE-SUBSTRATE1`

That milestone should add a degree-3/4 capable symbolic coefficient representation, route/evidence adapters, node-backed finite-root presentation tests, and explicit complex-intermediate policy tests before any Cardano/Ferrari solver formulas become visible.

## Question 1 - Symbolic Polynomial Representation

Answer: build a new n-degree symbolic coefficient seam instead of widening `SymbolicTargetPolynomial` in place.

Evidence:

- `src/lib/equation/parameterized/symbolic-polynomial.ts` defines `SymbolicTargetPolynomial` as exactly three coefficients: `terms: [MathJson, MathJson, MathJson]`.
- The arithmetic is fixed to degree 2: zero/one/fromDegree/add/negate/subtract/scale allocate three terms, multiplication loops degree `0..2` and stops when the product degree exceeds 2, power rejects target-bearing exponents above 2, degree detection walks from 2 down, and rendering loops from 2 down.
- `src/lib/equation/parameterized/polynomial.ts` intentionally consumes that seam as quadratic-only. It destructures `[c, b, a]`, emits quadratic roots, and the collect stop says solving above degree 2 is a later milestone.
- `src/lib/equation/parameterized/rational.ts` uses the same degree-2 symbolic polynomial for rational numerator/denominator clearing and has an explicit degree-2 clearing cap.
- `src/lib/equation/parameterized/special-form-symbolic-carrier.ts` uses the same type as a carrier-quadratic object and checks `normalized.terms[2]`.

Decision:

- Preserve `SymbolicTargetPolynomial` as the degree-2 compatibility seam for existing parameterized polynomial, rational, and special-form carrier paths.
- Add a new Equation-owned n-degree symbolic coefficient seam for general polynomial algorithms. It should remain MathJSON-coefficient-first, dense or sparse by explicit API, with `maxDegree` initially capped at 4 for cubic/quartic work.
- The new seam should support coefficient collection, add/subtract/multiply/power with degree caps, degree/leading coefficient access, `toNode`, safe explicit LaTeX fallback, and conversion/adapters from degree-2 where needed.
- Cardano/Ferrari must consume the new seam, not smuggle degree-3/4 behavior through the old degree-2 type.

## Question 2 - Finite-Root Presentation Completeness

Answer: the presentation substrate is usable for a new cubic/quartic root producer, but not universal enough to let formulas emit route-local strings.

Clean paths today:

- `src/lib/equation/presentation/finite-roots.ts` can render node-backed finite roots by simplifying MathJSON, rendering to LaTeX, and applying exact readback normalization.
- `src/lib/equation/roots/representation.ts` models exact finite roots with optional `node`, adapts factor-derived and exact-rational factor roots into root sets, and rebuilds exact finite readback from node-backed roots when available.
- `src/lib/equation/roots/readback.ts` converts an `EquationRootSet` into visible exact readback, structured stops, or no-visible-exact outcomes.
- `src/lib/equation/parameterized/polynomial.ts`, `src/lib/equation/parameterized/factorable-polynomial.ts`, and real special-form roots already demonstrate finite root output through the newer finite-root/root-set helpers.

Gaps:

- Several producers still use older string-only finite branch helpers, including algebraic isolation, generated handoff, carrier elimination, composition, exp/log, trig, mixed algebraic, and symbolic-carrier special forms.
- `EquationRootSet.exactLatexOverride` remains a compatibility escape hatch. It can bypass node-backed rendering unless roots carry nodes and the override is safely decomposable.
- Complex branch readback uses the finite-root presentation path, but exact complex scalar branches may enter as form-specific LaTeX rather than preserving original root MathJSON nodes.
- High-degree Complex rectangular radical coordinates are still deferred; high-degree Complex branches use exact trigonometric notation unless `cis` is selected.

Decision:

- Cardano/Ferrari output may become visible only through `EquationRootSet`/finite-root presentation with MathJSON nodes for each exact finite root.
- Do not add another string-only Cardano/Ferrari branch formatter.
- Before formula work, add focused presentation tests for three-root and four-root finite sets, duplicate/deduped roots, symbolic coefficient roots, branch ordering, Copy/To Editor compatible `exactLatex`, and branch readback metadata.
- If a formula result cannot be carried as honest finite root nodes, it must remain a structured stop or internal object.

## Question 3 - Complex Intermediate Policy

Answer: existing Complex infrastructure is not enough for symbolic Cardano intermediates. The policy is: do not expose symbolic complex intermediate radicals as principal branches until a formal principal-branch/root policy exists.

Evidence:

- `src/lib/equation/complex/special-form-roots.ts` explicitly stops symbolic Complex special-form roots with the message that symbolic carrier coefficients are deferred until a formal principal-branch root policy exists.
- `.memory/research/audits/equation-complex-symbolic-special-form-frontier1-2026-06-22.md` already records that symbolic cases such as `x^5=a` or `x^6-a*x^3+b=0` require principal-root notation, branch-cut facts, and copy/editor semantics before visible output.
- `src/lib/equation/isolation/algebraic.ts` currently caps general symbolic cubic/quartic formulas with `formula-size-limit`, and tests preserve that behavior for general cubic/quartic cases.
- Exact-rational Complex special forms are supported because their branches have concrete magnitudes/angles; that does not imply symbolic expressions like `sqrt[3]{A+iB}` have a declared principal-branch policy.

Decision:

- Real-domain Cardano must not display symbolic complex intermediate values in casus irreducibilis as if Calcwiz had chosen a principal cube-root convention.
- A future real-only Cardano route may avoid this blocker only if it uses a real-form policy, such as trigonometric/cosine-form branches with explicit discriminant/domain facts, and presentation tests prove the output is honest.
- General symbolic Complex Cardano/Ferrari needs a separate principal-branch/root-object milestone before visible formula output.
- Until then, casus-irreducibilis symbolic cases should stop honestly or route through a policy-approved real representation, not through informal complex radicals.

## Question 4 - Candidate Validation And Route Evidence

Answer: the repo has route evidence and candidate-validation substrates, but cubic/quartic algorithm output needs new adapters and tests before formulas land.

Evidence:

- `src/lib/equation/target-shape/route-plan.ts` and `src/lib/equation/target-shape/search-trace.ts` provide selected-target route families plus internal/test-facing skipped, attempted, success, and final-stop events.
- Current route families include `polynomial`, `factorable-polynomial`, `special-form-roots`, `carrier-elimination`, and `algebraic-isolation`, but there is no cubic/quartic algorithm identity or formula-specific evidence payload.
- `src/lib/equation/candidate/validation.ts` validates numeric candidates by residual substitution against the original equation and domain constraints.
- `src/lib/equation/domain-guards.ts` owns the residual check used by numeric validation.
- `src/lib/equation/polynomial/system.ts` has mandatory candidate-pair validation for the Polynomial 2x2 route.
- Existing algebraic isolation tests deliberately keep general symbolic cubic/quartic formulas capped instead of pretending a route is ready.

Decision:

- The selected-target route/evidence layer is ready as a substrate, but cubic/quartic algorithms must add explicit route evidence before formula output: degree, family, selected algorithm/policy, skipped reason when policy blocks, and success/final-stop coverage.
- Pure polynomial formulas need exact route proof and regression tests; transformed routes that can introduce extraneous roots must preserve facts/exclusions and use existing candidate-validation or add an exact symbolic residual-validation equivalent.
- Numeric validation alone is not enough for symbolic Cardano/Ferrari. If the output is symbolic exact roots, Calcwiz needs either exact residual proof over the coefficient representation or a bounded proof by construction recorded in the route tests.
- Add tests proving cubic/quartic routes are attempted, skipped, selected, and stopped with correct evidence before making formulas visible.

## Prerequisite Checklist For Formula Work

Formula implementation remains blocked until these are satisfied:

- Representation: an n-degree symbolic polynomial coefficient seam exists and is tested for degree 3 and 4.
- Symbolic primitives: expansion/simplification/substitution helpers are consumed only where parity is proven; no route-local mini-primitive duplicates them.
- Facts/assumptions: leading-coefficient, discriminant, denominator/exclusion, real-domain, and branch/principal facts have explicit homes.
- Validation: exact symbolic or proof-by-construction validation is defined for formula roots; transformed routes still validate candidates or carry exclusions.
- Route evidence: cubic/quartic route attempts, skips, successes, and final stops are traceable in current selected-target evidence.
- Presentation/readback: formula roots enter through node-backed `EquationRootSet`/finite-root presentation, not final LaTeX strings.
- Tests: degree-3/4 representation, route evidence, complex-intermediate blocking, finite-root presentation, and existing capped cubic/quartic regressions are covered.

## Recommended Next Milestone

`EQUATION-POLYNOMIAL-N_DEGREE-SUBSTRATE1`

Initial scope:

- Add a new degree-3/4 capable symbolic coefficient representation under Equation parameterized/polynomial ownership.
- Keep the existing degree-2 `SymbolicTargetPolynomial` unchanged for compatibility.
- Add adapters/tests for cubic/quartic coefficient collection and `toNode` rendering.
- Add route evidence for higher-degree polynomial algorithm eligibility and policy stops.
- Add finite-root presentation tests for cubic/quartic-sized root sets.
- Keep Cardano/Ferrari formula construction, Complex symbolic principal branches, implicit-root notation, broad factoring, numeric Exact fallback, Display/History schemas, graphing, step-by-step, and Rust out of scope.

Only after that substrate is committed should Calcwiz choose the first actual formula milestone.

## Verification

- Read `AGENTS.md`, `.memory/PROTOCOL.md`, `.memory/current-state.md`, and the active handoff-ingest session context.
- Inspected live source for symbolic polynomial representation, polynomial/rational/special-form consumers, finite-root presentation, root representation/readback, Complex special-form policy, algebraic isolation cubic/quartic caps, route planning/search trace, candidate validation, residual validation, and polynomial-system candidate checks.
- No production source changes were required.
- Durable verification is recorded in the session dossier.
