# TRACK-ASSUMPTIONS-ADOPT1 Manual Verification Checklist

milestone: `ASSUMPTIONS-ADOPT1`  
status: verified and committed  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Added internal adapters from existing fact-producing modules into `AssumptionFact[]`.
- Mapped rational-function denominator exclusions, domain/range interval hazards, branch metadata, candidate rejection, and simplify/readback trust.
- Attached low-risk internal assumption facts to rational-function normalization metadata.
- Kept adoption internal only with no visible result/readback behavior changes.

## Manual App Steps

- Open Calculate and run existing rational integral and simplify examples.
- Open Equation and run an existing candidate-rejection/domain example.
- Confirm no new detail sections, badges, result origins, strategy labels, or wording appear from `ASSUMPTIONS-ADOPT1`.

## Expected Results

- Existing shipped UI behavior remains unchanged.
- Assumption facts are available internally for future readback/domain/graphing-readiness milestones.
- Normal calculator history and result provenance are unchanged.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/assumptions-core.test.ts src/lib/algebra/assumption-adapters.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/domain-range-core.test.ts src/lib/equation/candidate-rejection.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/modes/calculate.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Commit

```bash
git commit -m "Adopt ASSUMPTIONS-ADOPT1 internal assumption facts"
```
