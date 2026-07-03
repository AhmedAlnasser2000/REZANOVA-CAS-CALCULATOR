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
- `duplicate_notes`
- `tags`
- `notes`

## `ledger/duplicate-cases.jsonl`

One row per duplicate source sighting. Duplicate rows are never run targets.

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

- `route_observed`
- `elapsed_ms`
- `root_count`
- `rejected_count`
- `failure_class`
- `result_summary`
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
- `notes`

Allowed `upgrade_or_missing` values:

- `missing-capability`
- `needs-upgrade`
- `not-applicable`
