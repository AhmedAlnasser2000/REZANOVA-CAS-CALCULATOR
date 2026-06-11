# Display Branch Readback Audit - 2026-06-11

## Purpose

Audit the display-side freeze and answer-honesty problem exposed by branch-heavy symbolic results after OOE worker completion. This is not an OOE audit and not a solver audit. The solver can finish correctly while the committed result still freezes the UI because the display layer asks one `MathStatic` block to typeset a dense, horizontal, branch-heavy LaTeX answer.

This audit records why a count-only compact answer such as `s in 4 exact branches` is not acceptable as the default user-facing answer, and where the current codebase already has enough structure to improve the display contract.

## Current Contract Evidence

- `DisplayOutcome` already separates major result surfaces: `exactLatex`, `exactSupplementLatex`, `periodicFamily`, `approxText`, `detailSections`, and warnings.
- `PeriodicFamilyInfo` already carries structured fields: `branchesLatex`, `representatives`, `suggestedIntervals`, `piecewiseBranches`, `principalRangeLatex`, `reducedCarrierLatex`, and stop reasons.
- `DisplayDetailSection` already carries math-aware metadata through `lineKind`, `lineKinds`, and `lineParts`.
- `buildDisplayBlocks` adapts existing `DisplayOutcome` fields into renderable blocks, but the main answer is still one `math` block sourced from the monolithic `exactLatex`.
- `RESULT-SIZE-POLICY1` currently gates by crude LaTeX length / line count. That protects some large output cases, but it does not understand branch structure.

## Core Finding

The branch-heavy freeze is usually not caused by the absence of worker isolation. It happens after a result is already allowed to commit. OOE decides whether a result may commit; display policy decides how a committed result is mounted without freezing the UI.

The answer contract should therefore become:

- Show at least one real rendered solution branch immediately.
- Stack branches vertically instead of rendering a whole set as one horizontal math object.
- Mount later branches progressively or through existing deferred rendering.
- Collapse only the long tail for genuinely extreme branch counts or very expensive individual branches.
- Preserve the full exact result for `Copy Result`, `To Editor`, history, replay, and stored solver output.

The rejected contract is:

- Replacing the only visible answer with a count-only receipt such as `s in 4 exact branches`.
- Truncating or mutating the stored result to protect rendering.
- Moving display scheduling into OOE.

## Structured Branches That Already Exist

### Periodic Families

Periodic family output is the best current candidate for immediate branch-aware rendering. The code already preserves `branchesLatex`, representatives, piecewise branches, discovered families, reduced carriers, and interval suggestions. The display adapter already converts several of those fields into blocks.

Next step: use those fields to render representative or branch rows vertically and progressively. No solver migration is required for this route family.

### Detail Sections

Math-heavy detail sections already carry line metadata and can be rendered as math lists. This is a good place for expanded branch details, composition branches, generated equations, and discovered families. The existing block adapter honors these fields.

Next step: avoid ASCII/prose leakage and make detail math blocks follow the same branch-aware size policy.

## Monolithic Branch Producers

Several important producers still flatten branches into one `exactLatex` string too early:

- `src/lib/display/format.ts`: `solutionsToLatex()` renders multiple solutions as `symbol\in\left\{...\right\}`.
- `src/lib/equation/equation-complex.ts`: `exactLatexForBranches()` and complex preimage family readback flatten exact branches into one set string.
- `src/lib/equation/equation-algebraic-isolation.ts`: `exactLatexForSolutions()` flattens selected-target power branches into one set string.
- `src/lib/equation/equation-parameterized-*.ts`: several parameterized helpers use local `exactLatexForSolutions()` helpers that dedupe arrays then join them into one set.
- `src/lib/trigonometry/equations.ts`: finite trig equation answers use `buildExactLatex()` and flatten cycle solutions.
- `src/lib/geometry/shared.ts` and geometry solve-missing paths flatten labeled rows or branch-like results into one comma-separated answer.

These routes often still have branch arrays before formatting. That is the seam for future metadata.

## High-Risk Freeze Families

1. Equation selected-target isolation with multiple nested radical/log/power branches.
   - Screenshot class: dense `s in {branch1, branch2, branch3, branch4}` answer.
   - Risk: one giant horizontal math object freezes or overflows.
   - Preferred display: one branch per row, first row immediate, later rows staged.

2. Complex algebraic and complex preimage branch families.
   - Existing logic has branch arrays and exact/approx readback before flattening.
   - Preferred display: branch list blocks plus exact-form awareness.

3. Calculate polynomial expansion.
   - This is a different shape: one genuinely large expression, not branch-heavy.
   - Current size policy can compact it, but a future scheduler should still profile whether cost is LaTeX conversion, DOM mount, or layout.

4. Geometry solve-missing branch answers.
   - Currently lower frequency, but it has branch-like exact answers and future geometry growth can make this important.
   - Preferred display: labeled rows, not a single comma string.

5. Trigonometry finite equation answers.
   - Small today, but internally branches already exist in several trig pathways.
   - Preferred display: preserve structured finite branches if Trigonometry grows.

## Recommended Milestone Sequence

### 1. DISPLAY-BRANCH-READBACK1

Add display-layer branch-aware readback for route families that already expose structure:

- Periodic family branches.
- Piecewise branches.
- Representative branches.
- Math-list detail sections.

Policy:

- Main answer must show at least one full rendered branch.
- Branches render vertically.
- Collapse only long tails.
- Full exact copy/history remains unchanged.

### 2. DISPLAY-BRANCH-METADATA1

Add optional producer-provided branch metadata for non-periodic finite branch sets without changing stored `exactLatex`:

```ts
branchReadback?: {
  targetLatex: string;
  branchesLatex: string[];
  relationLatex?: '=' | '\\approx' | '\\in';
  parameterLatex?: string[];
}
```

The exact shape can change, but the principle should hold: producers may still provide full `exactLatex` for copy/history while also giving Display enough structure to render branch rows.

Priority producers:

- Equation algebraic isolation.
- Complex equation branch readback.
- Parameterized equation helpers.
- Geometry solve-missing/labeled branch rows.

### 3. DISPLAY-RENDER-SCHEDULER1

Use the block/branch contract to mount result blocks progressively:

- Answer block first.
- Valid When next.
- Important warnings next.
- Detail/proof blocks later or only when opened.
- Offscreen or collapsed blocks should not pay MathStatic cost until needed.

This should be a UI-display scheduler, not OOE. OOE remains the compute traffic controller.

### 4. DISPLAY-RENDER-COST1

Only after the branch/display contract is stable, add a conservative cost heuristic if profiling still shows freezes:

- length,
- line count,
- basic token count,
- simple nesting signals such as `\frac`, `\sqrt`, and powers.

Do not build a fragile full cost estimator before the simpler branch and visibility policies are exhausted.

## Immediate Non-Goals

- Do not change solver semantics.
- Do not change history schema just to avoid rendering cost.
- Do not make OOE responsible for render ordering.
- Do not assume Rust/AST migration fixes UI rendering.
- Do not hide all branches behind a count-only answer.

## Decision

Proceed with branch-aware display readback before deeper rendering scheduler work. The correct UX is not "render everything and freeze" versus "show only a count." The correct middle path is: show one real rendered answer immediately, stack/stage the rest, and preserve full exact data everywhere outside immediate visual rendering.

## Follow-Up Finding: Render Islands

After the first branch-readback pass, branch-heavy selected-target answers could still stress MathLive when each row was rendered as one large `target = branch` math object. In some dense multivariable expressions this showed as black boxes near signs or exponent fragments, and it still made the answer card feel heavy.

The repair is not to return to one horizontal set and not to hide the answer behind a receipt. The display adapter should keep the full row semantic LaTeX, but render the row as two smaller math islands:

- prefix island: the selected target and relation, such as `t=`;
- branch island: the branch expression itself.

This keeps each branch visible as a real answer row, preserves the full row for accessibility/test metadata, and leaves the canonical full `exactLatex` untouched for Copy Result, To Editor, history, replay, and stored output. It is still a display-layer policy, not an OOE or solver contract.
