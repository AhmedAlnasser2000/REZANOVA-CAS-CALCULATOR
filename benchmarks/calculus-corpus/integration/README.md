# Calculus Integration Corpus Ledger

This folder is the source-controlled starting point for textbook and reference-backed Calculus Integration benchmarks.

It is not runtime data. Application code must not import this folder.

## Purpose

The ledger records indefinite integration cases from approved textbooks and reference websites, deduplicates mathematically equivalent integrands, runs only the canonical case once per sweep, and keeps failure reasons so integration planning is evidence-based.

The workflow is sweep-first:

1. Scan an approved source for indefinite integration cases only.
2. Normalize the candidate into a canonical mathematical case.
3. Check `ledger/unique-cases.jsonl` for an existing equivalent case.
4. If the case is new, add one runnable row to `ledger/unique-cases.jsonl`.
5. If the case already exists, move the sighting to `ledger/duplicate-cases.jsonl` and link it to the canonical `case_id`.
6. Run only the unique canonical case once for the sweep. Duplicate rows preserve source coverage and must not create extra runs.
7. Use Playwright to inspect app-visible output before marking a benchmark run visually verified.
8. Record the solver result in `ledger/run-results.jsonl`.
9. If a case fails, classify the reason in `ledger/run-results.jsonl` and add details to `ledger/scan-findings.jsonl` when useful.
10. Continue scanning. Do not stop a corpus pass because a case fails.

## Ledger Files

- `sources.json`: approved source registry for local PDFs and web references.
- `ledger/unique-cases.jsonl`: one row per mathematical integration case. These are the only runnable benchmark targets.
- `ledger/duplicate-cases.jsonl`: additional source sightings of an existing unique case. These preserve duplicates and source provenance, but the runner resolves them to the canonical `case_id` and runs that case only once.
- `ledger/run-results.jsonl`: one result per `run_id` plus `case_id`. Results must reference unique cases, never duplicate records, and must record visual verification status.
- `ledger/scan-findings.jsonl`: normalization, method, facts, parser, readback, visual, performance, or capability findings discovered during scans and runs.
- `schemas/ledger-schema.md`: field rules and controlled vocabulary.

## Scope Boundary

This corpus is for indefinite integrals. Do not add definite, improper, convergence, area, volume, arc-length, multivariable, ODE, or series-test cases to this lane.

When a source section mixes indefinite and definite work, record only the indefinite case metadata. If the source case is useful but outside the current boundary, record it later in the correct lane or as a finding only when it explains a current integration gap.

## Deduplication Rule

One mathematical integrand plus expectation equals one runnable benchmark target.

Many source sightings can point to the same `case_id`, but duplicate sightings must not produce extra runs. When a duplicate is found, keep it in the duplicate ledger and run the linked canonical case once rather than running every sighting.

These may share one `case_id` when the variable, domain assumptions, and expected obligations are equivalent:

```text
\int x\cos(x^2)\,dx
\int t\cos(t^2)\,dt
```

They should become separate cases when they stress different obligations:

```text
\int x\cos(x^2)\,dx
\int \frac{1}{x^2+1}\,dx
\int \frac{1}{x^2-1}\,dx
```

The second needs inverse-trig readback. The third needs partial fractions and denominator exclusions.

## Visual Verification Rule

Benchmark run rows are not complete from unit tests alone. If a run exercises app-visible output, use Playwright and record:

- the command or runner;
- whether the rendered answer or error card was visually verified;
- visible facts, assumptions, boundary cards, or proof details;
- overflow/readability risks;
- evidence path when screenshots or traces are saved.

If Playwright cannot run, record the blocker in `visual_status`, `visual_blocker`, and the active session dossier.

## Failure Discipline

Failed cases are ledger data, not stopping points. Record whether the failure is:

- a missing capability;
- an existing capability that needs upgrading;
- a normalization, substitution, factoring, facts, branch, or domain weakness;
- a wrong antiderivative or failed derivative check;
- a timeout or performance concern;
- a readback-only or visual-output issue;
- a parser or input-grammar gap.

The end of a scan should show what Calcwiz supports, what needs upgrade, and what is genuinely missing.

## Source Policy

Do not copy textbook problem statements into the ledger. Record compact mathematical cases, source metadata, page or section locators, and solver expectations. Web references may be cited as sources, but ledger rows should remain concise benchmark metadata rather than reproduced book content.
