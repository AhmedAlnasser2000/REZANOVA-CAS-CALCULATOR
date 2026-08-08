# Explicit Equation Supplement V2 and Formula Viewer CI Repair

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

## Backend gate

- Preserved Equation native condition/exclusion evidence through the solve-result carriers and used it as the sole V2 supplement authority.
- Built one clean typed supplement per producer-owned evidence leaf and failed closed when selected supplement evidence was absent or count-incompatible.
- Added explicit `equation.trig-exp-log: typedLabeledSupplement` selection for bounded Log Combine and Log Quotient outcomes without changing the frozen shared classifier.
- Kept `src/lib/equation/solve-result/producer-v2.ts` and `math-values.ts` byte-identical to their enforcement fingerprints.
- Accepted the reviewed 506/506/0/0 MathJSON baseline with the durable reason `typed radical conditions and explicit log-combine V2 promotion with producer-owned MathJSON`; no print-hygiene or V2-enforcement baseline changed.

## UI gate

- Updated the Formula Viewer artifact unit test to await the existing lazy import after the open action.
- Made no Formula Viewer production-code, artifact-contract, or load-error UX change.

## Deferred

- Duplicate condition evidence outside canonical supplements remains acceptable and out of scope.
- Broad construction-time display dedup and `\exponentialE` serializer/readback work remain separate future work.
- No push is included in this milestone.
