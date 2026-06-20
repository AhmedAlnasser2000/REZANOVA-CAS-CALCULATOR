# EQUATION-ROOT-REPRESENTATION-AUDIT0

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

- Audit/readiness milestone only.
- No source implementation, tests, solver behavior, caps, UI, OOE, Display, History, app-state, Tauri, graphing, step-by-step, broad factoring, numeric fallback, or Exact/Isolate semantics changed.
- Goal: decide what a future root representation seam must preserve before Calcwiz widens factor/product, degree, formula-size, or implicit-root behavior.

## Question

After `EQUATION-FACTOR-PRODUCT-DECOMPOSITION1`, Calcwiz can identify explicit product factors more cleanly. The next danger is using that substrate to chase more roots without deciding how roots should be represented when formulas are too large, factor-derived, implicit, numeric-only, or condition-bearing.

This audit asks:

- What root/readback structures already exist?
- Which current stops are really missing representation policy?
- What should the first implementation seam own?
- What should remain out of scope until facts/readback and Exact/Isolate semantics mature?

## Current Root Surfaces

| Surface | Code anchor | Current shape | Audit finding |
| --- | --- | --- | --- |
| Display result contract | `src/types/calculator/display-types.ts` | `exactLatex`, optional `branchReadback`, `periodicFamily`, `exactSupplementLatex`, `approxText`, `candidateValues` | Good display envelope, but no solver-owned root object. |
| Finite branch metadata | `src/lib/display/result/branch-readback.ts` | string branch rows with relation `=`, `\in`, or `\approx` | Good display metadata; not a canonical root model. |
| Parameterized quadratic | `src/lib/equation/parameterized/polynomial.ts` | quadratic-form strings plus `branchReadback` and discriminant/nonzero facts | Existing finite exact branch behavior should be preserved. |
| Explicit factorable products | `src/lib/equation/parameterized/factorable-polynomial.ts` | product factors delegate to linear/quadratic solvers, then parse `exactLatex` back into roots | Product substrate is cleaner now, but roots are still string-derived and factor multiplicity is detail text only. |
| Exact-rational expanded factoring | `src/lib/algebra/polynomial-factor/solve.ts` | `exactSolutions`, `approxSolutions`, factors, and factorization metadata | Strong source substrate. It should feed a future root seam without making Algebra own Equation readback policy. |
| Algebraic power isolation | `src/lib/equation/isolation/algebraic-power.ts` and `algebraic.ts` | direct power roots, finite branch metadata, facts, complex bounded branches | Good for current bounded powers; degree/formula limits remain policy boundaries. |
| Formula-size stop | `src/lib/equation/isolation/algebraic.ts` | `formula-size-limit` for guarded cubic/quartic readback | Correct safety stop until compact/implicit root policy exists. |
| Guarded polynomial stage | `src/lib/equation/guarded/polynomial-stage.ts` | exact/numeric roots via `exactLatex`, `approxText`, and candidate values; branch metadata mostly appears after validation paths | Useful, but still not a general root representation. |
| Numeric interval solve | `src/lib/equation/numeric-interval/solve.ts` | validated numeric roots with method/diagnostics | Numeric roots are already labeled numeric and should stay separate from exact roots. |
| Generated handoffs | `src/lib/equation/parameterized/generated-handoff.ts` | parse/set-build helper around `exactLatex` strings | Useful compatibility, but the future seam should reduce this string parsing instead of deepening it. |

## Findings

1. Calcwiz already has display-level branch readback, but not solver-owned root representation.
   - `branchReadback` is correctly optional display metadata over `exactLatex`.
   - It does not record factor source, multiplicity, implicit polynomial roots, validation status, domain, or exclusion facts.

2. Several current caps are representation boundaries, not compute boundaries.
   - `formula-size-limit` protects truth/readability for symbolic cubic/quartic formulas.
   - Factorable degree and exact-rational factor outputs can identify more structure than Calcwiz can currently present safely.
   - Raising caps before root/readback policy would turn bounded stops into unreadable or misleading answers.

3. Product decomposition gives a substrate input, not a root policy.
   - It can say "these are product factors" and whether they contain the selected target.
   - It should not decide whether a factor root becomes an explicit formula, implicit root, numeric root, condition, or stop.

4. Exact finite roots should keep existing behavior.
   - Current quadratic, factorable, algebraic power, complex bounded power, and validated candidate paths already emit defensible finite roots.
   - Future seams must adapt back to current `exactLatex` / `branchReadback` first, not force a Display or History schema change.

5. Implicit roots are the missing representation, not a permission slip to solve more.
   - Calcwiz needs a way to carry "root of this factor/polynomial under these facts" internally before it shows that to users.
   - Visible `RootOf`, "roots of P", factored-form answers, or structured stops are product/readback choices and should not be invented inside family solvers.

6. Numeric roots stay a separate class.
   - Numeric interval roots are accepted through validation and method diagnostics.
   - They should not be blended into exact roots or used as Exact-mode closure unless a future numeric/exact policy explicitly says so.

## Root Classes To Preserve

| Class | Meaning | Current examples | Future seam requirement |
| --- | --- | --- | --- |
| Explicit exact finite root | A concrete symbolic branch expression is known. | Quadratic formula branches, algebraic power branches, factorable linear/quadratic factors. | Preserve `exactLatex` and `branchReadback` parity. |
| Factor-derived root | A factor equation is the source of a root, with possible multiplicity. | `(z-a)^3=0`, explicit zero products. | Carry factor latex, multiplicity, factor degree, and delegated family/source. |
| Exact-rational factor root | Algebra-owned exact factorization identifies roots and approximations. | Expanded exact-rational cubic/quartic factoring. | Import/adapter boundary from Algebra data into Equation root/readback policy. |
| Implicit algebraic root | A root is identified structurally but should not expand into a formula. | Future higher-degree/factor roots, formula-size cases. | Keep internal first; visible notation deferred. |
| Numeric validated root | Approximate root accepted by substitution/domain checks. | Numeric interval solve, candidate-validation paths. | Keep method, validation, approximate relation, and rejected count separate. |
| Periodic family | Infinite branch family, not a finite root list. | Trig/composition periodic answers. | Stay in `periodicFamily`, not root representation v1. |
| Structured stop | Calcwiz knows why a root cannot be honestly represented. | `formula-size-limit`, degree/factor stops. | Preserve clear stop reasons until representation/readback is approved. |

## Recommended First Implementation

`EQUATION-ROOT-REPRESENTATION-SEAM1`

Scope:

- Add an internal Equation root representation seam with typed root classes and adapters.
- Start with exact finite roots, factor-derived roots, exact-rational factor roots, implicit-root placeholders, numeric validated roots, and structured-stop summaries.
- Provide adapters back to current `exactLatex`, `branchReadback`, `approxText`, and detail-section behavior.
- Consume it in one narrow producer first, preferably factorable explicit products or exact-rational factorable output, because product decomposition already exposes factor/multiplicity data.

Guardrails:

- No visible `RootOf` or implicit-root notation in v1.
- No DisplayOutcome, History, app-state, Tauri, OOE, UI, or persistence schema change in v1.
- No cap raise, Cardano/Ferrari, broad factoring, numeric fallback, graphing, step-by-step, or Exact/Isolate cleanup.
- Do not move Algebra-owned exact-rational factorization into Equation; adapt its result.
- Do not treat `branchReadback` as the canonical source of roots. It remains display metadata.

## Deferred Decisions

- Visible notation for implicit roots: `RootOf`, factored equation rows, "roots of P", isolated unresolved factors, or structured stop.
- Whether factor multiplicity should become visible metadata, detail-only text, or a future branch-row badge.
- Whether finite exact roots should eventually store MathJSON nodes in addition to LaTeX.
- How root facts and denominator/radicand/exclusion constraints should attach to individual roots; this likely belongs to the branch/domain/exclusion facts milestone.
- How `Exact` should behave when only implicit roots are available; this remains downstream of the Exact/Isolate semantics milestone.

## Recommendation

Proceed to `EQUATION-ROOT-REPRESENTATION-SEAM1` only if the next implementation should make product/factor roots safer. If the user wants more visible capability first, pause and do `EQUATION-FACTS-SURFACE-AUDIT0` before any root seam adoption, because root representation without facts can still mislead.

Do not raise formula-size, degree, or branch caps from this audit.
