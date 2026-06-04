# TRACK-ASSUMPTIONS-CORE0 Manual Verification Checklist

milestone: `ASSUMPTIONS-CORE0`  
status: verified and committed  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Added a shared internal assumptions fact substrate.
- Locked bounded fact kind, source, trust, and scope vocabularies.
- Added helpers to build, merge, dedupe, summarize, and map domain constraints into assumption facts.
- Recorded `assumptions-core` in math capability readiness.
- Kept shipped UI, solver, calculus, simplification, parser, source-mirror, and Labs behavior unchanged.

## Manual App Steps

- Open Calculate and run an existing rational integral such as `\int \frac{1}{x^2-1}\,dx`.
- Open Equation and run a known candidate-rejection/domain example.
- Confirm no new visible badges, result wording, or detail sections appear from `ASSUMPTIONS-CORE0`.

## Expected Results

- Existing shipped outputs remain unchanged.
- Assumption facts are internal readiness metadata only.
- No global `assume(...)` feature, inequality solver, graphing behavior, or branch-cut engine appears.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/assumptions-core.test.ts src/lib/algebra/capability-readiness.test.ts src/lib/algebra/simplify-policy.test.ts`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Commit

```bash
git commit -m "Add ASSUMPTIONS-CORE0 shared fact substrate"
```
