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

Expanded the Equation corpus Complex-On companion benchmark from the earlier numeric-focused subset to every real-domain canonical row in the current ledger.

- Marked all real-domain unique rows with `complex_companion_policy:"required-when-applicable"`.
- Appended/replaced the all-real companion run `2026-07-05-openstax-algtrig-complex-companion-all-real1`.
- Superseded the earlier 17-case companion findings instead of treating them as independent active findings.
- Repaired the earlier 17 companion rows so `companion_of_run_id` points back to the real-domain source run, not to the companion run itself.
- Added validator/test coverage rejecting Complex companion self-references.

## Result

- Tested: 434 real-domain canonical cases.
- Supported: 414.
- Open findings: 20.
- Periodic-output findings: 8.
- Complex-support findings: 12.

## Open Finding Families

- Trig periodic obligation: Complex On fell back to finite or one-cycle answers where the canonical Equation case requires integer-parameter families.
- Complex support gap: positive numeric-base exponential equations and one absolute-value case still fail the Complex-On companion route.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-07/2026-07-05.md`
- `.memory/sessions/2026-07/2026-07-05/2026-07-05__equation-complex-companion-all-real1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-05/2026-07-05__equation-complex-companion-all-real1/verification-summary.md`

## Boundary

- This checkpoint is benchmark and validator work only. It does not edit Complex solver behavior.
- Temporary runner artifacts stay under `.task_tmp/equation-complex-companion/`.
