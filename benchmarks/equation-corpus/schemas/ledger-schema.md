# Equation Corpus Ledger Schema

All ledger data is newline-delimited JSON. Blank lines are ignored.

## `sources.json`

Top-level shape:

```json
{
  "schema_version": 1,
  "sources": []
}
```

Required source fields:

- `source_id`
- `title`
- `source_type`
- `access`
- `equation_relevance`
- `license`
- `locator_policy`

Allowed `source_type` values:

- `local-pdf`
- `website`

Allowed `access` values:

- `local`
- `web`

Allowed `equation_relevance` values:

- `primary`
- `secondary`
- `reference`

## `ledger/unique-cases.jsonl`

One row per runnable mathematical case.

Required fields:

- `case_id`
- `canonical_latex`
- `target`
- `domain`
- `family`
- `expected_result_kind`
- `run_policy`
- `status`
- `source_id`
- `source_locator`

Allowed `domain` values:

- `real`
- `complex`
- `interval-real`
- `mixed-or-unspecified`

Allowed `run_policy` values:

- `run-once-per-case-per-sweep`

Allowed `status` values:

- `pending`
- `supported`
- `unsupported`
- `wrong-result`
- `needs-upgrade`
- `not-run`

Optional fields:

- `source_expression_latex`
- `expected_roots_latex`
- `expected_constraints_latex`
- `canonicalization_notes`
- `complex_companion_policy`
- `complex_companion_notes`
- `duplicate_notes`
- `route_hint`
- `tags`
- `notes`

Allowed `complex_companion_policy` values:

- `required-when-applicable`
- `native-complex-case`
- `not-applicable`

Allowed `route_hint` values:

- `symbolic`
- `linear2`
- `linear3`
- `polynomialSystem2`
- `quadratic`
- `cubic`
- `quartic`

## `ledger/duplicate-cases.jsonl`

One row per duplicate source sighting. Duplicate rows preserve source coverage and provenance, but they are never separate run targets. A runner must resolve duplicate sightings to their linked canonical `case_id` and run that canonical unique case at most once per sweep.

Required fields:

- `duplicate_id`
- `case_id`
- `source_id`
- `source_locator`
- `source_expression_latex`
- `duplicate_reason`

Allowed `duplicate_reason` examples:

- `same-canonical-equation`
- `same-under-variable-rename`
- `same-after-factoring`
- `same-after-expansion`
- `same-after-rational-clearing`
- `same-after-trig-identity`

## `ledger/run-results.jsonl`

One row per `run_id` and `case_id`.

Run results must reference canonical unique cases only. They must not reference duplicate or occurrence identifiers.

Required fields:

- `run_id`
- `case_id`
- `runner`
- `run_status`
- `failure_kind`

Allowed `run_status` values:

- `supported`
- `unsupported`
- `wrong-result`
- `timeout-or-too-slow`
- `not-run`

Allowed `failure_kind` values:

- `none`
- `missing-capability`
- `needs-upgrade`
- `readback-only-issue`
- `parser-or-input-grammar-gap`
- `performance-concern`
- `unknown`

Optional fields:

- `domain_intent`
- `companion_run_kind`
- `companion_of_run_id`
- `complex_numeric_scope`
- `complex_engine`
- `complex_verification_status`
- `complex_region`
- `complex_contour_root_count`
- `complex_candidate_count`
- `complex_branch_policy`
- `complex_searched_region_notes`
- `route_observed`
- `elapsed_ms`
- `root_count`
- `rejected_count`
- `failure_class`
- `result_summary`
- `notes`

Allowed `domain_intent` values:

- `real`
- `complex`
- `interval-real`
- `mixed-or-unspecified`

Allowed `companion_run_kind` values:

- `complex-companion`

When `companion_run_kind` is `complex-companion`, `domain_intent` must be `complex` and `companion_of_run_id` must point to the real-domain run that triggered the companion check.

Complex numeric evidence fields are optional, but if any one is present then `domain_intent` must be `complex` and these fields are required:

- `complex_numeric_scope`
- `complex_engine`
- `complex_verification_status`
- `complex_branch_policy`

Allowed `complex_numeric_scope` values:

- `global-polynomial`
- `bounded-region`
- `symbolic-family`
- `controlled-boundary`
- `locus-deferred`

Allowed `complex_engine` values:

- `exact-symbolic`
- `complex-polynomial-aberth`
- `complex-region-argument-principle`
- `complex-boundary-policy`
- `locus-deferred`

Allowed `complex_verification_status` values:

- `global-polynomial`
- `contour-verified`
- `inconclusive`
- `unsafe`
- `not-applicable`

Allowed `complex_branch_policy` values:

- `not-applicable`
- `principal`
- `branch-family`
- `branch-safe`
- `branch-unsafe`
- `pole-aware`
- `locus-deferred`

`complex_region` is required for `bounded-region` evidence and must contain finite `re_min`, `re_max`, `im_min`, and `im_max` bounds with min values less than max values. Optional region budget fields are `grid_size`, `random_seed_count`, `contour_samples`, `subdivision_depth`, and `cell_budget`.

`global-polynomial` evidence is the only broad Complex numeric scope allowed to claim all roots. It must use `complex_engine: "complex-polynomial-aberth"`, `complex_verification_status: "global-polynomial"`, and no `complex_region`.

`bounded-region` evidence must use `complex_engine: "complex-region-argument-principle"`. A bounded-region run may be marked `supported` only when `complex_verification_status` is `contour-verified`, and contour-verified evidence must include matching `complex_contour_root_count` and `complex_candidate_count` values. Inconclusive or unsafe bounded-region evidence is a controlled stop or diagnostic record, not a primary supported answer.

`symbolic-family` evidence records exact Complex branch families before numeric search. `controlled-boundary` records deliberate Complex boundary stops such as unsupported wrapper/locus cases. `locus-deferred` records non-holomorphic set/locus cases that require a later two-real-variable or locus engine and must not be marked `supported`.

## `ledger/scan-findings.jsonl`

Use this file for sweep findings that deserve more detail than a single run result.

Required fields:

- `finding_id`
- `case_id`
- `finding_kind`
- `summary`

Allowed `finding_kind` values:

- `missing-capability`
- `needs-normalization`
- `needs-factoring`
- `needs-domain-handling`
- `needs-exclusion-handling`
- `needs-branch-handling`
- `needs-periodic-output`
- `needs-numeric-search`
- `needs-complex-support`
- `wrong-result`
- `timeout-or-too-slow`
- `readback-only-issue`
- `parser-or-input-grammar-gap`
- `duplicate-mapping-note`

Optional fields:

- `source_id`
- `source_locator`
- `upgrade_or_missing`
- `resolution_status`
- `resolution_run_id`
- `resolution_notes`
- `notes`

Allowed `upgrade_or_missing` values:

- `missing-capability`
- `needs-upgrade`
- `not-applicable`

Allowed `resolution_status` values:

- `open`
- `fixed`
- `superseded`
- `not-reproduced`
