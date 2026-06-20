# EQUATION-GENERATED-HANDOFF-PERF1 Generated Helper Audit Note

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Exp/log had a local generated-equation solver with a fixed family order and no profile/trace evidence, so it was the safe implementation target.
- Carrier, composition, and mixed-algebraic generated branch helpers were inspected but left unchanged.
- Those helpers differ in branch count, angle-unit handling, supported family sets, generated facts, and failure-message precedence, so unifying them in this milestone would risk changing solver behavior.

## Decision

- Keep `EQUATION-GENERATED-HANDOFF-PERF1` exp/log-only.
- Revisit other generated branch helpers only after exp/log evidence is stable and a separate milestone names their exact behavior-preservation contract.
