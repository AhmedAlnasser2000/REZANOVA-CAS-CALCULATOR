# Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: live

## Scope
- stronger polynomial/radical/rational-power abs-carrier closure
- stronger `|u| = |v|` bounded carrier reuse
- stronger-carrier unresolved guidance
- transformed-branch real-only validation for merged exact output

## Commands
- `npm run test:unit -- src/lib/abs-core.test.ts src/lib/equation/numeric-interval-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/modes/equation.test.ts`
- `npm run lint -- src/lib/abs-core.ts src/lib/abs-core.test.ts src/lib/equation/guarded/algebra-stage.ts src/lib/equation/guarded/run.ts src/lib/equation/numeric-interval-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/modes/equation.test.ts`
- `npm run test:gate`

## Manual Checks
- Confirmed `|x^2+x-2|=3` closes exactly through the existing shared abs branch model and returns only the two real polynomial roots.
- Confirmed `2|x^2-1|+1=7` returns only `x \in {-2, 2}` and no longer leaks complex branch roots into the merged exact line.
- Confirmed `|\sqrt{x+1}-2|=1` and `|x^{1/3}-1|=2` close through the existing radical/rational-power sinks without widening branch depth.
- Confirmed `|x^2-1|=|x+1|` closes exactly through stronger `|u|=|v|` carrier reuse.
- Confirmed `|x^2+1|+1=e^x` stays honest on the symbolic side and now reports stronger-carrier guidance in numeric follow-up.

## Outcome
- Passed.

## Outstanding Gaps
- None recorded for `ABS3`; nested abs towers, abs sums/products of unrelated terms, inequalities, and general piecewise search remain intentionally out of scope.
