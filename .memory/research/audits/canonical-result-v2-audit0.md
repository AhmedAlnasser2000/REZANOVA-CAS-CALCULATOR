# Canonical Result V2 Audit

Date: 2026-07-14
Status: approved implementation contract for `CANONICAL-RESULT-V2-AUDIT0`

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Baseline

- Live baseline: `64f3b955` (`NOTEBOOK-RIBBON-TABS1`) on local `main`; `origin/main` remains `633e6063`.
- V1 executable evidence: 100 History replay fixtures plus 43 golden cases across 57 route families.
- V1 math coverage: 455 canonical leaves, 432 producer-proven standard MathJSON trees, 23 classified residual leaves, and zero unclassified missing leaves.
- V1 exemption registry: 20 live rules; the Matrix-system rule accounts for four row-operation leaves.
- Display inversion: 401 producer boundaries, 149 native documents, 57 direct canonical consumer reads, zero compatibility projections, and zero legacy reads.
- Protected foreign state: untracked `test-results/`; no V2 gate may stage, clean, or use it as gate evidence.

## Schema Laws

1. `CanonicalResultDocumentV2` is a strict versioned document, not a V1 sidecar. The public active union is V1 or V2; versions above 2 remain opaque only in History storage.
2. Every genuine V2 math leaf contains canonical LaTeX plus producer-proven, structured-clone-safe, bounded, standard Compute Engine MathJSON. Presentation strings are never collected or consumed as mathematics.
3. V2 replaces overloaded leaves with discriminated semantics: typed primary, request evidence, supplements, Table cells, and Matrix row-operation detail parts.
4. Compound primary nodes keep workspace-adapter-produced presentation beside typed components. Consumers may display or copy that presentation but may not parse it or treat it as a math leaf.
5. V2 uses a separate builder whose compile-time inputs require branded proof. A selected V2 producer cannot silently retry or emit V1 when proof or validation fails.
6. Runtime documents and actions are version-paired. V2 action math is mandatory proven math; mixed document/action versions are invalid.
7. One normalized read authority exposes `sourceVersion`, the preserved raw document, presentation, and mathematical/domain semantics. V1 normalization copies existing truth and never manufactures V2-only semantics.
8. V1 History remains visible and immutable. V2 is current and visible. Replaying V1 may append V2 without rewriting V1; versions above 2 remain verbatim and outside current retention.
9. The V1 oversize fallback may strip optional MathJSON. V2 may not strip required MathJSON and must reject an oversized History write.
10. Existing document/node/depth/byte/Table bounds remain the initial V2 limits. Any widening needs evidence and a separately accepted baseline change.
11. Domain-native representations remain independent. V2 adds no universal solver AST, custom MathJSON head, generic worker, host merge, capability rename, replay rewrite, or OOE authority.
12. Existing V1 producers are frozen in an anti-growth inventory. New or materially changed producers select V2; adding a V1 producer is prohibited without a separately approved contract decision.

## Exact Residual Inventory

| Residual rule or evidence | Route | Leaves | V2 representation | Gate |
| --- | --- | ---: | --- | --- |
| `calculus-derivative-at-point-primary-compatibility` | `calculus.derivatives` | 1 | mathematical primary `6` | `CANONICAL-RESULT-V2-REQUEST-EVIDENCE1` |
| `calculus-derivative-at-point-resolved-input-compatibility` | `calculus.derivatives` | 1 | typed derivative-at-point request | `CANONICAL-RESULT-V2-REQUEST-EVIDENCE1` |
| `trigonometry-angle-convert-control-input` | `trigonometry.angle-conversion` | 1 | typed value/from/to request | `CANONICAL-RESULT-V2-REQUEST-EVIDENCE1` |
| `trigonometry-right-triangle-control-input` | `trigonometry.right-triangle` | 1 | typed known-quantity request | `CANONICAL-RESULT-V2-REQUEST-EVIDENCE1` |
| `equation-denominator-exclusion-labeled-supplement` | `equation.domain-boundary` | 1 | exclusion supplement | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `equation-even-root-labeled-supplement` | `equation.domain-boundary` | 1 | condition supplement | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `equation-rational-hole-labeled-supplement` | `equation.rational-radical` | 1 | exclusion supplement | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `equation-rational-simple-labeled-supplement` | `equation.rational-radical` | 1 | exclusion supplement | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `golden-equation-rational-exclusion-label` | `equation.rational-radical` | 1 | exclusion supplement | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `table-partial-domain-undefined-cell` | `table.domain-boundary` | 1 | undefined/outside-real-domain cell | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `table-rational-pole-undefined-cell` | `table.rational-function` | 1 | undefined/pole cell | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `golden-table-partial-domain-undefined-cell` | `table.domain-boundary` | 1 | undefined/outside-real-domain cell | `CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1` |
| `golden-trigonometry-period-phase-compound-primary` | `trigonometry.period-phase` | 1 | period-phase primary | `CANONICAL-RESULT-V2-TRIGONOMETRY1` |
| `matrix-linear-system-legacy-operator-details` | `matrix.linear-system` | 4 | typed swap/scale/eliminate detail parts | `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` |
| `golden-matrix-profile-singular-compound-primary` | `matrix.profile` | 1 | linear-map-profile primary | `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` |
| `golden-matrix-profile-singular-map-row` | `matrix.profile` | 1 | primary-owned presentation row | `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` |
| `golden-matrix-profile-tall-compound-primary` | `matrix.profile` | 1 | linear-map-profile primary | `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` |
| `golden-matrix-profile-tall-map-row` | `matrix.profile` | 1 | primary-owned presentation row | `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` |
| `golden-vector-independence-labeled-primary` | `vector.span-independence` | 1 | linear-independence primary | `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` |
| `golden-vector-independence-labeled-answer-row` | `vector.span-independence` | 1 | primary-owned presentation row | `CANONICAL-RESULT-V2-LINEAR-ALGEBRA1` |

Total: 20 registry rules, 23 residual leaves.

## Producer Version Inventory

The 57 current route families remain registered. V2 selection is exact and adapter-owned:

- Full V2 families after migration: `trigonometry.angle-conversion`, `trigonometry.period-phase`, `matrix.linear-system`, `matrix.profile`, `table.domain-boundary`, and `table.rational-function`.
- Mixed families with explicit V2 selectors:
  - `calculus.derivatives`: `derivativePoint`; ordinary, partial, and implicit derivative producers remain untouched.
  - `trigonometry.right-triangle`: `rightTriangle`; sine-rule and cosine-rule producers stay V1.
  - `equation.domain-boundary` and `equation.rational-radical`: only outcomes carrying producer-owned typed labeled-supplement evidence select V2.
  - `vector.span-independence`: `independent`; `span` stays V1.
- The other 46 route families are frozen V1 producers. Their exact identities remain the keys in `MATHJSON_ROUTE_REGISTRY`; the Contract gate will encode the frozen set and fail if it grows.
- Selection is by producer route/request/evidence before document construction. It is never `try V2, then fall back to V1`.

## Consumer Matrix

- Contract boundary: canonical validator, producer builders, runtime-outcome validator, native-result requirement, and result-contract facade.
- Display boundary: Display read model, trust summary, printer payload, notation hygiene, print hygiene, Display shell, workspace display state, Clipboard, and `Ans`/transfer projections.
- History boundary: History entry construction, persistence schema/load/retention, inspector/page readback, search, copy, replay, and calculator-memory snapshots.
- External/read-only projections: Surface Protocol DTO mapping and OOE diagnostics buffering.
- Audit/test boundary: History replay identity/cardinality/normalized output, MathJSON coverage, golden runner, fixtures, and test utilities.
- Equation carrier types that embed V1 math/document types remain producer-internal contracts until their owning producer migrates; they are not permission to read presentation as semantics.

Every semantic consumer must move to the normalized authority in `CANONICAL-RESULT-V2-CONSUMER-HISTORY1`. Persistence and diagnostics may retain raw-document access; no other direct raw-version branch is allowed.

## Presentation Baseline And Approved Correction

- All 100 replay fixtures, all 43 golden executions, current answer/detail/History cardinalities, print-hygiene paths, copy output, titles, labels, ordering, and warnings remain unchanged unless this audit explicitly states otherwise.
- The only approved visible correction is `calculus-derivative-at-point` for `x^2` at `x=3`:
  - primary changes from malformed `\left.\left((2x)\right)\right|_{}_{x=\error{\blacksquare}}_{x=3}` to `6`;
  - request evidence presents `\left.\frac{d}{dx}\left(x^2\right)\right|_{x=3}`;
  - canonical title remains `Derivative` and the existing derivative-step details, warnings, result origin, and card structure remain unchanged.
- Any other fixture/display difference stops the active gate and requires fresh approval.

## Implementation Stop Rules

- Stop if a migrated route lacks producer-owned proof for an actual math component; do not parse its presentation or add an exemption.
- Stop if normalized consumers require inferred V2 semantics for V1 documents.
- Stop if carrying evidence would merge workers/hosts, change capability ids, widen OOE, or rewrite replay seeds.
- Stop if V2 History cannot preserve old V1 rows without mutation.
- Stop if a gate changes visible output beyond the one approved derivative correction.
