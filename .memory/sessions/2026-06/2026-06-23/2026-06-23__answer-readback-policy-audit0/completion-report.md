# ANSWER-READBACK-POLICY-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Audited Calcwiz's current exact-answer readback and rendering path after recurring answer readability issues such as double imaginary units, zero identity fragments, and noisy equivalent root expressions.

## Findings

- Display already has safe branch organization, render deferral, notation rendering, and fail-closed extraction.
- Display should not become an algebraic cleanup authority.
- Equation root/readback surfaces are the best first attachment point for final-answer normalization, but current roots and branches are still often stored as route-local LaTeX strings.
- Complex readback has a strong exact scalar core in `src/lib/equation/complex/exact.ts`, while several solver routes still assemble branch strings locally.
- Future readback polishing should run after solver evidence and before `DisplayOutcome.exactLatex` / `branchReadback` are finalized.

## Recommended Follow-Up

Start `ANSWER-READBACK-NORMALIZATION1` before adding more solver frontier breadth that produces large or branch-heavy exact answers.

The first implementation should be producer-side, conservative, and heavily tested:

- normalize individual root/branch expressions;
- remove harmless identity/noise fragments;
- normalize complex unit multiplication;
- preserve facts, stops, History, OOE, app-state, and Display schemas;
- fail closed when expression structure is unclear.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-06/2026-06-23.md`
- `.memory/research/audits/answer-readback-policy-audit0-2026-06-23.md`
- `.memory/sessions/2026-06/2026-06-23/2026-06-23__answer-readback-policy-audit0/`

