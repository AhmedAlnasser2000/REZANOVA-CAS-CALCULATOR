# Calculus Limits Corpus Ledger

This folder is the source-controlled seed ledger for Limits benchmarks.

It is not runtime data. Application code must not import this folder.

## Purpose

The ledger records compact limit expressions, expected answers or controlled failures, route expectations, and proof-card assertions. It is the durable seed harness for the pre-Gruntz Limits engine; the large textbook/PDF and website expansion comes after the Gruntz foundation work lands.

The workflow is sweep-first:

1. Record one canonical limit expression in `ledger/unique-cases.jsonl`.
2. Attach source metadata and a route expectation.
3. Add proof-card expectations when the case depends on evidence, side behavior, domain behavior, or guarded assumptions.
4. Put repeated source sightings in `ledger/duplicate-cases.jsonl`, not as extra runnable cases.
5. Run each unique case at most once per sweep.
6. Use Playwright before marking app-visible output visually verified.
7. Record failures as findings instead of stopping a sweep.

## Ledger Files

- `sources.json`: approved source registry for local PDFs and web references.
- `ledger/unique-cases.jsonl`: one row per runnable Limits benchmark.
- `ledger/duplicate-cases.jsonl`: extra source sightings that point to a canonical case.
- `ledger/run-results.jsonl`: one result per `run_id` plus `case_id`.
- `ledger/scan-findings.jsonl`: parser, method, proof, visual, normalization, performance, or capability findings.
- `schemas/ledger-schema.md`: field rules and controlled vocabulary.

## Scope Boundary

This seed corpus covers single-variable finite, one-sided, infinity, piecewise, absolute-value, squeeze/oscillation, domain, symbolic-parameter, and pre-Gruntz MRV-lite cases.

Do not add ODE, differentiation, integration, multivariable limits, full Gruntz, or broad theorem-prover obligations to this lane.

## Source Policy

Do not copy textbook problem statements into the ledger. Record compact mathematical expressions, source metadata, section/page locators, and solver expectations.
