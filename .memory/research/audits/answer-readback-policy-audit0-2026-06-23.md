# ANSWER-READBACK-POLICY-AUDIT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Calcwiz needs a named final-answer readback policy before more solver widening. The recent quirks (`ii`, `0 + ...`, `((-1+1)/2) * root`, noisy equivalent branches) are not one isolated Complex bug and not a reason to make Display parse arbitrary math. They are evidence that solver routes can produce correct or nearly correct exact structures, then flatten them into route-local LaTeX before a shared readback-normalization layer has a chance to clean harmless algebraic noise.

The right boundary is:

- solver families own mathematical evidence, route order, branch facts, candidate validation, and stop reasons;
- Symbolic Primitives own reusable bounded mechanics such as expansion, substitution, factorization, simplification, and elimination;
- Equation readback owns converting solver-owned exact structures into stable visible answer forms;
- Display owns safe rendering, branch-row layout, deferral, notation display, and fail-closed extraction when metadata is absent;
- History/copy/editor semantics must be explicit when canonical and polished readback diverge.

This audit is documentation only. It does not change solver behavior, Display schemas, History, OOE, app-state, Tauri, or Calculate actions.

## Code Surfaces Inspected

- `src/types/calculator/display-types.ts`
  - `DisplayOutcome` has `exactLatex`, `branchReadback`, `exactSupplementLatex`, `periodicFamily`, `approxText`, details, badges, and metadata.
  - There is no dedicated final-answer normalization field or structured expression readback surface.
- `src/lib/display/result/result-readback.ts`
  - Builds Answer and Valid When sections from existing `exactLatex` / `exactSupplementLatex`.
  - Cleans supplement prefixes and spaces implicit products for display, but does not normalize answer algebra.
- `src/lib/display/result/display-blocks.ts`
  - Builds display blocks and prefers validated `branchReadback`, then safe extraction from `exactLatex`, then a single math block.
  - This is layout/readback organization, not expression cleanup.
- `src/lib/display/result/branch-readback.ts`
  - Splits only safe top-level finite branch sets and fails closed for unsafe targets, tuples, malformed sets, and nested structures.
  - Good display safety posture, but it cannot repair noisy branch expressions.
- `src/components/MathStatic.tsx`
  - Render-only hygiene replaces internal symbolic error fragments and converts `\imaginaryI` to visible `i`.
  - This intentionally does not mutate canonical LaTeX, copy paths, History, or solver semantics.
- `src/lib/equation/roots/representation.ts`
  - Internal root representation exists and is the best anchor for future root/branch readback normalization.
  - Many root entries still store already-rendered `latex` strings, so route-local noise can survive into `exactLatex`.
- `src/lib/equation/roots/readback.ts`
  - `buildCompactRootReadback(...)` adapts root sets to existing `exactLatex`, `branchReadback`, supplements, and detail lines.
  - It does not yet normalize individual root strings or branch expressions.
- `src/lib/equation/complex/exact.ts`
  - Already contains a stronger exact complex scalar model and exact-form rendering helpers.
  - This is a good model for future complex readback policy, but not every Complex-producing route uses it.
- `src/lib/equation/complex/latex.ts`
  - Has route-local LaTeX arithmetic helpers for zero/one, grouping, signs, multiply/divide, and simple pi factors.
  - These helpers are useful but show why presentation policy is duplicated across routes.
- `src/lib/equation/complex/special-form-roots.ts`
  - High-degree Complex special forms now honor `complexExactForm`.
  - Rectangular/polar high-degree output uses exact trig branch notation rather than fake rectangular radicals.
- `src/lib/equation/polynomial/carrier-follow-on.ts`
  - Has local Complex branch construction and a narrow guard to avoid appending another `i` when a magnitude already contains `i`.
  - This fixed one symptom, but the file still demonstrates route-local readback assembly pressure.
- `src/lib/equation/parameterized/readback.ts`
  - Normalizes restrictions/detail lines and stop wording, but does not normalize final answer expressions.
- `src/lib/equation/parameterized/math-json.ts`
  - Now consumes the simplification primitive for helper arithmetic where parity was proven.
  - This is solver-route math normalization, not a final-answer readback policy.

## Findings

### 1. Display Is Not The Right Place For Algebraic Cleanup

Display can safely split finite branch lists, render branch rows, collapse verbose sections, defer large math, honor notation, and avoid rendering internal error fragments. It should not parse arbitrary `exactLatex` to simplify `0 + ...`, reduce scalar fragments, or rewrite `ii` into `-1`. That would make Display an untracked algebra authority and would blur copy/history semantics.

### 2. Readback Needs A Producer-Side Normalization Layer

The correct layer is after a solver has produced exact evidence and before `DisplayOutcome.exactLatex` / `branchReadback` are finalized. For root-set routes, that means near `src/lib/equation/roots/readback.ts` and the helpers that feed it. For branch-heavy non-root routes, it means each producer should pass branch expressions through the same readback normalizer before building `exactLatex` and `DisplayBranchReadback`.

### 3. Root Representation Is Necessary But Not Sufficient

`EquationRootSet` is the right substrate for future readback policy because it knows targets, root groups, source, facts, and approximate text. But current `EquationExactFiniteRoot` still accepts raw `latex`. If a route puts `0+\sqrt{...}` or an `ii`-shaped fragment into that field, the root set faithfully preserves the problem. The next seam should normalize exact root/branch payloads, not just join them.

### 4. Complex Readback Has A Strong Core And Several Bypasses

`complex/exact.ts` can normalize exact complex scalar arithmetic and honor rectangular/polar/cis forms. But polynomial carrier follow-on, special forms, and some preimage/linear-rational paths still build visible branch strings locally. Complex readability should therefore be treated as part of the general readback policy, with Complex-specific rules layered on top of the exact scalar core.

### 5. Facts And Details Must Not Become Hidden Inputs

`exactSupplementLatex`, branch/domain facts, and `detailSections` should stay fact/prose surfaces. A future readback normalizer may carry fact source labels into output decisions, but it should not parse human detail lines to decide what the answer means.

### 6. Copy, History, And Editor Semantics Need Explicit Policy

Existing display policy preserves full canonical `exactLatex` for copy, editor, history, replay, and stored output when Display compacts or splits a result. Final-answer normalization is different: if a route produces algebraically noisy but equivalent exact text, we likely want the normalized answer to become the canonical `exactLatex` before Display, History, and Copy see it. The next implementation must explicitly decide where canonical exact output ends and display-only polish begins.

### 7. TI/Casio-Like Readability Comes From A Pipeline, Not A Single Simplifier

Calculator CAS systems appear polished because final answers pass through deterministic readback rules:

- normalize exact scalar arithmetic;
- remove identity terms;
- choose a stable sign/fraction form;
- format complex units consistently;
- choose notation according to mode settings;
- split branches into readable rows;
- keep domain/fact conditions attached but separate.

Calcwiz already has many of these pieces, but they are distributed across producers, Display, MathStatic, Complex helpers, and Symbolic Primitives. The next step is to make the final-answer readback rules explicit and tested.

## Proposed Presentation Rules

These are the first rules a dedicated readback-normalization milestone should prove:

- Identity cleanup: remove `0 + a`, `a + 0`, `1 a`, `a * 1`, and `0 * a`; preserve nontrivial domain/fact semantics.
- Scalar folding: reduce exact rational fragments such as `(-1+1)/2` only when the operation is structurally local and exact.
- Sign cleanup: avoid `+-`, `--`, leading `+`, and duplicated grouping signs.
- Complex unit cleanup: normalize `i*i` / `ii` to `-1` only when it is an actual multiplicative complex unit expression, not a variable name.
- Branch-wise normalization: normalize each root/branch expression before joining finite sets.
- Notation policy: honor existing complex exact-form and symbolic display preferences; do not force `cis` or fake rectangular radical coordinates.
- Fail closed: when a branch/root cannot be normalized safely, preserve the producer output and add tests before widening.

## Recommended Next Milestones

### 1. `ANSWER-READBACK-NORMALIZATION1`

Add a producer-side Equation readback normalization seam and adopt it narrowly in root-set and branch-readback builders.

Suggested first scope:

- internal helper under `src/lib/equation/readback/` or a sibling of `src/lib/equation/roots/readback.ts`;
- normalize single root/branch expressions, then whole root sets;
- use existing Symbolic Primitives only where safe and bounded;
- cover `0 + ...`, `1 * ...`, exact scalar fragments, double signs, and complex unit multiplication;
- adopt in `rootSetToExactLatex(...)` / `rootSetToBranchReadback(...)` or immediately before those helpers receive branch strings;
- add fixtures for the known symptoms: `ii`, `0 + root`, `((-1+1)/2) * root`, and branch sets with noisy equivalent exact roots;
- no Display/History schema changes.

### 2. `COMPLEX-READBACK-POLICY1`

Define the complex-specific readback policy over the normalizer:

- keep `complexExactForm` authoritative;
- rectangular/polar/cis should each have honest fallback behavior;
- high-degree rectangular may use exact trig notation until compact radical coordinates exist;
- symbolic Complex roots with principal-branch semantics stay deferred until the root representation can encode that meaning.

### 3. `BRANCH-READBACK-POLISH1`

After the base normalizer exists, apply branch-wise polish to non-root finite families:

- periodic representative branches;
- algebraic isolation branch arrays;
- complex branch arrays;
- selected-target generated branches.

This should be consumer-parity work, not a sweep.

### 4. `CALCULATE-ALGEBRA-ACTION-READBACK-BRIDGE0/1`

Only after Equation readback policy is stable, audit whether Calculate's public `Simplify`, `Factor`, and `Expand` actions should consume these rules for visible output. Calculate action behavior remains a product surface and must not silently become a private primitive demo.

## Deferred Work

- Broad final-answer simplification engine.
- Display parsing arbitrary `exactLatex` for algebraic cleanup.
- Changing History or DisplayOutcome schemas.
- Making Symbolic Primitives own final-answer presentation.
- Visible `RootOf` or principal-branch symbolic Complex roots.
- Readback localization.
- App-wide primitive surveillance validator.

## Follow-Up Implementation: `ANSWER-READBACK-NORMALIZATION1`

`ANSWER-READBACK-NORMALIZATION1` implemented the first slice of this audit's recommendation.

- Added a producer-side Equation readback normalizer under `src/lib/equation/readback/`.
- Adopted it only in root-set exact finite root readback, before `exactLatex` and `branchReadback` are joined.
- Normalized safe canonical noise: additive/multiplicative identities, exact numeric zero factors in validated roots, reserved imaginary-unit products, double-sign-style fragments, and external coefficient-before-radical ordering.
- Added multivariable/context guards so symbolic fragments such as `b^2-4ac`, `F/a`, user variable `i`, and `\sqrt{c^2(v+b)}` are not treated as numeric cleanup opportunities.
- Preserved exact overrides, supplements, facts, details, source labels, stops, History, Display schemas, OOE, app-state, Tauri, and Calculate action behavior.

The remaining recommendations stay open as later milestones: non-root branch-family adoption, complex-specific readback policy over the normalizer, Calculate action readback bridge work, copy/history/editor canonical policy decisions, and broader final-answer polish.

## Follow-Up Implementation: `ANSWER-READBACK-SIGN-NORMALIZATION1`

`ANSWER-READBACK-SIGN-NORMALIZATION1` extended the same producer-side normalizer rather than adding Display parsing.

- Added safe sign cleanup for exact numeric-fraction signs, leading plus signs, double signs, and simple negative grouped terms.
- Preserved the v1 boundary that `exactLatexOverride` stays untouched.
- Kept symbolic fractions and broader algebra out of scope: no symbolic cancellation, factoring, radical extraction, or fact parsing.
- Added regression tests for noisy sign cases and symbolic/multivariable guards.

The next readback work remains complex policy lock-in and branch-wise finite-family adoption, both still producer-side.

## Follow-Up Implementation: `COMPLEX-READBACK-POLICY1`

`COMPLEX-READBACK-POLICY1` locked Complex exact-form readability as a correctness policy.

- `complexExactForm: 'cis'` may render `\operatorname{cis}`.
- `complexExactForm: 'rectangular'` and `complexExactForm: 'polar'` must not silently force `cis`.
- For high-degree Complex exact roots where compact rectangular radical coordinates are not implemented, exact trigonometric branch notation is the readable fallback.
- Symbolic principal-branch Complex roots remain deferred until a dedicated branch/root-representation policy can encode their semantics honestly.
- Tests now assert both `exactLatex` and finite `branchReadback` metadata obey the policy for direct powers and exact-rational carrier special forms.

The next readback work remains branch-wise finite-family polish. That work should normalize standalone branch expressions without touching periodic families, inequalities, facts, details, or exact overrides.

## Follow-Up Implementation: `BRANCH-READBACK-POLISH1`

`BRANCH-READBACK-POLISH1` completed the finite-branch adoption slice of this audit.

- Added a shared helper under `src/lib/equation/readback/finite-branches.ts`.
- Normalized standalone finite branch expressions before dedupe, finite-set joining, and `DisplayBranchReadback` metadata creation.
- Adopted the helper in Complex branch readback, algebraic isolation finite branches, parameterized finite branch helpers, generated handoffs, carrier/composition/mixed/trig/exp-log branch outputs, symbolic-carrier special forms, and root-set branch readback.
- Preserved `exactLatexOverride` in v1.
- Left periodic `k` families, inequality sets, detail sections, supplements, facts, decimal/approx branch metadata, Display parsing, History schemas, OOE, app-state, Tauri, and broad simplification out of scope.

The remaining readback work is no longer "make branches use the normalizer"; it is a more explicit canonical-output policy question, especially whether and when an `exactLatexOverride` can be decomposed and rebuilt safely.

## Verification

Planned for this audit:

- `npm run test:memory-protocol`
- `git diff --check`
