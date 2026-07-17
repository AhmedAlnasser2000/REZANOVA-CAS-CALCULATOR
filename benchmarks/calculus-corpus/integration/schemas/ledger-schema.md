# Calculus Integration Corpus Ledger Schema

All ledger data is newline-delimited JSON. Blank lines are ignored.

This schema is for indefinite integration only. Definite, improper, multivariable, ODE, and convergence-test cases belong outside this lane.

## `sources.json`

Top-level shape:

```json
{
  "schema_version": 1,
  "calculus_lane": "integration",
  "integral_kind": "indefinite",
  "sources": []
}
```

Required source fields:

- `source_id`
- `title`
- `source_type`
- `access`
- `calculus_lane`
- `integration_relevance`
- `license`
- `locator_policy`

Allowed `source_type` values:

- `local-pdf`
- `website`
- `internal-regression`

Allowed `access` values:

- `local`
- `web`
- `internal`

Allowed `calculus_lane` values:

- `integration`

Allowed `integration_relevance` values:

- `primary`
- `secondary`
- `reference`
- `deferred`

## `ledger/unique-cases.jsonl`

One row per runnable indefinite integration case.

Required fields:

- `case_id`
- `canonical_integrand_latex`
- `variable`
- `integral_kind`
- `domain`
- `family`
- `expected_result_kind`
- `run_policy`
- `status`
- `provenance_class`
- `source_id`
- `source_locator`

Allowed `integral_kind` values:

- `indefinite`

Allowed `domain` values:

- `real`
- `complex`
- `real-with-conditions`
- `mixed-or-unspecified`

Allowed `expected_result_kind` values:

- `elementary-antiderivative`
- `special-function-antiderivative`
- `controlled-unsupported`
- `parser-boundary`
- `proof-boundary`

Allowed `run_policy` values:

- `run-once-per-case-per-sweep`

Allowed `status` values:

- `pending`
- `supported`
- `unsupported`
- `wrong-result`
- `needs-upgrade`
- `not-run`
- `boundary-deferred`

Allowed `provenance_class` values:

- `source-backed`
- `regression-derived`

Optional fields:

- `source_expression_latex`
- `expected_antiderivative_latex`
- `expected_derivative_check_latex`
- `expected_facts_latex`
- `method_expectation`
- `canonicalization_notes`
- `duplicate_notes`
- `tags`
- `notes`

## `ledger/duplicate-cases.jsonl`

One row per duplicate source sighting. Duplicate rows preserve source coverage and provenance, but they are never separate run targets. A runner must resolve duplicate sightings to their linked canonical `case_id` and run that canonical unique case at most once per sweep.

Required fields:

- `duplicate_id`
- `case_id`
- `source_id`
- `source_locator`
- `source_integrand_latex`
- `duplicate_reason`

Allowed `duplicate_reason` examples:

- `same-canonical-integrand`
- `same-under-variable-rename`
- `same-after-simplification`
- `same-after-trig-identity`
- `same-after-constant-factor`
- `same-after-affine-substitution`
- `same-source-reprint`

## `ledger/run-results.jsonl`

One row per `run_id` and `case_id`.

Run results must reference canonical unique cases only. They must not reference duplicate or occurrence identifiers.

Required fields:

- `run_id`
- `case_id`
- `runner`
- `run_status`
- `failure_kind`
- `visual_status`

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
- `visual-output-issue`
- `parser-or-input-grammar-gap`
- `performance-concern`
- `unknown`

Allowed `visual_status` values:

- `visually-verified`
- `visual-blocked`
- `not-run`
- `not-applicable-doc-only`

Optional fields:

- `route_observed`
- `elapsed_ms`
- `result_summary`
- `answer_latex`
- `facts_observed`
- `playwright_command`
- `visual_evidence_path`
- `visual_blocker`
- `notes`

## `ledger/scan-findings.jsonl`

Use this file for sweep findings that deserve more detail than a single run result.

Required fields:

- `finding_id`
- `case_id`
- `finding_kind`
- `summary`

Allowed `finding_kind` values:

- `missing-capability`
- `needs-method-coverage`
- `needs-normalization`
- `needs-substitution-handling`
- `needs-partial-fraction-handling`
- `needs-facts-or-assumptions`
- `needs-domain-handling`
- `needs-branch-handling`
- `needs-special-function-certificate`
- `wrong-result`
- `timeout-or-too-slow`
- `readback-only-issue`
- `visual-output-issue`
- `parser-or-input-grammar-gap`
- `duplicate-mapping-note`
- `source-scope-boundary`

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
