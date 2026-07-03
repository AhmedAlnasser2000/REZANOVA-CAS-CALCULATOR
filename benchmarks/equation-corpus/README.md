# Equation Corpus Ledger

This folder is the source-controlled starting point for textbook and reference-backed Equation benchmarks.

It is not runtime data. Application code must not import this folder.

## Purpose

The ledger records Equation cases from textbooks and reference websites, deduplicates mathematically equivalent cases, runs only the canonical case once per sweep, and keeps failure reasons so capability planning is evidence-based.

The workflow is sweep-first:

1. Scan a source for Equation-relevant cases.
2. Normalize the candidate into a canonical mathematical case.
3. Check `ledger/unique-cases.jsonl` for an existing equivalent case.
4. If the case is new, add one runnable row to `ledger/unique-cases.jsonl`.
5. If the case already exists, move the sighting to `ledger/duplicate-cases.jsonl` and link it to the canonical `case_id`.
6. Run only the unique canonical case once for the sweep. Duplicate rows preserve source coverage and must not create extra runs.
7. Record the solver result in `ledger/run-results.jsonl`.
8. If a case fails, classify the reason in `ledger/run-results.jsonl` and add details to `ledger/scan-findings.jsonl` when useful.
9. Continue scanning. Do not stop a corpus pass because a case fails.

## Ledger Files

- `sources.json`: approved source registry for local PDFs and web references.
- `ledger/unique-cases.jsonl`: one row per mathematical case. These are the only runnable benchmark targets.
- `ledger/duplicate-cases.jsonl`: additional source sightings of an existing unique case. These preserve duplicates and source provenance, but the runner resolves them to the canonical `case_id` and runs that case only once.
- `ledger/run-results.jsonl`: one result per `run_id` plus `case_id`. Results must reference unique cases, never duplicate records.
- `ledger/scan-findings.jsonl`: normalization, factoring, handling, parser, readback, or capability findings discovered during scans and runs.
- `schemas/ledger-schema.md`: field rules and controlled vocabulary.

## Deduplication Rule

One mathematical case equals one runnable benchmark target.

Many source sightings can point to the same `case_id`, but duplicate sightings must not produce extra runs. When a duplicate is found, keep it in the duplicate ledger and run the linked canonical case once rather than running every sighting. For example, these may share one `case_id` if the target, domain, and expected obligations are equivalent:

```text
x^2 - 5x + 6 = 0
t^2 - 5t + 6 = 0
(u - 2)(u - 3) = 0
```

They should become separate cases when they stress different obligations:

```text
x^2 - 5x + 6 = 0
\sqrt{x + 7} = x - 1
\frac{x - 2}{x - 3} = 0
```

The second needs extraneous-root/domain validation. The third needs denominator exclusions.

## Failure Discipline

Failed cases are ledger data, not stopping points. Record whether the failure is:

- a missing capability;
- an existing capability that needs upgrading;
- a normalization/factoring/domain/branch/periodic-output weakness;
- a wrong result;
- a timeout or performance concern;
- a readback-only issue;
- a parser or input-grammar gap.

The end of a scan should show what Calcwiz supports, what needs upgrade, and what is genuinely missing.

## Source Policy

Do not copy textbook problem statements into the ledger. Record compact mathematical cases, source metadata, page or section locators, and solver expectations. OpenStax and DLMF references may be cited as sources, but ledger rows should remain concise benchmark metadata rather than reproduced book content.
