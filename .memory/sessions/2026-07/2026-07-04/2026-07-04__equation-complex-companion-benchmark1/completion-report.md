## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

Implemented the Equation Complex companion benchmark policy and ran the first companion pass over the existing real-domain numeric benchmark cases.

- Added `complex_companion_policy` and `complex_companion_notes` to applicable unique cases.
- Added run-result metadata for `domain_intent`, `companion_run_kind`, and `companion_of_run_id`.
- Updated the Equation corpus README/schema/validator/tests so Complex-On evidence stays tied to the canonical unique case instead of creating duplicate benchmark rows.
- Marked 17 applicable real-numeric canonical rows with Complex companion policy.
- Appended 17 Complex-On companion run results.
- Added 3 open `needs-periodic-output` findings for trig companion rows that returned finite/one-cycle answers where the canonical benchmark expects periodic families.
- Added 3 open `needs-complex-support` findings for unsupported positive numeric-base exponential Complex cases.

## Files Updated

- `benchmarks/equation-corpus/README.md`
- `benchmarks/equation-corpus/schemas/ledger-schema.md`
- `benchmarks/equation-corpus/ledger/unique-cases.jsonl`
- `benchmarks/equation-corpus/ledger/run-results.jsonl`
- `benchmarks/equation-corpus/ledger/scan-findings.jsonl`
- `tools/equation-corpus-ledger-core.mjs`
- `tools/validate-equation-corpus-ledger.test.mjs`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-04.md`
- `.memory/sessions/2026-07/2026-07-04/2026-07-04__equation-complex-companion-benchmark1/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-04/2026-07-04__equation-complex-companion-benchmark1/completion-report.md`

## Notes

- This was a corpus/benchmark gate only. It intentionally did not edit Complex solver code.
- The next Complex solver frontier can use the six open findings as the first exact targets: periodic Complex-On trig readback for `sin(x)=cos(x)`, `sin^2(x)-cos^2(x)=0`, and `sin(2x)=cos(x)`, plus positive numeric-base exponentials `9^x=27`, `10^x=7`, and `16^x=8`.
- Commit not performed in this checkpoint because the user did not request it and the shared worktree contains unrelated staged Linear Algebra changes.
