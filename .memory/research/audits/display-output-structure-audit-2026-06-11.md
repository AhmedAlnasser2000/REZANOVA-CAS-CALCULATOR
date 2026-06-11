# DISPLAY-OUTPUT-STRUCTURE-AUDIT1

Date: 2026-06-11
Status: read-only audit
Scope: committed-result display structure, producer metadata, and scheduler readiness

## Boundary

This audit is display/output structure only. It does not add an event bus, Surface Protocol, Supercarrier compartment system, plugin layer, public SDK, remote compute protocol, solver family, or OOE behavior change.

OOE remains the compute traffic controller: launch, host choice, cancellation, stale gates, commit/drop, diagnostics, and history tickets. Display remains responsible for how already-committed output is rendered without freezing the UI.

## Executive Summary

The display side now has enough contract to avoid many old freezes: `DisplayOutcome` can carry `branchReadback`, `periodicFamily`, `exactSupplementLatex`, typed detail sections, warnings, and approximate text. `buildDisplayBlocks` adapts those fields into renderable blocks, and the display scheduler reveals answer/error first, then `Valid when`, then approx/warnings, periodic-family blocks, and details.

The remaining risk is producer shape, not OOE. Some producers already provide real structure before formatting, while others still flatten multiple branches or facts into one `exactLatex` string. Display can safely infer simple top-level finite branches, but it should not become a second solver/parser. Wherever a producer already owns branch arrays or fact rows, it should pass metadata instead of making Display guess from a huge LaTeX blob.

## Existing Display Contract

- `DisplayOutcome.branchReadback` is the preferred metadata for finite branch answers. It records the target, relation, and branch rows while preserving full `exactLatex` for copy/history/replay.
- `PeriodicFamilyInfo` is already structured with branch families, representatives, piecewise branches, discovered families, principal ranges, reduced carriers, suggested intervals, and structured stop reasons.
- `exactSupplementLatex` already feeds the `Valid when` block as a math list.
- Detail sections can mark math, text, mixed lines, and line parts, so prose cards and math-heavy cards do not need to share one rendering path.
- `buildDisplayBlocks` currently prefers producer branch metadata, then safe branch extraction, then the original single math block.
- `display-render-scheduler` currently ranks answer/error first, `Valid when` second, approx/warnings third, periodic blocks fourth, and details last.

## Producer Readiness Matrix

| Producer area | Current structure | Classification | Notes |
| --- | --- | --- | --- |
| Equation selected-target polynomial/quadratic | `branchReadback` from known `uniqueRoots` | Good | Producer keeps branch rows before joining `exactLatex`. |
| Equation selected-target rational/carrier/composition/exp-log/mixed algebraic | `branchReadback` is propagated through Equation mode | Good | These routes pass structured branches when they already have solution arrays. |
| Equation complex finite algebraic/preimage | `branchReadback` from complex branch arrays | Good | Exact/decimal/BOTH readback keeps full `exactLatex` and branch metadata. |
| Equation periodic families | `periodicFamily` structure | Good | Representatives, piecewise branches, discovered families, and reduced carrier are already block-friendly. |
| Equation selected-target trig | `branchReadback` from known `solutionExpressions` is now forwarded through Equation mode | Good | Fixed by `DISPLAY-PRODUCER-METADATA2`; full `exactLatex` remains canonical for copy/history/replay. |
| Equation polynomial systems | tuple set `(x,y) in {...}` | Correctly non-branch | Display should fail closed; tuple/system rows are not single-target branches. |
| Equation inequalities | interval/family expressions, often joined with unions | Correctly non-branch for now | Future interval metadata may help, but these are not finite branch rows. |
| Trigonometry Period & Phase | one answer plus math detail blocks | Acceptable | No branch pressure; detail facts should remain typed math/prose as appropriate. |
| Hidden legacy Trigonometry equations | `x in {a,b}` is built by joining values | Partial legacy | UI was hidden, but replay/core remains. If revived, pass branch metadata or route to Equation. |
| Trigonometry triangles | six related measurements joined into one exact string | Partial, not branch | Better future shape is a math-list/fact block, not branch readback. |
| Geometry shared result rows | `rows.map(label=value).join(', ')` | Partial, not branch | Geometry owns labeled facts; future producer metadata should expose rows as math-list blocks. |
| Statistics descriptive/frequency/regression/correlation | many stats joined into one exact string | Non-branch; future table/fact blocks | Statistics rows are not solution branches. Avoid branch extraction; later structured stats blocks would help. |
| Matrix/Vector | operation result LaTeX plus approximate text | Non-branch | Grids/scalars should stay domain-specific, not branch rows. |
| Table | functions and rows are separate runtime data; display outcome only summarizes | Non-branch | Table rows should remain table UI, not math branch rows. |
| Calculate standard/transform | mostly one quickform answer plus optional `Valid when` | Mostly good | Transform restrictions now use `exactSupplementLatex`; broad branch metadata is usually unnecessary. |

## Known Flattening Hotspots

- `src/lib/equation/equation-parameterized-trig.ts` was the clearest finite-branch metadata gap; `DISPLAY-PRODUCER-METADATA2` now emits `branchReadback` for direct affine trig and same-argument mixed sine/cosine selected-target branches.
- `src/lib/trigonometry/equations.ts` builds `x\in{...}` with `values.join(', ')`. This is legacy-hidden but still a flattening pattern.
- `src/lib/geometry/shared.ts` flattens labeled rows into `exactLatex`. These should become math-list/fact blocks later, not branch rows.
- `src/lib/trigonometry/triangles.ts` flattens side/angle facts into one result string. This should stay a fact list, not branch rows.
- `src/lib/statistics/core.ts` joins descriptive/frequency/regression values into one string. These are statistical summaries, not solve branches.

## What Should Never Become Branch Rows

- Statistics datasets, frequency tables, descriptive summaries, regression summaries, and correlation summaries.
- Matrix/vector grids and vector operation summaries.
- Table rows and sampled function tables.
- Geometry multi-fact measurement rows.
- Trigonometry triangle side/angle facts.
- Equation tuple/system answers such as `(x,y)\in{...}`.
- Inequality interval unions.
- Ordinary prose details and route narration.

## Recommended Next Milestones

1. `DISPLAY-PRODUCER-METADATA2`
   - Completed for Equation selected-target trig branches that already had `solutionExpressions` before formatting.
   - Remaining candidates should still be limited to producers with real branch arrays before formatting.
   - Do not add branch metadata to tuple systems, inequalities, geometry facts, stats facts, tables, matrix/vector grids, or triangle measurements.

2. `DISPLAY-RENDER-SCHEDULER2`
   - Improve staged rendering using the audit map: branch rows can mount one by one, Valid When can stay second, and verbose details can stay collapsed/offscreen until opened.
   - Keep the scheduler display-only. It should not weaken OOE stale gates or change history/replay/copy semantics.

3. Later: `RESULT-STRUCTURED-BLOCKS1`
   - Consider first-class producer-authored display blocks only after the adapter-first model stabilizes.
   - This is the natural bridge toward future Rust/AST serialization because the contract would already separate answer, valid-when, facts, branches, tables, and details.

## Conclusion

The block adapter and scheduler are useful and correctly scoped, but producer metadata coverage is uneven. The safe rule is: if a producer knows structure, it should say so; if Display is only guessing from `exactLatex`, it must fail closed. The next work should be metadata widening, not a bus, not a new OOE subsystem, and not broad result-schema migration.
