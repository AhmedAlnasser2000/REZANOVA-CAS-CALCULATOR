# EQUATION-ABS-WRAPPER-FORMULA-POLICY0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- Gate label: backend
- Scope: audit/readiness policy for future Real absolute-value wrapper formula handoff.

## Summary

Audited whether absolute-value wrappers are ready to consume generated Cardano/Ferrari formula payloads after the Real square-root wrapper milestone.

## Findings

- Real `|F(t)|=b` is the right next algebraic wrapper candidate after square-root wrappers.
- The mathematical split is clear: `F(t)=b` and `F(t)=-b`, with the global wrapper fact `b>=0`.
- The live code already generates those branch equations for ordinary absolute-value composition and carrier flows.
- Formula handoff is not ready as a simple flag change because absolute value usually produces two generated equations, while the current Real formula promotion path handles exactly one `caseMath` payload.
- A live abs formula route needs grouped/multi-payload readback so the two wrapper branches, formula case rows, denominator exclusions, and scoped facts stay attached to the right branch/case.
- Complex absolute-value wrappers remain deferred because Complex `Abs` is magnitude, not a real sign split.

## Decision

Proceed toward `EQUATION-ABS-WRAPPER-FORMULA1` next only if grouped generated formula payload/readback handling is included in the plan, or split that substrate into `EQUATION-GENERATED-FORMULA-GROUPED-PAYLOAD1` first.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/research/audits/equation-abs-wrapper-formula-policy0-2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-abs-wrapper-formula-policy0/`

## Commit Status

Not committed. The user asked to start the policy gate, not to commit it.

## Next Discussion Focus

Plan whether grouped generated formula payload/readback should land as a small substrate milestone first or be included directly in `EQUATION-ABS-WRAPPER-FORMULA1`.
