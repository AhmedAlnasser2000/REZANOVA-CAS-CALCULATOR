# TRACK-SIMPLIFY-CORE0 Manual Verification Checklist

milestone: `SIMPLIFY-CORE0`  
status: verified and committed  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Added an internal simplify/readback policy substrate.
- Locked bounded form-intent, equivalence-trust, and preserved-fact vocabularies.
- Added helpers for denominator exclusions, domain hazards, and antiderivative backcheck trust.
- Recorded the policy substrate in math capability readiness facts.
- Kept shipped math behavior unchanged.

## Manual App Steps

- Open Calculate and run existing simplify/factor/expand examples.
- Run an existing distinct-linear rational integral such as `\int 1/(x^2-1) dx`.
- Confirm result labels and strategy chips match existing behavior.

## Expected Results

- No new visible UI badge or result label appears from `SIMPLIFY-CORE0`.
- Existing `partial-fractions` rational integration still works as before.
- Unsupported rational shapes remain controlled until `INT-RAT2`.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/simplify-policy.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/modes/calculate.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Commit

```bash
git commit -m "Add SIMPLIFY-CORE0 readback policy substrate"
```
