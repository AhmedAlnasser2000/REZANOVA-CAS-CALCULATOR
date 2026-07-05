# Calculus Limits Corpus Ledger Schema

All ledger data is newline-delimited JSON. Blank lines are ignored.

This schema is for single-variable Limits only.

## `sources.json`

Required source fields:

- `source_id`
- `title`
- `source_type`
- `access`
- `calculus_lane`
- `limits_relevance`
- `license`
- `locator_policy`

Allowed `source_type` values: `local-pdf`, `website`.

Allowed `access` values: `local`, `web`.

Allowed `calculus_lane` value: `limits`.

Allowed `limits_relevance` values: `primary`, `secondary`, `reference`, `deferred`.

## `ledger/unique-cases.jsonl`

One row per runnable limit benchmark.

Required fields:

- `case_id`
- `canonical_limit_latex`
- `variable`
- `target_kind`
- `direction`
- `domain`
- `family`
- `expected_result_kind`
- `route_expectation`
- `run_policy`
- `status`
- `source_id`
- `source_locator`

Allowed `target_kind` values: `finite`, `positive-infinity`, `negative-infinity`.

Allowed `direction` values: `two-sided`, `left`, `right`, `not-applicable`.

Allowed `domain` values: `real`, `complex`, `real-with-conditions`, `symbolic-conditions`, `mixed-or-unspecified`.

Allowed `expected_result_kind` values:

- `finite`
- `infinite`
- `symbolic`
- `guarded-cases`
- `does-not-exist`
- `controlled-unsupported`
- `parser-boundary`
- `proof-boundary`
- `domain-boundary`
- `complex-principal`

Allowed `route_expectation` values match the internal Limits route vocabulary, including `direct-substitution`, `local-equivalent`, `exact-local-algebra`, `indeterminate-transform`, `infinity-asymptotic`, `finite-pole`, `squeeze-oscillation`, `piecewise`, `abs-side-behavior`, `mrv-lite`, `unsupported`, `malformed`, and `too-complex`.

Optional expectation fields:

- `expected_answer_latex`
- `expected_error_contains`
- `expected_detail_titles`
- `expected_detail_contains`
- `domain_intent`
- `tags`
- `notes`

Rows with final answers must include `expected_answer_latex`. Rows with controlled failures must include `expected_error_contains`.

## `ledger/duplicate-cases.jsonl`

One row per duplicate source sighting.

Required fields:

- `duplicate_id`
- `case_id`
- `source_id`
- `source_locator`
- `source_limit_latex`
- `duplicate_reason`

## `ledger/run-results.jsonl`

One row per unique `run_id` plus `case_id`.

Required fields:

- `run_id`
- `case_id`
- `runner`
- `run_status`
- `failure_kind`
- `visual_status`

Run results must reference unique cases, not duplicate records.

## `ledger/scan-findings.jsonl`

One row per benchmark finding.

Required fields:

- `finding_id`
- `case_id`
- `finding_kind`
- `summary`
