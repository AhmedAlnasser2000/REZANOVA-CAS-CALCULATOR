# EQUATION-DOMAIN-FACT-EVIDENCE-EXPORT1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

Passed:

- `npm run test:unit -- src/lib/modes/equation/domain-fact-evidence-export.test.ts src/lib/modes/equation/analysis-evidence-contract.test.ts`
- `npm run test:unit -- src/lib/modes/equation/domain-fact-evidence-export.test.ts src/lib/modes/equation/analysis-evidence-contract.test.ts src/lib/modes/equation/numeric-card-credibility-polish.test.ts src/lib/modes/equation/real-nonlinear-numeric-search.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts`
- `npx eslint src/lib/equation/analysis-evidence.ts src/lib/modes/equation/run.ts src/lib/modes/equation/domain-fact-evidence-export.test.ts src/lib/modes/equation/analysis-evidence-contract.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Blocked by unrelated committed/staged work:

- `npm run build` currently stops outside this Equation slice in `src/app/runtime/editorTargets.ts` MathLive command/value target typing and, after a local probe fix, in Linear Algebra `src/lib/linear-algebra/matrix-system.ts` importing non-exported `ExactScalar`. Those files were left unstaged by this milestone.

## Coverage Notes

- Structured domain evidence covers log domains, denominator exclusions, solved denominator exclusions, root domains, inverse-trig domains, and trig poles.
- Periodic carrier facts are not exported as hard domain facts.
- Evidence remains internal and absent from JSON serialization.
