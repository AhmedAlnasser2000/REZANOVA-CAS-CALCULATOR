# Canonical Result V2 Enforcement Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Remaining V1 producer ownership is fingerprinted and cannot grow or change silently.
- New routes and materially changed adapters are forced onto strict V2 with producer-owned MathJSON proof.
- Local, seam-impact, release, and dedicated pull-request workflows include the enforcement command.

## Manual App Steps

- None. This gate intentionally changes governance and tooling only.

## Expected Results

- The current repository passes `npm run test:canonical-result-v2-enforcement`.
- Editing a frozen adapter fails until every route owned by that file defaults to V2 and the baseline entry is removed.
- Adding an unfrozen V1 producer or direct V1 runtime document fails; a V2-only producer passes.
- After a separately approved push, the GitHub protection readback reports the three required checks and no direct-push or bypass path.
