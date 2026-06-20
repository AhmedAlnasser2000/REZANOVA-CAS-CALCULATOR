# EQUATION-IMPLICIT-ROOT-READBACK-AUDIT0

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

## Summary

Calcwiz now has enough substrate to discuss compact/implicit root readback, but not enough product policy to expose visible `RootOf`-style answers yet.

The repo has three distinct concepts that should stay separate:

- compact exact roots that are already safe to render as `exactLatex` / finite `branchReadback`;
- isolated equations or structured stops where a solver made progress but a compact formula is unsafe;
- dormant implicit algebraic roots in the internal root representation, which currently produce no visible exact answer.

The next implementation should be a compact root/readback policy seam, not visible implicit-root notation.

## Scope

This audit inspected current Equation root/readback surfaces, selected-target isolation fallback, formula-size stops, Display result consumption, and History persistence. It did not change source code, solver behavior, cap constants, Display/History schemas, OOE, app-state, Tauri, UI, graphing, step-by-step, source mirrors, or Exact/Isolate semantics.

## Current Surfaces

| Surface | Current Shape | Finding |
| --- | --- | --- |
| `DisplayOutcome.exactLatex` | primary exact answer string | Canonical visible/copy/history surface today. |
| `DisplayOutcome.branchReadback` | finite branch metadata | Display aid for known finite branches, not canonical storage. |
| `DisplayOutcome.exactSupplementLatex` | rendered validity strings | Compatibility/readback surface, not canonical facts. |
| `DisplayOutcome.detailSections` | method/readback prose and math lines | Human explanation only; not canonical root storage. |
| `HistoryEntry.resultLatex` | copied from `outcome.exactLatex` | History currently persists visible result strings, not root objects. |
| `EquationRootSet` | internal root representation | Can model exact finite, factor-derived, exact-rational factor, numeric validated, implicit algebraic, and structured-stop entries. |
| `EquationImplicitAlgebraicRoot` | dormant internal root entry | Exists in type/tests but does not render visible exact output. |
| `EquationStructuredRootStop` | dormant internal stop entry | Exists in type/tests but does not render visible exact output. |
| selected-target isolation | compact formula if short, otherwise isolated equation fallback | Already treats formula length as readback safety rather than solver expansion. |
| algebraic isolation formula caps | `formula-size-limit` unsupported stop | Protects against giant symbolic cubic/quartic formulas. It does not yet return a structured root/readback object. |

## Code Anchors

- `src/lib/equation/roots/representation.ts`
  - Defines dormant `implicit-algebraic`, `numeric-validated`, and `structured-stop` variants.
  - `rootSetToExactLatex(...)` and `rootSetToBranchReadback(...)` currently render only exact finite / factor-derived / exact-rational finite roots.
- `src/lib/equation/isolation/selected-target.ts`
  - `compactTargetMaxLatexLength` controls whether isolation returns a compact target formula or falls back to the isolated equation.
  - This is an existing readback safety model.
- `src/lib/equation/isolation/algebraic.ts`
  - General symbolic cubic/quartic forms stop with `formula-size-limit`.
  - Factorable cubic/quartic equations can still delegate to exact-rational factorable solving when roots are compact enough.
- `src/lib/equation/parameterized/readback.ts`
  - Translates `formula-size-limit` into user-facing copy: "The exact symbolic formula is too large to show safely."
- `src/lib/display/result/result-readback.ts` and `display-blocks.ts`
  - Consume only visible strings and branch metadata.
  - They should not become root-representation authorities in the next slice.
- `src/app/runtime/historyDisplayEntry.ts`
  - Persists `outcome.exactLatex`, `exactSupplementLatex`, and `approxText`, not typed roots.

## Findings

1. Visible `RootOf` is not approved by current product policy. The internal implicit-root type exists so future work has a home, but exposing it now would create copy/editor/history semantics before Calcwiz has decided notation, domain, ordering, and user expectation rules.
2. Formula-size stops are readback boundaries, not proof that the solver found no mathematical object. They should eventually become structured readback evidence, but current visible behavior should remain unchanged until a named implementation milestone.
3. Selected-target isolation already has the right pattern for one lane: compact formula when safe, isolated equation fallback when formula text is too large. That pattern should inform the next root readback helper.
4. Display and History should remain string/metadata consumers for now. A producer-side readback seam should adapt root objects into existing `exactLatex`, `branchReadback`, supplements, and detail sections before any schema expansion is considered.
5. Factorable exact-rational roots are already a good compact finite-root path. They should stay visible through existing exact/branch surfaces, not through implicit-root notation.
6. Numeric validated roots are not an Exact-mode substitute. They may support approximate/local answer modes later, but should not silently close Exact-mode formula-size stops.
7. Periodic families are a separate structured surface. Do not fold periodic implicit roots into the algebraic implicit-root policy.

## Recommended Next Milestone

`EQUATION-COMPACT-ROOT-READBACK1`

Recommended scope:

- Add an internal producer-side readback helper near `src/lib/equation/roots/`.
- Consume `EquationRootSet` / root representations and decide among current visible surfaces:
  - compact `exactLatex`;
  - finite `branchReadback`;
  - raw supplement strings from root facts;
  - detail lines for factor/readback provenance;
  - structured stop/error copy when no safe exact answer should be shown.
- Preserve current DisplayOutcome and History schemas.
- Keep implicit algebraic roots internal/dormant unless the helper is only recording structured stop evidence.
- Start with formula-size / factorable / algebraic-isolation readback boundaries, not broad solver adoption.

## Defer

- Visible `RootOf` / implicit-root notation.
- History schema for typed roots.
- Display schema for typed roots.
- Numeric fallback as Exact-mode closure.
- Periodic implicit-root modeling.
- Exact/Isolate semantics cleanup.
- Broader fact adoption in guarded algebra/composition.
- Cap raises, Cardano/Ferrari, broad factoring, graphing, step-by-step, OOE, app-state, Tauri, or UI work.

## Open Policy Questions

- If visible implicit roots are eventually allowed, what notation should Calcwiz use for copy/editor flows?
- Should implicit algebraic roots be ordered, indexed, or represented as a set of all roots of a defining equation?
- How should domain/exclusion facts attach to implicit root sets when the defining equation contains parameters?
- Should `Exact` display an implicit root object, or should it remain a structured stop until the user requests a future advanced/explain surface?

## Verification Notes

- Audit-only milestone.
- Source inspected: root representation, selected-target isolation compact fallback, algebraic isolation formula-size stops, parameterized readback boundary copy, cap-hit evidence, Display result readback, Display blocks, and History result persistence.
- Verification gate: memory protocol and diff whitespace only.
