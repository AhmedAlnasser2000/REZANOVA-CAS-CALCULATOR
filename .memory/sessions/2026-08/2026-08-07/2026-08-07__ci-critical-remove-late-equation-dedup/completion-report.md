# CI Critical Repair: Remove Unsafe Late Equation Supplement Dedup

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Summary

- Removed the abandoned `scopeBranchGuardSupplements` late projection path from Equation outcome finalization.
- Kept the safe `symbolic.ts` rollback for `allowNumericOnly`, removing the invalid diagnostic probe read while preserving the existing numeric-interval gate.
- Restored MathJSON coverage to the pre-projection 505/505/0/0 baseline with zero missing proof and zero exemptions.
- Realigned the focused Equation regression to require condition evidence presence while allowing temporary duplicate condition display.

## Deferred

- Construction-time condition dedup remains a future gate.
- Readback serializer work for visible `\exponentialE` output remains out of scope.
- No agent-family/schema changes were made.
