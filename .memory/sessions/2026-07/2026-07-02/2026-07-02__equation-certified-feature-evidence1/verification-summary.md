# EQUATION-CERTIFIED-FEATURE-EVIDENCE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

Passed:

- `npm run test:unit -- src/lib/modes/equation/certified-feature-evidence.test.ts src/lib/modes/equation/interval-validity-evidence.test.ts src/lib/modes/equation/singularity-classifier-evidence.test.ts src/lib/modes/equation/domain-fact-evidence-export.test.ts src/lib/modes/equation/analysis-evidence-contract.test.ts`
- `npm run test:unit -- src/lib/modes/equation/certified-feature-evidence.test.ts src/lib/modes/equation/numeric-golden-trace-harness.test.ts src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/numeric-card-credibility-polish.test.ts`
- `npx eslint src/lib/equation/analysis-evidence.ts src/lib/modes/equation/run.ts src/lib/modes/equation/certified-feature-evidence.test.ts src/lib/modes/equation/interval-validity-evidence.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check -- src/lib/equation/analysis-evidence.ts src/lib/modes/equation/run.ts src/lib/modes/equation/certified-feature-evidence.test.ts`

Known unrelated blockers:

- Full `npm run lint` remains blocked outside this Equation slice by `src/app/runtime/usePendingElapsedNow.ts`, `src/app/shell/HistoryPage.tsx`, and `src/components/HistoryPanel.tsx` React lint findings.
- Full `npm run build` remains blocked outside this Equation slice by current `src/app/runtime/editorTargets.ts` MathLive typing errors.
- Unrelated Linear Algebra, Risch/algebraic-integration memory/source, and `test-results/` changes were present and not staged for this milestone.

## Coverage Notes

- Validated roots and interval-local scope are exported without relying on Display prose.
- Extraneous candidates are exported with approximate point evidence when readback contains a numeric value.
- Sturm-certified polynomial outcomes and visible Complex numeric polynomial branch roots have structured evidence.
